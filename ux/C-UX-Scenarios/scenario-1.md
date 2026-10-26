# Scenario 1 — Scheduled Lab Protection
## Module M2 — Academic GPU Policy Engine

**Annex scenario:** *"System automatically denies background student jobs during scheduled lab class hours (Mon/Wed 10:00–12:00)."*
**Protagonist:** Elena Vargas — Undergraduate, Computer Vision (`CS-340-CV`, `CS-480-VLM`)
**Rule under demonstration:** `R-LAB-01` at precedence **10**
**Surfaces:** UX-1 Evaluator (RequestComposer, DecisionCard, EvidenceTrace, NextActionButton, TerminalPane)
**PRD revision:** 3 · **Catalogue:** 19 rules, precedence `−1 … 17`

---

## 1. Scenario outline

| | |
|---|---|
| **When** | Wednesday 2026-04-08, campus-local 10:04:22.331 CST (`America/Panama`, UTC−05:00) |
| **Where** | Elena's laptop, 11 a.m. between two lectures |
| **What she wants** | Submit a background batch job (nightly dataset pre-processing for her CV coursework) and have it run for ~4 hours. |
| **What she knows** | That the CS-340-CV lab is Mon/Wed 10:00–12:00. She does not know whether "lab hours" block *all* GPU work or only classroom-bound work. She has never seen the rule text. |
| **Internal tension** | She is *in* the class that owns the lab. Denying her is correct policy and feels arbitrary; not explaining it feels punitive. The experience must make both facts true at once. |
| **Resolution** | `DENY` with `R-LAB-01`, the window id, the fact path, the fact that interactive inference is exempt, and a one-click rewrite to a 22:00 request that returns `ALLOW`. |
| **Residue** | The journal row exists; the denied request can be re-evaluated later unchanged. Elena has learned the rule rather than merely hit it. |

### 1.1 Why this is the first scenario

It is the only mandatory scenario whose correct answer is a **refusal of a legitimate requester**, and the only one where the refusal is *correct on academic grounds rather than capability grounds*. It is therefore the scenario that most exposes whether the explainability claim is real.

### 1.2 What revision 3 changed in this scenario

Three things, and each of them is a correction rather than a refinement.

1. **`R-LAB-01` moved from precedence 7 to 10.** Two rows were inserted above it — `R-TIER-03` at 3 and `R-TIER-02` at 4 both moved up to reverse a dead-rule bug, and `R-FLEET-01` at 6 was split out of `R-CONTEND-01` so a failing machine is distinguishable from a busy one. The refusal Elena receives is identical; the *trace* is longer, and §3.3 is the corrected table.
2. **`priority_class` is gone from the request.** Revision 1 carried a `NORMAL|THESIS|EXAM` flag on `Request` that **no rule read** — a field that made the document look as though it had made a decision it had not made. The Composer has no priority control, and the absence is now deliberate rather than an omission.
3. **The boundary sweep has three rows it did not have, and they are the interesting ones.** `PROTECTION_GRACE = 300 s` means that for five minutes before the window the engine can already tell there is no usable time left, and the past-bound guard answers that with `ALLOW` **plus a `WINDOW_SCOPE` constraint** — not with a `CONSTRAIN` whose deadline has already passed. The sweep in §4 shows the 1-millisecond band where the guard switches. This is edge-case finding **EDGE-2** arriving in a screen.

---

## 2. [C] Conceptualise

**Layout decision.** Zones A–D of the Evaluator, Zone D **expanded by default** because a refusal is the moment the trace matters most. This is a deliberate inversion of the default (trace collapsed on `ALLOW`).

**Key elements on screen at the decision moment**

| Zone | Element | Purpose |
|---|---|---|
| A | ContextBar: actor chip `Elena Vargas · STUDENT · CS-340-CV, CS-480-VLM`; campus clock `10:04:22.331 CST −05:00` with a `stratum 2` pin; policy chip `v41` | Establishes who, when (with offset and clock quality), and under which rule version |
| B | RequestComposer, filled: `BACKGROUND_BATCH` · `CS-340-CV` · `Qwen2.5-7B-Instruct-AWQ` · `1 GPU` · `24 GB` · `240 min` | Shows what was asked, in her terms. **No priority field** — see §1.2 |
| C | DecisionCard `○ DENY` + rule chip `R-LAB-01` + cause chip `WINDOW_PROTECTED` + rationale + 3 next actions + validity strip | The hero. Never collapsed. |
| D | EvidenceTrace expanded: 19 rules, 1 matched, 11 not matched, 7 not evaluated, with the matched one expanded to its fact path | Proves it was not a coin flip |
| E | TerminalPane: the reproducible `curl` and the JSON response | Makes it copyable into an email to Dr. Reed |

