import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import usePlaylistActions from '@/hooks/use-playlist-actions';
import { cn } from '@/lib/utils';

const AddToPlaylistButton = ({
  track,
  className,
  buttonLabel = 'Add current track to playlist',
  align = 'start',
  side = 'top',
  sideOffset = 12,
  contentClassName,
  navigateOnCreate = true,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const {
    playlists,
    isTrackInPlaylist,
    addTrackToPlaylistWithFeedback,
    createPlaylistFromTrack,
  } = usePlaylistActions();

  const handleCreatePlaylist = (event) => {
    event?.stopPropagation?.();
    const createdId = createPlaylistFromTrack({ track, navigateTo: navigateOnCreate });
    if (createdId) setOpen(false);
  };

  const handleAddTrack = (playlist, event) => {
    event?.stopPropagation?.();
    const result = addTrackToPlaylistWithFeedback({ playlist, track });
    if (result.status !== 'invalid') setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          className={cn(
            'relative p-2 rounded-full text-ink-3 hover:text-ink hover:bg-white/5 transition-colors focus-ring',
            className,
          )}
          aria-label={buttonLabel}
        >
          {children || <Plus className="w-4 h-4" />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        sideOffset={sideOffset}
        className={cn('w-[320px] p-0 bg-surface-1/95 backdrop-blur-xl border-white/[0.08]', contentClassName)}
      >
        <div className="px-4 pt-3 pb-2 border-b border-white/[0.06] flex items-center justify-between gap-2">
          <p className="eyebrow text-ink-3">Add to playlist</p>
          <button
            type="button"
            onClick={handleCreatePlaylist}
            disabled={!track?.id}
            className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink-3 hover:text-ink focus-ring rounded-sharp px-1.5 py-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            New playlist
          </button>
        </div>

        <div data-lenis-prevent className="max-h-[280px] overflow-y-auto custom-scrollbar p-2">
          {playlists.length > 0 ? (
            playlists.map((playlist) => {
              const alreadyAdded = isTrackInPlaylist(playlist, track);
              return (
                <button
                  key={playlist.id}
                  type="button"
                  disabled={!track?.id || alreadyAdded}
                  onClick={(event) => handleAddTrack(playlist, event)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 rounded-sharp px-2 py-2 text-left text-[13px] transition-colors focus-ring',
                    alreadyAdded
                      ? 'cursor-default text-ink-4/90 bg-white/[0.02]'
                      : 'text-ink-2 hover:text-ink hover:bg-white/[0.05]',
                  )}
                >
                  <span className="truncate">{playlist.name}</span>
                  {alreadyAdded ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.12em] text-track">
                      <Check className="w-3 h-3" />
                      Added
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-ink-4">
                      Add
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <p className="px-2 py-2 text-[12px] text-ink-4">
              No playlists yet. Create one to save this track.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AddToPlaylistButton;
