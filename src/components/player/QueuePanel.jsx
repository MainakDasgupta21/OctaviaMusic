import { Play, Trash2, ListMusic, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePlayer } from '@/contexts/PlayerContext';
import EmptyState from '@/components/ui-v2/EmptyState';
import { cn } from '@/lib/utils';

const SortableQueueItem = ({ track, index, onPlay, onRemove, isCurrent }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: track.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'group grid grid-cols-[1.25rem_2rem_2.5rem_1fr_auto] items-center gap-2.5 px-2 py-2 rounded-sharp transition-colors',
        isCurrent ? 'bg-track/[0.10]' : 'hover:bg-white/[0.035]',
      )}
      {...attributes}
    >
      <button
        type="button"
        {...listeners}
        className="flex items-center justify-center text-ink-4 hover:text-ink-2 cursor-grab active:cursor-grabbing focus-ring rounded-sharp transition-colors"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>
      <span
        className={cn(
          'flex justify-center font-display italic text-base leading-none tabular-nums',
          isCurrent ? 'text-accent' : 'text-ink-4',
        )}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <img
        src={track.thumbnail}
        alt=""
        className="w-10 h-10 rounded-sharp object-cover flex-shrink-0 ring-1 ring-white/10"
      />
      <button
        type="button"
        onClick={onPlay}
        className="flex-1 min-w-0 text-left focus-ring rounded-sharp"
      >
        <p
          className={cn(
            'text-[13.5px] font-medium truncate',
            isCurrent ? 'text-accent' : 'text-ink',
          )}
        >
          {track.title}
        </p>
        <p className="font-editorial text-[12px] text-ink-3 truncate mt-0.5">
          by {track.artist}
        </p>
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 rounded-sharp text-ink-3 hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 focus-ring transition-opacity"
        aria-label="Remove from queue"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </li>
  );
};

const QueuePanel = () => {
  const { queue, currentTrack, isPlaying, playTrack, removeFromQueue, reorderQueue } = usePlayer();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (!reorderQueue) return;
    const oldIdx = queue.findIndex((t) => t.id === active.id);
    const newIdx = queue.findIndex((t) => t.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    reorderQueue(oldIdx, newIdx);
  };

  return (
    <div className="h-full flex flex-col pr-0.5">
      <div className="px-2 mb-3 pb-2 border-b border-white/[0.06] flex items-center justify-between">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
          Now playing
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 tabular-nums">
          {queue.length} up next
        </span>
      </div>

      {currentTrack ? (
        <div className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 p-2.5 mb-3 rounded-sharp border border-track/35 bg-track/[0.12] shadow-[0_8px_24px_hsl(var(--track-accent)/0.12)]">
          <img
            src={currentTrack.thumbnail}
            alt=""
            className="w-10 h-10 rounded-sharp object-cover ring-1 ring-white/10"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold truncate text-accent">
              {currentTrack.title}
            </p>
            <p className="font-editorial text-[12px] text-ink-3 truncate mt-0.5">
              by {currentTrack.artist}
            </p>
          </div>
          {isPlaying ? (
            <span aria-hidden="true" className="inline-flex items-end gap-0.5 h-3.5">
              <span className="sidebar-playing-bar [animation-delay:-0.3s]" />
              <span className="sidebar-playing-bar [animation-delay:-0.15s]" />
              <span className="sidebar-playing-bar" />
            </span>
          ) : (
            <Play className="w-4 h-4 text-accent fill-current" />
          )}
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2">
        {queue.length === 0 ? (
          <EmptyState
            icon={ListMusic}
            title="Queue is empty"
            description="Add a track from any song row or search result."
            className="py-12"
          />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={queue.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-1">
                {queue.map((t, i) => (
                  <SortableQueueItem
                    key={t.id}
                    track={t}
                    index={i}
                    isCurrent={false}
                    onPlay={() => playTrack(t)}
                    onRemove={() => removeFromQueue(t.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};

export default QueuePanel;
