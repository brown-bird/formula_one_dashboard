import { describe, it, expect } from 'vitest';
import { processRaces } from '../src/data.js';
import races from './fixtures/two-race-season.json' assert { type: 'json' };

function makeRace(round, raceName, results) {
  return { round, raceName, date: '2026-01-01', Results: results };
}

function makeResult({ driverId, givenName, familyName, code = null, constructorId, constructorName, points, position }) {
  return {
    position,
    points,
    Driver: { driverId, givenName, familyName, code },
    Constructor: { constructorId, name: constructorName },
  };
}

describe('processRaces', () => {
  it('accumulates cumulative points across races', () => {
    const { drivers } = processRaces(races);
    const ham = drivers.find(d => d.id === 'hamilton');
    // Race 1: 25pts, Race 2: 18pts → cumulative [25, 43]
    expect(ham.cumPoints).toEqual([25, 43]);
  });

  it('sorts drivers descending by total points', () => {
    const { drivers } = processRaces(races);
    // Hamilton: 43, Leclerc: 40, Russell: 33
    expect(drivers[0].id).toBe('hamilton');
    expect(drivers[1].id).toBe('leclerc');
    expect(drivers[2].id).toBe('russell');
  });

  it('counts wins correctly', () => {
    const { drivers } = processRaces(races);
    const ham = drivers.find(d => d.id === 'hamilton');
    const lec = drivers.find(d => d.id === 'leclerc');
    const rus = drivers.find(d => d.id === 'russell');
    expect(ham.wins).toBe(1);
    expect(lec.wins).toBe(1);
    expect(rus.wins).toBe(0);
  });

  it('builds race labels from RACE_ABBR lookup', () => {
    const { labels } = processRaces(races);
    expect(labels).toEqual(['AUS', 'BHR']);
  });

  it('falls back to first 3 chars of race name when not in RACE_ABBR', () => {
    const testRaces = [makeRace('1', 'Unknown Future Grand Prix', [
      makeResult({ driverId: 'test', givenName: 'Test', familyName: 'Driver', constructorId: 'foo', constructorName: 'Foo', points: '10', position: '5' }),
    ])];
    const { labels } = processRaces(testRaces);
    expect(labels[0]).toBe('UNK');
  });

  it('falls back to family name slice when driver has no code', () => {
    const testRaces = [makeRace('1', 'Australian Grand Prix', [
      makeResult({ driverId: 'nocode', givenName: 'No', familyName: 'Codemann', code: null, constructorId: 'foo', constructorName: 'Foo', points: '10', position: '5' }),
    ])];
    const { drivers } = processRaces(testRaces);
    expect(drivers[0].abbr).toBe('COD');
  });

  it('sums constructor points from both drivers', () => {
    const { ctors } = processRaces(races);
    const merc = ctors.find(c => c.id === 'mercedes');
    // Ham: 25+18=43, Rus: 18+15=33 → merc total = 76
    expect(merc.total).toBe(76);
  });

  it('sorts constructors descending by total points', () => {
    const { ctors } = processRaces(races);
    // Mercedes: 76, Ferrari: 40
    expect(ctors[0].id).toBe('mercedes');
    expect(ctors[1].id).toBe('ferrari');
  });

  it('produces null positions for rounds a driver did not appear in', () => {
    const testRaces = [
      makeRace('1', 'Australian Grand Prix', [
        makeResult({ driverId: 'a', givenName: 'A', familyName: 'Aaa', constructorId: 'foo', constructorName: 'Foo', points: '10', position: '5' }),
      ]),
      makeRace('2', 'Bahrain Grand Prix', [
        // driver 'a' does not appear in round 2
        makeResult({ driverId: 'b', givenName: 'B', familyName: 'Bbb', constructorId: 'bar', constructorName: 'Bar', points: '10', position: '5' }),
      ]),
    ];
    const { drivers } = processRaces(testRaces);
    const a = drivers.find(d => d.id === 'a');
    expect(a.positions[1]).toBeNull();
  });

  it('cumulative points are 0 for rounds a driver did not appear in', () => {
    const testRaces = [
      makeRace('1', 'Australian Grand Prix', [
        makeResult({ driverId: 'a', givenName: 'A', familyName: 'Aaa', constructorId: 'foo', constructorName: 'Foo', points: '10', position: '5' }),
      ]),
      makeRace('2', 'Bahrain Grand Prix', [
        makeResult({ driverId: 'b', givenName: 'B', familyName: 'Bbb', constructorId: 'bar', constructorName: 'Bar', points: '10', position: '5' }),
      ]),
    ];
    const { drivers } = processRaces(testRaces);
    const a = drivers.find(d => d.id === 'a');
    // Round 2: no pts for a, so cumulative stays at 10
    expect(a.cumPoints).toEqual([10, 10]);
  });

  it('correctly identifies finishing positions', () => {
    const { drivers } = processRaces(races);
    const ham = drivers.find(d => d.id === 'hamilton');
    expect(ham.positions[0]).toBe(1);  // P1 in race 1
    expect(ham.positions[1]).toBe(2);  // P2 in race 2
  });

  it('returns empty arrays for empty input', () => {
    const { drivers, ctors, labels } = processRaces([]);
    expect(drivers).toEqual([]);
    expect(ctors).toEqual([]);
    expect(labels).toEqual([]);
  });
});
