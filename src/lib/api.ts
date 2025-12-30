import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

export interface SearchResult {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  type: 'song' | 'video' | 'album' | 'artist';
  duration?: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  releaseDate?: string;
  tracks: SearchResult[];
}

export interface Artist {
  id: string;
  name: string;
  thumbnail: string;
  subscribers?: string;
  albums: Album[];
}

// Utility function to upgrade low-res YouTube thumbnails
export const upgradeImageQuality = (url: string): string => {
  if (!url) return url;
  // Replace low-res patterns with high-res
  return url
    .replace(/=w\d+-h\d+/, '=w544-h544')
    .replace(/=s\d+/, '=s544')
    .replace(/\/hqdefault\.jpg/, '/maxresdefault.jpg')
    .replace(/\/mqdefault\.jpg/, '/maxresdefault.jpg')
    .replace(/\/sddefault\.jpg/, '/maxresdefault.jpg');
};

export const searchMusic = async (
  query: string,
  filter: 'song' | 'video' | 'album' | 'artist' = 'song'
): Promise<SearchResult[]> => {
  try {
    const response = await api.get('/search', {
      params: { q: query, filter },
    });
    return response.data.map((item: SearchResult) => ({
      ...item,
      thumbnail: upgradeImageQuality(item.thumbnail),
    }));
  } catch (error) {
    console.error('Search error:', error);
    // Return mock data for demo purposes when backend is not available
    return getMockSearchResults(query, filter);
  }
};

export const getAlbum = async (id: string): Promise<Album | null> => {
  try {
    const response = await api.get(`/album/${id}`);
    return {
      ...response.data,
      thumbnail: upgradeImageQuality(response.data.thumbnail),
      tracks: response.data.tracks.map((track: SearchResult) => ({
        ...track,
        thumbnail: upgradeImageQuality(track.thumbnail),
      })),
    };
  } catch (error) {
    console.error('Get album error:', error);
    return getMockAlbum(id);
  }
};

export const getArtist = async (id: string): Promise<Artist | null> => {
  try {
    const response = await api.get(`/artist/${id}`);
    return {
      ...response.data,
      thumbnail: upgradeImageQuality(response.data.thumbnail),
    };
  } catch (error) {
    console.error('Get artist error:', error);
    return getMockArtist(id);
  }
};

// Mock data for demo when backend is not available
const getMockSearchResults = (query: string, filter: string): SearchResult[] => {
  const mockSongs: SearchResult[] = [
    {
      id: '1',
      videoId: 'dQw4w9WgXcQ',
      title: 'Never Gonna Give You Up',
      artist: 'Rick Astley',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
      type: 'song',
      duration: '3:33',
    },
    {
      id: '2',
      videoId: 'kJQP7kiw5Fk',
      title: 'Despacito',
      artist: 'Luis Fonsi ft. Daddy Yankee',
      thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/maxresdefault.jpg',
      type: 'song',
      duration: '4:42',
    },
    {
      id: '3',
      videoId: 'JGwWNGJdvx8',
      title: 'Shape of You',
      artist: 'Ed Sheeran',
      thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/maxresdefault.jpg',
      type: 'song',
      duration: '3:53',
    },
    {
      id: '4',
      videoId: 'fJ9rUzIMcZQ',
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      thumbnail: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/maxresdefault.jpg',
      type: 'song',
      duration: '5:55',
    },
    {
      id: '5',
      videoId: 'hT_nvWreIhg',
      title: 'Counting Stars',
      artist: 'OneRepublic',
      thumbnail: 'https://i.ytimg.com/vi/hT_nvWreIhg/maxresdefault.jpg',
      type: 'song',
      duration: '4:17',
    },
  ];
  return mockSongs.filter(s => 
    s.title.toLowerCase().includes(query.toLowerCase()) || 
    s.artist.toLowerCase().includes(query.toLowerCase()) ||
    query === ''
  );
};

const getMockAlbum = (id: string): Album => ({
  id,
  title: 'Greatest Hits',
  artist: 'Various Artists',
  thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  releaseDate: '2023-01-01',
  tracks: getMockSearchResults('', 'song'),
});

const getMockArtist = (id: string): Artist => ({
  id,
  name: 'Ed Sheeran',
  thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/maxresdefault.jpg',
  subscribers: '50M',
  albums: [getMockAlbum('1'), getMockAlbum('2')],
});

export default api;
