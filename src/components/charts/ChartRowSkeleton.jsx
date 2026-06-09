import Skeleton from '@/components/ui-v2/Skeleton';
import {
  CHART_ARTIST_GRID_TEMPLATE,
  CHART_SONG_GRID_TEMPLATE,
} from '@/components/charts/grid-templates';

const SongSkeletonRow = () => (
  <div className={`grid ${CHART_SONG_GRID_TEMPLATE} gap-2.5 sm:gap-3 px-3 sm:px-4 py-3.5 items-center border-b border-white/[0.05]`}>
    <div className="space-y-2">
      <Skeleton className="h-6 sm:h-7 w-7 sm:w-8" />
      <Skeleton className="h-4 w-12" />
    </div>
    <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-md" />
    <div className="space-y-2 min-w-0">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <Skeleton className="hidden sm:block h-3 w-20 justify-self-end" />
    <Skeleton className="hidden lg:block h-3 w-14 justify-self-end" />
    <Skeleton className="hidden lg:block h-3 w-10 justify-self-end" />
    <Skeleton className="h-8 w-16 justify-self-end rounded-full" />
  </div>
);

const ArtistSkeletonRow = () => (
  <div className={`grid ${CHART_ARTIST_GRID_TEMPLATE} gap-2.5 sm:gap-3 px-3 sm:px-4 py-3.5 items-center border-b border-white/[0.05]`}>
    <div className="space-y-2">
      <Skeleton className="h-6 sm:h-7 w-7 sm:w-8" />
      <Skeleton className="h-4 w-12" />
    </div>
    <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full" />
    <div className="space-y-2 min-w-0">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3 w-1/3" />
    </div>
    <Skeleton className="hidden lg:block h-3 w-3/4" />
    <Skeleton className="hidden sm:block h-3 w-16 justify-self-end" />
    <Skeleton className="h-3 w-20 justify-self-end" />
  </div>
);

const ChartRowSkeleton = ({ mode = 'songs' }) =>
  mode === 'artists' ? <ArtistSkeletonRow /> : <SongSkeletonRow />;

export default ChartRowSkeleton;
