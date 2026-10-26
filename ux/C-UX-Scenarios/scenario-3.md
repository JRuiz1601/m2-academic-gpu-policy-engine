# Scenario 3 — Overnight Grace Policy
## Module M2 — Academic GPU Policy Engine

**Annex scenario:** *"System permits low-priority batch training after 22:00 provided no scheduled morning classes are pending."*
**Mandatory edge case proven here:** *"Clock rollover / boundary edge conditions where an active job approved under night policy extends into a protected morning class window."*
**Protagonist:** Elena Vargas — Undergraduate, Computer Vision
**Rules under demonstration:** `R-NIGHT-01` (precedence 12) → `NO_MATCH` inside the window; `R-BOUND-01` (precedence 13) → `CONSTRAIN`; `R-ALLOW-01` (precedence 17) → `ALLOW` for the short run
**Surfaces:** UX-1 Evaluator (DecisionCard `ALLOW`, then the same request re-evaluated at four different clock positions into `CONSTRAIN`), UX-2 RuleCatalogue

---

## 1. Scenario outline

| | |
|---|---|
| **When** | Tuesday 2026-04-08 22:10:44.900 CST, carried forward through Wednesday morning. The `CS-340-CV` lab for Wednesday is published in the timetable and opens at 09:00. |
| **What she wants** | A long LoRA fine-tune of `Qwen2.5-7B` on her thesis dataset — the one job that needs a whole night and cannot be squeezed into an afternoon. |
| **What she believes** | That the night window is hers until 06:00 and that the 09:00 lab is somebody else's problem. It is not: 06:00 is the hard stop, and 09:00 is the *next* protection, and the difference between those two facts is the whole scenario. |
| **Internal tension** | This is where a naive engine is **dangerous rather than merely unhelpful**. An `ALLOW` is a promise. If the engine issues an open-ended one at 22:10 to a job that will still be running when 24 machines must be free for a class, the class is disrupted and the audit record says the engine permitted it. There is no error message for that failure; it is a *silence*. |
| **Resolution** | `CONSTRAIN` with `must_checkpoint_by = valid_until = 05:55` and a named enforcing delegate, the requester shown that the **overnight window** is the binding bound and the 09:00 lab bound is superseded. |
| **Residue** | A live countdown pinned in the ContextBar for the session, and a `governing / superseded` bound table on the card so Elena knows which protection to appeal. |

### 1.1 The experience law this scenario exists to prove

> **No `ALLOW` is open-ended, and no decision names two deadlines.** Every admission carries exactly one instant at which authority lapses. If the job's own completion is earlier, that earlier instant wins. If a protection boundary is earlier, the boundary wins minus a 5-minute grace, and every *other* boundary is still shown — struck through and labelled — so the requester can see the full field and appeal the right one.

The second half of that sentence is the part a naive implementation drops. Showing only the binding deadline is tidier and worse: a student told "stop at 05:55" and given no reason concludes the university simply does not like overnight work, when in fact a *specific* policy — the overnight training window, `POL-NIGHT §1` — is what ends her run, and that policy has an owner who can be asked to extend it. Naming the superseded bound is what turns a constraint into an appeal.

---

## 2. [C] Conceptualise

**Layout.** The Evaluator, with the DecisionCard in `CONSTRAIN` composition and the **bound table** as the visual centre of Zone C. The countdown is duplicated in a slim strip in Zone A (ContextBar) for the rest of the session, so it survives navigating to the Journal or the Rule Catalogue and coming back.

**The four evaluations shown** (one request, four moments — this is the pedagogical core of the scenario):

| # | Evaluated at | `workload_kind` | `expected_duration_min` | Primary rule | Outcome | `valid_until` |
|---|---|---|---|---|---|---|
| **E-1** | Tue 22:10:44.900 | `TRAINING` | 360 | `R-ALLOW-01` | `ALLOW` | **04:10** (her own completion) |
| **E-2** | Wed 02:00:00.000 | `EVALUATION` | 600 | `R-BOUND-01` | `CONSTRAIN` | **05:55** (overnight end governs; 08:55 lab bound superseded) |
| **E-3** | Wed 05:00:00.000 | `EVALUATION` | 30 | `R-ALLOW-01` | `ALLOW` | **05:30** (her own completion) |
| **E-4** | Wed 08:00:00.000 | `EVALUATION` | 300 | `R-BOUND-01` | `CONSTRAIN` | **08:55** (the lab bound governs) |