**What is deliberately absent.** No modal. No toast. No "contact support" link. No red full-screen wash — a refusal is a card, not an interruption.

---

## 3. [P] Specifications

### 3.1 Request under evaluation (fixture)

```json
{
  "request_id": "8f21c0a4-1d7e-4a1b-9c33-0f5b6e2d7a10",
  "request_chain_id": null,
  "actor_ref": "u-elena-vargas",
  "workload_kind": "BACKGROUND_BATCH",
  "subject_id": "CS-340-CV",
  "model_ref": "Qwen2.5-7B-Instruct-AWQ",
  "requested_gpu_count": 1,
  "requested_vram_gb_per_gpu": 24,
  "expected_duration_min": 240,
  "exam_binding": null
}
```

**Submitted through** `POST /policy/decisions` with an `Idempotency-Key` header (`elena-8f21c0a4-r2`) and a `Bearer` session token. The session actor is authoritative: if `actor_ref` here differed from the session, `R-VALID-01` at precedence −1 would answer `DENY(ACTOR_UNKNOWN)` and the requester could not assert who they are.

### 3.2 Fact snapshot (10 registered ports)

| # | Port | Value | Age / tolerance |
|---|---|---|---|
| 10 | `campus.clock` | `2026-04-08T10:04:22.331-05:00`, `stratum 2`, no leap flag | read **first** · `FAIL_CLOSED` @ 0 s |
| 1 | `identity.v1.Identity` | `actor_id = u-elena-vargas`, `actor_kind = HUMAN` | live · `FAIL_CLOSED` @ 0 s |
| 2 | `access.v1.Access` | `role_tier = STUDENT`, `subjects = [CS-340-CV, CS-480-VLM]`, `clearance { max_gpu_count: 1, max_vram_gb: 24, unrestricted: false }` | live · `FAIL_CLOSED` @ 0 s |
| 3 | `catalog.v1.Catalog` | `Qwen2.5-7B-Instruct-AWQ` `min_vram = 9.5` `required_min_role_tier = 1` `license = APACHE-2.0` | 2 h of a 6 h admission tolerance |
| 4 | `timetable.v1.Timetable` | `WIN-4417` `CS-340-CV` kind=`LAB` `[2026-04-08T10:00:00, 2026-04-08T12:00:00)` `required_node_count = 24` | 4 s of a 60 s tolerance |
| 5 | `reservation.v1.Reservation` | no reservation-backed windows; `exam_binding` is null so `GetReservation` is not called | live · `FAIL_CLOSED` @ 0 s |
| 6 | `fleet.v1.NodeClassTable` | `ws-24gb`: `gpu_count = 1, vram_gb_per_gpu = 24` · `srv-48gb`: `gpu_count = 2, vram_gb_per_gpu = 48` | live · `FAIL_CLOSED` @ 0 s |
| 7 | `fleet.v1.Availability` | `ws-24gb`: `available_count = 6, cordoned_count = 0, failing_count = 0` · `srv-48gb`: `available_count = 0, cordoned_count = 0, failing_count = 1` | 12 s of a 60 s tolerance |
| 8 | `quota.v1.Quota` | `remaining_tokens = 184 200`, `remaining_gpu_seconds = 9 400`, `tier = STANDARD` | live · `FAIL_CLOSED` @ 0 s |
| 9 | `queue.v1.Queue` | `ws-24gb` → `qr-77c1` (opaque id; the engine never computes a duration) | display only @ 60 s |
| — | `FREEZE` (M2-owned, not a port) | none active | local read; a failure here is a `503` with no `Decision` |

