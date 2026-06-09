import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Play,
  Shuffle,
  Pin,
  Trash2,
  Music2,
  ListMusic,
  Pencil,
  GripVertical,
} from 'lucide-react';
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
import { usePlaylists } from '@/contexts/PlaylistContext';
import Button from '@/components/ui-v2/Button';
import EmptyState from '@/components/ui-v2/EmptyState';
import HeartButton from '@/components/HeartButton';
import SmartImage from '@/components/SmartImage';
import { fadeUp } from '@/design/motion';
import { shuffleArray } from '@/lib/shuffle';
import notify from '@/lib/notify';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const sumDuration = (tracks) => {
  let total = 0;
  for (const t of tracks) {
    const [m = 0, s = 0] = (t.duration || '0:00').split(':').map(Number);
    total += m * 60 + s;
  }
  const mins = Math.floor(total / 60);
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs > 0) return `${hrs} hr ${rem} min`;
  return `${mins} min`;
};

const SortableTrack = ({ track, index, onPlay, onRemove, isCurrent }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: track.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      onClick={onPlay}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPlay?.();
        }
      }}
      tabIndex={0}
      role="button"
      className={cn(
        'group row-hover grid grid-cols-[1.25rem_2rem_minmax(0,1fr)_auto] sm:grid-cols-[1.5rem_2.5rem_3rem_minmax(0,1fr)_auto_auto] gap-2.5 sm:gap-3 px-2.5 sm:px-3 py-3 items-center transition-colors border-b border-white/[0.04] last:border-0',
        isCurrent ? 'bg-track/[0.08]' : 'hover:bg-white/[0.035]',
      )}
      {...attributes}
    >
      {/* Hairline drag handle */}
      <button
        type="button"
        className="touch-target flex items-center justify-center text-ink-4 hover:text-ink-2 cursor-grab active:cursor-grabbing focus-ring rounded-sharp transition-colors"
        aria-label="Drag to reorder"
        onClick={(event) => event.stopPropagation()}
        {...listeners}
      >
        <GripVertical className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>
      <span
        className={cn(
          'flex justify-center font-display italic text-xl leading-none tabular-nums',
          isCurrent ? 'text-accent' : 'text-ink-3',
        )}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <SmartImage
        src={track.thumbnail}
        alt=""
        kind="track"
        rounded="rounded-sharp"
        className="hidden sm:block w-10 h-10 ring-1 ring-white/10"
        imgClassName="object-cover"
      />
      <div className="min-w-0">
        <p
          className={cn(
            'text-[14px] font-medium truncate',
            isCurrent ? 'text-accent' : 'text-ink',
          )}
        >
          {track.title}
        </p>
        <p className="font-editorial text-[12.5px] text-ink-3 truncate mt-0.5">
          by {track.artist || 'Unknown artist'}
        </p>
      </div>
      <div onClick={(e) => e.stopPropagation()} className="hidden sm:block">
        <HeartButton track={track} size="sm" />
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="touch-action-visible p-1.5 rounded-sharp text-ink-3 hover:text-danger hover:bg-danger/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus-ring transition-opacity"
        aria-label="Remove from playlist"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

// 4-up cover collage built from first 4 tracks' thumbnails (or fewer).
const CollageCover = ({ tracks }) => {
  const thumbs = tracks.slice(0, 4).map((t) => t.thumbnail).filter(Boolean);
  if (thumbs.length === 0) {
    return (
      <div className="w-48 h-48 md:w-64 md:h-64 rounded-sharp overflow-hidden shadow-elev-5 ring-1 ring-white/15 bg-surface-2 flex items-center justify-center">
        <ListMusic className="w-16 h-16 text-ink-3" strokeWidth={1.25} />
      </div>
    );
  }
  if (thumbs.length === 1) {
    return (
      <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-sharp overflow-hidden shadow-elev-5 ring-1 ring-white/15">
        <SmartImage
          src={thumbs[0]}
          alt=""
          kind="mix"
          rounded="rounded-none"
          className="w-full h-full"
          imgClassName="object-cover"
        />
      </div>
    );
  }
  // 2x2 collage — fills with repeated thumbs if <4
  const filled = [...thumbs];
  while (filled.length < 4) filled.push(thumbs[filled.length % thumbs.length]);
  return (
    <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-sharp overflow-hidden shadow-elev-5 ring-1 ring-white/15 grid grid-cols-2 grid-rows-2 gap-px bg-white/[0.06]">
      {filled.slice(0, 4).map((src, i) => (
        <SmartImage
          key={i}
          src={src}
          alt=""
          kind="mix"
          rounded="rounded-none"
          className="w-full h-full"
          imgClassName="object-cover"
        />
      ))}
    </div>
  );
};

const PlaylistPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    playlists,
    updatePlaylist,
    deletePlaylist,
    removeTrackFromPlaylist,
    togglePin,
    reorderTracks,
  } = usePlaylists();
  const { playTracksInOrder, currentTrack } = usePlayer();
  const playlist = useMemo(() => playlists.find((p) => p.id === id), [playlists, id]);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(playlist?.name ?? '');
  const [draftDesc, setDraftDesc] = useState(playlist?.description ?? '');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!playlist) {
    return (
      <div className="page-shell-content pt-6 md:pt-10">
        <EmptyState
          icon={Music2}
          title="Playlist not found"
          description="It may have been deleted."
          action={<Button onClick={() => navigate('/library')}>Back to library</Button>}
        />
      </div>
    );
  }

  const handlePlayAll = () => {
    if (!playlist.tracks.length) return;
    playTracksInOrder(playlist.tracks, {
      replaceQueue: true,
      startIndex: 0,
      forceSequential: true,
    });
  };

  const handleShuffle = () => {
    if (!playlist.tracks.length) return;
    const shuffled = shuffleArray(playlist.tracks);
    playTracksInOrder(shuffled, {
      replaceQueue: true,
      startIndex: 0,
      forceSequential: false,
    });
    notify.info(`Shuffling \u00b7 ${playlist.name}`);
  };

  const handlePlayFromIndex = (index) => {
    playTracksInOrder(playlist.tracks, {
      replaceQueue: true,
      startIndex: index,
      forceSequential: true,
    });
  };

  const handleSave = () => {
    updatePlaylist(playlist.id, {
      name: draftName.trim() || playlist.name,
      description: draftDesc,
    });
    setEditing(false);
    toast.success('Playlist updated');
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = playlist.tracks.findIndex((t) => t.id === active.id);
    const newIdx = playlist.tracks.findIndex((t) => t.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    reorderTracks(playlist.id, oldIdx, newIdx);
  };

  const totalRunTime = sumDuration(playlist.tracks);

  return (
    <div className="pb-12">
      {/* Hero */}
      <div className="page-shell-content relative pt-10 md:pt-14 pb-10">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-50"
          style={{
            background:
              'radial-gradient(ellipse at 30% 0%, hsl(var(--track-accent) / 0.20) 0%, transparent 55%)',
          }}
        />

        {/* Top dateline */}
        <div
          aria-hidden="true"
          className="hidden md:flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-ink-4 mb-8 pb-3 border-b border-white/[0.08]"
        >
          <span>The Collection</span>
          <span className="flex items-center gap-3">
            <span className="text-ink-3">✦</span>
            <span>Curated by you</span>
            <span className="text-ink-3">✦</span>
          </span>
          <span>{playlist.pinned ? 'Pinned' : 'Saved'}</span>
        </div>

        <motion.div
          {...fadeUp}
          className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-10"
        >
          <CollageCover tracks={playlist.tracks} />
          <div className="text-center md:text-left flex-1 min-w-0">
            <p className="eyebrow eyebrow-accent mb-3 flex items-center gap-2 justify-center md:justify-start">
              <span className="w-5 h-px bg-track" />
              Playlist
            </p>
            {editing ? (
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') {
                    setEditing(false);
                    setDraftName(playlist.name);
                  }
                }}
                autoFocus
                className="font-display text-display-lg bg-transparent border-b border-white/20 focus:border-track outline-none w-full text-ink"
              />
            ) : (
              <h1
                onClick={() => setEditing(true)}
                className="font-display text-display-xl md:text-display-2xl text-ink leading-[0.88] cursor-text mask-rise"
              >
                <span>{playlist.name}</span>
              </h1>
            )}
            {editing ? (
              <input
                value={draftDesc}
                onChange={(e) => setDraftDesc(e.target.value)}
                placeholder="Add description"
                className="mt-4 font-editorial text-[15px] text-ink-2 bg-transparent border-b border-white/10 focus:border-track outline-none w-full placeholder:italic placeholder:text-ink-4"
              />
            ) : (
              <p
                className="mt-4 font-editorial text-[15px] text-ink-2 cursor-text leading-snug"
                onClick={() => setEditing(true)}
              >
                {playlist.description || (
                  <span className="text-ink-4 italic">Add description</span>
                )}
              </p>
            )}
            <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-4">
              {playlist.tracks.length}{' '}
              {playlist.tracks.length === 1 ? 'track' : 'tracks'}
              {playlist.tracks.length > 0 ? ` · ${totalRunTime}` : ''}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Actions */}
      <div className="page-shell-content mb-8 flex items-center gap-3 flex-wrap">
        {editing ? (
          <>
            <Button onClick={handleSave}>Save</Button>
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setDraftName(playlist.name);
                setDraftDesc(playlist.description);
              }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              size="lg"
              onClick={handlePlayAll}
              leftIcon={<Play className="w-4 h-4 fill-current" />}
              disabled={!playlist.tracks.length}
            >
              Play
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={handleShuffle}
              leftIcon={<Shuffle className="w-4 h-4" />}
              disabled={!playlist.tracks.length}
            >
              Shuffle
            </Button>
            <Button
              variant="editorial"
              size="lg"
              leftIcon={
                <Pin
                  className={`w-3.5 h-3.5 ${playlist.pinned ? 'fill-current text-accent' : ''}`}
                />
              }
              onClick={() => togglePin(playlist.id)}
            >
              {playlist.pinned ? 'Unpin' : 'Pin'}
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              onClick={() => setEditing(true)}
              aria-label="Edit details"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              onClick={() => {
                if (window.confirm(`Delete "${playlist.name}"?`)) {
                  deletePlaylist(playlist.id);
                  toast.success('Playlist deleted');
                  navigate('/library');
                }
              }}
              aria-label="Delete playlist"
            >
              <Trash2 className="w-4 h-4 text-danger" />
            </Button>
          </>
        )}
      </div>

      {/* Tracks */}
      <section className="page-shell-content">
        {playlist.tracks.length === 0 ? (
          <EmptyState
            icon={ListMusic}
            title="Empty playlist"
            description="Use the + playlist buttons across Search, charts, and player screens to start adding songs."
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={playlist.tracks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="rounded-soft border border-white/[0.06] bg-surface-2/40 backdrop-blur-md overflow-hidden">
                {/* Tracklist header */}
                <div
                  aria-hidden="true"
                  className="grid grid-cols-[1.25rem_2rem_minmax(0,1fr)_auto] sm:grid-cols-[1.5rem_2.5rem_3rem_minmax(0,1fr)_auto_auto] gap-2.5 sm:gap-3 px-2.5 sm:px-3 py-3 border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-[0.18em] text-ink-4"
                >
                  <span aria-hidden="true" />
                  <span className="text-center">№</span>
                  <span className="hidden sm:inline" aria-hidden="true" />
                  <span>Title</span>
                  <span className="hidden sm:inline" aria-hidden="true" />
                  <span aria-hidden="true" />
                </div>
                {playlist.tracks.map((track, index) => (
                  <SortableTrack
                    key={track.id}
                    track={track}
                    index={index}
                    isCurrent={currentTrack?.id === track.id}
                    onPlay={() => handlePlayFromIndex(index)}
                    onRemove={() => removeTrackFromPlaylist(playlist.id, track.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>
    </div>
  );
};

export default PlaylistPage;
