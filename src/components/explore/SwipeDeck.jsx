import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Heart, Music2, X } from 'lucide-react';
import Button from '@/components/ui-v2/Button';
import SmartImage from '@/components/SmartImage';

const SWIPE_THRESHOLD = 120;

const SwipeDeck = ({
  tracks = [],
  moodLabel = 'your vibe',
  onTrackEnter,
  onSave,
  onSkip,
  onShuffle,
  onDeckExhausted,
}) => {
  const [index, setIndex] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const playedTrackIdRef = useRef(null);
  const exhaustedSignatureRef = useRef('');
  const onTrackEnterRef = useRef(onTrackEnter);

  useEffect(() => {
    onTrackEnterRef.current = onTrackEnter;
  }, [onTrackEnter]);

  const listSignature = useMemo(
    () => {
      const firstId = tracks[0]?.id || '';
      const lastId = tracks[tracks.length - 1]?.id || '';
      return `${tracks.length}:${firstId}:${lastId}`;
    },
    [tracks],
  );

  useEffect(() => {
    setIndex(0);
    playedTrackIdRef.current = null;
    exhaustedSignatureRef.current = '';
  }, [listSignature]);

  const current = tracks[index] || null;
  const upcoming = tracks[index + 1] || null;
  const remaining = Math.max(0, tracks.length - index);

  useEffect(() => {
    const currentId = current?.id || null;
    if (!audioReady || !current || !currentId) return;
    if (playedTrackIdRef.current === currentId) return;
    playedTrackIdRef.current = currentId;
    onTrackEnterRef.current?.(current);
  }, [audioReady, current]);

  useEffect(() => {
    if (current || tracks.length === 0) return;
    const exhaustedKey = `${listSignature}:${index}`;
    if (exhaustedSignatureRef.current === exhaustedKey) return;
    exhaustedSignatureRef.current = exhaustedKey;
    const timer = window.setTimeout(() => {
      onDeckExhausted?.();
    }, 320);
    return () => window.clearTimeout(timer);
  }, [current, tracks.length, listSignature, index, onDeckExhausted]);

  const advance = (direction) => {
    if (!current) return;
    if (direction === 'right') onSave?.(current);
    if (direction === 'left') onSkip?.(current);
    setIndex((prev) => Math.min(prev + 1, tracks.length));
  };

  const handleSwipeEnd = (_event, info) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      advance('right');
      return;
    }
    if (info.offset.x < -SWIPE_THRESHOLD) {
      advance('left');
    }
  };

  if (!current) {
    return (
      <div className="rounded-soft border border-white/[0.08] bg-surface-2/55 p-6 text-center">
        <p className="font-display text-2xl text-ink">That stack is done.</p>
        <p className="font-editorial text-[13px] text-ink-3 mt-2">
          Deal a fresh crate or pick another mood.
        </p>
        {onShuffle ? (
          <Button
            variant="premium"
            size="lg"
            onClick={onShuffle}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="mt-4"
          >
            Deal a fresh crate
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-soft border border-white/[0.08] bg-surface-2/55 p-4 md:p-5">
      <div className="flex items-center justify-between mb-4 text-[11px] font-mono uppercase tracking-[0.18em] text-ink-4">
        <span>Play and decide</span>
        <div className="flex items-center gap-3">
          <span>{remaining} cards left</span>
          {onShuffle ? (
            <button
              type="button"
              onClick={onShuffle}
              className="rounded-full border border-white/[0.14] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-ink-3 hover:text-ink hover:border-white/30"
            >
              Shuffle
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative h-[460px] md:h-[520px]">
        {upcoming ? (
          <div className="absolute inset-x-4 top-4 bottom-4 rounded-soft border border-white/10 bg-surface-1/35" />
        ) : null}

        <motion.div
          drag={audioReady ? 'x' : false}
          dragElastic={0.18}
          onDragEnd={handleSwipeEnd}
          whileDrag={{ rotate: 4, scale: 1.01 }}
          className="absolute inset-0 rounded-soft overflow-hidden border border-white/15 shadow-elev-2 bg-surface-1"
        >
          <SmartImage
            src={current.thumbnail}
            alt=""
            kind="track"
            rounded="rounded-none"
            className="absolute inset-0 w-full h-full"
            imgClassName="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

          <div className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.17em] text-white/80">
            <Music2 className="w-3.5 h-3.5" />
            {moodLabel}
          </div>

          <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
            <h3 className="font-display text-2xl md:text-3xl text-white leading-tight">
              {current.title}
            </h3>
            <p className="font-editorial text-[14px] text-white/75 mt-2">
              {current.artist || 'Unknown artist'}
            </p>
          </div>

          {!audioReady ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-sm p-6">
              <div className="text-center">
                <p className="font-editorial text-[14px] text-white/75 mb-3">
                  One tap to unlock audio previews.
                </p>
                <Button
                  variant="premium"
                  size="lg"
                  onClick={() => setAudioReady(true)}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Start Play and Decide
                </Button>
              </div>
            </div>
          ) : null}
        </motion.div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button
          variant="glass"
          size="lg"
          onClick={() => advance('left')}
          leftIcon={<X className="w-4 h-4" />}
        >
          Swipe left · Skip
        </Button>
        <Button
          variant="premium"
          size="lg"
          onClick={() => advance('right')}
          leftIcon={<Heart className="w-4 h-4 fill-current" />}
        >
          Swipe right · Save
        </Button>
      </div>
    </div>
  );
};

export default SwipeDeck;
