import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import ArtistCircle from '@/components/home/ArtistCircle';

describe('ArtistCircle', () => {
  it('links to artist route when canonical slug exists', () => {
    render(
      <MemoryRouter>
        <ArtistCircle
          artist="Test Artist"
          sample="https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg"
          slug="UC1234567890"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /test artist/i })).toHaveAttribute(
      'href',
      '/artist/UC1234567890',
    );
  });

  it('renders non-link fallback when slug is missing', () => {
    render(
      <MemoryRouter>
        <ArtistCircle
          artist="No Slug Artist"
          sample="https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg"
          slug={null}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: /no slug artist/i })).toBeNull();
    expect(screen.getByText(/artist profile unavailable/i).closest('[aria-disabled="true"]')).toBeTruthy();
  });
});
