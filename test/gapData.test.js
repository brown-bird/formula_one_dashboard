import { describe, it, expect } from 'vitest';
import {
  parseLapMs, fmtGap, extractRaceLaps, extractQualiLaps, buildGapRows,
  buildSeasonGapSeries, buildSeasonGapDatasets, buildSeasonGapSummary, clampGapAxis,
} from '../src/gap-data.js';

function driver(id, code, given, family) {
  return { driverId: id, code, givenName: given, familyName: family };
}
const MCL = { constructorId: 'mclaren', name: 'McLaren' };
const FER = { constructorId: 'ferrari', name: 'Ferrari' };

// 2025 Bahrain GP, trimmed to the rows the assertions need
function bahrainRace() {
  return {
    round: '4',
    raceName: 'Bahrain Grand Prix',
    Results: [
      { Driver: driver('piastri', 'PIA', 'Oscar', 'Piastri'), Constructor: MCL, FastestLap: { Time: { time: '1:35.140' } } },
      { Driver: driver('norris', 'NOR', 'Lando', 'Norris'),   Constructor: MCL, FastestLap: { Time: { time: '1:35.728' } } },
      { Driver: driver('leclerc', 'LEC', 'Charles', 'Leclerc'), Constructor: FER, FastestLap: { Time: { time: '1:36.132' } } },
      { Driver: driver('hamilton', 'HAM', 'Lewis', 'Hamilton'), Constructor: FER, FastestLap: { Time: { time: '1:36.235' } } },
      { Driver: driver('stroll', 'STR', 'Lance', 'Stroll'), Constructor: { constructorId: 'aston_martin', name: 'Aston Martin' } },
    ],
  };
}

describe('parseLapMs', () => {
  it('parses a mm:ss.mmm lap time', () => {
    expect(parseLapMs('1:35.140')).toBe(95140);
  });

  it('parses a time with no minutes component', () => {
    expect(parseLapMs('35.140')).toBe(35140);
  });

  it('keeps millisecond precision across the minute boundary', () => {
    expect(parseLapMs('1:02.000')).toBe(62000);
    expect(parseLapMs('2:00.001')).toBe(120001);
  });

  it('returns null for missing or unparseable input', () => {
    expect(parseLapMs('')).toBeNull();
    expect(parseLapMs(null)).toBeNull();
    expect(parseLapMs(undefined)).toBeNull();
    expect(parseLapMs('DNF')).toBeNull();
    expect(parseLapMs('1:35:140')).toBeNull();
  });
});

describe('fmtGap', () => {
  it('formats to the thousandth of a second with a leading plus', () => {
    expect(fmtGap(1432)).toBe('+1.432s');
    expect(fmtGap(992)).toBe('+0.992s');
    expect(fmtGap(0)).toBe('+0.000s');
  });
});

describe('extractRaceLaps', () => {
  it('skips results with no fastest lap recorded', () => {
    const laps = extractRaceLaps(bahrainRace());
    expect(laps).toHaveLength(4);
    expect(laps.map(l => l.driverId)).not.toContain('stroll');
  });

  it('carries driver code, name and constructor', () => {
    const [first] = extractRaceLaps(bahrainRace());
    expect(first.code).toBe('PIA');
    expect(first.name).toBe('Oscar Piastri');
    expect(first.constructorId).toBe('mclaren');
    expect(first.teamName).toBe('McLaren');
    expect(first.ms).toBe(95140);
  });

  it('returns an empty array for a race with no results', () => {
    expect(extractRaceLaps({})).toEqual([]);
    expect(extractRaceLaps(undefined)).toEqual([]);
  });
});

