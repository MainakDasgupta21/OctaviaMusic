import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import ChartsHero from '@/components/charts/ChartsHero';
import ChartsFilters from '@/components/charts/ChartsFilters';
import ChartsList from '@/components/charts/ChartsList';
import ChartShareModal from '@/components/charts/ChartShareModal';
import ThisDayInMusicCard from '@/components/charts/ThisDayInMusicCard';
import useChartFilters from '@/hooks/useChartFilters';
import useChartData from '@/hooks/useChartData';
import useChartSort from '@/hooks/useChartSort';
import { getThisDayInMusic } from '@/lib/thisDayInMusic';
import { getRegionMeta, getWindowMeta } from '@/lib/chartsUtils';
import notify from '@/lib/notify';

const dateToken = () => new Date().toISOString().slice(0, 10);

const ChartsPage = () => {
  const navigate = useNavigate();
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const { toggleFavorite } = useFavorites();

  const {
    mode,
    region,
    window: chartWindow,
    setMode,
    setRegion,
    setWindow,
  } = useChartFilters();
  const {
    data,
    isLoading,
    isError,
    refetch,
    lastUpdated,
    staleWarning,
    isStaleData,
  } = useChartData({
    mode,
    region,
    window: chartWindow,
  });
  const { sortedData, sortColumn, sortDirection, toggleSort } = useChartSort({ mode, data });

  const [shareEntry, setShareEntry] = useState(null);
  const [expandedArtistRows, setExpandedArtistRows] = useState(new Set());
  const [announcement, setAnnouncement] = useState('');
  const [dismissedThisDay, setDismissedThisDay] = useState(false);

  const listKey = `${mode}-${region}-${chartWindow}`;
  const today = dateToken();
  const thisDayDismissKey = `octavia.this-day.${region}.${today}`;

  const thisDayFact = useMemo(
    () => getThisDayInMusic({ region, date: new Date() }),
    [region, today],
  );

  useEffect(() => {
    const regionMeta = getRegionMeta(region);
    const windowMeta = getWindowMeta(chartWindow);
    const modeLabel = mode === 'songs' ? 'Top songs' : 'Top artists';
    setAnnouncement(`Now showing: ${modeLabel} in ${regionMeta.label}, ${windowMeta.label}.`);
  }, [mode, region, chartWindow]);

  useEffect(() => {
    setExpandedArtistRows(new Set());
  }, [listKey]);

  useEffect(() => {
    try {
      setDismissedThisDay(window.localStorage.getItem(thisDayDismissKey) === '1');
    } catch {
      setDismissedThisDay(false);
    }
  }, [thisDayDismissKey]);

  const dismissThisDayCard = useCallback(() => {
    setDismissedThisDay(true);
    try {
      window.localStorage.setItem(thisDayDismissKey, '1');
    } catch {
      // Ignore storage failures (private mode/quota).
    }
  }, [thisDayDismissKey]);

  // These handlers are passed down to the memoized chart rows. Keeping their
  // identity stable (useCallback) lets React.memo on ChartRowSong/Artist skip
  // re-rendering every row when ChartsPage re-renders (e.g. on play/pause).
  const handlePlaySong = useCallback((song) => {
    playTrack(song);
  }, [playTrack]);

  const handlePlayArtistTrack = useCallback((track) => {
    playTrack(track);
  }, [playTrack]);

  const handleFavoriteSong = useCallback((song) => {
    const added = toggleFavorite(song);
    if (added == null) return;
    if (added) notify.liked(song.title);
    else notify.unliked(song.title);
  }, [toggleFavorite]);

  const handleGoAlbum = useCallback((song) => {
    if (song.albumId) {
      navigate(`/album/${encodeURIComponent(song.albumId)}`);
      return;
    }
    navigate(`/search?q=${encodeURIComponent(`${song.title} ${song.artist}`)}`);
  }, [navigate]);

  const handleGoArtist = useCallback((song) => {
    navigate(`/artist/${encodeURIComponent(song.artistId)}`);
  }, [navigate]);

  const handleToggleArtistRow = useCallback((artistRowId) => {
    setExpandedArtistRows((current) => {
      const next = new Set(current);
      if (next.has(artistRowId)) next.delete(artistRowId);
      else next.add(artistRowId);
      return next;
    });
  }, []);

  return (
    <div className="page-shell pt-5 md:pt-8 pb-12">
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <ChartsHero mode={mode} region={region} window={chartWindow} lastUpdated={lastUpdated} />

      <ChartsFilters
        mode={mode}
        region={region}
        window={chartWindow}
        setMode={setMode}
        setRegion={setRegion}
        setWindow={setWindow}
      />

      {staleWarning ? (
        <div
          role="status"
          className="mb-4 rounded-sharp border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[12px] text-amber-200"
        >
          {staleWarning}
          {isStaleData ? ' Retrying in background…' : ''}
        </div>
      ) : null}

      {chartWindow === 'today' && !dismissedThisDay ? (
        <ThisDayInMusicCard
          fact={thisDayFact}
          onDismiss={dismissThisDayCard}
          onExplore={() => navigate(`/search?q=${encodeURIComponent(`music history ${region}`)}`)}
        />
      ) : null}

      <ChartsList
        mode={mode}
        window={chartWindow}
        listKey={listKey}
        rows={sortedData}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={toggleSort}
        currentTrackId={currentTrack?.id}
        isPlaying={isPlaying}
        onPlaySong={handlePlaySong}
        onShareSong={setShareEntry}
        onFavoriteSong={handleFavoriteSong}
        onSongGoAlbum={handleGoAlbum}
        onSongGoArtist={handleGoArtist}
        onShareArtist={setShareEntry}
        expandedArtistRows={expandedArtistRows}
        onToggleArtistRow={handleToggleArtistRow}
        onPlayArtistTrack={handlePlayArtistTrack}
      />

      <ChartShareModal
        open={Boolean(shareEntry)}
        onOpenChange={(open) => {
          if (!open) setShareEntry(null);
        }}
        entry={shareEntry}
        mode={mode}
        filters={{ mode, region, window: chartWindow }}
      />
    </div>
  );
};

export default ChartsPage;
