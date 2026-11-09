# Walkthrough — Impl-2 (stories 2.4, 2.5, 2.6)

Every number here was produced by a command run on 2026-11-09 on one Windows 11 machine (Node v24.18.1, k6 v2.3.0). Timestamps of each Part are in `docs/impl2-time-log.md`.

## Team and process note

Tomás Quintero did **not** take part in Impl-2. The work was done by Juan with Claude Code. `independent_human_review` for the Impl-2 stories is `pending` in `docs/sprint-status.yaml` (Juan will review); no story is marked done.

## Architecture hardening and concurrency defence

* **Idempotency.** A request is keyed by `(actor, Idempotency-Key)` plus a hash of the canonical body. A replay is rebuilt from stored rows and serialised through one canonical-JSON function, so it is byte-identical. Proven by `test/implementation/concurrency.test.ts`: 50 parallel calls with the same key give one decision and one distinct response body.
* **Transactions and serialisation.** Every use case runs inside `Store.exclusive` (a per-store promise chain) and a `BEGIN IMMEDIATE` transaction; decision, snapshot, trace, citations, idempotency key and outbox row commit together. Removing the mutex makes the same-key test fail once interleaving is forced (`ai-decision-log.md` entry 22).
* **Freeze states.** DRAFT, ACTIVE, LIFTED, EXPIRED; activation consumes a single-use preview token and rejects a duplicate active scope inside the transaction, so two simultaneous activations leave exactly one ACTIVE freeze (tested for the same draft and for two drafts).
* **Caching, as measured.** Prepared statements are reused, trace rows go in one multi-row INSERT, fixture files are read once. Decisions are never cached. An in-memory rule index was not built because the registry lookup does not appear in the CPU profile.

## Story 2.4 Midnight Window Rollover (Flow A, ATDD-first)

