import { useEffect, useState } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Top-of-viewport progress bar that flashes whenever a route change starts.
// React Router doesn't expose suspense timing directly, so we drive the bar
// off `location.key` and animate it to "loaded" after the next frame —
// gives a Linear/NProgress-ish flash that hides perceived latency.
const RouteProgress = () => {
  const location = useLocation();
  const navType = useNavigationType();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 520);
    return () => clearTimeout(t);
  }, [location.key, navType]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key={location.key}
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: [0, 0.65, 1] }}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1], times: [0, 0.55, 1] }}
          className="fixed top-0 left-0 right-0 h-[1.5px] origin-left z-[100] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(90deg, hsl(var(--track-accent)), hsl(var(--track-accent-strong)) 70%, hsl(var(--bone) / 0.65))',
            boxShadow: '0 0 6px hsl(var(--track-accent) / 0.5)',
          }}
          aria-hidden="true"
        />
      ) : null}
    </AnimatePresence>
  );
};

export default RouteProgress;