E-1 and E-3 are what make E-2 and E-4 legible: a job that *fits* is `ALLOW` with a clean `valid_until` equal to its own completion. The four together show the rule is not "batch jobs are banned at night" — it is **"every admission ends at the earliest of its own completion and every protection that exists."**

**E-2 is the annex's mandatory edge case.** E-4 is the case the annex's wording implies but a first implementation gets backwards, and §5 (`UX-S3-05`) explains why.

---

## 3. [P] Specifications

### 3.1 Requests (fixtures)

```jsonc
// E-1 — her actual submission, Tuesday night
{ "request_id": "b7e4419a-…", "actor_ref": "u-elena-vargas",
  "workload_kind": "TRAINING", "subject_id": "CS-340-CV",
  "model_ref": "Qwen2.5-7B-Instruct", "requested_gpu_count": 1,
  "requested_vram_gb_per_gpu": 24, "expected_duration_min": 360,
  "exam_binding": null }

// E-2 / E-3 / E-4 — re-evaluations of the same request_chain_id at later clock positions.
// E-2 and E-3 use EVALUATION because a TRAINING request at 08:00 is denied by
// R-NIGHT-01 (precedence 12) before any bounding rule is reached. That ordering
// is the reason the morning-lab case is expressed as an evaluation run rather
// than a training run, and it is a real constraint, not a convenience.
{ "request_id": "b7e4419a-…", "workload_kind": "EVALUATION",
  "expected_duration_min": 600 }   // E-2
{ "workload_kind": "EVALUATION", "expected_duration_min": 30  }   // E-3
{ "workload_kind": "EVALUATION", "expected_duration_min": 300 }   // E-4
```

### 3.2 Fact snapshot (shared by all four evaluations)

| Port | Value |
|---|---|
| `clock` | E-1 `2026-04-08T22:10:44.900-05:00` · E-2 `2026-04-09T02:00:00.000-05:00` · E-3 `05:00:00.000` · E-4 `08:00:00.000` |
| `Timetable` | `WIN-4418` `CS-340-CV` kind=`LAB` `[2026-04-09T09:00, 2026-04-09T12:00)` `required_node_count=24` `source=TIMETABLE` |
| `Reservation` | none |
| `freeze` | none |
| `Bridge` | `ws-24gb` `gpu_count=1, vram_gb_per_gpu=24, available=29, cordoned=2, failing=0` |
| `Quota` | `remaining_gpu_seconds = 26 400` (7 h 20 m) |
| `Access` | `role_tier=STUDENT`, `subjects=[CS-340-CV, CS-480-VLM]`, `max_vram_gb=24` |

Quota is deliberately **not** the binding constraint: the scenario must show that temporal protection is an independent constraint and not a quota side-effect. Had quota been the limiter, the scenario would prove nothing about the night rule.

### 3.3 The boundary set `B` and the bound — the arithmetic, shown

`B` is built per §6.3 of the PRD: the start and end of every protected window the actor is enrolled in and that has not already ended, the start of every future freeze, and the end of the enclosing access window. `b* = min{ b ∈ B : b > campus_now }`, and `bound = MIN(campus_now + expected_duration_min, b* − 300 s)`.

