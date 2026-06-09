import { MoreHorizontal, Play } from 'lucide-react';
import Button from '@/components/ui-v2/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AddToPlaylistSubmenu from '@/components/playlist/AddToPlaylistSubmenu';
import { cn } from '@/lib/utils';

const ChartRowActions = ({
  entry,
  onPlay,
  onShare,
  onAddFavorite,
  onGoAlbum,
  onGoArtist,
  className,
}) => {
  return (
    <div
      className={cn(
        'touch-action-visible flex items-center justify-end gap-1.5 sm:gap-2 opacity-0 transition-opacity duration-short ease-emphasis',
        'group-hover:opacity-100 group-focus-within:opacity-100 md:opacity-0',
        'max-md:opacity-100',
        className,
      )}
    >
      <Button
        type="button"
        size="icon-sm"
        className="touch-target rounded-full h-9 w-9 md:h-8 md:w-8"
        onClick={(event) => {
          event.stopPropagation();
          onPlay?.(entry);
        }}
        aria-label={`Play ${entry.title} by ${entry.artist}`}
      >
        <Play className="w-3.5 h-3.5 fill-current" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="touch-target h-9 w-9 md:h-8 md:w-8 rounded-full border border-white/15 bg-white/[0.04] text-ink-3 hover:text-ink hover:bg-white/[0.08] transition-colors focus-ring inline-flex items-center justify-center"
            onClick={(event) => event.stopPropagation()}
            aria-label={`More actions for ${entry.title}`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-surface-2 border-white/10 text-ink min-w-[13rem]">
          <AddToPlaylistSubmenu track={entry} />
          <DropdownMenuItem
            onClick={(event) => {
              event.stopPropagation();
              onAddFavorite?.(entry);
            }}
          >
            Add to favorites
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(event) => {
              event.stopPropagation();
              onShare?.(entry);
            }}
          >
            Share chart position
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem
            onClick={(event) => {
              event.stopPropagation();
              onGoAlbum?.(entry);
            }}
          >
            Go to album
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(event) => {
              event.stopPropagation();
              onGoArtist?.(entry);
            }}
          >
            Go to artist
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ChartRowActions;
