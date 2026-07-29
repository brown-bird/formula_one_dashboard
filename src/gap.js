import { state } from './state.js';
import { fetchAllRaces } from './api.js';
import { teamColor } from './helpers.js';
import { chartColors } from './theme.js';
import { pushState } from './router.js';
import {
  FIRST_FASTEST_LAP_YEAR, FIRST_QUALI_YEAR,
  fmtGap, extractRaceLaps, extractQualiLaps, buildGapRows, raceLabel,
  buildSeasonGapSeries, buildSeasonGapDatasets, buildSeasonGapSummary, clampGapAxis,
} from './gap-data.js';

const $ = id => document.getElementById(id);

function setLoading(show) {
  $('gap-chart-loader')?.classList.toggle('visible', show);
  const sp = $('gap-spinner');
  if (sp) sp.style.display = show ? '' : 'none';
}

// ─── View show / hide ───

export function showGapView() {
  state.gapView = true;
  $('season-view').style.display = 'none';
  $('career-view').style.display = 'none';
  $('gap-view').style.display    = '';
  syncTabs();
  applyDefaults();
  buildSelects();
  renderGap();
  pushState();
}

export function hideGapView() {
  if (state.gapChart) { state.gapChart.destroy(); state.gapChart = null; }
  state.gapView = false;
  const view = $('gap-view');
  if (view) view.style.display = 'none';
  syncTabs();
}

function syncTabs() {
  $('tab-gap')?.classList.toggle('active', state.gapView);
  $('tab-drivers')?.classList.toggle('active', !state.gapView && state.tab === 'drivers');
  $('tab-ctors')?.classList.toggle('active', !state.gapView && state.tab === 'constructors');
}

function applyDefaults() {
  const rounds = state.rawRaces.map(r => r.round);
  if (state.gapRound !== 'all' && !rounds.includes(state.gapRound)) {
    state.gapRound = rounds.length ? rounds[rounds.length - 1] : 'all';
  }
  const teams = state.ctorData.map(c => c.id);
  if (!teams.includes(state.gapTeam)) {
    state.gapTeam = teams[0] ?? null;
  }
}

// ─── Controls ───

function buildSelects() {
  const roundSel = $('gap-round-select');
  roundSel.innerHTML =
    '<option value="all">All races (season)</option>' +
    state.rawRaces
      .map(r => `<option value="${r.round}">R${r.round} · ${raceLabel(r)}</option>`)
      .join('');
  roundSel.value = state.gapRound;

  const teamSel = $('gap-team-select');
  teamSel.innerHTML = state.ctorData
    .map(c => `<option value="${c.id}">${c.name}</option>`)
    .join('');
  teamSel.value = state.gapTeam ?? '';

  $('gap-ses-race').classList.toggle('active', state.gapSession === 'race');
  $('gap-ses-quali').classList.toggle('active', state.gapSession === 'quali');
  $('gap-grain-drivers').classList.toggle('active', state.gapGrain === 'drivers');
  $('gap-grain-teams').classList.toggle('active', state.gapGrain === 'teams');
  // Season view is constructor-only, so the grain toggle has nothing to switch
  $('gap-grain-toggle').style.display = state.gapRound === 'all' ? 'none' : '';
}

export function setGapSession(kind) {
  state.gapSession = kind;
  buildSelects();
  renderGap();
  pushState();
}

export function setGapGrain(grain) {
  state.gapGrain = grain;
  buildSelects();
  renderGap();
  pushState();
}

export function onGapRoundChange(value) {
  state.gapRound = value;
  buildSelects();
  renderGap();
  pushState();
}

export function onGapTeamChange(value) {
  state.gapTeam = value;
  buildSelects();
  renderGap();
  pushState();
}

// ─── Data ───

// Race gaps come from the season payload already in memory; qualifying needs
// one paginated fetch, cached for as long as the season stays loaded.
async function ensureGapData() {
  if (state.gapSession === 'race') return state.rawRaces;
  if (state.qualiRaces) return state.qualiRaces;
  if (state.season < FIRST_QUALI_YEAR) return (state.qualiRaces = []);
  setLoading(true);
  try {
    state.qualiRaces = await fetchAllRaces(`${state.season}/qualifying`).catch(() => []);
  } finally {
    setLoading(false);
  }
  return state.qualiRaces;
}

