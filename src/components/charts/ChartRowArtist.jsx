import { memo } from 'react';
import { ChevronDown, ChevronUp, Play, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import SmartImage from '@/components/SmartImage';
import ChartRankDelta from '@/components/charts/ChartRankDelta';
import { CHART_ARTIST_GRID_TEMPLATE } from '@/components/charts/grid-templates';
import {
  EMPTY_VALUE,
  flagFromCountry,
  formatCompactNumber,
  formatCountryName,
} from '@/lib/chartsUtils';
import { cn } from '@/lib/utils';

const NationalityLabel = ({ country }) => {
  if (!country) return <span className="text-ink-4">{EMPTY_VALUE}</span>;
  const flag = flagFromCountry(country);
  const displayName = formatCountryName(country);
  return (
    <span className="inline-flex items-center gap-1.5">
      {flag ? (
        <span aria-hidden="true" className="text-[13px] leading-none">
          {flag}
        </span>
      ) : null}
      <span>{displayName}</span>
    </span>
  );
};

const renderListeners = (entry) => {
  if (typeof entry.monthlyStreams === 'string'
    && entry.monthlyStreams.trim()
    && !/^n\/?a$/i.test(entry.monthlyStreams)) {
    return entry.monthlyStreams;
  }
  if (Number.isFinite(entry.monthlyStreamsValue) && entry.monthlyStreamsValue > 0) {
    return `${formatCompactNumber(entry.monthlyStreamsValue)} monthly`;
  }
  return EMPTY_VALUE;
};

const ChartRowArtist = ({
  entry,
  expanded,
  onToggleExpand,
  onPlayTrack,
  onShare,
}) => (
  <div role="listitem" className="border-b border-white/[0.05] last:border-b-0">
    <motion.div
      layout
      className={cn(
        'group grid gap-2.5 sm:gap-3 px-3 sm:px-4 py-3.5 items-center transition-colors duration-short ease-emphasis',
        CHART_ARTIST_GRID_TEMPLATE,
        'hover:bg-white/[0.04]',
      )}
    >
      <div>
        <div className="text-[24px] sm:text-[28px] leading-none font-display tabular-nums text-ink">{entry.rank}</div>
        <ChartRankDelta rank={entry.rank} prevRank={entry.prevRank} className="mt-1" />
      </div>

      <Link to={`/artist/${encodeURIComponent(entry.artistId)}`} className="block w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden">
        <SmartImage
          src={entry.avatarUrl}
          alt={`${entry.name} avatar`}
          kind="artist"
          className="w-full h-full rounded-full ring-1 ring-white/10"
          imgClassName="object-cover transition-transform duration-short ease-emphasis group-hover:scale-110"
          loading="lazy"
          interactive
        />
      </Link>

      <div className="min-w-0">
        <Link
          to={`/artist/${encodeURIComponent(entry.artistId)}`}
          className="text-[15px] font-semibold text-ink hover:text-track transition-colors truncate block"
        >
          {entry.name}
        </Link>
        <p className="text-[12px] text-ink-4 mt-0.5 truncate">
          <NationalityLabel country={entry.nationality} />
        </p>
      </div>

      <p className="hidden lg:block text-[12px] italic text-track/85 truncate">
        {entry.topSong && !/^n\/?a$/i.test(entry.topSong)
          ? `Top: ${entry.topSong}`
          : EMPTY_VALUE}
      </p>

      <button
        type="button"
        onClick={() => onToggleExpand(entry.id)}
        className="justify-self-end inline-flex items-center gap-1 text-[12px] text-ink-2 hover:text-ink transition-colors focus-ring rounded-sharp px-1.5 py-0.5"
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} tracks for ${entry.name}`}
      >
        <span className="tabular-nums">
          {Number.isFinite(entry.tracksOnChart) ? entry.tracksOnChart : 0}
        </span>
        <span className="hidden md:inline">
          {entry.tracksOnChart === 1 ? 'track on chart' : 'tracks on chart'}
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      <div className="hidden sm:flex justify-self-end items-center gap-2">
        <span className="text-[12px] text-ink-2 tabular-nums">
          {renderListeners(entry)}
        </span>
        <button
          type="button"
          onClick={() => onShare?.(entry)}
          className="h-7 w-7 rounded-full border border-white/15 bg-white/[0.04] text-ink-4 hover:text-ink hover:bg-white/[0.08] transition-colors focus-ring inline-flex items-center justify-center opacity-0 group-hover:opacity-100 max-md:opacity-100"
          aria-label={`Share chart position for ${entry.name}`}
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>

    <AnimatePresence initial={false}>
      {expanded ? (
        <motion.div
          key="expanded"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden bg-white/[0.02]"
        >
          <div className="px-4 sm:px-6 py-3 space-y-2">
            {entry.chartedTracks?.length ? (
              entry.chartedTracks.map((track) => (
                <div key={track.id} className="grid grid-cols-[2rem_minmax(0,1fr)_2.5rem] sm:grid-cols-[2.5rem_minmax(0,1fr)_7rem_2.5rem] items-center gap-2.5 sm:gap-3 text-[12px]">
                  <span className="font-mono text-ink-4 tabular-nums">#{track.rank}</span>
                  <span className="text-ink-2 truncate">{track.title}</span>
                  <span className="hidden sm:inline justify-self-end text-ink-3 tabular-nums">
                    {formatCompactNumber(track.streams)}
                  </span>
                  <button
                    type="button"
                    className="touch-target h-8 w-8 sm:h-7 sm:w-7 rounded-full border border-white/15 bg-white/[0.04] text-ink-3 hover:text-ink hover:bg-white/[0.08] transition-colors focus-ring inline-flex items-center justify-center"
                    onClick={() => onPlayTrack(track, entry)}
                    aria-label={`Play ${track.title} by ${entry.name}`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-[12px] text-ink-4">
                No charted tracks were returned for this artist in this chart.
              </p>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  </div>
);

export default memo(ChartRowArtist);
