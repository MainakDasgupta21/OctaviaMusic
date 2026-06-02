// =============================================================================
// Catalog seed. Single source of truth for the Express stub.
// IDs are stable so client routes (/album/:id, /artist/:slug) survive reloads.
// Thumbnails reuse the videoId so a track and its album share the same art
// unless the album defines an explicit cover.
// =============================================================================

const thumb = (videoId) => `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

// Artists -----------------------------------------------------------------
const artists = [
  {
    id: 'ar-ed-sheeran',
    slug: 'ed-sheeran',
    name: 'Ed Sheeran',
    verified: true,
    monthly: '78.4M monthly listeners',
    coverVideoId: 'JGwWNGJdvx8',
    bio: 'British singer-songwriter known for melodic hooks and conversational lyrics.',
  },
  {
    id: 'ar-yoasobi',
    slug: 'yoasobi',
    name: 'YOASOBI',
    verified: true,
    monthly: '24.1M monthly listeners',
    coverVideoId: 'IeyJ7MPb7MQ',
    bio: 'Japanese duo turning novels into chart-topping J-pop anthems.',
  },
  {
    id: 'ar-queen',
    slug: 'queen',
    name: 'Queen',
    verified: true,
    monthly: '42.7M monthly listeners',
    coverVideoId: 'fJ9rUzIMcZQ',
    bio: 'British rock legends behind some of the most recognisable songs ever recorded.',
  },
  {
    id: 'ar-dua-lipa',
    slug: 'dua-lipa',
    name: 'Dua Lipa',
    verified: true,
    monthly: '63.0M monthly listeners',
    coverVideoId: 'DkeiKbqa02g',
    bio: 'British pop star pushing modern disco into the mainstream.',
  },
  {
    id: 'ar-onerepublic',
    slug: 'onerepublic',
    name: 'OneRepublic',
    verified: true,
    monthly: '31.5M monthly listeners',
    coverVideoId: 'hT_nvWreIhg',
    bio: 'American pop-rock band fronted by Ryan Tedder.',
  },
  {
    id: 'ar-luis-fonsi',
    slug: 'luis-fonsi',
    name: 'Luis Fonsi',
    verified: true,
    monthly: '28.9M monthly listeners',
    coverVideoId: 'kJQP7kiw5Fk',
    bio: 'Puerto Rican singer best known for the global hit "Despacito".',
  },
  {
    id: 'ar-rick-astley',
    slug: 'rick-astley',
    name: 'Rick Astley',
    verified: true,
    monthly: '12.3M monthly listeners',
    coverVideoId: 'dQw4w9WgXcQ',
    bio: 'English singer whose 1987 single returned as the internet\u2019s favourite prank.',
  },
  {
    id: 'ar-kenshi-yonezu',
    slug: 'kenshi-yonezu',
    name: 'Kenshi Yonezu',
    verified: true,
    monthly: '19.6M monthly listeners',
    coverVideoId: 'ZRtdQ81jPUQ',
    bio: 'Japanese singer-songwriter behind era-defining anime themes.',
  },
  {
    id: 'ar-linked-horizon',
    slug: 'linked-horizon',
    name: 'Linked Horizon',
    verified: false,
    monthly: '6.8M monthly listeners',
    coverVideoId: '8OkpRK2_gVs',
    bio: 'Symphonic-rock project led by Revo, famous for the Attack on Titan openings.',
  },
];

// Albums ------------------------------------------------------------------
const albums = [
  {
    id: 'al-divide',
    title: '\u00f7 (Divide)',
    artistId: 'ar-ed-sheeran',
    year: 2017,
    label: 'Asylum',
    coverVideoId: 'JGwWNGJdvx8',
    genreIds: ['pop'],
  },
  {
    id: 'al-multiply',
    title: 'x (Multiply)',
    artistId: 'ar-ed-sheeran',
    year: 2014,
    label: 'Asylum',
    coverVideoId: 'lp-EO5I60KA',
    genreIds: ['pop'],
  },
  {
    id: 'al-the-book',
    title: 'The Book',
    artistId: 'ar-yoasobi',
    year: 2021,
    label: 'Sony Music Japan',
    coverVideoId: 'IeyJ7MPb7MQ',
    genreIds: ['anime', 'jpop'],
  },
  {
    id: 'al-night-visions',
    title: 'Night Visions',
    artistId: 'ar-onerepublic',
    year: 2013,
    label: 'Mosley Music',
    coverVideoId: 'hT_nvWreIhg',
    genreIds: ['pop', 'rock'],
  },
  {
    id: 'al-future-nostalgia',
    title: 'Future Nostalgia',
    artistId: 'ar-dua-lipa',
    year: 2020,
    label: 'Warner Records',
    coverVideoId: 'DkeiKbqa02g',
    genreIds: ['pop', 'electronic'],
  },
  {
    id: 'al-a-night-at-the-opera',
    title: 'A Night at the Opera',
    artistId: 'ar-queen',
    year: 1975,
    label: 'EMI',
    coverVideoId: 'fJ9rUzIMcZQ',
    genreIds: ['rock'],
  },
  {
    id: 'al-vida',
    title: 'Vida',
    artistId: 'ar-luis-fonsi',
    year: 2019,
    label: 'Universal Latino',
    coverVideoId: 'kJQP7kiw5Fk',
    genreIds: ['latin'],
  },
  {
    id: 'al-whenever-you-need',
    title: 'Whenever You Need Somebody',
    artistId: 'ar-rick-astley',
    year: 1987,
    label: 'RCA',
    coverVideoId: 'dQw4w9WgXcQ',
    genreIds: ['pop'],
  },
  {
    id: 'al-stray-sheep',
    title: 'Stray Sheep',
    artistId: 'ar-kenshi-yonezu',
    year: 2020,
    label: 'Sony Music Japan',
    coverVideoId: 'ZRtdQ81jPUQ',
    genreIds: ['anime', 'jpop'],
  },
  {
    id: 'al-shingeki',
    title: 'Shingeki no Kiseki',
    artistId: 'ar-linked-horizon',
    year: 2017,
    label: 'Pony Canyon',
    coverVideoId: '8OkpRK2_gVs',
    genreIds: ['anime', 'rock'],
  },
];

// Songs -------------------------------------------------------------------
// `plays` drives charts/trending ranking. `releaseDate` drives trending recency.
const songs = [
  // Ed Sheeran
  { id: 'sg-shape-of-you', videoId: 'JGwWNGJdvx8', title: 'Shape of You', artistId: 'ar-ed-sheeran', albumId: 'al-divide', duration: '3:53', plays: 6_200_000_000, releaseDate: '2017-01-06', genreIds: ['pop'] },
  { id: 'sg-thinking-out-loud', videoId: 'lp-EO5I60KA', title: 'Thinking Out Loud', artistId: 'ar-ed-sheeran', albumId: 'al-multiply', duration: '4:41', plays: 3_400_000_000, releaseDate: '2014-09-24', genreIds: ['pop'] },
  { id: 'sg-perfect', videoId: '2Vv-BfVoq4g', title: 'Perfect', artistId: 'ar-ed-sheeran', albumId: 'al-divide', duration: '4:23', plays: 3_900_000_000, releaseDate: '2017-09-26', genreIds: ['pop'] },
  { id: 'sg-photograph', videoId: 'nSDgHBxUbVQ', title: 'Photograph', artistId: 'ar-ed-sheeran', albumId: 'al-multiply', duration: '4:19', plays: 1_500_000_000, releaseDate: '2014-05-13', genreIds: ['pop'] },

  // YOASOBI
  { id: 'sg-idol', videoId: 'IeyJ7MPb7MQ', title: 'Idol', artistId: 'ar-yoasobi', albumId: 'al-the-book', duration: '3:35', plays: 482_300_000, releaseDate: '2023-04-12', genreIds: ['anime', 'jpop'] },
  { id: 'sg-yoru-ni-kakeru', videoId: 'x8VYWazR5mE', title: 'Yoru ni Kakeru', artistId: 'ar-yoasobi', albumId: 'al-the-book', duration: '4:24', plays: 410_700_000, releaseDate: '2019-12-15', genreIds: ['jpop'] },

  // Queen
  { id: 'sg-bohemian-rhapsody', videoId: 'fJ9rUzIMcZQ', title: 'Bohemian Rhapsody', artistId: 'ar-queen', albumId: 'al-a-night-at-the-opera', duration: '5:55', plays: 1_700_000_000, releaseDate: '1975-10-31', genreIds: ['rock'] },
  { id: 'sg-dont-stop-me-now', videoId: 'HgzGwKwLmgM', title: "Don't Stop Me Now", artistId: 'ar-queen', albumId: 'al-a-night-at-the-opera', duration: '3:30', plays: 980_400_000, releaseDate: '1978-11-13', genreIds: ['rock'] },

  // Dua Lipa
  { id: 'sg-levitating', videoId: 'DkeiKbqa02g', title: 'Levitating', artistId: 'ar-dua-lipa', albumId: 'al-future-nostalgia', duration: '3:23', plays: 1_900_000_000, releaseDate: '2020-10-01', genreIds: ['pop', 'electronic'] },
  { id: 'sg-dont-start-now', videoId: 'oygrmJFKYZY', title: "Don't Start Now", artistId: 'ar-dua-lipa', albumId: 'al-future-nostalgia', duration: '3:03', plays: 1_300_000_000, releaseDate: '2019-11-01', genreIds: ['pop', 'electronic'] },

  // OneRepublic
  { id: 'sg-counting-stars', videoId: 'hT_nvWreIhg', title: 'Counting Stars', artistId: 'ar-onerepublic', albumId: 'al-night-visions', duration: '4:17', plays: 3_800_000_000, releaseDate: '2013-05-31', genreIds: ['pop', 'rock'] },
  { id: 'sg-i-aint-worried', videoId: 'm9En7QVwh-c', title: "I Ain't Worried", artistId: 'ar-onerepublic', albumId: 'al-night-visions', duration: '2:28', plays: 720_000_000, releaseDate: '2022-05-13', genreIds: ['pop'] },

  // Luis Fonsi
  { id: 'sg-despacito', videoId: 'kJQP7kiw5Fk', title: 'Despacito', artistId: 'ar-luis-fonsi', albumId: 'al-vida', duration: '4:42', plays: 8_400_000_000, releaseDate: '2017-01-13', genreIds: ['latin'] },

  // Rick Astley
  { id: 'sg-never-gonna', videoId: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artistId: 'ar-rick-astley', albumId: 'al-whenever-you-need', duration: '3:33', plays: 1_500_000_000, releaseDate: '1987-07-27', genreIds: ['pop'] },

  // Kenshi Yonezu
  { id: 'sg-kick-back', videoId: 'ZRtdQ81jPUQ', title: 'Kick Back', artistId: 'ar-kenshi-yonezu', albumId: 'al-stray-sheep', duration: '3:18', plays: 219_400_000, releaseDate: '2022-10-12', genreIds: ['anime', 'jpop'] },
  { id: 'sg-lemon', videoId: 'SX_ViT4Ra7k', title: 'Lemon', artistId: 'ar-kenshi-yonezu', albumId: 'al-stray-sheep', duration: '4:15', plays: 690_300_000, releaseDate: '2018-03-14', genreIds: ['jpop'] },

  // Linked Horizon
  { id: 'sg-shinzou', videoId: '8OkpRK2_gVs', title: 'Shinzou wo Sasageyo', artistId: 'ar-linked-horizon', albumId: 'al-shingeki', duration: '5:12', plays: 88_700_000, releaseDate: '2017-04-22', genreIds: ['anime', 'rock'] },
  { id: 'sg-guren', videoId: 'jVnk7N-NCAU', title: 'Guren no Yumiya', artistId: 'ar-linked-horizon', albumId: 'al-shingeki', duration: '5:18', plays: 142_300_000, releaseDate: '2013-07-10', genreIds: ['anime', 'rock'] },
];

// Genres ------------------------------------------------------------------
const genres = [
  { id: 'pop',        label: 'Pop',        sampleSongId: 'sg-shape-of-you',     from: 'from-pink-500/60',    to: 'to-rose-700/60' },
  { id: 'rock',       label: 'Rock',       sampleSongId: 'sg-bohemian-rhapsody', from: 'from-red-600/60',     to: 'to-rose-900/60' },
  { id: 'electronic', label: 'Electronic', sampleSongId: 'sg-levitating',       from: 'from-cyan-400/60',    to: 'to-blue-700/60' },
  { id: 'latin',      label: 'Latin',      sampleSongId: 'sg-despacito',        from: 'from-emerald-500/60', to: 'to-teal-700/60' },
  { id: 'anime',      label: 'Anime',      sampleSongId: 'sg-shinzou',          from: 'from-fuchsia-500/60', to: 'to-pink-800/60' },
  { id: 'jpop',       label: 'J-Pop',      sampleSongId: 'sg-idol',             from: 'from-violet-500/60',  to: 'to-purple-700/60' },
];

// =============================================================================
// Lookup helpers — server.js builds responses by composing these.
// =============================================================================

const artistById = new Map(artists.map((a) => [a.id, a]));
const artistBySlug = new Map(artists.map((a) => [a.slug, a]));
const albumById = new Map(albums.map((a) => [a.id, a]));
const songById = new Map(songs.map((s) => [s.id, s]));

const tracksByAlbumId = new Map();
const songsByArtistId = new Map();
for (const s of songs) {
  if (!tracksByAlbumId.has(s.albumId)) tracksByAlbumId.set(s.albumId, []);
  tracksByAlbumId.get(s.albumId).push(s);
  if (!songsByArtistId.has(s.artistId)) songsByArtistId.set(s.artistId, []);
  songsByArtistId.get(s.artistId).push(s);
}
const albumsByArtistId = new Map();
for (const a of albums) {
  if (!albumsByArtistId.has(a.artistId)) albumsByArtistId.set(a.artistId, []);
  albumsByArtistId.get(a.artistId).push(a);
}

// =============================================================================
// Response shapers. The client expects camelCase fields with absolute
// thumbnail URLs — keep these stable; many pages depend on them.
// =============================================================================

const toTrackDTO = (song) => {
  const artist = artistById.get(song.artistId);
  const album = albumById.get(song.albumId);
  return {
    id: song.id,
    type: 'song',
    videoId: song.videoId,
    title: song.title,
    artist: artist?.name || 'Unknown artist',
    artistId: artist?.id || null,
    artistSlug: artist?.slug || null,
    album: album?.title || null,
    albumId: album?.id || null,
    duration: song.duration,
    thumbnail: thumb(song.videoId),
    plays: song.plays,
    releaseDate: song.releaseDate,
  };
};

const toAlbumSummaryDTO = (album) => {
  const artist = artistById.get(album.artistId);
  return {
    id: album.id,
    type: 'album',
    title: album.title,
    artist: artist?.name || 'Unknown artist',
    artistId: artist?.id || null,
    artistSlug: artist?.slug || null,
    year: album.year,
    thumbnail: thumb(album.coverVideoId),
  };
};

const toAlbumDetailDTO = (album) => {
  const summary = toAlbumSummaryDTO(album);
  const trackList = (tracksByAlbumId.get(album.id) || []).map(toTrackDTO);
  return {
    ...summary,
    label: album.label,
    cover: thumb(album.coverVideoId),
    tracks: trackList,
  };
};

const toArtistSummaryDTO = (artist) => ({
  id: artist.id,
  type: 'artist',
  slug: artist.slug,
  name: artist.name,
  verified: artist.verified,
  monthly: artist.monthly,
  thumbnail: thumb(artist.coverVideoId),
});

const toArtistDetailDTO = (artist) => {
  const summary = toArtistSummaryDTO(artist);
  const artistSongs = (songsByArtistId.get(artist.id) || [])
    .slice()
    .sort((a, b) => b.plays - a.plays);
  const topTracks = artistSongs.slice(0, 6).map(toTrackDTO);
  const artistAlbums = (albumsByArtistId.get(artist.id) || [])
    .slice()
    .sort((a, b) => b.year - a.year)
    .map(toAlbumSummaryDTO);
  return {
    ...summary,
    cover: thumb(artist.coverVideoId),
    bio: artist.bio,
    topTracks,
    albums: artistAlbums,
  };
};

const toGenreDTO = (genre) => {
  const sample = songById.get(genre.sampleSongId);
  return {
    id: genre.id,
    label: genre.label,
    thumbnail: sample ? thumb(sample.videoId) : null,
    from: genre.from,
    to: genre.to,
    sampleTrack: sample ? toTrackDTO(sample) : null,
  };
};

// =============================================================================
// Queries
// =============================================================================

const search = (q, type = 'all') => {
  const query = String(q || '').trim().toLowerCase();
  if (!query) return [];

  const out = [];
  if (type === 'all' || type === 'song') {
    for (const s of songs) {
      const a = artistById.get(s.artistId);
      if (
        s.title.toLowerCase().includes(query) ||
        (a && a.name.toLowerCase().includes(query))
      ) {
        out.push(toTrackDTO(s));
      }
    }
  }
  if (type === 'all' || type === 'artist') {
    for (const a of artists) {
      if (a.name.toLowerCase().includes(query)) {
        out.push(toArtistSummaryDTO(a));
      }
    }
  }
  if (type === 'all' || type === 'album') {
    for (const a of albums) {
      const artist = artistById.get(a.artistId);
      if (
        a.title.toLowerCase().includes(query) ||
        (artist && artist.name.toLowerCase().includes(query))
      ) {
        out.push(toAlbumSummaryDTO(a));
      }
    }
  }
  return out;
};

const getAlbum = (id) => {
  const album = albumById.get(id);
  return album ? toAlbumDetailDTO(album) : null;
};

const getArtist = (slugOrId) => {
  const artist = artistBySlug.get(slugOrId) || artistById.get(slugOrId);
  return artist ? toArtistDetailDTO(artist) : null;
};

const getCharts = (limit = 50) => {
  const ranked = songs
    .slice()
    .sort((a, b) => b.plays - a.plays)
    .slice(0, limit)
    .map(toTrackDTO);
  // Synthesize a stable "previous rank" delta so the UI can show arrows.
  return ranked.map((t, i) => {
    const seed = (t.id.charCodeAt(0) + i) % 7;
    const drift = seed - 3;
    const prev = Math.max(1, Math.min(ranked.length, i + 1 + drift));
    return { ...t, rank: i + 1, prev };
  });
};

const getTrending = (limit = 20) => {
  // Mix of recency and plays: log10(plays) - daysSinceRelease/45.
  const now = Date.now();
  return songs
    .slice()
    .map((s) => {
      const age = Math.max(1, (now - Date.parse(s.releaseDate)) / 86_400_000);
      const score = Math.log10(s.plays + 1) - age / 45;
      return { song: s, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ song }) => toTrackDTO(song));
};

const getHomeFeatured = () => {
  // Editorial picks — three featured tracks for the home hero rotation.
  const picks = ['sg-shinzou', 'sg-shape-of-you', 'sg-idol'];
  const eyebrows = ['Featured today', 'New release', 'On repeat'];
  const titles = [
    'A night with Linked Horizon',
    'Ed Sheeran \u2014 Divide, revisited',
    'YOASOBI \u2014 Idol',
  ];
  const descriptions = [
    'Cinematic anime openings, remastered. One playlist, ninety minutes, no skips.',
    'The album that defined a decade, in lossless audio.',
    'Three hundred million plays, and counting.',
  ];
  return picks.map((id, i) => {
    const s = songById.get(id);
    const track = toTrackDTO(s);
    const album = albumById.get(s.albumId);
    return {
      id: `feat-${id}`,
      eyebrow: eyebrows[i],
      title: titles[i],
      description: descriptions[i],
      cover: track.thumbnail,
      track,
      to: album ? `/album/${album.id}` : `/artist/${track.artistSlug}`,
    };
  });
};

const getGenres = () => genres.map(toGenreDTO);

module.exports = {
  search,
  getAlbum,
  getArtist,
  getCharts,
  getTrending,
  getHomeFeatured,
  getGenres,
};