// True when the API simply has no timing of this kind for the era, which is a
// different story from a single round having no times recorded.
function eraUnsupported() {
  return state.gapSession === 'quali'
    ? state.season < FIRST_QUALI_YEAR
    : state.season < FIRST_FASTEST_LAP_YEAR;
}

function noDataMessage() {
  if (state.gapSession === 'quali') {
    return state.season < FIRST_QUALI_YEAR
      ? `Qualifying lap times are only available from ${FIRST_QUALI_YEAR} onward.`
      : 'No qualifying lap times are recorded for this season.';
  }
  return state.season < FIRST_FASTEST_LAP_YEAR
    ? `Fastest-lap times are only available from ${FIRST_FASTEST_LAP_YEAR} onward.`
    : 'No fastest-lap times are recorded for this season.';
}

// ─── Render ───

export async function renderGap() {
  const races = await ensureGapData();
  if (!state.gapView) return;

  const extract = state.gapSession === 'quali' ? extractQualiLaps : extractRaceLaps;
  const sessionName = state.gapSession === 'quali' ? 'Best qualifying laps' : 'Fastest race laps';

  if (state.gapRound === 'all') {
    const { labels, series, names } = buildSeasonGapSeries(races, state.gapSession);
    if (!labels.length) return renderEmpty(noDataMessage());
    setContentVisible(true);
    renderSeason(labels, series, names, sessionName);
    return;
  }

  const race = races.find(r => r.round === state.gapRound);
  const rows = race ? buildGapRows(extract(race), state.gapGrain) : [];
  if (!rows.length) {
    if (eraUnsupported()) return renderEmpty(noDataMessage());
    const scheduled = state.rawRaces.find(r => r.round === state.gapRound);
    return renderEmpty(
      scheduled
        ? `No ${state.gapSession === 'quali' ? 'qualifying' : 'lap'} times recorded for ${scheduled.raceName}.`
        : noDataMessage()
    );
  }
  setContentVisible(true);
  renderRound(rows, race, sessionName);
}

function setContentVisible(show) {
  $('gap-callout').style.display = show ? '' : 'none';
  $('gap-chart-wrap').style.display = show ? '' : 'none';
  $('gap-legend').style.display = show ? '' : 'none';
  $('gap-table-section').style.display = show ? '' : 'none';
  $('gap-empty').style.display = show ? 'none' : '';
}

function renderEmpty(msg) {
  if (state.gapChart) { state.gapChart.destroy(); state.gapChart = null; }
  setContentVisible(false);
  $('gap-empty').textContent = msg;
  $('gap-subtitle').textContent = `${state.season} season`;
}

function resetCanvas() {
  const canvas = $('gap-chart');
  canvas.style.width = '';
  canvas.style.height = '';
  return canvas;
}

// ─── Single round: horizontal bars rooted to the y axis ───

