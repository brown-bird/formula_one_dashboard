import { state } from './state.js';
import { teamColor } from './helpers.js';
import { chartColors } from './theme.js';

export function buildDatasets(items, filter, hidden) {
  const count = (filter === 0 || filter === 'h2h') ? items.length : Math.min(filter, items.length);
  const seenTeams = {};
  const usePosition = state.chartMode === 'position';

  const datasets = items.slice(0, count).map((item, i) => {
    const color = item.constructorId
      ? teamColor(item.constructorId)
      : teamColor(item.id);
    const isHidden = hidden.has(item.id || item.name);

    // Second driver on the same team gets a dashed line
    let borderDash = [];
    if (item.constructorId) {
      if (seenTeams[item.constructorId]) {
        borderDash = [6, 3];
      } else {
        seenTeams[item.constructorId] = true;
      }
    }

    const data = (usePosition && item.positions) ? item.positions : item.cumPoints;

    return {
      label:           item.name || item.abbr,
      data,
      borderColor:     color,
      backgroundColor: color + '18',
      borderWidth:     2.5,
      borderDash,
      pointRadius:     data.length <= 3 ? 6 : 4,
      pointHoverRadius:8,
      tension:         0.25,
      fill:            false,
      spanGaps:        usePosition,
      clip:            usePosition ? false : undefined,
      hidden:          isHidden,
      _itemRef:        item,
      _dashed:         borderDash.length > 0,
    };
  });

  return datasets;
}

export function renderChart() {
  const items  = state.tab === 'drivers' ? state.driverData : state.ctorData;
  const datasets = buildDatasets(items, state.filter, state.hiddenSeries);
  const labels   = state.raceLabels;

  const canvas = document.getElementById('main-chart');
  const ctx    = canvas.getContext('2d');

  if (state.chart) { state.chart.destroy(); }

  const cc = chartColors();

  // Set canvas width so all race labels fit (min 52px per race)
  const scrollEl = canvas.parentElement;
  const h = scrollEl.clientHeight || 400;
  const minW = Math.max(scrollEl.clientWidth, labels.length * 52);
  canvas.style.width  = minW + 'px';
  canvas.style.height = h + 'px';
  canvas.width  = minW;
  canvas.height = h;

  state.chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: cc.tooltip.bg,
          borderColor:     cc.tooltip.border,
          borderWidth: 1,
          titleColor:  cc.tooltip.title,
          bodyColor:   cc.tooltip.body,
          padding: 12,
          callbacks: {
            title: its => state.chartMode === 'position' ? its[0].label : `After ${its[0].label}`,
            label: item => {
              if (item.raw == null) return null;
              if (state.chartMode === 'position') {
                return ` ${item.dataset.label}: P${item.raw}`;
              }
              return ` ${item.dataset.label}: ${item.raw} pts`;
            },
          }
        }
      },
      scales: {
        x: {
          grid: { color: cc.grid, drawBorder: false },
          ticks: { color: cc.ticks, font: { size: 11 }, maxRotation: 0, autoSkip: false },
        },
        y: state.chartMode === 'position' ? {
          grid:    { color: cc.grid, drawBorder: false },
          ticks:   { color: cc.ticks, font: { size: 11 }, stepSize: 1, callback: v => `P${v}` },
          title:   { display: true, text: 'Finishing Position', color: cc.axisTitle, font: { size: 11 } },
          reverse: true,
          min:     1,
          max:     20,
        } : {
          grid: { color: cc.grid, drawBorder: false },
          ticks: { color: cc.ticks, font: { size: 11 } },
          title: { display: true, text: 'Championship Points', color: cc.axisTitle, font: { size: 11 } },
          beginAtZero: true,
        }
      }
    }
  });

  renderLegend(datasets, items);
}

export function renderLegend(datasets, items) {
  const el = document.getElementById('chart-legend');
  el.innerHTML = '';

  // None / All toggle button
  const allHidden = datasets.every(ds => state.hiddenSeries.has(ds._itemRef.id || ds._itemRef.name));
  const noneBtn = document.createElement('div');
  noneBtn.className = 'legend-item legend-none';
  noneBtn.textContent = allHidden ? '◎ All' : '✕ None';
  noneBtn.title = allHidden ? 'Show all' : 'Deselect all';
  noneBtn.addEventListener('click', () => {
    if (allHidden) {
      state.hiddenSeries.clear();
    } else {
      datasets.forEach(ds => state.hiddenSeries.add(ds._itemRef.id || ds._itemRef.name));
      state.h2hPick = [];
    }
    renderChart();
  });
  el.appendChild(noneBtn);

  datasets.forEach(ds => {
    const item   = ds._itemRef;
    const id     = item.id || item.name;
    const hidden = state.hiddenSeries.has(id);
    const div    = document.createElement('div');
    div.className = 'legend-item' + (hidden ? ' muted' : '');
    const lineIndicator = ds._dashed
      ? `<svg class="legend-color" viewBox="0 0 24 4" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="2" x2="24" y2="2" stroke="${ds.borderColor}" stroke-width="2.5" stroke-dasharray="6,3"/></svg>`
      : `<svg class="legend-color" viewBox="0 0 24 4" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="2" x2="24" y2="2" stroke="${ds.borderColor}" stroke-width="2.5"/></svg>`;
    div.innerHTML = `${lineIndicator}${ds.label}`;
    div.title     = state.filter === 'h2h'
      ? (hidden ? `Select ${ds.label}` : `Deselect ${ds.label}`)
      : `Click to show/hide ${ds.label}`;
    div.addEventListener('click', () => {
      if (state.filter === 'h2h') {
        const idx = state.h2hPick.indexOf(id);
        if (idx !== -1) {
          // Deselect: hide it
          state.h2hPick.splice(idx, 1);
          state.hiddenSeries.add(id);
        } else {
          // Select: if already 2 picked, evict the oldest
          if (state.h2hPick.length >= 2) {
            const evicted = state.h2hPick.shift();
            state.hiddenSeries.add(evicted);
          }
          state.h2hPick.push(id);
          state.hiddenSeries.delete(id);
        }
      } else {
        if (state.hiddenSeries.has(id)) { state.hiddenSeries.delete(id); }
        else { state.hiddenSeries.add(id); }
      }
      renderChart();
    });
    el.appendChild(div);
  });
}
