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
};
