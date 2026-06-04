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
  ...rest
}) => {
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

  return (
    <span className={cn('relative block overflow-hidden bg-surface-2', rounded, className)}>
      {!loaded ? (
        <span
          aria-hidden="true"
          className={cn('absolute inset-0 skeleton', rounded)}
          style={hash ? { backgroundImage: `url(${hash})`, backgroundSize: 'cover' } : undefined}
        />
      ) : null}
      <img
        src={currentSrc}
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
    </span>
  );
};

export default SmartImage;
