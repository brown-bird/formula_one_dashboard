import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fmtDate, daysUntil, teamColor } from '../src/helpers.js';
import { state } from '../src/state.js';

describe('fmtDate', () => {
  it('formats a valid date string', () => {
    // Use noon UTC to avoid midnight-UTC → previous-day-local shift
    const result = fmtDate('2026-03-15T12:00:00');
    expect(result).toBe('15 Mar');
  });

  it('returns empty string for empty input', () => {
    expect(fmtDate('')).toBe('');
  });

  it('returns empty string for null', () => {
    expect(fmtDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(fmtDate(undefined)).toBe('');
  });
});

describe('daysUntil', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Use noon UTC so local-time conversions don't shift the date
    vi.setSystemTime(new Date('2026-03-14T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null for a past date', () => {
    expect(daysUntil('2026-03-13T12:00:00Z')).toBeNull();
  });

  it('returns "Today" for today\'s date', () => {
    expect(daysUntil('2026-03-14T12:00:00Z')).toBe('Today');
  });

  it('returns "Tomorrow" for tomorrow', () => {
    expect(daysUntil('2026-03-15T12:00:00Z')).toBe('Tomorrow');
  });

  it('returns Nd for N days ahead', () => {
    expect(daysUntil('2026-03-21T12:00:00Z')).toBe('7d');
  });

  it('returns null for empty string', () => {
    expect(daysUntil('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(daysUntil(null)).toBeNull();
  });
});

describe('teamColor', () => {
  beforeEach(() => {
    // Reset color map between tests
    delete state._colorMap;
    state.fallbackIndex = 0;
  });

  it('returns the correct hex for a known team', () => {
    expect(teamColor('ferrari')).toBe('#E8002D');
  });

  it('is case-insensitive', () => {
    expect(teamColor('Ferrari')).toBe('#E8002D');
    expect(teamColor('FERRARI')).toBe('#E8002D');
  });

  it('normalises spaces to underscores', () => {
    expect(teamColor('red bull')).toBe('#3671C6');
    expect(teamColor('aston martin')).toBe('#358C75');
  });

  it('returns the same fallback color for the same unknown team across calls', () => {
    const first  = teamColor('unknown_team_xyz');
    const second = teamColor('unknown_team_xyz');
    expect(first).toBe(second);
  });

  it('returns different fallback colors for different unknown teams', () => {
    const a = teamColor('unknown_alpha');
    const b = teamColor('unknown_beta');
    expect(a).not.toBe(b);
  });

  it('returns a non-empty string for null/undefined input', () => {
    const color = teamColor(null);
    expect(typeof color).toBe('string');
    expect(color.length).toBeGreaterThan(0);
  });
});
