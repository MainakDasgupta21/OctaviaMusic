import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Play,
  ListPlus,
  ListMusic,
  User,
  Disc,
  Heart,
  HeartOff,
  Share2,
  Copy,
  Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { usePlaylists } from '@/contexts/PlaylistContext';
import { artistSlugOf, isUsableArtistSlug } from '@/lib/slug';
import notify from '@/lib/notify';

const TrackContextMenu = ({ track, children, onShareLink }) => {
  const navigate = useNavigate();
  const { playTrack, addToQueue, playTrackNext } = usePlayer();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { playlists, addTrackToPlaylist, createPlaylist } = usePlaylists();
  const liked = track ? isFavorite(track.id) : false;

  const handleShare = async () => {
    const url = onShareLink?.() || (typeof window !== 'undefined' ? window.location.href : '');
    try {
      if (navigator.share) {
        await navigator.share({ title: track.title, text: `${track.title} — ${track.artist}`, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        notify.copied('Link');
      }
    } catch {
      /* user cancelled */
    }
  };

  const handleCopy = async () => {
    const url = onShareLink?.() || (typeof window !== 'undefined' ? window.location.href : '');
    try {
      await navigator.clipboard.writeText(url);
      notify.copied('Link');
    } catch {
      notify.error("Couldn't copy");
    }
  };

  if (!track) return children;

  // Use the canonical slug supplied by the API when available; otherwise
  // derive one from the artist name. If we have nothing usable we disable the
  // menu item rather than route to a guessed slug.
  const artistSlug = artistSlugOf(track);
  const canVisitArtist = isUsableArtistSlug(artistSlug);
  const albumId = track.albumId || null;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56 bg-surface-3/95 backdrop-blur-xl border-white/10">
        <ContextMenuItem onClick={() => playTrack(track)}>
          <Play className="w-4 h-4 mr-2" /> Play
        </ContextMenuItem>
        <ContextMenuItem onClick={() => { playTrackNext(track); notify.added(`${track.title} \u2014 plays next`); }}>
          <ListPlus className="w-4 h-4 mr-2" /> Play next
        </ContextMenuItem>
        <ContextMenuItem onClick={() => { addToQueue(track); notify.added(track.title); }}>
          <ListMusic className="w-4 h-4 mr-2" /> Add to queue
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Plus className="w-4 h-4 mr-2" /> Add to playlist
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-56 bg-surface-3/95 backdrop-blur-xl border-white/10">
            <ContextMenuItem
              onClick={() => {
                const id = createPlaylist({ name: track.title, tracks: [track], pinned: true });
                notify.added(`Playlist \u2014 ${track.title}`);
                navigate(`/playlist/${id}`);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> New playlist
            </ContextMenuItem>
            {playlists.length > 0 && <ContextMenuSeparator />}
            {playlists.map((p) => (
              <ContextMenuItem
                key={p.id}
                onClick={() => { addTrackToPlaylist(p.id, track); notify.added(`${track.title} \u2192 ${p.name}`); }}
              >
                <ListMusic className="w-4 h-4 mr-2 opacity-70" /> {p.name}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem
          disabled={!canVisitArtist}
          onClick={() => {
            if (!canVisitArtist) return;
            navigate(`/artist/${artistSlug}`);
          }}
        >
          <User className="w-4 h-4 mr-2" /> Go to artist
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!albumId}
          onClick={() => {
            if (!albumId) return;
            navigate(`/album/${albumId}`);
          }}
        >
          <Disc className="w-4 h-4 mr-2" /> Go to album
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => {
            toggleFavorite(track);
            if (liked) notify.unliked(track.title); else notify.liked(track.title);
          }}
        >
          {liked ? (
            <><HeartOff className="w-4 h-4 mr-2" /> Unlike</>
          ) : (
            <><Heart className="w-4 h-4 mr-2" /> Like</>
          )}
        </ContextMenuItem>
        <ContextMenuItem onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" /> Share
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopy}>
          <Copy className="w-4 h-4 mr-2" /> Copy link
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default TrackContextMenu;
