import { RACE_ABBR } from './constants.js';
import { teamColor } from './helpers.js';

// Earliest seasons the API carries the underlying timing data for
export const FIRST_FASTEST_LAP_YEAR = 2004;
export const FIRST_QUALI_YEAR       = 1994;

// "1:35.140" → 95140 ms. Also accepts a bare "35.140".
export function parseLapMs(str) {
  if (typeof str !== 'string') return null;
  const m = str.trim().match(/^(?:(\d+):)?(\d{1,2}(?:\.\d{1,3})?)$/);
  if (!m) return null;
  const mins = m[1] ? parseInt(m[1], 10) : 0;
  return mins * 60000 + Math.round(parseFloat(m[2]) * 1000);
}

// 1432 → "+1.432s"
export function fmtGap(ms) {
  return `+${(ms / 1000).toFixed(3)}s`;
}

function entry(driver, constructor, time) {
  return {
    driverId:      driver.driverId,
    code:          driver.code || driver.familyName.slice(0, 3).toUpperCase(),
    name:          `${driver.givenName} ${driver.familyName}`,
    lastName:      driver.familyName,
    constructorId: constructor.constructorId,
    teamName:      constructor.name,
    time,
    ms:            parseLapMs(time),
  };
}

// Fastest race lap per driver, from an Ergast/Jolpica race-results payload
export function extractRaceLaps(race) {
  return (race?.Results || [])
    .filter(r => r.FastestLap?.Time?.time && parseLapMs(r.FastestLap.Time.time) !== null)
    .map(r => entry(r.Driver, r.Constructor, r.FastestLap.Time.time));
}

// Best qualifying lap per driver — fastest of whichever of Q1/Q2/Q3 are present
export function extractQualiLaps(race) {
  const out = [];
  for (const q of race?.QualifyingResults || []) {
    let best = null;
    for (const key of ['Q1', 'Q2', 'Q3']) {
      const ms = parseLapMs(q[key]);
      if (ms !== null && (best === null || ms < best.ms)) best = { ms, time: q[key] };
    }
    if (best) out.push(entry(q.Driver, q.Constructor, best.time));
  }
  return out;
}

// Rank entries by lap time and annotate the gap to the leader.
// grain 'teams' collapses to one row per constructor at its best lap.
export function buildGapRows(entries, grain = 'drivers') {
  let rows = entries.filter(e => e.ms !== null);

  if (grain === 'teams') {
    const best = {};
    for (const e of rows) {
      if (!best[e.constructorId] || e.ms < best[e.constructorId].ms) best[e.constructorId] = e;
    }
    rows = Object.values(best);
  }

  rows = rows.slice().sort((a, b) => a.ms - b.ms);
  if (!rows.length) return [];

  const leader = rows[0].ms;
  return rows.map((e, i) => ({
    ...e,
    label:    grain === 'teams' ? e.teamName : e.code,
    gap:      e.ms - leader,
    interval: i === 0 ? 0 : e.ms - rows[i - 1].ms,
  }));
}

export function raceLabel(race) {
  return RACE_ABBR[race.raceName] || race.raceName.slice(0, 3).toUpperCase();
}

// Per-round gap (in seconds) between each constructor's best lap and the
// fastest lap of that round. null where a constructor set no time.
export function buildSeasonGapSeries(races, session = 'race') {
  const extract = session === 'quali' ? extractQualiLaps : extractRaceLaps;
  const labels  = [];
  const perRound = [];

  races.forEach(race => {
    const entries = extract(race);
    const best = {};
    for (const e of entries) {
      if (!best[e.constructorId] || e.ms < best[e.constructorId]) best[e.constructorId] = e.ms;
    }
    if (!Object.keys(best).length) return;
    labels.push(raceLabel(race));
    perRound.push(best);
  });

  const names  = {};
  const series = {};
  perRound.forEach(best => {
    for (const id of Object.keys(best)) series[id] = [];
  });
  races.forEach(race => {
    for (const e of extract(race)) names[e.constructorId] = e.teamName;
  });

  perRound.forEach(best => {
    const leader = Math.min(...Object.values(best));
    for (const id of Object.keys(series)) {
      series[id].push(best[id] === undefined ? null : (best[id] - leader) / 1000);
    }
  });

  return { labels, series, names };
}

// Y-axis ceiling that ignores wet-race outliers (a single safety-car lap can be
// 10s+ off the pace and would otherwise flatten the whole chart).
export function clampGapAxis(series) {
  const vals = Object.values(series)
    .flat()
    .filter(v => v !== null && v !== undefined)
    .sort((a, b) => a - b);
  if (!vals.length) return { max: 1, clipped: false };

  // Nearest-rank 90th percentile: for n=10 this is the 9th value, not the 10th
  const p90 = vals[Math.max(0, Math.ceil(vals.length * 0.9) - 1)];
  const max = Math.max(1, Math.ceil(p90 * 1.4 * 2) / 2);
  return { max, clipped: vals[vals.length - 1] > max };
}

// Chart.js line datasets: selected constructor solid and prominent,
// the rest faint and dashed for context.
export function buildSeasonGapDatasets(series, names, selectedTeam) {
  return Object.keys(series)
    .sort((a, b) => (a === selectedTeam ? 1 : 0) - (b === selectedTeam ? 1 : 0))
    .map(id => {
      const on    = id === selectedTeam;
      const color = teamColor(id);
      return {
        label:            names[id] || id,
        data:             series[id],
        borderColor:      on ? color : color + '40',
        backgroundColor:  on ? color : color + '40',
        borderWidth:      on ? 3 : 1.5,
        borderDash:       on ? [] : [4, 3],
        pointRadius:      on ? 4 : 0,
        pointHoverRadius: on ? 7 : 4,
        tension:          0.25,
        fill:             false,
        spanGaps:         true,
        order:            on ? 0 : 1,
        _teamId:          id,
        _selected:        on,
      };
    });
}

// Season aggregate per constructor, for the table below the chart
export function buildSeasonGapSummary(series, names) {
  return Object.keys(series)
    .map(id => {
      const vals = series[id].filter(v => v !== null);
      return {
        id,
        name:    names[id] || id,
        avg:     vals.reduce((a, b) => a + b, 0) / vals.length,
        best:    Math.min(...vals),
        worst:   Math.max(...vals),
        fastest: vals.filter(v => v === 0).length,
        rounds:  vals.length,
      };
    })
    .filter(r => r.rounds > 0)
    .sort((a, b) => a.avg - b.avg);
}
