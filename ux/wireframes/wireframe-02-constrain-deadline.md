# WF-2 — `CONSTRAIN` with a live `HARD_DEADLINE` countdown
## Module M2 — Academic GPU Policy Engine · 1440 × 900

**Scenario:** S-3, evaluation E-2 — Elena's 10-hour training run, re-evaluated at `2026-04-09T02:00:00-05:00`.
**Rule:** `R-BOUND-01` at precedence 13 — the catalogue's **single** deadline producer.
**This is the module's mandatory edge case rendered.** Design source: `EXPERIENCE.md` §5, `C-UX-Scenarios/scenario-3.md` §3.

> **What changed in revision 3, and why the numbers moved.** This wireframe previously drew a binding deadline of `08:55` (the 09:00 lab minus grace) with the overnight window's `06:00` struck through as "earlier, not binding". That was **arithmetically false** and it was the exact error finding `UX-S3-04` was raised for: `06:00` precedes `09:00`, so at 02:00 the *earliest* boundary is the overnight window and the binding deadline is `05:55`. The class is a backstop, not the constraint. The trace panel is now a **bound table** in which the highlighted row *is* the minimum, which cannot disagree with itself — that was the fix for `UX-S3-03`, and drawing it any other way would reintroduce the bug the fix was chosen to prevent. `scenario-3.md` E-4 carries the case where the lab bound is the one that governs, and it does.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ A  │ ● Elena Vargas  STUDENT  ·  CS-340-CV                 │  🕐 02:00:00 CST −05:00  │  policy v41 │  ⏱ 03:55:00 │  │
│    │                                                   ↑ pinned constraint strip — survives tab switches  │
├────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────┤  │
│    │ 10 ports  clock ●  identity ●  access ●  timetable ●  reservations ●  class table ●                  │  │
│    │           availability ●  quota ●  catalog ●  queue ○        ·  CLOCK RE-EVALUATING (240 ms)         │  │
├────┬─────────────────────────────────────────────────────────────────────────┬────────────────────────────┤  │
│ B  │  REQUEST   (previous decision still visible at 40% opacity behind)       │  D  EVIDENCE TRACE        │  │
│    │                                                                         │      ▾ R-BOUND-01        │  │
│    │  TRAINING · CS-340-CV · Qwen2.5-7B-Instruct                             │        precedence 13      │  │
│    │  1 × 24 GB · 600 min                                                    │      ▾ bound table       │  │
│    │  ⚠ requested end 12:00 → inside WIN-4418 [09:00, 12:00)                   │          night  06:00:00  │  │
│    │  [ Evaluate ]                                                            │            → 05:55:00    │  │
│    │                                                                         │            ● GOVERNING   │  │
│    │                                                                         │          lab    09:00:00  │  │
│    │                                                                         │            → 08:55:00    │  │
│    │                                                                         │            ○ superseded   │  │
│    │                                                                         │          freeze    —      │  │
│    │                                                                         │            (none)        │  │
│    │                                                                         │          own end 12:00:00│  │
│    │                                                                         │            ○ superseded   │  │
│    │                                                                         │      ▸ R-NIGHT-01  NO…   │  │
│    │                                                                         │      ▸ R-QUOTA-01 NO…    │  │
│    │                                                                         │      ⋯ 4 NOT_EVALUATED   │  │
│    │                                                                         │        (R-BOUND-01 wins  │  │
│    │                                                                         │         at precedence 13) │  │
├────┴─────────────────────────────────────────────────────────────────────────┴────────────────────────────┤  │
│ C  ┌─── ◐ CONSTRAIN ────────────────────── R-BOUND-01 ─── POL-NIGHT · POL-LAB ─────────────────────────┐  │
│    │                                                                                                       │  │
│    │  Admitted — with a hard deadline.                                                                     │  │
│    │                                                                                                       │  │
│    │  You asked for a 10-hour training run at 02:00, which would end at 12:00. It will instead stop at    │  │
│    │  05:55. Two things force that, and the earlier one is the one that binds:                             │  │
│    │                                                                                                       │  │
│    │   •  the campus overnight window closes at 06:00, and the engine stops work 5 minutes early so a   │  │
│    │      student laptop's own schedule is never taken from them (POL-NIGHT §1)                              │  │
│    │   •  your CS-340-CV lab opens at 09:00 and reserves 24 machines (SCHEDULE-2026-T5 §WIN-4418)         │  │
│    │                                                                                                       │  │
│    │  The overnight window is the one that stops you. The lab is the backstop, and it would have           │  │
│    │  stopped you two hours later.                                                                          │  │
│    │                                                                                                       │  │
│    │  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│    │  ┃ ⏱  HARD_DEADLINE            must_checkpoint_by    2026-04-09 05:55:00 CST                           ┃  │
│    │  ┃    governing boundary   NIGHT_WINDOW closes 06:00 campus-local                                    ┃  │
│    │  ┃    reason               POL-NIGHT §1  ·  owner: Dr. Rebecca Reed, Lab Director                    ┃  │
│    │  ┃    grace                300 s before the window closes (PROTECTION_GRACE)                          ┃  │
│    │  ┃    remaining            03:55:00    ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▯▯▯▯▯▯▯▯▯   ← 48% of the horizon    ┃  │
│    │  ┃    enforced by          night-scheduler → SIGTERM at the deadline, checkpoint retained             ┃  │
│    │  ┃                                                                                                   ┃  │
│    │  ┃ ○  WINDOW_SCOPE           2026-04-09 08:55:00 CST   lab opens 09:00 — superseded, not binding  ┃  │
│    │  ┃ ○  WINDOW_SCOPE           2026-04-09 12:00:00 CST   your own requested end — superseded          ┃  │
│    │  ┃                                                                                                   ┃  │
│    │  ┃ must_checkpoint_by = valid_until = 05:55:00.  One deadline, not three.                           ┃  │
│    │  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│    │       [ Accept constrained run ]   [ Split into 2 runs ]   [ Cancel ]                                  │  │
│    │  ────────────────────────────────────────────────────────────────────────────────────────────────────  │
│    │  Evaluated 2026-04-09 02:00:00.000 CST · clock stratum 2 · policy v41 · request b7e4419a            │  │
│    │  [ copy as curl ] [ JSON ]                                                                          │  │
│    └───────────────────────────────────────────────────────────────────────────────────────────────────────┘  │
├────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────┤  │
│ E  │ [ Journal ]  [ Rule catalogue ]  [ Freeze console ]        job b7e4419a · RUNNING · 1 binding deadline  │  │
└────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### The bound table is a table, and that is the whole design

