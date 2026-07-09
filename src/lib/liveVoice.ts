// Real-time voice conversation with "Ask Dhruv" via Gemini's Live API: true
// audio-in -> audio-out over a single WebSocket, not a record -> transcribe
// -> reply -> text-to-speech pipeline.
//
// The browser never holds a real API key - /api/gemini-live-token mints a
// short-lived, single-use token locked (model + persona + audio-only) to
// this feature, and this module hands that token straight to Gemini's own
// Live session (via the official SDK, still talking directly to Google's
// servers - our backend is only in the loop for the token mint).
//
// The `@google/genai` SDK is a large dependency, so it's loaded with a
// dynamic import from inside connectLiveVoice() rather than a static import,
// keeping it out of the chatbot's initial bundle until someone actually taps
// the mic.
//
// Field names below (`outputTranscription`, delta-chunked transcripts with
// no reliable "finished" flag) were confirmed by connecting to the real API
// with synthesized audio, not from the SDK's own (incomplete) type comments.

export type LiveVoiceState = 'connecting' | 'live' | 'closed';

export interface LiveVoiceCallbacks {
  onStateChange?: (state: LiveVoiceState) => void;
  // Incremental chunks of the visitor's own speech, as Gemini transcribes it.
  onInputTranscript?: (deltaText: string) => void;
  // Incremental chunks of Dhruv's spoken reply, as Gemini transcribes its own audio.
  onOutputTranscript?: (deltaText: string) => void;
  // Fires once a full reply turn (audio + transcript) has finished.
  onTurnComplete?: () => void;
  // Fires when the visitor starts talking over a reply that's still playing.
  onInterrupted?: () => void;
  onError?: (message: string) => void;
  // Real-time amplitude (roughly 0-1) of the visitor's mic input, sampled on
  // every capture chunk - drives a visitor-is-speaking UI cue.
  onInputLevel?: (level: number) => void;
  // Real-time amplitude of Dhruv's spoken reply, sampled per audio chunk as
  // it arrives - drives a Dhruv-is-speaking UI cue.
  onOutputLevel?: (level: number) => void;
}

// Root-mean-square of a PCM chunk, scaled into a rough 0-1 UI range. Normal
// speech sits well under full scale in raw float samples, so this gain is
// tuned by ear rather than derived from anything principled - checked
// against synthesized speech (macOS `say`) to land mid-range on average
// with peaks occasionally reaching full scale, not pegged there constantly.
function rmsLevel(samples: Float32Array): number {
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) sumSquares += samples[i] * samples[i];
  const rms = Math.sqrt(sumSquares / samples.length);
  return Math.min(1, rms * 5);
}

export interface LiveVoiceController {
  hangUp: () => void;
}

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
// ScriptProcessorNode only fires once this many samples have been captured,
// so this buffer size is a direct floor on input latency (at a 48kHz mic,
// 4096 samples was ~85ms of dead time before the last bit of speech even
// left the browser). Smaller means Gemini hears the tail of an utterance -
// and can start responding - sooner; 1024 (~21ms at 48kHz) is still well
// within what browsers handle without glitching.
const CAPTURE_BUFFER_SIZE = 1024;

