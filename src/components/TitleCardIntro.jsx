import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogoMark } from '@/components/brand/Logo';
import { isReducedMotion } from '@/design/motion';

const KEY = 'octavia.intro.v3.seen';

const TitleCardIntro = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isReducedMotion()) return;
    try {
      if (window.localStorage.getItem(KEY)) return;
    } catch {
      return;
    }
    setVisible(true);
    const t = setTimeout(() => dismiss(), 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    try { window.localStorage.setItem(KEY, '1'); } catch { /* noop */ }
    setVisible(false);
  };

  useEffect(() => {
    if (!visible) return;
    const onKey = () => dismiss();
    window.addEventListener('keydown', onKey, { once: true });
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          onClick={dismiss}
          aria-label="Skip intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45, ease: [0.4, 0, 1, 1] } }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-surface-0 focus-ring"
        >
          {/* Single waveform bar rising and resolving into the mark */}
          <div className="relative flex items-end gap-1 mb-8 h-24" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 rounded-full gradient-accent"
                initial={{ height: 0 }}
                animate={{ height: [0, 60 - i * 6, 14 + i * 3] }}
                transition={{
                  duration: 1.2,
                  delay: i * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                  times: [0, 0.55, 1],
                }}
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1, transition: { delay: 0.25, duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
          >
            <LogoMark size={72} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.55, duration: 0.55, ease: [0.22, 1, 0.36, 1] } }}
            className="mt-6 font-display text-5xl md:text-6xl gradient-text italic leading-none"
          >
            Octavia
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.85, duration: 0.45 } }}
            className="mt-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-ink-4"
          >
            <span className="w-6 h-px bg-ink-4" />
            Vol. 01 · An editorial product
            <span className="w-6 h-px bg-ink-4" />
          </motion.div>
          <span className="sr-only">Click or press any key to skip the intro.</span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
};

export default TitleCardIntro;
