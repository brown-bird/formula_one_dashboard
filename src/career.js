import { state } from './state.js';
import { apiFetch } from './api.js';
import { teamColor } from './helpers.js';
import { chartColors } from './theme.js';
import { setFilter } from './ui.js';
import { renderChart } from './chart.js';
import { selectYear } from './season-selector.js';
import { setChartLoading } from './ui.js';

export async function fetchDriverCareer(driverId) {
  // Step 1: get all seasons the driver competed in
  const seasonsData = await apiFetch(`drivers/${driverId}/seasons/?limit=200&offset=0`);
  const years = seasonsData.MRData.SeasonTable.Seasons.map(s => s.season);

  // Step 2: fetch final standings for each season in parallel
  const results = await Promise.all(
    years.map(y => apiFetch(`${y}/drivers/${driverId}/driverStandings/`).catch(() => null))
  );

  return results
    .filter(r => r?.MRData?.StandingsTable?.StandingsLists?.length)
    .map(r => r.MRData.StandingsTable.StandingsLists[0])
    .filter(l => l.DriverStandings?.length)
    .sort((a, b) => parseInt(a.season) - parseInt(b.season));
}

export async function showDriverCareer(driverId, driverName) {
  state.careerDriverId = driverId;
  document.getElementById('season-view').style.display = 'none';
  const careerEl = document.getElementById('career-view');
  careerEl.style.display = '';
  // Build picker in the title slot
  document.getElementById('career-title').innerHTML = `
    <div class="ctor-picker" id="ctor-picker">
      <button class="ctor-picker-btn" id="ctor-picker-btn" onclick="toggleCtorPicker()">
        <span id="ctor-picker-label"></span>
        <span class="ctor-picker-chevron">▾</span>
      </button>
      <div class="ctor-picker-list" id="ctor-picker-list"></div>
    </div>
    <span id="career-subtitle"></span>`;

  // Populate list from current season's drivers
  const list = document.getElementById('ctor-picker-list');
  state.driverData.forEach(d => {
    const opt = document.createElement('div');
    opt.className = 'ctor-picker-option' + (d.id === driverId ? ' selected' : '');
    opt.innerHTML = `<span class="team-stripe" style="background:${teamColor(d.constructorId)}"></span>${d.name}`;
    opt.addEventListener('click', () => {
      closeCtorPicker();
      showDriverCareer(d.id, d.name);
    });
    list.appendChild(opt);
  });
  document.getElementById('ctor-picker-label').textContent = driverName;

  setChartLoading('career-chart-loader', true);

  let seasons;
  try {
    seasons = await fetchDriverCareer(driverId);
  } catch (e) {
    setChartLoading('career-chart-loader', false);
    document.getElementById('career-subtitle').textContent = 'Failed to load career data.';
    return;
  }
  setChartLoading('career-chart-loader', false);

  const years    = seasons.map(s => s.season);
  const standing = seasons.map(s => parseInt(s.DriverStandings[0].position, 10));
  const points   = seasons.map(s => parseFloat(s.DriverStandings[0].points));
  const wins     = seasons.map(s => parseInt(s.DriverStandings[0].wins, 10));
  const teams    = seasons.map(s => s.DriverStandings[0].Constructors?.[0]);

  const championships = seasons
    .filter(s => s.DriverStandings[0].position === '1')
    .map(s => s.season);

  const totalWins  = wins.reduce((a, b) => a + b, 0);
  const seasonsN   = years.length;
  document.getElementById('career-subtitle').textContent =
    `${seasonsN} season${seasonsN !== 1 ? 's' : ''} · ${totalWins} win${totalWins !== 1 ? 's' : ''}` +
    (championships.length ? ` · ${championships.length}× Champion` : '');

  // Chart
  if (state.careerChart) { state.careerChart.destroy(); state.careerChart = null; }

  const scrollEl = document.getElementById('career-scroll');
  const canvas   = document.getElementById('career-chart');
  const minW     = Math.max(scrollEl.clientWidth, years.length * 56);
  canvas.style.width  = minW + 'px';
  canvas.style.height = '340px';
  canvas.width  = minW;
  canvas.height = 340;

  const cc = chartColors();

  // Per-point styling: gold for championships, accent otherwise
  const ptColors = standing.map((_, i) => championships.includes(years[i]) ? '#ffd700' : 'var(--accent, #e10600)');
  const ptRadius = standing.map((_, i) => championships.includes(years[i]) ? 8 : 5);

  state.careerChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: years,
      datasets: [{
        label: driverName,
        data: standing,
        borderColor:          '#e10600',
        backgroundColor:      '#e1060018',
        borderWidth:          2.5,
        pointRadius:          ptRadius,
        pointHoverRadius:     8,
        pointBackgroundColor: ptColors,
        pointBorderColor:     ptColors,
        tension:              0.25,
        fill:                 false,
        spanGaps:             true,
        clip:                 false,
      }],
    },
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
            title: its => {
              const i = years.indexOf(its[0].label);
              const t = teams[i];
              return `${its[0].label}${t ? '  ·  ' + t.name : ''}${championships.includes(its[0].label) ? '  🏆' : ''}`;
            },
            label: item => {
              const i = item.dataIndex;
              return [
                ` Championship: P${item.raw}`,
                ` Points: ${points[i]}`,
                ` Wins: ${wins[i]}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          grid:  { color: cc.grid, drawBorder: false },
          ticks: { color: cc.ticks, font: { size: 11 }, maxRotation: 0 },
        },
        y: {
          grid:    { color: cc.grid, drawBorder: false },
          ticks:   { color: cc.ticks, font: { size: 11 }, stepSize: 1, callback: v => `P${v}` },
          title:   { display: true, text: 'Championship Position', color: cc.axisTitle, font: { size: 11 } },
          reverse: true,
          min:     1,
          max:     Math.max(...standing) + 1,
          clip:    false,
        },
      },
    },
  });

  // Season-by-season table
  document.getElementById('career-table-head').innerHTML = `<tr>
    <th style="width:60px">Year</th>
    <th>Team</th>
    <th style="text-align:right">Pos</th>
    <th style="text-align:right">Points</th>
    <th style="text-align:right">Wins</th>
  </tr>`;

  const tbody = document.getElementById('career-table-body');
  tbody.innerHTML = '';
  seasons.forEach((s, i) => {
    const sd   = s.DriverStandings[0];
    const team = sd.Constructors?.[0];
    const isChamp = championships.includes(s.season);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td-pos${isChamp ? ' p1' : ''}">${s.season}${isChamp ? ' 🏆' : ''}</td>
      <td class="td-team">
        ${team ? `<span class="team-badge">
          <span class="team-stripe" style="background:${teamColor(team.constructorId)}"></span>
          ${team.name}
        </span>` : '—'}
      </td>
      <td class="td-pts" style="text-align:right">P${sd.position}</td>
      <td class="td-pts" style="text-align:right">${sd.points}</td>
      <td class="td-wins" style="text-align:right">${sd.wins}</td>`;
    tr.className = 'clickable';
    tr.title = `View ${s.season} season`;
    tr.addEventListener('click', () => goToSeasonYear(s.season, 'drivers'));
    tbody.appendChild(tr);
  });
}

