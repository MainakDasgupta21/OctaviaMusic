import NowPlaying from '@/components/player/NowPlaying';

// Thin route wrapper around the canonical now-playing surface.
// MainLayout already owns page-level scroll locking for `/player`; this route
// stays intentionally minimal so internal panel scrolling remains predictable.
const PlayerPage = () => {
  return <NowPlaying />;
};

export default PlayerPage;
