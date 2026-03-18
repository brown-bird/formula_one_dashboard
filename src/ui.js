import { state } from './state.js';
import { renderChart } from './chart.js';
import { renderTable } from './table.js';
import { hideDriverCareer } from './career.js';
import { pushState } from './router.js';

export function setChartLoading(id, show) {
  document.getElementById(id)?.classList.toggle('visible', show);
}

export function setChartMode(mode) {
  state.chartMode = mode;
  document.getElementById('mode-btn-points').classList.toggle('active', mode === 'points');
  document.getElementById('mode-btn-position').classList.toggle('active', mode === 'position');
  document.getElementById('chart-subtitle').textContent =
    mode === 'position' ? 'Finishing position per race' : 'Cumulative championship points per race';
  renderChart();
  pushState();
}

export function switchTab(tab) {
  hideDriverCareer();
  state.tab = tab;
  state.hiddenSeries.clear();
  state.h2hPick = [];
  document.getElementById('tab-drivers').classList.toggle('active', tab === 'drivers');
  document.getElementById('tab-ctors').classList.toggle('active', tab === 'constructors');
  document.getElementById('chart-title').firstChild.textContent =
    tab === 'drivers' ? 'Points Progression — Drivers ' : 'Points Progression — Constructors ';

  // Mode toggle only relevant for drivers
  const modeToggle = document.getElementById('mode-toggle');
  if (tab === 'constructors') {
    modeToggle.style.display = 'none';
    if (state.chartMode !== 'points') {
      state.chartMode = 'points';
      document.getElementById('chart-subtitle').textContent = 'Cumulative championship points per race';
    }
  } else {
    modeToggle.style.display = '';
  }

  // Constructors: hide "Top 10" chip (only 10 teams total)
  const chips = document.getElementById('filter-chips');
  chips.querySelector('[data-n="10"]').style.display =
    tab === 'constructors' ? 'none' : '';

  // If constructors and filter was 10, reset to 5
  if (tab === 'constructors' && state.filter === 10) setFilter(5, false);
  // Re-init H2H picks for new tab's items
  else if (state.filter === 'h2h') setFilter('h2h', false);

  document.getElementById('table-title').textContent =
    tab === 'drivers' ? 'Driver Standings' : 'Constructor Standings';

  renderChart();
  renderTable();
  pushState();
}

export function setFilter(n, redraw = true) {
  state.filter = n;
  document.querySelectorAll('.chip').forEach(c => {
    c.classList.toggle('active', c.dataset.n === String(n));
  });
  if (n === 'h2h') {
    const items = state.tab === 'drivers' ? state.driverData : state.ctorData;
    state.h2hPick = items.slice(0, 2).map(item => item.id || item.name);
    state.hiddenSeries = new Set(
      items.slice(2).map(item => item.id || item.name)
    );
  } else {
    state.h2hPick = [];
    state.hiddenSeries.clear();
  }
  if (redraw) { renderChart(); pushState(); }
}
