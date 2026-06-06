import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { getArtist, getAlbum } from '@/lib/api';
import { cachePolicy, queryKeys } from '@/lib/query-keys';
import { artistSlugOf, isUsableArtistSlug } from '@/lib/slug';
import { usePlayer } from '@/contexts/PlayerContext';
import SmartImage from '@/components/SmartImage';
import { cn } from '@/lib/utils';

const itemIdentity = (item) =>
  item?.videoId || item?.id || `${item?.title || ''}::${item?.artist || ''}`;

// Pulls an artist slug usable for /api/artist out of any top-result shape.
// Albums and songs sometimes carry the slug under different fields.
const slugFromTopResult = (topResult) => {
  if (!topResult) return '';
  if (topResult._kind === 'artist' || topResult.type === 'artist') {
    return topResult.slug || artistSlugOf(topResult);
  }
  return artistSlugOf(topResult);
};

const isAlbum = (topResult) =>
  Boolean(topResult && (topResult._kind === 'album' || topResult.type === 'album'));

const isArtist = (topResult) =>
  Boolean(topResult && (topResult._kind === 'artist' || topResult.type === 'artist'));

// Renamed from `RelatedRail` to `SearchRelatedRail` to avoid the name
// collision with `PlayerRelatedRail`. A backwards-compatible `RelatedRail`
// export is kept below so existing callers don't break in a single commit.
export const SearchRelatedRail = ({ topResult }) => {
  const { playTrack, addToQueue } = usePlayer();

  const artistSlug = useMemo(() => slugFromTopResult(topResult), [topResult]);

  // Fetch the artist payload to surface their top tracks / other albums.
  // React Query dedupes against /artist/:slug visits, so this rail re-uses
  // the cache when the user has already visited this artist's page.
  const { data: artist } = useQuery({
    queryKey: queryKeys.artist(artistSlug),
    queryFn: () => getArtist(artistSlug),
    enabled: Boolean(artistSlug && isUsableArtistSlug(artistSlug)),
    ...cachePolicy.artist,
  });

  // For album top results we also pull the album payload so the rail can
  // surface the album's track listing if the artist endpoint doesn't return
  // it.
  const albumId = isAlbum(topResult) ? topResult.id || topResult.albumId : null;
  const { data: album } = useQuery({
    queryKey: queryKeys.album(albumId),
    queryFn: () => getAlbum(albumId),
    enabled: Boolean(albumId),
    ...cachePolicy.album,
  });

  const { kind, items, heading } = useMemo(() => {
    if (!topResult) return { kind: null, items: [], heading: '' };

    if (isArtist(topResult)) {
      const albums = Array.isArray(artist?.albums) ? artist.albums : [];
      if (albums.length > 0) {
        return {
          kind: 'album',
          items: albums.slice(0, 6),
          heading: `More from ${artist?.name || topResult.name || 'this artist'}`,
        };
      }
      const tracks = Array.isArray(artist?.topTracks) ? artist.topTracks : [];
      return {
        kind: 'song',
        items: tracks.slice(0, 6),
        heading: 'Top tracks',
      };
    }

    if (isAlbum(topResult)) {
      // Prefer "more albums by this artist"; fall back to album tracks.
      const albums = Array.isArray(artist?.albums) ? artist.albums : [];
      const otherAlbums = albums.filter((a) => a.id !== topResult.id);
      if (otherAlbums.length > 0) {
        return {
          kind: 'album',
          items: otherAlbums.slice(0, 6),
          heading: `More by ${topResult.artist || artist?.name || 'this artist'}`,
        };
      }
      const tracks = Array.isArray(album?.tracks) ? album.tracks : [];
      return {
        kind: 'song',
        items: tracks.slice(0, 6),
        heading: `From ${topResult.title || 'this album'}`,
      };
    }

    // Song top result: surface other top tracks by the same artist.
    const topTracks = Array.isArray(artist?.topTracks) ? artist.topTracks : [];
    const others = topTracks.filter((t) => itemIdentity(t) !== itemIdentity(topResult));
    if (others.length > 0) {
      return {
        kind: 'song',
        items: others.slice(0, 6),
        heading: `More from ${topResult.artist || artist?.name || 'this artist'}`,
      };
    }
    const albums = Array.isArray(artist?.albums) ? artist.albums : [];
    if (albums.length > 0) {
      return {
        kind: 'album',
        items: albums.slice(0, 4),
        heading: `${topResult.artist || artist?.name || 'this artist'} · Albums`,
      };
    }
    return { kind: null, items: [], heading: '' };
  }, [topResult, artist, album]);

  if (!items.length) return null;

  return (
    <section className="mt-6">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-4 mb-3 flex items-center gap-2">
        <span className="w-4 h-px bg-ink-4/40" />
        {heading}
      </h3>
      <div className="grid grid-cols-2 gap-2.5">
        {items.map((item) => (
          <RelatedItem
            key={`${kind}-${itemIdentity(item)}`}
            kind={kind}
            item={item}
            onPlay={() => {
              if (kind === 'song') {
                playTrack(item);
              }
            }}
            onQueue={() => {
              if (kind === 'song') addToQueue(item);
            }}
          />
        ))}
      </div>
    </section>
  );
};

const RelatedItem = ({ kind, item, onPlay, onQueue }) => {
  if (kind === 'album') {
    return (
      <Link
        to={`/album/${item.id}?from=search`}
        className={cn(
          'group flex items-center gap-2.5 p-2 rounded-sharp border border-white/[0.06]',
          'hover:bg-white/[0.04] hover:border-white/[0.18] transition-colors focus-ring',
        )}
      >
        <SmartImage
          src={item.thumbnail}
          alt=""
          kind="album"
          rounded="rounded-sharp"
          className="w-10 h-10 flex-shrink-0 ring-1 ring-white/10"
          imgClassName="object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium truncate text-ink">
            {item.title || item.name}
          </p>
          <p className="font-editorial text-[11px] text-ink-3 truncate">
            {item.year ? `Album · ${item.year}` : 'Album'}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onPlay}
      onAuxClick={onQueue}
      className={cn(
        'group flex items-center gap-2.5 p-2 rounded-sharp border border-white/[0.06] text-left',
        'hover:bg-white/[0.04] hover:border-white/[0.18] transition-colors focus-ring',
      )}
    >
      <div className="relative w-10 h-10 flex-shrink-0">
        <SmartImage
          src={item.thumbnail}
          alt=""
          kind="track"
          rounded="rounded-sharp"
          className="w-10 h-10 ring-1 ring-white/10"
          imgClassName="object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity rounded-sharp">
          <Play className="w-3.5 h-3.5 text-white fill-current" />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium truncate text-ink">{item.title}</p>
        <p className="font-editorial text-[11px] text-ink-3 truncate">
          {item.artist || 'Unknown artist'}
        </p>
      </div>
    </button>
  );
};

// Backwards-compatible alias — TODO: remove once all callers migrate.
export const RelatedRail = SearchRelatedRail;

export default SearchRelatedRail;
