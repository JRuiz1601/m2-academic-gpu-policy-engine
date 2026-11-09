# Traceability matrix — stories 2.1 to 2.6

Built by hand from `docs/prd.md` (section 7 and 8 IDs), the story files in `docs/stories/`, and the test titles in the repository. The skill `bmad-testarch-trace` was **not** run (it is an interactive multi-step workflow); the matrix was written and checked against the test files directly. Local evidence files are cited; the GitHub Actions run is described under "CI evidence".

Scope rule: a requirement is "scoped" if one of the six stories claims it. Unmapped scoped requirements: **0**. Everything else is in the deferred table.

Verdicts: PASS = every scoped clause has an automated test and the last local run passed. FAIL = the requirement has tests but its measured criterion is not met.

## Scoped requirements

| Requirement | Story | Automated tests (file: title) | Evidence | Verdict |
|---|---|---|---|---|
| FR-1 one terminal outcome per request | 2.1 | `test/implementation/core.test.ts`: "2.1 permits student workstation with cited baseline rationale", "2.1 refuses jobs without subject entitlement"; `stories.bdd.test.ts`: "Given student mateo and a 24GB workstation request... Then ALLOW", "Given no entitlement... DENY R-AUTH-01", "Given a malformed or non-contract body... 400", "Given well-formed JSON with a non-positive GPU count... R-VALID-01"; `test/atdd/m2_contracts.test.ts`: EV-P1, EV-AUTH-01, EV-AUTH-02, EV-Q1 | `test/evidence/green/story-2.4-green-phase.log` (full suite), `npm run check` | PASS |
| FR-9 deterministic cited explanation | 2.1, 2.3 | `m2_contracts.test.ts`: EV-EX1 "DENY explains rule cause evidence citation"; `m2_domain.test.ts`: DM-AD1 "deterministic pure evaluation", DM-AD6 "explanation contains observed values and registry citations"; `core.test.ts`: "pure evaluator runs below the annex 30 ms budget and is deterministic" | same | PASS |
| FR-11 journal, outbox, idempotent replay | 2.1, 2.5 | `m2_contracts.test.ts`: EV-Q1 "ALLOW journal and outbox", EV-I1 "three concurrent calls one decision", EV-P3, EV-P4; `http.test.ts` byte-identical replay tests; `concurrency.test.ts`: "50 parallel requests with the SAME Idempotency-Key...", "100 parallel requests with distinct keys..." | `test/implementation/concurrency.test.ts` (mutation-checked, `ai-decision-log.md` entry 22) | PASS |
| FR-4 protect class / lab / exam windows | 2.2 | `core.test.ts`: "2.2 Monday 10:30 class protection...", "2.2 exactly noon class boundary is excluded"; `stories.bdd.test.ts`: class-window scenarios (10:30 denied, 12:00 allowed, 13:00 allowed); `m2_contracts.test.ts`: EV-LAB-02 | full suite | PASS |
| NFR-4 boundary correctness (half-open windows) | 2.2, 2.4 | `m2_domain.test.ts`: DM-BOUND "independent generated end boundaries", DM-START "independent generated start boundaries"; `test/unit/window-boundary.test.ts`: 05:54:59 / 05:55:00 / 06:00:00 cases | full suite | PASS for the windows exercised (class/lab/exam and the 06:00:00 night boundary); the PRD's 6-window-kind property sweep is not claimed |
| FR-3 VRAM / GPU tier gate | 2.3 | `core.test.ts`: "2.3 denies 48GB server for student 8GB model and suggests workstation"; `stories.bdd.test.ts`: tier scenarios; `m2_contracts.test.ts`: EV-TIER-01, EV-TIER-02, EV-TIER-03 | full suite | PASS (note `ai-decision-log.md` entry 11: R-AUTH-02 pre-empts the variant offer; product decision pending) |
| FR-5 overnight window for human actors | 2.4 | `stories.bdd.test.ts` (R-NIGHT-01 at 13:00); `m2_domain.test.ts`: EDGE-2158 "literal annex request denied before night start"; `window-boundary.http.test.ts`, `test/unit/window-boundary.test.ts` | red log `test/evidence/red/story-2.4-red-phase.log`, green log `test/evidence/green/story-2.4-green-phase.log`, `docs/mutation-sanity-2.4.md` | PASS |
| FR-7 no straddle: night job bounded before the protected morning | 2.4 | `m2_domain.test.ts`: EDGE-NIGHT "admission bounded by 0555 before 1000 class"; `window-boundary.http.test.ts`: "a +30 min extension at 05:59:00 is denied citing the 08:00:00 class start", "at 05:55:00... EVICT_WARNING", "at exactly 06:00:00... evicted" | same as FR-5 | PASS (the `/policy/window-boundary` operation is read-only; it does not itself stop a job, it reports the action) |
| FR-2 freeze override with exam allowance | 2.6 | `m2_contracts.test.ts`: EV-FRZ-01, EV-FRZ-02, EV-FRZ-03, AC-Q1, LF-Q1; `test/unit/freeze-rationale.test.ts` (4 tests, incl. allowance admitted / not admitted); `http.test.ts`: "an active fleet-wide freeze denies a non-exam request with 'Emergency freeze active: <reason>'"; `tests/e2e/policy-console.spec.ts`: scenario 1 | `test/evidence/e2e/run.log`, `test/evidence/e2e/trace-main-scenario.zip`, `docs/mutation-sanity-2.6.md` | PASS (exam allowance is covered at domain level only: the simulator has no reservation source) |
| FR-14 interactive evaluator and freeze console with consequence preview | 2.6 | `tests/e2e/policy-console.spec.ts`: 3 scenarios (annex flow incl. review-consequences step, lift removes banner, student gets 403 message); `http.test.ts`: console alias and banner tests | e2e run log and trace | PASS |
| Annex NFR: 100 concurrent evaluations, p95 < 50 ms, 0 errors (PRD NFR-1 / NFR-9 family) | 2.5 | `tests/nfr/policy-burst.js` (k6 thresholds), runner `tests/nfr/run-nfr.mjs` | `test/evidence/nfr/run-1..3.log`, `docs/nfr-impl2.md`: 100 % HTTP 200, 0 errors, **p95 227 to 292 ms** | **FAIL** (latency budget not met; see NEEDS DECISION in `docs/nfr-impl2.md`). Error-rate and correctness part: PASS. |
| NFR-6 explanation completeness | 2.1 | `m2_contracts.test.ts`: EV-EX1; contract-shape checks in `http.test.ts` (`conforms('DecisionDto', ...)`) | full suite | PASS for the decisions the suite produces; the PRD's full 3-outcome x 21-rule matrix is not claimed |