| | E-1 · 22:10:44.900 | E-2 · 02:00:00.000 | E-3 · 05:00:00.000 | E-4 · 08:00:00.000 |
|---|---|---|---|---|
| Enclosing access window | night `[22:00, 06:00)` | night | night | **none** (08:00 is outside) |
| `B` | `{06:00, 09:00, 12:00}` | `{06:00, 09:00, 12:00}` | `{06:00, 09:00, 12:00}` | `{09:00, 12:00}` |
| `b*` | `06:00` | `06:00` | `06:00` | `09:00` |
| `b* − 300 s` | 05:55 | 05:55 | 05:55 | **08:55** |
| Own completion | **04:10** | 12:00 | **05:30** | 13:00 |
| `bound = MIN(...)` | **04:10** | **05:55** | **05:30** | **08:55** |
| `R-BOUND-01` | NO_MATCH (own end < bound) | **MATCH** | NO_MATCH | **MATCH** |
| Outcome | `ALLOW` / `R-ALLOW-01` | `CONSTRAIN` / `R-BOUND-01` | `ALLOW` / `R-ALLOW-01` | `CONSTRAIN` / `R-BOUND-01` |

Three things in that table are the scenario.

**First, E-1's bound is her own completion, not the window.** A 6-hour job submitted at 22:10 ends at 04:10, comfortably inside the night window. The engine reports `valid_until = 04:10` and marks the 05:55 window bound `superseded`. An implementation that hard-coded "night jobs expire at 05:55" would be *wrong* here — it would tell her to checkpoint for a deadline her job finishes two hours before, teaching her that the deadline is arbitrary.

**Second, E-2's binding bound is the overnight window, not the class.** This is the annex's mandatory edge case, and the honest answer is that the overnight window ends her run at 05:55, with the 09:00 lab bound (08:55) reported `superseded`. A scenario that claimed 08:55 here would be arithmetically false, because 06:00 precedes 09:00. The card therefore has to name the *overnight policy* as the constraint and the class as the backstop. See §5, finding `UX-S3-04`, which is where the original draft of this file got this wrong.

**Third, E-4 is the only case where the lab bound governs**, and it needs a workload kind outside `R-NIGHT-01`'s set. A `TRAINING` request at 08:00 is denied outright, so the morning-lab case is expressed as an `EVALUATION` run. That is not a workaround to make a test pass; it is the actual shape of the policy — background training is night-only, and an evaluation run that would overrun a class session gets a deadline instead of a denial.

### 3.4 E-1 — the 22:10 submission (verbatim card)

```
● ALLOW                                       R-ALLOW-01    POL-NIGHT · POL-TIER
admission: ADMITTED · authority: FINAL

Admitted. Your run ends when you said it would.

  ⧗ valid_until            2026-04-09 04:10:00 CST
    reason                 your declared duration: 22:10:44.900 + 6 h
    next protection        WIN-4418  CS-340-CV lab opens 09:00  → 08:55  (not binding)
    overnight window       POL-NIGHT §1 ends 06:00              → 05:55  (not binding)
    enforced by            night-scheduler (re-checks at each boundary)

  [ Start now ]   [ Extend to 8 h — would be cut off at 05:55 ]

You asked for 6 hours and there is no protection in the way, so this runs to
completion. If you extend it past 05:55 you will still be cut off — see the
counter above.
```

The two `not binding` lines are not decoration. They are the same `bound_role` field the trace already carries (PRD §5.1, `bound_role ∈ {governing, superseded, outside_horizon}`), and rendering them costs one loop over `B`. They buy the requester the ability to predict the consequence of the action she is about to take, which is the difference between a decision and an oracle.

### 3.5 E-2 — the mandatory edge case (verbatim card)

```
○ … ◐ CONSTRAIN                              R-BOUND-01    POL-NIGHT · POL-LAB
admission: ADMITTED · authority: FINAL

Admitted — with a hard deadline.

  Your 10-hour evaluation would end at 12:00. You will be checkpointed and
  stopped at 05:55 instead.

  ⏱ HARD_DEADLINE       must_checkpoint_by   2026-04-09 05:55:00 CST
    same instant as     valid_until          2026-04-09 05:55:00 CST
    enforced by         night-scheduler → SIGTERM at the deadline, checkpoint retained
    violation reportable to  job b7e4419a, not to your request

  Why 05:55 and not 08:55:

    05:55   overnight training window ends 06:00  −  5 min grace     ← GOVERNS
            (POL-NIGHT §1)
    08:55   WIN-4418 CS-340-CV lab opens 09:00  −  5 min grace     (superseded)
            (SCHEDULE-2026-T5 §WIN-4418)
    12:00   your declared end                                     (superseded)

  If a longer run matters, the binding limit is the overnight window, not
  the class. Dr. Rebecca Reed owns POL-NIGHT — an extension request goes
  to her, not to the lab scheduler.

  [ Accept constrained run ]   [ Split into 2 runs ]   [ Request a window extension ]
```