> **Why the fleet is two rows and not one.** `R-TIER-01`'s hard-infeasibility `DENY` reads the **class table**, and a refusal whose only evidence may come from a 60-second-old cache is a refusal that can be wrong. `R-CONTEND-01`'s wait estimate reads the **counters**, and a 60-second-old copy of a wait estimate is exactly right. One tolerance cannot be correct for both, so the two facts have two ports. (`prd.md` FR-10; edge-case finding **EDGE-6**.)

### 3.3 Rule evaluation (all 19, in precedence order)

| P | Rule | State | Note |
|---|---|---|---|
| −1 | `R-VALID-01` | `NO_MATCH` | shape valid; `exam_binding` null; `model_ref` resolves; session actor matches `actor_ref` |
| 0 | `R-DEP-01` | `NO_MATCH` | all 10 ports within their admission tolerances; clock `stratum 2` |
| 1 | `R-FRZ-01` | `NO_MATCH` | no `ACTIVE` freeze covers the request |
| 2 | `R-FRZ-02` | `NO_MATCH` | no active freeze, so no allowance can apply |
| 3 | `R-TIER-03` | `NO_MATCH` | the request as declared **is** satisfiable, so the variant branch is not open |
| 4 | `R-TIER-02` | `NO_MATCH` | `clearance { 1, 24, unrestricted: false }` covers `1 × 24` |
| 5 | `R-TIER-01` | `NO_MATCH` | `ws-24gb` satisfies `gpu_count ≥ 1 ∧ vram_gb_per_gpu ≥ 24` |
| 6 | `R-FLEET-01` | `NO_MATCH` | `available_count = 6 > 0`, so no class is both exhausted and failing |
| 7 | `R-AUTH-02` | `NO_MATCH` | `STUDENT ≥ required_min_role_tier 1` |
| 8 | `R-AUTH-01` | `NO_MATCH` | enrolled in `CS-340-CV`; `APACHE-2.0` accepted for that subject |
| 9 | `R-LAB-02` | `NO_MATCH` | no `EXAM` window for her subjects |
| **10** | **`R-LAB-01`** | **`MATCH` → terminal** | `10:04:22.331 ∈ [10:00:00, 12:00:00)`; `kind = LAB`; `BACKGROUND_BATCH ∉ {INTERACTIVE_INFERENCE, EXAM_BOUND}`; no validated `exam_binding` |
| 11 | `R-SYS-01` | `NOT_EVALUATED` | preempted |
| 12 | `R-NIGHT-01` | `NOT_EVALUATED` | preempted — **and it would have matched**, which is why its position below `R-LAB-01` does not change the outcome here |
| 13 | `R-BOUND-01` | `NOT_EVALUATED` | preempted |
| 14 | `R-QUOTA-01` | `NOT_EVALUATED` | preempted |
| 15 | `R-QUOTA-02` | `NOT_EVALUATED` | preempted |
| 16 | `R-CONTEND-01` | `NOT_EVALUATED` | preempted |
| 17 | `R-ALLOW-01` | `NOT_EVALUATED` | preempted |

**Counts: 19 rows · 1 `MATCH` · 11 `NO_MATCH` · 7 `NOT_EVALUATED`.**

> **Why `NO_MATCH` and `NOT_EVALUATED` are different states.** An engine that evaluated all 19 and reported 18 non-matches would be *dishonest*: it implies `R-NIGHT-01` was consulted and found Elena's 10 a.m. batch outside the night window, when in fact `R-LAB-01` at precedence 10 already answered. `NOT_EVALUATED` is the trace's admission that the row was never run, and `AG-8` asserts the count as a number so that a rule cannot be quietly skipped. This is decision-log entry **L-6**, and it survives revision 3 because the failure it prevents is the reason the state exists.

> **The preemption is visible to Elena, and it should be.** Zone D does not simply grey out rows 11–17; it labels them `preempted by R-LAB-01 (precedence 10)`. A requester who reads that the night-window rule never ran learns something true and useful: moving her request to 22:00 does not merely change one answer, it moves which rules are consulted at all.

### 3.4 DecisionCard copy (verbatim)

