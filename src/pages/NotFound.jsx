import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Home, Search } from 'lucide-react';
import Button from '@/components/ui-v2/Button';
import { LogoMark } from '@/components/brand/Logo';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const angle = useMotionValue(0);
  const smooth = useSpring(angle, { stiffness: 60, damping: 18 });
  const [, setTilt] = useState(0);

  // Only log to console in development. Prod 404s should be surfaced via
  // a real telemetry pipeline, not a noisy console.warn.
  useEffect(() => {
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.warn('404:', location.pathname);
    }
  }, [location.pathname]);

  const handleDrag = (_, info) => {
    angle.set(angle.get() + info.delta.x);
    setTilt(Math.min(20, Math.abs(info.velocity.x) * 0.01));
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
      {/* Editorial dateline */}
      <div
        aria-hidden="true"
        className="hidden md:flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.22em] text-ink-4 mb-8"
      >
        <span className="w-8 h-px bg-white/15" />
        <span>Errata · The lost track</span>
        <span className="w-8 h-px bg-white/15" />
      </div>

      <LogoMark size={44} variant="mono" className="mb-6 text-ink-3 opacity-70" />

      <motion.div
        className="relative w-64 h-64 mb-10 cursor-grab active:cursor-grabbing select-none"
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.05}
        onDrag={handleDrag}
        style={{ rotate: smooth }}
      >
        {/* Warm-ink vinyl */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, hsl(30 11% 14%) 0%, hsl(30 11% 5%) 100%)',
            boxShadow:
              '0 30px 80px rgba(0,0,0,0.55), inset 0 0 30px rgba(0,0,0,0.65)',
          }}
        />
        {/* Concentric grooves */}
        <div className="absolute inset-4 rounded-full border border-white/[0.04]" />
        <div className="absolute inset-8 rounded-full border border-white/[0.045]" />
        <div className="absolute inset-12 rounded-full border border-white/[0.05]" />
        <div className="absolute inset-16 rounded-full border border-white/[0.055]" />
        <div className="absolute inset-20 rounded-full border border-white/[0.06]" />
        {/* Centre label — physical embossed disc with track-accent ring */}
        <div
          className="absolute inset-[36%] rounded-full flex items-center justify-center text-track-fg font-display italic text-4xl shadow-elev-4 ring-1 ring-white/15"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 25%, hsl(var(--ink-primary) / 0.22), transparent 55%), linear-gradient(135deg, hsl(var(--track-accent)), hsl(var(--track-accent-strong)))',
          }}
        >
          ?
        </div>
        {/* Crack — uses track-accent ember tone */}
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <path
            d="M100 12 L98 60 L120 80 L92 110 L130 140 L98 188"
            stroke="hsl(var(--track-accent) / 0.85)"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            style={{ filter: 'drop-shadow(0 0 6px hsl(var(--track-accent) / 0.5))' }}
          />
        </svg>
      </motion.div>

      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-track mb-3">
        404 · Track not found
      </p>
      <h1 className="font-display text-display-md md:text-display-lg text-ink leading-[0.95] mb-4 max-w-2xl mask-rise">
        <span>
          That track{' '}
          <em className="font-editorial text-track not-italic">skipped.</em>
        </span>
      </h1>
      <p className="font-editorial italic text-[15px] text-ink-3 max-w-md mb-7 leading-snug">
        We couldn't find{' '}
        <code className="font-mono not-italic text-ink-2 text-[13px]">
          {location.pathname}
        </code>
        . Spin the record while you think it over.
      </p>
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <Button
          leftIcon={<Home className="w-4 h-4" />}
          onClick={() => navigate('/')}
        >
          Go home
        </Button>
        <Button
          variant="editorial"
          leftIcon={<Search className="w-3.5 h-3.5" />}
          onClick={() => navigate('/search')}
        >
          Search the catalog
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