This is the module's most important single artefact. Three properties, each of which a simpler card would lose:

1. **One instant, shown once.** `must_checkpoint_by` and `valid_until` are the same value because the engine guarantees they are (PRD §5.1, single-deadline invariant; FR-7 clause 4). An earlier draft of this scenario rendered them as two equal-weight rows and then asserted that 08:55 governed a pair whose minimum was 05:55 — a card that was wrong about arithmetic while trying to be helpful. The bound table replaces it and cannot be wrong, because the highlighted row *is* the minimum.
2. **The governing bound is named and owned.** `POL-NIGHT §1` is a policy with an owner. Elena can act on it. "The system" cannot be appealed.
3. **The superseded bound is still shown.** If Elena believes the 09:00 lab is the problem, the card tells her it is not, in the same breath as telling her what is. An engineer debugging this at 03:00 learns the same thing.

### 3.6 E-4 — the morning-lab case (verbatim card, abbreviated)

```
○ … ◐ CONSTRAIN                              R-BOUND-01    POL-LAB
admission: ADMITTED · authority: FINAL

Admitted — with a hard deadline.

  Your 5-hour evaluation would end at 13:00, inside the CS-340-CV lab
  session. You will be checkpointed and stopped 5 minutes before the lab
  opens so the class gets 24 clean nodes.

  ⏱ HARD_DEADLINE       must_checkpoint_by = valid_until   2026-04-09 08:55:00 CST
    enforced by         night-scheduler → SIGTERM at the deadline, checkpoint retained
    reason              WIN-4418 CS-340-CV lab opens 09:00, required_node_count = 24
                        (SCHEDULE-2026-T5 §WIN-4418)  −  5 min grace  (POL-LAB §4)

  Your own declared end (13:00) and the lab's end (12:00 → 11:55) are both
  later than this and are not binding.

  [ Accept constrained run ]   [ Resize to 3 h so it finishes on its own ]
```

`required_node_count = 24` appears in the copy because it is the reason the window exists: 24 of the 31 workstations are spoken for, and a 5-machine shortfall is a class that cannot run. A deadline whose reason the requester cannot evaluate is a deadline she will ignore.

### 3.7 Validation of every state (V)

| State | Specification |
|---|---|
| **Loading** | Unusual and specified: when the console re-evaluates because the clock override moved, Zone C shows a **skeleton with the previous decision still visible at 40 % opacity** and a `RE-EVALUATING` chip. Blanking the card would destroy the comparison the reader is here to make — the comparison of the two bound tables is the entire point of the four evaluations. |
| **Empty** | Not reached on the Evaluator. Reached on the Journal with E-FILTERED: Elena filters to `outcome=CONSTRAIN ∧ subject=CS-340-CV ∧ since=24h` and gets 4 rows — the same `request_chain_id` evaluated at four clock positions, which is itself a teaching moment because the same request appears with four different `evaluated_at` values and four different bounds. |
| **Error** | The `HARD_DEADLINE` **violation** state, specified because it is the one that matters: if the job is still `RUNNING` 60 s past `must_checkpoint_by`, the constraint row turns `--status-fault`, the glyph changes to `⚠`, and the copy reads: `Deadline passed — the enforcing component did not signal within 60 s. This is a policy violation attributable to job b7e4419a, not to your request.` The console distinguishes *the delegate failed to signal* from *the bridge confirmed the job is still running*; conflating them would send Elena to the wrong person. |
| **Success** | E-1 and E-3 `ALLOW` cards, E-2 and E-4 `CONSTRAIN` cards, and the pinned countdown strip in Zone A. |

### 3.8 Accessibility for this scenario

