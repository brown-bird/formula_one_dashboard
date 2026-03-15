import { state } from './state.js';
import { renderChart } from './chart.js';

export function isLightTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light';
}

export function chartColors() {
  const light = isLightTheme();
  return {
    grid:      light ? '#eceef2' : '#1e1e1e',
    ticks:     light ? '#9aa0b8' : '#666666',
    axisTitle: light ? '#9aa0b8' : '#555555',
    tooltip: {
      bg:     light ? '#ffffff' : '#111111',
      border: light ? '#d0d3da' : '#333333',
      title:  light ? '#1a1a2e' : '#ffffff',
      body:   light ? '#6b7280' : '#aaaaaa',
    },
  };
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('theme-icon').textContent = theme === 'light' ? '🌙' : '☀️';
  localStorage.setItem('f1-theme', theme);
  if (state.chart) renderChart();
}

export function toggleTheme() {
  applyTheme(isLightTheme() ? 'dark' : 'light');
}