```
○ DENY                              R-LAB-01    WINDOW_PROTECTED
                                    SCHEDULE-2026-T5 · POL-LAB

You asked to run a background batch job on 1 × 24 GB for 4 hours.

Right now CS-340-CV is in its scheduled lab session (10:00–12:00, 24 machines
reserved), and background jobs are not permitted inside a protected window.
Interactive inference is not affected — this restriction applies to background
batches, training runs, and evaluation runs only.

Why:   campus time 10:04:22.331 CST is inside WIN-4417
       [10:00:00, 12:00:00) — the window is half-open, so it closes at
       12:00:00.000 exactly.
       rule:  POL-LAB §2 (protected windows exclude BACKGROUND_BATCH,
              TRAINING, EVALUATION)
       fact:  schedule.protected_windows[WIN-4417]

What you can do:
  [ Run it at 22:00 tonight ]        ← returns ALLOW, 02:00 deadline   (primary)
  [ Run it after 12:00 today ]       ← returns ALLOW, 16:00 deadline
  [ Split: 90 min of interactive now ] ← returns ALLOW, 11:34 deadline

Evaluated 2026-04-08 10:04:22.331 CST · clock stratum 2 · policy v41
request 8f21c0a4 · decision 0192f7c4-…-7
```

**Copy laws applied:** no "denied" in the word "access"; the first sentence restates the request; the second paragraph states what is *not* affected (this is what converts a refusal into information); the mechanism block names rule + cause + document + window id; every action returns a non-`DENY` outcome when re-evaluated, and the deadline it produces is shown, so the fix is a schedule she can see rather than a promise.

**Why the card names the clock stratum.** The refusal rests on an instant, and an instant from an untrustworthy clock is not evidence. `stratum 2` on the card is one short word that makes the claim falsifiable: if the campus NTP source were to degrade, the same request would return `DENY(DEPENDENCY_UNAVAILABLE)` instead, and Elena would be told to retry rather than to change her work. (Edge-case findings **EDGE-8**, **EDGE-27**.)

### 3.5 Next actions (executable, one click, not advice)

| # | Action | Rewrites request to | Re-evaluates to | `valid_until` | Priority |
|---|---|---|---|---|---|
| 1 | Run it at 22:00 tonight | same request, `campus_now` pinned to `2026-04-08T22:00:00-05:00` on `POST /policy/decisions/preview` | `ALLOW` (`R-ALLOW-01`, precedence 17) | `2026-04-09T02:00` | **primary** |
| 2 | Run it after 12:00 today | same request, `campus_now` pinned to `2026-04-08T12:00:00-05:00` | `ALLOW` | `2026-04-08T16:00` | secondary |
| 3 | Split into 90 min of interactive inference now | `workload_kind = INTERACTIVE_INFERENCE`, `expected_duration_min = 90` | `ALLOW` | `2026-04-08T11:34:22.331` | secondary |

**Why action 1 is primary.** It preserves Elena's actual intent — a four-hour batch — whereas action 3 changes the shape of the work she wanted to do. A primary action that reshapes the requester's work is a suggestion the module has no standing to make.

**Why every action is a preview, not a commit.** All three go to `POST /policy/decisions/preview?evaluated_at_override=<instant>`, which is non-journalling, non-publishing, and gated on `role_tier ≥ INSTRUCTOR` **and** the `ALLOW_CLOCK_OVERRIDE` deployment flag. The committing route has no such parameter, and a test asserts it ignores one if sent — otherwise every `STUDENT` session would carry a walk around `R-LAB-01` and `R-NIGHT-01` and would write a forged `evaluated_at` into the journal. Elena's session is `STUDENT`, so on the integrated deployment these buttons are visible to her as **"what would happen"** and the pinning is performed by her own client, not by the server. (Edge-case finding **EDGE-10**.)

**The arithmetic behind each `valid_until`**, so the deadlines on the card are checkable:

