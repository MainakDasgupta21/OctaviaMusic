import { beforeEach, describe, expect, it, vi } from 'vitest';
import lyricsClient from './lyrics';

const { getLyrics } = lyricsClient;

const makeJsonResponse = (status, body) => ({
  status,
  ok: status >= 200 && status < 300,
  statusText: status === 200 ? 'OK' : 'Not Found',
  json: vi.fn().mockResolvedValue(body),
});

describe('lyrics metadata fallback', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves lyrics from YouTube metadata when only videoId is supplied', async () => {
    const fetchMock = vi.fn(async (url) => {
      const href = String(url);
      if (href.includes('/oembed?')) {
        return makeJsonResponse(200, {
          title: 'Artist - Song (Official Video)',
          author_name: 'Artist - Topic',
        });
      }
      if (href.includes('/api/search?')) {
        return makeJsonResponse(200, [
          {
            id: 42,
            trackName: 'Song',
            artistName: 'Artist',
            plainLyrics: 'Sample lyrics',
            syncedLyrics: '[00:01.00]Sample lyrics',
          },
        ]);
      }
      return makeJsonResponse(404, {});
    });
    global.fetch = fetchMock;

    const result = await getLyrics({ videoId: 'dQw4w9WgXcQ' });

    expect(result).toEqual(
      expect.objectContaining({
        trackName: 'Song',
        artistName: 'Artist',
        plainLyrics: 'Sample lyrics',
      }),
    );
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/oembed?'))).toBe(true);
  });

  it('reuses cached results for repeated videoId lookups', async () => {
    const fetchMock = vi.fn(async (url) => {
      const href = String(url);
      if (href.includes('/oembed?')) {
        return makeJsonResponse(200, {
          title: 'Another Artist - Another Song',
          author_name: 'Another Artist - Topic',
        });
      }
      if (href.includes('/api/search?')) {
        return makeJsonResponse(200, [
          {
            id: 7,
            trackName: 'Another Song',
            artistName: 'Another Artist',
            plainLyrics: 'Cached lyrics',
            syncedLyrics: '',
          },
        ]);
      }
      return makeJsonResponse(404, {});
    });
    global.fetch = fetchMock;

    await getLyrics({ videoId: 'a1B2c3D4e5F' });
    const firstCallCount = fetchMock.mock.calls.length;
    await getLyrics({ videoId: 'a1B2c3D4e5F' });

    expect(fetchMock.mock.calls.length).toBe(firstCallCount);
  });
});
