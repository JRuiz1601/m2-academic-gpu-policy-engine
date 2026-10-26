---
stepsCompleted: [1, 2, 3, 4, 5, 6]
filesIncluded: explicit list (see Document Inventory)
---

# Implementation Readiness Assessment Report

**Date:** 2026-10-21
**Project:** DesarrolloIA (M2 Academic GPU Policy Engine)

## Document Inventory (Step 1)

Discovery was run against explicit paths (MOD = AI Compute Fabric/M2-Academic-GPU-Policy-Engine), not against {planning_artifacts}. All files exist; whole documents only, no sharded folders, no duplicates.

**PRD:** planning/prd.md (107788 B, 607 lines, 2026-09-28)

**Architecture:** planning/ARCHITECTURE.md (220095 B, 1202 l, 2026-10-21); planning/detailed-design/contracts.md (51093 B, 250 l); ports-and-adapters.md (32538 B, 275 l); schemas/001_m2_schema.postgres.sql (647 l); 001_m2_schema.sqlite.sql (672 l); dto.ts (464 l); events.md (474 l); openapi.yaml (1022 l)

**UX:** ux/DESIGN.md (220 l); ux/EXPERIENCE.md (365 l); ux/C-UX-Scenarios/00-ux-scenarios.md (142 l), scenario-1..4.md (285/211/266/328 l); ux/wireframes/wireframe-01-evaluator-deny.md (76 l), wireframe-02-constrain-deadline.md (125 l), wireframe-03-freeze-console.md (178 l)

**Epics & Stories:** planning/epics.md (52620 B, 368 l, 2026-10-21)

**Supporting (read-only):** planning/criteria-test-map.md (72 l); planning/accepted-concerns.md (16 l); planning/ux-state-contract-map.md (26 l); test/traceability-matrix.md (86 l); test/story-index.json (363 l); test/nfr-evidence.md (21 l); test/atdd/m2_contracts.test.ts (697 l); test/atdd/m2_domain.test.ts (166 l); reviews/phase-3-4-findings.md (42 l); review-arch-adversarial.md (843 l); review-arch-edge-cases.md (488 l); review-arch-implementability.md (197 l); review-detailed-design.md (554 l); review-prd-adversarial.md (377 l); review-test-quality.md (43 l)

**Issues:** duplicates: none. Missing: none of the listed files. Note: no standalone ux "index" doc; UX is a multi-file set, as the user specified.

## PRD Analysis (Step 2)

Source: planning/prd.md, read completely (607 lines, lines 1-607). Extraction below keeps each requirement's id, trigger and measurable condition in condensed form; the verbatim text is at the cited lines of prd.md (the FR table rows are 400-1500 characters each, so they are cited rather than copied in full - this is a deviation from "no summarising" and is declared).

### Functional Requirements (prd.md lines 423-440)

FR-1 (l.425): resolve every request to exactly one terminal outcome and one admission; 100 % over the "3-outcome x 21-rule matrix"; 0 null primary_rule_id.
FR-2 (l.426): freeze overrides; R-FRZ-01 denies 100 % of non-exam requests in the freeze window; validated exam_binding in allowances[] is admitted with WINDOW_SCOPE unless one of six named rules denies.
FR-3 (l.427): VRAM/GPU-count tier gate vs heterogeneous fleet; 3 clauses (STUDENT 70B/48GB -> R-TIER-02 DENY or R-TIER-03 variant; 0 node classes under-sized; RESEARCHER -> ALLOW).
FR-4 (l.428): protect lab/class/exam windows; 100 % of TRAINING/BACKGROUND_BATCH/EVALUATION denied in window; boundary sweep with exactly 2 flips; subject scoping.
FR-5 (l.429): overnight window [22:00,06:00) for HUMAN actors; boundary sweep; daemon not denied by R-NIGHT-01.
FR-6 (l.430): bound admission by earliest boundary b*; HARD_DEADLINE with must_checkpoint_by = valid_until; worked cases A / negative / own-completion; no-shadowing test.
FR-7 (l.431): mandatory straddle edge case; 4 clauses (08:00+300 min -> 08:55; 02:00+600 -> 05:55 with 08:55 superseded; freeze 03:00 -> 02:55; single-deadline property over 10 000 contexts).
FR-8 (l.432): quota cap without read-then-write; remaining=0 -> DENY R-QUOTA-01 in 100 %; 0<remaining<need -> QUOTA_CAP PROVISIONAL; concurrency test; integer units.
FR-9 (l.433): deterministic cited explanation incl. suppressed[]; 100 % citations resolve; 100 % DENY has next_action or NO_ALTERNATIVE_AVAILABLE; "one of the four state values".
FR-10 (l.434): degrade safely; per-port classification table (quota, clock, Identity/Access, Reservation FAIL_CLOSED@0; Timetable FAIL_CLOSED@60 s; fleet.NodeClassTable FAIL_CLOSED@0; fleet.Availability stale-tolerant@60 s; Catalog stale-tolerant@6 h; queue display-only); four port outcomes; clock quality.
FR-11 (l.435): append-only journal, async publish; queryable within 30 s; 0 updates/deletes; 0 drops when bus down.
FR-12 (l.436): policy versioning; effect within 5 s; in-flight unaffected; byte-frozen versions.
FR-13 (l.437): engine free of ambient time/I/O/randomness; import allow-list; 10 000 byte-identical replays.
FR-14 (l.438): evaluator + freeze console as clients of the public API; ACTIVATE disabled until preview rendered for current draft hash and non-empty reason.
FR-15 (l.439): doc-lint banned-term list.
FR-16 (l.440): the word "error" only for broken surfaces; 0 DENY cards contain error/failed/403/CANNOT EVALUATE.
Total FRs: 16