`Decision.bound` is one number. The trace carries a **row per element of the boundary set `B`**, each with a `bound_role ∈ {governing, superseded, outside_horizon}` and `governing` unique (`prd.md` §5.1's bound-role invariant). The card renders the same rows the trace renders, sorted by instant, with the governing row first and the others marked.

| Why a table and not two labels | |
|---|---|
| Revision 2's version showed two rows of equal weight with the later one struck through. | A reader who missed the strikethrough read a 12:00 end time and no deadline. |
| Revision 2's *first* version showed a binding 08:55 and no 06:00 at all. | It was arithmetically false. The fix for `UX-S3-03` was applied to a card whose arithmetic was already wrong — the same failure `UX-S3-04` records, and the reason the bound set is now computed in `prd.md` §6.1 **step 3, before the rules run**, rather than discovered by whichever rule fired. |
| The table can be checked against the formula. | A reader who disagrees with 05:55 can compute `min(06:00, 09:00, 12:00) − 300 s` from the card itself. A card that asserts a number without showing the set it minimised over is an assertion, not an explanation. |

**The deadline is set whether or not a rule fires.** `must_checkpoint_by` is written by §6.1 step 3 whenever the bound is earlier than the requested end, **independent of which rule fired**. Revision 2 produced the single-producer clause inside `R-BOUND-01`'s aftermath, which left the exact-equality instant broken: `campus_now + expected_duration_min == b* − PROTECTION_GRACE` satisfies no strict-crossing predicate, so no rule matched, no deadline was emitted, and the job ran into the window the module exists to protect — with a clean, fully attributed `ALLOW` in the journal. That is edge-case finding **EDGE-3**, and it is the reason the table is a *set* rendered under a *computed* minimum rather than a rule's aftermath list.

### Annotation — the seven decisions this wireframe makes

| # | Decision | Why |
|---|---|---|
| 1 | The countdown lives in **Zone A**, not only in the card | A constraint that is invisible when you navigate to the Journal is not a constraint. The strip persists for the session. |
| 2 | The superseded rows are **listed and labelled**, not deleted | Deleting them was revision 2's implicit answer and it is the reason the arithmetic went unchecked. Elena can see that the lab would have stopped her at 08:55 and that the night policy stopped her first — which is a distinction she can act on, because the two have different owners. |
| 3 | Each constraint names its **enforcing component** and its **owner** | A deadline nobody enforces is a lie. `night-scheduler → SIGTERM` is the contract (`M2-AD-3` for the single deadline, `M2-AD-5` for the enforcement delegation). The owner line is new: the constraint she can appeal is `POL-NIGHT §1`, and its owner is Dr. Rebecca Reed — a name, not a role. |
| 4 | The Zone B composer shows the *conflict* before the result | `⚠ requested end 12:00 → inside WIN-4418` is a pre-flight warning, computed by the same `POST /policy/decisions/preview` call the primary action uses. It is a preview, so it is not journalled and it does not consume quota. |
| 5 | On re-evaluation the previous card is **not** blanked | Zone C shows the prior decision at 40 % opacity during the 240 ms re-evaluation. Dr. Reed and Elena are here to compare two evaluations; blanking destroys the comparison. |
| 6 | The port grid shows **10 cells, one of them display-only** | The `queue` cell is hollow (`○`) because the queue estimate is display-only and the engine does not need it. Showing an unused port is not clutter; it is the reason the reader can see that nothing was silently dropped to make the answer faster. The cell for a port that is past its tolerance would be `--status-fault`, not amber — the two states are different facts and the wireframe for the healthy case must not be the one that implies they are the same |
| 7 | The **past-bound guard's** variant is specified but not drawn | If `campus_now ≥ b*`, the same card renders `ALLOW` with `valid_until = campus_now` and a `WINDOW_SCOPE` constraint instead of a `HARD_DEADLINE` one. Drawing only the `CONSTRAIN` variant would leave the reader with a wireframe that shows a deadline in the past whenever they arrive during the 4 min 59.999 s grace band (`scenario-1.md` §4, **EDGE-2**) |

### The countdown's colour changes, and only one thing triggers it

The countdown row turns amber when the remaining time falls inside `NEAR_BOUNDARY_DISPLAY_HORIZON = 8 h`. That constant was previously a **rule input** (`GRACE_HORIZON`, consumed by `R-GRACE-01`), and moving it to a rendering threshold is what allowed three rules to merge into one (`prd.md` §6.2.1 item 4, decision-log **L-4**). A display constant in a rule condition is a policy change disguised as a style decision; the corollary is that this wireframe's amber state has **no effect on any outcome**, and a test asserts that the same request at the same instant returns the same `Decision` with the display horizon set to 1 h or to 72 h.

### Violated-deadline variant (not drawn — specified)

If the job is still `RUNNING` 60 s past `must_checkpoint_by`, the deadline row switches to `--status-fault` with the `⚠` glyph and this copy:

```
⏱  DEADLINE PASSED — no signal from night-scheduler within 60 s
    this is a policy violation attributable to job b7e4419a, not to your request
    [ Copy diagnostics ]   [ Open night-scheduler status ]
```

Two distinct faults must be copy-distinguishable (finding `UX-S3-04`): *no signal from the delegate* vs. *bridge confirmed the job is still running*. They have different owners, and merging them sends Elena to the wrong desk.

### The deadline row has four states, and one of them must never render

`upcoming` (this wireframe) · `near` (inside `NEAR_BOUNDARY_DISPLAY_HORIZON = 8 h`, amber) · `passed` (the box above) · `expired` (a fourth state this document previously could not draw) · and one state that must **not** exist.

**`must_checkpoint_by` null ⇒ the row is not rendered at all.** Every `ALLOW` whose bound falls later than the requested end has no deadline, and revision 1 drew an empty `HARD_DEADLINE` frame with a live countdown counting toward nothing. A constraint row with no value claims the engine is watching a deadline that does not exist, which is the reason `SA-3` requires a constraint to name its **value** and not only its kind.

**`expired` is not `passed`, and the difference is load-bearing.** If `campus_now` is more than 24 h past `must_checkpoint_by` and the surface was never re-evaluated — a laptop closed overnight — the row reads `expired` with different copy: *this run's deadline was 2026-04-09 05:55:00. The session was not open when it passed, so whether the job stopped is a question for `night-scheduler`, not for this page.* The distinction is **the engine's belief** (a deadline was recorded and is now past) versus **the fleet's state** (what happened to a process), and merging them produces a page that asserts a job was killed on the strength of a timestamp. A test drives the 24 h gap; `EXPERIENCE.md` §4.2's `E-NOT-YET` is its sibling on the journal side.

### Greyscale check

`◐ CONSTRAIN` (amber) and the `○` superseded markers are distinguishable in greyscale by glyph, label, and the words "superseded, not binding". The governing row is distinguished by the `●` glyph, its position first in the table, and the explicit `must_checkpoint_by = valid_until = 05:55:00` line — three redundant encodings, because this is the one number in the module that a misreading of would put a student in a room at 06:05. No information in this wireframe depends on hue.
