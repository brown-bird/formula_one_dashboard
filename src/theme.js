import { state } from './state.js';
import { renderChart } from './chart.js';
import { renderGap } from './gap.js';

export function isLightTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light';
}

export function chartColors() {
  const light = isLightTheme();
  return {
    grid:      light ? '#eceef2' : '#1e1e1e',
    ticks:     light ? '#9aa0b8' : '#666666',
    axisTitle: light ? '#9aa0b8' : '#555555',
    // High-contrast category labels and in-chart value labels
    axisLabel: light ? '#1a1a2e' : '#f0f0f0',
    valueMuted:light ? '#b0b6c6' : '#5a5a5a',
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
  if (state.gapChart) renderGap();
}

export function toggleTheme() {
  applyTheme(isLightTheme() ? 'dark' : 'light');
}
