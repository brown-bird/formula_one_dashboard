import { describe, it, expect, beforeEach } from 'vitest';
import { buildDatasets } from '../src/chart.js';
import { state } from '../src/state.js';

// Minimal driver item matching the shape processRaces produces
function makeDriver({ id, name, constructorId, cumPoints, positions = null }) {
  return { id, name, constructorId, cumPoints, positions, total: cumPoints.at(-1) };
}

// Minimal constructor item (no constructorId on self)
function makeCtor({ id, name, cumPoints }) {
  return { id, name, constructorId: null, cumPoints, positions: null, total: cumPoints.at(-1) };
}

const HAM = makeDriver({ id: 'hamilton', name: 'Lewis Hamilton', constructorId: 'mercedes', cumPoints: [25, 43] });
const RUS = makeDriver({ id: 'russell',  name: 'George Russell',  constructorId: 'mercedes', cumPoints: [18, 33] });
const LEC = makeDriver({ id: 'leclerc',  name: 'Charles Leclerc', constructorId: 'ferrari',  cumPoints: [15, 40] });
const VER = makeDriver({ id: 'verstappen', name: 'Max Verstappen', constructorId: 'red_bull', cumPoints: [12, 24] });
const NOR = makeDriver({ id: 'norris',   name: 'Lando Norris',   constructorId: 'mclaren',  cumPoints: [10, 20] });
const PIA = makeDriver({ id: 'piastri',  name: 'Oscar Piastri',  constructorId: 'mclaren',  cumPoints: [8, 18] });

const ALL_DRIVERS = [HAM, RUS, LEC, VER, NOR, PIA];

beforeEach(() => {
  state.chartMode = 'points';
});

describe('buildDatasets — filter', () => {
  it('filter=5 returns first 5 items', () => {
    const ds = buildDatasets(ALL_DRIVERS, 5, new Set());
    expect(ds).toHaveLength(5);
  });

  it('filter=0 returns all items', () => {
    const ds = buildDatasets(ALL_DRIVERS, 0, new Set());
    expect(ds).toHaveLength(6);
  });

  it('filter=h2h returns all items (visibility is managed via hidden set)', () => {
    const ds = buildDatasets(ALL_DRIVERS, 'h2h', new Set());
    expect(ds).toHaveLength(6);
  });

  it('filter larger than item count clamps to item count', () => {
    const ds = buildDatasets([HAM, LEC], 10, new Set());
    expect(ds).toHaveLength(2);
  });
});

describe('buildDatasets — team dashed lines', () => {
  it('first driver on a team has no border dash', () => {
    const ds = buildDatasets(ALL_DRIVERS, 0, new Set());
    const hamDs = ds.find(d => d.label === 'Lewis Hamilton');
    expect(hamDs.borderDash).toEqual([]);
    expect(hamDs._dashed).toBe(false);
  });

  it('second driver on same team gets dashed line', () => {
    const ds = buildDatasets(ALL_DRIVERS, 0, new Set());
    const rusDs = ds.find(d => d.label === 'George Russell');
    expect(rusDs.borderDash).toEqual([6, 3]);
    expect(rusDs._dashed).toBe(true);
  });

  it('two drivers on different teams both get solid lines', () => {
    const ds = buildDatasets([HAM, LEC], 0, new Set());
    expect(ds[0].borderDash).toEqual([]);
    expect(ds[1].borderDash).toEqual([]);
  });
});

describe('buildDatasets — hidden series', () => {
  it('items in the hidden set have hidden: true', () => {
    const ds = buildDatasets(ALL_DRIVERS, 0, new Set(['hamilton']));
    const hamDs = ds.find(d => d.label === 'Lewis Hamilton');
    expect(hamDs.hidden).toBe(true);
  });

  it('items not in the hidden set have hidden: false', () => {
    const ds = buildDatasets(ALL_DRIVERS, 0, new Set());
    const hamDs = ds.find(d => d.label === 'Lewis Hamilton');
    expect(hamDs.hidden).toBe(false);
  });
});

describe('buildDatasets — chartMode', () => {
  it('uses cumPoints when chartMode is points', () => {
    state.chartMode = 'points';
    const ds = buildDatasets([HAM], 0, new Set());
    expect(ds[0].data).toBe(HAM.cumPoints);
  });

  it('uses positions when chartMode is position and positions exist', () => {
    state.chartMode = 'position';
    const driver = makeDriver({ id: 'x', name: 'X', constructorId: 'ferrari', cumPoints: [25], positions: [1] });
    const ds = buildDatasets([driver], 0, new Set());
    expect(ds[0].data).toBe(driver.positions);
  });

  it('falls back to cumPoints when positions is null in position mode', () => {
    state.chartMode = 'position';
    // constructors have no positions
    const ctor = makeCtor({ id: 'mercedes', name: 'Mercedes', cumPoints: [43, 76] });
    ctor.positions = null;
    const ds = buildDatasets([ctor], 0, new Set());
    expect(ds[0].data).toBe(ctor.cumPoints);
  });
});

describe('buildDatasets — colors', () => {
  it('known constructor IDs get a non-empty borderColor', () => {
    const ds = buildDatasets([HAM], 0, new Set());
    expect(typeof ds[0].borderColor).toBe('string');
    expect(ds[0].borderColor.length).toBeGreaterThan(0);
  });

  it('unknown constructor IDs get a fallback color without throwing', () => {
    const driver = makeDriver({ id: 'x', name: 'X', constructorId: 'totally_unknown_team', cumPoints: [10] });
    expect(() => buildDatasets([driver], 0, new Set())).not.toThrow();
    const ds = buildDatasets([driver], 0, new Set());
    expect(ds[0].borderColor.length).toBeGreaterThan(0);
  });
});
