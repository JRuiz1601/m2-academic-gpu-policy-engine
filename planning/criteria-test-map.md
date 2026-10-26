# Acceptance criteria to test map

Date: 2026-10-21 (regenerated in task P5-FIX-5; rows 1.2 criterion 8 and 2.1 criterion 11 added in task P5-TRIAGE-1; restructured to 16 stories in task P5-RESTRUCT-1, decision DL-56: story 5.2 is now 4.5, stories 5.1, 5.3 and 5.4 are now 4.4, and the measurement plans of the former story 4.4 are now criteria 7 to 9 of story 4.2). One row per acceptance criterion of the 16 stories in `planning/epics.md` (86 rows). The test ids are those of `test/atdd/m2_contracts.test.ts` and `test/atdd/m2_domain.test.ts`; `test/story-index.json` and `test/traceability-matrix.md` list the same ids per story.

Status values: `executable red` (a test in `test/atdd/` fails today with `NotImplementedError` and will pass when the behaviour exists), `measurement plan, not executable` (a plan in `test/nfr-evidence.md`, no test now), `no test: reason`. A criterion marked `no test: test planned for implementation` names the planned test id and its file; the test does not exist yet.

Where a test covers only part of a criterion, the summary says which part has no test.

| Story | Criterion # | Short summary | Executable test id(s) in `test/atdd/` | Status |
|---|---|---|---|---|
| 1.1 | 1 | Valid inference request at 22:00 with only `R-ALLOW-01` loaded returns 200 ALLOW/ADMITTED with one decision and one outbox row | EV-Q1 | executable red |
| 1.1 | 2 | Missing `Idempotency-Key` returns 400 `IDEMPOTENCY_KEY_MISSING`, no row, no event | EV-P2 | executable red |
| 1.1 | 3 | `/health` and `/ready` answer without a session; a failed check gives 503 `READY_CHECK_FAILED` | none (planned: HR-Q1, HR-P1 in `test/atdd/m2_contracts.test.ts`) | no test: test planned for implementation |
| 1.1 | 4 | A call to `POST /policy/decisions` without a session is refused with `UNAUTHENTICATED` and writes nothing (HTTP status not fixed) | none (planned: AUTH-U-1 in `test/atdd/m2_contracts.test.ts`) | no test: test planned for implementation |
| 1.1 | 5 | Body that does not parse (`expected_duration_min` 1.5) returns 400 `WIRE_SHAPE_INVALID`, no row, no event | EV-P1 | executable red |
| 1.2 | 1 | Quota below need returns `QUOTA_CAP` = balance, PROVISIONAL, with evidence and citation | EV-Q2, EV-EX1, DM-AD1, DM-AD5, DM-AD6 | executable red |
| 1.2 | 2 | Duplicate rule precedence is refused at boot with `DUPLICATE_PRECEDENCE` | DM-AD2 | executable red |
| 1.2 | 3 | Tier gate: `R-TIER-02` DENY, `R-TIER-03` MODEL_VARIANT, `R-TIER-01` NO_SUCH_HARDWARE | EV-TIER-01, EV-TIER-02, EV-TIER-03 | executable red |
| 1.2 | 4 | `suppressed[]` lists the rule that was not evaluated with the fact that would have fired it | none (planned: EV-SUPP-01 in `test/atdd/m2_contracts.test.ts`) | no test: test planned for implementation |
| 1.2 | 5 | The import allow-list check fails when `policy/core` imports a forbidden package | none (planned: DM-PURE-01 in `test/atdd/m2_domain.test.ts`) | no test: test planned for implementation |
| 1.2 | 6 | FR-3 clause 3: a RESEARCHER with a 48 GB cap gets ALLOW for the request a STUDENT is refused | none (planned: EV-TIER-04 in `test/atdd/m2_contracts.test.ts`) | no test: test planned for implementation |
| 1.2 | 7 | FR-13: `evaluate()` with fixtures unreadable and no network gives 10 000 identical outputs | none (planned: DM-PURE-02 in `test/atdd/m2_domain.test.ts`) | no test: test planned for implementation |
| 1.2 | 8 | An ALLOW decision carries a citation, a rationale that contains the primary rule id and evidence in the trace entry of that rule (the Success card is story 4.4) | EV-Q1 | executable red |
| 1.3 | 1 | Three simultaneous equal requests with one key yield one decision and one outbox row | EV-I1 | executable red |
| 1.3 | 2 | Same key with a different body returns 409 `IDEMPOTENCY_BODY_MISMATCH`; same key after 24 h returns 409 `IDEMPOTENCY_KEY_EXPIRED` | EV-P3, EV-P4 | executable red |
| 1.3 | 3 | The database role has only INSERT and SELECT on the append-only tables (PostgreSQL profile) | none (planned: DB-GRANT-1 in `test/atdd/m2_contracts.test.ts`) | no test: test planned for implementation |
| 2.1 | 1 | TRAINING at 22:00 for 800 min before a 10:00 class: CONSTRAIN bound 05:55; at 10:00 DENY `R-LAB-01`; journal holds both | EDGE-NIGHT, EDGE-1000, EDGE-FINAL, DM-BOUND, DM-START | executable red |
| 2.1 | 2 | TRAINING at 21:58 is DENY `R-NIGHT-01`, no ALLOW invented | EDGE-2158 | executable red |
| 2.1 | 3 | A THESIS window as governing boundary gives CONSTRAIN by `R-BOUND-01` (scenario S-8). `EDGE-NIGHT` tests the mechanism with class windows; no test distinguishes the THESIS kind (declared coverage gap) | none (planned: EDGE-THESIS in `test/atdd/m2_domain.test.ts`) | no test: test planned for implementation |
| 2.1 | 4 | Exam window refuses a request that is not exam bound: DENY `R-LAB-02` | EV-LAB-02 | executable red |
| 2.1 | 5 | FR-7 clause 1: EVALUATION at 08:00 for 300 min with a lab at 09:00 is bounded at 08:55 | none (planned: EDGE-STRADDLE-1 in `test/atdd/m2_domain.test.ts`) | no test: test planned for implementation |
| 2.1 | 6 | FR-7 clause 3: freeze at 03:00 and lab at 09:00 evaluated at 01:00 gives `must_checkpoint_by` 02:55 | none (planned: EDGE-STRADDLE-3 in `test/atdd/m2_domain.test.ts`) | no test: test planned for implementation |
| 2.1 | 7 | FR-7 clause 4: `must_checkpoint_by` equals `valid_until` over 10 000 generated contexts | none (planned: PROP-DEADLINE-1 in `test/atdd/m2_domain.test.ts`) | no test: test planned for implementation |
| 2.1 | 8 | FR-7 clause 2: TRAINING at 02:00 for 600 min is bounded at 05:55 and the 08:55 lab bound is superseded | none (planned: EDGE-STRADDLE-2 in `test/atdd/m2_domain.test.ts`) | no test: test planned for implementation |
| 2.1 | 9 | FR-4 scope check: a request for another subject at 10:04 is not denied by `R-LAB-01` | none (planned: EDGE-SCOPE-1 in `test/atdd/m2_domain.test.ts`) | no test: test planned for implementation |
| 2.1 | 10 | FR-5: a NIGHT_TRAINING_DAEMON request at 14:30 is not denied by `R-NIGHT-01` | none (planned: EDGE-DAEMON-1 in `test/atdd/m2_domain.test.ts`) | no test: test planned for implementation |
| 2.1 | 11 | NP-9: a bound already in the past gives ALLOW with `valid_until` = `evaluated_at` and a `WINDOW_SCOPE` constraint, never a CONSTRAIN with an expired deadline (ruling DL-54) | DM-NP9 | executable red |
| 2.2 | 1 | Ten sources fetched in parallel with the original instant and at most 40 ms per port. Only the clock read first is asserted; the parallel fan-out and the per-port cap have no test | EV-CLOCK | executable red |
| 2.2 | 2 | Quota port at 41 ms returns DENY `DEPENDENCY_UNAVAILABLE` by `R-DEP-01` with `retry_after_ms` 2000. The 503 `DECISION_NOT_PRODUCED` case for a clock without an instant has no test | EV-DEP | executable red |
| 2.2 | 3 | Failing hardware: DENY `HARDWARE_FAILING` by `R-FLEET-01`, `R-CONTEND-01` NOT_EVALUATED (scenario S-7) | EV-FLEET-01 | executable red |
| 2.2 | 4 | Busy hardware: CONSTRAIN `QUEUE_ONLY` by `R-CONTEND-01`, admission QUEUED | EV-CONTEND-01 | executable red |
| 2.2 | 5 | FR-10 tolerances: Timetable 5 min old gives DENY, Catalog 12 h old proceeds with `stale_facts[]`, fleet is two ports | none (planned: DEP-TOL-01 in `test/atdd/m2_contracts.test.ts`) | no test: test planned for implementation |
| 2.2 | 6 | FR-10 shapes: malformed 200 becomes a transport error, notFound goes to `R-VALID-01`, a doubtful clock gives `R-DEP-01` | none (planned: DEP-SHAPE-01 in `test/atdd/m2_contracts.test.ts`) | no test: test planned for implementation |
| 2.3 | 1 | Balance 5 and need 10 returns `QUOTA_CAP` 5, PROVISIONAL, no side effect (shared with story 1.2) | EV-Q2 | executable red |
| 2.3 | 2 | `actor_ref` different from the session actor returns 200 DENY `INVALID_REQUEST` by `R-VALID-01`, journalled; poisoned facts never leak | EV-I2, EV-PII | executable red |
| 2.3 | 3 | Actor without entitlement to the subject: DENY `NOT_AUTHORIZED` by `R-AUTH-01` | EV-AUTH-01 | executable red |
| 2.3 | 4 | Role below the model requirement: DENY `NOT_AUTHORIZED` by `R-AUTH-02` | EV-AUTH-02 | executable red |
| 2.3 | 5 | System role outside its permitted workload kinds: DENY `NOT_AUTHORIZED` by `R-SYS-01` (scenario S-6) | EV-SYS-01 | executable red |
| 2.3 | 6 | Balance 0 returns DENY `QUOTA_EXHAUSTED` by `R-QUOTA-01`, also when a boundary falls inside the requested duration (ruling DL-50) | EV-EX1, EV-QBOUND-01 | executable red |
| 2.3 | 7 | 100 concurrent requests never exceed `remaining / need` commits | none (planned: QUOTA-CONC-01 in `test/atdd/m2_contracts.test.ts`) | no test: test planned for implementation |
| 3.1 | 1 | Valid draft and LAB_OPERATOR scope: only `preview_run` and audit rows are written, token issued | PV-Q1, PV-Q2 | executable red |
| 3.1 | 2 | Preview that cannot be computed returns 503 `PREVIEW_UNAVAILABLE`, no token, no `preview_run` row | PV-UNAVAILABLE | executable red |
| 3.1 | 3 | `POST /policy/freezes` creates the draft with its outbox and audit rows | none (planned: FD-Q1 in `test/atdd/m2_contracts.test.ts`) | no test: test planned for implementation |
| 3.2 | 1 | Two simultaneous previews of one draft give two distinct tokens, two rows, no freeze | PV-I1 | executable red |
| 3.2 | 2 | Draft read at its `expires_at` returns 409 `DRAFT_EXPIRED` with no new effect | PV-I2, PV-P1, PV-P2 | executable red |
| 3.2 | 3 | `GET /policy/freezes` and `GET /policy/freezes/{id}` return the state; unknown id gives 404 `FREEZE_NOT_FOUND` | none (planned: FZ-READ-1, FZ-READ-2 in `test/atdd/m2_contracts.test.ts`) | no test: test planned for implementation |
| 3.3 | 1 | Valid token at exactly 60 s: 201, token consumed, freeze ACTIVE | AC-Q1, AC-Q2 | executable red |
| 3.3 | 2 | Missing, forged, unmatched, foreign or expired token: 409 `TOKEN_ABSENT`, `TOKEN_ACTOR_MISMATCH` or `PREVIEW_EXPIRED`, no write | AC-P2, AC-TOKEN-FORGED, AC-NO-PREVIEW-ROW, AC-TOKEN-ACTOR, AC-I2 | executable red |
| 3.3 | 3 | Empty reason or revoked role: 400 `MISSING_REASON` or 403 `ROLE_INSUFFICIENT`, no write | AC-P1, AC-ROLE | executable red |
| 3.4 | 1 | Lift of an ACTIVE freeze: LIFTED with its reason, one outbox row, one audit row | LF-Q1 | executable red |
| 3.4 | 2 | Lift with empty reason, on a non-ACTIVE freeze, or below INSTRUCTOR: 400, 409 or 403, no write | LF-P1, LF-P2, LF-P3 | executable red |
| 3.4 | 3 | Lift of an unknown id returns 404 `FREEZE_NOT_FOUND` | none (planned: LF-P4 in `test/atdd/m2_contracts.test.ts`) | no test: test planned for implementation |
| 3.5 | 1 | Eight concurrent activations: one 201 and seven 409; one ACTIVE freeze, outbox and audit consistent | AC-I1 | executable red |
| 3.5 | 2 | Failure after the freeze insert and before commit: full rollback, internal error `TRANSACTION_ABORTED`, token not consumed | AC-ROLLBACK | executable red |
| 3.5 | 3 | Active freeze: request without allowance is DENY `R-FRZ-01`; with a validated allowance it is CONSTRAIN `WINDOW_SCOPE` by `R-FRZ-02` | EV-FRZ-01, EV-FRZ-02 | executable red |
| 3.5 | 4 | An allowance does not admit a request that `R-TIER-02` or `R-AUTH-02` denies: DENY, `R-FRZ-02` NOT_EVALUATED (ruling DL-50) | EV-FRZ-03 | executable red |
| 4.5 | 1 | Freeze console: ACTIVATE is disabled but focusable while the preview loads; the preview card shows its figures and 60 s | none (planned: UI-FRZ-1 in `test/ui/freeze-console.test.ts`) | no test: test planned for implementation |
| 4.5 | 2 | Freeze console: a 503 `PREVIEW_UNAVAILABLE` blocks activation and offers no degraded path | none (planned: UI-FRZ-2 in `test/ui/freeze-console.test.ts`) | no test: test planned for implementation |
| 4.5 | 3 | Freeze console: keyboard-only activation path, focus order and one announcement of the expiry | none (planned: UI-FRZ-3 in `test/ui/freeze-console.test.ts`) | no test: test planned for implementation |
| 4.5 | 4 | Freeze console: one column at 390 px, 44 px targets, countdown pinned, affected figure visible at 400 % zoom | none (planned: UI-FRZ-4 in `test/ui/freeze-console.test.ts`) | no test: test planned for implementation |
| 4.1 | 1 | Version 1 pinned while version 2 is published during the fetch: the decision stays on version 1 | EV-VERSION | executable red |
| 4.1 | 2 | Publish creates `policy_version` 2 with a sha256 hash, immutable, and one `policy.version.published.v1` outbox row | PB-Q1 | executable red |
| 4.1 | 3 | Publish with the event bus down is confirmed, the outbox row stays, no event is published | PB-I1 | executable red |
| 4.1 | 4 | `GET /policy/rules`, `GET /policy/versions`, `GET /policy/versions/{v}`; unknown version gives 404 `VERSION_NOT_FOUND` | none (planned: RV-Q1, RV-P1 in `test/atdd/m2_contracts.test.ts`) | no test: test planned for implementation |
| 4.2 | 1 | Same request, facts and version evaluated twice give byte-identical decisions that cite their rule | DM-AD1, DM-AD6 | executable red |
| 4.2 | 2 | Poisoned identity facts never appear in the decision, snapshot or events | EV-PII | executable red |
| 4.2 | 3 | NFR-3: 10 000 replays of one input are byte-identical, collections in canonical order | none (planned: DM-REPLAY-1 in `test/atdd/m2_domain.test.ts`) | no test: test planned for implementation |
| 4.2 | 4 | NFR-5: 10 000 generated decisions with poisoned fixtures leak nothing | none (planned: EV-PII-2 in `test/atdd/m2_contracts.test.ts`) | no test: test planned for implementation |
| 4.2 | 5 | NFR-12: at least 90 % of requests resolve with exactly one rule matched | none (planned: DM-PREC-1 in `test/atdd/m2_domain.test.ts`) | no test: test planned for implementation |
| 4.2 | 6 | NFR-13: every port is in the FR-10 table and fail modes derive from rule inputs | none (planned: DEP-FAILMODE-1 in `test/atdd/m2_contracts.test.ts`) | no test: test planned for implementation |
| 4.2 | 7 | Measurement of NFR-1, NFR-9, NFR-10 with 10 000 requests at 100 concurrent | none (plan in `test/nfr-evidence.md`) | measurement plan, not executable |
| 4.2 | 8 | A measurement above its threshold fails the implementation gate | none (plan in `test/nfr-evidence.md`) | measurement plan, not executable |
| 4.2 | 9 | Exit criterion of the measurement plan: the story closes only when the five measurement files exist with equipment, load and seed recorded and every threshold is met | none (plan in `test/nfr-evidence.md`) | measurement plan, not executable |
| 4.3 | 1 | A DENY from `R-QUOTA-01` carries rule, cause, citations, a first sentence naming the cause and at least one next action. Card copy, empty list and Loading state have no test: the interface states have no code in this phase | EV-EX1 | executable red |
| 4.3 | 2 | After a 503 `PREVIEW_UNAVAILABLE` there is no token and activation with an empty token returns 409 `TOKEN_ABSENT` | PV-UNAVAILABLE, AC-P2 | executable red |
| 4.3 | 3 | The document lint fails on a new FR-15 banned term against the baseline | none (DOC-LINT is a script check in `test/ci/readiness.mjs`, not a test in `test/atdd/`) | no test: script check in test/ci |
| 4.3 | 4 | No rendered DENY card contains the forbidden strings of FR-16 | none (planned: COPY-01 in `test/ux/copy-table.test.ts`, proposed path, does not exist) | no test: test planned for implementation |
| 4.4 | 1 | Evaluator: a DENY card shows rule chip and cause chip separately, expanded trace, a next action | none (planned: UI-EVAL-1 in `test/ui/evaluator.test.ts`) | no test: test planned for implementation |
| 4.4 | 2 | Evaluator: an out-of-range field shows an inline error with the accepted range and the nearest legal value | none (planned: UI-EVAL-2 in `test/ui/evaluator.test.ts`) | no test: test planned for implementation |
| 4.4 | 3 | Evaluator: a SYSTEM banner differs from a DENY card in greyscale and is announced once | none (planned: UI-EVAL-3 in `test/ui/evaluator.test.ts`) | no test: test planned for implementation |
| 4.4 | 4 | Evaluator: layout at 1280, 900 and 390 px and no horizontal scroll at 320 px | none (planned: UI-EVAL-4 in `test/ui/evaluator.test.ts`) | no test: test planned for implementation |
| 4.4 | 5 | Rule catalogue: 19 rules in precedence order, two pre-flight rows apart, every citation resolves | none (planned: UI-RULES-1 in `test/ui/rule-catalogue.test.ts`) | no test: test planned for implementation |
| 4.4 | 6 | Rule catalogue: a version that fails to load shows the frozen version and allows a comparison | none (planned: UI-RULES-2 in `test/ui/rule-catalogue.test.ts`) | no test: test planned for implementation |
| 4.4 | 7 | CLI: `aegis eval` prints a 12-line summary, `--json` the Decision, `--curl` the request | none (planned: UI-CLI-1 in `test/ui/cli.test.ts`) | no test: test planned for implementation |
| 4.4 | 8 | CLI: an API error is one line `E-<CODE> <cause> <retry_after_ms>` on stderr with exit code 2 | none (planned: UI-CLI-2 in `test/ui/cli.test.ts`) | no test: test planned for implementation |
| 4.4 | 9 | CLI and API Explorer: an empty result is `0 decisions matched` (exit 0) and 200 with `items: []`, never 404 | none (planned: UI-CLI-3 in `test/ui/cli.test.ts`) | no test: test planned for implementation |