export async function goToSeasonYear(year, tab) {
  const y = parseInt(year, 10);
  const driverId = state.careerDriverId;
  if (y === state.season) {
    hideDriverCareer();
  } else {
    await selectYear(y);
  }
  if (tab === 'constructors') {
    const { switchTab } = await import('./ui.js');
    switchTab('constructors');
  }
  if (driverId && tab === 'drivers') {
    const items = state.driverData;
    if (items.some(item => item.id === driverId)) {
      setFilter(0, false);
      items.forEach(item => { if (item.id !== driverId) state.hiddenSeries.add(item.id); });
      renderChart();
    }
  }
}

export function hideDriverCareer() {
  if (state.careerChart) { state.careerChart.destroy(); state.careerChart = null; }
  state.careerDriverId = null;
  document.getElementById('career-view').style.display = 'none';
  document.getElementById('season-view').style.display = '';
}

export function toggleCtorPicker() {
  const list = document.getElementById('ctor-picker-list');
  const btn  = document.getElementById('ctor-picker-btn');
  if (!list) return;
  const open = list.classList.toggle('open');
  btn?.classList.toggle('open', open);
}

export function closeCtorPicker() {
  document.getElementById('ctor-picker-list')?.classList.remove('open');
  document.getElementById('ctor-picker-btn')?.classList.remove('open');
}

export async function fetchConstructorCareer(constructorId) {
  const seasonsData = await apiFetch(`constructors/${constructorId}/seasons/?limit=200&offset=0`);
  const years = seasonsData.MRData.SeasonTable.Seasons.map(s => s.season);
  const results = await Promise.all(
    years.map(y => apiFetch(`${y}/constructors/${constructorId}/constructorStandings/`).catch(() => null))
  );
  return results
    .filter(r => r?.MRData?.StandingsTable?.StandingsLists?.length)
    .map(r => r.MRData.StandingsTable.StandingsLists[0])
    .filter(l => l.ConstructorStandings?.length)
    .sort((a, b) => parseInt(a.season) - parseInt(b.season));
}

