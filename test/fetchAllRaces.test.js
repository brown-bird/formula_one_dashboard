import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAllRaces } from '../src/api.js';

function makeApiResponse(races, total) {
  return {
    MRData: {
      total: String(total),
      RaceTable: { Races: races },
    },
  };
}

function makeRace(round, resultsKey = 'Results') {
  return {
    round: String(round),
    raceName: `Race ${round}`,
    [resultsKey]: [{ position: '1', points: '25' }],
  };
}

describe('fetchAllRaces', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns races from a single page when total <= 100', async () => {
    const races = [makeRace(1), makeRace(2)];
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => makeApiResponse(races, 2),
    });

    const result = await fetchAllRaces('2026/results');
    expect(result).toHaveLength(2);
    expect(result[0].round).toBe('1');
    expect(result[1].round).toBe('2');
  });

  it('fetches multiple pages and merges by round', async () => {
    const page1Races = Array.from({ length: 100 }, (_, i) => makeRace(i + 1));
    const page2Races = [makeRace(101)];

    global.fetch
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => makeApiResponse(page1Races, 101),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => makeApiResponse(page2Races, 101),
      });

    const result = await fetchAllRaces('2026/results');
    expect(result).toHaveLength(101);
    expect(result.at(-1).round).toBe('101');
  });

  it('merges results arrays for the same round across pages', async () => {
    const firstResult = { position: '1', Driver: { driverId: 'hamilton' } };
    const secondResult = { position: '2', Driver: { driverId: 'russell' } };
    const page1Races = [{ round: '1', raceName: 'R1', Results: [firstResult] }];
    const page2Races = [{ round: '1', raceName: 'R1', Results: [secondResult] }];

    global.fetch
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => makeApiResponse(page1Races, 101),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => makeApiResponse(page2Races, 101),
      });

    const result = await fetchAllRaces('2026/results');
    expect(result[0].Results).toHaveLength(2);
    expect(result[0].Results[0].Driver.driverId).toBe('hamilton');
    expect(result[0].Results[1].Driver.driverId).toBe('russell');
  });

  it('merges SprintResults for the same round', async () => {
    const sprintResult = { position: '1', Driver: { driverId: 'hamilton' } };
    const page1Races = [{ round: '1', raceName: 'R1', SprintResults: [sprintResult] }];
    const page2MoreSprint = { position: '2', Driver: { driverId: 'leclerc' } };
    const page2Races = [{ round: '1', raceName: 'R1', SprintResults: [page2MoreSprint] }];

    global.fetch
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => makeApiResponse(page1Races, 101),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => makeApiResponse(page2Races, 101),
      });

    const result = await fetchAllRaces('2026/sprint');
    expect(result[0].SprintResults).toHaveLength(2);
  });

  it('returns results sorted ascending by round number', async () => {
    // Page 1 returns rounds out of order
    const page1Races = [makeRace(3), makeRace(1), makeRace(2)];
    global.fetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => makeApiResponse(page1Races, 3),
    });

    const result = await fetchAllRaces('2026/results');
    expect(result.map(r => r.round)).toEqual(['1', '2', '3']);
  });

  it('throws on non-ok response', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(fetchAllRaces('bad/path')).rejects.toThrow('API error 404');
  });
});