| Check | Result |
|---|---|
| 2.2.1 Timing Adjustable | The countdown never auto-dismisses, never resets, and never expires the page. A session idle past the deadline re-evaluates and announces the new outcome via `aria-live="polite"`. |
| Motion | The countdown updates once per second in text. It does not animate, pulse, or flash. A `prefers-reduced-motion` requester and a screen-reader user receive identical information. |
| 1.4.1 Use of Colour | The superseded bounds are signalled by a line-through **and** the literal word `not binding`, never by grey alone. The governing bound is signalled by the word `GOVERNS` **and** weight, never by colour. |
| 1.4.4 Resize | At 200 % the bound table reflows to a single column with the stacked rows and the relation `MIN(04:10, 05:55, 08:55) = 05:55` rendered as text, so the arithmetic survives the layout change. |
| 4.1.3 Status Messages | A deadline violation is announced once, politely, with the job id in the announcement text. A re-evaluation triggered by the clock override is announced as `Decision re-evaluated` **without** the full card being re-read, because the four-evaluation comparison depends on the reader seeing which fields changed rather than hearing the whole card again. |

---

## 4. Boundary and edge conditions proven (this is the module's mandatory edge case)

| # | Condition | Expected | Proves |
|---|---|---|---|
| EC-3.1 | `21:59:59.999` Tuesday, `TRAINING`, `actor_kind=HUMAN` | `DENY` / `R-NIGHT-01` | 1 ms before the night window opens |
| EC-3.2 | `22:00:00.000` Tuesday, `TRAINING` | not denied by `R-NIGHT-01` | half-open left edge |
| EC-3.3 | `05:59:59.999` Wednesday, `TRAINING` | not denied by `R-NIGHT-01` | 1 ms before it closes |
| EC-3.4 | `06:00:00.000` Wednesday, `TRAINING` | `DENY` / `R-NIGHT-01` | half-open right edge; the window that crosses midnight is handled by comparing local wall time, not by date arithmetic |
| **EC-3.5** | **`02:00` Wednesday, `EVALUATION`, `duration 600`, lab at 09:00** | **`CONSTRAIN` / `R-BOUND-01`, `must_checkpoint_by = valid_until = 05:55`; the 08:55 lab bound `superseded`** | **the annex's mandatory edge case** — a night-approved job whose declared end runs into a protected morning window is bounded and named, never grandfathered, and the card states *which* protection binds |
| EC-3.6 | `08:00` Wednesday, `EVALUATION`, `duration 300`, lab at 09:00 | `CONSTRAIN` / `R-BOUND-01`, `must_checkpoint_by = 08:55` | the lab bound can and does govern when it is the earliest; the 09:00 boundary is a real bound, not decoration |
| EC-3.7 | `01:00` Wednesday, `EVALUATION`, `duration 600`, **freeze** starting 03:00 **and** lab at 09:00 | `CONSTRAIN` / `R-BOUND-01`, `must_checkpoint_by = 02:55`; `B = {03:00, 06:00, 09:00, 12:00}`, three bounds `superseded` | two protections + the window end → the **earliest** governs, and all four are listed. This is the case a single-deadline implementation gets wrong by reporting the *later* bound, and a two-deadline implementation gets wrong by reporting both as binding. |
| EC-3.8 | `02:00` Wednesday, `EVALUATION`, `duration 600`, lab at 09:00, `quota.remaining = 3 h` | `CONSTRAIN` / `R-BOUND-01` with `must_checkpoint_by = 05:55`; `R-QUOTA-02` recorded `NOT_EVALUATED` and surfaced in `suppressed[]` as `quota.remaining = 10 800 s — shorter than the 03:55 → 05:55 window; raising your quota will not extend this deadline` | **two constraints do not coexist.** The strict total order allows one terminal outcome, so the earlier rule wins and the later one's fact is reported rather than applied. Elena learns that her quota ends first *and* that more quota would not help — two facts a naive engine would hide from her until 03:00 |
| EC-3.9 | Schedule correction: `WIN-4418` moved to a date in the past (`ends_at ≤ now`) | ignored, no retroactive denial; `B` omits it | NP-7 |
| EC-3.10 | `expected_duration_min = 0` or `-5` | `DENY(INVALID_REQUEST)` / `R-VALID-01` at precedence −1, before any rule runs | a zero-duration request is not a "short job", it is a malformed request |
| EC-3.11 | Freeze activated at 03:00 while the E-2 job is `RUNNING` under a `valid_until` of 05:55 | the next evaluation returns `DENY(FREEZE_ACTIVE)` / `R-FRZ-01`; the console shows the pre-freeze bound in the trace | **NP-2** — the engine holds no state and mutates nothing; the delegate preempts |
| EC-3.12 | Clock override sets `campus_now` such that a lab window spans the simulated clock's own `+1 h` | no rule flips except at the true half-open edges | NFR-4 |
| EC-3.13 | A schedule correction moves `WIN-4418.starts_at` back to `05:50`, putting `b* − 300 s = 05:45` **before** `campus_now = 05:50` | `ALLOW` with `valid_until = campus_now` and a `WINDOW_SCOPE` constraint naming the boundary and stating that no time is granted inside it — **never** a `CONSTRAIN` with an expired deadline | NP-9; also FR-7 clause 4's single-deadline invariant in its only awkward case |
| EC-3.14 | `TRAINING` request at 08:00 Wednesday, lab at 09:00 | `DENY` / `R-NIGHT-01`, `R-BOUND-01` `NOT_EVALUATED` | temporal protection outranks bounding: a request that may not run at all is never given a deadline, because a deadline implies an admission |
| EC-3.15 | `INTERACTIVE_INFERENCE` at 01:00, `duration 240`, lab at 09:00 | `ALLOW`, `valid_until = 05:00` | interactive work inside the night window is bounded by the window like everything else, and is not denied by `R-NIGHT-01` at any hour |

