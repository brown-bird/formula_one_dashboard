import { state } from './state.js';
import { CURRENT_YEAR, FIRST_YEAR, SEASON_RACE_COUNTS } from './constants.js';
import { hideDriverCareer } from './career.js';
import { setFilter } from './ui.js';
import { loadSeason } from './main.js';

export function buildDropdown() {
  const el = document.getElementById('season-dropdown');
  el.innerHTML = '';

  // Current season at top
  el.innerHTML += `<div class="dropdown-label">Current</div>`;
  el.innerHTML += optionHTML(CURRENT_YEAR, 'In progress', state.season === CURRENT_YEAR);

  // Historical years grouped by decade in a scrollable container
  el.innerHTML += `<div class="dropdown-divider"></div>`;
  let html = '<div class="dropdown-historical">';
  let lastDecade = null;
  for (let y = CURRENT_YEAR - 1; y >= FIRST_YEAR; y--) {
    const decade = Math.floor(y / 10) * 10;
    if (decade !== lastDecade) {
      html += `<div class="dropdown-label">${decade}s</div>`;
      lastDecade = decade;
    }
    const count = SEASON_RACE_COUNTS[y];
    html += optionHTML(y, count ? `${count} races` : '', state.season === y);
  }
  html += '</div>';
  el.innerHTML += html;

  // Scroll the selected year into view after render
  requestAnimationFrame(() => {
    const sel = el.querySelector('.season-option.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  });
}

export function optionHTML(year, meta, selected) {
  return `<div class="season-option${selected ? ' selected' : ''}" onclick="selectYear(${year})">
    <span class="opt-year">${year}</span>
    <span style="display:flex;align-items:center;gap:8px">
      <span class="opt-meta">${meta}</span>
      <span class="opt-check">✓</span>
    </span>
  </div>`;
}

export function toggleDropdown() {
  state.dropdownOpen = !state.dropdownOpen;
  document.getElementById('season-dropdown').classList.toggle('open', state.dropdownOpen);
  document.getElementById('season-btn').classList.toggle('open', state.dropdownOpen);
}

export function closeDropdown() {
  state.dropdownOpen = false;
  document.getElementById('season-dropdown').classList.remove('open');
  document.getElementById('season-btn').classList.remove('open');
}

export async function selectYear(year) {
  if (year === state.season) { closeDropdown(); return; }
  closeDropdown();
  hideDriverCareer();
  state.season = year;
  state.hiddenSeries.clear();
  state.h2hPick = [];
  state.tab       = 'drivers';
  state.filter    = 5;
  state.chartMode = 'points';
  // Reset tab UI
  document.getElementById('tab-drivers').classList.add('active');
  document.getElementById('tab-ctors').classList.remove('active');
  document.getElementById('mode-toggle').style.display = '';
  document.getElementById('mode-btn-points').classList.add('active');
  document.getElementById('mode-btn-position').classList.remove('active');
  document.getElementById('chart-subtitle').textContent = 'Cumulative championship points per race';
  document.getElementById('filter-chips').querySelector('[data-n="10"]').style.display = '';
  setFilter(5, false);
  await loadSeason(year);
}

export function updateSeasonChrome(year) {
  const isCurrent = year === CURRENT_YEAR;
  // Header label + page title
  document.getElementById('btn-year').textContent     = year;
  document.getElementById('title-year').textContent   = year;
  // Historical banner
  const banner = document.getElementById('hist-banner');
  banner.style.display = isCurrent ? 'none' : 'flex';
  if (!isCurrent) {
    document.getElementById('hist-banner-text').textContent =
      `Viewing the ${year} season — complete results.`;
  }
  // Stat labels
  const driverLabel = document.querySelector('#stat-driver-leader')?.closest('.stat-body')?.querySelector('.stat-label');
  const ctorLabel   = document.querySelector('#stat-ctor-leader')?.closest('.stat-body')?.querySelector('.stat-label');
  if (driverLabel) driverLabel.textContent = isCurrent ? "Drivers' Leader"       : "Drivers' Champion";
  if (ctorLabel)   ctorLabel.textContent   = isCurrent ? "Constructors' Leader"  : "Constructors' Champion";
  // Calendar title
  document.getElementById('calendar-title').textContent =
    `${year} Race Calendar${isCurrent ? '' : ' — Complete'}`;
  // Rebuild dropdown to update selected state
  buildDropdown();
}
