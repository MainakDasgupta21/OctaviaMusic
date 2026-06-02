import { useCallback, useEffect, useRef } from 'react';

// Returns a ref and the props you spread onto the wrapper. Mouse position
// drives rotateX/rotateY and updates --mx/--my for the gloss highlight.
export const useTilt = ({ max = 8, perspective = 800, scale = 1.02, glare = true } = {}) => {
  const ref = useRef(null);

  const reset = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale(1)`;
    el.style.setProperty('--mx', '50%');
    el.style.setProperty('--my', '50%');
  }, [perspective]);

  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;  // 0..1
    const y = (e.clientY - rect.top) / rect.height;  // 0..1
    const ry = (x - 0.5) * 2 * max;
    const rx = -(y - 0.5) * 2 * max;
    el.style.transform = `perspective(${perspective}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`;
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
  }, [max, perspective, scale]);

  useEffect(() => () => reset(), [reset]);

  return {
    ref,
    handlers: {
      onMouseMove: onMove,
      onMouseLeave: reset,
      onBlur: reset,
    },
    glare,
  };
};
