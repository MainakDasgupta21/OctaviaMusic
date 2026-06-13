import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ZoomIn, ZoomOut } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import Button from '@/components/ui-v2/Button';
import {
  baseCoverScale,
  clampOffset,
  cropToDataUrl,
  ImageInputError,
  loadImageFromFile,
} from '@/lib/image-crop';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

/**
 * Crop + zoom editor for a freshly-picked avatar file. The picked photo is
 * shown in a square viewport behind a circular mask; the user drags to
 * reposition and zooms via the slider or wheel. On save we render the exact
 * on-screen crop to a small JPEG data URL and hand it back via `onSave`.
 */
const AvatarEditorDialog = ({ file, open, onOpenChange, onSave, saving = false }) => {
  const viewportRef = useRef(null);
  const imageRef = useRef(null);
  const revokeRef = useRef(null);
  const dragRef = useRef(null);

  const [image, setImage] = useState(null);
  const [viewport, setViewport] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);

  // Decode the picked file into an <img> we can draw from.
  useEffect(() => {
    if (!open || !file) return undefined;
    let active = true;
    setLoading(true);
    setImage(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });

    loadImageFromFile(file)
      .then(({ image: img, revoke }) => {
        if (!active) {
          revoke();
          return;
        }
        revokeRef.current = revoke;
        imageRef.current = img;
        setImage(img);
        setLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        setLoading(false);
        onOpenChange?.(false);
        toast.error(
          error instanceof ImageInputError ? error.message : 'That image could not be read',
        );
      });

    return () => {
      active = false;
    };
  }, [file, open, onOpenChange]);

  // Release the decoded object URL when the editor closes.
  useEffect(() => {
    if (open) return undefined;
    return () => {
      revokeRef.current?.();
      revokeRef.current = null;
      imageRef.current = null;
    };
  }, [open]);

  // Track the real rendered viewport size so crop math matches the preview.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => setViewport(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [image]);

  const scale = image && viewport ? baseCoverScale({ image, viewport }) * zoom : 1;

  const applyOffset = useCallback(
    (next) => {
      if (!image || !viewport) return;
      setOffset(clampOffset({ image, viewport, scale, offset: next }));
    },
    [image, viewport, scale],
  );

  const handlePointerDown = (e) => {
    if (!image) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: offset };
  };

  const handlePointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    applyOffset({
      x: drag.origin.x + (e.clientX - drag.startX),
      y: drag.origin.y + (e.clientY - drag.startY),
    });
  };

  const endDrag = (e) => {
    if (!dragRef.current) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    dragRef.current = null;
  };

  const handleWheel = (e) => {
    if (!image) return;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom - e.deltaY * 0.0015));
    setZoom(next);
  };

  // Keep the image covering the viewport whenever the zoom changes.
  useEffect(() => {
    applyOffset(offset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  const handleSave = () => {
    if (!image || !viewport) return;
    try {
      const dataUrl = cropToDataUrl({ image, viewport, zoom, offset });
      onSave?.(dataUrl);
    } catch (error) {
      toast.error(
        error instanceof ImageInputError ? error.message : 'Could not process that image',
      );
    }
  };

  const coverWidth = image ? image.naturalWidth * baseCoverScale({ image, viewport: viewport || 1 }) : 0;
  const coverHeight = image ? image.naturalHeight * baseCoverScale({ image, viewport: viewport || 1 }) : 0;

  return (
    <Dialog open={open} onOpenChange={saving ? undefined : onOpenChange}>
      <DialogContent className="w-[min(calc(100%-1rem),26rem)] sm:w-[min(calc(100%-2rem),26rem)]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Adjust your photo</DialogTitle>
          <DialogDescription className="font-editorial">
            Drag to reposition, and use the slider to zoom. We crop to a circle.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={viewportRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={handleWheel}
          className="relative mx-auto aspect-square w-full max-w-[300px] cursor-grab touch-none select-none overflow-hidden rounded-sharp bg-surface-3 active:cursor-grabbing"
        >
          {image ? (
            <img
              src={image.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none origin-center"
              style={{
                width: `${coverWidth}px`,
                height: `${coverHeight}px`,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
              }}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-[12px] font-mono uppercase tracking-[0.16em] text-ink-3">
              {loading ? 'Loading…' : 'No image'}
            </div>
          )}

          {/* Circular crop mask: dim everything outside the avatar circle and
              draw a hairline ring on the crop boundary. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, transparent calc(50% - 1px), hsl(0 0% 0% / 0.55) 50%)',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-[1px] rounded-full ring-1 ring-white/30"
          />
        </div>

        <div className="flex items-center gap-3 px-1">
          <ZoomOut className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
          <Slider
            className="settings-slider"
            value={[zoom]}
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            onValueChange={(v) => setZoom(v[0])}
            aria-label="Zoom"
            disabled={!image}
          />
          <ZoomIn className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange?.(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} loading={saving} disabled={!image || saving}>
            Save photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarEditorDialog;