// Linear-interpolation downsample from the mic's native rate to the 16kHz
// mono PCM16 Gemini Live expects for input.
function floatTo16kPcm(input: Float32Array, inputSampleRate: number): Int16Array {
  const ratio = inputSampleRate / INPUT_SAMPLE_RATE;
  const outLength = Math.max(1, Math.round(input.length / ratio));
  const out = new Int16Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcIdx = i * ratio;
    const lo = Math.floor(srcIdx);
    const hi = Math.min(lo + 1, input.length - 1);
    const frac = srcIdx - lo;
    const sample = input[lo] + (input[hi] - input[lo]) * frac;
    const clamped = Math.max(-1, Math.min(1, sample));
    out[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return out;
}

function int16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToInt16(b64: string): Int16Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

export async function connectLiveVoice(callbacks: LiveVoiceCallbacks): Promise<LiveVoiceController> {
  callbacks.onStateChange?.('connecting');

  const tokenRes = await fetch('/api/gemini-live-token', { method: 'POST' });
  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({} as { error?: string }));
    throw new Error(err.error ?? 'Could not start live voice.');
  }
  const { token, model } = await tokenRes.json();

  // Explicit /web subpath: fetch + browser WebSocket only, no Node deps.
  const { GoogleGenAI, Modality } = await import('@google/genai/web');

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  // ScriptProcessorNode is deprecated but needs no separate worklet module
  // and remains broadly supported - a reasonable tradeoff for this scope.
  const processor = audioCtx.createScriptProcessor(CAPTURE_BUFFER_SIZE, 1, 1);
  // Route through a silent gain rather than straight to destination, so the
  // processor reliably fires (Chrome requires it be graph-connected to a
  // destination) without echoing the visitor's own mic back to them.
  const silentGain = audioCtx.createGain();
  silentGain.gain.value = 0;

  let closed = false;
  let nextPlaybackTime = 0;
  const activeSources: AudioBufferSourceNode[] = [];

  function stopPlayback() {
    for (const src of activeSources.splice(0)) {
      try { src.stop(); } catch { /* already stopped */ }
    }
    nextPlaybackTime = audioCtx.currentTime;
    callbacks.onOutputLevel?.(0);
  }

  const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } });
  const session = await ai.live.connect({
    model,
    config: { responseModalities: [Modality.AUDIO] },
    callbacks: {
      onopen: () => callbacks.onStateChange?.('live'),
      onmessage: (msg: any) => {
        const content = msg.serverContent;
        if (content?.interrupted) {
          stopPlayback();
          callbacks.onInterrupted?.();
        }

        const audioB64: string | undefined = msg.data;
        if (audioB64) {
          const pcm = base64ToInt16(audioB64);
          const buffer = audioCtx.createBuffer(1, pcm.length, OUTPUT_SAMPLE_RATE);
          const channel = buffer.getChannelData(0);
          for (let i = 0; i < pcm.length; i++) channel[i] = pcm[i] / 0x8000;
          callbacks.onOutputLevel?.(rmsLevel(channel));
          const src = audioCtx.createBufferSource();
          src.buffer = buffer;
          src.connect(audioCtx.destination);
          const startAt = Math.max(audioCtx.currentTime, nextPlaybackTime);
          src.start(startAt);
          nextPlaybackTime = startAt + buffer.duration;
          activeSources.push(src);
          src.onended = () => {
            const idx = activeSources.indexOf(src);
            if (idx !== -1) activeSources.splice(idx, 1);
            // Last chunk of this reply finished playing - drop the glow
            // back to idle instead of holding the final chunk's level.
            if (activeSources.length === 0) callbacks.onOutputLevel?.(0);
          };
        }

        const inText: string | undefined = content?.inputTranscription?.text;
        if (inText) callbacks.onInputTranscript?.(inText);
        const outText: string | undefined = content?.outputTranscription?.text;
        if (outText) callbacks.onOutputTranscript?.(outText);

        if (content?.turnComplete) callbacks.onTurnComplete?.();
      },
      onerror: () => callbacks.onError?.('Live voice connection error.'),
      onclose: () => { if (!closed) callbacks.onStateChange?.('closed'); },
    },
  });

  processor.onaudioprocess = (e: AudioProcessingEvent) => {
    if (closed) return;
    const input = e.inputBuffer.getChannelData(0);
    callbacks.onInputLevel?.(rmsLevel(input));
    const pcm16 = floatTo16kPcm(input, audioCtx.sampleRate);
    session.sendRealtimeInput({
      audio: { data: int16ToBase64(pcm16), mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` },
    });
  };
  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(audioCtx.destination);

  function hangUp() {
    if (closed) return;
    closed = true;
    stopPlayback();
    callbacks.onInputLevel?.(0);
    processor.onaudioprocess = null;
    try { processor.disconnect(); } catch { /* already disconnected */ }
    try { source.disconnect(); } catch { /* already disconnected */ }
    stream.getTracks().forEach(t => t.stop());
    try { session.close(); } catch { /* already closed */ }
    audioCtx.close().catch(() => {});
  }

  return { hangUp };
}
