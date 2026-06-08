import { Check, ListMusic, Plus } from 'lucide-react';
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import usePlaylistActions from '@/hooks/use-playlist-actions';
import { cn } from '@/lib/utils';

const AddToPlaylistSubmenu = ({
  track,
  menuType = 'dropdown',
  triggerLabel = 'Add to playlist',
  onActionComplete,
  navigateOnCreate = true,
  contentClassName,
}) => {
  const {
    playlists,
    isTrackInPlaylist,
    addTrackToPlaylistWithFeedback,
    createPlaylistFromTrack,
  } = usePlaylistActions();

  const handleCreatePlaylist = () => {
    const createdId = createPlaylistFromTrack({ track, navigateTo: navigateOnCreate });
    if (createdId) onActionComplete?.({ status: 'created', playlistId: createdId });
  };

  const handleAddTrack = (playlist) => {
    const result = addTrackToPlaylistWithFeedback({ playlist, track });
    if (result.status !== 'invalid') {
      onActionComplete?.({ status: result.status, playlistId: playlist.id });
    }
  };

  const renderItems = ({ Item, Separator }) => (
    <>
      <Item
        disabled={!track?.id}
        onClick={(event) => {
          event.stopPropagation();
          handleCreatePlaylist();
        }}
      >
        <Plus className="w-4 h-4 mr-2" />
        New playlist
      </Item>
      {playlists.length > 0 ? <Separator /> : null}
      {playlists.length > 0 ? (
        playlists.map((playlist) => {
          const alreadyAdded = isTrackInPlaylist(playlist, track);
          return (
            <Item
              key={playlist.id}
              disabled={!track?.id || alreadyAdded}
              onClick={(event) => {
                event.stopPropagation();
                handleAddTrack(playlist);
              }}
              className={cn(alreadyAdded && 'opacity-80')}
            >
              {alreadyAdded ? (
                <Check className="w-4 h-4 mr-2 text-track" />
              ) : (
                <ListMusic className="w-4 h-4 mr-2 opacity-70" />
              )}
              <span className="truncate">{playlist.name}</span>
            </Item>
          );
        })
      ) : (
        <Item disabled>No playlists yet</Item>
      )}
    </>
  );

  if (menuType === 'context') {
    return (
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Plus className="w-4 h-4 mr-2" />
          {triggerLabel}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent
          className={cn('w-56 bg-surface-3/95 backdrop-blur-xl border-white/10', contentClassName)}
        >
          {renderItems({ Item: ContextMenuItem, Separator: ContextMenuSeparator })}
        </ContextMenuSubContent>
      </ContextMenuSub>
    );
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Plus className="w-4 h-4 mr-2" />
        {triggerLabel}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent
        className={cn('w-56 bg-surface-2 border-white/10 text-ink', contentClassName)}
      >
        {renderItems({ Item: DropdownMenuItem, Separator: DropdownMenuSeparator })}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

export default AddToPlaylistSubmenu;
