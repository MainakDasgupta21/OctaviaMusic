import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Music2, Loader2 } from 'lucide-react';
import { fetchLyrics, activeLineIndex } from '@/lib/lrc';
import { usePlayer, usePlayerProgress } from '@/contexts/PlayerContext';
import EmptyState from '@/components/ui-v2/EmptyState';
import { cn } from '@/lib/utils';

const LyricsPanel = () => {
  const { currentTrack, seekTo } = usePlayer();
  const { progress, duration } = usePlayerProgress();
  const [state, setState] = useState({ status: 'idle', data: null });
  const scrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!currentTrack) {
      setState({ status: 'idle', data: null });
      return;
    }
    setState({ status: 'loading', data: null });
    fetchLyrics({
      title: currentTrack.title,
      artist: currentTrack.artist,
      durationSec: duration || undefined,
    }).then((r) => {
      if (cancelled) return;
      if (!r) setState({ status: 'empty', data: null });
      else setState({ status: 'ready', data: r });
    });
    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist, duration]);

  const synced = state.data?.synced;
  const idx = synced ? activeLineIndex(synced, progress) : -1;

  useEffect(() => {
    if (idx < 0 || !scrollRef.current) return;
    const active = scrollRef.current.querySelector('[data-active="true"]');
    if (active) {
      active.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [idx]);

  if (state.status === 'loading') {
    return (
      <div className="h-full flex items-center justify-center text-ink-3 gap-2 font-editorial italic text-[14px] rounded-sharp border border-white/[0.06] bg-white/[0.02]">
        <Loader2 className="w-4 h-4 animate-spin not-italic" /> Loading lyrics…
      </div>
    );
  }

  if (state.status === 'empty' || !currentTrack) {
    return (
      <EmptyState
        icon={Music2}
        title="No lyrics yet"
        description="We couldn't find synced lyrics for this track."
        className="py-12"
      />
    );
  }

  if (synced?.length) {
    return (
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto custom-scrollbar px-3 py-12 space-y-3.5 text-center"
      >
        {synced.map((line, i) => {
          const isActive = i === idx;
          const isPast = i < idx;
          return (
            <motion.button
              key={`${i}-${line.time}`}
              type="button"
              data-active={isActive}
              onClick={() => seekTo(line.time)}
              animate={{
                opacity: isActive ? 1 : isPast ? 0.28 : 0.5,
                scale: isActive ? 1 : 0.96,
              }}
              transition={{ duration: 0.25 }}
              className={cn(
                'block w-full px-3 py-1.5 rounded-sharp font-editorial italic text-[17px] md:text-[19px] leading-snug focus-ring relative transition-colors',
                isActive
                  ? 'text-accent bg-track/[0.10]'
                  : 'text-ink-3 hover:text-ink hover:bg-white/[0.03]',
              )}
            >
              {/* Track-accent hairline cursor under active line */}
              {isActive ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-1/4 -bottom-1 h-px bg-track/60"
                />
              ) : null}
              {line.text || '\u00a0'}
            </motion.button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-4 py-8">
      <pre className="whitespace-pre-wrap font-editorial italic text-[15px] text-ink-2 leading-relaxed">
        {state.data.plain}
      </pre>
    </div>
  );
};

export default LyricsPanel;