### Non-Functional Requirements (prd.md lines 448-462)

NFR-1 evaluate() p99<=5 ms/p50<=1 ms @100 concurrent. NFR-2 0 network calls from engine/, 0 model invocations. NFR-3 100 % byte-identical over 10 000 replays. NFR-4 boundary correctness at b-1ms/b/b+1ms, 0 exceptions. NFR-5 0 credential/PII leakage. NFR-6 100 % explanation completeness ("3-outcome x 21-rule matrix"). NFR-7 policy activation <=5 s. NFR-8 journal <=30 s. NFR-9 fan-out p99<=45 ms at 100 concurrent, reconciliation invariant with FACT_TIMEOUT_MS=40. NFR-10 render p99<=2 ms. NFR-11 independent runnability (make dev, 0 services, stub servers on sockets; cold-start record cited to a "readiness-gate-report" file in planning/ - name only, not opened). NFR-12 rule precision >=90 % single-rule match, 0 % needless constraints. NFR-13 fail-closed coverage 100 % of ports classified.
Total NFRs: 13

### Additional Requirements

- Non-happy paths NP-1..NP-12 (l.504-517); NP-1 and NP-2 mandatory.
- Constraints: 19-row rule catalogue (P -1..17, l.317-342), closed enums (l.218-234), constants (l.257-268), canonical ordering (l.403-417), Decision invariants (l.208-216), freeze lifecycle with preview_token (l.468-476), quota commit protocol (l.489-498).
- Assumptions A-1..A-7 and open questions OQ-1..OQ-4 (l.126-138); A-1 and A-3 marked RISKY; OQ-1, OQ-3, OQ-4 open.
- Non-goals NG-1..NG-10 (l.109-120).
- Acceptance gates AG-1..AG-11 (l.540-552), scenarios S-1..S-8 (l.523-532).

### PRD Completeness Assessment

The PRD is detailed, numeric and largely falsifiable. Defects found by this audit (each cited, none resolved by the audit):

- PRD-A (Medium): rule count is inconsistent. The catalogue has 19 rows (l.317-342; AG-5 l.546 says "19 rules, 19 rows"; l.284 "19 rules") but l.78 says "21 R-* rules", FR-1 l.425 and NFR-6 l.455 test a "3-outcome x 21-rule matrix".
- PRD-B (Medium): FR-9 l.433 requires "one of the four state values" while l.226 and l.232 state there are three TraceEntry states (INDETERMINATE deleted, EDGE-34). A test written to FR-9 as worded cannot be satisfied.
- PRD-C (High): precedence order makes FR-8's quantifier false. R-BOUND-01 (P13, l.338, "Every workload kind") precedes R-QUOTA-01 (P14, l.339). A request with remaining <= 0 whose run reaches any boundary in B matches R-BOUND-01 first and is CONSTRAINed/admitted with a deadline, never denied QUOTA_EXHAUSTED; FR-8 (l.432) claims "With remaining = 0, 100 % of requests are DENY with R-QUOTA-01". Same for R-QUOTA-02 (P15) being shadowed (the document itself admits this for the cap at l.214, but not for the zero-balance DENY).
- PRD-D (Medium): NP-5 (l.510) says a request declaring 24 GB for a model whose floor is 48 GB gets DENY(NO_SUCH_HARDWARE) via R-TIER-01, but R-TIER-01's predicate (l.330) reads only request vs fleet classes, and no catalogued rule compares requested VRAM to ModelFacts.min_vram_gb, although A-5 (l.132) calls it a hard floor and FR-3 clause 2 says no node below the "request's requirement". Not verified whether ARCHITECTURE.md closes this; checked in step 3-4.
- PRD-E (Low): section 6.2.1 says "Thirteen structural decisions" (l.346) but the table has 12 rows with two numbered "11" (l.360, l.362); l.309/l.514 refer to "§6.1 step 4" for the bound which is step 3 (l.288); l.313 sentence "a functional test all runs in one process".
- PRD-F (Low): the PRD cites the readiness-gate-report file as holding tests and the cold-start record (l.460, l.534, l.549); that artefact was not opened (forbidden by task), so those test ids are "not verified" here.
- PRD-G (Info): open items OQ-1, OQ-3, OQ-4 and risky A-1, A-3 remain open; OQ-1 is "carried to the readiness gate as an open question, not a blocker" (l.135).

## Epic Coverage Validation (Step 3)

Source: planning/epics.md, read completely (368 lines). The document has no "FR Coverage Map" section; coverage is taken from each story's "Traceability (Requirements)" line plus the acceptance criteria (ACs). Epics: 4; stories: 15 (1.1-1.3, 2.1-2.3, 3.1-3.5, 4.1-4.4); l.368 states "29 requisitos aparecen" (16 FR + 13 NFR = 29, consistent with the PRD extraction).

### Epic FR Coverage Extracted