* **Challenge.** A night job must be warned at 05:55:00 and evicted at 06:00:00; an extension that crosses 06:00:00 is denied unconditionally.
* **Flow.** Contract first, then a genuine red phase, then green, then a mutation audit.
* **Code.** `src/domain/window-boundary.ts` (pure), `src/application/window-boundary.ts`, `src/adapters/outbound/time-dilation-clock.ts`, route in `src/adapters/inbound/http.ts`, a 08:00 local CS-101 class added to `fixtures/timetable.json`; tests `test/unit/window-boundary.test.ts`, `test/implementation/window-boundary.http.test.ts`.
* **Red phase (copied from `test/evidence/red/story-2.4-red-phase.log`, 2026-11-09T10:30:20-05:00).** All 15 failures are `AssertionError` (404 where the route did not exist, or the inert stub's values), none an import or syntax error:

```
 ❯ test/unit/window-boundary.test.ts (9 tests | 8 failed)
 ❯ test/implementation/window-boundary.http.test.ts (8 tests | 7 failed)
 Test Files  2 failed (2)
      Tests  15 failed | 2 passed (17)
```

  The red commit `cda4791` was pushed before the production commit `b233cab`. The 2 passing tests were already true (clock reads its start instant; 401 without a session).
* **Mutation audit** (`docs/mutation-sanity-2.4.md`): 14 mutants; 2 survived (minute rounding, same-day class lookup) and were killed by new tests; 1 is an equivalent mutant.
* **Terminal evidence.** Green log `test/evidence/green/story-2.4-green-phase.log`.

## Story 2.5 High-concurrency burst under k6 (Flow D)

* **Challenge.** 100 simultaneous evaluations, p95 < 50 ms, zero errors.
* **Code.** `tests/nfr/policy-burst.js`, `tests/nfr/run-nfr.mjs`, `scripts/quality-gate.mjs`, store optimisations in `src/adapters/outbound/sqlite.ts`.
* **k6 results** (`test/evidence/nfr/`, `npm run nfr`):

| Run | p95 ms | p99 ms | error rate | checks |
|---|---|---|---|---|
| Baseline | 288.45 | 304.37 | 0 % | 100 % |
| Run 1 | 227.03 | 233.99 | 0 % | 100 % |
| Run 2 | 291.80 | 302.01 | 0 % | 100 % |
| Run 3 | 242.86 | 250.85 | 0 % | 100 % |

  Correctness holds (100 % HTTP 200, valid decisions). **The p95 budget is not met** and the optimisations did not change that: serial core cost per persisted decision fell from 4.79 ms to 1.84 ms, but 100 requests still queue behind one write path. This is local, single-process, same-machine load. NEEDS DECISION: group commit or re-scope (`docs/nfr-impl2.md`).

## Story 2.6 Emergency freeze and policy console (Flow E, Playwright + POM)

* **Challenge.** The operator freezes the fleet, sees an urgent banner, and a non-exam evaluation is denied with the freeze reason.
* **Code.** Console alias `/admin/policy-console`, banner with a 2 s polling listener, DENY rationale "Emergency freeze active: <reason>"; `tests/e2e/pages/PolicyConsolePage.ts`, `tests/e2e/policy-console.spec.ts`.
* **Playwright run** (`test/evidence/e2e/run.log`, system Chrome through `E2E_CHANNEL=chrome` because this machine's Windows app-control policy blocks the bundled Chromium):

```
  ✓  1 ... Rebecca freezes the fleet for the Final Exam and a non-exam request is denied (1.2s)
  ✓  2 ... lifting the freeze removes the banner and evaluation is allowed again (755ms)
  ✓  3 ... a student session cannot operate the console and sees the structured 403 message (547ms)
  3 passed (4.5s)
```

* **Trace.** `test/evidence/e2e/trace-main-scenario.zip` was unzipped and inspected: 45 DOM frame snapshots, 61 recorded actions, network entries for the decisions, freezes, preview, activate and lift POSTs, and the banner text inside the snapshots. `playwright show-trace` (a GUI) was not opened.
* **Mutation audit** (`docs/mutation-sanity-2.6.md`): 10 mutants, all killed by at least one layer; one integration gap found and fixed.

## Coverage, pyramid and quality gate

* Coverage (`npm run coverage`): all `src` 92.47 % statements, 87.85 % branches; `src/domain` branches **95.04 %** (268/282), threshold 90 % enforced.
* Pyramid (`scripts/pyramid.mjs`): unit 48 (24.2 %), integration 147 (74.2 %), e2e 3 (1.5 %); far from 70/20/10, see `docs/test-pyramid.md`.
* Quality gate (`npm run quality-gate`, real run): check PASS, zero-sleep lint PASS, domain coverage PASS (95.04 %), E2E PASS (3/0/0/0), NFR error rate PASS, **NFR p95 FAIL (242.86 ms)**. Verdict: **FAIL**, because of that one criterion (`test/evidence/quality-gate.json`).

## Deviations from the annex

* Endpoint is `POST /policy/window-boundary`, not `/api/v1/policy/evaluate-window-boundary` (no `/api/v1` prefix in this service).
* 06:00 versus 08:00: `hard_deadline` is 06:00:00 (AD-04); the DENY reason cites the first class start (08:00:00), derived from the timetable, for which an 08:00 entry was added.
* Freeze denial is HTTP 200 with a DENY body (contract decision), not 423.
* The console keeps the draft, preview, confirm flow; the annex's single toggle was not implemented.
* The `bmad-testarch-atdd`, `bmad-dev-story`, `bmad-testarch-trace` and `bmad-testarch-automate` skills were not run (interactive workflows); the same steps were done by hand.

## What was NOT verified

* The GitHub Actions run of the new workflow (Part 6 checks it).
* The bundled-Chromium path of Playwright (CI default) on this machine: blocked by policy; only system Chrome was used.
* Any non-Windows platform, any shared or deployed environment, any real network.
* The 50 ms latency budget (not met).
* An exam-bound request being admitted during a freeze end to end (no reservation source in the simulator; covered by unit tests only).
