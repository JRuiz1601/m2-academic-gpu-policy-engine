# Review Report — Architecture Edge Cases (Module M2: Academic GPU Policy Engine)

**Lens:** bmad-review-edge-case-hunter (method-driven path and boundary enumeration)
**Target:** `planning/ARCHITECTURE.md`
**Method:** 11 enumeration domains walked mechanically — (1) all 14 rules × 4 boundary instants; (2) the `valid_until = MIN(...)` bound formula × 6 term-degeneracies; (3) the precedence walk × 4 interaction cases; (4) 6 fact ports × 6 failure shapes; (5) 7 concurrency/idempotency races; (6) the `derived_from` chain × 3 shapes; (7) the journal × 4 ordering/serialisation cases; (8) the freeze lifecycle × 4 states; (9) 4 calendar/time-base anomalies; (10) 11 boundary/limit values; (11) every item in §10 "Explicitly Deferred Items" re-tested for reachability.
**Findings:** 35 — 10 Critical, 13 High, 10 Medium, 2 Low (numbered in document order; the summary table is severity-sorted)
**Verdict:** The architecture is unusually disciplined about the *classes* of failure it declares — fail-closed/fail-open, half-open intervals, append-only, single-writer — and several of the cases I set out to attack (zero-length and inverted windows, past windows, `expected_duration` 0/−5/4321, `requested_gpu_count` 0/9, 149 ms vs 151 ms, half-open edges at 1 ms, `STALE` at the tolerated age) are already handled and I discarded them. The unhandled mass is not at the rule boundaries; it is at the **seams between the invariants**. Four failures are structurally guaranteed by the document set rather than merely possible: (a) no rule in the catalogue produces `ALLOW`, while AD-1 mandates `DENY` on a fully-empty walk and `scenario-3` concludes `ALLOW` — so the module's single most common outcome is unattributable, untemplated, and in direct contradiction of its own core invariant; (b) the `300 s` grace lets `valid_until` be computed *earlier than `campus_now`*, and AD-3's constructor only rejects `null`, so a legal Decision with expired authority is constructible; (c) FR-7's straddle predicate compares against the raw window end, so `now + duration == boundary.starts_at` yields an admission with no `must_checkpoint_by`, and PRD §9.2 says `valid_until` is re-checked *at launch* — the exact silent collision AD-3 exists to prevent, reachable at one instant; (d) `end_of_enclosing_access_window` is a term in the module's headline formula with no definition, no fact source, and no entity in the data model. Beyond those, the authorisation surface is the weakest area in the whole design: `POST /policy/freezes` has no `403`, no role gate, and no fresh authorisation read, so a `STUDENT` can freeze 33 nodes. Every Critical finding has a fix that fits inside an existing AD clause; none requires a new component.

## Severity scale

(Critical = can produce a WRONG decision or a silent safety failure; High = produces an undefined state a caller must guess at; Medium = degraded but honest; Low = hygiene)

## Path enumeration log

| # | Path / domain | Walked? | Findings | Already handled by |
|---|---|---|---|---|
| 1 | All 14 rules at t = start−1 ms / start / end−1 ms / end; midnight-crossing; zero-length; inverted (`ends_at ≤ starts_at`); past freeze; overlapping freeze scopes; freeze expiring mid-evaluation | yes | EDGE-1, 2, 3, 9, 21, 22 | AD-3 (inverted/zero-length → validation failure), PRD NP-7 (past windows ignored), EC-3.1–3.4, EC-4.1–4.2, EC-4.10 |
| 2 | `valid_until = MIN(now+duration, access-window end, protected.starts_at−300s, freeze.starts_at−300s)`; MIN ≤ now; `expected_duration` 0/−5/4320/4321; no windows + no freeze + unbounded access; bound == `campus_now`; expired `CONSTRAIN` deadline | yes | EDGE-2, 3, 4, 23 | FR-1 (`[1,4320]`), EC-3.10, EC-3.7 (earlier bound governs), `valid_until NOT NULL` |
| 3 | Precedence walk: stale fact at the higher-precedence rule; constraint expansion throws; `R-GRACE-01` 8 h horizon × 300 s grace at 7 h 59 m / 8 h 00 m 00.001 s; `R-STRADDLE-01` vs `R-GRACE-01` when duration > distance-to-boundary | yes | EDGE-1, 15, 23 | EC-3.5/3.7, FR-6 (`0 < Δ ≤ 8h`), AD-1 break, AD-2 |
| 4 | 6 ports × {149 ms, 151 ms, 200-with-truncated-body, stale at exact age, stale at age+1 s, clock down with cached console clock, slow-then-fast} | yes | EDGE-5, 6, 8, 10, 13, 24, 25, 26, 27 | FR-10 (`exceeds 150`), AD-4 three-way split, `/ready` clock probe |
| 5 | Concurrency/idempotency: 2 identical concurrent requests; `preview_token` reused; activation vs 60 s TTL; 2 racing activations; query across a version change; `from == to`; `from > to`; pagination across a live write | yes | EDGE-16, 17, 18, 29, 31 | AD-7 (pinning, 5 s window), AD-8 (total order), EC-4.10 |
| 6 | `derived_from` chain: derived-of-derived; parent deleted; cycle | yes (2 of 3 unhandled) | EDGE-19 | Cycle is unreachable (no `UPDATE` grant — AD-8); parent deletion impossible (append-only) |
| 7 | Journal / AD-8: non-round-tripping float; snapshot GC'd before the decision; `evaluated_at` ties; clock step backwards | yes | EDGE-8, 20, 28, 29 | AD-8 trade-off declares the backward-clock ordering, not the freeze bypass; AD-1 boot gate |
| 8 | Freeze lifecycle: `DRAFT` forever; `ACTIVE` with empty `allowances`; lift racing an in-flight evaluation; activator's role revoked between preview and activation | yes | EDGE-7, 9, 11, 30, 31, 32 | §9.1 lifecycle, EC-4.8, EC-4.9, `lift_reason` required, NP-2/EC-4.7 |
| 9 | Time: DST spring-forward; leap second; Feb 29 23:59:59.999; tzdata change moving the campus offset | yes | EDGE-8, 10, 22 | NP-4 (spring-forward), A-3 (`America/Panama`, parameterised) |
| 10 | Limits: `requested_gpu_count` 0/1/8/9; `expected_duration_min` 1/4320/4321; unknown model; unknown actor; window requiring 26 of 24 nodes | yes | EDGE-12, 13, 33 | FR-1 (`[1,8]`, `[1,4320]`, `{24,48}`), FR-8 (integer quota), EC-3.10 |
| 11 | Every §10 deferred item re-tested for "reachable but wrong" rather than "safe to defer" | yes | EDGE-1 (D-4), EDGE-22 (D-1), EDGE-32 (D-3) | D-2, D-5, D-6, D-7 (no decision-path reach) |

## Findings

### EDGE-1 — No rule produces `ALLOW`, yet `ALLOW` is the module's most common outcome and contradicts AD-1

- **Severity:** Critical
- **Domain:** precedence
- **Triggering condition:** Any request for which none of the 14 rules matches — e.g. `scenario-3` §3.3's corrected E-1: a `TRAINING` request at 22:10 for 360 min with the lab 10 h 49 m away, quota sufficient, fleet free. All 14 rules `NO_MATCH`.
- **Path:** §3.1 walk → no rule "both matches and declares a terminal outcome" → walk completes → AD-1's Rule: *"If the walk completes with no rule firing, the result MUST be `DENY` with `primary_rule_id = R-NO-RULE-MATCH`."* → but `scenario-3` §3.3 records the outcome as **`ALLOW`** and §3.4's card is headlined `● ALLOW … R-STRADDLE-01`, a third, separate answer. AD-6 then requires `rationale_template[primary_rule_id]` and a non-empty `citations[]` for *every* outcome; `R-NO-RULE-MATCH` and `R-DEP-01` appear in no registry, so AD-2's boot validator ("any rule lacks a `citation_id`; or any rule lacks a `rationale_template_id`" → exit non-zero) cannot validate them either.
- **Current behaviour:** undefined — three mutually exclusive outcomes are specified for one path, and the two rules the architecture depends on for its own fail paths are not in the rule set they are validated against.
- **Impact:** Either every clean night-batch request is `DENY`d (the institution cannot run overnight training at all, which is the module's stated purpose), or `ALLOW` is produced with no attributable rule, no template, and no citation — a direct AD-1 violation on the highest-frequency path in the system. The console's `ALLOW` card (§4.4) has nothing to render.
- **Minimal fix:** Add `R-ALLOW-01` at the end of the precedence order (`15`): fires when no rule 1–14 declared a terminal outcome and the request is otherwise admissible → `ALLOW`, with `citations = [POL-GRACE, POL-NIGHT]` and its own `rationale_template`. Add `R-DEP-01` and `R-NO-RULE-MATCH` to the registry as first-class rules with precedence above/below the walk boundary so AD-2 and AD-6 validate them, and delete the `ALLOW` row from `scenario-3` §3.3's correction.
- **Invariant touched:** AD-1, AD-6, AD-2

### EDGE-2 — The 300 s grace makes `valid_until ≤ campus_now` constructible, and AD-3 rejects only `null`

- **Severity:** Critical
- **Domain:** bounds formula
- **Triggering condition:** A protected window (or freeze) starting within 300 s of `campus_now`, for a request that is not itself a straddle. Reachable at 08:56 for a 09:00 lab with `workload_kind = INTERACTIVE_INFERENCE` (exempt from `R-LAB-01`) and `expected_duration_min = 1`.
- **Path:** AD-3 computes `valid_until = MIN(08:56 + 1min, …, 09:00 − 300 s = 08:55, …) = 08:55`. `08:55 < 08:56 = evaluated_at`. `R-STRADDLE-01` does not fire (`08:57` does not cross `09:00`), so the "non-binding bounds MUST still be emitted in the constraint list marked `superseded`" clause — which sits *inside* "when a straddle is detected" — never runs. `Decision` constructor: *"MUST reject any `ALLOW` or `CONSTRAIN` whose `valid_until` is null."* It passes. `R-GRACE-01` reaches the same state from the rule side: at Δ = 8 h − 299 s it fires and emits `must_checkpoint_by = boundary.starts_at − 300 s = now − 1 s`.
- **Current behaviour:** undefined — a `Decision` carrying authority that expired before it was issued is legal at every layer.
- **Impact:** The delegate receives `CONSTRAIN` with a `HARD_DEADLINE` one second in the past. M9 issues `SIGTERM` on arrival; the gateway's launch re-check (`valid_until` = "the instant after which this decision confers no authority") rejects the launch. Either way an admissible interactive request is refused for a reason the console cannot render, because no constraint, no `enforced_by`, and no citation names the truncated bound.
- **Minimal fix:** Add to AD-3: *"The `Decision` constructor MUST reject any `ALLOW` or `CONSTRAIN` whose `valid_until ≤ evaluated_at`, and the constraint expander MUST emit a `HARD_DEADLINE` naming every bound strictly earlier than `campus_now + expected_duration_min`, regardless of which rule fired."* Then `R-GRACE-01` must be lowered to a `CONSTRAIN` with a minimum forward horizon, or those requests become `DENY/R-GRACE-00` with a `next_action` of "retry in N s".
- **Invariant touched:** AD-3, AD-5

### EDGE-3 — Equal-instant straddle emits no `must_checkpoint_by`, and nothing stops the job at the class

- **Severity:** Critical
- **Domain:** bounds formula / temporal
- **Triggering condition:** `campus_now + expected_duration_min == boundary.starts_at` exactly. Reachable: a `TRAINING` request at 22:00:00.000 with `expected_duration_min = 660` and a lab at 09:00 next day.
- **Path:** FR-7's validation column: *"Strictly-greater-than crossing; same-instant is **not** a straddle."* → `R-STRADDLE-01` does **not** fire. `R-GRACE-01` does not fire (Δ = 11 h > 8 h). `R-NIGHT-01` does not fire (inside `[22:00, 06:00)`). The walk ends with no terminal outcome → EDGE-1. AD-3 still sets `valid_until = MIN(09:00, 06:00, 09:00 − 300 s, …) = 06:00`. The `HARD_DEADLINE` for `08:55` is never emitted. Per PRD §9.2, `valid_until`'s enforcing delegate is "M9 / gateway re-checks **before every launch**" — a one-shot check at 22:00, which passes.
- **Current behaviour:** undefined — the design intends `must_checkpoint_by` to be the in-flight stop, and in this case there is none.
- **Impact:** The headline failure, verbatim: "the module's headline failure — a job admitted under the overnight policy that keeps running into a protected morning class window, disrupting a class and destroying a student's night of work while the audit record shows the engine permitted it." It is reachable at exactly one instant of arithmetic, and the audit record will show a clean `ALLOW`.
- **Minimal fix:** Change the straddle predicate to compare against the *bounded* end: `campus_now + expected_duration_min ≥ boundary.starts_at − PROTECTION_GRACE`. Equivalently, add to AD-3: *"`must_checkpoint_by` MUST be set whenever any applicable bound is strictly earlier than `campus_now + expected_duration_min`, independent of rule attribution."* The `CONSTRAINT.deadline` column's `nullable` marker must be tightened to `NOT NULL` (see EDGE-36's constraint family) so AD-5's *"Every emitted constraint MUST carry … a `deadline`"* is schema-enforced rather than prose-enforced.
- **Invariant touched:** AD-3, AD-5

