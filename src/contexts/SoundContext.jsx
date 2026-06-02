import { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

const SoundContext = createContext(undefined);

const SOUNDS = {
  click:  { freq: 1100, dur: 0.04, gain: 0.04, type: 'sine' },
  pop:    { freq: 720,  dur: 0.10, gain: 0.05, type: 'triangle' },
  whoosh: { freq: 220,  dur: 0.18, gain: 0.06, type: 'sawtooth' },
  tick:   { freq: 1500, dur: 0.02, gain: 0.03, type: 'sine' },
};

export const SoundProvider = ({ children }) => {
  const { settings } = useSettings();
  const ctxRef = useRef(null);

  const getCtx = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!ctxRef.current) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      ctxRef.current = new Ctor();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }, []);

  const play = useCallback((name) => {
    if (!settings.soundEffects) {
      // On mobile, fall back to a tiny haptic for critical actions.
      if (name === 'pop' && navigator.vibrate) {
        try { navigator.vibrate(8); } catch { /* noop */ }
      }
      return;
    }
    const ctx = getCtx();
    const cfg = SOUNDS[name];
    if (!ctx || !cfg) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = cfg.type;
    osc.frequency.value = cfg.freq;
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(cfg.gain, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + cfg.dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + cfg.dur + 0.02);
  }, [getCtx, settings.soundEffects]);

  const value = useMemo(() => ({ play }), [play]);
  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
};

export const useSounds = () => {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSounds must be used within SoundProvider');
  return ctx;
};
