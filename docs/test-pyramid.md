# Test pyramid — Impl-2

Produced by `node scripts/pyramid.mjs` on 2026-11-09 (vitest JSON report plus `test/evidence/e2e/results.json`). Layers are assigned by directory; no test was renamed or reclassified to improve the ratio.

| Layer | Tests | Share | Target |
|---|---|---|---|
| Unit (`test/unit`) | 48 | 24.2 % | 70 % |
| Integration (`test/atdd`, `test/harness`, `test/implementation`) | 147 | 74.2 % | 20 % |
| E2E (`tests/e2e`, Playwright) | 3 | 1.5 % | 10 % |
| NFR (`tests/nfr`, k6 scenarios) | 1 | outside the ratio | n/a |
| Total (unit + integration + e2e) | 198 | 100 % | |

## How far from 70/20/10, and why

The suite is **not** close to 70/20/10: unit is 24 % against 70 %, integration 74 % against 20 %, E2E 1.5 % against 10 %.

* The Impl-1 acceptance tests (`test/atdd/m2_contracts.test.ts`, 51 tests, and `stories.bdd.test.ts`, 19) drive the real HTTP adapter and SQLite on purpose, because the annex defines acceptance through the API. They make up most of the integration share, and some of them (for example `m2_domain.test.ts`, 10 tests) could be counted as unit tests; they were left where they are.
* The domain is small (one evaluation function plus fact projections), so the amount of pure logic available for new unit tests is limited. Impl-1 had no tests under `test/unit`; this run added all 48 (window boundary, freeze rationale, evaluator branches, registry validation, fact projections, store paths).
* E2E is deliberately tiny (3 scenarios, one page object). Reaching 10 % would need about 20 E2E tests, which is more slow, browser-dependent maintenance than this console warrants.

Per-file counts are printed by the script; the NFR scenario is a single k6 burst (`tests/nfr/policy-burst.js`).
