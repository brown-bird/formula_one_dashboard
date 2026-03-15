import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchConstructorCareer } from '../src/career.js';

// career.js → season-selector.js → main.js references window; mock the chain-breakers
vi.mock('../src/season-selector.js', () => ({ selectYear: vi.fn() }));
vi.mock('../src/ui.js', () => ({ setFilter: vi.fn(), renderLegend: vi.fn(), switchTab: vi.fn() }));
vi.mock('../src/chart.js', () => ({ renderChart: vi.fn() }));
vi.mock('../src/table.js', () => ({ renderTable: vi.fn() }));
vi.mock('../src/state.js', () => ({
  state: { careerConstructorId: null, careerChart: null, ctorData: [], hiddenSeries: new Set() },
}));

function makeSeasonListResponse(years) {
  return {
    MRData: {
      SeasonTable: { Seasons: years.map(y => ({ season: String(y) })) },
    },
  };
}

function makeStandingsResponse(year, position, points, constructorId = 'ferrari') {
  return {
    MRData: {
      StandingsTable: {
        StandingsLists: [{
          season: String(year),
          ConstructorStandings: [{ position: String(position), points: String(points), Constructor: { constructorId } }],
        }],
      },
    },
  };
}

function makeEmptyStandingsResponse() {
  return { MRData: { StandingsTable: { StandingsLists: [] } } };
}

function mockFetch(...responses) {
  let i = 0;
  global.fetch = vi.fn(() => {
    const res = responses[i++] ?? responses.at(-1);
    return Promise.resolve({ ok: true, status: 200, json: async () => res });
  });
}

describe('fetchConstructorCareer', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns sorted standings for a small constructor (single batch)', async () => {
    const years = ['2022', '2023', '2024'];
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => makeSeasonListResponse(years) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => makeStandingsResponse(2022, 1, 454) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => makeStandingsResponse(2023, 2, 406) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => makeStandingsResponse(2024, 3, 320) });

    const result = await fetchConstructorCareer('ferrari');

    expect(result).toHaveLength(3);
    expect(result.map(r => r.season)).toEqual(['2022', '2023', '2024']);
    expect(result[0].ConstructorStandings[0].position).toBe('1');
    expect(result[2].ConstructorStandings[0].position).toBe('3');
  });

  it('sorts seasons ascending when API returns them out of order', async () => {
    const years = ['2024', '2022', '2023'];
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => makeSeasonListResponse(years) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => makeStandingsResponse(2024, 3, 320) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => makeStandingsResponse(2022, 1, 454) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => makeStandingsResponse(2023, 2, 406) });

    const result = await fetchConstructorCareer('ferrari');
    expect(result.map(r => r.season)).toEqual(['2022', '2023', '2024']);
  });

  it('batches requests into groups of 8 — 9 seasons requires 2 batches', async () => {
    const years = Array.from({ length: 9 }, (_, i) => String(2010 + i));

    let callCount = 0;
    global.fetch = vi.fn(url => {
      callCount++;
      if (url.includes('seasons')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => makeSeasonListResponse(years) });
      }
      const yearMatch = url.match(/\/(\d{4})\//);
      const y = parseInt(yearMatch[1], 10);
      return Promise.resolve({ ok: true, status: 200, json: async () => makeStandingsResponse(y, 1, 400) });
    });

    const result = await fetchConstructorCareer('ferrari');

    // 1 seasons call + 9 standings calls = 10 total
    expect(global.fetch).toHaveBeenCalledTimes(10);
    expect(result).toHaveLength(9);
  });

  it('filters out failed per-season requests (null from .catch)', async () => {
    const years = ['2022', '2023', '2024'];
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => makeSeasonListResponse(years) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => makeStandingsResponse(2022, 1, 454) })
      .mockRejectedValueOnce(new Error('network error')) // 2023 fails
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => makeStandingsResponse(2024, 3, 320) });

    const result = await fetchConstructorCareer('ferrari');

    expect(result).toHaveLength(2);
    expect(result.map(r => r.season)).toEqual(['2022', '2024']);
  });

  it('filters out seasons with empty StandingsLists', async () => {
    const years = ['2022', '2023'];
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => makeSeasonListResponse(years) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => makeStandingsResponse(2022, 1, 454) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => makeEmptyStandingsResponse() });

    const result = await fetchConstructorCareer('ferrari');

    expect(result).toHaveLength(1);
    expect(result[0].season).toBe('2022');
  });

  it('returns empty array when constructor has no seasons', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true, status: 200, json: async () => makeSeasonListResponse([]),
    });

    const result = await fetchConstructorCareer('new_team');
    expect(result).toEqual([]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('throws when the seasons list request fails', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(fetchConstructorCareer('ferrari')).rejects.toThrow('API error 500');
  });
});