**EC-3.5, EC-3.6 and EC-3.7 together are the scenario's deliverable.** They are one predicate evaluated over three boundary configurations, and they prove that the engine reports the minimum without ever reporting two deadlines.

---

## 5. Triage of Phase 2 review findings

| Finding | Raised against | Decision | Reason |
|---|---|---|---|
| `UX-S3-01` — "The scenario as originally specified claims `R-GRACE-01` fires at 22:10 with a 10 h 49 m boundary, but the horizon is 8 h" | §3.3 | **ACCEPTED** | Arithmetic error in the draft. Corrected, and the correction exposed a structural gap (an `ALLOW` that can outlive the enclosing window), which became `UX-S3-02`. |
| `UX-S3-02` — "`R-STRADDLE-01` only checks declared duration, so a run admitted at 22:10 for 6 h receives no `valid_until` and can be left running past 06:00" | §3.4 | **ACCEPTED — changed the design** | The bound is now computed **before** the rules (PRD §6.1 step 3) from a single named boundary set `B`, and `valid_until` is never null. This became stronger still when reconciliation showed each rule computing its own deadline from its own boundary list could emit `must_checkpoint_by` *later* than `valid_until` (PRD finding **RC-3**), so the invariant `must_checkpoint_by = valid_until` is now asserted over 10 000 generated contexts. |
| `UX-S3-03` — "Two deadlines rendered as two equal-weight rows is ambiguous" | §3.5 | **ACCEPTED — superseded by a better answer** | The first fix was to strike through the non-binding deadline and label it. That was correct and it was not enough: the draft card then asserted that `08:55` governed a pair whose minimum was `05:55`, so the fix was applied to a card that was already arithmetically wrong. The card is now a **bound table** in which the highlighted row *is* the minimum, which cannot disagree with itself. See `UX-S3-04`. |
| `UX-S3-04` — "The scenario claims the 09:00 lab bound governs at 02:00, but 06:00 precedes 09:00" | §3.5 | **ACCEPTED — and it changed the scenario's conclusion** | The original draft of this file claimed the class window ended the run. It does not. Inside the night window the *overnight window's end* is always the earliest boundary, so the binding deadline is 05:55 and the class bound is a backstop. Rather than pick whichever number made a better story, the card now shows both, marks the governing one, and tells Elena that the constraint she can appeal is `POL-NIGHT §1` and its owner is Dr. Rebecca Reed. The annex's edge case is still proven — a night-approved job that would run into a protected morning window is bounded and named — but the answer is the true one, and the scenario became more useful in the process: it now demonstrates the difference between *being stopped by a class* and *being stopped by a night policy*, which is the distinction a student actually needs. A separate evaluation (E-4 / EC-3.6) carries the case where the lab bound is the governing one, because it is, and hiding it would have been the same error in the other direction. |
| `UX-S3-05` — *raised during PRD revision 2 reconciliation:* "The morning-lab case needs a `TRAINING` request to match the annex's wording, but `R-NIGHT-01` denies every `TRAINING` request at 08:00, so the lab bound can never govern for a training job" | §3.3, EC-3.6 | **ACCEPTED — scenario reframed, not fudged** | The review is right that the two requirements conflict, and the resolution is not to weaken `R-NIGHT-01`. Background training is night-only by policy; a training job at 08:00 is denied, and EC-3.14 now pins that behaviour explicitly. The morning-lab case is therefore expressed as an `EVALUATION` run, which the night rule does not cover, and the card says so: the requester is told *why* an evaluation can be admitted where a training job could not. Turning a policy conflict into a hidden exception would have been the easy fix and would have produced an engine whose rules no longer matched its documentation. |
| `UX-S3-06` — *raised during PRD revision 2 reconciliation:* "EC-3.8 assumed a deadline constraint and a quota cap can both apply to one decision" | §4 EC-3.8 | **ACCEPTED** | They cannot, under a strict total order with one terminal outcome, and the PRD now says so (single-producer invariant, §5.1). The resolution is a new `suppressed[]` field on `Decision` (FR-9): the suppressed rule's fact is still reported, so Elena is told her quota ends before the deadline *and* that raising it would not help. The alternative — running the catalogue to collect every matching constraint — would have broken FR-1's single-outcome guarantee and NFR-12's rule-precision target for no reader-visible gain. |

