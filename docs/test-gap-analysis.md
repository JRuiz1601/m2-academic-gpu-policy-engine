# Test gap analysis (Flow C, test-after) — Impl-1 code

Method: by hand, not through `bmad-testarch-automate` (that skill is an interactive multi-step workflow that was not run here). Source of truth: `vitest --coverage` (v8) on 2026-11-09, uncovered statement lines from `coverage-final.json`.

## Coverage after this run (all measured)

| Scope | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| All `src/**` | 92.47 % | 87.85 % | 93.36 % | 93.70 % |
| `src/domain/**` | n/a | 95.04 % (268/282) | n/a | n/a |

The 90 % branch threshold on `src/domain/**` is enforced in `vitest.config.ts`. Not covered by any test: `src/main.ts` and `src/adapters/inbound/cli.ts` (entry points, exercised only through child processes that coverage does not follow), domain lines 161-162 (the second hard-deadline branch is unreachable in practice because the primary rule already adds that constraint; no `c8 ignore` was used).

## Gaps found and regressions added

| Gap (Impl-1 code) | Regression added | File |
|---|---|---|
| GET on `/policy/decisions` (405) and unknown routes (404) had no test | structured 405 and 404 | `test/implementation/http-edge-cases.test.ts` |
| `evaluated_at_override`: malformed value and student use | 400 and 403 `CLOCK_OVERRIDE_FORBIDDEN` | same |
| `GET /policy/versions` bad `since_seq`, unknown version | 400 and 404 `VERSION_NOT_FOUND` | same |
| Freeze reads: invalid `state`/`scope` filters, unknown freeze, non-operator roles | 400, 404 `FREEZE_NOT_FOUND`, 403 `ROLE_INSUFFICIENT` | same |
| Freeze draft validation (blank reason, inverted range, window in the past) | `MISSING_REASON`, `WINDOW_INVALID_RANGE`, `WINDOW_IN_PAST`, and no draft stored | same |
| Activation without a preview token | 409 `TOKEN_ABSENT` | same |
| Fact projections (`facts.ts`) only exercised through the happy path | 16 unit tests for malformed port data, defaults and sorting | `test/unit/facts.test.ts` |
| `evaluate`: unknown actor; registry validation errors | unit tests | `test/unit/evaluate-branches.test.ts` |

Two of the new tests were checked by mutation (405 status and `since_seq` bound): both fail when the production line is changed.

## Gaps not closed

* Statement lines still uncovered after the new tests: `http.ts` 32, 64, 73, 115, 137, 146, 151, 170-172, 180 and `service.ts` 27, 35, 47, 60, 64, 75, 139, 143, 159, 170-172, 230, 264, 271, 275, 299, 329, 333, 339, 341 (rare error branches, fault-injection and timeout paths).
* No test exercises the `cli.ts` entry beyond what Impl-1 already did.
