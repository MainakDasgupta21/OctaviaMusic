import { Globe2, Music2 } from 'lucide-react';
import SectionHeader from '@/components/ui-v2/SectionHeader';
import SmartImage from '@/components/SmartImage';
import SharedJourneyCard from '@/components/explore/SharedJourneyCard';
import Button from '@/components/ui-v2/Button';

const CommunityDiscoveryStrip = ({
  highlights = [],
  journeys = [],
  onPlayHighlight,
  onPlayJourney,
  onShareJourney,
}) => (
  <section className="mb-14">
    <SectionHeader
      ordinal={7}
      eyebrow="Community layer"
      title="Discover with the world"
      subtitle="Real-time momentum and shareable journey snapshots from listeners like you."
    />

    <div className="rounded-soft border border-white/[0.08] bg-surface-2/45 p-4 md:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-4 inline-flex items-center gap-2">
          <Globe2 className="w-3.5 h-3.5" />
          Live community highlights
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {highlights.slice(0, 6).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onPlayHighlight?.(item)}
            className="rounded-sharp border border-white/[0.08] hover:border-white/25 bg-surface-1/45 p-3 text-left focus-ring"
          >
            <div className="flex items-center gap-3">
              <SmartImage
                src={item.thumbnail}
                alt=""
                kind="track"
                rounded="rounded-sharp"
                className="w-12 h-12 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[14px] text-ink truncate">{item.title}</p>
                <p className="text-[12px] text-ink-3 truncate">{item.subtitle}</p>
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-ink-4 mt-1">
                  {item.statLabel}
                  {item.statValue ? ` · ${item.statValue}` : ''}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>

    <div className="mt-4 rounded-soft border border-white/[0.08] bg-surface-2/45 p-4 md:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-ink-4 inline-flex items-center gap-2">
          <Music2 className="w-3.5 h-3.5" />
          Shared journeys
        </p>
        <Button
          type="button"
          size="sm"
          variant="glass"
          disabled={!journeys[0]}
          onClick={() => {
            if (!journeys[0]) return;
            onPlayJourney?.(journeys[0]);
          }}
        >
          Start featured journey
        </Button>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {journeys.slice(0, 3).map((journey) => (
          <SharedJourneyCard
            key={journey.id}
            journey={journey}
            onPlay={onPlayJourney}
            onShare={onShareJourney}
          />
        ))}
      </div>
    </div>
  </section>
);

export default CommunityDiscoveryStrip;