## Deferred / out of scope

None of these is claimed by stories 2.1 to 2.6. Reasons and the wider list: `PENDIENTES-IMPL1.md`.

| Requirement | Why deferred | Partial evidence that exists (not a PASS) |
|---|---|---|
| FR-6 earliest-boundary bounding | Not in a story's claim; only exercised through FR-7 cases | `m2_domain.test.ts` DM-NP9; `core.test.ts` "quota cap survives a simultaneous deadline" |
| FR-8 quota cap | Not claimed | `m2_contracts.test.ts` EV-Q2, EV-QBOUND-01 |
| FR-10 degrade on fact failure | Not claimed (staleness bounds not implemented) | EV-DEP "timeout is dependency DENY" |
| FR-12 policy versioning | Not claimed | EV-VERSION, PB-Q1 |
| FR-13 engine purity | Enforced by lint, not a story | `test/ci/implementation-lint.mjs` (no `Date.now`, no IO imports in `src/domain`) |
| FR-15 banned-term doc lint, FR-16 error wording | Documentation rules of the planning phase | none |
| NFR-1 literal (p99 <= 5 ms on `evaluate()`), NFR-9 fact fan-out | Different measurement than the annex burst; not run | the 30 ms core budget test in `core.test.ts` |
| NFR-2, 3, 5, 7, 8, 10, 11, 12, 13 | Property/replay/leak/latency harnesses of the planning phase not implemented | EV-PII (NFR-5, partial) |
| Multi-replica, PostgreSQL, real integrations, outbox delivery worker | Listed in `PENDIENTES-IMPL1.md` | none |

Verdict: **PASS for 11 of 12 scoped rows; the annex latency criterion (story 2.5) is FAIL.** CONCERNS for the deferred set: no blanket PASS is given for requirements without a test.

## CI evidence

* Local: logs and JSON files named in the table.
* GitHub Actions run 42650985856 (commit 75d522b, `gh run view`): npm ci, check (195 tests), coverage, k6 step, Playwright with the bundled Chromium (3 passed) all ran on ubuntu; the quality gate step FAILED on the NFR p95 criterion (202.54 ms against 50 ms), all other criteria PASS. The k6 step is marked `continue-on-error` so the gate is the single enforcer.
