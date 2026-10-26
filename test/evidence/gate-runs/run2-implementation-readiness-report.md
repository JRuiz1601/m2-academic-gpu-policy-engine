---
stepsCompleted: [step-01-document-discovery, step-02-prd-analysis, step-03-epic-coverage-validation, step-04-ux-alignment, step-05-epic-quality-review, step-06-final-assessment]
filesIncluded:
  prd: planning/prd.md
  architecture: [planning/ARCHITECTURE.md, planning/detailed-design/contracts.md, planning/detailed-design/ports-and-adapters.md, planning/detailed-design/schemas/]
  ux: [ux/DESIGN.md, ux/EXPERIENCE.md, ux/C-UX-Scenarios/, ux/wireframes/]
  epics: planning/epics.md
  supporting: [planning/criteria-test-map.md, test/traceability-matrix.md, test/story-index.json, test/atdd/, reviews/, planning/ux-state-contract-map.md]
---

# Implementation Readiness Assessment Report

**Date:** 2026-10-21
**Project:** DesarrolloIA (module M2 - Academic GPU Policy Engine)

## Document Discovery

Discovery was run against the module folder (M2-Academic-GPU-Policy-Engine), overriding the skill's default `{planning_artifacts}` patterns, per the audit instructions. No file from `_bmad-output` was searched or opened.

### PRD Files Found
**Whole Documents:**
- planning/prd.md (107,788 bytes, 2026-09-28)
**Sharded Documents:** none

### Architecture Files Found
**Whole Documents:**
- planning/ARCHITECTURE.md (217,002 bytes, 2026-10-21)
- planning/detailed-design/contracts.md (51,093 bytes, 2026-10-21)
- planning/detailed-design/ports-and-adapters.md (32,491 bytes, 2026-10-21)
**Schemas folder (planning/detailed-design/schemas/):**
- 001_m2_schema.postgres.sql (46,865), 001_m2_schema.sqlite.sql (56,126), dto.ts (24,740), events.md (27,406), openapi.yaml (42,915)
**Sharded Documents:** none

### Epics & Stories Files Found
**Whole Documents:**
- planning/epics.md (35,090 bytes, 2026-10-21)
**Sharded Documents:** none

### UX Design Files Found
**Whole Documents:**
- ux/DESIGN.md (23,383 bytes, 2026-09-28)
- ux/EXPERIENCE.md (49,011 bytes, 2026-09-28)
- ux/C-UX-Scenarios/: 00-ux-scenarios.md, scenario-1.md, scenario-2.md, scenario-3.md, scenario-4.md
- ux/wireframes/: wireframe-01-evaluator-deny.md, wireframe-02-constrain-deadline.md, wireframe-03-freeze-console.md

### Supporting evidence (read-only)
- planning/criteria-test-map.md, planning/ux-state-contract-map.md, test/traceability-matrix.md, test/story-index.json, test/atdd/ (m2_contracts.test.ts, m2_domain.test.ts), reviews/ (6 files)

### Issues Found
- Duplicates (whole + sharded): none.
- Missing documents: none of the four required types.
- Note: the PRD, EXPERIENCE and UX files are dated 2026-09-28 while epics/architecture are dated 2026-10-21 (staleness risk, to be checked in later steps).

## PRD Analysis

Source: planning/prd.md (607 lines, read completely, status "FINAL", revision 3, frontmatter line 6-7). The PRD numbers its own requirements FR-1..FR-16 (section 7, lines 425-440) and NFR-1..NFR-13 (section 8, lines 450-462). Short titles are given below; the full text is the cited table row in the PRD (not re-copied here to avoid transcription drift).

### Functional Requirements

- FR-1 (prd.md:425): Resolve a request to exactly one terminal outcome and one admission; 0 null primary_rule_id.
- FR-2 (prd.md:426): Enforce institutional freeze overrides; allowance by exact reservation id (R-FRZ-01 / R-FRZ-02).
- FR-3 (prd.md:427): Enforce VRAM / GPU-count tier gate against the heterogeneous fleet (R-TIER-01/02/03), three disjoint clauses.
- FR-4 (prd.md:428): Protect scheduled lab, class and exam windows from background load (R-LAB-01/02), half-open boundary sweep.
- FR-5 (prd.md:429): Enforce the overnight training window for HUMAN actors (R-NIGHT-01); daemon not denied by it.
- FR-6 (prd.md:430): Bound an admission by its earliest institutional boundary (R-BOUND-01), worked cases.
- FR-7 (prd.md:431): Prevent boundary straddle (mandatory edge case), four clauses incl. single-deadline over 10 000 contexts.
- FR-8 (prd.md:432): Cap requests against remaining quota without read-then-write (R-QUOTA-01/02), integer units, concurrency clause.
- FR-9 (prd.md:433): Deterministic cited explanation for every decision, including suppressed[] facts; zero model invocation.
- FR-10 (prd.md:434): Degrade safely when a fact source is unavailable/stale; per-port admission and display tolerance table.
- FR-11 (prd.md:435): Journal every decision append-only, without blocking admission.
- FR-12 (prd.md:436): Version policy and pin decisions to exactly one version.
- FR-13 (prd.md:437): Keep the engine free of ambient time, I/O and randomness (import allow-list).
- FR-14 (prd.md:438): Interactive evaluator and freeze console as clients of the public API; mandatory consequence preview.
- FR-15 (prd.md:439): Doc-lint banned-term list and unnamed-role check.
- FR-16 (prd.md:440): Reserve the word "error" for a broken surface; a DENY is never rendered as an error.

Total FRs: 16

### Non-Functional Requirements