| Action | `B` (§6.3) | `b*` | `campus_now + 240 min` | `b* − 300 s` | `bound = MIN` | `R-BOUND-01` fires? |
|---|---|---|---|---|---|---|
| 1 | `WIN-4417` is **excluded** — its `ends_at` 12:00 is not `> 22:00`. Enclosing access window contributes `06:00` next day (campus time is in `NIGHT_WINDOW` and no freeze covers the request) | `2026-04-09T06:00` | `2026-04-09T02:00` | `2026-04-09T05:55` | `02:00` | no |
| 2 | `WIN-4417` is **excluded** — `ends_at` 12:00 is not `> 12:00:00`. No enclosing access window: campus time is not in `NIGHT_WINDOW` and no freeze is active | `∅` | `2026-04-08T16:00` | `—` (`min(∅) = +∞`) | `16:00` | no |
| 3 | `WIN-4417.ends_at = 12:00` is `> 10:04:22.331`, so it is in `B`; `starts_at = 10:00` is not | `2026-04-08T12:00` | `11:34:22.331` (90 min) | `11:55:00` | `11:34:22.331` | no |

All three bounds are the request's own duration, so no `HARD_DEADLINE` constraint is emitted and the outcomes are clean `ALLOW`s. **A boundary that produces a `CONSTRAIN` would have shown a fourth card state here; §3.7 states the state and the scenario does not reach it.**

### 3.6 EvidenceTrace (Zone D, expanded)

```
▾ R-LAB-01                            precedence 10   DENY · matched
    condition   campus_now ∈ [w.starts_at, w.ends_at) for a ProtectedWindow
                with kind ∈ {LAB, CLASS} and w.subject_id ∈ actor.subject_ids
                ∧ workload_kind ∉ {INTERACTIVE_INFERENCE, EXAM_BOUND}
                ∧ no validated exam_binding matches w
  ▾ evaluation
      campus_now        2026-04-08T10:04:22.331-05:00   → in window
      window            WIN-4417  CS-340-CV  kind=LAB
      window bounds     [10:00:00.000, 12:00:00.000)    half-open
      workload_kind     BACKGROUND_BATCH                 → not exempt
      exam_binding      null                             → no exemption
  ▾ citations
      SCHEDULE-2026-T5 §WIN-4417                          resolved
      POL-LAB §2                                         resolved
▸ R-LAB-02                                              NO_MATCH  (no EXAM window)
▸ R-AUTH-01                                             NO_MATCH
▸ R-AUTH-02                                             NO_MATCH
▸ R-FLEET-01                                            NO_MATCH
▸ R-TIER-01 / 02 / 03                                   NO_MATCH
▸ R-FRZ-01 / 02                                         NO_MATCH
▸ R-VALID-01 / R-DEP-01                                 NO_MATCH
  ⋯ 7 rules NOT_EVALUATED — preempted by R-LAB-01 (precedence 10)
       R-SYS-01  R-NIGHT-01  R-BOUND-01  R-QUOTA-01
       R-QUOTA-02  R-CONTEND-01  R-ALLOW-01

  ▾ bound table  (computed in §6.1 step 3, before the walk)
      WIN-4417.starts_at   10:00:00.000   outside_horizon   (≤ campus_now)
      WIN-4417.ends_at     12:00:00.000   superseded
      10:04:22.331 + 240m  14:04:22.331   governing   (the request's own duration)
      11 rules above this row were never consulted; the bound is a property of
      the boundary set, not of the winning rule.
```

> **The bound table sits below the trace, not inside it, and it is always present — including on this `DENY`.** §6.1 step 3 computes the bound for every `ALLOW` and every `CONSTRAIN`; this decision is a `DENY`, so the bound was computed and then not consumed. Showing it anyway is a choice, and the choice is deliberate: the row that says `14:04:22.331 governing` is the same number a viewer sees in the next-action deadlines, and hiding it would make the three deadlines on the card look like they came from somewhere else. A `DENY` that shows the deadline it would have granted is also the fastest way for a requester to see that the refusal is about *when*, not *what*.

### 3.7 Validation of every state (V)