function renderRound(rows, race, sessionName) {
  const cc = chartColors();
  const sel = state.gapTeam;
  const perBar = state.gapGrain === 'drivers' ? 26 : 36;

  $('gap-subtitle').textContent =
    `${sessionName} · ${race.raceName} · round ${race.round} · ${state.season}`;

  const me = rows.find(r => r.constructorId === sel);
  const callout = $('gap-callout');
  if (me) {
    const rank = rows.indexOf(me) + 1;
    callout.innerHTML =
      `<span class="gap-callout-dot" style="background:${teamColor(sel)}"></span>` +
      `<span><strong>${me.teamName}</strong> best lap <strong>${me.time}</strong> — ` +
      (me.gap === 0 ? '<strong>fastest overall</strong> · ' : `<strong>${fmtGap(me.gap)}</strong> to the leader · `) +
      `ranked <strong>${rank} of ${rows.length}</strong>` +
      (state.gapGrain === 'drivers' ? ` (set by ${me.name})` : '') + `</span>`;
  } else {
    callout.innerHTML = `<span class="gap-callout-dot" style="background:${cc.ticks}"></span>` +
      `<span>No lap time for the selected team in this round.</span>`;
  }

  if (state.gapChart) { state.gapChart.destroy(); }

  // Size the canvas explicitly rather than leaning on `responsive` — the view
  // has only just been unhidden, so an auto-layout pass would measure a
  // container that has not settled yet and strand the bars at stale pixels.
  const scrollEl = $('gap-scroll');
  const h = Math.max(240, rows.length * perBar + 70);
  scrollEl.style.height = h + 'px';
  const canvas = resetCanvas();
  const w = scrollEl.clientWidth || 800;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width  = w;
  canvas.height = h;

  const labelColor = { on: cc.axisLabel, off: cc.valueMuted };

  state.gapChart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: rows.map(r => r.label),
      datasets: [{
        data: rows.map(r => r.gap / 1000),
        backgroundColor: rows.map(r => r.constructorId === sel ? teamColor(r.constructorId) : teamColor(r.constructorId) + '3a'),
        borderWidth: 0,
        barThickness: state.gapGrain === 'drivers' ? 14 : 20,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: false,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      layout: { padding: { right: 64 } },
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
            title: its => {
              const r = rows[its[0].dataIndex];
              return state.gapGrain === 'drivers' ? `${r.name} · ${r.teamName}` : `${r.teamName} · ${r.name}`;
            },
            label: item => {
              const r = rows[item.dataIndex];
              return [` Lap  ${r.time}`, ` Gap  ${r.gap === 0 ? 'leader' : fmtGap(r.gap)}`];
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid:  { color: cc.grid, drawBorder: false },
          title: { display: true, text: 'Seconds behind the fastest lap', color: cc.axisTitle, font: { size: 11 } },
          ticks: { color: cc.ticks, font: { size: 11 }, callback: v => `+${v.toFixed(1)}s` },
        },
        y: {
          grid:  { display: false },
          ticks: { color: cc.axisLabel, font: { size: 11, weight: 'bold' }, crossAlign: 'far' },
        },
      },
    },
    plugins: [{
      id: 'gap-values',
      afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = '600 11px "Segoe UI", system-ui, sans-serif';
        ctx.textBaseline = 'middle';
        // A zero gap draws no bar, so anchor on the scale rather than the bar
        // geometry — otherwise the label lands on top of its own axis tick.
        chart.getDatasetMeta(0).data.forEach((bar, i) => {
          const r = rows[i];
          const x = Math.max(bar.x, chart.scales.x.getPixelForValue(0));
          ctx.fillStyle = r.constructorId === sel ? labelColor.on : labelColor.off;
          ctx.fillText(r.gap === 0 ? 'leader' : fmtGap(r.gap), x + 7, bar.y);
        });
        ctx.restore();
      },
    }],
  });

  $('gap-legend').innerHTML = '';
  $('gap-table-title').textContent = sessionName;

  const isDrivers = state.gapGrain === 'drivers';
  $('gap-table-head').innerHTML =
    `<tr><th>Pos</th><th>${isDrivers ? 'Driver' : 'Constructor'}</th>` +
    `<th>${isDrivers ? 'Team' : 'Set by'}</th>` +
    `<th class="td-pts">Lap time</th><th class="td-pts">Gap</th><th class="td-gap">Interval</th></tr>`;
  $('gap-table-body').innerHTML = rows.map((r, i) => `
    <tr class="${r.constructorId === sel ? '' : 'gap-dim'}">
      <td class="td-pos ${i === 0 ? 'p1' : ''}">${i + 1}</td>
      <td class="td-name">${isDrivers ? r.name : r.teamName}</td>
      <td class="td-team"><span class="team-badge"><span class="team-stripe" style="background:${teamColor(r.constructorId)}"></span>${isDrivers ? r.teamName : r.name}</span></td>
      <td class="td-pts">${r.time}</td>
      <td class="td-pts">${r.gap === 0 ? '—' : fmtGap(r.gap)}</td>
      <td class="td-gap">${i === 0 ? '—' : fmtGap(r.interval)}</td>
    </tr>`).join('');
}

// ─── All races: line chart in the established style ───

