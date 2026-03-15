# F1 Dashboard — Future Feature Ideas

Focus: data visualisation and storytelling over raw stats.

---

## Backlog

### Driver Season Comparison
In the driver career arc view, add a compare mode that lets the user overlay two of
that driver's seasons on the same chart. Scoped to the active driver only — e.g. while
viewing Lando Norris, compare his 2023 vs 2024.

- A "Compare" toggle enters compare mode
- Two year selectors appear (populated from the driver's career years)
- A "Compare" button triggers the data fetch — avoids expensive loads while the user
  is still choosing years
- Chart overlays the two seasons' cumulative points round-by-round

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
