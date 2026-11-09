# NFR evidence — story 2.5 (100 concurrent evaluations, k6)

Budget (annex): 100 concurrent evaluations at class start, p95 < 50 ms, 100 % HTTP 200 with a valid decision, zero errors.

**Verdict: functional criteria met, latency budget NOT met.** Every number below comes from a command run on 2026-11-09 (logs in `test/evidence/nfr/`).

## Measurements (`npm run nfr`, script `tests/nfr/policy-burst.js`: 100 VUs x 1 iteration, unique key and request id per VU)

| Run | Code | p95 ms | p99 ms | http_req_failed | checks | k6 exit |
|---|---|---|---|---|---|---|
| Baseline (`baseline.log`) | before any optimisation | 288.45 | 304.37 | 0 % | 100 % | 99 (threshold crossed) |
| Evidence run 1 (`run-1.log`) | after perf commit | 227.03 | 233.99 | 0 % | 100 % | 99 |
| Evidence run 2 (`run-2.log`) | after perf commit | 291.80 | 302.01 | 0 % | 100 % | 99 |
| Evidence run 3 (`run-3.log`) | after perf commit | 242.86 | 250.85 | 0 % | 100 % | 99 |

Run-to-run noise on this machine is large (227 to 292 ms after the change), so the improvement is clearly visible only in the single-process serial benchmark below, not in any single burst.

## What was done (perf commit) and what the measurements say

CPU profile of the hot path (500 sequential evaluations): pure rule evaluation is about 1 % of the time; about 60 % is SQLite (`prepare`, `INSERT`, `COMMIT`).

| Change | Serial, in-process, no HTTP (300 evaluations) |
|---|---|
| none | 4.79 ms per persisted decision |
| prepared-statement reuse | 2.22 ms |
| + one multi-row INSERT for the 19 trace rows and the citations, + fixture files read once | 1.84 ms |

Tried and discarded (not committed): `journal_mode=WAL` (no p95 change; synchronous stays FULL) and, as a pure experiment, `synchronous=OFF` (p95 still about 168 ms, so a durability trade-off would not reach 50 ms either).

Not done: caching decisions, or anything depending on clock, freeze or quota. The rule registry is a constant array and its lookup does not show in the profile, so an in-memory rule index is "not needed, measured".

## Why 50 ms is not reachable here

Every evaluation runs inside one process-wide mutex (`Store.exclusive`) with a synchronous SQLite write. 100 simultaneous requests are therefore processed one after another: 100 x about 1.8 ms is about 180 ms, consistent with the observed p95 of about 230 ms once HTTP and connection setup are added. Meeting 50 ms needs about 0.4 ms per request, i.e. a structural change (group commit across concurrent requests, or removing the per-request durable write), which changes the durability/locking contract.

**NEEDS DECISION:** choose (a) implement group commit (one COMMIT per batch of queued requests, responses still sent after the COMMIT); (b) relax or re-scope the budget (for example keep measuring the pure core at 30 ms as Impl-1 did); or (c) accept the miss. No change to locking or durability was made without that decision. The quality gate reports FAIL on this criterion by design.

## Environment and caveat

13th Gen Intel Core i5-13450HX (16 threads), 32 GiB RAM, Windows 11 (10.0.26200), Node v24.18.1, k6 v2.3.0. Server and k6 load generator run on the same machine, single Node process, SQLite file in a local temporary directory. This is a local single-process measurement, not a capacity test of a deployed system.
