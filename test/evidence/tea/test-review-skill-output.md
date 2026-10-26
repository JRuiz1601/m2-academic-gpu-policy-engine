---
workflowType: testarch-test-review
stepsCompleted: [step-01-load-context, step-02-discover-tests, step-03-quality-evaluation, step-03f-aggregate-scores, step-04-generate-report]
lastStep: step-04-generate-report
lastSaved: 2026-10-22
context_basis: pr_diff
---
# Local TEA test review
Host: Codex. Local skill instructions executed; no slash command or authenticated Claude CLI invocation.
Invocation: headless=true; generate_inline_comments=false; authoritative review_files=test/atdd/m2_contracts.test.ts,test/atdd/m2_domain.test.ts. Output override=test/evidence/tea/test-review-skill-output.md; all artifact directories override default; no _bmad-output directory created.
Start: 2026-10-22T23:34:46Z (date -u).
Customization resolver failed: uv cache outside writable roots; base customization loaded, empty prepend/append/facts/hook; team/user override files checked separately.
Config: Juan; Spanish communication; English documents. Vitest internal-port backend tests. Both utility flags true, both packages absent; M9/L9/M10 do not exist for this run. Browser collection n/a: no page actions/URL. No Pact artifacts; no broker data claimed.
Context: planning/{epics.md,criteria-test-map.md,prd.md,detailed-design/contracts.md}, test/{test-design.md,story-index.json}, fixtures/harness and ports/in/policy.ts. Context read-only, not scored. Coverage excluded; use trace.
Baseline: actual rg search found only test/harness/fixtures.test.ts outside review; corpusSize=1 sampled=1; every convention unknown (<4), no convention deductions. Raw counts: convention-baseline.json.
Capability probe: auto; subagents supported, agent-team primitives absent. Four quality workers in two batches. No estimated speedup claimed.

## Test File Analysis
- test/atdd/m2_contracts.test.ts: 785 lines, 32740 bytes, 51 tests, Vitest; no describe blocks.
- test/atdd/m2_domain.test.ts: 180 lines, 6456 bytes, 10 tests, Vitest; no describe blocks.



## Executive Summary
**Quality Score**: 77/100 (C)
**Overall Assessment**: Acceptable
**Recommendation**: Request Changes
**Context Basis**: pr_diff
**Context Waivers Applied**: 0
Strengths: controlled clocks; seeded properties; isolated database per test. Weaknesses: conditional assertion sites; repeated payload shapes; ungrouped suites.
This is the review snapshot before triage fixes. Literal verdict and score remain unchanged after fixes; no rerun score is claimed. Runtime red failures establish preparation only.

## Quality Criteria Assessment
| Criterion | Status | Violations | Basis | Notes |
|---|---|---|---|---|
| BDD Format (Given-When-Then) | PASS (n/a) | 0 | Convention: bddNaming (1 of 1 sampled) | unknown; corpus <4 |
| Test IDs | PASS (n/a) | 0 | Convention: testIds (0 of 1 sampled) | unknown; corpus <4 |
| Priority Markers (P0/P1/P2/P3) | PASS (n/a) | 0 | Convention: priorityMarkers (0 of 1 sampled) | unknown; corpus <4 |
| Disabled or Focused Tests | PASS | 0 | Absolute | none |
| Hard Waits | PASS | 0 | Absolute | none |
| Determinism | FAIL | 3 | Absolute + Applicability | H3 conditional assertions; no H2 |
| Isolation | PASS | 0 | Absolute | reset and close each connection |
| Fixture Patterns | WARN | 2 | Applicability: domain payloads | M2 repeated shapes |
| Data Factories | WARN | 2 | Applicability: domain payloads | same M2 occurrences, not additional deductions |
| Suite grouping | WARN | 2 | Absolute | M4 |
| Network-First Pattern | PASS (n/a) | 0 | Applicability: navigation | no navigation |
| Playwright Utils Adoption | PASS (n/a) | 0 | Run precondition | package absent; run framework if adoption intended |
| Pact.js Utils Adoption | PASS (n/a) | 0 | Run precondition | package absent; no Pact suite |
| Explicit Assertions | PASS | 0 | Absolute | awaited helper failures propagate |
| Test Length | PASS | 0 | Absolute | 785 and 180 lines |
| Test Duration | PASS | 0 | Absolute | no H1/M1; implemented runtime not measured |
| Flakiness Patterns | FAIL | 3 | Absolute + Applicability | same H3 occurrences; no additional deductions |
| Mobile Flow Patterns | PASS (n/a) | 0 | Applicability: Maestro | no mobile flows |
**Total Violations**: 0 Critical, 3 High, 4 Medium, 0 Low
**Convention Baseline**: 1 test files sampled outside the review set

