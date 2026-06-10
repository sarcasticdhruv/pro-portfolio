import { useEffect, useRef } from 'react';
import type { ThemeTransitionState } from '../types';

interface Props { transition: ThemeTransitionState; }

// Target background colors for the wipe cover (must match index.css --bg).
const BG: Record<'dark' | 'light', string> = {
  dark: '#07110A',
  light: '#F5F4EE',
};

// Timing (ms). SWAP_MS / END_MS must stay in sync with useTheme.ts.
const GROW_MS = 560;     // clip-path circle grows from 0 to full coverage
const FADE_START = 660;  // cover starts fading out (real theme already swapped)
const FADE_MS = 380;
const DUR = 1040;        // total RAF lifetime (covers meteor impact + debris)

export default function ThemeTransition({ transition }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!transition.isTransitioning) return;
    const canvas = canvasRef.current;
    const cover = coverRef.current;
    if (!canvas || !cover) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const toDark = transition.toTheme === 'dark';

    // Wipe origin: top-right corner for the dark meteor, the toggle button
    // for the light bloom (falls back to top-right).
    const ox = toDark ? W : (transition.origin?.x ?? W * 0.92);
    const oy = toDark ? 0 : (transition.origin?.y ?? 28);
    const maxR = Math.max(
      Math.hypot(ox, oy),
      Math.hypot(W - ox, oy),
      Math.hypot(ox, H - oy),
      Math.hypot(W - ox, H - oy),
    ) * 1.04;

    cover.style.background = BG[transition.toTheme];
    cover.style.opacity = '1';

    // ── Particle setup ───────────────────────────────────────────────
    type Pt = { x: number; y: number };
    const ANGLE = Math.PI * 1.25; // 225°: top-right → bottom-left
    const DIAG = Math.hypot(W, H);

    // Hero meteor (dark) — big, accelerating descent from top-right that
    // slams into a point near the bottom-left and throws off an impact
    // flash, shockwave and debris.
    const HERO_MS = 520;
    const hero = {
      x0: W * 1.08, y0: -H * 0.12,
      x1: W * 0.11, y1: H * 0.88,   // impact point, just inside bottom-left
      trail: [] as Pt[], maxTrail: 40, size: 11,
    };
    let impactT = -1; // ms at which the meteor hit (set once)
    type Spark = { x: number; y: number; vx: number; vy: number; size: number; hue: number };
    const debris: Spark[] = [];

    // A few faint background meteors for depth.
    const smalls = Array.from({ length: 6 }, (_, i) => {
      const ang = ANGLE + (Math.random() - 0.5) * 0.35;
      const speed = DIAG * (0.9 + Math.random() * 0.7) / (GROW_MS * 0.001);
      const sx = W * (0.55 + Math.random() * 0.5);
      const sy = H * (Math.random() * 0.35) - H * 0.05;
      return {
        x: sx, y: sy,
        vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        trail: [] as Pt[], maxTrail: Math.floor(8 + Math.random() * 10),
        size: 0.8 + Math.random() * 1.6,
        alpha: 0.3 + Math.random() * 0.4,
        spawnT: 0.02 + (i / 6) * 0.4,
      };
    });

    // Stars (light) — gentle sparkles drifting down, twinkling.
    type Star = {
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; twOff: number; twSpd: number;
      spawnT: number; rot: number; rotSpd: number;
    };
    const stars: Star[] = Array.from({ length: 34 }, (_, i) => ({
      x: W * Math.random(),
      y: H * (Math.random() * 0.5 - 0.1),
      vx: (Math.random() - 0.5) * 26,
      vy: 90 + Math.random() * 150,
      size: 1.4 + Math.random() * 3.2,
      opacity: 0.45 + Math.random() * 0.55,
      twOff: Math.random() * Math.PI * 2,
      twSpd: 0.05 + Math.random() * 0.09,
      spawnT: (i / 34) * 0.5,
      rot: Math.random() * Math.PI,
      rotSpd: (Math.random() - 0.5) * 0.06,
    }));

    function sparkle(x: number, y: number, r: number, alpha: number, rot: number, col: string) {
      if (alpha < 0.01 || r < 0.1) return;
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.rotate(rot);
      ctx!.globalAlpha = alpha;
      ctx!.shadowColor = col;
      ctx!.shadowBlur = r * 3.5;
      ctx!.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const len = i % 2 === 0 ? r : r * 0.34;
        const px = Math.cos(a) * len, py = Math.sin(a) * len;
        i === 0 ? ctx!.moveTo(px, py) : ctx!.lineTo(px, py);
      }
      ctx!.closePath();
      ctx!.fillStyle = col;
      ctx!.fill();
      ctx!.restore();
    }

    const t0 = performance.now();
    let last = t0;

    function frame(now: number) {
      const e = now - t0;
      const dt = Math.min(now - last, 34);
      last = now;
      ctx!.clearRect(0, 0, W, H);

      // ── Clip-path wipe ─────────────────────────────────────────────
      const g = Math.min(e / GROW_MS, 1);
      const r = easeInOutCubic(g) * maxR;
      cover!.style.clipPath = `circle(${r.toFixed(1)}px at ${ox}px ${oy}px)`;
      if (e > FADE_START) {
        cover!.style.opacity = String(Math.max(0, 1 - (e - FADE_START) / FADE_MS));
      }

      if (toDark) drawMeteors(e, dt);
      else drawStars(e, dt);

      if (e < DUR) rafRef.current = requestAnimationFrame(frame);
    }

    function drawMeteors(e: number, dt: number) {
      const p = e / (GROW_MS + 40);
      // Small background meteors
      smalls.forEach(s => {
        const t = e / DUR;
        if (t < s.spawnT) return;
        s.x += s.vx * dt * 0.001;
        s.y += s.vy * dt * 0.001;
        s.trail.unshift({ x: s.x, y: s.y });
        if (s.trail.length > s.maxTrail) s.trail.pop();
        const fade = p < 0.85 ? 1 : Math.max(0, 1 - (p - 0.85) / 0.25);
        const a = s.alpha * fade;
        for (let i = 1; i < s.trail.length; i++) {
          const rr = i / s.trail.length;
          ctx!.beginPath();
          ctx!.moveTo(s.trail[i - 1].x, s.trail[i - 1].y);
          ctx!.lineTo(s.trail[i].x, s.trail[i].y);
          ctx!.strokeStyle = `hsla(34,90%,70%,${(1 - rr) * a * 0.7})`;
          ctx!.lineWidth = Math.max((1 - rr) * s.size, 0.3);
          ctx!.lineCap = 'round';
          ctx!.stroke();
        }
      });

      // ── Hero meteor ────────────────────────────────────────────────
      const hpRaw = Math.min(e / HERO_MS, 1);
      // Accelerate into the impact (gravity-like): slow far away, fast on approach.
      const hp = hpRaw * hpRaw * (1.9 - 0.9 * hpRaw);
      const hx = hero.x0 + (hero.x1 - hero.x0) * hp;
      const hy = hero.y0 + (hero.y1 - hero.y0) * hp;

      const flying = e < HERO_MS;
      if (flying) {
        hero.trail.unshift({ x: hx, y: hy });
        if (hero.trail.length > hero.maxTrail) hero.trail.pop();
      } else if (hero.trail.length) {
        hero.trail.pop(); // tail keeps streaming in after the head lands
      }

      // Head dims out right as it hits, handing off to the impact flash.
      const headFade = hpRaw < 0.9 ? 1 : Math.max(0, 1 - (hpRaw - 0.9) / 0.1);
      // Speed grows toward impact → fatter, brighter trail.
      const heat = 0.6 + 0.4 * hpRaw;

      // Colored trail: white-hot core → gold → orange → deep red
      for (let i = 1; i < hero.trail.length; i++) {
        const ratio = i / hero.trail.length;
        const ta = (1 - ratio);
        let rC = 255, gC = 255, bC = 255;
        if (ratio < 0.16) { gC = 255; bC = 215; }
        else if (ratio < 0.48) { const f = (ratio - 0.16) / 0.32; gC = 225 - f * 115; bC = 0; }
        else { const f = (ratio - 0.48) / 0.52; rC = 255 - f * 95; gC = 110 - f * 100; bC = 0; }
        ctx!.beginPath();
        ctx!.moveTo(hero.trail[i - 1].x, hero.trail[i - 1].y);
        ctx!.lineTo(hero.trail[i].x, hero.trail[i].y);
        ctx!.strokeStyle = `rgba(${rC | 0},${gC | 0},${bC | 0},${(ta * 0.95).toFixed(3)})`;
        ctx!.lineWidth = Math.max((1 - ratio) * hero.size * 2.6 * heat + 0.5, 0.5);
        ctx!.lineCap = 'round';
        ctx!.stroke();
      }

      if (headFade > 0.01 && flying) {
        const sz = hero.size * (0.8 + 0.5 * hpRaw); // swells as it nears impact
        const corona = ctx!.createRadialGradient(hx, hy, 0, hx, hy, sz * 7);
        corona.addColorStop(0, `rgba(255,215,110,${headFade * 0.55})`);
        corona.addColorStop(0.4, `rgba(255,120,30,${headFade * 0.28})`);
        corona.addColorStop(1, 'rgba(180,40,0,0)');
        ctx!.beginPath();
        ctx!.arc(hx, hy, sz * 7, 0, Math.PI * 2);
        ctx!.fillStyle = corona;
        ctx!.fill();

        ctx!.shadowColor = 'rgba(255,230,150,1)';
        ctx!.shadowBlur = sz * 5;
        ctx!.beginPath();
        ctx!.arc(hx, hy, sz, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255,255,248,${headFade})`;
        ctx!.fill();
        ctx!.shadowBlur = 0;
      }

      // ── Impact: flash + shockwave + debris ─────────────────────────
      if (e >= HERO_MS && impactT < 0) {
        impactT = e;
        for (let i = 0; i < 16; i++) {
          // spray up and into the screen (away from the bottom-left corner)
          const ang = -Math.PI * (0.05 + Math.random() * 0.9); // -180°..-9° (upward arc)
          const sp = 120 + Math.random() * 360;
          debris.push({
            x: hero.x1, y: hero.y1,
            vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
            size: 1 + Math.random() * 2.6, hue: 25 + Math.random() * 35,
          });
        }
      }

      if (impactT >= 0) {
        const it = e - impactT;
        const ix = hero.x1, iy = hero.y1;

        // Flash
        const flashA = Math.max(0, 1 - it / 180);
        if (flashA > 0.01) {
          const fl = ctx!.createRadialGradient(ix, iy, 0, ix, iy, hero.size * 9);
          fl.addColorStop(0, `rgba(255,248,220,${flashA})`);
          fl.addColorStop(0.5, `rgba(255,170,60,${flashA * 0.5})`);
          fl.addColorStop(1, 'rgba(255,120,30,0)');
          ctx!.beginPath();
          ctx!.arc(ix, iy, hero.size * 9, 0, Math.PI * 2);
          ctx!.fillStyle = fl;
          ctx!.fill();
        }

        // Shockwave rings
        [0, 90].forEach(off => {
          const rt = (it - off) / 460;
          if (rt > 0 && rt < 1) {
            const rr = easeOutCubic(rt) * hero.size * 16;
            ctx!.beginPath();
            ctx!.arc(ix, iy, rr, 0, Math.PI * 2);
            ctx!.strokeStyle = `rgba(255,190,90,${(1 - rt) * 0.6})`;
            ctx!.lineWidth = Math.max((1 - rt) * 3, 0.4);
            ctx!.stroke();
          }
        });

        // Debris (gravity)
        debris.forEach(d => {
          d.vy += 900 * dt * 0.001; // gravity
          d.x += d.vx * dt * 0.001;
          d.y += d.vy * dt * 0.001;
          const da = Math.max(0, 1 - it / 380);
          if (da < 0.01) return;
          ctx!.shadowColor = `hsl(${d.hue},100%,65%)`;
          ctx!.shadowBlur = d.size * 3;
          ctx!.beginPath();
          ctx!.arc(d.x, d.y, d.size * da, 0, Math.PI * 2);
          ctx!.fillStyle = `hsla(${d.hue},100%,72%,${da})`;
          ctx!.fill();
          ctx!.shadowBlur = 0;
        });
      }
    }

    function drawStars(e: number, dt: number) {
      const t = e / DUR;
      stars.forEach(s => {
        if (t < s.spawnT) return;
        const life = (t - s.spawnT) / (1 - s.spawnT);
        s.x += s.vx * dt * 0.001;
        s.y += s.vy * dt * 0.001;
        s.twOff += s.twSpd;
        s.rot += s.rotSpd;
        const tw = 0.6 + 0.4 * Math.sin(s.twOff);
        const fadeIn = life < 0.12 ? life / 0.12 : 1;
        const fadeOut = life > 0.72 ? Math.max(0, 1 - (life - 0.72) / 0.28) : 1;
        const alpha = s.opacity * tw * fadeIn * fadeOut;
        const col = life < 0.4 ? 'rgb(255,255,250)' : 'rgb(255,226,150)';
        sparkle(s.x, s.y, s.size, alpha, s.rot, col);
      });
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [transition.isTransitioning, transition.toTheme]);

  if (!transition.isTransitioning) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
      <div ref={coverRef} style={{ position: 'absolute', inset: 0, clipPath: 'circle(0px at 50% 0%)' }} />
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </div>
  );
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
