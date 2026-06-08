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
import SmartImage from '@/components/SmartImage';
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
        'group grid grid-cols-[1.5rem_2.25rem_1fr_auto_auto] items-center gap-2.5 rounded-panel px-2 py-2',
        isCurrent
          ? 'border border-track/25 bg-track/[0.1]'
          : 'row-hover',
      )}
      {...attributes}
    >
      <span
        aria-hidden="true"
        className="relative flex items-center justify-center w-6 h-5 overflow-hidden"
      >
        <span
          className={cn(
            'font-mono text-tiny tabular-nums transition-all duration-short',
            'group-hover:opacity-0 group-hover:-translate-y-0.5',
            isCurrent ? 'text-accent' : 'text-ink-4',
          )}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <Play
          className={cn(
            'absolute w-3.5 h-3.5 fill-current opacity-0 scale-75 transition-all duration-short',
            'group-hover:opacity-100 group-hover:scale-100',
            isCurrent ? 'text-accent' : 'text-ink-2',
          )}
        />
      </span>
      <SmartImage
        src={track.thumbnail}
        alt=""
        kind="track"
        rounded="rounded-lg"
        className="h-9 w-9 flex-shrink-0 ring-1 ring-white/10"
        imgClassName="object-cover"
      />
      <button
        type="button"
        onClick={onPlay}
        className="flex-1 min-w-0 text-left focus-ring rounded-md"
      >
        <p
          className={cn(
            'truncate text-label font-medium',
            isCurrent ? 'text-accent' : 'text-ink',
          )}
        >
          {track.title}
        </p>
        <p className="mt-0.5 truncate text-tiny text-ink-3">
          by {track.artist || 'Unknown artist'}
        </p>
      </button>
      <button
        type="button"
        {...listeners}
        className="flex items-center justify-center text-ink-4 hover:text-ink-2 focus:text-ink-2 cursor-grab active:cursor-grabbing focus-ring rounded-md transition-opacity duration-short opacity-40 group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 rounded-md text-ink-4 hover:text-danger hover:bg-danger/10 opacity-40 group-hover:opacity-100 focus-visible:opacity-100 focus-ring transition-opacity"
        aria-label="Remove from queue"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </li>
  );
};

const QueuePanel = () => {
  const { queue, currentTrack, playTrack, removeFromQueue, reorderQueue } = usePlayer();
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
      <div className="mb-3 flex items-center justify-between border-b border-white/[0.06] px-2 pb-2">
        <h3 className="font-mono text-eyebrow uppercase tracking-[0.2em] text-ink-4">Up next</h3>
        <span className="font-mono text-micro uppercase tracking-[0.18em] text-ink-4 tabular-nums">
          {queue.length} queued
        </span>
      </div>

      <div data-lenis-prevent className="flex-1 overflow-y-auto custom-scrollbar -mx-1 px-1">
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
                    isCurrent={currentTrack?.id === t.id}
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
