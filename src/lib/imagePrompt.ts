// Shared image-prompt helpers: style presets and the LLM prompt enhancer,
// used by the Imagine page, the chatbot's image tool and search's image intent.
import { chat } from './providers';

// Style presets: each adds concrete style keywords that FLUX responds to.
export const STYLES: { key: string; label: string; hint: string }[] = [
  { key: 'none', label: 'auto', hint: '' },
  { key: 'photo', label: 'photoreal', hint: 'photorealistic, 35mm photo, natural lighting, sharp focus, high detail' },
  { key: 'cinematic', label: 'cinematic', hint: 'cinematic still, dramatic lighting, shallow depth of field, anamorphic, film grain' },
  { key: 'anime', label: 'anime', hint: 'anime illustration, clean line art, vibrant colors, detailed background' },
  { key: 'art', label: 'illustration', hint: 'digital illustration, painterly, rich textures, concept art' },
  { key: '3d', label: '3d render', hint: '3D render, soft studio lighting, octane render, smooth materials' },
  { key: 'minimal', label: 'minimal', hint: 'minimalist, flat design, bold shapes, limited color palette, lots of negative space' },
];

const ENHANCE_SYSTEM_PROMPT = `You rewrite short image ideas into one rich prompt for the FLUX text-to-image model. Keep the user's subject and intent exactly - never swap or add a different main subject. Add concrete visual detail: setting, lighting, composition, camera or medium, color mood. 35-60 words, one paragraph, plain text. Output ONLY the prompt: no quotes, no preface, no explanation.`;

// Returns the original text if the model is slow or fails - generation must
// never be blocked by the optional enhancement step.
export async function enhancePrompt(text: string, styleHint = ''): Promise<string> {
  try {
    const out = await Promise.race([
      chat({
        tier: 'chat',
        maxTokens: 220,
        temperature: 0.8,
        messages: [
          { role: 'system', content: ENHANCE_SYSTEM_PROMPT + (styleHint ? ` Style to apply: ${styleHint}.` : '') },
          { role: 'user', content: text },
        ],
      }),
      new Promise<string>((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000)),
    ]);
    const cleaned = out.replace(/^["'\s]+|["'\s]+$/g, '').replace(/\s+/g, ' ');
    return cleaned.length >= 10 && cleaned.length <= 700 ? cleaned : text;
  } catch {
    return styleHint ? `${text}, ${styleHint}` : text;
  }
}

