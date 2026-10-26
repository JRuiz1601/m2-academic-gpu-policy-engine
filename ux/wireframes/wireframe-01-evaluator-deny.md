# WF-1 — Evaluator at the moment of a `DENY`
## Module M2 — Academic GPU Policy Engine · 1440 × 900 · dark surface

**Scenario:** S-1 (Elena, 10:04:22.331 CST, `R-LAB-01`) and S-2 (`R-TIER-02`) share this layout; only Zones B, C, and the highlighted trace rows differ.
**Design source:** `DESIGN.md` §4 (3-zone layout), `EXPERIENCE.md` §5 (UX-1), §6.1 (`DENY` banner).

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ A  │ ● Elena Vargas  STUDENT  ·  CS-340-CV, CS-480-VLM   │  🕐 10:04:22 CST −05:00  │  policy v41  │ [freeze]│
├────┴─────────────────────────────────────────────────────┴──────────────────────────┴───────────────────┤
│    │ [clock●] [id●] [access●] [timetable●] [reserv●] [class●] [avail●] [quota●] [catalog◐6h] [queue○]  10 cells │
├────┬─────────────────────────────────────────────────────────────────────────┬────────────────────────────┤
│ B  │  REQUEST                                                               │  D  EVIDENCE TRACE        │
│    │                                                                         │      ▾ R-LAB-01   DENY ●   │
│    │  workload   [ BACKGROUND_BATCH ▾ ]                                    │        condition            │
│    │  subject    [ CS-340-CV          ▾ ]                                  │          campus_now ∈ [s,e) │
│    │  model      [ Qwen2.5-7B-Instr…  ▾ ]  ⚠ 9.5 GB                      │          ∧ kind ≠ INTERACT.│
│    │  gpu        [ 1 ]  vram  ( 24 GB | 48 GB )   ← segmented, 48 unselected │          ∧ exam_binding ∤ w │
│    │  duration   [ 240 ] min                                    (no priority control — AG-10)  │        ▾ evaluation        │
│    │  binding    ( none )                                                    │            campus_now      │
│    │                                                                     │             10:04:22.331   │
│    │  ┌───────────────────────────────────────────────────────────┐         │             → in window    │
│    │  │  Evaluate                                                  │         │            window          │
│    │  └───────────────────────────────────────────────────────────┘         │             WIN-4417 LAB   │
│    │  terminal pane ▸ curl -X POST … | { }  ·  3.1 ms                       │            bounds           │
│    │                                                                         │             [10:00, 12:00)  │
│    │                                                                         │        ▾ citations         │
│    │                                                                         │            SCHEDULE-T5 §W.. │
│    │                                                                         │            POL-LAB §2        │
│    │                                                                         │      ▸ R-AUTH-01  NO_MATCH │
│    │                                                                         │      ▸ R-AUTH-02  NO_MATCH │
│    │                                                                         │      ▸ R-TIER-01/02/03  ·  │
│    │                                                                         │      ⋯ 9 NOT_EVALUATED    │
├────┴─────────────────────────────────────────────────────────────────────────┴────────────────────────────┤
│ C  ┌─── ○ DENY ────────────────────────────────────────────── R-LAB-01 ─── SCHEDULE-2026-T5 · POL-LAB ────┐  │
│    │                                                                                                       │  │
│    │  You asked to run a background batch job on 1 × 24 GB for 4 hours.                                     │  │
│    │                                                                                                       │  │
│    │  Right now CS-340-CV is in its scheduled lab session (10:00–12:00, 24 machines reserved), and          │  │
│    │  background jobs are not permitted inside a protected window. Interactive inference is not                │  │
│    │  affected — this restriction applies to background batches, training, and evaluation runs only.         │  │
│    │                                                                                                       │  │
│    │  Why:   campus time 10:04:22 CST is inside WIN-4417 [10:00:00, 12:00:00) — the window is                │  │
│    │         half-open, so it closes at 12:00:00.000 exactly.                                                │  │
│    │         rule:  POL-LAB §2          fact:  schedule.protected_windows[WIN-4417]                            │  │
│    │                                                                                                       │  │
│    │  What you can do:                                                                                      │  │
│    │    ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  [ Run it at 22:00 tonight ]  [ Run it after 12:00 today ]            │  │
│    │    ┃ Run it at 22:00 tonight  ┃  [ Split: 90 min interactive now ]                                     │  │
│    │    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛                                                                        │  │
│    │  ────────────────────────────────────────────────────────────────────────────────────────────────────  │  │
│    │  Evaluated 2026-04-08 10:04:22.331 CST · policy v41 · request 8f21c0a4      [ copy as curl ] [ JSON ] │  │
│    └───────────────────────────────────────────────────────────────────────────────────────────────────────┘  │
├────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ E  │ [ Journal ]  [ 19 rules ]  [ Freeze console ]      3 decisions · v41 · 1 constraint · 0 pending   │
└────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Annotation

| # | Element | Rule it demonstrates |
|---|---|---|
| 1 | **Ten** port cells, not six: `catalog◐6h` amber with its age, `queue○` hollow | EXPERIENCE.md law 3 — staleness is visible *before* the answer; `prd.md` FR-10's 10-row register is the grid. The hollow `queue` cell is the honest one: it is `DISPLAY_ONLY`, and showing a port the engine did not need is what distinguishes *not needed* from *not shown* |
| 2 | Campus clock carries `CST −05:00` | DESIGN.md C-1 — the time base is never ambiguous. (Revision 3 adds the stratum; at 1440 px the cell is too narrow for it and it moves to the clock's tooltip and the copyable payload, which is where a reader looks when they are actually checking) |
| 3 | VRAM is a 2-option segmented control, not free text | No invalid VRAM value can be typed (still fails safely at the API) |
| 4 | **No `priority` control** where revision 1 drew one | `prd.md` AG-10 — a control for a field no rule reads teaches Elena that `THESIS` might have mattered. Its absence is the requirement |
| 5 | `9 NOT_EVALUATED (preempted by precedence)` | Precedence short-circuit is *reported*, not hidden (scenario-1 §3.3). Revision 3 raised the count from 7 to 9 because two rules were inserted above `R-LAB-01`; the label is the point, not the number |
| 6 | Zone D expanded by default on `DENY` | The trace matters most exactly when the answer is negative |
| 7 | One primary next action, boxed; two secondary, plain | Exactly one primary per decision (DESIGN.md C-7) |
| 8 | Terminal pane sits under the composer, not in a drawer | Reproducibility is a first-class surface |
| 9 | `policy v41` in **two** places (ContextBar + card footer) | NFR-6 / FR-12 — the version is never more than one glance away |
| 10 | Footer shows `0 pending` | A version chip that can never show a nonzero pending count is decoration. Revision 1's chip read `next change pending: 0` as a constant; after a freeze publishes as v42 it reads `1`, and a reader who has seen both learns the chip is real |

### Contrast spot-check (DESIGN.md §9)

`--text-1 #E6EDF5` on `--surface-1 #111823` = 14.8:1 (AAA) for the rationale body. `--decision-deny #F85149` top rule against `--surface-1` = 4.9:1 (≥ 3:1, SC 1.4.11). The `○` glyph and the word `DENY` carry the meaning; greyscale-safe.
