import { CURRENT_YEAR } from './constants.js';
import { state } from './state.js';
import { apiFetch, fetchAllRaces } from './api.js';
import { processRaces } from './data.js';
import { toggleTheme } from './theme.js';
import { renderChart } from './chart.js';
import { renderTable, renderStats, renderCalendar } from './table.js';
import { setChartLoading, switchTab, setFilter, setChartMode } from './ui.js';
import {
  buildDropdown, selectYear, toggleDropdown, updateSeasonChrome, closeDropdown,
} from './season-selector.js';
import { hideDriverCareer, toggleCtorPicker, closeCtorPicker, toggleCompareMode, runSeasonCompare } from './career.js';

export async function loadSeason(year) {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    document.getElementById('loading-text').textContent = `Fetching ${year} season data…`;
  }
  setChartLoading('main-chart-loader', true);

  try {
    const [scheduleJson, resultRaces, sprintRaces] = await Promise.all([
      apiFetch(`${year}.json?limit=100`),
      fetchAllRaces(`${year}/results`),
      fetchAllRaces(`${year}/sprint`).catch(() => []),
    ]);

    const schedule = scheduleJson.MRData.RaceTable.Races;

    // Merge sprint points into race results
    if (sprintRaces.length) {
      const sprintMap = {};
      sprintRaces.forEach(sr => {
        sprintMap[sr.round] = sr.SprintResults || [];
      });
      resultRaces.forEach(race => {
        const sprints = sprintMap[race.round];
        if (sprints?.length) {
          const sprintByDriver = {};
          sprints.forEach(s => {
            sprintByDriver[s.Driver.driverId] = parseFloat(s.points) || 0;
          });
          race.Results.forEach(r => {
            if (sprintByDriver[r.Driver.driverId]) {
              r.points = String(parseFloat(r.points) + sprintByDriver[r.Driver.driverId]);
            }
          });
        }
      });
    }

    if (!resultRaces.length) {
      state.schedule   = schedule;
      state.raceLabels = [];
      state.driverData = [];
      state.ctorData   = [];
      renderCalendar(schedule, new Set());
      renderStats([], schedule);
    } else {
      const { drivers, ctors, labels } = processRaces(resultRaces);
      state.schedule   = schedule;
      state.raceLabels = labels;
      state.driverData = drivers;
      state.ctorData   = ctors;
      renderStats(resultRaces, schedule);
      renderChart();
      renderTable();
      renderCalendar(schedule, new Set(resultRaces.map(r => r.round)));
    }

    updateSeasonChrome(year);

    setChartLoading('main-chart-loader', false);
    if (overlay) {
      overlay.classList.add('hidden');
      setTimeout(() => overlay.remove(), 500);
    }

  } catch (err) {
    console.error(err);
    setChartLoading('main-chart-loader', false);
    const banner = document.getElementById('error-banner');
    banner.style.display = 'block';
    banner.textContent = `⚠️ Could not load ${year} season data: ${err.message}. Check your connection and try again.`;
    if (overlay) overlay.classList.add('hidden');
  }
}

// Expose functions needed by inline onclick attributes in HTML
window.toggleTheme      = toggleTheme;
window.toggleDropdown   = toggleDropdown;
window.selectYear       = selectYear;
window.CURRENT_YEAR     = CURRENT_YEAR;
window.switchTab        = switchTab;
window.setChartMode     = setChartMode;
window.setFilter        = setFilter;
window.hideDriverCareer   = hideDriverCareer;
window.toggleCtorPicker   = toggleCtorPicker;
window.toggleCompareMode  = toggleCompareMode;
window.runSeasonCompare   = runSeasonCompare;

// Close dropdown on outside click
document.addEventListener('click', e => {
  if (state.dropdownOpen && !document.getElementById('season-selector').contains(e.target)) {
    closeDropdown();
  }
});

// Close ctor picker on outside click
document.addEventListener('click', e => {
  const picker = document.getElementById('ctor-picker');
  if (picker && !picker.contains(e.target)) closeCtorPicker();
});

// Restore saved theme before first render
(function() {
  const saved = localStorage.getItem('f1-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  document.getElementById('theme-icon').textContent = saved === 'light' ? '🌙' : '☀️';
})();

// Build dropdown and kick off initial load
buildDropdown();
loadSeason(CURRENT_YEAR);
