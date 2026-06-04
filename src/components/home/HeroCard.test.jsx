import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import HeroCard from '@/components/home/HeroCard';

const feature = {
  cover: 'https://i.ytimg.com/vi/JGwWNGJdvx8/maxresdefault.jpg',
  eyebrow: 'Featured today',
  label: 'Daily feature',
  title: 'A test cover story',
  description: 'Example copy',
  to: '/album/test',
};

describe('HeroCard', () => {
  it('renders semantic Read more link without nested button', () => {
    render(
      <MemoryRouter>
        <HeroCard feature={feature} issueNum="123" onPlay={() => {}} isPlayable />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /read more/i });
    expect(link).toHaveAttribute('href', '/album/test');
    expect(link.querySelector('button')).toBeNull();
  });

  it('disables play button when feature is not playable', () => {
    render(
      <MemoryRouter>
        <HeroCard feature={feature} issueNum="123" onPlay={() => {}} isPlayable={false} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /play feature/i })).toBeDisabled();
  });
});
