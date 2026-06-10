import { describe, expect, it } from 'vitest';
import {
  buildStrategyRequest,
  buildStrategyRequests,
  getStrategyById,
  pickStrategies,
} from '@/lib/discovery-strategies';

const baseCtx = {
  mood: 'focus',
  genre: 'ambient',
  visitSeed: 'seed-0',
  tasteSeed: { anchorArtist: 'Bonobo' },
  favorites: [{ artist: 'Bonobo' }],
  history: [{ artist: 'Tycho' }],
  followedArtists: [{ name: 'Nils Frahm' }],
  limit: 40,
};

describe('discovery-strategies', () => {
  it('picks unique strategies up to the requested count', () => {
    const picked = pickStrategies({
      count: 4,
      ctx: baseCtx,
      recent: [],
    });
    expect(picked).toHaveLength(4);
    expect(new Set(picked.map((entry) => entry.id)).size).toBe(4);
  });

  it('downweights recently-used strategies', () => {
    let baseHits = 0;
    let penalizedHits = 0;

    for (let index = 0; index < 60; index += 1) {
      const seedCtx = { ...baseCtx, visitSeed: `seed-${index}` };
      const base = pickStrategies({ count: 4, ctx: seedCtx, recent: [] });
      const penalized = pickStrategies({
        count: 4,
        ctx: seedCtx,
        recent: ['trending-pulse'],
      });
      if (base.some((entry) => entry.id === 'trending-pulse')) baseHits += 1;
      if (penalized.some((entry) => entry.id === 'trending-pulse')) penalizedHits += 1;
    }

    expect(penalizedHits).toBeLessThan(baseHits);
  });

  it('guarantees personalized strategy when personal signals exist', () => {
    const picked = pickStrategies({
      count: 4,
      ctx: {
        ...baseCtx,
        tasteSeed: { anchorArtist: 'Boards of Canada' },
      },
      recent: [],
    });
    expect(picked.map((entry) => entry.id)).toContain('personalized');
  });

  it('varies alphabet and keyword fan-out across deterministic visit seeds', () => {
    const keywordKeys = new Set();
    const alphabetKeys = new Set();

    for (let index = 0; index < 50; index += 1) {
      const ctx = { ...baseCtx, visitSeed: `visit-${index}` };
      const keywordReq = buildStrategyRequest('keyword-roulette', ctx);
      const alphabetReq = buildStrategyRequest('alphabet-search', ctx);
      keywordKeys.add(JSON.stringify(keywordReq?.queryKey || []));
      alphabetKeys.add(JSON.stringify(alphabetReq?.queryKey || []));
    }

    expect(keywordKeys.size).toBeGreaterThan(10);
    expect(alphabetKeys.size).toBeGreaterThan(10);
  });

  it('builds query-ready strategy request objects', () => {
    const selected = pickStrategies({ count: 3, ctx: baseCtx });
    const requests = buildStrategyRequests({ strategies: selected, ctx: baseCtx });
    expect(requests).toHaveLength(3);
    expect(requests.every((entry) => Array.isArray(entry.queryKey))).toBe(true);
    expect(requests.every((entry) => typeof entry.queryFn === 'function')).toBe(true);
  });

  it('resolves strategy definitions by id', () => {
    const strategy = getStrategyById('mixed-bag');
    expect(strategy?.id).toBe('mixed-bag');
  });
});