### EDGE-4 — `end_of_enclosing_access_window` is a term with no definition, no fact, and no entity

- **Severity:** Critical
- **Domain:** bounds formula
- **Triggering condition:** Every `ALLOW` and every `CONSTRAIN` — the term is unconditionally in the MIN.
- **Path:** AD-3's formula names four terms. `campus_now + expected_duration_min` (from the request), `nearest_protected_window.starts_at` (M4 port), `nearest_freeze.starts_at` (freeze store). The fourth has no source: `ProtectedWindow.kind ∈ {LAB, CLASS, EXAM}`, the night window is a policy parameter, and the freeze window is a freeze — there is no entity called an "access window" in PRD §5's domain model, in the `FACT_SNAPSHOT` schema, or in any of the 6 ports. §3's sequence diagram compresses it to "window end" and `scenario-3`'s `UX-S3-02` reads it as "end of enclosing night window". Those are two different readings of one term.
- **Current behaviour:** undefined — the implementer must choose between (a) the night window, (b) the enclosing protected window, (c) `+∞` when the request is in no window, and (d) an error. AD-3's "over all applicable bounds" hints at (c) but never states the absent-term sentinel.
- **Impact:** Reading (a) at 14:00 grants an interactive browser notebook 16 hours of authority (`valid_until` = 06:00 tomorrow). Reading (b) at 14:00, outside any window, either grants open-ended authority — a direct AD-3 violation — or errors on every out-of-window request. Two implementers produce two different policies from the same FINAL architecture document.
- **Minimal fix:** Name the term: define `AccessWindow` in PRD §5 as a first-class policy-versioned entity with `starts_at`/`ends_at` (distinct from `ProtectedWindow`, which is a *reservation*; the night window is one instance of it), add it to `FACT_SNAPSHOT`, and state in AD-3: *"A bound with no applicable instance is omitted from the MIN; if all three non-duration terms are omitted, `valid_until = campus_now + expected_duration_min`."*
- **Invariant touched:** AD-3, AD-1

### EDGE-5 — A port returning HTTP 200 with a truncated body reaches the rules and fails open through `NaN`