export async function showConstructorCareer(constructorId, constructorName) {
  document.getElementById('season-view').style.display = 'none';
  document.getElementById('career-view').style.display = '';
  // Build picker in the title slot
  document.getElementById('career-title').innerHTML = `
    <div class="ctor-picker" id="ctor-picker">
      <button class="ctor-picker-btn" id="ctor-picker-btn" onclick="toggleCtorPicker()">
        <span id="ctor-picker-label"></span>
        <span class="ctor-picker-chevron">▾</span>
      </button>
      <div class="ctor-picker-list" id="ctor-picker-list"></div>
    </div>
    <span id="career-subtitle"></span>`;

  // Populate list from current season's constructors
  const list = document.getElementById('ctor-picker-list');
  state.ctorData.forEach(c => {
    const opt = document.createElement('div');
    opt.className = 'ctor-picker-option' + (c.id === constructorId ? ' selected' : '');
    opt.innerHTML = `<span class="team-stripe" style="background:${teamColor(c.id)}"></span>${c.name}`;
    opt.addEventListener('click', () => {
      closeCtorPicker();
      showConstructorCareer(c.id, c.name);
    });
    list.appendChild(opt);
  });
  document.getElementById('ctor-picker-label').textContent = constructorName;

  setChartLoading('career-chart-loader', true);

  let seasons;
  try {
    seasons = await fetchConstructorCareer(constructorId);
  } catch(e) {
    setChartLoading('career-chart-loader', false);
    document.getElementById('career-subtitle').textContent = 'Failed to load constructor data.';
    return;
  }
  setChartLoading('career-chart-loader', false);

  const years    = seasons.map(s => s.season);
  const standing = seasons.map(s => parseInt(s.ConstructorStandings[0].position, 10));
  const points   = seasons.map(s => parseFloat(s.ConstructorStandings[0].points));
  const wins     = seasons.map(s => parseInt(s.ConstructorStandings[0].wins, 10));

  const championships = seasons
    .filter(s => s.ConstructorStandings[0].position === '1')
    .map(s => s.season);

  const totalWins = wins.reduce((a, b) => a + b, 0);
  document.getElementById('career-subtitle').textContent =
    `${years.length} season${years.length !== 1 ? 's' : ''} · ${totalWins} win${totalWins !== 1 ? 's' : ''}` +
    (championships.length ? ` · ${championships.length}× Champion` : '');

  if (state.careerChart) { state.careerChart.destroy(); state.careerChart = null; }

  const scrollEl = document.getElementById('career-scroll');
  const canvas   = document.getElementById('career-chart');
  const minW     = Math.max(scrollEl.clientWidth, years.length * 56);
  canvas.style.width  = minW + 'px';
  canvas.style.height = '340px';
  canvas.width  = minW;
  canvas.height = 340;

  const cc       = chartColors();
  const color    = teamColor(constructorId);
  const ptColors = standing.map((_, i) => championships.includes(years[i]) ? '#ffd700' : color);
  const ptRadius = standing.map((_, i) => championships.includes(years[i]) ? 8 : 5);

  state.careerChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: years,
      datasets: [{
        label: constructorName,
        data:  standing,
        borderColor:          color,
        backgroundColor:      color + '18',
        borderWidth:          2.5,
        pointRadius:          ptRadius,
        pointHoverRadius:     8,
        pointBackgroundColor: ptColors,
        pointBorderColor:     ptColors,
        tension:              0.25,
        fill:                 false,
        spanGaps:             true,
        clip:                 false,
      }],
    },
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
            title: its => `${its[0].label}${championships.includes(its[0].label) ? '  🏆' : ''}`,
            label: item => [
              ` Championship: P${item.raw}`,
              ` Points: ${points[item.dataIndex]}`,
              ` Wins: ${wins[item.dataIndex]}`,
            ],
          },
        },
      },
      scales: {
        x: {
          grid:  { color: cc.grid, drawBorder: false },
          ticks: { color: cc.ticks, font: { size: 11 }, maxRotation: 0 },
        },
        y: {
          grid:    { color: cc.grid, drawBorder: false },
          ticks:   { color: cc.ticks, font: { size: 11 }, stepSize: 1, callback: v => `P${v}` },
          title:   { display: true, text: 'Championship Position', color: cc.axisTitle, font: { size: 11 } },
          reverse: true,
          min:     1,
          max:     Math.max(...standing) + 1,
          clip:    false,
        },
      },
    },
  });

  document.getElementById('career-table-head').innerHTML = `<tr>
    <th style="width:60px">Year</th>
    <th style="text-align:right">Pos</th>
    <th style="text-align:right">Points</th>
    <th style="text-align:right">Wins</th>
  </tr>`;

  const tbody = document.getElementById('career-table-body');
  tbody.innerHTML = '';
  seasons.forEach((s, i) => {
    const sd = s.ConstructorStandings[0];
    const isChamp = championships.includes(s.season);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td-pos${isChamp ? ' p1' : ''}">${s.season}${isChamp ? ' 🏆' : ''}</td>
      <td class="td-pts" style="text-align:right">P${sd.position}</td>
      <td class="td-pts" style="text-align:right">${sd.points}</td>
      <td class="td-wins" style="text-align:right">${sd.wins}</td>`;
    tr.className = 'clickable';
    tr.title = `View ${s.season} season`;
    tr.addEventListener('click', () => goToSeasonYear(s.season, 'constructors'));
    tbody.appendChild(tr);
  });
}
