import { TEAM_COLORS, FALLBACK_COLORS } from './constants.js';
import { state } from './state.js';

export function teamColor(constructorId) {
  const key = (constructorId || '').toLowerCase().replace(/ /g, '_');
  if (TEAM_COLORS[key]) return TEAM_COLORS[key];
  // stable fallback per unknown team
  if (!state._colorMap) state._colorMap = {};
  if (!state._colorMap[key]) {
    state._colorMap[key] = FALLBACK_COLORS[state.fallbackIndex++ % FALLBACK_COLORS.length];
  }
  return state._colorMap[key];
}

export function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  const target = new Date(dateStr);
  const diff = Math.round((target - now) / 86400000);
  if (diff < 0) return null;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${diff}d`;
}
