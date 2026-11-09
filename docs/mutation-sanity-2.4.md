# Mutation sanity audit — story 2.4 (Blindly-Green check)

Method: for each production line protected by the new tests, apply one temporary mutation, run
`npx vitest run test/unit/window-boundary.test.ts test/implementation/window-boundary.http.test.ts`,
record the result, restore the file (`git status` clean for `src/` afterwards). The runner was a throw-away script, not committed.

## Round 1 (22 tests were not yet there; 17 tests)

| # | Mutation | Result |
|---|---|---|
| 1 | `second < HARD_DEADLINE_SEC` to `<=` | survived (see note: equivalent) |
| 2 | hard deadline 06:00 to 07:00 | killed (8 failed) |
| 3 | crossing check `>` to `>=` | killed (1 failed) |
| 4 | drop the crossing check entirely | killed (2 failed) |
| 5 | warning threshold `<=` to `<` | killed (4 failed) |
| 6 | `Math.ceil` to `Math.floor` on minutes | **survived (vacuous gap)** |
| 7 | warning window 5 to 10 minutes | killed (3 failed) |
| 8 | campus offset -05:00 dropped | killed (11 failed) |
| 9 | first-class lookup ignores the day | **survived (vacuous gap)** |
| 10 | DENY rule id R-BOUND-01 to R-NIGHT-01 | killed (2 failed) |
| 11 | accept any `approved_policy` | killed (1 failed) |
| 12 | accept non-positive `extension_minutes` | killed (1 failed) |
| 13 | `advanceBy` overwrites instead of adding | killed (2 failed) |
| 14 | route path changed | killed (7 failed) |

## Corrections (AI testing mistake caught by the audit)

* Mutants 6 and 9 survived: every test used whole-minute instants, so rounding was never exercised, and the timetable
  fixture held one window, so the "same campus day" filter was never exercised. Added unit tests
  (`rounds partial minutes up`, `cites the first class of the deadline day`, `before midnight the deadline is the next morning`,
  `with no class on the deadline day`, `during the protected day`). While writing the evening test, my first expected value (+420 min from 23:00)
  ended exactly at 06:00 and would not have been denied; the expectation was wrong and was changed to +480.
* Mutant 1 is an equivalent mutant: at exactly 06:00:00, `<=` yields remaining = 0, the same as the original branch, so no test can distinguish them. Kept as is.

## Round 2 (22 tests, after the new tests)

All mutants except #1 (equivalent) killed. Raw result of the second run:
2:12 failed, 3:1 failed, 4:6 failed, 5:4 failed, 6:1 failed, 7:3 failed, 8:14 failed, 9:1 failed, 10:2 failed, 11:1 failed, 12:1 failed, 13:2 failed, 14:7 failed (of 22 tests each).