- **Severity:** Critical
- **Domain:** ports
- **Triggering condition:** `fleet` returns 200 with `{"classes":[{"class_id":"ws-24gb","gpu_count":1,"vram_gb_per_gpu":24}]}` — `available_count` and `cordoned_count` absent. Same shape for `quota` with `remaining` absent, and for `catalog` with a variant array truncated mid-object.
- **Path:** Shell marshals the payload into the `FactSet` (§8.2 option A: *"the fact set must be marshalled defensively (it is a trust boundary)"* — as a note, not a requirement). Zod is scoped to *"the request boundary and on every fixture"* (§7 Validation) — **not** to inbound facts. The core is pure and cannot detect it. `R-CONTEND-01` evaluates `available_count − cordoned_count ≤ 0` → `undefined − undefined = NaN` → `NaN ≤ 0` is `false` → **no match**. `R-QUOTA-01` evaluates `remaining ≤ 0` → `undefined ≤ 0` is `false` → **no match**. `R-QUOTA-02`'s `0 < remaining` is `false` → no match. The walk falls through to `ALLOW` (EDGE-1).
- **Current behaviour:** undefined — the document acknowledges the trust boundary and specifies no schema for it.
- **Impact:** A silent fail-open on a 24-machine fleet: a `TRAINING` job for 24 GPUs is admitted while all 24 are committed, because a truncated HTTP body made `NaN ≤ 0` false. This is the same failure mode AD-4 exists to prevent, reached through a path AD-4 does not model (AD-4's branches trigger on a port *error*, and HTTP 200 is not an error).
- **Minimal fix:** Zod-parse every port payload in the shell before it enters the `FactSet`; a parse failure is promoted to a port *error* and therefore classified by AD-4 (`fleet` → `STALE`, everything else → `DENY`/`R-DEP-01`). Add a totality property test asserting every rule predicate is a total function over the `FactSet` type — no `undefined`, no `NaN`, no coercion. Add a case to `ad4-port-failure.test.ts` for "200 + malformed body" alongside the existing fail/stale matrix.
- **Invariant touched:** AD-4, AD-1

### EDGE-6 — `fleet` is the only fail-open port and it is the sole evidence for the `R-TIER-01` `DENY`

- **Severity:** Critical
- **Domain:** ports / precedence
- **Triggering condition:** The `fleet` port errors (or is down) and a cached copy ≤ 60 s old is served. Any `ALLOW`-seeking request in that window.
- **Path:** AD-4's fixed split puts `fleet` in `STALE_TOLERANT(60s)`. AD-4 names the authorization-class rules as `actor, schedule, freeze, quota` — `fleet` is not among them, so `R-TIER-01` reads a *fail-open* fact. `R-TIER-01` is `DENY` with citation `POL-TIER` and is the rule that enforces FR-3's *"A 48 GB request is never satisfied by a 24 GB node."* A stale fleet read reporting a decommissioned `srv-48gb` class makes the request physically feasible. NFR-12 then contradicts AD-4 directly: *"100% of authorization-class rules (**`R-TIER`**, `R-AUTH`, `R-NIGHT`, `R-LAB`, `R-QUOTA-01`) are **fail-closed** on indeterminate facts"* — but AD-4's own table makes `R-TIER`'s only evidence fail-open.
- **Current behaviour:** undefined — two normative sentences in the same document assign opposite classifications to the same rule.
- **Impact:** A 60-second `M3` outage converts a hard physical-infeasibility `DENY` into an `ALLOW` of a 48 GB job onto a machine that no longer exists. AD-4's trade-off paragraph only argues the `catalog` staleness case; the `fleet`/`R-TIER-01` case is never argued.
- **Minimal fix:** Split the fleet port: `fleet.capabilities` (class table, `gpu_count`/`vram_gb_per_gpu`) is authorization-class → `FAIL_CLOSED`; `fleet.availability` (`available_count`/`cordoned_count`) is contention-class → `STALE_TOLERANT(60s)`. Amend AD-4's three-way split to name the split, and amend NFR-12 to read "`R-TIER` fail-closed on `capabilities`; `R-CONTEND-01` fail-open on `availability`."
- **Invariant touched:** AD-4

### EDGE-7 — Freeze create, preview, and lift have no role authorisation and no `403`

- **Severity:** Critical
- **Domain:** freeze
- **Triggering condition:** Any authenticated actor — a `STUDENT` — calls `POST /policy/freezes/preview` then `POST /policy/freezes` with a valid `preview_token`.
- **Path:** §5.1's notable failures for `POST /policy/freezes` are `400` (no reason) and `409` (duplicate / token problems). There is **no `403`**. `POST /policy/decisions` has one; the freeze mutations do not. The only gate on the module's single irreversible action is the 60 s preview token, which §5.1 itself describes as *"a hash of the draft freeze bound to a 60 s TTL"* — a freshness token, not an authorisation token. The `actor` port is read for `evaluate()`, and AD-5 fixes the write scope but not the *principal*: *"The module MUST hold write credentials to exactly two stores"* says nothing about who may exercise them. The whole architecture defers identity to upstream AD-8 ("M2 consumes the `actor` fact … and has no opinion about the IdP") — but the *tier* that permits freezing is an institutional policy, which is this module's subject.
- **Current behaviour:** undefined — the authorisation requirement for freeze mutation is absent, and the specific case in the brief (a `LAB_OPERATOR` whose role is revoked between preview and activation) has no path at all: the token is valid for 60 s after the revocation and nothing re-reads `role_tier`.
- **Impact:** One `curl` from a student's authenticated session freezes 33 GPUs for the duration of the window, with a server-computed blast radius and a plausible reason string. The audit trail records `activated_by = <student id>` and nothing anywhere marks it as illegitimate.
- **Minimal fix:** Add `R-FRZ-ADMIN-01` (precedence 0, before `R-FRZ-01`) on the three freeze routes: `role_tier ≥ LAB_OPERATOR` and `actor_kind = HUMAN`, evaluated against a **fresh** `actor` read taken at activation time (never the preview's snapshot), returning `403 {outcome: DENY, rule: R-FRZ-ADMIN-01, next_action: [REQUEST_ELEVATION]}`. Bind the `preview_token` to `actor_id` as well as to the draft hash so one operator's preview cannot be spent by another. Record `activated_by_role_tier` and `activated_at` on the `FREEZE` row. Add the three routes' `403` to §5.1.
- **Invariant touched:** AD-1, AD-5

### EDGE-8 — `CampusClock` has no quality contract; a backwards step passes `FAIL_CLOSED(0)` and steps around an active freeze

- **Severity:** Critical
- **Domain:** time
- **Triggering condition:** Campus NTP steps `campus_now` backwards by 2 s at 08:13:07 → 08:13:05 while freeze `FRZ-2026-04-09-001` is `ACTIVE` from 08:00.
- **Path:** AD-4: *"The clock port MUST be `FAIL_CLOSED` with a tolerated age of `0`."* The age function is never defined. If it is `clock_fetched_at − clock_reported_at`, a backward step makes the age **negative**, and `negative > 0` is `false` — so the one fail-closed port passes its own tolerance test. The evaluation then runs with `campus_now = 08:13:05` and `R-FRZ-01` — whose condition (see EDGE-9) is scope-and-`state`, so the boundary test does not rescue it; even with a correct half-open test, a freeze starting at 08:13:06 is not yet active. Every `valid_until` computed from the stepped clock is 2 s later than reality. `/ready` only asserts "clock reachable", so a `stratum 15` (unsynchronised) or leap-flagged source passes readiness.
- **Current behaviour:** undefined — the port's contract names no quality, stratum, or monotonic-anchor field, and the staleness predicate has no stated form, so the negative case has no defined outcome.
- **Impact:** A clock step is the cheapest possible freeze bypass: no authorisation to defeat, no data to corrupt, and the resulting `ALLOW` is fully attributed to `R-ALLOW-01` with a clean trace. The reverse case (a large forward step) manufactures spurious deadlines.
- **Minimal fix:** Extend the `CampusClock` port to `{instant, stratum, leap_indicator, monotonic_anchor_ms, source}`; the shell MUST reject any reading with `stratum ≥ 15`, `leap_indicator ≠ 0`, or an age that is negative or `> 0` (tolerance 0), mapping each to `DENY`/`R-DEP-01` with `cause = CLOCK_UNTRUSTWORTHY`. Add a readiness assertion on `stratum ≤ 4`. Add `campus_now` monotonic-anchor regression to `ad4-port-failure.test.ts`.
- **Invariant touched:** AD-3, AD-4

### EDGE-9 — `R-FRZ-01`'s condition has no half-open window test, so a stored `ACTIVE` never expires

- **Severity:** Critical
- **Domain:** temporal / freeze
- **Triggering condition:** A `FREEZE` row is left in `state = 'ACTIVE'` after its `ends_at` has passed — because the `EXPIRED` transition was never executed (no scheduler, no job, no sweep defined).
- **Path:** PRD §6.2 rule 1's condition is *"An active `FreezeState` covers the request's subject scope, node-class scope, or `ALL`; **and** the request carries no matching `allowances[]` entry."* There is no `starts_at ≤ campus_now < ends_at` in the condition. FR-2's *validation* column mentions "Freeze window half-open", so the test exists somewhere, but nothing states that the window test is part of the *rule predicate* rather than an input-validation step. `scenario-4` EC-4.2's note — *"`EXPIRED` is computed from the clock, never from a job"* — states the intent but does not say by what mechanism, and the `FREEZE.state` column is a stored value with no owning transition process (the shell is the sole writer and evaluates on demand). Compare `R-LAB-01`, whose condition *does* spell out `campus_now ∈ [window.starts_at, window.ends_at)`.
- **Current behaviour:** undefined — the freeze is either re-evaluated against the clock on every request (implied by EC-4.2) or trusted from the stored `state` column (implied by the schema). The two readings differ by a total denial of service.
- **Impact:** Under the literal rule text, one un-swept row denies every request in scope forever, including the exam requests the freeze exists to protect unless an operator notices. The console's E-NOT-YET copy asserts "No freeze is active" — a claim the architecture does not make true.
- **Minimal fix:** State the predicate in one place as a shared, tested helper: `isActive(f, t) := f.state ∉ {DRAFT, LIFTED} ∧ f.starts_at ≤ t ∧ t < f.ends_at`, and make `FREEZE.state` a *stored intent* (`ACTIVE` = activated, not yet lifted) rather than a computed lifecycle value — or drop the column and compute the state from `activated_at`/`lifted_at` on read. Add the sweep to `/ready` as a non-blocking reconciliation, not as a gate.
- **Invariant touched:** AD-1, AD-3

### EDGE-10 — The clock override required by EXPERIENCE law 5 has no API surface, no authorisation, and no audit record

- **Severity:** Critical
- **Domain:** unhandled
- **Triggering condition:** Any client posts a request whose evaluation time is not the campus clock's.
- **Path:** EXPERIENCE §1 law 5: *"Time is a first-class control… The engineer debugging a boundary bug must be able to set campus time…"* §7 (Time row) repeats it for CLI (`--at`) and console; PRD FR-14 requires *"100% of console actions are achievable through documented API calls"* and §7 (Console row) requires the console to consume *only* the public REST API. So the override **must** traverse `POST /policy/decisions` or `POST /policy/decisions/preview`. But `AccessRequest` (PRD §5) has no time field, and FR-1's validation enumerates the accepted inputs and does not include one. Meanwhile AD-1's static gate bans `Date.now`, `time.Now`, `new Date()`, `Math.random`, `crypto.randomUUID` in `policy/core` — it does **not** ban a caller-supplied clock value, which is neither of those symbols. The `--at` path is a CLI argument (out of band); the console's is not.
- **Current behaviour:** undefined — the architecture requires the affordance, forbids the only channel that could carry it, and does not ban the unsafe implementation of it.
- **Impact:** Two failure modes, both real. If a `campus_now` field is added to the public request, a `STUDENT` walks straight through `R-NIGHT-01` and `R-LAB-01` by posting an off-hours timestamp, and the journal records a plausible-looking decision with a forged `evaluated_at`. If it is not added, EXPERIENCE law 5 and the console's S-1 demo are unimplementable against the API.
- **Minimal fix:** Add `evaluated_at_override` as an explicit, *separate* query parameter on `POST /policy/decisions/preview` only (never on the committing route), gated by `role_tier ≥ INSTRUCTOR`, honoured only when the deployment profile sets `ALLOW_CLOCK_OVERRIDE` (false in the integrated deployment, true in `docker compose` and in the CLI), and recorded verbatim in `FACT_SNAPSHOT` and in a `STALE FACTS`-equivalent `CLOCK_OVERRIDE` trace entry so no reader mistakes a demo decision for a real one. Extend AD-1's CI gate to reject the override symbol inside `policy/core` and to assert the committing route ignores the parameter.
- **Invariant touched:** AD-1, AD-3, AD-4

### EDGE-11 — Freeze scope composition is undefined for multi-array scopes, and `FREEZE` has no `CHECK` constraints

- **Severity:** High
- **Domain:** freeze
- **Triggering condition:** A freeze with `scope = 'SUBJECT'`, `subject_ids = ['CS-340-CV']`, `node_class_ids = ['ws-24gb']` — i.e. an operator checking both boxes in the scope builder. Also `scope = 'ALL'` with non-empty arrays, and `allowances = null` or `{}` rather than `[]`.
- **Path:** `FREEZE` declares `scope "ALL|SUBJECT|NODE_CLASS"`, `subject_ids jsonb`, `node_class_ids jsonb`, `allowances jsonb` — no `NOT NULL`, no `CHECK (jsonb_typeof(...) = 'array')`, no cross-column constraint. `scenario-4` EC-4.3 says "node-class scope composes with `ALL`" (implying union) and EC-4.4 says "scope is matched, not applied globally". Neither states the predicate for a scope value with the *other* array populated. The UX's scope builder (§3.1 of scenario-4) lets her set both.
- **Current behaviour:** undefined — `in_scope` is `true` under a union reading and `false` under an intersection reading, for the same row.
- **Impact:** Under the intersection reading a freeze silently covers *nothing* while the console renders an active-freeze banner and the audit records an activation. Under the union reading it denies subjects the operator did not select. `allowances = null` makes `allowances.some(...)` throw → the EDGE-15 path; a corrupted `allowances` object makes the exemption test truthy and admits non-exam work inside an exam freeze.
- **Minimal fix:** Define the predicate explicitly in AD-3 or a new AD-9: `in_scope := (scope='ALL') ∨ (scope='SUBJECT' ∧ request.subject_id ∈ subject_ids) ∨ (scope='NODE_CLASS' ∧ request.node_class_id ∈ node_class_ids)`, and add a store `CHECK` that the two non-applicable arrays are empty for the declared scope plus `CHECK (allowances IS NOT NULL AND jsonb_typeof(allowances)='array')`. Assert it in a boot/fixture validation test.
- **Invariant touched:** AD-1, AD-3

### EDGE-12 — `R-TIER-02` / `R-TIER-03` have no defined comparison for `ActorKind: SYSTEM` or a null clearance cap

- **Severity:** High
- **Domain:** limits
- **Triggering condition:** The Night Training Daemon (a named `ActorKind: SYSTEM` actor, PRD §2.3) submits a request. Its `max_gpu_count` / `max_vram_gb` are either absent (unbounded) or unset.
- **Path:** `R-TIER-02` fires when *"no class available to the actor's clearance satisfies it (e.g. 48 GB requested, actor capped at 24 GB)"*. Implemented over the caps: `class.vram ≥ requested ∧ requested ≤ actor.max_vram_gb`. With `max_vram_gb = null`, `requested ≤ null` is `false` → **no class satisfies the clearance** → `R-TIER-02` fires → the system actor is `DENY`d for physical-infeasibility it did not cause. With `max_vram_gb = +∞` (also plausible), `R-TIER-03`'s "the model has a catalog variant satisfying the actor's cap" becomes vacuously true for *every* request, so every system request is downgraded to `CONSTRAIN → MODEL_VARIANT`. PRD §2.3 also states SYSTEM actors "carry a narrower rule set (no `CONSTRAIN` upgrade, no freeze allowance)" — a rule set that is never enumerated anywhere: all 14 rules are phrased for humans, and `R-TIER-03`, `R-GRACE-01`, `R-QUOTA-02`, `R-CONTEND-01`, `R-FRZ-02` are all `CONSTRAIN` upgrades.
- **Current behaviour:** undefined — an unbounded cap is not distinguishable from a null cap, and the narrower rule set does not exist as data.
- **Impact:** Either the night training daemon is denied for its entire life (a named, in-scope actor is unusable), or every system request is silently downgraded and auto-substituted. Both are wrong decisions on the actor the PRD explicitly says must not be used as a substitute for a human — and which is nonetheless how overnight work is expected to run.
- **Minimal fix:** Replace the two scalars with a `Clearance` object `{max_gpu_count, max_vram_gb, unrestricted: boolean}` and a single total comparison used by `R-TIER-01/02/03` (`if actor.clearance.unrestricted then fleet_classes else ∩ caps`). Publish a per-`ActorKind` rule filter as registry data (`SYSTEM: exclude {R-TIER-03, R-GRACE-01, R-QUOTA-02, R-FRZ-02}`), make the filter a `NOT_EVALUATED` trace state (which AD-1 already supports) rather than a silent skip, and add a `SYSTEM` row to the rule matrix in `ad1-attribution.test.ts`.
- **Invariant touched:** AD-1

### EDGE-13 — An unknown `model_ref` falls through to `R-NO-RULE-MATCH`, and a catalog `404` is not a defined AD-4 branch

- **Severity:** High
- **Domain:** limits / ports
- **Triggering condition:** A request names a model that was never in the catalog, or one deleted since the console's last catalogue read (a client-side cache, a typo, a retired model).
- **Path:** `R-TIER-03` needs "the model has a catalog variant", `R-AUTH-01` needs "the model's license is not accepted for that subject", `R-AUTH-02` needs "the model's weight class". With no catalog entry none of the three can fire, and no other rule inspects `model_ref` → the walk ends empty → EDGE-1 → `DENY`/`R-NO-RULE-MATCH` with a rationale saying "no rule covers this request". That is technically true and institutionally absurd as an answer to "that model does not exist". Separately, AD-4's two branches are *"a port error"* and *"a fact marked `STALE`"*; an HTTP 404 from the catalog is neither. `catalog` is `STALE_TOLERANT(24h)`, so the natural implementation of "port failed" for a miss is to serve the cached copy — which for a *deleted* model returns the full old entry, including a revoked licence and a superseded `min_vram`, and the request proceeds.
- **Current behaviour:** undefined — a `NotFound` is not a port error and not a stale fact, and no AD-4 branch covers it.
- **Impact:** A client bug produces a mis-attributed refusal that names the wrong cause (UX-1's `DENY` law: "Rationale names one cause in the first sentence" — the cause named is wrong). In the stale-copy reading, a deleted model stays admissible for up to 24 hours, defeating `R-AUTH-01`'s licence check, which is an authorization-class rule reading a fail-open fact.
- **Minimal fix:** Add `R-CATALOG-01` at precedence 2 (after freeze, before tier) → `DENY` with `MODEL_NOT_FOUND` and a `next_action` listing the nearest catalog matches by fuzzy ref. Make the catalog adapter return a typed `NotFound` that maps to a MISSING fact (not a port error) so it does not double-fire `R-DEP-01`, and so a 404 never serves a cached body. Add "200 + empty array" and "404" as third and fourth rows of the `ad4-port-failure.test.ts` matrix.
- **Invariant touched:** AD-1, AD-4

### EDGE-14 — An unknown actor is classified as a port fault, so an authorization failure renders as a system fault

- **Severity:** High
- **Domain:** ports
- **Triggering condition:** `GET /access/actors/{id}` returns HTTP 404 — a mistyped actor id, a deactivated student, an account not yet provisioned.
- **Path:** AD-4's only trigger is *"A port error MUST produce either (a) `DENY` with `primary_rule_id = R-DEP-01` … or (b) a fact marked `STALE`."* A 404 is a successful HTTP response with a negative body, so the adapter's error branch fires → `DENY`/`R-DEP-01`, `retry_after_ms = 2000`. Per EXPERIENCE §4.3 the client renders `E-SYSTEM`: *"Full-width `role="alert"` banner… Fault cause, failing port, `retry_after_ms`"* with auto-retry stopping after 3 attempts. Per §6.4 the first line may not be "Error"/"Failed" for a *refusal* — this is correctly a system fault, just the wrong one. `scenario-4` §5's reference case (a genuine quota outage) and this case are indistinguishable to the operator and to the console, so the escalation goes to the wrong person. The reverse mis-implementation is worse: treating a missing actor as a fact and then reading `actor.clearances ?? []` fails **open** on `R-AUTH-01`.
- **Current behaviour:** undefined — a negative lookup result has no classification.
- **Impact:** An unprovisioned account is told to "retry in 2 s" three times and then to copy diagnostics to support, instead of being told it is not enrolled. In the fail-open reading, an actor the access manager does not know about is authorized.
- **Minimal fix:** Extend the port contract with a typed result: `{ok: value} | {notFound: true} | {error: cause}`. Map `notFound` on the `actor` port to a new `R-AUTH-00` (precedence 5, `DENY`, cause `ACTOR_UNKNOWN`, `next_action: [CONTACT_REGISTRAR]`) — an authorization outcome, not a fault. Add a fifth column, "200/404 with a negative body", to `ad4-port-failure.test.ts` and require every adapter's not-found mapping to be declared in the same static classification table AD-4 already mandates.
- **Invariant touched:** AD-4, AD-1

### EDGE-15 — The no-decision path is unattributable, unrenderable, and unjournalled

- **Severity:** High
- **Domain:** precedence
- **Triggering condition:** Either (a) constraint expansion throws — a variant list the shell pre-resolved as empty, a constraint `value` the expander cannot build from the facts, a template data hole; or (b) the shell's `FactSet` builder itself fails after the fetch.
- **Path:** §3's sequence: `P-->>S: Decision` → `S->>X: render` → `S->>J: append(policy_version, decision, fact_snapshot_ref)`. An exception at any point before the append means the Decision never reaches the journal, and the client receives a 500 (not in §5.1's notable-failure list) or the `503 CANNOT_EVALUATE` that list does contain. But `CANNOT_EVALUATE` is a member of `DECISION.outcome` and has **no rule id, no precedence, no `citation_id`, and no `rationale_template_id`** — AD-1 requires every decision to be attributable to exactly one rule, AD-6 requires `rationale_template[primary_rule_id]` and a non-empty `citations[]` for any outcome, and AD-2's boot validator would reject both synthetic rules if they were registered. `policy.decision.v1` has no error counterpart, so the audit sees a gap precisely where the system failed. EXPERIENCE §3 routes `CANNOT_EVALUATE` through `FAULT`, whose specified content is the `R-DEP-01` `DENY` card — a different outcome with a different owner.
- **Current behaviour:** undefined — the exception path has no specified outcome, no specified HTTP shape, no journal record, and no template.
- **Impact:** A decision that was *computed* is invisible to the audit. The Audit Ledger (upstream CAP-10) cannot distinguish "the engine was down" from "the engine decided not to record this", which are exactly the two questions an incident review asks.
- **Minimal fix:** Register `R-DEP-01` and `R-NO-RULE-MATCH` as first-class rules (with EDGE-1) so AD-2/AD-6 validate them, give `CANNOT_EVALUATE` a template and a citation, define the throw path as *its own* rule rather than as a 500: the shell catches, journals a `Decision{outcome: CANNOT_EVALUATE, primary_rule_id: R-DEP-01}` and then returns `503` with that decision's id. Add `policy.decision.failed.v1` (or make `policy.decision.v1` carry the 4th outcome) so the journal is never short a row for an admitted-to-the-shell request. Add a fault-injection case to `ad4-port-failure.test.ts` asserting the journal row exists.
- **Invariant touched:** AD-1, AD-6, AD-8

### EDGE-16 — `POST /policy/decisions` has no idempotency key, so a retry yields two `ALLOW`s and two SIGTERM obligations

- **Severity:** High
- **Domain:** concurrency
- **Triggering condition:** A gateway retry, a mobile-client retry after a read timeout, or two console tabs submitting the same composed request. The request carries a client-generated `request_id` (PRD §5).
- **Path:** `DECISION.decision_id` is a `uuid` PK generated per evaluation (AD-1 bans `crypto.randomUUID` in the *core*, so the shell mints it). Nothing in §5.1 declares `request_id` unique, nor any `Idempotency-Key` header, nor a unique index on a normalised request hash. Two evaluations therefore produce two `decision_id`s, two journal rows, two `policy.decision.v1` events, and — for an `ALLOW` — two `must_checkpoint_by` obligations for the same physical job, so M9 receives two `SIGTERM`s and the bridge sees two preemption candidates. AD-8's "bit-identical repeat over a closed window" still holds (the extra row is just a row), and NFR-11's one-rule distribution is unaffected, so nothing surfaces the duplication except count-based UIs: `scenario-4`'s blast radius ("37 requests will be denied") and Dr. Reed's lift modal ("4 requests still blocked") are both double-countable. `UX-1`'s `ARCHIVED` state makes it worse: two rows for one request, indistinguishable in the Journal (scenario-3 §3.6 already shows the same `request_id` appearing three times, for a legitimate reason).
- **Current behaviour:** undefined — no idempotency contract exists for the committing route.
- **Impact:** Silent double-admission and double-counting on the surface whose entire value proposition is "provable class time" and "exactly which requests did this freeze deny".
- **Minimal fix:** Add `Idempotency-Key` (or a unique index on `(actor_id, sha256(canonical_request_body), request_id)`); a repeat within the key's TTL returns the stored decision with `idempotent_replay: true`, writes no new journal row, and emits no `policy.decision.v1`. State in AD-8 that `decision_id` is per journal row and that a replayed request produces no second row. `/preview` is already non-journalling and needs no key.
- **Invariant touched:** AD-5, AD-8

### EDGE-17 — Two concurrent freeze activations of the same scope both commit

- **Severity:** High
- **Domain:** concurrency
- **Triggering condition:** Dr. Reed taps `ACTIVATE` twice (a slow mobile network, a double-tap on a 44 px target under time pressure), or a scripted retry fires while the first request is in flight.
- **Path:** EC-4.10 rejects a duplicate as `409`, which implies a read-then-write check — "does an `ACTIVE` freeze already exist for this scope?" — with no serialisation. `FREEZE` declares no unique index, no version column, and no compare-and-swap. Two transactions both read "none", both insert, both commit, both emit `policy.freeze.activated.v1`, both trigger a gateway cache invalidation. Upstream spine rule 3 requires reservation mutations to be "accepted under an optimistic version check … a compare-and-swap … not a global lock" precisely to stop this; the freeze store is a new aggregate so the spine does not literally bind it, but AD-4's "single writer" framing treats *ownership* as the guarantee and says nothing about *serialisation*, and `supersedes` is nullable so nothing records the shadowing. `scenario-4` §3.5 promises "two distinct journal ids so the audit never has to guess which one applied" for a *lift-and-reactivate*; for a racing double-activate there is no such distinction — both apply.
- **Current behaviour:** undefined — a read-then-write duplicate check with no atomicity.
- **Impact:** Two `ACTIVE` freezes with identical scope. Every subsequent `R-FRZ-01` decision must pick one `freeze_id` to cite; `nearest_freeze.starts_at` in AD-3's MIN is ambiguous; lifting one leaves the other active, so the console's "No freeze is active" and the lift confirmation both lie.
- **Minimal fix:** Add a partial unique index on the normalised scope key (`CHECK (state = 'ACTIVE')`), make activation a CAS on the freeze store's version, and map the constraint violation to the `409` (so the `409` comes from the database, not from a prior read). Add a concurrent-activation test that fires N=8 simultaneous activations and asserts exactly one `201` and seven `409`s.
- **Invariant touched:** AD-1, AD-4 (upstream rule 3)

### EDGE-18 — `GET /policy/decisions` defines no cursor, and the range predicate is unstated

- **Severity:** High
- **Domain:** journal
- **Triggering condition:** (a) An auditor pages `?from=…&to=now` (an *open* window) across a live write boundary. (b) A query with `from == to` or `from > to`.
- **Path:** §5.1 returns `{items[], next}` with no definition of `next` — offset, keyset, or opaque token. AD-8's idempotence clause is scoped to *"over a closed time window"*, so live pagination is explicitly outside the invariant while the API offers it. With offset pagination and a concurrent insert, page 2's window shifts by one row: a decision is duplicated across pages or skipped entirely, and the auditor cannot tell which. With a keyset cursor on `(evaluated_at, decision_id)` — the total order AD-8 mandates — the shift is fixed for a closed `to`, but no such bound is required. Separately, `400 bad range` is the only failure named; whether the filter is half-open `[from, to)`, whether `from == to` is a `400` or a `200` with zero items, and whether `from > to` is a `400` or an empty set, are all unspecified.
- **Current behaviour:** undefined — an auditor paging a live window receives a set that is neither complete nor duplicate-free, with no marker; and a `from == to` query is a coin flip between a status code and a result.
- **Impact:** AD-8's repeat-query guarantee is true and useless for the one case an auditor actually hits (today's journal, still being written). `ad8-idempotence.test.ts` can only pass because its fixture window is closed — the test does not cover the reachable case.
- **Minimal fix:** Define the cursor as keyset on `(evaluated_at, decision_id)`, require `to` on any paginated continuation, and state that a cursor continuation is bit-identical only when `to` is closed (so the console pins `to = now` at first page load and labels the view "as of <t>"). State the range rule explicitly: half-open `[from, to)`, `from == to` → `200` with `items: []` and `next: null`, `from > to` → `400 INVALID_RANGE`. Add an open-window pagination test.
- **Invariant touched:** AD-8

### EDGE-19 — `derived_from` does not record the acting principal, so the actor filter and the audit's "who" are both wrong

- **Severity:** High
- **Domain:** journal
- **Triggering condition:** A `DENY` carries a next action that the console *submits on the requester's behalf* — `scenario-3` §3.4's `[Shorten to 4 h so it finishes on its own]`, UX-1 Flow 02's "primary next action proposes a compliant variant and *submits it* for her", and `R-TIER-03`'s `MODEL_VARIANT` + `RESOURCE_SUBSTITUTION`. A derived decision is therefore produced with a **different `model_ref`/`expected_duration_min`** and a different effective actor.
- **Path:** AD-8 requires `derived_from` non-null and no second top-level entry. `policy.decision.v1` carries `actor_id`; `DECISION` carries `actor_id` in the event payload. Who is written there — Elena, or the engine acting for her? Under the engine's identity the row is invisible to Elena's Journal (which filters on `actor_id`, UX-3) and invisible to the console's "the same `request_id` appears three times" teaching example; under Elena's identity the row is indistinguishable from a submission she made, and NFR-5's id-only discipline gives the auditor no way to see that no human touched it. `ActorKind: SYSTEM` is the only candidate identity and `EC-4.6`/`scenario-3` never exercise it for this path. Chains of depth ≥ 2 (a variant swap that then contends) are permitted with no depth limit and no `next_actions` pointer on the parent, so the console's stacked-card layout (Flow 02's "visible 'proposed by the denial' connector line") has no declared source.
- **Current behaviour:** undefined — the acting principal of a derived decision is unspecified, and so is its journal visibility and its unbounded depth.
- **Minimal fix:** Add `originating_actor_id` (the human) and `submitted_by: HUMAN | SYSTEM` to `DECISION`; make the journal's `actor_id` filter match on `originating_actor_id`; carry both in `policy.decision.v1`. Add `derived_depth SMALLINT NOT NULL DEFAULT 0` with a `CHECK (derived_depth <= 3)` and a `parent_id` back-pointer list on the parent's `next_actions`. Add a row to `ad8-derived.test.ts` asserting the auto-submitted variant is filterable by Elena and flagged `submitted_by = SYSTEM`.
- **Invariant touched:** AD-8, AD-5

### EDGE-20 — The fact snapshot can be evicted or lost, so a denial outlives its evidence

- **Severity:** High
- **Domain:** journal
- **Triggering condition:** (a) A retention/partitioning job drops a `FACT_SNAPSHOT` row while a decision still references it. (b) The process crashes between the decision insert and the snapshot insert.
- **Path:** AD-8's trade-off: *"The journal grows without bound and requires partitioning and a retention policy that this module does not own."* "Does not own" a retention policy is not a prohibition on evicting referenced snapshots, and the `||--||` in the ER diagram implies a FK that no retention job is told to respect. The reference itself is stored, not the snapshot (`S->>J: append(policy_version, decision, fact_snapshot_ref)`), so the two writes are not atomic and no transaction is named (PRD §6.1: *"It holds no cache, opens no transaction"* — for the *core*, but the shell's append order is what matters and it is unstated). Downstream, EXPERIENCE §5 UX-3 already anticipates the consequence: a row opens *"without the snapshot, with a `snapshot unavailable` chip."*
- **Current behaviour:** specified only as a degraded UI, not as an audit property — a `DENY` whose evidence is gone is still returned as a `DENY`.
- **Impact:** NFR-3's replay guarantee is void for that decision and `GET /policy/decisions/{id}`'s `404` cannot distinguish "unknown id" from "evidence evicted" from "snapshot write lost". EXPERIENCE law 4 (*"she reproduces a denial that wasn't there yesterday"*) and FR-11's reconstructability claim both fail for exactly the decisions most likely to be disputed. AD-6's "build the rationale exclusively from … the matched evidence values" cannot be re-run.
- **Minimal fix:** Make the append a single transaction writing `(decision, trace, constraints, snapshot)` together, so the `1:1` in the ER diagram is real. Add a `DECISION.snapshot_retained BOOLEAN` and a retention rule `retention(window) = max(decision_retention, snapshot_retention)`; evict snapshots only for decisions past the longer horizon, and mark the rest non-evictable. Distinguish `410 SNAPSHOT_EVICTED` from `404` and from `500`, and make the `snapshot unavailable` chip on a `DENY` an `E-UPSTREAM-SIDE` strip that states *"this denial can no longer be reproduced"* — a claim the audit surface must make honestly.
- **Invariant touched:** AD-8, AD-6

### EDGE-21 — The `campus_now` capture point relative to the other five ports is unspecified

- **Severity:** High
- **Domain:** temporal
- **Triggering condition:** A request arrives at 08:59:59.900 and the slowest of the six ports takes 140 ms.
- **Path:** §3's `par` block fetches all six in parallel under a 150 ms cap each. `FACT_SNAPSHOT` has exactly one `campus_now`, so it must be read once — but the document never says *when* in that sequence, or whether the fetch's own duration is subtracted. If the clock is read first, the decision is anchored to 08:59:59.900 and its `valid_until` is 08:55 (EDGE-2). If it is read last, it is anchored to 09:00:00.040 and `R-LAB-01` fires instead. The two readings differ by one rule firing and, at 08:55:00, by whether the request is admitted at all. Nothing pins it, so the answer depends on the shell's implementation.
- **Current behaviour:** undefined — a 150 ms decision-time uncertainty applied to a policy whose entire value is 1 ms boundary precision (NFR-4).
- **Impact:** The 1 ms boundary property in NFR-4 is proved by a test that supplies `campus_now` directly, so it cannot catch this. In production, two requests arriving 10 ms apart across a fetch boundary can get different outcomes, and `AD-1`'s prevention clause — *"a request admitted by one and denied by the other depending on which node of the horizontal pool served it"* — is exactly the shape of the failure, with the node replaced by the fetch's internal ordering.
- **Minimal fix:** State in AD-3: *"`campus_now` MUST be read once, as the first port call, before any other fact fetch, and that single instant is the `evaluated_at` of the resulting Decision; the fetch duration MUST NOT shift the evaluation instant."* Add a shell test that injects a 140 ms delay into one port and asserts the outcome is unchanged from a 0 ms run.
- **Invariant touched:** AD-3, AD-1

### EDGE-22 — The window-resolution inputs are not part of the effective fact set, so a tzdata change silently redefines the night window

- **Severity:** High
- **Domain:** time
- **Triggering condition:** (a) An IANA tzdata release changes the campus offset (Panama abolishing EST is a live legislative question; A-3 is marked `[RISKY]` and "Confirm with Dr. Reed"). (b) A fall-back transition repeats 01:00–02:00 local. (c) Any decision is replayed after either.
- **Path:** AD-3: *"with `t` resolved to campus-local time through the configured IANA zone (`CAMPUS_TZ`)"*. The *effective fact set* for a temporal decision is `(campus_now, CAMPUS_TZ, night window [22:00,06:00) campus-local, window instants)`. `FACT_SNAPSHOT` records `campus_now "with UTC offset"` and nothing else — no `CAMPUS_TZ`, no resolved offset-at-timestamp, no tzdata version, no night-window instant pair. Two consequences follow. (i) Replay: NFR-3's "byte-identical over 10 000 replays" and EXPERIENCE law 4's `Copy as curl` both depend on the tz database being identical on the replay host; `POLICY_VERSION.content_hash` is "sha256 of rule set" only, so the tz basis is outside the hash. (ii) Re-definition: the night window is the **only** predicate in the module expressed in wall time rather than as an instant pair, so a tzdata change does not merely re-render a past decision's copy — it changes which instants `[22:00, 06:00)` covers *now*, altering `R-NIGHT-01` for in-flight work with no version bump and no `changed_rule_ids` entry. Note also that AD-3's universal clause *"Every window test MUST be evaluated as `starts_at <= t < ends_at`"* has no `starts_at`/`ends_at` to apply to the night window, so the one temporal rule with a non-instant predicate has no specified predicate anywhere; NP-4 asserts spring-forward correctness for `R-LAB-01` and `R-STRADDLE-01` and is silent on fall-back.
- **Current behaviour:** undefined — no invariant, schema field, or hash covers the time base.
- **Impact:** A tzdata patch is a policy change with no version, no diff, and no notification — the console's `Compare versions` action cannot show it, because nothing was published. Two nodes in the horizontal pool with different tzdata versions answer the same request differently, which is AD-1's named failure.
- **Minimal fix:** Add to `FACT_SNAPSHOT`: `campus_tz` (IANA name), `utc_offset_seconds_at_evaluated_at`, `tzdata_version`. Add to `POLICY_VERSION`: `tzdata_version` in `content_hash` and in `policy.version.published.v1`. Publish the night window as an **instant pair** (`night_window_starts_at`, `night_window_ends_at`, both instants, re-derived per evaluation day) in the rule data, so no predicate is wall-clock-relative; state the wall-time rendering as presentation only. Extend NP-4 to cover fall-back in both directions and add both transition instants to the 6 window types in `ad3-boundary.test.ts`.
- **Invariant touched:** AD-3, AD-7

### EDGE-23 — AD-3's `superseded` non-binding bounds are unreachable for rules that AD-1's break skipped

- **Severity:** Medium
- **Domain:** precedence
- **Triggering condition:** A `TRAINING` request at 02:00 for 600 min with a lab at 09:00 *and* a freeze at 03:00. Both `R-GRACE-01` (Δ = 6 h ≤ 8 h) and `R-STRADDLE-01` match.
- **Path:** `R-GRACE-01` is precedence 9, `R-STRADDLE-01` is 10. AD-1: *"MUST break on the first rule that both matches and declares a terminal outcome"* → `R-GRACE-01` becomes `primary_rule_id` and `R-STRADDLE-01` is recorded `NOT_EVALUATED`. AD-3 then requires: *"the non-binding bounds MUST still be emitted in the constraint list marked `superseded`."* The 03:00 freeze bound can only be produced by `R-STRADDLE-01`, which never ran. The supersede marker presumes a comparison that the break made impossible. The two-deadline card — `scenario-3` §3.5's "the most important single artefact in this module", with the non-binding deadline struck through and labelled *"earlier bound, not binding"* — is therefore reachable only when `R-GRACE-01` does *not* fire (Δ > 8 h), which is exactly the case where `R-STRADDLE-01` also often does not fire.
- **Current behaviour:** undefined — the constraint list must be computed from the *bound set*, but AD-3 places the requirement inside the precedence walk's aftermath.
- **Impact:** The decision is numerically correct; the console shows one deadline where the design says it should show two, and the operator cannot see the freeze at 03:00 in a decision that was made 6 hours before it. NFR-11 (≥ 90 % one rule) is satisfied, which is why no test catches it.
- **Minimal fix:** Move the `superseded` clause out of the walk: *"The constraint expander MUST enumerate the full applicable-bound set independently of the precedence walk, and MUST mark every bound other than the `MIN` as `superseded` with its owning boundary id — including bounds whose producing rule was `NOT_EVALUATED`."* Add a `superseded_by` field to `CONSTRAINT` and assert the count in `ec-3-7.test.ts`.
- **Invariant touched:** AD-3, AD-1

### EDGE-24 — The 150 ms port cap is irreconcilable with NFR-1's p99 ≤ 50 ms

- **Severity:** Medium
- **Domain:** ports
- **Triggering condition:** Any single port responding in (50 ms, 150 ms].
- **Path:** §3 fetches in parallel under a 150 ms cap; FR-10 sets `FACT_TIMEOUT_MS = 150`; NFR-1 requires `p99 ≤ 50 ms` and `p50 ≤ 10 ms` under 50 concurrent evaluations, "server-side, excluding client network time". If even one port is slow, the decision cannot be produced before 150 ms. On the fail-closed path this is total: *"An outage of any fail-closed port denies every request"* — so 100 % of requests during a `quota` incident take ≥ 150 ms, and p99 during the incident is ≥ 150 ms. NFR-1 is not scoped to healthy conditions, and the architecture never reconciles the two numbers or carves out the degraded case.
- **Current behaviour:** specified and mutually inconsistent; NFR-1's measurement method ("percentile over server-side timer") will measure the failure window.
- **Impact:** The readiness gate fails on NFR-1 for a reason that has nothing to do with the engine's performance, and the operator's only lever — raising the timeout — makes the outage worse. Also undefined: whether the 150 ms cap *aborts* the in-flight request (freeing the connection and the caller's goroutine, at the cost of an upstream error) or merely stops waiting (leaving 6 requests in flight per evaluation × 50 concurrent = 300 orphaned upstream calls per p99 window).
- **Minimal fix:** State both halves: (a) the timeout semantics — abort with a cancellation signal propagated to the port client, and count aborted ports in the `/health` metrics; (b) either scope NFR-1 to "all six ports healthy", or state a second target for the degraded path (`p99 ≤ 200 ms` when any port is stale or failed). Add the two rows to the NFR-1 measurement method so the gate cannot be gamed by test data.
- **Invariant touched:** AD-4 (no NFR is broken by an invariant here — NFR-1/NFR-10)

### EDGE-25 — No per-request isolation or cache-key contract for the assembled `FactSet`

- **Severity:** Medium
- **Domain:** ports
- **Triggering condition:** Any memoisation or connection reuse in the shell — keyed by `subject_id` instead of the full fact key, a shared snapshot cache, a keep-alive client that reuses a response for the same path across two actors.
- **Path:** §8.2 option A mandates that the shell assemble an immutable `FactSet` from six ports; option C (an event-sourced projection) was rejected precisely because *"a projection adds a staleness class that `AD-4` does not model"*. But the shell still needs a place to hold six port results for the duration of one evaluation, and no invariant constrains that place. The core is pure, so it cannot detect a mis-keyed fact: `R-AUTH-01` and `R-AUTH-02` would evaluate against the wrong `Actor` and the trace's "dotted fact paths" would be internally consistent — AD-4's trade-off makes the same observation about the catalog: *"no test can detect that class of error because the fact set is internally consistent."*
- **Current behaviour:** undefined — no per-request isolation rule, and no negative test for cross-request contamination.
- **Impact:** A wrong-person decision, with a clean trace and a valid `primary_rule_id`. Low likelihood, highest blast radius.
- **Minimal fix:** Add to AD-1: *"The Decision Shell MUST assemble each `FactSet` from a per-request structure with no cross-request memoisation keyed on anything other than the full `(actor_id, subject_id, model_ref, node_class_id, campus_now)` tuple, and MUST NOT reuse a port response across evaluations."* Add a concurrency test that interleaves two actors' evaluations 10 000 times and asserts zero cross-contamination — the shape of `ad1-purity.test.ts` for the shell.
- **Invariant touched:** AD-1, AD-4

### EDGE-26 — AD-4's fixed three-way split and FR-10's tolerance table assign different classifications to the same three ports

- **Severity:** Medium
- **Domain:** ports
- **Triggering condition:** The `actor`, `schedule`, or `quota` port returns a cached value whose age exceeds the tolerance FR-10 lists.
- **Path:** FR-10: *"Stale-acceptable per port: enrollment **15 min**, schedule **60 min**, fleet 60 s, quota **5 s**, model catalog 24 h, clock 0 s."* AD-4: *"The three-way split is fixed and may not be relaxed at runtime: authorization-class ports (`actor`, `schedule`, `freeze`, `quota`) are `FAIL_CLOSED`; `fleet` is `STALE_TOLERANT(60s)`; `catalog` is `STALE_TOLERANT(24h)`; `clock` is `FAIL_CLOSED(0)`."* A port's classification is *"exactly one of `FAIL_CLOSED` or `STALE_TOLERANT(max_age)`"* — so `actor` and `quota` have **no** `max_age` and the 15 min / 5 s figures exist nowhere in the architecture. FR-10's second trigger is also different: *"a fact port returns an error **or** exceeds `FACT_TIMEOUT_MS`"*, whereas AD-4's `STALE` branch triggers only on a *port error* served from cache. So for `fleet`/`catalog` it is undefined whether a *successful* response carrying a 61-second-old payload is stale, and for `actor`/`quota` it is undefined whether a 6-second-old cached quota balance is a fault or a fact.
- **Current behaviour:** undefined — two documents, three ports, two classifications.
- **Impact:** `ad4-classification.test.ts` asserts "the fixed three-way split", so the test passes while the two specifications disagree, and whichever document the implementer read determines whether a 6-second-old quota balance denies the request or is used. FR-10's acceptance condition — *"with the model-catalog port down and a cached copy < 24 h old, 100 % of requests proceed"* — tests the error path only.
- **Minimal fix:** Delete the numeric column from FR-10 or move it into AD-4's table as the single source of truth; classify `actor` and `quota` explicitly as `FAIL_CLOSED` with `max_age = 0` if a cached read is never acceptable for them; state that a `STALE_TOLERANT` port's `STALE` marking is entered on **either** a transport error served from cache **or** a successful response whose `received_at − generated_at > max_age`, and add a fourth column ("200 + over-age payload") to the `ad4-port-failure.test.ts` matrix.
- **Invariant touched:** AD-4

### EDGE-27 — A `STALE_TOLERANT` cached value *beyond* `max_age` has no defined outcome

- **Severity:** High
- **Domain:** ports
- **Triggering condition:** The `fleet` port errors and the cache holds a 59.999 s old copy (in tolerance) or a 60.001 s old copy (1 s beyond). Same for `catalog` at 24 h ± 1 s.
- **Path:** AD-4 enumerates exactly two outcomes for a port error: `(a)` `DENY`/`R-DEP-01` *"for a `FAIL_CLOSED` port"*, or `(b)` *"[a fact] marked `STALE` carrying its age, for a `STALE_TOLERANT` port"*. Branch (b) has no age test — it fires for any cached value, so the `STALE_TOLERANT(60s)` in the same sentence is decorative. There is no third branch for "the cached value is older than the tolerance this port was granted". The `retry_after_ms = 2000` and `cause = <port>` fields in branch (a) imply an error path, but nothing says a `STALE_TOLERANT` port whose cache has expired escalates to it.
- **Current behaviour:** undefined — the 1-second-beyond case, which is the entire purpose of writing `max_age`, has no outcome.
- **Impact:** An implementation that honours `max_age` denies 100 % of requests when the `fleet` cache is 61 s old — a self-inflicted outage from a *recovering* dependency, with `retry_after_ms = 2000` telling 37 students to retry into the same wall. An implementation that ignores `max_age` admits on 4-hour-old data, and `FACT_SNAPSHOT.staleness` records the age honestly but the `STALE FACTS` chip (EXPERIENCE §6.3) is the only signal. Either way the tolerance is not enforced by anything.
- **Minimal fix:** Add the third branch to AD-4 verbatim: *"A `STALE_TOLERANT(max_age)` port whose only available value has `age > max_age` MUST be treated as a `FAIL_CLOSED` port error (`DENY`, `R-DEP-01`, `cause = <port>_STALE_EXPIRED`, `retry_after_ms = 2000`)."* Then add the four boundary cases (age = max_age − 1 ms, = max_age, = max_age + 1 ms, = max_age with no cache at all) to `ad4-port-failure.test.ts`, which currently asserts "6 ports × fail/stale" — two modes, neither of which is the age boundary.
- **Invariant touched:** AD-4

### EDGE-28 — Non-round-tripping floats inside `Decision` and `FactSet` void NFR-3's byte-identical guarantee

- **Severity:** Medium
- **Domain:** journal
- **Triggering condition:** Any `float` value in a journaled payload. Concretely: `R-CONTEND-01`'s `QUEUE_ONLY` "earliest estimated wait", and the freeze preview's `reclaimed_gpu_hours = 8.5` (`scenario-4` §3.2).
- **Path:** NFR-3 requires *"100% byte-identical `Decision` for the same (request, fact snapshot, policy_version) over 10 000 replays"*, measured by *"Golden-file replay harness; byte comparison"*. `CONSTRAINT.value` and all of `FACT_SNAPSHOT` are `jsonb`. Postgres `jsonb` stores numbers as `numeric` and re-renders them with its own precision and scale rules, which are not IEEE-754 round-trip rules; Node's `JSON.stringify` emits the shortest round-trippable decimal, which `numeric` will happily widen to trailing zeros. §7's Validation applies Zod to *"the request boundary and on every fixture"* — the `Decision` write path is not a request boundary. FR-8 forbids float comparison for the quota balance (*"comparison is on integers, never floats"*) but that discipline is stated for one field; the wait estimate and the GPU-hours are unconstrained, and the wait estimate is computed from a `STALE_TOLERANT(60s)` fleet read, so it is a float derived from a float.
- **Current behaviour:** undefined — no numeric representation rule for the `Decision` contract.
- **Impact:** `ad8-idempotence.test.ts` and the NFR-3 harness will fail intermittently across the SQLite→Postgres adapter swap that §7 explicitly plans (*"The port is identical, so the swap is an adapter"*), and the failure will look like a determinism bug in the engine. AD-8's "bit-identical" and NFR-3's "byte-identical" both rest on it.
- **Minimal fix:** State in AD-8: *"Every numeric field in `Decision`, `Constraint`, and `FactSet` MUST be an integer with an explicit unit in the field name (`*_seconds`, `*_count`, `*_millis`), or a fixed-point decimal with a declared scale; no IEEE-754 double may cross the journal boundary."* Convert `QUEUE_ONLY.earliest_wait_seconds` and the preview's `reclaimed_gpu_seconds`. Add a golden-file round-trip test that writes through **both** the SQLite and Postgres adapters and compares bytes, so the swap is a covered path rather than a discovery.
- **Invariant touched:** AD-8, AD-1

### EDGE-29 — The journal's total order ties break on a random uuid, and `POLICY_VERSION.published_seq` is never consumed

- **Severity:** Medium
- **Domain:** journal
- **Triggering condition:** Two decisions with the same `evaluated_at`. Guaranteed by the console's clock override: `scenario-3` E-2 and E-3 are **both** at `02:00:00.000`.
- **Path:** AD-8: ordering *"MUST be a total order (`evaluated_at`, then `decision_id`)"*. `decision_id` is a fresh `uuid` minted per evaluation, so the tiebreak is random. The order is *total* (satisfying the letter of the invariant) and *arbitrary* (violating its purpose, which is the reproducibility of a reader's view). Consequences: (i) `scenario-3` §3.5's side-by-side three-evaluation teaching artefact and UX-3's Journal sort order for the override case are non-reproducible; (ii) NFR-3's golden-file replay cannot pin the order of tied rows — the fixture must encode the original insertion order separately, and nothing says it does; (iii) a query spanning a version change interleaves v41 and v42 rows with no version-aware key, and `GET /policy/decisions` (§5.1) has no `policy_version` filter at all, so a reader comparing denial rates before and after a rule change has no way to segment except by reading every row. `POLICY_VERSION.published_seq "monotonic"` exists in the schema and no rule, query, or test consumes it.
- **Current behaviour:** specified as a total order; the arbitrariness and the unused version axis are both unaddressed.
- **Impact:** `ad8-idempotence.test.ts` passes only because it re-runs one query against unchanged data. The "pre/post version" comparison that §5.1's `policy.version.published.v1` exists to enable (`changed_rule_ids` — *"so a stale console can say what changed"*) has no query surface.
- **Minimal fix:** Add a monotonic `journal_seq BIGINT` assigned at insert, make the order `(evaluated_at, journal_seq)`, and include it in the returned projection so a cursor can use it. Add `policy_version` to the `GET /policy/decisions` filter set and a `version_boundary` marker to the response when the window spans a publication. Use `published_seq` for the console's "decisions before/after v42" split, which is what it was added for.
- **Invariant touched:** AD-8, AD-7

### EDGE-30 — `DRAFT` freezes have no TTL, no timestamps, and a past-window draft is activatable

- **Severity:** Medium
- **Domain:** freeze
- **Triggering condition:** (a) Dr. Reed abandons a draft on her phone and never returns. (b) A draft whose `ends_at` is in the past is previewed and activated.
- **Path:** §9.1's lifecycle has no exit from `DRAFT` other than `activate`, and `FREEZE` declares no `created_at`, no `updated_at`, and no expiry — while the PRD's own `FreezeState` domain model *does* declare `activated_at`, so the schema has silently dropped a field the domain model requires and the audit therefore cannot show *when* a freeze was activated (only `activated_by`). A stale draft is invisible: E-NOT-YET says *"No freeze is active"* and lists only the standing rule set, so a draft covering today is never surfaced. For (b), the only freeze validation named is `E-VALIDATION` *"ends_at must be after starts_at"*, checked in the console; the API's `POST /policy/freezes` failure list has no `ends_at > campus_now` check at all, and a `preview_token` binds a *draft hash*, not a clock.
- **Current behaviour:** specified for the console path; unspecified for the API path.
- **Impact:** An abandoned irreversible-action draft is a loaded gun that the console does not show. A past-window activation emits `policy.freeze.activated.v1` and a gateway cache invalidation for a freeze that never applies, polluting the audit that `scenario-4` §3.5 promises will let an operator "prove from the journal exactly who did what" — with a row that says someone froze the fleet when they did not.
- **Minimal fix:** Add `created_at` and `expires_at` to `FREEZE` (and restore `activated_at` to match PRD §5); add a server-side `CHECK`-equivalent validation `ends_at > campus_now` and `starts_at ≥ campus_now − 24 h` on `POST /policy/freezes` returning `400 WINDOW_IN_PAST`; expire `DRAFT` rows older than 24 h in the same non-blocking reconciliation that AD-9's fix introduces; surface a "1 draft in progress, expires <t>" chip on UX-4 rather than leaving drafts invisible.
- **Invariant touched:** AD-8, AD-1

### EDGE-31 — `preview_token` is not single-use and its TTL edge is unstated

- **Severity:** Medium
- **Domain:** concurrency
- **Triggering condition:** The same token is presented twice — the double-tap from EDGE-17, a scripted retry, or two operators sharing a console.
- **Path:** §5.1: the token is *"a hash of the draft freeze bound to a 60 s TTL, and activation is rejected without it"*. Nothing marks it consumed. The `409 duplicate active freeze` that would catch the identical-scope case is a read-then-write check (EDGE-17), and it does not fire for a *different* scope — so the same token mints two `ACTIVE` freezes with different scopes and one `activated_by`, which is EDGE-11's union/intersection ambiguity with real production data behind it. The TTL edge is also unstated: `≤ 60 s` or `< 60 s`? A request that computes its blast radius at 59.9 s and reaches the store at 60.1 s has either activated an unpreviewed draft or produced a `400` after Dr. Reed has already pressed the button on the irreversible action — the console's E-VALIDATION row for this route is not specified (EXPERIENCE §5 UX-4 specifies only the `ends_at` and scope validators).
- **Current behaviour:** specified as a precondition; unspecified as a single-use token and at its own boundary.
- **Impact:** The gate that `scenario-4` §3.2 calls the only thing making the destructive action safe (*"the one irreversible action in this module"*) is replayable within its own validity window.
- **Minimal fix:** Make the token single-use: persist `consumed_at` in the same transaction as the activation, and return `409 TOKEN_CONSUMED` on a second presentation. State the TTL comparison as `issued_at + 60 s > now` (i.e. valid *at* 60 s) and add a console validator `E-VALIDATION` row for `PREVIEW_EXPIRED` with a one-tap "recompute blast radius" recovery. Bind the token to `actor_id` (EDGE-7).
- **Invariant touched:** AD-5

### EDGE-32 — There is no read route for a single freeze, so `freeze_id` is unresolvable on the audit surface

- **Severity:** Medium
- **Domain:** freeze
- **Triggering condition:** A journal row carries `primary_rule_id = R-FRZ-01` and a `freeze_id`; the auditor opens it.
- **Path:** §5.1 exposes `POST /policy/freezes/preview`, `POST /policy/freezes`, `POST /policy/freezes/{id}/lift` — and **no `GET`**. The journal is filterable by `freeze_id` (UX-3's frozen-filter chip, and `scenario-4` §3.6's "the Journal tab gains a frozen-filter chip `freeze_id = FRZ-2026-04-09-001`"), and `GET /policy/decisions/{id}` returns the decision + snapshot, but the referenced freeze's `reason`, `allowances`, `activated_by`, and `ends_at` are unreachable over the public API. The same gap hits the console's own copy: E-NOT-YET must render "the next scheduled protected window", and UX-4's success state needs a live countdown to `ends_at` for a freeze loaded from a journal link. It also makes the in-flight-lift case unresolvable: a decision citing a freeze that was lifted 20 ms after the fact snapshot is honest, but the auditor has no route to learn that it was lifted, or when, or why.
- **Current behaviour:** unspecified — the aggregate has write and lifecycle routes but no read route.
- **Impact:** The audit surface can prove *that* a freeze denied 37 requests but not *what the freeze was*, which is the half of the promise in `scenario-4` §3.5 (*"the journal shows exactly who froze what, when, with which reason"*) that lives outside the journal table.
- **Minimal fix:** Add `GET /policy/freezes` (list, filterable by `state`/`scope`/`from`/`to`) and `GET /policy/freezes/{id}` returning scope, window, `allowances`, `reason`, `activated_by`, `activated_at`, `lift_reason`, `lifted_by`, `supersedes`, and the computed lifecycle state from EDGE-9's helper. Both are read-only and are already authorised by the module's `SELECT` grant; specify their `403` under EDGE-7's fix. `POST /policy/freezes/{id}/lift` must keep its 60 s-token sibling requirement.
- **Invariant touched:** AD-8, AD-5

### EDGE-33 — Three declared facts have no consuming rule, and one of them hides a class-displacement hole

- **Severity:** Medium
- **Domain:** limits
- **Triggering condition:** (a) A protected window with `required_node_count = 26` on a 24-machine reservation, at 08:00. (b) Any request from an `ActorKind: SYSTEM` actor. (c) Any `EVALUATION` workload evaluated outside 22:00–06:00.
- **Path:** (a) `ProtectedWindow.required_node_count` is read by **no rule**. `R-LAB-01` tests containment only; `R-CONTEND-01` tests availability; `R-TIER-01` tests feasibility. So an impossible reservation is invisible, and the window's protection has no counterpart obligation — the class is not guaranteed its 24 nodes. `R-LAB-01` exempts `INTERACTIVE_INFERENCE` outright, and `exam_binding` only ever *exempts*; nothing requires a request to be covered by the window it consumes. So at 08:01 any student submitting an interactive notebook is admitted onto the very nodes the class needs, with no rule, no constraint, and no `WINDOW_SCOPE`, and the freeze console's blast radius cannot see it because it is not a freeze. (b) PRD §2.3 states SYSTEM actors "carry a narrower rule set (no `CONSTRAIN` upgrade, no freeze allowance)"; that rule set is enumerated nowhere, and 5 of the 14 rules are `CONSTRAIN` upgrades (see EDGE-12). (c) `R-NIGHT-01`'s condition is `workload_kind ∈ {TRAINING, BACKGROUND_BATCH}`; `A-6` fixes four kinds; `R-LAB-01` covers `EVALUATION` but `R-NIGHT-01` does not, and no document states why an `EVALUATION` sweep at 14:30 is not "low-priority background load" in the sense §6.2's ordering rationale uses.
- **Current behaviour:** declared as data with no reader.
- **Impact:** (a) is a real displacement path that FR-4's acceptance condition cannot see, because FR-4 only tests `TRAINING`/`BACKGROUND_BATCH`/`EVALUATION` inside the window and `INTERACTIVE_INFERENCE` outside it. (b) and (c) are undocumented policy gaps that a new `workload_kind` or `ActorKind` will widen silently — exactly the "no rule covers this request" class AD-1 was designed to make visible, arriving on a path where no rule is even looking.
- **Minimal fix:** (a) Add `R-LAB-02` at precedence 7 (adjacent to `R-LAB-01`): if `campus_now` is inside a window and the request is not covered by that window's reservation, emit `CONSTRAIN → WINDOW_SCOPE` bounded by `required_node_count − committed_non_window_demand`, and raise an operator alert at window start when `required_node_count > available_count`. (b) Publish the SYSTEM rule filter as registry data (EDGE-12) and add the three dead fields to a boot-time "every declared fact field is read by ≥ 1 rule" assertion — the same class of check as AD-2's registry validator, generalised to the data model. (c) State the exclusion rationale for `EVALUATION` in §6.2's ordering rationale, or add it to `R-NIGHT-01`.
- **Invariant touched:** AD-1, AD-3

### EDGE-34 — `TRACE_ENTRY.state = INDETERMINATE` is never produced and is not counted by AD-1's assertion

- **Severity:** Low
- **Domain:** journal
- **Triggering condition:** Any request where a rule's inputs are present but not decidable.
- **Path:** The schema declares `state "MATCH|NO_MATCH|NOT_EVALUATED|INDETERMINATE"`. AD-1's enforcement is: *"`NOT_EVALUATED` count equals the number of rules below the primary"* (`ad1-attribution.test.ts`). No rule emits `INDETERMINATE` — the walk's `alt` has two arms (`terminal outcome` / `NO_MATCH`), AD-4's branches produce `DENY` or `STALE` (never a per-rule `INDETERMINATE`), and NFR-12's phrase *"fail-closed on indeterminate facts"* is a fact-level concept that never reaches the trace. So the state is dead schema, and the `NOT_EVALUATED` count assertion has an unstated assumption that the other two are the only possibilities. PRD §6.1's algorithm step 3 does say *"every rule reports MATCH | NO_MATCH | INDETERMINATE"* — so the PRD promises a state the architecture never produces and the architecture's schema promises a fourth state the PRD never produces. Two documents, three states, four declarations.
- **Current behaviour:** undefined and inconsistent across the two documents; unreachable in practice.
- **Impact:** Hygiene. A future implementer who *does* emit `INDETERMINATE` for a partially-read fact set breaks `ad1-attribution.test.ts` (which counts only `NOT_EVALUATED` below the primary) without knowing why.
- **Minimal fix:** Delete `INDETERMINATE` from `TRACE_ENTRY.state` and from PRD §6.1 step 3, or adopt it: require that a rule reading a `STALE`-marked fact emits `INDETERMINATE` rather than `NO_MATCH`, and amend AD-1's assertion to count `NOT_EVALUATED` as *"every rule below the primary, regardless of state"*. Add the state to the `ad1-attribution.test.ts` vocabulary check.
- **Invariant touched:** AD-1

### EDGE-35 — `GET /policy/rules` has no `version` parameter, so the console cannot implement UX-2's documented recovery

- **Severity:** Low
- **Domain:** limits
- **Triggering condition:** The console is pointed at a policy version that fails to load, or a rule catalogue is opened after a publication.
- **Path:** EXPERIENCE §5 UX-2's Error state: *"Policy version 42 failed to load; showing frozen version 41. Decisions evaluated now use version 41."* §5.1 offers `GET /policy/rules` ("The active rule set") and `GET /policy/versions/{v}` ("One frozen version"). The console may only use the public REST API (FR-14, §7 Console), so the *shape* of version 41's catalogue must be reachable over HTTP — but `GET /policy/rules` takes no parameter and returns only the active set, and the failure it is recovering from is precisely that the active set cannot be fetched. `GET /policy/versions/{v}` returns the frozen version but the API does not state whether it includes the rendered rule records (precedence, conditions, citations) or only the manifest, so it may not be substitutable. UX-2's Success footer ("next change pending: 0") and `Compare versions` also have no surface: the only version data published is `policy.version.published.v1` on the bus, which the console does not consume (D-2 defers tracing, not this).
- **Current behaviour:** unspecified — a documented UI recovery with no documented API to perform it.
- **Impact:** Hygiene, with an operational tail: a console that cannot render the previous catalogue during an incident shows an empty rule set, and UX-2's Empty state explicitly says that path is *"not reachable in V1"* — so the fallback does not exist either.
- **Minimal fix:** Add an optional `?version=` to `GET /policy/rules` defaulting to the active version, and state that `GET /policy/versions/{v}` returns the full rule records for that version (it already must, for the "byte-frozen forever" claim to be checkable). Add `GET /policy/versions?since_seq=` so `published_seq` (EDGE-29) has a reader and UX-2's "next change pending" chip has a source.
- **Invariant touched:** AD-7

## Findings summary table

| ID | Sev | Domain | Invariant | One-line issue |
|---|---|---|---|---|
| EDGE-1 | Critical | precedence | AD-1, AD-6, AD-2 | No rule yields `ALLOW`; AD-1 mandates `DENY` on an empty walk while scenario-3 concludes `ALLOW`; `R-DEP-01`/`R-NO-RULE-MATCH` are unvalidated by AD-2/AD-6 |
| EDGE-2 | Critical | bounds formula | AD-3, AD-5 | The 300 s grace makes `valid_until ≤ campus_now` constructible; the constructor rejects only `null`, and no constraint names the truncated bound |
| EDGE-3 | Critical | bounds formula | AD-3, AD-5 | `now + duration == boundary.starts_at` is not a straddle, so no `must_checkpoint_by` exists and `valid_until` is only checked at launch — the job runs into the class |
| EDGE-4 | Critical | bounds formula | AD-3, AD-1 | `end_of_enclosing_access_window` has no definition, no fact source, and no entity in the data model |
| EDGE-5 | Critical | ports | AD-4, AD-1 | A 200-with-truncated-body makes `available_count − cordoned_count = NaN`; `NaN ≤ 0` is false, so `R-CONTEND-01` silently no-matches and the engine fails open |
| EDGE-6 | Critical | ports | AD-4 | `fleet` is the only fail-open port and is the sole evidence for the `R-TIER-01` DENY; AD-4 and NFR-12 assign opposite classifications |
| EDGE-7 | Critical | freeze | AD-1, AD-5 | Freeze create/preview/lift have no role authorisation and no `403`; a 60 s freshness token is the only gate on the module's one irreversible action |
| EDGE-8 | Critical | time | AD-3, AD-4 | `CampusClock` has no quality/stratum contract; a negative age passes `FAIL_CLOSED(0)`, so a backward step walks around an active freeze |
| EDGE-9 | Critical | temporal | AD-1, AD-3 | `R-FRZ-01`'s condition has no half-open window test, so a stored `state='ACTIVE'` never expires and can deny the fleet forever |
| EDGE-10 | Critical | unhandled | AD-1, AD-3, AD-4 | The console clock override required by EXPERIENCE law 5 / FR-14 has no API surface, no authorisation, and no audit record, and AD-1's ban list does not cover a caller-supplied clock |
| EDGE-11 | High | freeze | AD-1, AD-3 | Freeze scope composition for multi-array scopes is undefined (union vs intersection) and `FREEZE` has no `CHECK` on `jsonb_typeof` or cross-column consistency |
| EDGE-12 | High | limits | AD-1 | `R-TIER-02`/`R-TIER-03` have no comparison for a null or unbounded `ActorKind: SYSTEM` cap; SYSTEM's "narrower rule set" is never enumerated |
| EDGE-13 | High | limits | AD-1, AD-4 | An unknown `model_ref` falls through to `R-NO-RULE-MATCH` with a nonsensical cause, and a catalog `404` is neither a port error nor a stale fact under AD-4 |
| EDGE-14 | High | ports | AD-4 | An actor `404` is classified as a port fault, so a missing account renders as `E-SYSTEM` with `retry_after_ms` instead of an authorization `DENY` — and the fail-open reading admits it |
| EDGE-15 | High | precedence | AD-1, AD-6, AD-8 | `CANNOT_EVALUATE` and the constraint-expansion throw have no rule, no template, no `403`-shaped API contract, and no journal row |
| EDGE-16 | High | concurrency | AD-5, AD-8 | No idempotency key on `POST /policy/decisions`: a retry yields two `ALLOW`s, two SIGTERM obligations, and double-counted freeze blast radii |
| EDGE-17 | High | concurrency | AD-1 | Concurrent activation of the same scope is a read-then-write check with no unique index or CAS; both commit and both apply |
| EDGE-18 | High | journal | AD-8 | `GET /policy/decisions` defines no cursor (live-window pagination is unsound) and no range predicate for `from == to` / `from > to` |
| EDGE-19 | High | journal | AD-8, AD-5 | `derived_from` does not record the acting principal, so an auto-submitted variant is either invisible to the requester or indistinguishable from her own submission |
| EDGE-20 | High | journal | AD-8, AD-6 | A snapshot can be evicted or lost (non-atomic write, no retention constraint), so a `DENY` outlives the evidence needed to reproduce it |
| EDGE-21 | High | temporal | AD-3, AD-1 | The `campus_now` capture point relative to the other five ports is unspecified, leaving 150 ms of window drift in a 1 ms-precision policy |
| EDGE-22 | High | time | AD-3, AD-7, NFR-3 | `CAMPUS_TZ`/tzdata are outside the effective fact set and outside `content_hash`, so a tzdata change silently redefines the wall-clock night window with no version and no diff |
| EDGE-23 | Medium | precedence | AD-3, AD-1 | AD-3's `superseded` non-binding bounds are unreachable for rules AD-1's break skipped, so the two-deadline card cannot render when both rules match |
| EDGE-24 | Medium | ports | NFR-1 | The 150 ms port cap makes NFR-1's p99 ≤ 50 ms unreachable whenever any port is slow; the abort-vs-stop-waiting semantics are also unstated |
| EDGE-25 | Medium | ports | AD-1, AD-4 | No per-request isolation or cache-key contract for the assembled `FactSet`; a mis-keyed fact yields a wrong-person decision with a clean trace |
| EDGE-26 | Medium | ports | AD-4 | AD-4's fixed three-way split and FR-10's tolerance table classify `actor`/`schedule`/`quota` differently, and neither says whether an over-age *successful* read is stale |
| EDGE-27 | High | ports | AD-4 | A `STALE_TOLERANT` cached value beyond `max_age` has no defined outcome — the tolerance is decorative in the only branch that uses it |
| EDGE-28 | Medium | journal | AD-8, NFR-3 | No numeric representation rule for the `Decision` contract; `jsonb` float round-tripping breaks the byte-identical guarantee across the SQLite→Postgres swap |
| EDGE-29 | Medium | journal | AD-8, AD-7 | The total order ties break on a random uuid (scenario-3 has two decisions at `02:00:00.000`) and `published_seq` is never consumed |
| EDGE-30 | Medium | freeze | AD-8, AD-1 | `DRAFT` freezes have no TTL and no `created_at`/`activated_at` (the latter is in the PRD's domain model but not the schema), and a past-window draft is activatable over the API |
| EDGE-31 | Medium | concurrency | AD-5 | `preview_token` is not single-use and its 60 s TTL comparison is unstated at the exact boundary |
| EDGE-32 | Medium | freeze | AD-8, AD-5 | No `GET /policy/freezes[/{id}]`, so a journal row's `freeze_id` — the audit's other half — is unresolvable over the public API |
| EDGE-33 | Medium | limits | AD-1, AD-3 | `required_node_count`, SYSTEM's narrowed rule set, and `EVALUATION`'s night exclusion are declared with no consuming rule; the `INTERACTIVE_INFERENCE` exemption lets any interactive request displace a class |
| EDGE-34 | Low | journal | AD-1 | `TRACE_ENTRY.state = INDETERMINATE` is never produced and is not counted by AD-1's `NOT_EVALUATED` assertion; the PRD and the schema each declare a different third state |
| EDGE-35 | Low | limits | AD-7 | `GET /policy/rules` has no `version` parameter, so UX-2's documented "showing frozen version 41" recovery has no API to perform it |

## Boundary sweep results (the 1 ms table)

`✔` = specified and internally consistent · `✘` = unhandled (finding id) · `—` = not a temporal rule · `◐` = specified but the underlying predicate is unspecified (EDGE-22)

| Rule | t = start−1 ms | t = start | t = end−1 ms | t = end | Specified? |
|---|---|---|---|---|---|
| 1 `R-FRZ-01` (freeze `DENY`) | ✔ EC-4.1 | ✔ inside | ✔ EC-4.2 | ✔ EC-4.2 | Partially — the *window* test is missing from the rule's condition (EDGE-9); scope composition undefined (EDGE-11) |
| 2 `R-TIER-01` (fleet infeasible) | — | — | — | — | ✔ no temporal predicate; but its sole fact is the one fail-open port (EDGE-6) and a truncated payload yields `NaN` (EDGE-5) |
| 3 `R-TIER-02` (clearance) | — | — | — | — | ✔ (cap comparison) for HUMAN; ✘ for `ActorKind: SYSTEM` / null cap (EDGE-12) |
| 4 `R-TIER-03` (variant) | — | — | — | — | ✔ for HUMAN; ✘ same (EDGE-12); unknown model ✘ (EDGE-13) |
| 5 `R-AUTH-01` (entitlement/licence) | — | — | — | — | ✔; unknown actor is classified as a port fault (EDGE-14); licence read from a 24 h-stale catalog |
| 6 `R-AUTH-02` (role tier) | — | — | — | — | ✔ (A-4 total order); SYSTEM tier undefined (EDGE-12) |
| 7 `R-LAB-01` (protected window) | ✔ AD-3 | ✔ inside | ✔ inside | ✔ outside (NP-3) | ✔ for instants; ◐ spring-forward asserted (NP-4), fall-back not (EDGE-22); `required_node_count` unread (EDGE-33) |
| 8 `R-NIGHT-01` (night window) | ✔ EC-3.1 (`21:59:59.999` → DENY) | ✔ EC-3.2 (22:00:00.000 → not denied) | ✔ EC-3.3 (05:59:59.999 → not denied) | ✔ EC-3.4 (06:00:00.000 → DENY) | ✔ for wall time, ◐ for the *predicate*: it is the only rule with no `starts_at`/`ends_at`, so AD-3's universal clause does not cover it and no other invariant specifies it (EDGE-22). `EVALUATION` excluded (EDGE-33) |
| 9 `R-GRACE-01` (8 h horizon) | ✔ Δ ≤ 8h fires (FR-6) | — | ✔ Δ = 8 h 00 m 00.001 s does not fire | ✘ Δ < 300 s emits `must_checkpoint_by` in the past (EDGE-2) | ✔ horizon, ✘ inner bound |
| 10 `R-STRADDLE-01` (straddle) | ✘ `now+dur = end−1ms`: no straddle, no `must_checkpoint_by` (EDGE-3) | — | ✘ `now+dur = end`: same (EDGE-3) | ✔ `now+dur > end` → `CONSTRAIN`, `must_checkpoint_by = end − 300 s` (EC-3.5/3.7) | Boundary *defined* (FR-7) but the definition yields the module's headline failure (EDGE-3) |
| 11 `R-QUOTA-01` (`remaining ≤ 0`) | — | ✔ `= 0` → DENY (FR-8) | — | — | ✔ integers only (FR-8); ✘ `remaining` missing from a truncated payload → `undefined ≤ 0` is false → no DENY (EDGE-5) |
| 12 `R-QUOTA-02` (`0 < rem < need`) | — | ✔ | ✔ | ✔ | ✔; same `undefined` hole (EDGE-5); `need` from a 5 s-stale fact is undefined under AD-4 vs FR-10 (EDGE-26) |
| 13 `R-CONTEND-01` (`avail − cord ≤ 0`) | — | ✔ | ✔ `= 0` → `QUEUE_ONLY` | ✔ `< 0` (torn read) → `QUEUE_ONLY` | ✔ for integers; ✘ `NaN` fails open (EDGE-5); ✘ `avail` beyond `STALE_TOLERANT(60s)` undefined (EDGE-27) |
| 14 `R-FRZ-02` (allowance) | ✔ EC-4.5 (no match → DENY) | ✔ exact match → `CONSTRAIN` | ✔ EC-4.6 (`R-AUTH-01` outranks it) | ✔ expiry with the freeze (EC-4.2) | ✔ exact-match semantics; ✘ `allowances` shape unconstrained (EDGE-11); ✘ 24 h-stale catalog can mis-derive the binding (EDGE-13) |

**Swept and discarded as already handled** (recorded so the next reader does not re-walk them): zero-length and inverted windows (AD-3's hard validation failure); a window or freeze entirely in the past (NP-7, EC-4.2's "computed from the clock"); `expected_duration_min` 0 / −5 / 4321 (EC-3.10, FR-1); `requested_gpu_count` 0 / 9 (FR-1) and `requested_vram_gb_per_gpu = 32` (EXPERIENCE E-VALIDATION); 149 ms vs 151 ms (FR-10's "exceeds 150"); a `derived_from` cycle and a deleted parent (unreachable under AD-8's no-`UPDATE` grant); ordering across a backward clock step (AD-8's trade-off declares the ordering artefact, EDGE-8 covers only the freeze bypass); spring-forward inside a lab window (NP-4); `campus_now` at Feb 29 23:59:59.999 (instant comparison, no date arithmetic).

## What I could NOT attack (declared blind spots)

- **Implementation.** No code, schema DDL, fixture set, or OpenAPI file exists yet. Every finding is a gap in the *specification*; several (EDGE-5, EDGE-25, EDGE-28) would be caught by a test the architecture has not yet specified rather than by a change to the architecture, and I have deliberately not guessed at which.
- **The predicate vocabulary.** §8.1 option A notes the "small interpretive tax" of data-defined rules and that "expressing an exotic condition means extending the predicate vocabulary". The vocabulary itself is not in any document, so I could not walk the *inside* of `when` clauses — only their stated conditions. EDGE-12 and EDGE-33 are the visible consequences of that omission; a full predicate-level sweep is impossible until the vocabulary is published.
- **`PORT` adapter semantics.** Retry policy, connection pooling, TLS, and per-port circuit breaking are not specified. EDGE-24 touches the timeout semantics; backoff, retry counts, and how a retry interacts with the 150 ms cap (a retried port almost certainly exceeds it) are entirely unaudited.
- **The horizontal pool.** AD-1 names it as the source of its worst failure, but no process model, leader election, or registry-replication design is given. I walked the *consequences* of non-identical state (EDGE-22 tzdata, EDGE-17, EDGE-16) and could not walk the replication itself.
- **The delegates.** M9, the K8s/Kubeflow Bridge, and the gateway have no contracts here. EDGE-2, EDGE-3, and EDGE-16 assume the delegate behaves as PRD §9.2 describes; if any delegate re-checks `valid_until` *periodically* rather than at launch, EDGE-3's severity drops from Critical to Medium. I had to assume the documented behaviour.
- **OQ-1 through OQ-4 and assumption A-3.** `OQ-1` (who grants `EXAM_OVERRIDE`) is unresolved and `A-3` (campus timezone) is marked `[RISKY]` with "Confirm with Dr. Reed" still open. EDGE-22 and EDGE-33's findings are conditional on those answers; I reported the specification gaps, not a guess at the values.
- **The 33-GPU fleet arithmetic.** Node-class capacity figures appear only in scenario fixtures. I checked the *shape* of the class comparison (EDGE-12, EDGE-33) and not whether the fixture classes are mutually consistent.
- **`derived_from` depth and the auto-submit action.** UX-1 Flow 02 and scenario-3 §3.4 require the engine to submit on the user's behalf, but no request-construction contract, authority contract, or consent record is specified for that path beyond OQ-2's advisory acknowledgement. EDGE-19 covers only the journal's visibility of it; the authorisation to act for a user is a blind spot I could not close.
- **Non-decision surfaces.** `GET /health`, `GET /ready`, the OpenAPI document's own validity, the OpenSSL/TLS posture, rate limiting, and the WebSocket/vault boundary are outside the decision path and outside the paths I was asked to walk.
