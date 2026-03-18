import { state } from './state.js';

// Encode current app state into the URL hash (replaceState — no back-button noise)
export function pushState() {
  const p = new URLSearchParams();
  p.set('s', state.season);
  if (state.tab !== 'drivers')    p.set('t', state.tab);
  if (state.filter !== 5)         p.set('f', state.filter);
  if (state.chartMode !== 'points') p.set('m', state.chartMode);
  if (state.careerDriverId) {
    p.set('career', 'driver');
    p.set('id', state.careerDriverId);
  } else if (state.careerConstructorId) {
    p.set('career', 'ctor');
    p.set('id', state.careerConstructorId);
  }
  history.replaceState(null, '', '#' + p.toString());
}

// Parse the current URL hash into a plain object, or null if empty
export function readHash() {
  const hash = location.hash.slice(1);
  return hash ? Object.fromEntries(new URLSearchParams(hash)) : null;
}
