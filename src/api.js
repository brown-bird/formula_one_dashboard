import { API } from './constants.js';

export async function apiFetch(path, _attempt = 0) {
  const res = await fetch(`${API}/${path}`, {
    headers: { 'Accept': 'application/json' }
  });
  if (res.status === 429 && _attempt < 4) {
    await new Promise(r => setTimeout(r, (2 ** _attempt) * 1000));
    return apiFetch(path, _attempt + 1);
  }
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

// Fetch all race results across API pages, merging by round
export async function fetchAllRaces(basePath) {
  const PAGE = 100;
  const first = await apiFetch(`${basePath}/?limit=${PAGE}&offset=0`);
  const total = parseInt(first.MRData.total, 10);
  const byRound = {};
  for (const race of first.MRData.RaceTable.Races) byRound[race.round] = race;

  if (total > PAGE) {
    const offsets = [];
    for (let off = PAGE; off < total; off += PAGE) offsets.push(off);
    const pages = await Promise.all(
      offsets.map(off => apiFetch(`${basePath}/?limit=${PAGE}&offset=${off}`))
    );
    for (const page of pages) {
      for (const race of page.MRData.RaceTable.Races) {
        if (byRound[race.round]) {
          const resultsKey = race.Results ? 'Results' : race.SprintResults ? 'SprintResults' : null;
          if (resultsKey) byRound[race.round][resultsKey].push(...race[resultsKey]);
        } else {
          byRound[race.round] = race;
        }
      }
    }
  }

  return Object.values(byRound).sort((a, b) => parseInt(a.round) - parseInt(b.round));
}
