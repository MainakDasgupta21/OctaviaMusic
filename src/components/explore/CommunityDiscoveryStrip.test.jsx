import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CommunityDiscoveryStrip from '@/components/explore/CommunityDiscoveryStrip';

describe('CommunityDiscoveryStrip', () => {
  it('renders highlights and forwards interaction callbacks', () => {
    const onPlayHighlight = vi.fn();
    const onPlayJourney = vi.fn();
    const onShareJourney = vi.fn();

    render(
      <CommunityDiscoveryStrip
        highlights={[
          {
            id: 'h1',
            title: 'Neon Glow',
            subtitle: 'Pulse Artist',
            thumbnail: '/placeholders/track.svg',
            statLabel: 'Now peaking',
            track: { id: 't1' },
          },
        ]}
        journeys={[
          {
            id: 'j1',
            title: 'Night Drive',
            blurb: 'Road songs',
          },
        ]}
        onPlayHighlight={onPlayHighlight}
        onPlayJourney={onPlayJourney}
        onShareJourney={onShareJourney}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /neon glow/i }));
    fireEvent.click(screen.getByRole('button', { name: /start featured journey/i }));
    fireEvent.click(screen.getByRole('button', { name: /share/i }));

    expect(onPlayHighlight).toHaveBeenCalledTimes(1);
    expect(onPlayJourney).toHaveBeenCalled();
    expect(onShareJourney).toHaveBeenCalled();
  });
});