---

## 6. Traceability

| Requirement | Evidence |
|---|---|
| FR-1 | §3.3 — exactly one outcome and one `valid_until` per evaluation, four times |
| FR-5 | §3.3 (`R-NIGHT-01` at precedence 12), EC-3.1…3.4, EC-3.14 |
| FR-6 | §3.3 arithmetic table, E-1/E-2/E-3, EC-3.7, EC-3.13 |
| FR-7 | **EC-3.5 (the annex's mandatory edge case)**, EC-3.6, EC-3.7, and clause 4 (single-deadline invariant) via EC-3.13 |
| FR-9 | §3.5, §3.6, EC-3.8 (`suppressed[]`) — every constraint names kind, value, reason, and enforcing delegate, and every superseded bound is reported with its own citation |
| FR-10 | EC-3.11 — a freeze arrives mid-flight; the clock port is never stale-tolerant, so a freeze can never be applied against a stale "now" |
| NFR-3 | The four evaluations are re-run 1 000 times each; `evaluated_at = campus_now` and the bound table order is canonical |
| NFR-4 | EC-3.1…3.4, EC-3.12 |
| NFR-12 | **Exactly one rule matched in all four evaluations** — `R-NIGHT-01` in E-1, `R-BOUND-01` in E-2/E-3/E-4 — and `0` constraints the requester does not need. The superseded-bound table is *reporting*, not a second constraint; a walk continued past its terminal rule would produce nothing and cost more than the 5 ms NFR-1 budget |
| NFR-13 | Every matching rule reads only ports it declared, and each of those is `FAIL_CLOSED` or `ADMISSION_STALE_TOLERANT` with a bound: `R-NIGHT-01` and `R-BOUND-01` read `campus.clock` (0 s) and `timetable.v1.Timetable` (60 s). `R-BOUND-01` is therefore never evaluated against a timetable more than 60 seconds old, and `Timetable` being FAIL_CLOSED at 60 s means the 09:00 lab cannot be missed through a stale read (EC-3.9 covers the complementary case) |
