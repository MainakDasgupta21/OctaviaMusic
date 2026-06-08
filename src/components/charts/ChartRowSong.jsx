import { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SmartImage from '@/components/SmartImage';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ChartRankDelta from '@/components/charts/ChartRankDelta';
import ChartRowActions from '@/components/charts/ChartRowActions';
import {
  EMPTY_VALUE,
  formatCompactNumber,
  formatExactNumber,
} from '@/lib/chartsUtils';
import { cn } from '@/lib/utils';

const formatStreamsCompact = (entry) => {
  if (Number.isFinite(entry?.streams) && entry.streams > 0) {
    return formatCompactNumber(entry.streams);
  }
  // Some upstream paths only set the formatted label; trust it but never crash
  // if the formatter returned 'N/A' or an empty string.
  const label = typeof entry?.streamsLabel === 'string' ? entry.streamsLabel.trim() : '';
  if (!label || /^n\/?a$/i.test(label)) return EMPTY_VALUE;
  return label.replace(/\s*streams$/i, '');
};

const formatStreamsExact = (entry) => {
  if (Number.isFinite(entry?.streams) && entry.streams > 0) {
    return `${formatExactNumber(entry.streams)} streams`;
  }
  const label = typeof entry?.exactStreamsLabel === 'string' ? entry.exactStreamsLabel.trim() : '';
  if (!label || /^n\/?a$/i.test(label)) return 'No stream data available';
  return label;
};

const Equalizer = () => (
  <span className="inline-flex items-end gap-[2px] h-5" aria-label="Now playing">
    <span className="now-playing-bar" style={{ animationDelay: '0ms' }} />
    <span className="now-playing-bar" style={{ animationDelay: '120ms' }} />
    <span className="now-playing-bar" style={{ animationDelay: '240ms' }} />
  </span>
);

const ChartRowSong = ({
  entry,
  isCurrent,
  isPlaying,
  onPlay,
  onShare,
  onAddFavorite,
  onGoAlbum,
  onGoArtist,
}) => (
  <motion.div
    layout
    role="listitem"
    tabIndex={0}
    onClick={() => onPlay?.(entry)}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onPlay?.(entry);
      }
    }}
    className={cn(
      'group grid grid-cols-[2.6rem_2.8rem_minmax(0,1fr)_auto] sm:grid-cols-[2.8rem_3rem_minmax(0,1fr)_5.6rem_auto] md:grid-cols-[3.2rem_4.2rem_minmax(0,1fr)_4.8rem_7rem_auto] lg:grid-cols-[3.2rem_4.2rem_minmax(0,1fr)_4.8rem_7rem_4.6rem_auto] gap-3 px-3 sm:px-4 py-3.5 items-center border-b border-white/[0.05] transition-[background-color,border-color] duration-short ease-emphasis cursor-pointer focus-ring rounded-sharp',
      'hover:bg-white/[0.04]',
      isCurrent && 'bg-track/[0.10] border-l-[3px] border-l-track',
    )}
  >
    <div className="min-w-0">
      <div
        className={cn(
          'text-[28px] leading-none font-display tabular-nums',
          entry.rank === 1 ? 'text-amber-300' : 'text-ink',
        )}
      >
        {isCurrent && isPlaying ? <Equalizer /> : <span>{entry.rank}</span>}
      </div>
      <ChartRankDelta rank={entry.rank} prevRank={entry.prevRank} peakRank={entry.peakRank} className="mt-1" />
    </div>

    <div className="w-12 h-12 rounded-md overflow-hidden transition-transform duration-short ease-emphasis group-hover:scale-110">
      <SmartImage
        src={entry.coverUrl}
        alt={`${entry.title} cover art`}
        kind="track"
        className="w-full h-full rounded-md"
        imgClassName="object-cover"
        loading="lazy"
        interactive
      />
    </div>

    <div className="min-w-0">
      <Link
        to={
          entry.albumId
            ? `/album/${encodeURIComponent(entry.albumId)}`
            : `/search?q=${encodeURIComponent(`${entry.title} ${entry.artist}`)}`
        }
        onClick={(event) => event.stopPropagation()}
        className="text-[15px] font-semibold text-ink truncate block hover:text-track transition-colors"
      >
        {entry.title}
      </Link>
      <Link
        to={`/artist/${encodeURIComponent(entry.artistId)}`}
        onClick={(event) => event.stopPropagation()}
        className="text-[13px] text-track/90 truncate block mt-0.5 hover:text-track transition-colors"
      >
        {entry.artist}
      </Link>
    </div>

    <span className="hidden md:block text-[12px] text-ink-4 justify-self-end tabular-nums">
      {Number.isFinite(entry.weeksOnChart) && entry.weeksOnChart > 0
        ? `${entry.weeksOnChart} w`
        : EMPTY_VALUE}
    </span>

    <Tooltip>
      <TooltipTrigger asChild>
        <span className="hidden sm:block text-[13px] text-ink-2 justify-self-end tabular-nums cursor-default">
          {formatStreamsCompact(entry)}
        </span>
      </TooltipTrigger>
      <TooltipContent className="text-xs">
        {formatStreamsExact(entry)}
      </TooltipContent>
    </Tooltip>

    <span className="hidden lg:block text-[12px] text-ink-4 justify-self-end tabular-nums">
      {entry.duration && entry.duration !== '0:00' ? entry.duration : EMPTY_VALUE}
    </span>

    <ChartRowActions
      entry={entry}
      onPlay={onPlay}
      onShare={onShare}
      onAddFavorite={onAddFavorite}
      onGoAlbum={onGoAlbum}
      onGoArtist={onGoArtist}
    />
  </motion.div>
);

export default memo(ChartRowSong);
