# F1 Dashboard — Future Feature Ideas

Focus: data visualisation and storytelling over raw stats.

---

## In Progress / Planned

### Driver Career Arc
Season-by-season final standing and points visualised as a line chart over a driver's career.
The story it tells: rise, peak, decline. Championship years highlighted.
Could show teammate's standing in the same seasons as faint comparison lines.
- Entry point: clicking a driver row in the standings table
- API: `/ergast/f1/drivers/{driverId}/driverStandings`

### Season Comparison
Overlay two seasons' cumulative points progressions on the same chart.
Natural questions: "Is 2024 Verstappen's dominance comparable to 2013?"
or "How did Hamilton's 2019 vs 2020 seasons differ round-by-round?"

---

## Backlog

### Teammate Battles, All Time
For a selected driver, show their head-to-head record against every teammate they've
ever had — visualised as a horizontal bar showing the split (e.g. Hamilton beat Rosberg
8 of 12 seasons together). Story: who dominated their side of the garage across a career.

### Championship Fights
Focus on title contenders in a given season. Strip away everyone else and show the gap
between the top 2–3 drivers closing/opening over the season. A tension narrative —
did it go to the wire or was it wrapped up early?

### Team Trajectory Over Time
A constructor's finishing position in the championship across every season they've
competed, as a connected dot plot. Red Bull's rise, McLaren's fall and resurgence,
the story of a midfield team punching up.

### Driver DNA
A visual fingerprint for a driver: finishing position distribution across their career
as a dot plot or histogram — how often did they win, finish top 5, DNF. Useful for
comparing a "consistent podium" driver vs a "boom or bust" one.