function renderSeason(labels, series, names, sessionName) {
  const cc = chartColors();
  const sel = state.gapTeam;
  const { max, clipped } = clampGapAxis(series);

  $('gap-subtitle').textContent =
    `${sessionName} · every round · ${state.season}` +
    (clipped ? ` · y axis capped at +${max.toFixed(1)}s` : '');

  const mine = series[sel]?.filter(v => v !== null) ?? [];
  const callout = $('gap-callout');
  if (mine.length) {
    const avg  = mine.reduce((a, b) => a + b, 0) / mine.length;
    const best = Math.min(...mine);
    callout.innerHTML =
      `<span class="gap-callout-dot" style="background:${teamColor(sel)}"></span>` +
      `<span><strong>${names[sel] ?? sel}</strong> average gap <strong>+${avg.toFixed(3)}s</strong> · ` +
      `best round <strong>${labels[series[sel].indexOf(best)]}</strong> at <strong>+${best.toFixed(3)}s</strong> · ` +
      `fastest of the field in <strong>${mine.filter(v => v === 0).length}</strong> of ${mine.length} rounds</span>`;
  } else {
    callout.innerHTML = `<span class="gap-callout-dot" style="background:${cc.ticks}"></span>` +
      `<span>No lap times for the selected team this season.</span>`;
  }

  const datasets = buildSeasonGapDatasets(series, names, sel);

  if (state.gapChart) { state.gapChart.destroy(); }
  const scrollEl = $('gap-scroll');
  scrollEl.style.height = '400px';
  const canvas = resetCanvas();
  const h = scrollEl.clientHeight || 400;
  const minW = Math.max(scrollEl.clientWidth, labels.length * 52);
  canvas.style.width  = minW + 'px';
  canvas.style.height = h + 'px';
  canvas.width  = minW;
  canvas.height = h;

  state.gapChart = new Chart(canvas.getContext('2d'), {
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
          itemSort: (a, b) => a.parsed.y - b.parsed.y,
          callbacks: {
            label: item => item.raw == null ? null
              : ` ${item.dataset.label}: ${item.raw === 0 ? 'fastest' : '+' + item.raw.toFixed(3) + 's'}`,
          },
        },
      },
      scales: {
        x: {
          grid:  { color: cc.grid, drawBorder: false },
          ticks: { color: cc.ticks, font: { size: 11 }, maxRotation: 0, autoSkip: false },
        },
        y: {
          beginAtZero: true,
          max,
          grid:  { color: cc.grid, drawBorder: false },
          title: { display: true, text: 'Gap to the fastest lap of that round (s)', color: cc.axisTitle, font: { size: 11 } },
          ticks: { color: cc.ticks, font: { size: 11 }, callback: v => `+${v.toFixed(1)}s` },
        },
      },
    },
  });

  renderSeasonLegend(datasets);

  $('gap-table-title').textContent = 'Season gap summary';
  $('gap-table-head').innerHTML =
    '<tr><th>Pos</th><th>Constructor</th><th class="td-pts">Avg gap</th>' +
    '<th class="td-pts">Best</th><th class="td-pts">Worst</th><th class="td-wins">Rounds fastest</th></tr>';
  $('gap-table-body').innerHTML = buildSeasonGapSummary(series, names).map((r, i) => `
    <tr class="${r.id === sel ? '' : 'gap-dim'}">
      <td class="td-pos ${i === 0 ? 'p1' : ''}">${i + 1}</td>
      <td class="td-name"><span class="team-badge"><span class="team-stripe" style="background:${teamColor(r.id)}"></span>${r.name}</span></td>
      <td class="td-pts">+${r.avg.toFixed(3)}s</td>
      <td class="td-pts">+${r.best.toFixed(3)}s</td>
      <td class="td-pts">+${r.worst.toFixed(3)}s</td>
      <td class="td-wins">${r.fastest}</td>
    </tr>`).join('');
}

// Clicking a legend entry selects that manufacturer, same as the dropdown
function renderSeasonLegend(datasets) {
  const el = $('gap-legend');
  el.innerHTML = '';
  datasets
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label))
    .forEach(ds => {
      const div = document.createElement('div');
      div.className = 'legend-item' + (ds._selected ? '' : ' muted');
      const dash = ds._selected ? '' : ' stroke-dasharray="4,3"';
      div.innerHTML =
        `<svg class="legend-color" viewBox="0 0 24 4" xmlns="http://www.w3.org/2000/svg">` +
        `<line x1="0" y1="2" x2="24" y2="2" stroke="${teamColor(ds._teamId)}" stroke-width="${ds._selected ? 3 : 2}"${dash}/></svg>${ds.label}`;
      div.title = `Highlight ${ds.label}`;
      div.addEventListener('click', () => onGapTeamChange(ds._teamId));
      el.appendChild(div);
    });
}