- NFR-1 (prd.md:450): evaluate() latency p99 <= 5 ms, p50 <= 1 ms at 100 concurrent.
- NFR-2 (prd.md:451): Decision-path purity, 0 network calls from engine/, 0 model invocations.
- NFR-3 (prd.md:452): Determinism, 100% byte-identical over 10 000 replays.
- NFR-4 (prd.md:453): Boundary correctness at b-1ms, b, b+1ms, 0 exceptions.
- NFR-5 (prd.md:454): No credential/PII leakage.
- NFR-6 (prd.md:455): Explanation completeness, 100%.
- NFR-7 (prd.md:456): Policy activation <= 5 s.
- NFR-8 (prd.md:457): Journal availability <= 30 s.
- NFR-9 (prd.md:458): Fact fan-out p99 <= 45 ms at 100 concurrent; reconciliation invariant with FACT_TIMEOUT_MS.
- NFR-10 (prd.md:459): Explanation render p99 <= 2 ms.
- NFR-11 (prd.md:460): Independent runnability (make dev, 0 external services, stub servers on bound sockets).
- NFR-12 (prd.md:461): Rule precision >= 90% single-rule match; 0% needless constraints.
- NFR-13 (prd.md:462): Fail-closed coverage, port table is sole authority.

Total NFRs: 13

### Additional Requirements

- 19 rules in a strict total precedence order, range [-1, 1000], boot-validated (prd.md:313, 319-342): R-VALID-01, R-DEP-01, R-FRZ-01, R-FRZ-02, R-TIER-03, R-TIER-02, R-TIER-01, R-FLEET-01, R-AUTH-02, R-AUTH-01, R-LAB-02, R-LAB-01, R-SYS-01, R-NIGHT-01, R-BOUND-01, R-QUOTA-01, R-QUOTA-02, R-CONTEND-01, R-ALLOW-01 (count by listing = 19).
- Mandatory non-happy paths NP-1..NP-12 (prd.md:506-517); NP-1 and NP-2 are marked mandatory.
- Acceptance gates AG-1..AG-11 (prd.md:542-552); constants (prd.md:259-268); closed sets (prd.md:222-228); canonical ordering (prd.md:405-415); freeze lifecycle with preview_token (prd.md:470-476); quota commit protocol (prd.md:491-496).
- Non-goals NG-1..NG-10 (prd.md:109-120). Assumptions A-1..A-7 and open questions OQ-1..OQ-4 (prd.md:126-138); A-1, A-3 are marked RISKY.
- Scenarios S-1..S-8 (prd.md:525-532).

### PRD Completeness Assessment

Strengths: every FR has a measurable acceptance condition; ports, fail modes, constants and the rule catalogue are explicit; non-goals are explicit.

Defects found in the PRD itself:
- PRD-INT-1: rule-count inconsistency. The PRD says "19 rules" (prd.md:21, 285, 546) but also "21 `R-*` rules" (prd.md:79), "3-outcome x 21-rule matrix" (prd.md:425, 455) and "21-rule" in NFR-6. The catalogue table at prd.md:319-342 contains 19 rows. FR-1 and NFR-6 acceptance conditions are therefore written against a number the catalogue does not contain.
- PRD-INT-2: trace-state inconsistency. prd.md:232 says INDETERMINATE is removed and there are "Three states", but FR-9 (prd.md:433) still says "one of the four `state` values" and AG-8-related text elsewhere may rely on the count.
- PRD-INT-3: stale cross-references. NP-9 (prd.md:514) refers to "the minimum bound in section 6.1 step 4", but the bound is computed at step 3 (prd.md:288-299). FR-6 (prd.md:430) says "cases A and B" but names Worked case A, a Negative case and an Own-completion case. Section 6.2.1 contains two rows numbered "11" (prd.md:360 and 362) while the heading says "Thirteen" decisions; NFR-11 points its cold-start record at planning/readiness-gate-report.md (prd.md:460), a file this audit was told not to read (not verified).
- PRD-INT-4: `estimated_need` for R-QUOTA-02 is "derived from model class and declared duration" (prd.md:432) with no formula or unit given; R-QUOTA-02 cannot be tested to a specific value from the PRD alone (not verified elsewhere; to be checked against ARCHITECTURE/contracts).
- PRD-INT-5: section 12 gate results are all "PASS" and AG-5/AG-8 cite tests "listed in the readiness gate report" (prd.md:549) - self-reported, not independently verifiable from the PRD.
- PRD-INT-6: open items declared but unresolved: A-3 (time zone unconfirmed, prd.md:130), OQ-1, OQ-3, OQ-4 (prd.md:135-138).

## Epic Coverage Validation

Source: planning/epics.md (301 lines, read completely). The epics file has no separate "FR Coverage Map" section; coverage is declared per story in the "Traceability (Requirements)" line of each story (epics.md:15, 35, 56, 78, 98, 118, 140, 160, 180, 203, 224, 244, 264). Line 301 states "29 requisitos aparecen" (16 FR + 13 NFR = 29, consistent with the PRD counts). The epics file is written in Spanish; the PRD is in English (language mismatch, no impact on traceability).

### Epic FR Coverage Extracted

- FR-1: Stories 1.1, 1.3 (epics.md:15, 56)
- FR-2: Stories 3.1, 3.2, 3.3 (epics.md:140, 160, 180)
- FR-3: Story 1.2 (epics.md:35)
- FR-4: Story 2.1 (epics.md:78)
- FR-5: Story 2.1 (epics.md:78)
- FR-6: Story 2.1 (epics.md:78)
- FR-7: Story 2.1 (epics.md:78)
- FR-8: Story 2.3 (epics.md:118)
- FR-9: Stories 1.2, 4.2 (epics.md:35, 224)
- FR-10: Story 2.2 (epics.md:98)
- FR-11: Stories 1.3, 4.1 (epics.md:56, 203)
- FR-12: Stories 3.3, 4.1 (epics.md:180, 203)
- FR-13: Stories 1.2, 4.2 (epics.md:35, 224)
- FR-14: Stories 1.1, 3.1, 3.2, 3.3, 4.3 (epics.md:15, 140, 160, 180, 244)
- FR-15: Story 4.3 (epics.md:244)
- FR-16: Story 4.3 (epics.md:244)

