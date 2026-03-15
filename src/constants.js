export const API          = 'https://api.jolpi.ca/ergast/f1';
export const CURRENT_YEAR = new Date().getFullYear();
export const FIRST_YEAR   = 1950;

// Known race counts for the dropdown labels (historical only)
export const SEASON_RACE_COUNTS = {
  2025: 24, 2024: 24, 2023: 22, 2022: 22, 2021: 22, 2020: 17,
  2019: 21, 2018: 21, 2017: 20, 2016: 21, 2015: 19, 2014: 19,
  2013: 19, 2012: 20, 2011: 19, 2010: 19, 2009: 17, 2008: 18,
  2007: 17, 2006: 18, 2005: 19, 2004: 18, 2003: 16, 2002: 17,
  2001: 17, 2000: 17, 1999: 16, 1998: 16, 1997: 17, 1996: 16,
  1995: 17, 1994: 16, 1993: 16, 1992: 16, 1991: 16, 1990: 16,
  1989: 16, 1988: 16, 1987: 16, 1986: 16, 1985: 16, 1984: 16,
  1983: 15, 1982: 16, 1981: 15, 1980: 14, 1979: 15, 1978: 16,
  1977: 17, 1976: 16, 1975: 14, 1974: 15, 1973: 15, 1972: 12,
  1971: 11, 1970: 13, 1969: 11, 1968: 12, 1967: 11, 1966:  9,
  1965: 10, 1964: 10, 1963: 10, 1962:  9, 1961:  8, 1960: 10,
  1959:  9, 1958: 11, 1957:  8, 1956:  8, 1955:  7, 1954:  9,
  1953:  9, 1952:  8, 1951:  8, 1950:  7,
};

// Official 2026 constructor colors
export const TEAM_COLORS = {
  mercedes:      '#27F4D2',
  ferrari:       '#E8002D',
  mclaren:       '#FF8000',
  red_bull:      '#3671C6',
  aston_martin:  '#358C75',
  alpine:        '#FF87BC',
  williams:      '#64C4FF',
  haas:          '#B6BABD',
  sauber:        '#52E252',   // Kick Sauber / Audi
  kick_sauber:   '#52E252',
  audi:          '#52E252',
  rb:            '#6692FF',   // Racing Bulls (VCARB)
  vcarb:         '#6692FF',
};

// Fallback palette for unknown teams
export const FALLBACK_COLORS = [
  '#a78bfa','#fb7185','#34d399','#fbbf24','#60a5fa',
  '#f472b6','#4ade80','#e879f9','#38bdf8','#fb923c',
];

// Race name → 3-letter abbreviation
export const RACE_ABBR = {
  'Australian Grand Prix':      'AUS',
  'Bahrain Grand Prix':         'BHR',
  'Saudi Arabian Grand Prix':   'SAU',
  'Chinese Grand Prix':         'CHN',
  'Japanese Grand Prix':        'JPN',
  'Miami Grand Prix':           'MIA',
  'Emilia Romagna Grand Prix':  'EMI',
  'Monaco Grand Prix':          'MON',
  'Canadian Grand Prix':        'CAN',
  'Spanish Grand Prix':         'ESP',
  'Austrian Grand Prix':        'AUT',
  'British Grand Prix':         'GBR',
  'Hungarian Grand Prix':       'HUN',
  'Belgian Grand Prix':         'BEL',
  'Dutch Grand Prix':           'NED',
  'Italian Grand Prix':         'ITA',
  'Madrid Grand Prix':          'MAD',
  'Singapore Grand Prix':       'SGP',
  'Azerbaijan Grand Prix':      'AZE',
  'United States Grand Prix':   'USA',
  'Mexico City Grand Prix':     'MEX',
  'São Paulo Grand Prix':       'BRA',
  'Las Vegas Grand Prix':       'LAS',
  'Qatar Grand Prix':           'QAT',
  'Abu Dhabi Grand Prix':       'ABU',
};