describe('extractQualiLaps', () => {
  const race = {
    round: '4',
    raceName: 'Bahrain Grand Prix',
    QualifyingResults: [
      { Driver: driver('piastri', 'PIA', 'Oscar', 'Piastri'), Constructor: MCL, Q1: '1:30.512', Q2: '1:30.100', Q3: '1:29.841' },
      { Driver: driver('leclerc', 'LEC', 'Charles', 'Leclerc'), Constructor: FER, Q1: '1:30.900', Q2: '1:30.175', Q3: '1:30.400' },
      { Driver: driver('stroll', 'STR', 'Lance', 'Stroll'), Constructor: { constructorId: 'aston_martin', name: 'Aston Martin' } },
    ],
  };

  it('takes the fastest lap across all segments, not just Q3', () => {
    const laps = extractQualiLaps(race);
    expect(laps.find(l => l.driverId === 'piastri').time).toBe('1:29.841');
    // Leclerc's Q2 beat his Q3
    expect(laps.find(l => l.driverId === 'leclerc').time).toBe('1:30.175');
  });

  it('works on a Q1-only season', () => {
    const old = { QualifyingResults: [{ Driver: driver('hill', 'HIL', 'Damon', 'Hill'), Constructor: { constructorId: 'williams', name: 'Williams' }, Q1: '1:32.371' }] };
    const [lap] = extractQualiLaps(old);
    expect(lap.time).toBe('1:32.371');
    expect(lap.ms).toBe(92371);
  });

  it('skips drivers with no segment time at all', () => {
    expect(extractQualiLaps(race).map(l => l.driverId)).not.toContain('stroll');
  });
});

describe('buildGapRows', () => {
  it('sorts ascending with a zero gap on the leader', () => {
    const rows = buildGapRows(extractRaceLaps(bahrainRace()), 'drivers');
    expect(rows.map(r => r.code)).toEqual(['PIA', 'NOR', 'LEC', 'HAM']);
    expect(rows[0].gap).toBe(0);
    expect(rows[2].gap).toBe(992);
    expect(fmtGap(rows[2].gap)).toBe('+0.992s');
  });

  it('reports the interval to the row above', () => {
    const rows = buildGapRows(extractRaceLaps(bahrainRace()), 'drivers');
    expect(rows[0].interval).toBe(0);
    expect(rows[1].interval).toBe(588);
    expect(rows[2].interval).toBe(404);
  });

  it('collapses to one row per constructor at its best lap, keeping the setter', () => {
    const rows = buildGapRows(extractRaceLaps(bahrainRace()), 'teams');
    expect(rows).toHaveLength(2);
    expect(rows.map(r => r.constructorId)).toEqual(['mclaren', 'ferrari']);
    expect(rows[1].gap).toBe(992);
    expect(rows[1].name).toBe('Charles Leclerc');
    expect(rows[1].label).toBe('Ferrari');
  });

  it('labels driver rows by code and team rows by team name', () => {
    expect(buildGapRows(extractRaceLaps(bahrainRace()), 'drivers')[0].label).toBe('PIA');
    expect(buildGapRows(extractRaceLaps(bahrainRace()), 'teams')[0].label).toBe('McLaren');
  });

  it('returns an empty array for no entries', () => {
    expect(buildGapRows([], 'drivers')).toEqual([]);
    expect(buildGapRows([], 'teams')).toEqual([]);
  });
});

describe('buildSeasonGapSeries', () => {
  const races = [
    {
      round: '1', raceName: 'Australian Grand Prix',
      Results: [
        { Driver: driver('norris', 'NOR', 'Lando', 'Norris'), Constructor: MCL, FastestLap: { Time: { time: '1:22.167' } } },
        { Driver: driver('leclerc', 'LEC', 'Charles', 'Leclerc'), Constructor: FER, FastestLap: { Time: { time: '1:24.218' } } },
      ],
    },
    {
      round: '2', raceName: 'Chinese Grand Prix',
      Results: [
        { Driver: driver('norris', 'NOR', 'Lando', 'Norris'), Constructor: MCL, FastestLap: { Time: { time: '1:35.000' } } },
      ],
    },
  ];

  it('labels rounds with the race abbreviation', () => {
    expect(buildSeasonGapSeries(races, 'race').labels).toEqual(['AUS', 'CHN']);
  });

  it('gives the fastest team a zero gap and others their deficit in seconds', () => {
    const { series } = buildSeasonGapSeries(races, 'race');
    expect(series.mclaren[0]).toBe(0);
    expect(series.ferrari[0]).toBeCloseTo(2.051, 3);
  });

  it('records null for a round where a team set no lap', () => {
    const { series } = buildSeasonGapSeries(races, 'race');
    expect(series.ferrari[1]).toBeNull();
    expect(series.mclaren[1]).toBe(0);
  });

  it('resolves constructor display names', () => {
    expect(buildSeasonGapSeries(races, 'race').names).toEqual({ mclaren: 'McLaren', ferrari: 'Ferrari' });
  });

  it('skips rounds with no timing data at all', () => {
    const withBlank = [...races, { round: '3', raceName: 'Japanese Grand Prix', Results: [] }];
    expect(buildSeasonGapSeries(withBlank, 'race').labels).toEqual(['AUS', 'CHN']);
  });

  it('returns empty labels when nothing is available', () => {
    expect(buildSeasonGapSeries([], 'race').labels).toEqual([]);
  });
});