Total FRs in epics: 16. No FR appears in the epics that is absent from the PRD.

NFR coverage (for completeness): NFR-1 4.4; NFR-2 1.1, 4.2; NFR-3 1.2, 4.2; NFR-4 2.1; NFR-5 1.3, 2.3, 3.2, 4.2; NFR-6 1.2, 3.1, 4.2; NFR-7 3.3, 4.4; NFR-8 4.4; NFR-9 2.2, 4.4; NFR-10 1.2, 4.4; NFR-11 1.1, 4.3; NFR-12 1.2, 2.3, 4.2; NFR-13 2.2, 4.2. All 13 NFRs are named in at least one story.

### Coverage Matrix

| FR | PRD requirement (short) | Epic coverage | Status at requirement-label level | Depth check against story acceptance criteria |
|---|---|---|---|---|
| FR-1 | One terminal outcome | 1.1, 1.3 | Covered | AC 1.1#1, 1.1#2 cover one ALLOW path and a 400; the "3-outcome x rule matrix, 100%" is not an AC |
| FR-2 | Freeze overrides | 3.1, 3.2, 3.3 | Covered | Only 3.3 AC#3 (epics.md:193) exercises R-FRZ-01/02; 3.1 and 3.2 are preview/draft stories. The six excluded-rule quantifier (prd.md:426) has no AC |
| FR-3 | Tier gate | 1.2 | Covered | 1.2 AC#3 (epics.md:48) covers R-TIER-01/02/03; Clause 3 (RESEARCHER gets ALLOW) has no AC |
| FR-4 | Protected windows | 2.1 | Covered (thin) | 2.1 AC#1 mentions only the 10:00 re-evaluation DENY R-LAB-01; R-LAB-02 (EXAM windows), subject scoping, 4-point boundary sweep are not ACs (tests EDGE-* are named, see step 5) |
| FR-5 | Overnight window | 2.1 | Covered (thin) | 2.1 AC#2 covers 21:58 DENY; the daemon-not-denied clause (prd.md:429) and R-SYS-01 have no AC |
| FR-6 | Earliest-boundary bound | 2.1 | Covered | 2.1 AC#1 (22:00, 800 min, 05:55). The PRD worked cases (01:10/540 min, own-completion, negative case) are not ACs |
| FR-7 | Straddle edge case | 2.1 | Covered (thin) | PRD clause 1 (08:00 EVALUATION, 08:55), clause 3 (freeze at 03:00) and clause 4 (10 000 contexts) are not ACs |
| FR-8 | Quota cap | 2.3 | Covered | 2.3 AC#1 (balance 5, need 10). R-QUOTA-01 zero-balance DENY appears only in 4.3 AC#1; the 100-concurrent commit clause (prd.md:432) is not an AC and M2 has no M8 client |
| FR-9 | Cited explanation | 1.2, 4.2 | Covered | 4.2 AC#1-2; suppressed[] clause (prd.md:433) has no AC (grep "suppressed" in epics.md = 0 hits) |
| FR-10 | Degrade safely | 2.2 | Covered (thin) | 2.2 AC#2 covers only quota @41 ms. Timetable 60 s, Catalog 6 h stale-tolerant, fleet two-port split, notFound vs transport error, malformed-200, clock quality (prd.md:434) have no AC |
| FR-11 | Append-only journal | 1.3, 4.1 | Covered | 1.3 AC#1; the 30 s query clause is delegated to the Audit Ledger (epics.md:218) |
| FR-12 | Policy versioning | 3.3, 4.1 | Covered | 4.1 AC#1-3 |
| FR-13 | Engine purity | 1.2, 4.2 | Covered (thin) | No AC mentions the import allow-list, unreadable fixtures, or the CI gate; 4.2 AC#1 covers byte-identical only |
| FR-14 | Evaluator and console | 1.1, 3.1, 3.2, 3.3, 4.3 | Covered | Epics.md:248, 255 state that the interface states have no code and no executable test in this phase |
| FR-15 | Banned-term doc-lint | 4.3 | Label only | No AC in 4.3 (epics.md:255-256) mentions the lint; epics.md:251 says "lint FR-15 con deuda explicita". See finding in step 6 |
| FR-16 | Reserve "error" | 4.3 | Covered (plan only) | 4.3 AC#1 (epics.md:255): "El copy de la card sin texto prohibido por FR-16 ... quedan como plan" - explicitly no executable test |

### Missing Requirements

No FR is absent at the traceability-label level: 16 of 16 FRs are named in at least one story. The following gaps exist below the label level (PRD rules and clauses with no acceptance criterion in any story):

