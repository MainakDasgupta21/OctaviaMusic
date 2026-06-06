import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogoMark, Wordmark } from '@/components/brand/Logo';
import { isReducedMotion } from '@/design/motion';

// Bumped to v5 alongside the v2 logo redesign so existing users see the new
// intro once. Premium brands keep their chrome static; motion lives here.
const KEY = 'octavia.intro.v5.seen';

const ease = [0.22, 1, 0.36, 1];

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
    const t = setTimeout(() => dismiss(), 2400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(KEY, '1');
    } catch {
      /* noop */
    }
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
          exit={{ opacity: 0, transition: { duration: 0.5, ease: [0.4, 0, 1, 1] } }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-surface-0 focus-ring"
        >
          {/* Eyebrow — sets the masthead voice before the chip resolves */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{
              opacity: 0.65,
              y: 0,
              transition: { delay: 0.1, duration: 0.4, ease },
            }}
            className="mb-10 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-ink-4"
          >
            <span className="w-8 h-px bg-ink-4" />
            Vol. 01
            <span className="w-8 h-px bg-ink-4" />
          </motion.div>

          {/* Chip materialises. The donut O is baked into the mark — no
              ring-tracing animation, just a confident reveal. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{
              opacity: 1,
              scale: 1,
              transition: { delay: 0.2, duration: 0.6, ease },
            }}
          >
            <LogoMark size={240} />
          </motion.div>

          {/* Wordmark slides up after the chip resolves */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { delay: 0.75, duration: 0.5, ease },
            }}
            className="mt-10"
          >
            <Wordmark size="xl" variant="ink" />
          </motion.div>

          {/* Editorial footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: 0.65,
              transition: { delay: 1.15, duration: 0.45 },
            }}
            className="mt-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-ink-4"
          >
            <span className="w-6 h-px bg-ink-4" />
            An editorial product
            <span className="w-6 h-px bg-ink-4" />
          </motion.div>

          <span className="sr-only">Click or press any key to skip the intro.</span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
};

export default TitleCardIntro;