describe('clampGapAxis', () => {
  it('ignores a wet-race outlier when picking the axis ceiling', () => {
    const series = { a: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 12.368] };
    const { max, clipped } = clampGapAxis(series);
    expect(max).toBeLessThan(3);
    expect(clipped).toBe(true);
  });

  it('does not clip when the spread is even', () => {
    expect(clampGapAxis({ a: [0, 0.5, 1.0, 1.5, 2.0] }).clipped).toBe(false);
  });

  it('falls back to a 1s ceiling with no data', () => {
    expect(clampGapAxis({})).toEqual({ max: 1, clipped: false });
    expect(clampGapAxis({ a: [null, null] })).toEqual({ max: 1, clipped: false });
  });
});

describe('buildSeasonGapDatasets', () => {
  const series = { mclaren: [0, 0], ferrari: [2.051, null] };
  const names  = { mclaren: 'McLaren', ferrari: 'Ferrari' };

  it('draws the selected constructor solid, thick and on top', () => {
    const ds = buildSeasonGapDatasets(series, names, 'ferrari');
    const sel = ds.find(d => d._teamId === 'ferrari');
    expect(sel.borderDash).toEqual([]);
    expect(sel.borderWidth).toBe(3);
    expect(sel.order).toBe(0);
    expect(sel._selected).toBe(true);
    expect(sel.borderColor).toBe('#E8002D');
  });

  it('draws the rest faint and dashed', () => {
    const ds = buildSeasonGapDatasets(series, names, 'ferrari');
    const other = ds.find(d => d._teamId === 'mclaren');
    expect(other.borderDash).toEqual([4, 3]);
    expect(other.borderColor).toBe('#FF800040');
    expect(other.pointRadius).toBe(0);
    expect(other.order).toBe(1);
  });

  it('spans gaps so a missing round does not break the line', () => {
    const ds = buildSeasonGapDatasets(series, names, 'ferrari');
    expect(ds.every(d => d.spanGaps === true)).toBe(true);
    expect(ds.find(d => d._teamId === 'ferrari').data).toEqual([2.051, null]);
  });
});

describe('buildSeasonGapSummary', () => {
  const series = { mclaren: [0, 0.1], ferrari: [2.0, null], haas: [null, null] };
  const names  = { mclaren: 'McLaren', ferrari: 'Ferrari', haas: 'Haas' };

  it('averages over the rounds a team actually ran', () => {
    const rows = buildSeasonGapSummary(series, names);
    expect(rows[0].name).toBe('McLaren');
    expect(rows[0].avg).toBeCloseTo(0.05, 5);
    expect(rows[1].avg).toBe(2.0);
    expect(rows[1].rounds).toBe(1);
  });

  it('counts rounds where the team set the fastest lap', () => {
    expect(buildSeasonGapSummary(series, names)[0].fastest).toBe(1);
  });

  it('drops constructors with no timed rounds', () => {
    expect(buildSeasonGapSummary(series, names).map(r => r.id)).not.toContain('haas');
  });
});
