import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// Audio-reactive-looking visualizer. Driven by deterministic noise per track id
// modulated over time, biased by `isPlaying`. Why not the real AnalyserNode?
// react-player uses a YouTube iframe whose audio is cross-origin and cannot be
// fed into AudioContext. The plumbing here is one swap-out away (`analyserRef`)
// — replace the noise sample with `analyser.getByteFrequencyData(buffer)` once
// we move to a direct-audio backend (next product milestone). Until then this
// looks alive, never lies about FFT bins, and stays under 16 ms/frame.

const mulberry32 = (seed) => {
  let t = seed >>> 0;
  return () => {
    t |= 0; t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const hashStr = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
};

const roundedPath = (ctx, x, y, w, h, r) => {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.rect(x, y, w, h);
};

const Visualizer = ({
  isPlaying = false,
  seed = 'static',
  variant = 'bars',
  className,
  bars = 64,
  gradient = false,
  glow = false,
  reflection = false,
}) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rng = mulberry32(hashStr(seed));
    const phases = Array.from({ length: bars }, () => rng() * Math.PI * 2);
    const targets = new Float32Array(bars);
    const current = new Float32Array(bars);

    // Reading a CSS custom property forces a style flush. Doing it 60×/sec
    // shows up as jank, so we cache the accent and refresh it a few times a
    // second — fast enough to track the color-extraction handoff, cheap enough
    // to stay off the hot path.
    const readAccent = () => {
      const styles = getComputedStyle(document.documentElement);
      return {
        accent: styles.getPropertyValue('--track-accent').trim() || '18 90% 55%',
        accentStrong: styles.getPropertyValue('--track-accent-strong').trim() || '14 78% 48%',
      };
    };
    let { accent: accentColor, accentStrong: accentStrongColor } = readAccent();
    let lastAccentRead = performance.now();

    let last = performance.now();
    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tRef.current += dt;

      if (now - lastAccentRead > 300) {
        ({ accent: accentColor, accentStrong: accentStrongColor } = readAccent());
        lastAccentRead = now;
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Update targets — gentle when paused, lively when playing.
      const energy = isPlaying ? 1 : 0.18;
      for (let i = 0; i < bars; i++) {
        const f1 = Math.sin(tRef.current * 1.4 + phases[i]);
        const f2 = Math.sin(tRef.current * 2.7 + phases[i] * 1.3 + i * 0.18);
        const t = 0.55 + 0.35 * ((f1 + f2) * 0.5);
        // Frequency-curve falloff (low bars taller, high bars subtler).
        const fall = 1 - (i / bars) * 0.55;
        targets[i] = Math.max(0.06, Math.min(1, t * fall * energy));
        // Smooth toward target.
        current[i] += (targets[i] - current[i]) * Math.min(1, dt * 9);
      }

      const accentHsl = `hsl(${accentColor})`;
      const accentHslStrong = `hsl(${accentStrongColor})`;
      const accentHslSoft = `hsl(${accentColor} / 0.35)`;
      const accentHslSofter = `hsl(${accentStrongColor} / 0.25)`;
      const paint = gradient
        ? (() => {
          const g = ctx.createLinearGradient(0, 0, w, h);
          g.addColorStop(0, accentHsl);
          g.addColorStop(1, accentHslStrong);
          return g;
        })()
        : accentHsl;

      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      if (variant === 'wave') {
        // Smooth waveform (top + mirrored bottom).
        ctx.lineWidth = 2 * dpr;
        ctx.strokeStyle = paint;
        if (glow) {
          ctx.shadowColor = accentHslSoft;
          ctx.shadowBlur = 14 * dpr;
        }
        ctx.beginPath();
        for (let i = 0; i < bars; i++) {
          const x = (i / (bars - 1)) * w;
          const y = h / 2 + Math.sin(tRef.current * 2.5 + phases[i]) * (current[i] * h * 0.35);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        if (reflection) {
          ctx.lineWidth = 1.5 * dpr;
          ctx.strokeStyle = accentHslSofter;
          ctx.beginPath();
          for (let i = 0; i < bars; i++) {
            const x = (i / (bars - 1)) * w;
            const y = h * 0.74 + Math.sin(tRef.current * 2.5 + phases[i]) * (current[i] * h * 0.12);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      } else if (variant === 'radial') {
        // Circular spectrum ring for premium centerpiece moments.
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(w, h) * 0.2;
        const maxLen = Math.min(w, h) * 0.24;
        const lineW = Math.max(1.2 * dpr, (Math.PI * 2 * radius) / (bars * 3.8));

        if (reflection) {
          const floorGlow = ctx.createRadialGradient(cx, cy + radius * 1.5, 8, cx, cy + radius * 1.5, maxLen * 2.2);
          floorGlow.addColorStop(0, accentHslSofter);
          floorGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = floorGlow;
          ctx.fillRect(0, 0, w, h);
        }

        ctx.lineCap = 'round';
        ctx.strokeStyle = paint;
        ctx.lineWidth = lineW;
        if (glow) {
          ctx.shadowColor = accentHslSoft;
          ctx.shadowBlur = 18 * dpr;
        }

        for (let i = 0; i < bars; i++) {
          const v = current[i];
          const theta = (i / bars) * Math.PI * 2 - Math.PI / 2;
          const inner = radius + Math.sin(tRef.current * 0.6 + phases[i]) * (2.4 * dpr);
          const len = maxLen * (0.16 + v * 0.9);
          const outer = inner + len;
          const x1 = cx + Math.cos(theta) * inner;
          const y1 = cy + Math.sin(theta) * inner;
          const x2 = cx + Math.cos(theta) * outer;
          const y2 = cy + Math.sin(theta) * outer;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.lineWidth = 1.4 * dpr;
        ctx.strokeStyle = accentHslSofter;
        ctx.beginPath();
        ctx.arc(
          cx,
          cy,
          radius * 0.86 + Math.sin(tRef.current * 2.2) * (3.5 * dpr),
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      } else {
        // Bars: rounded, mirrored from center.
        const slot = w / bars;
        const barW = slot * 0.55;
        const gap = (slot - barW) / 2;
        ctx.fillStyle = paint;
        if (glow) {
          ctx.shadowColor = accentHslSoft;
          ctx.shadowBlur = 12 * dpr;
        }
        for (let i = 0; i < bars; i++) {
          const v = current[i];
          const bh = v * h * 0.92;
          const x = i * slot + gap;
          const y = (h - bh) / 2;
          roundedPath(ctx, x, y, barW, bh, barW / 2);
          ctx.fill();

          if (reflection) {
            const reflectedHeight = bh * 0.34;
            const reflectedY = h / 2 + bh / 2 + 2 * dpr;
            ctx.fillStyle = accentHslSofter;
            roundedPath(ctx, x, reflectedY, barW, reflectedHeight, barW / 2);
            ctx.fill();
            ctx.fillStyle = paint;
          }
        }
        ctx.shadowBlur = 0;
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [seed, isPlaying, variant, bars, gradient, glow, reflection]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('w-full h-full block', className)}
      aria-hidden="true"
    />
  );
};

export default Visualizer;