FR-1: 1.1, 1.3 | FR-2: 3.1, 3.2, 3.3, 3.4, 3.5 | FR-3: 1.2 | FR-4: 2.1 | FR-5: 2.1 | FR-6: 2.1 | FR-7: 2.1 | FR-8: 2.3 | FR-9: 1.2, 4.2 | FR-10: 2.2 | FR-11: 1.3, 4.1 | FR-12: 3.3, 4.1 | FR-13: 1.2, 4.2 | FR-14: 1.1, 3.1, 3.2, 3.3, 3.4, 3.5, 4.3 | FR-15: 4.3 | FR-16: 4.3
Total FRs in epics: 16. No FR appears in epics that is not in the PRD.
NFR traceability: NFR-1 4.4; NFR-2 1.1,4.2; NFR-3 1.2,4.2; NFR-4 2.1; NFR-5 1.3,2.3,3.2,4.2; NFR-6 1.2,3.1,4.2; NFR-7 3.3,4.4; NFR-8 4.4; NFR-9 2.2,4.4; NFR-10 1.2,4.4; NFR-11 1.1,4.3; NFR-12 1.2,2.3,4.2; NFR-13 2.2,4.2 (13/13 referenced).

### FR Coverage Analysis (traceability claim and AC-level check)

| FR | PRD requirement (short) | Epic coverage | Status |
|---|---|---|---|
| FR-1 | exactly one outcome/admission, 100 % over rule matrix | 1.1 AC1-3, 1.3 | Covered (the "3 x 21 matrix" 100 % quantifier has no AC) |
| FR-2 | freeze deny + allowance, six excluded rules | 3.1-3.5; 3.5 AC3-4 | Covered by claim; AC 3.5-4 unsatisfiable as worded, see EPC-3 |
| FR-3 | tier gate, 3 clauses | 1.2 AC3 | Partial: clause 3 (RESEARCHER -> ALLOW) and clause 2 (zero under-sized class) have no AC |
| FR-4 | protected windows, boundary sweep, scope check | 2.1 AC1, AC4 | Partial: no AC for the scope check (other subject at 10:04) or the 4-point sweep (EDGE-1000 named at l.88, content not verified) |
| FR-5 | night window human only | 2.1 AC2 (21:58) | Partial: no AC for the 14:30 daemon-not-denied case or the full sweep |
| FR-6 | bound by earliest boundary | 2.1 AC1, AC5-7 | Covered (worked cases A/negative/own-completion not each an AC) |
| FR-7 | straddle, 4 clauses | 2.1 AC5, AC6, AC7 | Partial: clause 2 (02:00+600, 08:55 superseded) has no AC |
| FR-8 | quota cap, concurrency | 2.3 AC1, AC6, AC7 | Covered; AC6 passes without any boundary, see EPC-4 |
| FR-9 | cited rationale, suppressed[] | 1.2 AC4, 4.2 AC1, 4.3 AC1 | Covered |
| FR-10 | degrade safely, port table | 2.2 AC1-6 | Covered; clock-down result conflicts with PRD, EPC-5 |
| FR-11 | append-only journal | 1.3 AC1-2, 4.1 AC3 | Partial: no AC for the INSERT/SELECT-only role grant, nor for "0 decisions dropped when bus is down" other than 4.1 AC3 (version events, not decisions) |
| FR-12 | policy versioning | 3.3 AC1, 4.1 AC1-2 | Covered |
| FR-13 | engine purity | 1.2 AC5, 4.2 AC1 | Partial: no AC for fixtures-unreadable test or 10 000 replays (4.2 AC1 uses two evaluations) |
| FR-14 | console as API clients, preview gate | 3.1, 3.3, 4.3 | Covered (the black-box console client test has no AC; l.321 says UI criteria are "plan") |
| FR-15 | doc-lint | 4.3 AC3 | Covered (script, not a test/atdd test) |
| FR-16 | no "error" wording | 4.3 AC4 | Covered, COPY-01 planned only |

### Missing Requirements

No FR is entirely absent from the epics. Gaps are in depth (partial rows above) and in PRD/epic contradictions:

- EPC-1 (Medium): ACs weaker than PRD quantifiers: FR-3 clause 3, FR-4 scope check, FR-5 daemon case, FR-7 clause 2, FR-11 role grants, FR-13 10 000 replays and fixtures-unreadable, NFR-3 10 000 replays, NFR-5 10 000 poisoned decisions (4.2 AC2 is one fixture), NFR-12 (>= 90 % single-rule match) and NFR-13 inheritance test have no AC at all although cited by 1.2/2.3/4.2/2.2.
- EPC-2 (Medium): Story 3.4 (lift) has no full contract (l.222, l.229, DL-45); the PRD goal "lift in under 60 s" (prd.md l.57) is "no verificado" in the epics (l.229).
- EPC-3 (High): FR-2 and Story 3.5 AC4 (l.257) state that an exam-bound request inside an allowance is still denied by R-TIER-01, R-TIER-02, R-AUTH-01, R-AUTH-02, R-QUOTA-01 or R-FLEET-01. In the PRD catalogue R-FRZ-02 has precedence 2 and is terminal (prd.md l.327), so none of those rules (P4-P14) can ever run for such a request; prd.md l.362 itself concedes "R-AUTH-01 at 8 and R-AUTH-02 at 7 never run for an exam-bound request". FRZ-QUANT-01 as worded cannot be written to pass.
- EPC-4 (High, same root as PRD-C): R-BOUND-01 (P13) precedes R-QUOTA-01 (P14); Story 2.3 AC6 (zero balance -> DENY QUOTA_EXHAUSTED, EV-EX1) holds only when no boundary applies. A zero-quota request that reaches a boundary is admitted with a deadline. No AC covers the combination.
- EPC-5 (Medium): Story 2.2 AC2 (l.120) returns 503 DECISION_NOT_PRODUCED when the Clock port returns no instant, while prd.md FR-16 (l.440) says the engine is "never" unable to decide and FR-10 (l.434) says clock failure is FAIL_CLOSED / R-DEP-01. The epic cites "ruling G-09 confirmado, DL-33"; DL-33 not opened (ai-log forbidden), so "not verified".
- EPC-6 (Medium): Story 1.2 AC3 (l.49) makes R-TIER-01 fire when the model floor exceeds requested VRAM; the PRD R-TIER-01 predicate (l.330) has no model-floor term. Documents disagree on the rule's condition (same root as PRD-D).
- EPC-7 (Low): Story 1.1 AC1 requires "un outbox", but outbox/writer (row 11) is listed only under 1.3 (l.65), not 1.1's Files (l.19).
- EPC-8 (Low): Story 2.3 AC2 (l.144) gives actor_ref mismatch as cause INVALID_REQUEST; the PRD R-VALID-01 row (l.319) maps an unresolvable actor_ref to ACTOR_UNKNOWN. Cause for a mismatch is not unambiguous in the PRD.