- Rules with no story, no acceptance criterion and no test: `R-SYS-01`, `R-FLEET-01` (HARDWARE_FAILING, PRD scenario S-7) and the thesis window (PRD scenario S-8) are declared uncovered by decision DL-40 in planning/criteria-test-map.md (last line). grep of epics.md finds 0 hits for R-FLEET, R-CONTEND, R-SYS, R-LAB-02, R-AUTH, QUEUE_ONLY, HARDWARE_FAILING, NIGHT_TRAINING_DAEMON, THESIS, EXAM_BOUND. So of the 19 PRD rules, those named in any story are: R-VALID-01 (2.3), R-DEP-01 (2.2), R-FRZ-01/02 (3.3), R-TIER-01/02/03 (1.2), R-LAB-01 and R-NIGHT-01 (2.1), R-BOUND-01 (by FR-6, 2.1 via valid_until), R-QUOTA-01 (4.3), R-QUOTA-02 (1.2, 2.3), R-ALLOW-01 (1.1, implicitly). Rules with no story: R-FLEET-01, R-AUTH-01, R-AUTH-02, R-LAB-02, R-SYS-01, R-CONTEND-01 (6 of 19). The PRD's own AG-8 requires every rule to be reachable by a passing test (prd.md:549).
- PRD scenarios S-6 (daemon), S-7 (failing hardware), S-8 (thesis) have no story acceptance criterion; S-1 maps to 2.1 only through the 10:00 re-evaluation.
- Whole-clause gaps listed in the matrix above (FR-2 six-rule quantifier, FR-7 clauses 1/3/4, FR-8 concurrency, FR-9 suppressed[], FR-10 table, FR-13 gates, FR-15 lint).
- Note: R-AUTH-01/02 gaps are partly mitigated in the epics by none; this is stated, not inferred (not verified in contracts.md until step 5).

### Coverage Statistics

- Total PRD FRs: 16
- FRs covered in epics (named in at least one story): 16
- Coverage percentage (label level): 100%
- Total PRD NFRs: 13; NFRs named in at least one story: 13 (100%); 8 of 13 NFR (NFR-1, 7, 8, 9, 10 in 4.4, plus others) are measurement plans, not executable tests, per epics.md:20, 264 and criteria-test-map.md rows 4.4.
- Stories: 13 (epics.md:3, 301); acceptance criteria: 29 (counted per story: 2+3+2+2+2+2+2+2+3+3+2+2+2).
- PRD rules with at least one story naming them: 13 of 19 (by the list above); 6 of 19 have none.

## UX Alignment Assessment

### UX Document Status

Found. ux/EXPERIENCE.md (365 lines, read completely, "Status: FINAL", revision 3), ux/DESIGN.md (220 lines, headings and targeted greps only), ux/C-UX-Scenarios/00-ux-scenarios.md plus scenario-1..4 (index read in part, others targeted greps only), ux/wireframes/ (3 files, targeted greps only). UI is clearly implied by the PRD (FR-14 interactive evaluator and freeze console, prd.md:438). All UX files are dated 2026-09-28; ARCHITECTURE.md, epics.md and the detailed design are dated 2026-10-21. The architecture states the UX files were left unchanged on purpose ("nothing in ux/ changes (protected)", ARCHITECTURE.md:1094).

### Alignment Issues

UX versus PRD:
- UX-A1: EXPERIENCE UX-3 Journal calls `GET /policy/journal` (ux/EXPERIENCE.md:30, 37, 186) and 00-ux-scenarios.md:78 relies on it for FR-11. PRD §3.1 and NG-10 (prd.md:83, 120) assign historical query to the Audit Ledger; M2 has no such route (ARCHITECTURE.md:31, 1129). The UX surface has no backing API in this module. Status per ARCHITECTURE.md:1129: "open - UX correction pending ... owner Juan (to confirm), before sprint 1".
- UX-A2: EXPERIENCE offers a degraded freeze activation ("ACTIVATE WITHOUT VERIFIED RESERVATIONS", ux/EXPERIENCE.md:196, 358; wireframe-03 lines 107-142; scenario-4 EC-4.19). PRD FR-14 says activation with a failed preview is blocked (prd.md:438) and ARCHITECTURE.md:491 says "there is no degraded activation path". Direct contradiction between the UX and the PRD/architecture. Status per ARCHITECTURE.md:1126: open.
- UX-A3: The freeze preview tiles `of which RUNNING` and `GPU-hours reclaimed` (ux/EXPERIENCE.md:192, 353; wireframe-03:43; scenario-4:92) have no data source in M2: PreviewFreezeResponseDto has no field for them and the data is job state the engine cannot observe (prd.md:487; ARCHITECTURE.md:507, 1132). Status: open.
- UX-A4: `WINDOW_STARTED` error (ux/EXPERIENCE.md:194) conflicts with the contract that accepts a freeze with starts_at before campus_now (ARCHITECTURE.md:1125). Status: open.
- UX-A5: EXPERIENCE Law 5 and UX-1 say the clock-override preview "returns a token" (ux/EXPERIENCE.md:16); `POST /policy/decisions/preview` returns a Decision (ARCHITECTURE.md:486, 1131). Status: open (ADV-23).
- UX-A6: `node_class_id` is used by architecture/freeze scope but is not a field of the PRD Request (ARCHITECTURE.md:1127). Status: open.
- UX-A7: Counts in the UX: EXPERIENCE says "13-route public API" and "13 routes" (ux/EXPERIENCE.md:6, 32, 210) and names `POST /policy/versions/publish` at line 37; the architecture and openapi now carry 14 operations plus the unauthenticated health/ready pair as 13 + publish (ARCHITECTURE.md:1128, 1179). The UX parity test claim "drives all 13 routes" (ux/EXPERIENCE.md:210) is stale by one route and includes a route (journal) that does not exist.
- UX-A8: Broken reference: ux/C-UX-Scenarios/00-ux-scenarios.md header cites `reviews/review-ux-edge-cases.md` (35 findings). That file is not in reviews/ (listing: phase-3-4-findings.md, review-arch-adversarial.md, review-arch-edge-cases.md, review-arch-implementability.md, review-detailed-design.md, review-prd-adversarial.md, review-test-quality.md). The UX triage evidence is not available (not verified otherwise).
- UX-A9: FR-9 in the PRD says "four `state` values" for trace entries (prd.md:433) while PRD §5.2 and EXPERIENCE/DESIGN (DESIGN.md:5) say INDETERMINATE was deleted (three states). Internal PRD inconsistency that the UX inherits.
- UX-A10: EXPERIENCE copy "applies 19 policy rules" and port counts of "nine" facts versus a "10-cell" port grid (ux/EXPERIENCE.md:116, 119, 127) is internally consistent only by the clock-first split (1 + 9); the PRD port table lists 10 fact rows plus the clock (prd.md:92-101). Not a defect, noted to prevent miscounting.

