import { RACE_ABBR } from './constants.js';

export function processRaces(races) {
  const driverMap = {};
  const ctorMap   = {};
  const labels    = [];
  const roundNums = races.map(r => r.round);

  // Pass 1: collect all race results
  races.forEach(race => {
    labels.push(RACE_ABBR[race.raceName] || race.raceName.slice(0, 3).toUpperCase());

    (race.Results || []).forEach(result => {
      const dId = result.Driver.driverId;
      const cId = result.Constructor.constructorId;
      const pts = parseFloat(result.points) || 0;
      const wins = result.position === '1' ? 1 : 0;

      // Driver
      if (!driverMap[dId]) {
        driverMap[dId] = {
          id: dId,
          name: `${result.Driver.givenName} ${result.Driver.familyName}`,
          abbr: result.Driver.code || result.Driver.familyName.slice(0,3).toUpperCase(),
          team: result.Constructor.name,
          constructorId: cId,
          ptsMap: {}, posMap: {}, wins: 0, total: 0,
        };
      }
      driverMap[dId].ptsMap[race.round] = pts;
      driverMap[dId].posMap[race.round] = parseInt(result.position, 10) || null;
      driverMap[dId].total += pts;
      driverMap[dId].wins  += wins;

      // Constructor
      if (!ctorMap[cId]) {
        ctorMap[cId] = {
          id: cId,
          name: result.Constructor.name,
          ptsMap: {}, wins: 0, total: 0,
        };
      }
      ctorMap[cId].ptsMap[race.round] = (ctorMap[cId].ptsMap[race.round] || 0) + pts;
      ctorMap[cId].total += pts;
      ctorMap[cId].wins  += wins;
    });
  });

  // Pass 2: build cumulative arrays (sorted by total)
  function buildCumulative(map) {
    return Object.values(map)
      .map(item => {
        let cum = 0;
        const cumPoints = roundNums.map(rnd => {
          cum += (item.ptsMap[rnd] || 0);
          return cum;
        });
        const positions = item.posMap
          ? roundNums.map(rnd => item.posMap[rnd] ?? null)
          : null;
        return { ...item, cumPoints, positions };
      })
      .sort((a, b) => b.total - a.total);
  }

  return {
    drivers: buildCumulative(driverMap),
    ctors:   buildCumulative(ctorMap),
    labels,
  };
}
