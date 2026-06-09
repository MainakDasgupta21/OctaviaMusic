import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import {
  CHART_ARTIST_GRID_TEMPLATE,
  CHART_SONG_GRID_TEMPLATE,
} from '@/components/charts/grid-templates';
import { cn } from '@/lib/utils';

const SortIcon = ({ active, direction }) => {
  if (!active) return <ArrowUpDown className="w-3 h-3 text-ink-4" />;
  if (direction === 'asc') return <ArrowUp className="w-3 h-3" />;
  return <ArrowDown className="w-3 h-3" />;
};

const HeaderButton = ({
  label,
  column,
  sortable = false,
  onSort,
  sortColumn,
  sortDirection,
  className,
}) => {
  const isActive = sortColumn === column;
  if (!sortable) {
    return <span className={cn('text-left', className)}>{label}</span>;
  }
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={cn(
        'inline-flex items-center gap-1 text-left transition-colors focus-ring rounded-sharp',
        isActive ? 'text-ink' : 'text-ink-3 hover:text-ink',
        className,
      )}
      aria-label={`Sort by ${label.toLowerCase()} ${isActive && sortDirection === 'desc' ? 'ascending' : 'descending'}`}
    >
      <span>{label}</span>
      <SortIcon active={isActive} direction={sortDirection} />
    </button>
  );
};

const ChartColumnHeaders = ({ mode, window, sortColumn, sortDirection, onSort }) => {
  if (mode === 'artists') {
    return (
      <div
        className={cn(
          'grid',
          CHART_ARTIST_GRID_TEMPLATE,
          'gap-2.5 sm:gap-3 px-3 sm:px-4 py-3 border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-[0.18em] text-ink-4',
        )}
      >
        <span>Rank</span>
        <span aria-hidden="true" />
        <HeaderButton
          label="Artist"
          column="name"
          sortable
          onSort={onSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
        />
        <span className="hidden lg:block">Top song</span>
        <HeaderButton
          label="Tracks"
          column="tracksOnChart"
          sortable
          onSort={onSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          className="justify-self-end"
        />
        <HeaderButton
          label="Monthly listeners"
          column="monthlyStreams"
          sortable
          onSort={onSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          className="hidden sm:inline-flex justify-self-end"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid',
        CHART_SONG_GRID_TEMPLATE,
        'gap-2.5 sm:gap-3 px-3 sm:px-4 py-3 border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-[0.18em] text-ink-4',
      )}
    >
      <span>Rank</span>
      <span aria-hidden="true" />
      <span>Title</span>
      <HeaderButton
        label="Weeks"
        column="weeksOnChart"
        sortable
        onSort={onSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        className="hidden lg:inline-flex justify-self-end"
      />
      <HeaderButton
        label={window === 'all_time' ? 'Streams (all time)' : 'Streams'}
        column="streams"
        sortable
        onSort={onSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        className="hidden sm:inline-flex justify-self-end"
      />
      <HeaderButton
        label="Duration"
        column="duration"
        sortable
        onSort={onSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        className="hidden lg:inline-flex justify-self-end"
      />
      <span className="justify-self-end">Actions</span>
    </div>
  );
};

export default ChartColumnHeaders;
