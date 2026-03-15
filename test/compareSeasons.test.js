import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildCompareDatasets } from '../src/career.js';

// Break the DOM/window chain the same way fetchConstructorCareer tests do
vi.mock('../src/season-selector.js', () => ({ selectYear: vi.fn() }));
vi.mock('../src/ui.js', () => ({ setFilter: vi.fn(), renderLegend: vi.fn(), switchTab: vi.fn() }));
vi.mock('../src/chart.js', () => ({ renderChart: vi.fn() }));
vi.mock('../src/table.js', () => ({ renderTable: vi.fn() }));
vi.mock('../src/state.js', () => ({
  state: {
    careerDriverId: 'norris', careerYears: [], compareMode: false,
    comparePick: [null, null], compareChart: null,
    ctorData: [], driverData: [], hiddenSeries: new Set(),
  },
}));

function makeDriver(id, cumPoints) {
  return { id, cumPoints, total: cumPoints.at(-1) ?? 0 };
}

describe('buildCompareDatasets', () => {
  it('returns R1..RN labels based on the longer season', () => {
    const driverA = makeDriver('norris', [25, 50, 75]);       // 3 rounds
    const driverB = makeDriver('norris', [18, 36, 54, 72]);   // 4 rounds

    const { labels } = buildCompareDatasets(driverA, driverB, 3, 4, '2023', '2024');

    expect(labels).toEqual(['R1', 'R2', 'R3', 'R4']);
  });

  it('uses the longer round count when season A is shorter', () => {
    const driverA = makeDriver('norris', [10]);
    const driverB = makeDriver('norris', [10, 20, 30]);

    const { labels } = buildCompareDatasets(driverA, driverB, 1, 3, '2022', '2024');
    expect(labels).toHaveLength(3);
  });

  it('uses the longer round count when season B is shorter', () => {
    const driverA = makeDriver('norris', [10, 20, 30, 40, 50]);
    const driverB = makeDriver('norris', [10, 20]);

    const { labels } = buildCompareDatasets(driverA, driverB, 5, 2, '2023', '2024');
    expect(labels).toHaveLength(5);
  });

  it('returns two datasets labelled with the year strings', () => {
    const driverA = makeDriver('norris', [25]);
    const driverB = makeDriver('norris', [18]);

    const { datasets } = buildCompareDatasets(driverA, driverB, 1, 1, '2023', '2024');

    expect(datasets).toHaveLength(2);
    expect(datasets[0].label).toBe('2023');
    expect(datasets[1].label).toBe('2024');
  });

  it('dataset data matches the driver cumPoints arrays', () => {
    const cumA = [25, 50, 75];
    const cumB = [18, 43, 68, 93];
    const driverA = makeDriver('norris', cumA);
    const driverB = makeDriver('norris', cumB);

    const { datasets } = buildCompareDatasets(driverA, driverB, 3, 4, '2023', '2024');

    expect(datasets[0].data).toEqual(cumA);
    expect(datasets[1].data).toEqual(cumB);
  });

  it('dataset A has red border color', () => {
    const { datasets } = buildCompareDatasets(
      makeDriver('norris', [25]), makeDriver('norris', [18]), 1, 1, '2023', '2024'
    );
    expect(datasets[0].borderColor).toBe('#e10600');
  });

  it('dataset B has teal border color', () => {
    const { datasets } = buildCompareDatasets(
      makeDriver('norris', [25]), makeDriver('norris', [18]), 1, 1, '2023', '2024'
    );
    expect(datasets[1].borderColor).toBe('#27F4D2');
  });

  it('returns empty data array when driverA is null (driver did not race that year)', () => {
    const driverB = makeDriver('norris', [25, 50]);
    const { datasets } = buildCompareDatasets(null, driverB, 0, 2, '2018', '2024');

    expect(datasets[0].data).toEqual([]);
    expect(datasets[1].data).toEqual([25, 50]);
  });

  it('returns empty data array when driverB is null', () => {
    const driverA = makeDriver('norris', [25, 50]);
    const { datasets } = buildCompareDatasets(driverA, null, 2, 0, '2023', '2024');

    expect(datasets[0].data).toEqual([25, 50]);
    expect(datasets[1].data).toEqual([]);
  });

  it('both seasons same length produces matching label count', () => {
    const driverA = makeDriver('norris', [10, 20]);
    const driverB = makeDriver('norris', [15, 30]);

    const { labels, datasets } = buildCompareDatasets(driverA, driverB, 2, 2, '2023', '2024');
    expect(labels).toHaveLength(2);
    expect(datasets[0].data).toHaveLength(2);
    expect(datasets[1].data).toHaveLength(2);
  });
});
