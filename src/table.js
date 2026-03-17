import { state } from './state.js';
import { RACE_ABBR, CURRENT_YEAR } from './constants.js';
import { teamColor, fmtDate, daysUntil } from './helpers.js';
import { showDriverCareer, showConstructorCareer } from './career.js';

export function renderTable() {
  const isDrivers = state.tab === 'drivers';
  const items     = isDrivers ? state.driverData : state.ctorData;
  const leaderPts = items[0]?.total || 0;

  // Head
  const headEl = document.getElementById('table-head');
  if (isDrivers) {
    headEl.innerHTML = `<tr>
      <th style="width:40px">#</th>
      <th>Driver</th>
      <th>Team</th>
      <th style="text-align:right">Points</th>
      <th style="text-align:right">Gap</th>
      <th style="text-align:right">Wins</th>
      <th style="width:90px">Share</th>
    </tr>`;
  } else {
    headEl.innerHTML = `<tr>
      <th style="width:40px">#</th>
      <th>Constructor</th>
      <th style="text-align:right">Points</th>
      <th style="text-align:right">Gap</th>
      <th style="text-align:right">Wins</th>
      <th style="width:100px">Share</th>
    </tr>`;
  }

  // Body
  const bodyEl = document.getElementById('table-body');
  bodyEl.innerHTML = '';

  items.forEach((item, i) => {
    const pos  = i + 1;
    const gap  = pos === 1 ? '—' : `–${leaderPts - item.total}`;
    const pct  = leaderPts > 0 ? ((item.total / leaderPts) * 100).toFixed(0) : 0;
    const color = item.constructorId
      ? teamColor(item.constructorId)
      : teamColor(item.id);
    const posClass = pos === 1 ? 'p1' : pos <= 3 ? 'top3' : '';

    const tr = document.createElement('tr');

    if (isDrivers) {
      tr.className = 'clickable';
      tr.title = `View ${item.name}'s career`;
      tr.addEventListener('click', () => showDriverCareer(item.id, item.name));
    } else {
      tr.className = 'clickable';
      tr.title = `View ${item.name}'s history`;
      tr.addEventListener('click', () => showConstructorCareer(item.id, item.name));
    }

    if (isDrivers) {
      tr.innerHTML = `
        <td class="td-pos ${posClass}">${pos}</td>
        <td class="td-name">${item.name}<small>${item.abbr || ''}</small></td>
        <td class="td-team">
          <span class="team-badge">
            <span class="team-stripe" style="background:${teamColor(item.constructorId)}"></span>
            ${item.team}
          </span>
        </td>
        <td class="td-pts">${item.total}</td>
        <td class="td-gap">${gap}</td>
        <td class="td-wins">${item.wins}</td>
        <td class="td-trend">
          <div class="spark-bar">
            <div class="spark-fill" style="width:${pct}%;background:${color}"></div>
          </div>
        </td>`;
    } else {
      tr.innerHTML = `
        <td class="td-pos ${posClass}">${pos}</td>
        <td class="td-name">
          <span class="team-badge">
            <span class="team-stripe" style="background:${color}"></span>
            ${item.name}
          </span>
        </td>
        <td class="td-pts">${item.total}</td>
        <td class="td-gap">${gap}</td>
        <td class="td-wins">${item.wins}</td>
        <td class="td-trend">
          <div class="spark-bar">
            <div class="spark-fill" style="width:${pct}%;background:${color}"></div>
          </div>
        </td>`;
    }
    bodyEl.appendChild(tr);
  });
}

export function renderStats(races, schedule) {
  const drivers = state.driverData;
  const ctors   = state.ctorData;
  const n       = races.length;

  // Driver leader
  if (drivers[0]) {
    document.getElementById('stat-driver-leader').textContent =
      drivers[0].abbr || drivers[0].name.split(' ').pop();
    document.getElementById('stat-driver-leader-sub').textContent =
      `${drivers[0].team} · ${drivers[0].total} pts`;
  }

  // Constructor leader
  if (ctors[0]) {
    document.getElementById('stat-ctor-leader').textContent = ctors[0].name;
    document.getElementById('stat-ctor-leader-sub').textContent = `${ctors[0].total} pts`;
  }

  // Races
  const totalRounds = schedule.length || 24;
  const isCurrent   = state.season === CURRENT_YEAR;
  document.getElementById('stat-races').textContent     = n;
  document.getElementById('stat-races-sub').textContent =
    (n === totalRounds && !isCurrent) ? 'Season complete' : `of ${totalRounds} rounds`;

  // Last race
  const last = races[races.length - 1];
  if (last) {
    document.getElementById('stat-last-race').textContent =
      RACE_ABBR[last.raceName] ? `${RACE_ABBR[last.raceName]} GP` : last.raceName;
    const winner = last.Results?.[0];
    if (winner) {
      document.getElementById('stat-last-race-winner').textContent =
        `Won by ${winner.Driver.familyName}`;
    }
  }

  // Season progress bar
  document.getElementById('season-bar').style.width = `${(n / totalRounds) * 100}%`;

  // Next race
  const now = new Date(); now.setHours(0,0,0,0);
  const upcoming = schedule
    .filter(r => new Date(r.date) >= now)
    .sort((a,b) => new Date(a.date) - new Date(b.date));
  const next = upcoming[0];
  if (next) {
    document.getElementById('next-race-name').textContent = next.raceName.replace(' Grand Prix', ' GP');
    const days = daysUntil(next.date);
    document.getElementById('next-race-date').textContent = days
      ? `${fmtDate(next.date)} · ${days}`
      : fmtDate(next.date);
  } else {
    document.getElementById('next-race-name').textContent = 'Season complete';
    document.getElementById('next-race-date').textContent = '';
  }
}

export function renderCalendar(schedule, completedRounds) {
  const el  = document.getElementById('calendar-list');
  const now = new Date(); now.setHours(0,0,0,0);
  el.innerHTML = '';

  schedule.forEach(race => {
    const abbr    = RACE_ABBR[race.raceName] || race.raceName.slice(0,3).toUpperCase();
    const isDone  = completedRounds.has(race.round);
    const isNext  = !isDone && new Date(race.date) >= now && el.querySelector('.next') === null;
    const pill    = document.createElement('div');
    pill.className = 'race-pill' + (isDone ? ' done' : isNext ? ' next' : '');
    pill.innerHTML = `
      <div class="abbr">${abbr}</div>
      <div class="round-num">${race.round ? 'R' + race.round : '-'}</div>`;
    pill.title = `${race.raceName} · ${fmtDate(race.date)}`;
    el.appendChild(pill);
  });
}