## Quality Score Breakdown
```
Starting Score:          100
Critical Violations:     -0 × 10 = -0
High Violations:         -3 × 5 = -15
Medium Violations:       -4 × 2 = -8
Low Violations:          -0 × 1 = -0

Bonus Points:
  Excellent BDD:         +0
  Comprehensive Fixtures: +0
  Data Factories:        +0
  Network-First:         +0
  Perfect Isolation:     +0
  All Test IDs:          +0
                         --------
Total Bonus:             +0

Final Score:             77/100
Grade:                   C
```
No across-all-files bonus is established. H4 passes due to resets, but suite-level mutable h prevents claiming the stricter perfect-isolation bonus for same-file parallel execution. Inline payload duplication prevents fixture/factory bonuses. No DOM or network actions means no corresponding bonus is asserted.

## Critical Issues (Must Fix)
No critical issues detected.

## Recommendations (Should Fix)
| Id | Row | Severity | Location | Finding (verbatim worker description) | Recommended fix |
|---|---|---|---|---|---|
| TR-01 | H3 | HIGH | AI Compute Fabric/M2-Academic-GPU-Policy-Engine/test/atdd/m2_contracts.test.ts:256 | AC-I1 places the 409 assertion behind an if (r.status === rejected) guard. H3 fires because control flow decides whether to execute the assertion. The preceding filter and seven-error length assertion constrain this branch, so this is a structural registry finding rather than evidence of an observed flake. | Use a typed rejection filter and assert the rejection reasons as one unconditional array assertion, retaining the seven-error cardinality check. |
| TR-02 | H3 | HIGH | AI Compute Fabric/M2-Academic-GPU-Policy-Engine/test/atdd/m2_domain.test.ts:91 | DM-BOUND selects DENY assertions versus non-protection assertions with if (delta < 0). This matches H3 even though the delta list is fixed and fast-check is seeded; no random-run instability is inferred. | Separate the before-end property from at/after-end properties, keeping each assertion path unconditional and preserving seed 20261019. |
| TR-03 | H3 | HIGH | AI Compute Fabric/M2-Academic-GPU-Policy-Engine/test/atdd/m2_domain.test.ts:164 | DM-START selects protected-window assertions versus non-protection assertions with if (delta >= 0). H3 applies to the conditional expected outcome despite fixed deltas and seeded generation. | Express before-start, exact-start, and after-start as separate property tests with unconditional expected outcomes and preserve the fixed seed. |
| TR-04 | M4 | MEDIUM | AI Compute Fabric/M2-Academic-GPU-Policy-Engine/test/atdd/m2_contracts.test.ts:44 | The file contains 51 top-level tests and no describe/context grouping. Registry M4 fires for files with three or more tests without a subject grouping. | Group related tests in describe blocks naming the operation or policy subject. |
| TR-05 | M4 | MEDIUM | AI Compute Fabric/M2-Academic-GPU-Policy-Engine/test/atdd/m2_domain.test.ts:22 | The file contains 10 top-level tests and no describe/context grouping. Registry M4 fires for files with three or more tests without a subject grouping. | Group related tests in describe blocks naming the operation or policy subject. |
| TR-06 | M2 | MEDIUM | AI Compute Fabric/M2-Academic-GPU-Policy-Engine/test/atdd/m2_contracts.test.ts:310 | The CLASS timetable payload shape (kind, subject_id, starts_at, ends_at) is constructed inline at lines 310-317, 640-647 and 714-721, meeting M2's three-occurrence predicate. Other catalogue/access payloads also recur. | Create a fresh timetable-window factory accepting kind, subject and time overrides; keep each scenario's relevant boundary overrides visible. |
| TR-07 | M2 | MEDIUM | AI Compute Fabric/M2-Academic-GPU-Policy-Engine/test/atdd/m2_domain.test.ts:47 | The ProtectedWindow shape (kind, starts_at, ends_at) is constructed inline at lines 47, 66, 87, 125, 139 and 158. M2 fires because the domain payload shape appears three or more times. | Introduce a fresh protected-window factory with explicit start/end overrides to retain independent boundary inputs. |

