import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// Image with a built-in shimmer skeleton + lazy loading. Crossfades on load.
// thumbhash integration is wired but optional: pass `hash` to render a tiny
// decoded preview; we ship without the runtime cost unless callers opt in.
const SmartImage = ({
  src,
  alt = '',
  className,
  rounded = 'rounded',
  loading = 'lazy',
  hash,
  ...rest
}) => {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

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
        ref={ref}
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={cn(
          'block w-full h-full object-cover transition-opacity duration-med ease-emphasis',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
        {...rest}
      />
    </span>
  );
};

export default SmartImage;
