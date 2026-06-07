import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
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
      <div className="grid grid-cols-[3.2rem_3.6rem_minmax(0,1fr)_5.8rem_7rem] md:grid-cols-[3.6rem_5.2rem_minmax(0,1fr)_minmax(0,0.85fr)_6.5rem_8rem] gap-3 px-4 py-3 border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-[0.18em] text-ink-4">
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
        <span className="hidden md:block">Top song</span>
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
          className="justify-self-end"
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[3.2rem_3.6rem_minmax(0,1fr)_6.8rem_4.5rem] md:grid-cols-[3.6rem_5.2rem_minmax(0,1fr)_5.5rem_8rem_5.2rem] lg:grid-cols-[3.6rem_5.2rem_minmax(0,1fr)_5.5rem_8rem_4.8rem_5.2rem] gap-3 px-4 py-3 border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-[0.18em] text-ink-4">
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
        className="hidden md:inline-flex justify-self-end"
      />
      <HeaderButton
        label={window === 'all_time' ? 'Streams (all time)' : 'Streams'}
        column="streams"
        sortable
        onSort={onSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        className="justify-self-end"
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
