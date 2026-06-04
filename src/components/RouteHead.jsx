import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const SITE = 'Octavia';

const STATIC_TITLES = {
  '/': { title: 'Home', desc: 'Editorial music discovery, daily mixes, and immersive Now Playing.' },
  '/search': { title: 'Search', desc: 'Search songs, artists, albums, and lyrics across the catalog.' },
  '/charts': { title: 'Charts', desc: 'Top tracks by region, genre, and time window.' },
  '/explore': { title: 'Explore', desc: 'Daily mixes and moods personalized for you.' },
  '/genres': { title: 'Genres', desc: 'Browse music by genre.' },
  '/library': { title: 'Your library', desc: 'Stats, history, and favorites in one place.' },
  '/favorites': { title: 'Favorites', desc: 'Songs you love.' },
  '/player': { title: 'Now playing', desc: 'Immersive Now Playing with visualizer and synced lyrics.' },
  '/trending': { title: 'Trending', desc: 'What\'s trending right now.' },
  '/settings': { title: 'Settings', desc: 'Customize your Octavia experience.' },
};

const RouteHead = () => {
  const location = useLocation();
  const info = useMemo(() => {
    const path = location.pathname;
    if (STATIC_TITLES[path]) return STATIC_TITLES[path];
    if (path.startsWith('/artist/')) {
      const slug = path.split('/')[2] || '';
      const name = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return { title: name, desc: `Top tracks, discography, and similar artists for ${name}.` };
    }
    if (path.startsWith('/album/')) return { title: 'Album', desc: 'Album tracklist and credits.' };
    if (path.startsWith('/playlist/')) return { title: 'Playlist', desc: 'A playlist on Octavia.' };
    return { title: SITE, desc: 'Listen to music, beautifully.' };
  }, [location.pathname]);

  const title = info.title === SITE ? SITE : `${info.title} \u00b7 ${SITE}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={info.desc} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={info.desc} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={info.desc} />
    </Helmet>
  );
};

export default RouteHead;
