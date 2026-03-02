import { useEffect, useRef } from 'react';
import type { ThemeTransitionState } from '../types';

interface Props { transition: ThemeTransitionState; }

export default function ThemeTransition({ transition }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!transition.isTransitioning) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width, H = canvas.height;
    const startTime = performance.now();
    const DURATION = 950;

    cancelAnimationFrame(rafRef.current);

    if (transition.toTheme === 'dark') {
      runMeteorShower(ctx, W, H, startTime, DURATION);
    } else {
      runStars(ctx, W, H, startTime, DURATION);
    }

    // ── METEOR SHOWER: light → dark ────────────────────────────────
    function runMeteorShower(ctx: CanvasRenderingContext2D, W: number, H: number, t0: number, dur: number) {
      const DIAG = Math.sqrt(W * W + H * H);
      const BASE_ANGLE = Math.PI * 1.25; // 225° — exact top-right → bottom-left
      const COS = Math.cos(BASE_ANGLE);
      const SIN = Math.sin(BASE_ANGLE);

      type Pt = { x: number; y: number };

      // ── BIG METEOR ─────────────────────────────────────────────
      const BIG_SPEED = DIAG * 1.55 / (dur * 0.001);
      const big = {
        x: W * 0.97, y: H * -0.02,
        vx: COS * BIG_SPEED,
        vy: SIN * BIG_SPEED,
        trail: [] as Pt[],
        maxTrail: 90,
        size: 12,
      };

      // ── SMALL METEORS ───────────────────────────────────────────
      const N = 30;
      type Small = {
        x: number; y: number; vx: number; vy: number;
        trail: Pt[]; maxTrail: number;
        size: number; alpha: number; spawnT: number; hue: number;
      };
      const smalls: Small[] = Array.from({ length: N }, (_, i) => {
        const onRight = Math.random() < 0.4;
        const sx = onRight ? W + 6 : W * (0.42 + Math.random() * 0.58);
        const sy = onRight ? H * Math.random() * 0.48 : H * (Math.random() * -0.04);
        const ang = BASE_ANGLE + (Math.random() - 0.5) * 0.42;
        const depth = 0.25 + Math.random() * 0.75;
        const speed = DIAG * (0.65 + depth * 0.95) / (dur * 0.001);
        return {
          x: sx, y: sy,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          trail: [], maxTrail: Math.floor(7 + depth * 22),
          size: 0.9 + depth * 2.8,
          alpha: 0.5 + depth * 0.5,
          spawnT: 0.04 + (i / N) * 0.58,
          hue: 25 + Math.random() * 50, // orange-yellow
        };
      });

      let lastNow = performance.now();

      function draw(now: number) {
        const dt = Math.min(now - lastNow, 32);
        lastNow = now;
        const t = Math.min((now - t0) / dur, 1);
        ctx.clearRect(0, 0, W, H);

        // ── DIAGONAL DARKNESS SWEEP ──────────────────────────────
        // Starts at t=0.14, fully opaque by t=0.88
        // A hard diagonal front moves from top-right to bottom-left
        const sweepT = Math.max(0, (t - 0.10) / 0.88);
        if (sweepT > 0) {
          const prog = easeInQuad(sweepT);
          // Front travels along the diagonal
          const frontAdvance = prog * (W + H) * 1.15;

          // Perpendicular direction to BASE_ANGLE (normal to sweep front): angle + 90°
          const nx = -SIN; // perpendicular x (rotated 90°)
          const ny = COS;  // perpendicular y

          // Origin of darkness at top-right corner, front is perpendicular to meteor angle
          const ox = W; const oy = 0;
          const fx = ox + COS * frontAdvance;
          const fy = oy + SIN * frontAdvance;

          // Soft edge: gradient along the perpendicular (travel) direction
          const grd = ctx.createLinearGradient(
            fx - nx * 40, fy - ny * 40,
            fx + nx * 80, fy + ny * 80,
          );
          const opacity = Math.min(prog * 1.35, 0.98);
          grd.addColorStop(0, `rgba(7,17,10,${opacity})`);
          grd.addColorStop(0.65, `rgba(7,17,10,${opacity * 0.97})`);
          grd.addColorStop(1, 'rgba(7,17,10,0)');

          // Fill entire canvas with clip to the "already passed" half
          ctx.save();
          ctx.beginPath();
          // Clip polygon: everything from origin toward the swept area
          const perpLen = DIAG * 1.5;
          const p1x = ox + nx * perpLen, p1y = oy + ny * perpLen;
          const p2x = fx + nx * perpLen, p2y = fy + ny * perpLen;
          const p3x = fx - nx * perpLen, p3y = fy - ny * perpLen;
          const p4x = ox - nx * perpLen, p4y = oy - ny * perpLen;
          ctx.moveTo(p1x, p1y);
          ctx.lineTo(p2x, p2y);
          ctx.lineTo(p3x, p3y);
          ctx.lineTo(p4x, p4y);
          ctx.closePath();
          ctx.clip();
          ctx.fillStyle = grd;
          ctx.fillRect(0, 0, W, H);
          ctx.restore();

          // Additional solid fill for the "fully passed" region further back
          const solidFront = Math.max(0, frontAdvance - 120);
          if (solidFront > 0) {
            const sfx = ox + COS * solidFront;
            const sfy = oy + SIN * solidFront;
            ctx.save();
            ctx.beginPath();
            const sp1x = ox + nx * perpLen, sp1y = oy + ny * perpLen;
            const sp2x = sfx + nx * perpLen, sp2y = sfy + ny * perpLen;
            const sp3x = sfx - nx * perpLen, sp3y = sfy - ny * perpLen;
            const sp4x = ox - nx * perpLen, sp4y = oy - ny * perpLen;
            ctx.moveTo(sp1x, sp1y);
            ctx.lineTo(sp2x, sp2y);
            ctx.lineTo(sp3x, sp3y);
            ctx.lineTo(sp4x, sp4y);
            ctx.closePath();
            ctx.clip();
            ctx.fillStyle = `rgba(7,17,10,${opacity})`;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
          }
        }

        // ── SMALL METEORS ─────────────────────────────────────────
        smalls.forEach(s => {
          if (t < s.spawnT) return;
          const life = Math.min((t - s.spawnT) / (1 - s.spawnT), 1);
          s.x += s.vx * dt * 0.001;
          s.y += s.vy * dt * 0.001;
          s.trail.unshift({ x: s.x, y: s.y });
          if (s.trail.length > s.maxTrail) s.trail.pop();

          const fadeIn = life < 0.08 ? life / 0.08 : 1;
          const fadeOut = life > 0.8 ? 1 - (life - 0.8) / 0.2 : 1;
          const alpha = s.alpha * fadeIn * fadeOut;
          if (alpha < 0.01) return;

          // Trail
          for (let i = 1; i < s.trail.length; i++) {
            const r = i / s.trail.length;
            const ta = (1 - r) * alpha * 0.72;
            ctx.beginPath();
            ctx.moveTo(s.trail[i - 1].x, s.trail[i - 1].y);
            ctx.lineTo(s.trail[i].x, s.trail[i].y);
            ctx.strokeStyle = `hsla(${s.hue},90%,68%,${ta})`;
            ctx.lineWidth = Math.max((1 - r) * s.size * 0.85 + 0.2, 0.2);
            ctx.lineCap = 'round';
            ctx.stroke();
          }
          // Head
          ctx.shadowColor = `hsl(${s.hue + 10},100%,78%)`;
          ctx.shadowBlur = s.size * 4.5;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * 0.52, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.fill();
          ctx.shadowBlur = 0;
        });

        // ── BIG METEOR ───────────────────────────────────────────
        big.x += big.vx * dt * 0.001;
        big.y += big.vy * dt * 0.001;
        big.trail.unshift({ x: big.x, y: big.y });
        if (big.trail.length > big.maxTrail) big.trail.pop();

        const bigFadeIn = t < 0.04 ? t / 0.04 : 1;
        const bigFadeOut = t > 0.62 ? Math.max(0, 1 - (t - 0.62) / 0.22) : 1;
        const bigAlpha = bigFadeIn * bigFadeOut;

        // Colored trail: white → yellow → orange → red → dark-red
        if (big.trail.length > 1 && bigAlpha > 0.01) {
          for (let i = 1; i < big.trail.length; i++) {
            const ratio = i / big.trail.length;
            const ta = (1 - ratio) * bigAlpha;
            // Color spectrum along trail
            let r = 255, g = 255, b = 255;
            if (ratio < 0.08) {
              g = 255; b = 220;
            } else if (ratio < 0.28) {
              const f = (ratio - 0.08) / 0.2;
              g = Math.floor(255 - f * 55); b = Math.floor(220 - f * 220);
            } else if (ratio < 0.58) {
              const f = (ratio - 0.28) / 0.3;
              g = Math.floor(200 - f * 110); b = 0;
            } else {
              const f = (ratio - 0.58) / 0.42;
              r = Math.floor(255 - f * 110); g = Math.floor(90 - f * 90); b = Math.floor(f * 90);
            }
            const w = Math.max((1 - ratio) * big.size * 2.1 + 0.4, 0.4);
            ctx.beginPath();
            ctx.moveTo(big.trail[i - 1].x, big.trail[i - 1].y);
            ctx.lineTo(big.trail[i].x, big.trail[i].y);
            ctx.strokeStyle = `rgba(${r},${g},${b},${ta * 0.92})`;
            ctx.lineWidth = w;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        }

        // Big meteor head
        if (bigAlpha > 0.01) {
          // Outer corona
          const corona = ctx.createRadialGradient(big.x, big.y, 0, big.x, big.y, big.size * 6);
          corona.addColorStop(0, `rgba(255,210,80,${bigAlpha * 0.48})`);
          corona.addColorStop(0.35, `rgba(255,110,20,${bigAlpha * 0.26})`);
          corona.addColorStop(0.75, `rgba(200,40,0,${bigAlpha * 0.1})`);
          corona.addColorStop(1, 'rgba(160,0,0,0)');
          ctx.beginPath();
          ctx.arc(big.x, big.y, big.size * 6, 0, Math.PI * 2);
          ctx.fillStyle = corona;
          ctx.fill();

          // Bright white-hot core
          ctx.shadowColor = 'rgba(255,230,150,1)';
          ctx.shadowBlur = big.size * 5;
          ctx.beginPath();
          ctx.arc(big.x, big.y, big.size * 0.75, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,248,${bigAlpha})`;
          ctx.fill();

          // Inner shimmer halo
          ctx.shadowBlur = 0;
          const halo = ctx.createRadialGradient(big.x, big.y, big.size * 0.5, big.x, big.y, big.size * 2.5);
          halo.addColorStop(0, `rgba(255,255,200,${bigAlpha * 0.55})`);
          halo.addColorStop(1, 'rgba(255,180,50,0)');
          ctx.beginPath();
          ctx.arc(big.x, big.y, big.size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = halo;
          ctx.fill();
        }

        if (t < 1) rafRef.current = requestAnimationFrame(draw);
      }
      rafRef.current = requestAnimationFrame(draw);
    }

    function runStars(ctx: CanvasRenderingContext2D, W: number, H: number, t0: number, dur: number) {
      const ANGLE = Math.PI * 0.74;

      type BurstP = { x: number; y: number; vx: number; vy: number; life: number; size: number };
      type Star = {
        x: number; y: number; vx: number; vy: number;
        size: number; opacity: number;
        twOff: number; twSpd: number;
        spawnT: number; hasTail: boolean;
        tail: Array<{ x: number; y: number }>;
        maxTail: number; burst: boolean;
        burstDone: boolean; burstP: BurstP[];
        rot: number; rotSpd: number;
      };

      const N = 90;
      const stars: Star[] = Array.from({ length: N }, (_, i) => {
        const ang = ANGLE + (Math.random() - 0.5) * 0.65;
        const spd = (1.3 + Math.random() * 3.5) * 0.001;
        return {
          x: W * (0.35 + Math.random() * 0.68),
          y: H * (Math.random() * 0.48),
          vx: Math.cos(ang) * spd * 16,
          vy: Math.sin(ang) * spd * 16,
          size: Math.random() * 3.8 + 1.3,
          opacity: Math.random() * 0.5 + 0.5,
          twOff: Math.random() * Math.PI * 2,
          twSpd: Math.random() * 0.08 + 0.03,
          spawnT: (i / N) * 0.48,
          hasTail: Math.random() < 0.5,
          tail: [], maxTail: Math.floor(Math.random() * 9 + 4),
          burst: Math.random() < 0.32,
          burstDone: false, burstP: [],
          rot: Math.random() * Math.PI * 2,
          rotSpd: (Math.random() - 0.5) * 0.07,
        };
      });

      function sparkle(x: number, y: number, r: number, alpha: number, rot: number, col: string) {
        if (alpha < 0.01 || r < 0.1) return;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.globalAlpha = alpha;
        ctx.shadowColor = col;
        ctx.shadowBlur = r * 3.8;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const len = i % 2 === 0 ? r : r * 0.3;
          if (i === 0) ctx.moveTo(Math.cos(a) * len, Math.sin(a) * len);
          else ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        }
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      let lastNow = performance.now();
      function draw(now: number) {
        const dt = Math.min((now - lastNow), 35);
        lastNow = now;
        const t = Math.min((now - t0) / dur, 1);
        ctx.clearRect(0, 0, W, H);

        // Light radial sweep from top-right
        const ot = Math.max(0, (t - 0.07) / 0.93);
        if (ot > 0) {
          const maxR = Math.sqrt(W * W + H * H) * 1.25;
          const r = ease3In(ot) * maxR;
          const cx = W * 0.82, cy = H * 0.07;
          const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          const a = Math.min(ot * 1.2, 0.96);
          grd.addColorStop(0, `rgba(240,239,231,${a})`);
          grd.addColorStop(0.5, `rgba(240,239,231,${a * 0.92})`);
          grd.addColorStop(1, `rgba(240,239,231,0)`);
          ctx.fillStyle = grd;
          ctx.fillRect(0, 0, W, H);
        }

        stars.forEach(s => {
          if (t < s.spawnT) return;
          const life = Math.min((t - s.spawnT) / (1 - s.spawnT), 1);

          s.x += s.vx * dt * 0.001;
          s.y += s.vy * dt * 0.001;
          s.twOff += s.twSpd;
          s.rot += s.rotSpd;

          if (s.hasTail) {
            s.tail.unshift({ x: s.x, y: s.y });
            if (s.tail.length > s.maxTail) s.tail.pop();
          }

          const tw = 0.62 + 0.38 * Math.sin(s.twOff);
          const fadeIn = life < 0.1 ? life / 0.1 : 1;
          const fadeOut = life > 0.7 ? 1 - (life - 0.7) / 0.3 : 1;
          const alpha = s.opacity * tw * fadeIn * fadeOut;

          if (s.burst && life > 0.58 && !s.burstDone) {
            s.burstDone = true;
            for (let i = 0; i < 5; i++) {
              const a = (i / 5) * Math.PI * 2 + Math.random();
              const sp = (Math.random() * 1.4 + 0.5) * 16;
              s.burstP.push({
                x: s.x, y: s.y,
                vx: Math.cos(a) * sp * 0.001,
                vy: Math.sin(a) * sp * 0.001,
                life: 0, size: s.size * 0.42,
              });
            }
          }

          s.burstP.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life++;
            const pa = (1 - p.life / 25) * alpha;
            if (pa > 0.01) sparkle(p.x, p.y, p.size * (1 - p.life / 25), pa, s.rot, '#DFF0E3');
          });

          if (s.hasTail && s.tail.length > 1) {
            for (let i = 1; i < s.tail.length; i++) {
              const tr = (1 - i / s.tail.length) * alpha * 0.6;
              ctx.beginPath();
              ctx.moveTo(s.tail[i - 1].x, s.tail[i - 1].y);
              ctx.lineTo(s.tail[i].x, s.tail[i].y);
              ctx.strokeStyle = `rgba(180,245,215,${tr})`;
              ctx.lineWidth = (1 - i / s.tail.length) * 2;
              ctx.lineCap = 'round';
              ctx.stroke();
            }
          }

          const col = life < 0.35 ? 'rgb(255,255,248)' : `rgb(${Math.floor(210 + life * 40)},255,${Math.floor(218 + life * 28)})`;
          sparkle(s.x, s.y, s.size, alpha, s.rot, col);
        });

        if (t < 1) rafRef.current = requestAnimationFrame(draw);
      }
      rafRef.current = requestAnimationFrame(draw);
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [transition.isTransitioning, transition.toTheme]);

  if (!transition.isTransitioning) return null;
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }} />;
}

function ease3In(t: number) { return t * t * t; }
function ease3Out(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInQuad(t: number) { return t * t; }
