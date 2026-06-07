import Skeleton from '@/components/ui-v2/Skeleton';

const SongSkeletonRow = () => (
  <div className="grid grid-cols-[3.2rem_3.6rem_minmax(0,1fr)_6.8rem_4.5rem] md:grid-cols-[3.6rem_5.2rem_minmax(0,1fr)_5.5rem_8rem_5.2rem] lg:grid-cols-[3.6rem_5.2rem_minmax(0,1fr)_5.5rem_8rem_4.8rem_5.2rem] gap-3 px-4 py-3.5 items-center border-b border-white/[0.05]">
    <div className="space-y-2">
      <Skeleton className="h-7 w-8" />
      <Skeleton className="h-4 w-12" />
    </div>
    <Skeleton className="h-12 w-12 rounded-md" />
    <div className="space-y-2 min-w-0">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <Skeleton className="hidden md:block h-3 w-14 justify-self-end" />
    <Skeleton className="h-3 w-20 justify-self-end" />
    <Skeleton className="hidden lg:block h-3 w-10 justify-self-end" />
    <Skeleton className="h-8 w-16 justify-self-end rounded-full" />
  </div>
);

const ArtistSkeletonRow = () => (
  <div className="grid grid-cols-[3.2rem_3.6rem_minmax(0,1fr)_5.8rem_7rem] md:grid-cols-[3.6rem_5.2rem_minmax(0,1fr)_minmax(0,0.85fr)_6.5rem_8rem] gap-3 px-4 py-3.5 items-center border-b border-white/[0.05]">
    <div className="space-y-2">
      <Skeleton className="h-7 w-8" />
      <Skeleton className="h-4 w-12" />
    </div>
    <Skeleton className="h-12 w-12 rounded-full" />
    <div className="space-y-2 min-w-0">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3 w-1/3" />
    </div>
    <Skeleton className="hidden md:block h-3 w-3/4" />
    <Skeleton className="h-3 w-16 justify-self-end" />
    <Skeleton className="h-3 w-20 justify-self-end" />
  </div>
);

const ChartRowSkeleton = ({ mode = 'songs' }) =>
  mode === 'artists' ? <ArtistSkeletonRow /> : <SongSkeletonRow />;

export default ChartRowSkeleton;
