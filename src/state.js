import { CURRENT_YEAR } from './constants.js';

export const state = {
  season:        CURRENT_YEAR,
  tab:           'drivers',
  filter:        5,
  driverData:    [],
  ctorData:      [],
  raceLabels:    [],
  schedule:      [],
  chart:         null,
  careerChart:   null,
  hiddenSeries:  new Set(),
  h2hPick:       [],
  fallbackIndex: 0,
  dropdownOpen:  false,
  chartMode:     'points',   // 'points' | 'position'
  careerDriverId: null,
  careerConstructorId: null,
  careerYears:   [],
  compareMode:   false,
  comparePick:   [null, null],
  compareChart:  null,
  // Gap to Leader view. `tab` stays 'drivers'|'constructors' — the standings
  // chart, table and filters all branch on it — so this view has its own flag.
  gapView:       false,
  gapSession:    'race',     // 'race' | 'quali'
  gapGrain:      'drivers',  // 'drivers' | 'teams'
  gapRound:      null,       // round number as a string, or 'all'
  gapTeam:       null,       // constructorId
  gapChart:      null,
  rawRaces:      [],         // raw race payloads, kept for FastestLap times
  qualiRaces:    null,       // lazily fetched, per season
};