Tests planned for implementation (named above, none exists yet): AUTH-U-1, EV-SUPP-01, DM-PURE-01, EV-TIER-04, DM-PURE-02, DB-GRANT-1, EDGE-THESIS, EDGE-STRADDLE-1, EDGE-STRADDLE-3, PROP-DEADLINE-1, EDGE-STRADDLE-2, EDGE-SCOPE-1, EDGE-DAEMON-1, DEP-TOL-01, DEP-SHAPE-01, QUOTA-CONC-01, FD-Q1, LF-P4, DM-REPLAY-1, EV-PII-2, DM-PREC-1, DEP-FAILMODE-1, COPY-01, UI-EVAL-1, UI-EVAL-2, UI-EVAL-3, UI-EVAL-4, UI-FRZ-1, UI-FRZ-2, UI-FRZ-3, UI-FRZ-4, UI-RULES-1, UI-RULES-2, UI-CLI-1, UI-CLI-2, UI-CLI-3.

Coverage gap declared: the THESIS window kind (scenario S-8) has no executable test; decision DL-44 amends DL-40, which had also left `R-SYS-01` and `R-FLEET-01` untested (both now have a red test). The interface criteria (stories 4.5 and 4.4) have planned interface tests only: the package has no interface test infrastructure (decisions DL-49 and DL-56).