### Coverage Statistics

- Total PRD FRs: 16
- FRs covered in epics (traceability claim): 16
- Coverage percentage: 100 % by traceability claim; of these, 9 of 16 (FR-1, FR-6, FR-8, FR-9, FR-10, FR-12, FR-14, FR-15, FR-16 minus the qualifications above) have ACs matching their PRD acceptance condition, and 7 are only partially covered at AC level (FR-3, FR-4, FR-5, FR-7, FR-11, FR-13 and FR-2 for EPC-3). (Count of fully AC-matching FRs is this audit's own judgement, not a skill-defined metric.)
- NFRs referenced: 13 of 13; NFR-12 and NFR-13 have no AC that measures them.

## UX Alignment Assessment (Step 4)

### UX Document Status

Found (explicit paths): ux/DESIGN.md, ux/EXPERIENCE.md (read completely, 365 lines), ux/C-UX-Scenarios/00-ux-scenarios.md (read completely), scenario-3.md l.50-200 and scenario-4.md l.52-202 (read; remaining lines of scenarios 1-4 scanned by heading only), the three wireframes (scanned by heading only), planning/ux-state-contract-map.md and planning/accepted-concerns.md (read completely), ARCHITECTURE.md sections 1.1 (l.1-34), 5.1-5.3 (l.477-543), 7 (l.697-727) and 15 (l.1079-1203) (read). UX is a UI-heavy requirement set (UX-1..UX-6) and FR-14 of the PRD requires an evaluator and a freeze console.

### Alignment Issues

- UX-1 (High): UX defines six surfaces (UX-1 evaluator, UX-2 rule catalogue, UX-3 journal, UX-4 freeze console, UX-5 API explorer, UX-6 CLI `aegis`), WCAG 2.1 AA checks (EXPERIENCE.md l.302-319) and responsive rules (l.323-331). No story in epics.md builds any user interface; Story 4.3 only "maps" interface states to the public API and states UI criteria "sin test ejecutable en esta fase" (epics.md l.320). accepted-concerns.md MAJ-2 (l.10) records this as accepted ("The interface stories are not written yet"), while prd.md l.84 and FR-14 (l.438) make the console an owned deliverable. Judged here: a PRD-owned deliverable (FR-14) with no building story, no accessibility story and no responsive story is a coverage gap, not an accepted nuance.
- UX-2 (High): UX-3 Journal calls `GET /policy/journal` (EXPERIENCE.md l.37) but the architecture states "this module has no GET /policy/decisions route" and delegates query to the Audit Ledger (ARCHITECTURE.md l.31, l.1134; prd.md NG-10 l.120). ux-state-contract-map.md l.18 and l.21 mark the journal/trace states "BLOQUEO" / "Abierto" with owner "Juan (por confirmar)". The UX files are unchanged since 2026-09-28 (file dates) and still specify a 10 000-row virtualised journal with CSV export (EXPERIENCE.md l.186) that no M2 API serves.
- UX-3 (High): degraded freeze activation. EXPERIENCE.md l.196 and Flow 05 (l.358) offer "ACTIVATE WITHOUT VERIFIED RESERVATIONS" and a `degraded_preview: true` flag on FreezeState. PRD FR-14 (l.438) and 9.1 (l.476) make a preview a server-enforced precondition; ARCHITECTURE.md l.491 says "there is no degraded activation path"; epics.md Story 3.1 AC2 (l.171) blocks activation on preview failure; the PRD FreezeState (l.171-173) has no `degraded_preview` field. Open per ARCHITECTURE.md l.1131.
- UX-4 (Medium): preview content. UX and scenario-4 (l.84-105) show five tiles (`requests denied`, `of which RUNNING`, `reservations surviving`, `GPU-hours reclaimed`, `next protected window`) plus 6 machines returned; ARCHITECTURE.md l.507 and PreviewFreezeResponseDto return only `denied_count`, `survivors[]`, `next_protected_window` (+ runtime_snapshot). Open per ARCHITECTURE.md l.1137.
- UX-5 (Medium): `WINDOW_STARTED` (EXPERIENCE.md l.194) has no contract; contracts accept a freeze that has started (ARCHITECTURE.md l.1130). The Law-5 text says the preview route "returns a token" (EXPERIENCE.md l.16) but the route returns a DecisionDto (l.1136). Both open.
- UX-6 (Medium): the clock-override preview route `POST /policy/decisions/preview` (ARCHITECTURE.md l.486) and the `aegis` CLI and API-explorer/console-parity test (EXPERIENCE.md l.202-210) have no story; Story 4.3 mentions `api/cli/` only as a file row (epics.md l.313).
- UX-7 (Medium): EXPERIENCE.md Law 2 (l.13) says "The Error state is reserved for the engine being unable to decide at all", while 4.3 (l.143) says there is no engine-cannot-decide state; ARCHITECTURE.md l.501 says "5xx is reserved for the engine being unable to decide", Story 2.2 AC2 returns 503 DECISION_NOT_PRODUCED, and PRD FR-16 (l.440) says the engine "never" is unable to decide. Four documents give three positions on whether an engine-unable-to-decide outcome exists (same root as EPC-5).
- UX-8 (Medium): scenario-4.md l.197 has the freeze lifted at "14:48" for a freeze whose window ends 14:00 (scenario-4 l.62-63) and says 4 requests are "still blocked at that instant"; by the PRD's own lifecycle (prd.md l.471) the freeze is EXPIRED at 14:00 and `lift` of a non-ACTIVE freeze is FREEZE_NOT_LIFTABLE (epics.md l.234). EXPERIENCE.md Flow 04 (l.353) says "40 minutes later". Internally inconsistent timing in the highest-stakes scenario.
- UX-9 (Low): scenario-4.md l.193 says a failed `exam_binding` entitlement check makes `R-VALID-01` answer `DENY(NOT_AUTHORIZED)` and, in the next sentence, that "R-FRZ-01 matches and the request is denied by the freeze"; R-VALID-01 (P-1) is terminal, so R-FRZ-01 cannot be the primary rule. Also the preview-token HMAC in scenario-4 l.82 omits `actor_id`, which ARCHITECTURE.md l.491 includes.
- UX-10 (Low): 00-ux-scenarios.md l.5 cites `reviews/review-ux-edge-cases.md` (35 findings triaged there); the file is absent (accepted-concerns MIN-4); the UX triage evidence is "not verified". Rule-count/route-count drift: UX says "13 routes"; architecture now has 14 operations (ARCHITECTURE.md l.1120).
- UX-11 (Info): UX files are dated 2026-09-28 and were not updated after the 2026-10-21 architecture and contract changes (accepted-concerns MIN-5); ux-state-contract-map.md l.3 and l.26 itself says the mapping is "parcial" and "no afirma que todos los estados originales tengan contrato".

UX vs PRD: user journeys S-1..S-4 match PRD S-1..S-4 (prd.md l.525-528); the 19-rule catalogue, precedences 10/12/13 etc. in UX match the PRD; UX requirements not in PRD: journal query UI, degraded activation, clock override, CLI, API explorer, WCAG checks, mobile support (390 px).
UX vs Architecture: performance needs in UX (120 ms skeleton floor, <3 s slow treatment, 10 000-row journal) are unsupported by an architecture that has no journal query; NFR-1/NFR-9 cover only the engine and fan-out.

### Warnings

- Warning: the epics contain no story that implements any UX surface, so UX-heavy acceptance (accessibility, responsive, copy table) cannot be verified in sprint 1-3 as planned.
- Warning: seven UX-versus-architecture divergences are recorded "open" with owner "to confirm" and target "before implementation sprint 1" (ARCHITECTURE.md l.1126-1138; accepted-concerns.md l.9); none is closed by any change to the UX files.

## Epic Quality Review (Step 5)

Sources: epics.md (read completely), criteria-test-map.md (read completely, 72 lines), test/traceability-matrix.md, test/nfr-evidence.md, reviews/phase-3-4-findings.md and reviews/review-test-quality.md (all read completely), test/story-index.json (first 60 lines and the "depends" keys scanned; 15 ids), test/atdd/m2_contracts.test.ts and m2_domain.test.ts (scanned: test titles only, 49 + 9 = 58 tests; bodies not read), contracts.md (greps of policy_version, publishVersion, error-catalog rows, open points; not read completely), ports-and-adapters.md (grep of rows 1-12, 25-27, 29). Existence-only checks (files not opened): test/arch, test/rules, test/props, test/scenario, test/ux, test/concurrency, test/contract are ABSENT; test/ci/readiness.mjs, package.json, tsconfig.json, test/test-design.md, ai-log/decision-log-solu2.md EXIST (not opened).

### Epic structure

| Epic | User value | Independence | Notes |
|---|---|---|---|
| 1 Elena recorre el sistema y comprende una decisión | yes | only if Story 1.1 builds registry, outbox and bus itself (MAJ-5) | 3 stories |
| 2 Elena respeta clases y recibe negativas ante fallos | yes | uses Epic 1 only; AC 2.1-6 needs freeze facts (MIN-5) | 3 stories |
| 3 Rebecca previsualiza y confirma una congelación | yes | uses Epic 1 only (3.1 Depends 1.1) | 5 stories |
| 4 Elena y Rebecca pueden auditar y operar con evidencia | mixed; Story 4.4 is a declared technical enabler with no user value (epics.md l.329) | backward dependencies only | 4 stories |

Dependency graph (epics "Depends on" and story-index.json "depends"): 1.1 none; 1.2<-1.1; 1.3<-1.1; 2.1<-1.1; 2.2<-1.1; 2.3<-1.2; 3.1<-1.1; 3.2<-3.1; 3.3<-3.1,3.2; 3.4<-3.3; 3.5<-3.3; 4.1<-1.3; 4.2<-1.2,2.2; 4.3<-1.1,3.3,4.1; 4.4<-1.2,2.2,4.1. All declared dependencies point backwards; no cycles. Hidden dependencies are listed below.

### Best-practices checklist

| Check | E1 | E2 | E3 | E4 |
|---|---|---|---|---|
| Delivers user value | yes | yes | yes | partly (4.4 no) |
| Functions independently | not as written (MAJ-5) | yes, with MIN-5 | yes | yes |
| Stories sized | 1.2 bundles 5 ACs of different concerns (6-8 h, DL-46 reasoned) | 2.1 has 7 ACs, 8-12 h | 3.5 split done | 4.3 has 4 ACs, 2 not executable |
| No forward dependencies | 1.1 hidden (MAJ-5) | declared ok | 3.1 file list omits outbox/writer used by AC3 | ok |
| Tables created when needed | no, one migration (MAJ-10) | idem | idem | idem |
| Clear ACs | mostly Given/When/Then | yes | 3.1 AC1 vague | 4.1 AC1-2 rest on open contract points |
| FR traceability | yes | yes | yes | yes |

### Findings by severity

#### Critical Violations

- CRIT-1: No story builds any user interface. PRD FR-14 (prd.md l.438) and section 3.1 (l.84) make the interactive evaluator and freeze console a deliverable owned by M2; UX specifies six surfaces, WCAG checks and responsive rules (EXPERIENCE.md l.26-33, 302-331). epics.md has no UI story; Story 4.3 only maps states to the API and says interface criteria have no executable test because "no hay código de interfaz" (l.320); accepted-concerns.md MAJ-2 (l.10) records "The interface stories are not written yet". A PRD-owned FR whose primary deliverable is unplanned is an uncovered requirement under the skill's step-3 rule. Remediation: write UI stories (evaluator, freeze console, rule catalogue, CLI) with accessibility and responsive ACs, or change FR-14 and section 3.1 in the PRD.

#### Major Issues

- MAJ-1 (PRD-C, EPC-4): rule order makes FR-8 false. R-BOUND-01 (P13, "Every workload kind", prd.md l.338) precedes R-QUOTA-01 (P14, l.339) and R-QUOTA-02 (P15). A request with remaining <= 0 whose run reaches a boundary in B is admitted with a HARD_DEADLINE instead of DENY(QUOTA_EXHAUSTED), while FR-8 (l.432) says 100 % of remaining = 0 are DENY. Story 2.3 AC6 (EV-EX1) passes only for inputs with no boundary. Whether M8's commit would catch it is not verified.
- MAJ-2 (EPC-3): FR-2's "six excluded rules" (prd.md l.426; epics Story 3.5 AC4 l.257, FRZ-QUANT-01) cannot be produced: R-FRZ-02 at P2 is terminal for a validated exam binding, so P4-P14 never run (prd.md l.362 concedes this for R-AUTH-*). The acceptance condition is unsatisfiable as written and the planned test cannot be written to pass.
- MAJ-3: the PRD marked FINAL is internally inconsistent: 19 vs 21 rules (l.78, 284, 317-342, 425, 455, 546); "four state values" (l.433) vs three (l.226, 232); NFR-4 (l.453, "t < b" at a start boundary) vs FR-4 (l.428, start included), recorded only as an erratum in ARCHITECTURE.md l.1117; NP-5 (l.510) gives R-TIER-01 a model-floor condition its predicate (l.330) lacks (epics Story 1.2 AC3 follows NP-5); FR-13 and 6.5 speak of Go packages while the stack is TypeScript (ARCHITECTURE.md l.699; accepted-concerns MAJ-3); two rows numbered 11 (l.360, 362); NP-9 cites step 4 (l.514) where the bound is step 3 (l.288). The corrections live in ARCHITECTURE.md 15.4 only; the PRD is unchanged.
- MAJ-4: UX contradicts PRD, architecture and contracts, and no UX file changed. Seven items are "open - UX correction pending ... before sprint 1" (ARCHITECTURE.md l.1126-1138): WINDOW_STARTED, degraded activation, node_class_id, journal route, preview "returns a token", preview tiles RUNNING and GPU-hours, state-to-contract map. Further contradictions found here: prd.md l.81 says activating a freeze "is published as a policy-version change" and scenario-4/EXPERIENCE show v41 to v42, but contracts.md l.106 defines policy_version as "the published_seq in force at campus_now" (no new version); scenario-4 l.197 lifts at 14:48 a freeze that ended at 14:00 (UX-8).
- MAJ-5: Story 1.1 declares "Depends on: Ninguna" (epics.md l.21) but needs components the epics assign to later stories. AC1 (l.26) requires an outbox row, yet outbox/writer (ports-and-adapters row 11) is in Story 1.3's file list (l.65) and not in 1.1's (l.19); AC3 (l.28) requires "bus alcanzable" for /ready, yet ports/out/event_bus and adapters/sim/event_bus (rows 25, 41) are in Story 4.1 (l.271); the card cites a rule from a frozen registry (PRD 6.1 step 0), yet policy/registry and boot_validator (rows 6, 8) are in Story 1.2 (l.40). Story 3.1 AC3 (l.172) writes an outbox row but its file list (l.163) omits outbox/writer.
- MAJ-6: verification is almost entirely planned. criteria-test-map.md (58 rows): 39 "executable red" (all fail today by design with NotImplementedError, review-test-quality.md l.8), 16 "no test: test planned for implementation", 2 "measurement plan, not executable", 1 "script check". nfr-evidence.md l.3: every production NFR is PLANNED (13 of 13 PLANNED, 0 measured). Story 4.4 is a technical enabler with no user value and no executable test (epics.md l.329, 336). NFR-12 and NFR-13 are cited by stories but no AC measures them. PRD gates AG-5..AG-11 are marked "PASS" (prd.md l.546-552) citing test/arch, test/rules, test/props, test/scenario, test/concurrency, test/contract files whose directories are ABSENT. epics.md l.364 itself says no sprint starts "mientras el gate final no esté firmado".
- MAJ-7: open decisions that change behaviour are unresolved. epics.md l.7: "Los huecos G-01..G-10 no son decisiones humanas cerradas". accepted-concerns MAJ-9 (l.13): estimated_need has no formula (R-QUOTA-02 `remaining < estimated_need`, prd.md l.340, cannot be coded), node_class_id in the request, publishVersion body/role/status/error/concurrency (contracts.md l.250 points a-g), the M9 obligation event name, HMAC secret source, time zone A-3 (prd.md l.130), NFR-11 socket stub, 18 deferred findings (ARCHITECTURE.md 15.6; several "not verified"). PRD OQ-1, OQ-3, OQ-4 open. Story 4.1 AC2 and Story 3.4 rest on these points.
- MAJ-8 (EPC-5, UX-7): "engine unable to decide" is specified three ways: PRD FR-16 (l.440) "never"; EXPERIENCE Law 2 (l.13) vs section 4.3 (l.143); ARCHITECTURE.md l.501 "5xx is reserved for the engine being unable to decide" and Story 2.2 AC2 (503 DECISION_NOT_PRODUCED when the clock returns no instant, ruling G-09), while FR-10 (l.434) says clock failure is FAIL_CLOSED / R-DEP-01.
- MAJ-9 (EPC-1): acceptance criteria are weaker than the PRD quantifiers they claim to cover: no AC for FR-3 clause 3, FR-4 scope check, FR-5 daemon at 14:30, FR-7 clause 2, FR-11 role grants, FR-13 fixtures-unreadable and 10 000 replays, NFR-3 10 000 replays, NFR-5 10 000 poisoned decisions (4.2 AC2 is one fixture), NFR-12, NFR-13. Story 3.1 AC1 and Story 2.3 AC1 lack a route and a measurable outcome; criteria-test-map.md l.37 states only the clock-first part of 2.2 AC1 is tested.
- MAJ-10: all tables are created in one migration per engine (epics.md l.357; DL-47 "no prior decision found, reason not verified, pendiente de confirmación"). The skill's step 5 section 4.B lists "Epic 1 Story 1 creates all tables upfront" as wrong and "Database creation violations" as Major.

#### Minor Concerns

- MIN-1: Stories 1.3, 2.3, 4.2 are written "Como Elena" but express system properties (idempotent replay, no credentials, byte-identical replay); 1.2 mixes a boot validator (AC2) and a CI import check (AC5) with a user-visible constraint (AC1).
- MIN-2: no AC covers an unauthenticated call (ARCHITECTURE.md l.481 and M2-AD-9: 11 of 13 routes authenticate) nor 400 WIRE_SHAPE_INVALID on POST /policy/decisions (contracts.md l.160), except the freeze draft (3.1 AC3); several ACs are single-clause lists (3.1 AC1, 2.3 AC1, 4.1 AC1).
- MIN-3: Story 3.4 has no full P/Q/I contract; "lift in under 60 s" (prd.md l.57) is unmeasured (epics.md l.229, DL-45).
- MIN-4: traceability-matrix.md maps FR-8 (quota) to EV-Q2, EV-AUTH-01/02, EV-SYS-01 (l.14) and FR-5 to EV-SYS-01 (l.11); the quota-exhausted test EV-EX1 is not mapped to FR-8 there although Story 2.3 AC6 uses it. ARCHITECTURE.md l.5 says "9 acceptance gates" while the PRD has AG-1..AG-11; "13 routes" vs 14 operations (errata l.1120); "8 typed fact ports" (l.25) vs 10 ports.
- MIN-5: Story 2.1 AC6 (freeze at 03:00) uses freeze facts whose aggregate is built in Epic 3; the declared dependency is only 1.1 (acceptable if fixtures seed freezes; not stated).
- MIN-6: epics.md is in Spanish while PRD, architecture and UX are in English (accepted-concerns MIN-6); identifiers are shared.
- MIN-7: reviews/review-ux-edge-cases.md is cited by 00-ux-scenarios.md l.5 and is ABSENT; scenario-3 E-1 shows valid_until 04:10:00 for a run ending 04:10:44.900; scenario-4 l.193 contradicts itself on which rule is primary after a failed binding (UX-9).
- MIN-8: no project-setup story; epics.md l.349-358 says setup is "already in place" (package.json, tsconfig.json, test/ci/readiness.mjs exist per the existence check; contents not opened, so the script names, CI YAML and "Vitest defaults" claims are not verified).

### Quality assessment

No epic is a pure technical milestone (4.4 is a declared enabler inside Epic 4); declared dependencies are acyclic and backward; FR traceability is complete on paper. The main structural defects are an unbuilt UI (CRIT-1), hidden dependencies of Story 1.1 (MAJ-5), PRD rule-order contradictions that make two acceptance conditions unsatisfiable (MAJ-1, MAJ-2) and a large open-decision backlog (MAJ-7).

## Summary and Recommendations (Step 6)

### Overall Readiness Status

NOT READY

Basis: 1 Critical, 10 Major and 10 Minor consolidated findings (below). The skill defines no numeric threshold; the status is this audit's judgement from the skill's three-value scale. The epics document itself states "Stop-Point: no implementar" (epics.md l.3), that G-01..G-10 "no son decisiones humanas cerradas" (l.7) and that no sprint starts while the final gate is unsigned (l.364).

### Consolidated findings (IDs from step 5; step 2-4 items are folded in, mapping given)

Critical (1)
- CRIT-1: no story builds the evaluator/freeze console or any UI although FR-14 and PRD 3.1 make it an owned deliverable (folds UX-1, accepted-concerns MAJ-2).

Major (10)
- MAJ-1: R-BOUND-01 (P13) precedes R-QUOTA-01/02 (P14/15); FR-8's "remaining = 0 -> 100 % DENY" is false when a boundary applies (PRD-C, EPC-4).
- MAJ-2: FR-2 "six excluded rules" and Story 3.5 AC4 unsatisfiable because R-FRZ-02 (P2) is terminal (EPC-3).
- MAJ-3: PRD "FINAL" is internally inconsistent (19 vs 21 rules, 4 vs 3 trace states, NFR-4 vs FR-4, NP-5 vs R-TIER-01, Go vs TypeScript, numbering) (PRD-A, B, D, E; EPC-6).
- MAJ-4: UX contradicts PRD/architecture/contracts; 7 divergences open, UX files unchanged; freeze-as-version contradiction; scenario-4 lift at 14:48 after a 14:00 end (UX-2..UX-6, UX-8, UX-11).
- MAJ-5: Story 1.1 "Depends on: Ninguna" but needs registry (1.2), outbox writer (1.3) and event bus (4.1); 3.1 AC3 needs outbox writer (EPC-7).
- MAJ-6: verification almost all planned: 39 executable red (fail by design), 16 planned tests, 2 measurement plans, 1 script check; 13/13 NFRs PLANNED; PRD AG-5..AG-11 marked PASS citing ABSENT test directories; 4.4 enabler has no user value.
- MAJ-7: open decisions that change behaviour (estimated_need formula, node_class_id, publishVersion points a-g, M9 event, HMAC secret, A-3, OQ-1/3/4, 18 deferred findings, G-01..G-10) (PRD-G).
- MAJ-8: "engine unable to decide" specified three ways (FR-16, EXPERIENCE law 2 vs 4.3, ARCHITECTURE l.501 and Story 2.2 AC2 503) (EPC-5, UX-7).
- MAJ-9: ACs weaker than PRD quantifiers; NFR-12/13 not measured by any AC (EPC-1).
- MAJ-10: all tables created in one migration (skill step 5 4.B violation).

Minor (10)
- MIN-1 user-story voice on system properties; MIN-2 no AC for unauthenticated call / WIRE_SHAPE_INVALID on decisions, single-clause ACs; MIN-3 lift contract incomplete and 60 s unmeasured (EPC-2); MIN-4 traceability-matrix/ARCHITECTURE header count mismatches (9 vs 11 gates, 13 vs 14 routes, 8 vs 10 ports); MIN-5 Story 2.1 AC6 needs freeze facts from Epic 3; MIN-6 Spanish epics vs English docs; MIN-7 missing review-ux-edge-cases.md and small arithmetic/wording slips in scenarios (UX-9, UX-10); MIN-8 setup claims not verified; MIN-9 actor_ref mismatch cause: Story 2.3 AC2 says INVALID_REQUEST, PRD R-VALID-01 row says ACTOR_UNKNOWN (EPC-8); MIN-10 PRD cites a readiness-gate report for test ids and the NFR-11 cold-start record; that artefact was not opened, so those ids are "not verified" (PRD-F).

### Coverage statistics (from step 3)

- Total PRD FRs: 16; FRs covered in epics: 16; coverage 100 % by traceability claim (all 16 FRs appear in at least one story's Traceability line). AC-level: 7 of 16 FRs only partially covered (FR-2, FR-3, FR-4, FR-5, FR-7, FR-11, FR-13); FR-14 is covered only for its API half (CRIT-1).
- NFRs: 13 of 13 referenced by a story; 13 of 13 PLANNED, 0 measured.
- Acceptance criteria: 58 (epics) = 58 rows in criteria-test-map.md; 39 executable red, 16 planned-only, 2 measurement plans, 1 script check. Red tests present: 58 (49 + 9, title scan).

### Critical Issues Requiring Immediate Action

1. CRIT-1: add stories (or re-scope FR-14) so the console and evaluator are planned and testable.
2. MAJ-1 and MAJ-2: fix the rule order or the acceptance wording in the PRD (R-BOUND-01 vs quota rules; R-FRZ-02 vs the six rules) before tests are written against them.
3. MAJ-5: assign owners for registry, outbox writer and event bus so Story 1.1 is completable.

### Recommended Next Steps

1. Edit the PRD (the single source) to resolve MAJ-3 and the MAJ-1/MAJ-2 contradictions, instead of recording errata in the architecture only.
2. Close or explicitly decide the MAJ-7 list (estimated_need, node_class_id, publishVersion points, clock-unavailable behaviour), and update the UX files for the seven open divergences (MAJ-4).
3. Rewrite ACs to the PRD quantifiers (MAJ-9), add NFR-12/13 measurement ACs, and either create the test directories cited by AG-5..AG-11 or change those gates from PASS (MAJ-6).

### Final Note

This assessment identified 21 consolidated issues (1 Critical, 10 Major, 10 Minor) across 5 categories (PRD, epic coverage, UX alignment, epic quality, test/evidence). Address the critical issues before proceeding to implementation. These findings can be used to improve the artifacts or you may choose to proceed as-is.

Assessed on 2026-10-21 by an independent run of bmad-check-implementation-readiness over the explicit document list (no signature).