| State | Specification for this scenario |
|---|---|
| **Loading** | Port grid in ContextBar shows **10** cells; `campus.clock`, `identity` and `access` fill first, because `campus.clock` is read before the fan-out and the other two gate every authorisation rule. `catalog` fills last at 2 h of a 6 h tolerance and stays neutral; `availability` at 12 s of 60 s shows a hairline age marker. Skeleton card geometry matches the real card's line-heights. No spinner-only state. |
| **Empty** | E-COLD on first load, offering `Load S-1 example` — which is exactly the request above, pre-filled. |
| **Error — client** | E-VALIDATION if Elena types `VRAM 32`: `"must be 24 or 48; got 32"`, the segmented control snaps back to `24`, and submit stays disabled until fixed. `R-VALID-01` would also catch it server-side, but the client must not send it — the trace then records a *policy* refusal, not a typo. |
| **Error — dependency** | Not reachable by killing a port in this scenario; `scenario-4.md` §3.5 covers the `timetable` outage. Reachable by a **backward clock step**: if the campus time source regresses 2 s, `R-DEP-01` at precedence 0 answers `DENY(DEPENDENCY_UNAVAILABLE)` with `retry_after_ms = 2000` and the card offers **Retry**, not **Change your request** — because nothing about her request is wrong. The Console distinguishes the two error states by cause, not by shape, because the correct response to each is different. |
| **Success** | Rendered `DENY` card. A `DENY` is never styled as a system error: no `role="alert"`, no red wash, no "failed" copy (SA-7). |
| **`CONSTRAIN` (not reached, specified anyway)** | The card renders `◑ CONSTRAIN` with a `HARD_DEADLINE` chip reading `must checkpoint by 12:00:00`, a countdown that turns amber inside `NEAR_BOUNDARY_DISPLAY_HORIZON = 8 h`, and the note *"this job will be stopped at its deadline, not at the end of its requested duration"*. Authority is `FINAL` unless a `QUOTA_CAP` also appears, in which case the card shows `PROVISIONAL` and explains that the cap is held at commit, not at admission. |

### 3.8 Accessibility for this scenario

| Check | Result |
|---|---|
| Outcome without colour | `○ DENY` glyph + the word `DENY` + the rule chip + the cause chip; greyscale-screenshot test passes |
| Keyboard | `Tab` from composer submit → expands Zone D already; next-action buttons reachable in DOM order 1-2-3; Enter on action 1 pins the clock on the preview route and re-evaluates |
| Screen reader | Card announced as `group`, labelled `Decision: DENY, rule R-LAB-01, cause window protected`; the rationale is **not** a live region (it is static content); the preempted rules are inside a `<details>` so they are not announced on load |
| Focus not obscured | The sticky ContextBar does not overlap the rationale block at 200 % zoom |
| Time and instants | Every instant on the card is rendered with the campus offset (`-05:00`) and the half-open interval is written in full `[10:00:00, 12:00:00)`, never as "10 to 12", because a requester who reads "closes at 12:00" and submits at 11:59:59.999 has been told the wrong thing by a rounding convention |
| Motion | The bound-table highlight is a 120 ms opacity transition, suppressed under `prefers-reduced-motion`; nothing pulses, because a refusal that blinks is a refusal that nags |

---

## 4. Boundary conditions proven (NFR-4)

The same request, same facts, `campus_now` varied at 1 ms granularity. **Three** regions, and the middle one exists only because `PROTECTION_GRACE = 300 s` is a real constant rather than a comment.

| `campus_now` | `R-LAB-01` | `R-BOUND-01` | Outcome | `valid_until` | Why |
|---|---|---|---|---|---|
| `09:54:59.999` | NO_MATCH | **MATCH** | `◑ CONSTRAIN → HARD_DEADLINE` | `09:55:00.000` | 1 ms before the grace band closes, so the bound is still in the future — and 1 ms of usable time is all that is left. Honest, absurd, and correct |
| `09:55:00.000` | NO_MATCH | guard | `○ ALLOW` + `WINDOW_SCOPE` | `= campus_now` | `b* − PROTECTION_GRACE = campus_now` exactly, so the past-bound guard takes over: no time is granted inside `WIN-4417` and the constraint says so |
| `09:55:00.001` | NO_MATCH | guard | `○ ALLOW` + `WINDOW_SCOPE` | `= campus_now` | the guard is `≤`, so it holds for the whole 4 m 59.999 s of the band |
| `09:59:59.999` | NO_MATCH | guard | `○ ALLOW` + `WINDOW_SCOPE` | `= campus_now` | last instant before the window opens |
| `10:00:00.000` | **MATCH** | not evaluated | `○ DENY` | — | window is `[start, end)` — closed at the left. The laboratory is protected from its first instant, not one millisecond after |
| `11:59:59.999` | **MATCH** | not evaluated | `○ DENY` | — | 1 ms before it closes |
| `12:00:00.000` | NO_MATCH | not evaluated | `○ ALLOW` | `16:00:00.000` | window is half-open — `12:00:00.000` is *outside*, and `WIN-4417` then drops out of `B` entirely because its `ends_at` is not `> campus_now` |
| `12:00:00.001` | NO_MATCH | not evaluated | `○ ALLOW` | `16:00:00.001` | identical to the above, one ms later — proves no millisecond flapping |

