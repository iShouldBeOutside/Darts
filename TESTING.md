# Testing checklist — dart-night updates (2026-10-31)

Test on a phone (Pixel 6 size is the design target, 412 px wide) before
merging to main. Existing saved games and player lists are untouched by
this branch, but back up your data first if you want to be safe: the
app stores everything in the browser's localStorage.

## 1. Sound toggle + "No Score"
- [ ] Hub: bell next to the light/dark toggle. Tap it: 🔔 → 🔕, and back.
  The choice sticks when you leave and come back.
- [ ] x01 and cricket top bars have the same bell, next to ☀.
- [ ] With sound ON, finish a turn with 0 in x01 (type 0 in round mode,
  or miss all 3 darts in single/classic, then NEXT) — you should hear
  "No score" (spoken en-GB voice, unless you dropped a clip in
  `assets/0.wav` — see `assets/README.md`).
- [ ] With sound OFF (🔕), the same turn is silent.
- [ ] Cricket: a turn with only misses / dead darts, then NEXT, also
  plays it. A scoring turn does not.

## 2. x01 scoring methods (updated 2026-10-31, second round)
Open any x01 game. Name, mode buttons, and throw boxes now share ONE
row: name on the left, three small icon-only buttons in the middle
(🎯🎯🎯 ROUND, 🎯 1 DART, ▦ CLASSIC — long-press / hover for the name),
boxes on the right. No text labels, no extra row.
- [ ] First open defaults to ROUND. Switch to another method, leave the
  game, open x01 again — it defaults to the method you last used.
- [ ] ROUND: one box only. Type a visit, then the BIG NEXT button below
  locks it and moves on (there is no NEXT key on the keypad any more;
  0 is a wide key on the last row). UNDO still works. Presets above
  the keypad change as you play (they are your most-thrown visits; a
  new player sees generic ones first).
- [ ] ROUND: 179 → "NOT POSSIBLE" popup. Tap anywhere: popup closes,
  179 is still on screen, ⌫ can delete it. 180 works.
- [ ] 1 DART: three boxes again. Type one dart, then NEXT locks that
  dart and moves to the next dart slot. NEXT with nothing typed = 0
  (a miss). NEXT on the 3rd dart locks it and changes player. There
  is no ADD key any more; MISS locks a miss immediately, and presets
  still add instantly (press NEXT after a preset 3rd dart to change
  player). 23 → same popup, value kept for ⌫. 60 works, 61 does not.
- [ ] CLASSIC: the original S/D/T picker. With TRIPLE selected, BULL
  is greyed out and cannot be tapped. SINGLE/DOUBLE bull still work.
- [ ] COMMON SCORES: 8 buttons in both modes, 4 across × 2 rows,
  spanning the panel, about 50% taller and larger type than before.

## 3. Best finish (x01, single + classic only)
- [ ] At 170 with 3 darts, double-out: `OUT: T20 - T20 - DB`.
- [ ] At 120 with 3 darts: `OUT: T20 - 20 - D20`. Throw a 20: it updates
  to `OUT: T20 - D20` with 100 left and 2 darts.
- [ ] At 180 with 3 darts, double-out: no finish — it shows a leave
  (e.g. leave 40) instead of pretending 180 is finishable.
- [ ] ROUND mode also shows the finish line now (for the visit about
  to be thrown, 3 darts, current score — it does not change while
  typing, only when the visit is locked).
- [ ] At 1 with double-out: `NO FINISH`.

## 4. Players: rename / delete
- [ ] Stats → PLAYERS tab: RENAME a player (inline edit, SAVE). Past
  games show the new name. Renaming to an existing name is refused.
- [ ] DELETE a player (confirm dialog). Past games are kept, but the
  player disappears from dropdowns, leaderboards and comparisons.
- [ ] Profile page also has DELETE next to ✎ EDIT.
- [ ] Limitation: a paused game keeps the old name until it ends.

## 5. Stats: highest + head-to-head
Play at least one new x01 and one new cricket game first — old games
did not record per-visit scores, so they show "—" for highest until
you do.
- [ ] My Stats: X01 highest visit (3 darts) and cricket highest marks
  in one round.
- [ ] Leaderboard: new HIGHEST column for both game types.
- [ ] Compare (2+ players): career highest rows, plus H2H rows for
  games those players played together: H2H X01 avg PPD + highest visit,
  H2H cricket avg MPR + highest marks/round.

## 6. The O'Malley bug
- [ ] Add a player called `Sean O'Malley` (or any name with an
  apostrophe), select them in cricket, and tap the score cells — taps
  now register. x01 was never affected, and neither were names with
  spaces alone.

## Known assumptions (review these)
- A bare number in single mode counts as a double if it *can* be a
  double (even, ≤40, or 50). Round-mode finishes and openings under
  double/master in/out ask once with a Yes/No prompt instead.
- Round visits count as 3 darts for PPD.
- "Highest" in x01 = highest 3-dart visit; in cricket = most marks in
  one round. Compare "average" in shared games is weighted by
  darts/rounds, not an average of per-game averages.
- No announcer clip is shipped (licensing). The app speaks "No score"
  in en-GB until you add `assets/0.wav`.
- The other SFX in the app were already silent stubs; the bell only
  gates the No Score sound for now.