Recommended patterns retain all checks: `expect(errors.map(r => r.reason)).toMatchObject(Array.from({ length: 7 }, () => ({ http_status: 409 })))`; unroll the three boundary calls and assert each outcome unconditionally; wrap tests in `describe('policy contracts', () => { ... })`; construct a fresh window with explicit start/end arguments. Knowledge: test-quality.md (H3/M4), data-factories.md (M2).

## Best Practices Found
`beforeEach(() => { h = harness(); })` and `afterEach(() => h.db.close())` isolate the database. Property generators use a fixed seed and explicit timestamps. Assertions check SUT outputs and persisted state; stubs fail rather than fabricate success.

## Context and Integration
The supplied stories require future HTTP, UI and NFR evidence. These are coverage concerns for trace, excluded from this ledger. Context did not waive or reduce any registry finding.

## Knowledge Base References
Local skill resources/knowledge: test-quality.md, data-factories.md, test-levels-framework.md, selective-testing.md, test-healing-patterns.md, selector-resilience.md, timing-debugging.md, fixture-architecture.md, network-first.md, playwright-cli.md, playwright-utils-mandate.md and pactjs-utils-mandate.md. Full core reads also performed by quality workers; see worker-maintainability.json manifest. Utility loading profiles skipped for Vitest as step 1 directs; contracts filename alone does not imply Pact.

## Next Steps
Apply all seven inexpensive test findings without dropping an assertion. Retain this snapshot, run trace, then verify all acceptance tests still fail only with the stop-point error. Tomás owns test fixes; Juan owns any policy clarification. Re-review needed before an implementation merge; no new score inferred here.

## Decision
**Recommendation**: Request Changes
The registry ledger has HIGH findings, so step 3f derives this value regardless of score. No waiver applied.

## Appendix
No prior scored review trend is claimed. All four worker JSON files and review-summary.json are retained beside this report. Duplicate M4 worker occurrences were counted once per row/location. Informational dimension scores do not participate in the overall ledger.

## Reviewed Files
- AI Compute Fabric/M2-Academic-GPU-Policy-Engine/test/atdd/m2_contracts.test.ts
- AI Compute Fabric/M2-Academic-GPU-Policy-Engine/test/atdd/m2_domain.test.ts

## Review Context
- AI Compute Fabric/M2-Academic-GPU-Policy-Engine/planning/epics.md
- AI Compute Fabric/M2-Academic-GPU-Policy-Engine/planning/criteria-test-map.md
- AI Compute Fabric/M2-Academic-GPU-Policy-Engine/planning/prd.md
- AI Compute Fabric/M2-Academic-GPU-Policy-Engine/planning/detailed-design/contracts.md
- AI Compute Fabric/M2-Academic-GPU-Policy-Engine/test/test-design.md
- AI Compute Fabric/M2-Academic-GPU-Policy-Engine/test/story-index.json
- AI Compute Fabric/M2-Academic-GPU-Policy-Engine/test/fixtures/index.ts
- AI Compute Fabric/M2-Academic-GPU-Policy-Engine/test/harness/fixtures.test.ts
- AI Compute Fabric/M2-Academic-GPU-Policy-Engine/ports/in/policy.ts

## Review Metadata
Host Codex; local workflow Create steps completed; no slash invocation. Checklisted: scope, context, knowledge, rubric rows, baseline, deduplication, arithmetic and manifest reviewed. No browser sessions opened. Temp worker contracts copied into test/evidence/tea. Customization on_complete empty (base fallback); no hook.
End: 2026-10-22T23:39:20.574982+00:00 (system UTC; date -u recorded in execution log).

Date command completion marker: Thu Oct 22 23:39:20 UTC 2026.

Validation correction: the intermediate 82/B calculation included an unsupported five-point isolation bonus; before finalization, the bonus was removed. Final ledger is 100 - 15 - 8 + 0 = 77 (C); Request Changes remains unchanged.