**Two outcome flips** across the sweep, at the two legitimate window edges. **One constraint flip** at `09:55:00.000`, where the past-bound guard takes over from a `CONSTRAIN` that would otherwise have carried a deadline already in the past. Anything else is a bug.

This table is the executable form of NFR-4 for `R-LAB-01` plus `R-BOUND-01`, and it runs in CI as `test/scenario/sa-1.test.ts`. The `09:54:59.999` row is the one worth arguing about: an implementation that returned `CONSTRAIN` with `must_checkpoint_by` already expired would be handing a deadline to a delegate with no correct behaviour available, and the past-bound guard exists because that is exactly what revision 1 specified.

---

## 5. Traceability

| Requirement | Evidence in this file |
|---|---|
| FR-1 | §3.3 shows exactly one terminal outcome, reached by strict precedence over 19 rules |
| FR-3 | §3.3 rows 3–5 (the tier gate does not fire, and the trace says so by name) |
| FR-4 | §3.3 row 10, §3.4 copy, §3.2 fact snapshot |
| FR-8 | `Idempotency-Key` in §3.1; replaying it returns this same `decision_id` and writes no second journal row |
| FR-9 | §3.4 (rule + cause + citation + fact path), §3.6 (full trace with `MATCH`/`NO_MATCH`/`NOT_EVALUATED` and the bound table) |
| FR-10 | §3.2's per-port ages against per-port tolerances; the `fleet` split is visible in the table |
| FR-11 | The journal row for `8f21c0a4` is queryable by `(actor, subject, outcome, time)` by the Audit Ledger; see `scenario-4.md` §6 |
| FR-14 | §3.5's actions are documented API calls on the preview route; §3.6 exposes the payload in TerminalPane |
| NFR-4 | §4, including the 1 ms grace-band row |
| NFR-6 | §3.4 first sentence names the cause and the rule; the card carries both as separate chips |
| NFR-12 | Exactly one rule matched (`R-LAB-01`), and `0` constraints Elena does not need — the seven preempted rows are labelled `NOT_EVALUATED` with the preempting rule named, never shown as passed. A trace row that reads as a pass is a claim the engine did not make |
| FR-6 | §4's `08:00` and `16:00` rows are `R-BOUND-01`'s `valid_until`; the `09:55` rows are its `must_checkpoint_by`, and in both cases the two fields are the same instant, which is `M2-AD-3` |
| FR-12 | §3.6's trace header shows policy version 41 and the freeze state it was read against; `GET /policy/rules?version=40` still renders, so a request she disputes a week later is re-evaluable against the rules that answered it |
| FR-15 | No term on the deny-list appears in this file, and the two actors are named — Elena Vargas and Dr. Rebecca Reed — rather than described by role |
| FR-16 | §3.4's card contains none of `error`, `failed`, `403`, `CANNOT EVALUATE`; the refusal is a result and the reason it is worth saying so is in `EXPERIENCE.md` §1 law 1 |
| NFR-1 | `R-LAB-01` is at precedence 10 and eight rules sit above it, so a 5 ms budget is spent walking 11 of 19 rows and stopping — a test asserts the walk **does not** continue to 17 after a terminal outcome (**M2-AD-1**) |
| NFR-5 | §3.6's payload is asserted field-by-field against the allow-list: `u-elena-vargas`, no display name, no e-mail, no bearer token |
| AG-5, AG-7, AG-8 | §3.3's 19 rows each have a precedence position, a citation, and a reachability test in `planning/readiness-gate-report.md` |
| AG-9 | `R-LAB-01`'s condition is not a strict subset of any other rule's: it is the only row keyed on `kind ∈ {LAB, CLASS}` with a workload-kind carve-out, and `test/arch/ad2-subsumption.test.ts` asserts the pairwise property |
