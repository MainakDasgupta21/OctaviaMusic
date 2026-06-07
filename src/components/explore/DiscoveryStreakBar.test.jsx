import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import DiscoveryStreakBar from '@/components/explore/DiscoveryStreakBar';

describe('DiscoveryStreakBar', () => {
  it('renders streak and progression stats', () => {
    render(
      <DiscoveryStreakBar
        streakDays={5}
        level={3}
        xp={280}
        xpToNextLevel={80}
        progressToNext={0.66}
        badgesCount={4}
        challenge={{ title: 'Mood Hopper', completed: false }}
      />,
    );

    expect(screen.getByText(/discovery loop/i)).toBeInTheDocument();
    expect(screen.getByText(/days in a row/i)).toBeInTheDocument();
    expect(screen.getByText(/mood hopper/i)).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