UX versus Architecture:
- The architecture supports Evaluator (UX-1), Rule Catalogue (UX-2: `GET /policy/rules`, `GET /policy/versions`), Freeze Console (UX-4: six freeze routes) and the API Explorer (UX-5). UX-6 (CLI `aegis`) is mentioned in ARCHITECTURE as the CLI deployment flag (ARCHITECTURE.md:486) and in epics story 4.3 as `api/cli/`; no contract section defines the CLI commands (not verified).
- Performance: UX Loading budget (120 ms skeleton floor, CLS = 0) and PRD NFR-1/NFR-9 are measurement plans only (epics.md story 4.4, status PLANNED).
- Accessibility (EXPERIENCE §7, 14 WCAG checks) and responsive requirements (§8, 390 px freeze console) have no story, no acceptance criterion and no test: story 4.3 states "no hay codigo de interfaz" and leaves Loading/Empty/Error/Success interface states as plan (epics.md:248, 255; planning/criteria-test-map.md row 4.3#1).
- planning/ux-state-contract-map.md (read) is self-declared partial: "Estado de revision: parcial por G-06"; the Journal/trace states and the decision preview (ADV-23) remain unmapped.

### Warnings

- WARN-UX-1: Seven UX-to-API divergences (UX-A1..A6 and the unmapped trace states) are logged as open with "owner Juan (to confirm), before sprint 1" (ARCHITECTURE.md:1125-1133). The owner is not confirmed in the text. The UX files, which are the specification of what the interface does, therefore still contradict the architecture in at least three behavioural places (journal route, degraded activation, preview tiles).
- WARN-UX-2: No epic or story builds any user interface (UX-1 to UX-4). Stories 1.1 and 3.1 name an "API POST /policy/decisions -> ... card Success" scope but the Files line says "not verified (no path in ports-and-adapters.md section 2 for the Success card)" (epics.md:19).
- WARN-UX-3: The PRD (FR-14, prd.md:438) requires an interactive evaluator and a freeze console. With no UI stories the FR-14 requirement is covered only at the API level.

## Epic Quality Review

Method: epics.md read completely; dependencies cross-checked against test/story-index.json (field "depends"); acceptance-criteria-to-test mapping read from planning/criteria-test-map.md and test/traceability-matrix.md; test ids checked by grep of the `test(` declarations in test/atdd/*.ts (48 declarations found; every test id cited by epics.md exists). Finding ids used here are carried unchanged into the Summary and Recommendations.

### Epic structure

| Epic | Title | User value | Independence |
|---|---|---|---|
| 1 | Elena recorre el sistema y comprende una decision | Yes (Elena) | Stands alone; stories 1.1 then 1.2, 1.3 |
| 2 | Elena respeta clases y recibe negativas ante fallos | Yes (Elena) | Uses only Epic 1 (all stories depend on 1.1 or 1.2, story-index.json) |
| 3 | Rebecca previsualiza y confirma una congelacion | Yes (Rebecca) | Uses Epic 1 only (3.1 depends on 1.1) |
| 4 | Elena y Rebecca pueden auditar y operar con evidencia | Mixed: 4.1, 4.2, 4.3 user-facing; 4.4 is declared as a "Habilitador tecnico" (epics.md:262) | Depends on Epics 1-3, no dependency on a later epic |

No epic is a pure technical milestone. Story 4.4 is a technical enabler that the document itself declares as delivering no new capability to Elena or Rebecca (epics.md:262).

### Dependency check

Dependencies in story-index.json all point to earlier stories (1.1 none; 1.2 to 1.1; 1.3 to 1.1; 2.1 to 1.1; 2.2 to 1.1; 2.3 to 1.2; 3.1 to 1.1; 3.2 to 3.1; 3.3 to 3.1 and 3.2; 4.1 to 1.3; 4.2 to 1.2 and 2.2; 4.3 to 1.1, 3.3 and 4.1; 4.4 to 1.2, 2.2 and 4.1). No forward dependency found. The sprint proposal (epics.md:295-297) respects that order. Story 1.2 criterion 1 and story 2.3 criterion 1 both assert the same QUOTA_CAP behaviour through the same test EV-Q2 (epics.md:46, 129; criteria-test-map.md rows 1.2#1 and 2.3#1): duplicated acceptance rather than a dependency defect.

Database timing: epics.md:290 says the schema is one migration per engine that creates all tables at once ("Crear todas las tablas en una migracion es una eleccion presente en los archivos; no hay una decision del registro que la fije (not verified)"), so no story creates the tables it needs. This is the pattern the skill lists as a violation.

Starter template: no starter template is named in the documents read (not verified for ARCHITECTURE.md section 7, which was only scanned by heading); epics.md:282-291 lists the project setup as already in place (package.json, tsconfig, test/ci). No setup story is required on that basis.

### Quality findings

#### Critical Violations

- CRIT-1: Six of the 19 PRD rules, and three PRD scenarios, have no story, no acceptance criterion and no test. Rules never named in epics.md (grep count 0): `R-FLEET-01`, `R-SYS-01`, `R-AUTH-01`, `R-AUTH-02`, `R-LAB-02`, `R-CONTEND-01`. planning/criteria-test-map.md (last line) and test/traceability-matrix.md ("siguen sin prueba") declare `R-SYS-01`, `R-FLEET-01` and the thesis window (S-8) uncovered (decision DL-40). The cause `HARDWARE_FAILING` and the `QUEUE_ONLY` / `admission = QUEUED` path (prd.md:225, 208) therefore have no producing story. PRD AG-8 (prd.md:549) requires every rule to be reachable by a passing test, and AG-11 requires every cause to map to a rule with a test. Every story's Definition of Done can be met with these rules unimplemented. Recommendation: add acceptance criteria and red tests for the six rules and for scenarios S-6, S-7, S-8, in the stories that own FR-3, FR-4, FR-5 and FR-8 or in a new story.

#### Major Issues

- MAJ-1: UX contradicts the architecture and PRD in open items whose owner is unconfirmed: `GET /policy/journal` (no M2 route, NG-10); degraded freeze activation (UX offers it, ARCHITECTURE.md:491 and PRD FR-14 forbid it); freeze preview tiles `of which RUNNING` and `GPU-hours reclaimed` (no data source); `WINDOW_STARTED`; "preview returns a token"; `node_class_id` absent from the PRD Request. Source: ARCHITECTURE.md:1125-1133 (all "open ... owner Juan (to confirm), before sprint 1"); ux/EXPERIENCE.md:37, 192, 194, 196. Story 4.3 says "integrar cambios UX solo tras triage de Juan" (epics.md:251).
- MAJ-2: No story builds any user interface (UX-1 Evaluator, UX-2 Rule Catalogue, UX-3 Journal, UX-4 Freeze Console, UX-5, UX-6). Story 4.3 states that interface states have no code and no executable test (epics.md:255; criteria-test-map.md row 4.3#1). EXPERIENCE sections 7 (14 accessibility checks) and 8 (responsive, 390 px freeze console) have no story, criterion or test. PRD FR-14 requires an interactive evaluator and freeze console (prd.md:438).
- MAJ-3: The PRD, marked FINAL, is internally inconsistent in places that acceptance criteria quote: 19 rules (prd.md:21, 285, 546) versus "21 `R-*` rules" and "3-outcome x 21-rule matrix" (prd.md:79, 425, 455); "four `state` values" (prd.md:433) versus three states (prd.md:232); NFR-4 (start boundary `t < b`) versus FR-4 (start included), acknowledged as an erratum with the PRD "not edited" (ARCHITECTURE.md:1117); NP-9 cites step 4 for a computation done in step 3 (prd.md:514); two rows numbered 11 (prd.md:360, 362); FR-6 mentions "cases A and B" (prd.md:430); FR-16 says the engine is never unable to decide (prd.md:440) while the confirmed ruling G-09 returns 503 `DECISION_NOT_PRODUCED` when the clock gives no instant (contracts.md:41; ARCHITECTURE.md:1097); PRD FR-13 and section 6.5 are written for Go while the architecture is TypeScript (ARCHITECTURE.md:556, 824). The corrections live in ARCHITECTURE.md section 15.4 only.
- MAJ-4: The user-story statements are boilerplate. All 13 stories use the same sentence "Como Elena Vargas / Dr. Rebecca Reed, quiero este resultado para tomar una decision con evidencia y evitar acciones incompatibles con la politica" (epics.md:13, 33, 54, 76, 96, 116, 138, 158, 178, 201, 222, 242), with no specific want or benefit (story 4.4 has a different, enabler text). The Definition of Done of every story except 4.4 includes "se anaden casos de aceptacion aun planeados en esta historia" (e.g. epics.md:29), which says the criteria are incomplete.
- MAJ-5: Story sizing and criteria bundling. Story 3.3 carries 13 test ids and three criteria that exercise three different capabilities: concurrent activation, transactional rollback, and the decision-time effect of R-FRZ-01/02 (epics.md:180, 191-193). Story 1.2 bundles quota cap, boot validator and tier gate with 9 tests and three outcomes in one criterion (epics.md:46-48). Sprint 1 estimates 28-40 hours for 1.1, 1.2, 1.3 and 2.1 together (epics.md:295) while story 1.1 is described as crossing every layer with SQLite migration and simulated adapters (epics.md:22); no basis for the estimates is given.
- MAJ-6: Whole routes and lifecycle steps with no story or criterion: freeze lift (`POST /policy/freezes/{id}/lift`, prd.md:473-476; contracts.md:126; "lift ... in under 60 s", prd.md:57), draft creation (`POST /policy/freezes`), `GET /policy/freezes`, `GET /policy/freezes/{id}`, `GET /policy/rules`, `GET /policy/versions`, `GET /policy/versions/{v}`, `/health`, `/ready` (grep of epics.md for "lift", "/policy/rules", "/health", "/ready": 0 hits). The openapi.yaml declares these operations (path list from grep, 14 operations in total).
- MAJ-7: Clause-level FR gaps: FR-2 six-rule quantifier, FR-7 clauses 1, 3 and 4, FR-8 100-concurrent commit clause, FR-9 `suppressed[]`, FR-10 per-port tolerance table (timetable 60 s, catalog 6 h, fleet two-port split, notFound versus transport error, malformed 200, clock quality), FR-13 import allow-list gate have no acceptance criterion (see Coverage Matrix). FR-15 is named in story 4.3 but no criterion mentions the lint (epics.md:253-256; the traceability matrix marks it "DOC delta; deuda heredada abierta"). FR-16 is "plan" only (epics.md:255).
- MAJ-8: Evidence for the PRD acceptance gates does not exist in the module. prd.md:546-552 marks AG-5 to AG-11 PASS and cites `test/arch/registry-completeness.test.ts`, `test/arch/ad2-subsumption.test.ts`, `test/arch/ad2-fact-coverage.test.ts`, `test/rules/r-bound-01.test.ts`, `test/props/single-deadline.test.ts`, `test/scenario/sa-5.test.ts`, `test/concurrency/quota-commit.test.ts`, `test/ux/console-parity.test.ts`. `ls` of test/arch, test/rules, test/props, test/scenario, test/ux and test/concurrency returned "No such file or directory" for all six. test/ contains atdd, ci, evidence, fixtures and harness only. All 13 NFRs are PLANNED (test/nfr-evidence.md:3); the traceability matrix maps several NFRs to proxy tests (NFR-8 to EV-Q1, NFR-11 to EV-Q1, NFR-1, NFR-2 and NFR-3 to DM-AD1). The PASS results in prd.md section 12 are self-reported and not verifiable from this module.
- MAJ-9: Unresolved decisions that change implementation behaviour: `estimated_need` for R-QUOTA-02 has no formula in the PRD, architecture, contracts, DTOs or OpenAPI (grep of planning/ md, ts, sql and yaml files for `estimated_need` found no design definition outside the PRD; prd.md:432 says only "derived from model class and declared duration"); `node_class_id` is used by freeze scope and by the decision table but is not a field of the PRD Request (contracts.md:15; events.md section 5 row 9); `publishVersion` request body, role, success status, failure code, concurrency and `changed_rule_ids` computation are open (contracts.md:250 item 12 a-g); the obligation event toward M9 has no name (contracts.md:249 item 11); the HMAC secret source is open (ports-and-adapters.md:275); PRD A-3 time zone is unconfirmed (prd.md:130); the NFR-11 socket-bound stub scope awaits a ruling (ports-and-adapters.md:251); 18 deferred findings stay deferred (ARCHITECTURE.md:1139-1160).
- MAJ-10: Upfront single migration for all tables with no recorded decision (epics.md:290), which the skill's database-timing check treats as a violation; stories that name tables do not create them.

#### Minor Concerns

- MIN-1: Story 4.4 is a declared technical enabler (epics.md:260-262) with no user-visible outcome and both criteria marked "plan de medicion, no test ejecutable ahora".
- MIN-2: Traceability sources disagree on story assignment: test/traceability-matrix.md maps FR-2 to 3.1 and 3.3 (epics: 3.1, 3.2, 3.3), FR-14 to 3.1 and 4.3 (epics: 1.1, 3.1, 3.2, 3.3, 4.3), FR-9 to 1.2 (epics: 1.2, 4.2), FR-13 to 1.2 (epics: 1.2, 4.2), NFR-5 to 4.2 (epics: 1.3, 2.3, 3.2, 4.2); FR-7 is mapped to the test DM-AD5. ARCHITECTURE.md:1189 says "46 in total" red tests while test/atdd declares 48 `test(` calls (39 in m2_contracts.test.ts, 9 in m2_domain.test.ts, by grep).
- MIN-3: Naming and count drift: ARCHITECTURE.md:131 uses `DENY(HARDWARE_UNSATISFIABLE)`, a value outside the closed cause set (`NO_SUCH_HARDWARE`, prd.md:225); ARCHITECTURE.md:479 and ux/EXPERIENCE.md:6, 32, 210 say 13 routes while ARCHITECTURE.md:1128 and 1179 carry route 14.
- MIN-4: Broken or out-of-scope references: ux/C-UX-Scenarios/00-ux-scenarios.md cites reviews/review-ux-edge-cases.md (file absent from reviews/); prd.md:460 points the NFR-11 cold-start record to planning/readiness-gate-report.md (not read, per audit rules; not verified).
- MIN-5: UX files (2026-09-28) were not updated after the 2026-10-21 architecture and contract changes (publish route, successor link, no journal route); the mapping lives in planning/ux-state-contract-map.md, which declares itself partial.
- MIN-6: epics.md is written in Spanish while PRD, architecture and UX are in English; identifiers are shared so traceability is unaffected.

### Best Practices Compliance Checklist (per epic)

| Check | Epic 1 | Epic 2 | Epic 3 | Epic 4 |
|---|---|---|---|---|
| Delivers user value | Yes | Yes | Yes | Mostly (4.4 enabler) |
| Functions independently | Yes | Yes | Yes | Yes |
| Stories appropriately sized | 1.2 bundles three capabilities | Yes | 3.3 oversized | Yes |
| No forward dependencies | Yes | Yes | Yes | Yes |
| Tables created when needed | No (single upfront migration) | No | No | No |
| Clear acceptance criteria | Partial | Partial | Partial | Partial (4.4 plan only) |
| Traceability to FRs maintained | Label level yes; clause level partial | Same | Same | FR-15 label only |

## Summary and Recommendations

### Overall Readiness Status

NEEDS WORK

Basis: all 16 FRs and 13 NFRs are named in at least one of 13 stories, no epic is a technical milestone and no forward dependency exists; but 1 critical and 10 major findings remain open, and the critical one (CRIT-1) leaves 6 of the 19 PRD rules without a story, criterion or test.

### Findings by severity

- Critical: 1 (CRIT-1)
- Major: 10 (MAJ-1 to MAJ-10)
- Minor: 6 (MIN-1 to MIN-6)
- Total: 17

| Id | Severity | Finding |
|---|---|---|
| CRIT-1 | Critical | R-FLEET-01, R-SYS-01, R-AUTH-01, R-AUTH-02, R-LAB-02, R-CONTEND-01 (6 of 19 rules) and scenarios S-6, S-7, S-8 have no story, criterion or test; PRD AG-8 and AG-11 not met by the backlog |
| MAJ-1 | Major | UX contradicts architecture/PRD on journal route, degraded activation, preview tiles, WINDOW_STARTED, preview token, node_class_id; owner unconfirmed |
| MAJ-2 | Major | No story builds any UI; accessibility and responsive requirements have no story or test |
| MAJ-3 | Major | PRD (FINAL) internally inconsistent: 19 versus 21 rules, four versus three states, NFR-4 versus FR-4, stale step reference, duplicate row number, FR-16 versus 503 DECISION_NOT_PRODUCED, Go versus TypeScript |
| MAJ-4 | Major | All user stories use one boilerplate want/benefit sentence; DoD says acceptance cases are still planned |
| MAJ-5 | Major | Stories 3.3 and 1.2 oversized or bundled; sprint 1 estimate unsupported |
| MAJ-6 | Major | Freeze lift, draft creation, freeze reads, rules and versions reads, health and ready have no story or criterion |
| MAJ-7 | Major | Clause-level FR gaps (FR-2, FR-7, FR-8, FR-9, FR-10, FR-13); FR-15 label only; FR-16 plan only |
| MAJ-8 | Major | PRD gates AG-5 to AG-11 marked PASS cite test files in test/arch, rules, props, scenario, ux, concurrency that do not exist; all 13 NFRs PLANNED; NFR proxies in traceability matrix |
| MAJ-9 | Major | Unresolved decisions: estimated_need formula, node_class_id in Request, publishVersion open points, M9 obligation event, HMAC secret source, time zone A-3, NFR-11 socket stub, 18 deferred findings |
| MAJ-10 | Major | One upfront migration creates all tables; no decision recorded |
| MIN-1 | Minor | Story 4.4 is a declared technical enabler, plan-only criteria |
| MIN-2 | Minor | Story/test assignments differ between traceability matrix and epics; "46" versus 48 red tests |
| MIN-3 | Minor | HARDWARE_UNSATISFIABLE outside closed cause set; "13 routes" versus 14 |
| MIN-4 | Minor | Broken reference to reviews/review-ux-edge-cases.md; NFR-11 evidence pointer outside audit scope |
| MIN-5 | Minor | UX files dated 2026-09-28 not updated after 2026-10-21 changes |
| MIN-6 | Minor | Epics in Spanish, other documents in English |

### Coverage numbers

- FRs: 16 of 16 named in at least one story (100% at label level); NFRs: 13 of 13 named in at least one story; stories: 13 (4 epics); acceptance criteria: 29 (criteria-test-map.md: 29 rows, 27 with an executable red test id and 2 measurement plans); PRD rules named in at least one story: 13 of 19.
- Test declarations in test/atdd: 48 (39 + 9, by grep); not executed by this audit.

### Critical Issues Requiring Immediate Action

1. CRIT-1: write acceptance criteria and red tests for R-FLEET-01, R-SYS-01, R-AUTH-01, R-AUTH-02, R-LAB-02, R-CONTEND-01 and scenarios S-6, S-7, S-8, or record an explicit descope decision in the PRD.

### Recommended Next Steps

1. Close the UX-to-API divergences of MAJ-1 with a named owner and edit the UX files (or the architecture) so they agree, including the degraded-activation contradiction on the freeze console.
2. Correct the PRD (MAJ-3) so rule counts, state counts, NFR-4/FR-4, step references and the FR-16/503 wording agree with the catalogue and the confirmed rulings; define `estimated_need` and add `node_class_id` or its replacement to the Request (MAJ-9).
3. Add stories or criteria for freeze lift and the read routes (MAJ-6), a UI story or an explicit API-only descope of FR-14 (MAJ-2), and clause-level criteria for FR-2, FR-7, FR-8, FR-9, FR-10, FR-13, FR-15 (MAJ-7).
4. Replace the boilerplate story statements and split 3.3 and 1.2 (MAJ-4, MAJ-5); record a decision on the single upfront migration (MAJ-10).
5. Create the test files that the PRD gates cite, or change the gates from PASS to PLANNED (MAJ-8).

### Final Note

This assessment identified 17 issues across 3 severity categories (1 critical, 10 major, 6 minor), plus supplementary observations in the PRD Analysis (PRD-INT-1 to PRD-INT-6) and UX Alignment (UX-A1 to UX-A10, WARN-UX-1 to WARN-UX-3) sections, which are folded into the numbered findings above. Address the critical issue before proceeding to implementation. These findings can be used to improve the artifacts or you may choose to proceed as-is.

Assessor: Claude agent (independent audit run; start 2026-10-21T01:30:52). Date: 2026-10-21. No signature is given.

### Reading depth and independence notes

- Read completely: planning/prd.md (607 lines), planning/epics.md (301 lines), ux/EXPERIENCE.md (365 lines), planning/ux-state-contract-map.md, planning/criteria-test-map.md (first 80 lines, whole file), test/traceability-matrix.md, reviews/phase-3-4-findings.md, reviews/review-test-quality.md.
- Scanned only: planning/ARCHITECTURE.md (read lines 479-514 and 1079-1190; headings, targeted greps elsewhere), planning/detailed-design/contracts.md (lines 1-60 and 224-250 plus greps), ports-and-adapters.md (lines 246-275 and headings), events.md (lines 440-474), openapi.yaml (path list by grep), dto.ts and both SQL files (not opened), ux/DESIGN.md, ux/C-UX-Scenarios/*, ux/wireframes/* (headings and targeted greps), test/atdd/*.ts (test names by grep), test/story-index.json (parsed), test/nfr-evidence.md (first 40 lines), reviews/ other four files (not opened). Reason: size and time; claims from scanned files cite the lines actually seen.
- No file under _bmad-output was opened. The skill's configured paths point to _bmad-output (config.yaml) and its discovery patterns were overridden with the module paths. Incidentally displayed: `ls` listings showed the names (not contents) of forbidden files (planning/implementation-readiness-report-solu2.md, planning/phase-5-readiness-report.md, planning/readiness-gate-report.md, planning/phase-4-gate-report.md, test/evidence/gate-runs); a recursive grep printed one matching line each from implementation-readiness-report-solu2.md and readiness-gate-report.md (an FR-8 extraction line and a rule-table line); ARCHITECTURE.md:1179 cites an earlier readiness report and its verdict word and finding ids. None of these were used to form findings.
