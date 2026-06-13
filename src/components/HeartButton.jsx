import { useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useSounds } from '@/contexts/SoundContext';
import { isReducedMotion } from '@/design/motion';
import notify from '@/lib/notify';
import { cn } from '@/lib/utils';

const SIZE_MAP = {
  sm: { wrap: 'p-1.5', icon: 'w-4 h-4' },
  md: { wrap: 'p-2', icon: 'w-5 h-5' },
  lg: { wrap: 'p-2.5', icon: 'w-6 h-6' },
};

// Tighter eight-particle burst — smaller radius for an editorial twinkle.
const PARTICLES = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2;
  return { x: Math.cos(angle) * 14, y: Math.sin(angle) * 14, delay: i * 0.012 };
});

const HeartButton = ({ track, size = 'md', className }) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { play: playSfx } = useSounds();
  const liked = track?.id ? isFavorite(track.id) : false;
  const reduceMotion = isReducedMotion();
  const dims = SIZE_MAP[size] ?? SIZE_MAP.md;
  const [burst, setBurst] = useState(0);
  const tokenRef = useRef(0);

  if (!track) return null;

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const wasAdded = toggleFavorite(track);
    if (wasAdded == null) return;
    if (wasAdded) {
      if (!reduceMotion) {
        tokenRef.current += 1;
        setBurst(tokenRef.current);
      }
      playSfx('pop');
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(10); } catch { /* noop */ }
      }
      notify.liked(track.title);
    } else {
      playSfx('click');
      notify.unliked(track.title);
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileTap={reduceMotion ? undefined : { scale: 0.85 }}
      whileHover={reduceMotion ? undefined : { scale: 1.06 }}
      aria-pressed={liked}
      aria-label={liked ? `Unlike ${track.title}` : `Like ${track.title}`}
      className={cn(
        'relative rounded-full transition-colors focus-ring',
        dims.wrap,
        liked
          ? 'text-accent ring-1 ring-track/30'
          : 'text-ink-3 hover:text-ink',
        className,
      )}
    >
      <Heart className={cn(dims.icon, liked && 'fill-current')} strokeWidth={1.75} />
      <AnimatePresence>
        {burst > 0 ? (
          <motion.span
            key={burst}
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            aria-hidden="true"
          >
            {PARTICLES.map((p, i) => (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
                animate={{ x: p.x, y: p.y, scale: 0.85, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0, 0, 0.2, 1], delay: p.delay }}
                className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full -translate-x-1/2 -translate-y-1/2 bg-accent"
              />
            ))}
            <motion.span
              initial={{ scale: 0.5, opacity: 0.5 }}
              animate={{ scale: 1.9, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
              className="absolute inset-0 rounded-full border border-track/60"
            />
            {/* Multi-color iridescent confetti burst — CSS-only, sits on top. */}
            <span className="confetti-burst" aria-hidden="true" />
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.button>
  );
};

export default HeartButton;
