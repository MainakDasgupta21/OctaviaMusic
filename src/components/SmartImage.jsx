import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { pickPlaceholder, sanitizeImageUrl } from '@/lib/media-sanitize';

// =============================================================================
// SmartImage
// - Sanitizes the source through the media boundary so unsafe hosts never reach
//   the DOM.
// - Walks a fallback chain (maxresdefault -> hqdefault -> placeholder) on
//   `<img>` errors so a single missing variant doesn't leave the broken icon.
// - Optional `kind` selects the type-specific placeholder (track/album/artist/
//   genre/mix). Falls back to the track placeholder when omitted.
// =============================================================================

const buildFallbackChain = (rawSrc, kind, explicitFallback) => {
  const chain = [];
  if (typeof rawSrc === 'string' && rawSrc.trim().length) {
    const sanitized = sanitizeImageUrl(rawSrc.trim());
    if (sanitized) chain.push(sanitized);

    // For ytimg, queue an explicit hqdefault step before the placeholder.
    if (typeof sanitized === 'string') {
      const hqVariant = sanitized
        .replace('/maxresdefault.jpg', '/hqdefault.jpg')
        .replace('/sddefault.jpg', '/hqdefault.jpg')
        .replace('/mqdefault.jpg', '/hqdefault.jpg');
      if (hqVariant && hqVariant !== sanitized) chain.push(hqVariant);
    }
  }

  if (typeof explicitFallback === 'string' && explicitFallback.trim()) {
    chain.push(explicitFallback);
  }

  chain.push(pickPlaceholder(kind));

  // De-dupe consecutive identical entries.
  return chain.filter((entry, idx, arr) => entry && entry !== arr[idx - 1]);
};

// Builds a 2-entry `srcSet` for googleusercontent thumbnails that carry the
// =wN-hN size pattern. We only do this for non-hero usages; hero cards keep
// the full =w544-h544 variant because they're rendered large.
// Returns null when the URL doesn't match the pattern (e.g. ytimg .jpg, local
// placeholders) — the consumer falls back to a single-src render.
const buildSrcSet = (url) => {
  if (typeof url !== 'string' || !url) return null;
  const sizeMatch = url.match(/=w(\d+)-h(\d+)/);
  if (!sizeMatch) return null;
  const small = url.replace(/=w\d+-h\d+/, '=w272-h272');
  const large = url.replace(/=w\d+-h\d+/, '=w544-h544');
  if (small === large) return null;
  return `${small} 1x, ${large} 2x`;
};

const SmartImage = ({
  src,
  alt = '',
  className,
  imgClassName,
  rounded = 'rounded',
  loading = 'lazy',
  kind = 'track',
  fallbackSrc,
  hash,
  onLoad,
  onError,
  referrerPolicy = 'no-referrer',
  // Pass `sizes` per-callsite when you know the rendered width; otherwise we
  // default to a small tile that's safe for the most common usage (track
  // covers in grid/list contexts at ~150–272 CSS px). Hero callers should
  // override with e.g. `sizes="(min-width: 1024px) 640px, 100vw"`.
  sizes,
  // Opt-in flag for tappable image surfaces (TileCard, HeroCard, ArtistCircle).
  // When true, the wrapper picks up the shared `.lift` micro-interaction and
  // gains a 1px inset highlight ring on hover so the image reads as a real
  // interactive surface, not a flat thumbnail. Off by default — purely-decorative
  // images (sidebar/footer art) stay still.
  interactive = false,
  ...rest
}) => {
  // Hero images (`fetchpriority="high"`) skip the small-variant srcset and
  // load the largest variant directly — they're rendered big enough that the
  // CSS `1x` size would just blur on retina displays.
  const isHero = rest?.fetchpriority === 'high' || rest?.fetchPriority === 'high';
  const [loaded, setLoaded] = useState(false);

  const chain = useMemo(
    () => buildFallbackChain(src, kind, fallbackSrc),
    [src, kind, fallbackSrc],
  );
  const [chainIndex, setChainIndex] = useState(0);
  const indexRef = useRef(0);

  useEffect(() => {
    setLoaded(false);
    setChainIndex(0);
    indexRef.current = 0;
  }, [chain]);

  const handleError = (event) => {
    const next = indexRef.current + 1;
    if (next < chain.length) {
      indexRef.current = next;
      setChainIndex(next);
      return;
    }
    setLoaded(true);
    if (typeof onError === 'function') onError(event);
  };

  const handleLoad = (event) => {
    setLoaded(true);
    if (typeof onLoad === 'function') onLoad(event);
  };

  const currentSrc = chain[chainIndex] || pickPlaceholder(kind);
  const srcSet = isHero ? null : buildSrcSet(currentSrc);
  // Only attach `sizes` when we actually have a srcSet — otherwise it's
  // ignored by the browser anyway and creates noise in the DOM.
  const resolvedSizes = srcSet ? sizes || '272px' : undefined;

  return (
    <span
      className={cn(
        'relative block overflow-hidden bg-surface-2 group/sm-image',
        rounded,
        // Interactive wrappers gain a 1px inset highlight ring on hover.
        // The ring is rendered as an absolute overlay (below) so it can
        // sit on top of the image without affecting layout, and so it
        // respects whatever `rounded-*` shape the consumer set. The
        // physical lift is intentionally NOT handled here — consumer
        // components (TileCard, HeroCard, ArtistCircle) already manage
        // their own lift on the parent affordance, so doubling up here
        // would stack two translateY transforms.
        className,
      )}
    >
      {!loaded ? (
        <span
          aria-hidden="true"
          className={cn('absolute inset-0 skeleton', rounded)}
          style={hash ? { backgroundImage: `url(${hash})`, backgroundSize: 'cover' } : undefined}
        />
      ) : null}
      <img
        src={currentSrc}
        srcSet={srcSet || undefined}
        sizes={resolvedSizes}
        alt={alt}
        loading={loading}
        decoding="async"
        referrerPolicy={referrerPolicy}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'block w-full h-full object-cover transition-opacity duration-med ease-emphasis',
          loaded ? 'opacity-100' : 'opacity-0',
          imgClassName,
        )}
        {...rest}
      />
      {interactive ? (
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 transition-[box-shadow,opacity] duration-short ease-emphasis',
            // 1px inset ivory ring + a tinted halo just visible on hover.
            // Both colour stops fade in together so the image gains a
            // premium "tap me" affordance without a layout shift.
            'opacity-0 group-hover/sm-image:opacity-100',
            rounded,
          )}
          style={{
            boxShadow:
              'inset 0 0 0 1px hsl(var(--ink-primary) / 0.16), inset 0 1px 0 hsl(var(--ink-primary) / 0.22), 0 0 0 1px hsl(var(--track-accent) / 0.20)',
          }}
        />
      ) : null}
    </span>
  );
};

export default SmartImage;
