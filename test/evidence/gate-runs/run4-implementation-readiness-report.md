---
stepsCompleted: ['step-01-document-discovery', 'step-02-prd-analysis', 'step-03-epic-coverage-validation', 'step-04-ux-alignment', 'step-05-epic-quality-review', 'step-06-final-assessment']
module: M2 Academic GPU Policy Engine
assessor: independent auditor (run 4), skill bmad-check-implementation-readiness
---

# Implementation Readiness Assessment Report

**Date:** 2026-10-21
**Project:** DesarrolloIA, Module M2 (Academic GPU Policy Engine)
**Start time (date):** Wed Oct 21 12:59:55 2026
**End time (date):** Wed Oct 21 13:10:49 HPS 2026

## Discovery override (step 01)

The skill's default discovery path (`{planning_artifacts}` = `_bmad-output/planning-artifacts`) was NOT opened. Discovery was overridden by the explicit paths of the task. The skill's `persistent_facts` glob (`**/project-context.md`) was not executed because recursive search was forbidden. No team or user customization files exist at `_bmad/custom/bmad-check-implementation-readiness(.user).toml` (exact paths checked). `on_complete` is empty. Python is absent, so `customize.toml` and `_bmad/bmm/config.yaml` were read by hand. No duplicates: every document type exists once (whole, not sharded).

## Document inventory (all read to the last line)

| File | Lines read of total |
|---|---|
| planning/prd.md | 607 of 607 |
| planning/ARCHITECTURE.md (incl. section 15) | 1219 of 1219 |
| planning/detailed-design/contracts.md | 251 of 251 |
| planning/detailed-design/ports-and-adapters.md | 275 of 275 |
| schemas/001_m2_schema.postgres.sql | 647 of 647 |
| schemas/001_m2_schema.sqlite.sql | 672 of 672 |
| schemas/dto.ts | 464 of 464 |
| schemas/events.md | 474 of 474 |
| schemas/openapi.yaml | 1022 of 1022 |
| ux/DESIGN.md | 220 of 220 |
| ux/EXPERIENCE.md | 365 of 365 |
| ux/C-UX-Scenarios/00-ux-scenarios.md | 142 of 142 |
| ux/C-UX-Scenarios/scenario-1.md | 285 of 285 |
| ux/C-UX-Scenarios/scenario-2.md | 211 of 211 |
| ux/C-UX-Scenarios/scenario-3.md | 266 of 266 |
| ux/C-UX-Scenarios/scenario-4.md | 328 of 328 |
| ux/wireframes/wireframe-01-evaluator-deny.md | 76 of 76 |
| ux/wireframes/wireframe-02-constrain-deadline.md | 125 of 125 |
| ux/wireframes/wireframe-03-freeze-console.md | 178 of 178 |
| planning/epics.md | 476 of 476 |
| planning/criteria-test-map.md | 97 of 97 |
| planning/accepted-concerns.md | 17 of 17 |
| planning/ux-state-contract-map.md | 27 of 27 |
| test/traceability-matrix.md | 90 of 90 |
| test/story-index.json | 441 of 441 |
| test/nfr-evidence.md | 21 of 21 |
| test/test-design.md | 49 of 49 |
| test/atdd/m2_contracts.test.ts | 785 of 785 |
| test/atdd/m2_domain.test.ts | 166 of 166 |
| reviews/phase-3-4-findings.md | 42 of 42 |
| reviews/review-arch-adversarial.md | 843 of 843 |
| reviews/review-arch-edge-cases.md | 488 of 488 |
| reviews/review-arch-implementability.md | 198 of 198 |
| reviews/review-detailed-design.md | 554 of 554 |
| reviews/review-prd-adversarial.md | 377 of 377 |
| reviews/review-test-quality.md | 43 of 43 |
| package.json | 24 of 24 |
| tsconfig.json | 1 of 1 |
| test/ci/readiness.mjs | 73 of 73 |

Total: every file above was read from line 1 to its last line, in consecutive chunks (many chunks were shorter than 400 lines to stay under the tool token cap); no file was left partly read.

## Verdict

**NEEDS WORK**

This is the weaker side of NEEDS WORK, not READY and not "ready with conditions". The package is structurally complete (all 16 FR and 13 NFR are mapped, 19 stories in 5 epics, contracts, schemas and 60 red tests exist), but three Critical defects and fourteen Major defects mean a developer would have to take policy decisions the documents do not take. Do not start implementation sprint 1 until C-1 to C-3 are closed and the Major items marked "before sprint 1" in the packages own records are decided.

## PRD analysis (step 02)

Requirements extracted from prd.md: 16 FR (prd.md:425-440), 13 NFR (:450-462), 12 non-happy paths NP-1..NP-12 (:506-517), 19 rules (:318-342), 11 acceptance gates (:542-552), constants (:259-268), assumptions A-1..A-7 and open questions OQ-1..OQ-4 (:126-138).

PRD completeness assessment: strong on rule catalogue, boundary arithmetic and failure classes. Internal defects: "21 rules" in prd.md:78,425,455 versus 19 rows (:546); FR-9 says four trace states (:433) while 5.2 closes at three (:226,232); must_checkpoint_by "iff HARD_DEADLINE" (:388) versus "set whenever any bound cuts work short" (:293-296); bound-in-the-past is a constructor error (:297-298) and an ALLOW with valid_until = campus_now (:393,514); NP-9 cites "step 4" for a step-3 computation (:514); section 6.2.1 has two rows numbered 11 (:360,362); estimated_need has no formula or unit (:432); NFR-4 contradicts FR-4 at the start boundary (:428,453); the PRD still reads Go (FR-13 :437, 6.5 :403) while the stack is TypeScript; OQ-1, OQ-3, OQ-4 and A-3 are open (:130,135-138) although status is FINAL (:6).

## Epic coverage validation (step 03)

There is no standalone FR coverage map in epics.md; coverage is read from each story's Traceability line (epics.md:15,38,67,92,120,144,171,192,213,234,255,279,301,327,349,373,395,417,437).

| FR | Stories | Status |
|---|---|---|
| FR-1 | 1.1, 1.3, 2.3 | covered |
| FR-2 | 3.1-3.5, 5.2 | covered |
| FR-3 | 1.2 | covered |
| FR-4, FR-5, FR-6, FR-7 | 2.1 (FR-5 also 2.3) | covered |
| FR-8 | 2.3 | covered |
| FR-9 | 1.2, 4.2, 5.1, 5.3 | covered |
| FR-10 | 2.2 | covered |
| FR-11 | 1.3, 4.1 | covered |
| FR-12 | 3.3, 4.1 | covered |
| FR-13 | 1.2, 4.2 | covered |
| FR-14 | 1.1, 3.x, 4.3, 5.x | covered |
| FR-15 | 4.3 | covered (lint on delta only) |
| FR-16 | 4.3, 5.1 | covered |

Coverage statistics: FR 16 of 16 (100 %), NFR 13 of 13 (100 %) mapped to at least one story. Mapped is not proven: executable red tests exist for 41 of 83 acceptance criteria (49.4 %), 39 criteria (47.0 %) have only a planned test id, 2 are measurement plans, 1 is a script check (criteria-test-map.md, counted from its rows). All 19 rules have at least one executable red test; none has the "fails if the rule is deleted" test that prd.md:549 (AG-8) requires (38 expected, 0 present). No NFR has measured evidence (nfr-evidence.md:7-19, all PLANNED).

Requirements with no story or with a story that cannot realise them: NFR-11 launcher and socket stub servers (prd.md:460, ports-and-adapters.md:251) have no acceptance criterion (epics.md:26-30, 338-341); UX-3 Journal and NFR-8 query (ux/EXPERIENCE.md:37,180-186) have no story (epics.md:444); NP-2, NP-4, NP-7, NP-12 are not named in any story.

## UX alignment (step 04)

UX documents found (DESIGN, EXPERIENCE, four scenarios, three wireframes). Alignment with PRD and architecture is partial. Open divergences are recorded by the package itself (ARCHITECTURE.md:1134-1142) and are listed as findings below (M-5, M-11). UX is not a warning-only gap: it is implied and present, but it contradicts the API and the precedence ruling in several executable places.

## Epic quality review (step 05)

All five epics are persona-centred, none is a technical milestone by title. Story 4.4 is a declared technical enabler (epics.md:347). Defects: forward dependency of story 1.1 on story 5.1 (C-3), tables all created in one migration (M-9), Epic 5 has no executable acceptance tests (M-7), story 1.1 is large (8-12 h, epics.md:470). Dependencies in story-index.json are backward only (test/story-index.json:20-440).

## Findings (id, severity, one line, citation)

### Critical

- **C-1 Critical** The "bound already in the past" case (NP-9) is specified as ALLOW with valid_until = campus_now and, in the same documents, as impossible: prd.md:297-298 and ARCHITECTURE.md:591 say the constructor rejects valid_until <= evaluated_at; contracts.md:38,47 and both SQL files (postgres.sql:167, sqlite.sql:190) enforce valid_until > evaluated_at; prd.md:393,514, ARCHITECTURE.md:591 (same line), scenario-1.md:249-251 (sa-1 sweep) and scenario-3.md:232 require the equality case. The mandatory edge-case family cannot be implemented or stored as written.
- **C-2 Critical** Precedence is "strict total order, first match wins" (prd.md:313,214; ARCHITECTURE.md AD-2) but ruling DL-50 makes R-QUOTA-01 dominate R-BOUND-01 and six rules dominate R-FRZ-02 while the PRD is left unedited (ARCHITECTURE.md:1124-1125,1214-1219). The effect on AG-9 and the single-producer invariant, and whether the constructor accepts a NOT_EVALUATED rule with lower precedence than the primary, are "not verified" (:1216,1219). FR-8 clause "0 < remaining < need gives CONSTRAIN QUOTA_CAP in 100 %" (prd.md:432) is still contradicted by R-BOUND-01 winning (scenario-3.md:227), and UX EC-4.7 admits what EV-FRZ-03 denies (scenario-4.md:239; epics.md:269).
- **C-3 Critical** Story 1.1 depends forward on story 5.1: its scope and AC1 require the Success card citing the rule (epics.md:22,26) while the card "is built by story 5.1" (epics.md:19,377-380). Also no story owns the 19-rule catalogue, yet AC1 (an ALLOW, epics.md:26) requires every rule to walk NO_MATCH; the rules are implemented across 1.2, 2.1, 2.2, 2.3, 3.5 (epics.md:45,97,125,148,259).

### Major

- **M-1 Major** The request is persisted nowhere: decision and fact_snapshot store no workload_kind, GPU count, VRAM, duration, exam_binding or request_id (postgres.sql:123-148, sqlite.sql:97-119,146-171; ARCHITECTURE.md:1161 deferred), yet FR-11, NFR-3 and ad7-reproducible require re-evaluation from recorded inputs (ARCHITECTURE.md:873).
- **M-2 Major** node_class_id is not in the PRD Request (prd.md:152-154) but R-FRZ-01 node-class scope, the NODE_CLASS freeze scope and decision.node_class_id use it (prd.md:326; ARCHITECTURE.md:454,1136; contracts.md:15); the arm is not implementable from the request shape.
- **M-3 Major** "Activation publishes a policy version (v42)" (prd.md:81, scenario-4.md:172, wireframe-03.md:63-65) has no mechanism: activateFreeze Q1/Q2 only reads the current published_seq and inserts freeze, consumption, outbox and audit rows (contracts.md:107-108; epics.md:224).
- **M-4 Major** Behaviour decisions are explicitly not taken: "engine cannot decide" (EXPERIENCE.md:13 vs :143, prd.md:440, contracts.md:170; epics.md:132; ARCHITECTURE.md:1126); publishVersion body, role, success status, concurrency and changed_rule_ids (contracts.md:251; openapi.yaml:201-221; dto.ts:363; epics.md:291-293); response before decision append (contracts.md:242; ARCHITECTURE.md:218-219 vs 456); which port failures are DECISION_NOT_PRODUCED versus R-DEP-01 (contracts.md:243); estimated_need formula and quota unit (prd.md:432; scenario-1.md:83-89; accepted-concerns.md:12); A-3 time zone, OQ-1, OQ-3, OQ-4 (prd.md:130,135-138).
- **M-5 Major** UX contradicts API and rulings and the files are protected, so seven corrections stay open "before sprint 1" with owner "to confirm": WINDOW_STARTED, degraded activation, RUNNING and GPU-hours tiles, journal route, preview token, node_class_id, state map (ARCHITECTURE.md:1134-1142; EXPERIENCE.md:16,192,194,196; wireframe-03.md:107-136).
- **M-6 Major** Verification is mostly future: 39 of 83 criteria planned only, 2 plans, 1 script; the 41 executable tests are red by stub; 0 of 13 NFRs measured; PRD gates AG-5 to AG-11 say PASS and cite test directories that do not exist (prd.md:546-552; accepted-concerns.md:11); no deletion tests (AG-8, 0 of 38); R-VALID-01 branches beyond actor mismatch, clock-quality R-DEP-01, the exact-equality instant (EDGE-3), and the NFR-4 six window kinds have no executable test (m2_contracts.test.ts:94-107; m2_domain.test.ts:46,73,109; criteria-test-map.md:36-41).
- **M-7 Major** Epic 5 (stories 5.1 to 5.4) has no executable test, no UI test infrastructure, "Files not verified" and excludes open UX items (epics.md:377-380,399-402,421-424,441-444); readiness.mjs builds sprint-status for epics 1 to 4 only (test/ci/readiness.mjs:64).
- **M-8 Major** Contract coverage is thin: full P/Q/I exists for 3 operations plus a partial publish; create-draft, lift (DL-45), the 7 GET routes and the decision preview have none or notes only (contracts.md:124-127,129-149); UNAUTHENTICATED has no status (contracts.md:165,240); SNAPSHOT_EVICTED has no serving route (:246); the preview route returns a DecisionDto whose decision_id and snapshot are never stored (openapi.yaml:74-96; ARCHITECTURE.md:1160).
- **M-9 Major** One migration per engine creates all 16 tables up front, with no prior decision recorded (epics.md:465; ARCHITECTURE.md:1204); the PostgreSQL file header still says "NOT machine-checked" (postgres.sql:3-4) while review-detailed-design.md:403 reports a run in an embedded engine (grants and concurrency untested).
- **M-10 Major** NFR-11 (single launcher, socket-bound stub servers) conflicts with ports as in-process TypeScript interfaces and needs a ruling; no story builds it (ports-and-adapters.md:251; prd.md:460; epics.md:26-30,338-341; nfr-evidence.md:17).
- **M-11 Major** UX scenario arithmetic contradicts the rule catalogue it is the acceptance for: BACKGROUND_BATCH by a human at 09:54-09:59 and 12:00-16:00 local is outside NIGHT_WINDOW so R-NIGHT-01 (12) denies it before R-BOUND-01, yet the sa-1 sweep and next action 2 show ALLOW or CONSTRAIN (scenario-1.md:162-163,246-256; prd.md:337); EC-2.3 shows R-TIER-01 NO_MATCH after terminal R-TIER-02 (scenario-2.md:170); EC-4.6 says R-VALID-01 denies and "R-FRZ-01 matches" in one sentence (scenario-4.md:193,238); surviving R-FRZ-02 requests are both PROVISIONAL and FINAL (scenario-4.md:188,298); S-1 and S-3 give contradictory weekdays for 2026-04-08 (scenario-1.md:16, scenario-3.md:16, scenario-4.md:18); lift at 14:48 for a freeze that ended at 14:00 (scenario-4.md:197).
- **M-12 Major** Schema does not carry parts of the domain model: Clearance.unrestricted (postgres.sql:109-111; prd.md:146), draft-to-freeze link and lifted_by (postgres.sql:336,382), a boundary id on trace_entry so every element of B can appear once (prd.md:216; review-detailed-design.md:397), fact_snapshot.ref collision handling and obligation_observation FK versus optional decision_id (review-detailed-design.md:293,323).
- **M-13 Major** Normative documents marked FINAL are known-wrong in places and corrected only by an errata chapter: 13 versus 14 routes, HARDWARE_UNSATISFIABLE, "<PORT>_STALE_EXPIRED" outside the closed cause set, 8 versus 10 ports, 9 versus 11 gates (ARCHITECTURE.md:5,25,131,153,479,812,944,969,1119-1128); 21 versus 19 rules (prd.md:78,425,455); NFR-4 start-boundary erratum (ARCHITECTURE.md:1117); Go-specific determinism text (prd.md:403,437).
- **M-14 Major** 18 deferred findings are open with closing conditions and all nine "accepted concerns" have a blank sign-off column, owner "to confirm", target "before sprint 1" (ARCHITECTURE.md:1150-1169; accepted-concerns.md:7-17).

### Minor

- **m-1 Minor** epics.md:59 says "los cinco criterios" for story 1.2, which has seven (:49-55).
- **m-2 Minor** wireframe-01.md:33,67 shows 9 NOT_EVALUATED, scenario-1.md:119 gives 7; wireframe-02.md:20,32-34,60-61 draws TRAINING (S-3 uses EVALUATION), lists R-QUOTA-01 NO_MATCH below the terminal rule and draws superseded boundaries as WINDOW_SCOPE constraints.
- **m-3 Minor** scenario-2.md:6,142 give R-ALLOW-01 precedence 19 (catalogue 17); :83 "8 ports"; :189 says a derived decision is not journalled (ARCHITECTURE.md:450,457 stores it).
- **m-4 Minor** UX fixtures use non-UUID ids (DRF-, FRZ-, RESV-) against UUID checks (scenario-4.md:58-68; sqlite.sql:401,442); events.md:84-102 example instants are UTC while the zone is UTC-5; events.md:179 reuses eventId 0e2.
- **m-5 Minor** NFR labels differ: UX says NFR-10 for runnability (00-ux-scenarios.md:88; scenario-4.md:315), PRD says NFR-11.
- **m-6 Minor** ports-and-adapters.md:151 says 42 boxes, 44 rows exist; nine paths and a key name still "proposed, human to confirm" (:74).
- **m-7 Minor** ARCHITECTURE.md:894,1010 present the NFR-9 invariant as "40 <= p99 <= 60"; read as a relation among constants it is fine, as written for measured p99 it forces p99 >= 40 ms.
- **m-8 Minor** test-design.md:34 estimates 39-68 h while epics.md:470 plans 28-40 h for sprint 1.
- **m-9 Minor** DESIGN.md:107 says three zones, draws five; glyph differs between DESIGN.md:57 and scenario-1.md:227.
- **m-10 Minor** The architecture still contains the EDGE-33 hazard that an INTERACTIVE_INFERENCE request is exempt from R-LAB-01 and can consume class machines (prd.md:335; review-arch-edge-cases.md:387); the PRD keeps required_node_count out of decisions on purpose (prd.md:164-170).
- **m-11 Minor** Story 2.3 and story 4.2 are system-property stories voiced as Elena (epics.md:57,319); story 4.4 has no user value (epics.md:347).
- **m-12 Minor** ARCHITECTURE.md:824 records the Solu-2 stack rule as "not verified against the assignment PDF".

## Coverage numbers

- FR mapped to a story: 16 of 16 (100 %). NFR mapped to a story: 13 of 13 (100 %). AD (M2-AD-1..9) bound to a story: 9 of 9 (readiness.mjs:35).
- Epics 5, stories 19, acceptance criteria 83. Executable red tests: 60 (51 contracts, 9 domain) covering 41 criteria (49.4 %). Planned-only criteria: 39 (47.0 %). Measurement plans: 2. Script check: 1.
- Rules with at least one executable red test: 19 of 19. Rules with a deletion test: 0 of 19.
- NFR with measured evidence: 0 of 13.
- UX surfaces with a story: 5 of 6 (UX-3 Journal has none).
- Operations with full P/Q/I contracts: 3 of 14 (publish partial).
- Dependencies: backward only in story-index.json; one forward dependency in text (C-3).
- Findings: 3 Critical, 14 Major, 12 Minor = 29.

## Summary and Recommendations

### Overall Readiness Status

NEEDS WORK

### Critical Issues Requiring Immediate Action

1. C-1: decide the past-bound outcome once and make PRD 6.1/6.3/NP-9, ARCHITECTURE M2-AD-3, contracts Q1/I4, both SQL CHECKs and scenario-1 sa-1 agree (relax valid_until > evaluated_at for the guard case, or change the guard).
2. C-2: restate the precedence model in the PRD (and AG-9 and the single-producer invariant) to include DL-50, or reorder the catalogue so the ruling is plain first-match; align EC-4.7 and FR-8.
3. C-3: split story 1.1 from the card (move the Success card out of 1.1 AC1) and assign the catalogue walk to a named story, or give 1.1 stub rules explicitly.

### Recommended Next Steps

1. Close the Major decisions that change behaviour before sprint 1: estimated_need and quota unit, node_class_id, publish route contract, response-versus-append order, "cannot decide" handling, A-3, OQ-1.
2. Persist the request (or a hash plus the fields the rules read) and the Clearance.unrestricted flag, or state why replay does not need them.
3. Bring the protected PRD and UX files into line with the rulings (or record a signed exemption), then re-run this gate; sign-off cells in accepted-concerns.md must be filled by the owner.
4. Turn the planned tests of stories 1.1-2.3 into executable red tests, add the 19 deletion tests and the NFR-4 six-kind sweep, and give Epic 5 a UI test harness decision.

### Final Note

This assessment identified 29 issues across 6 categories (precedence and boundary logic, specification consistency, persistence model, UX alignment, verification evidence, epic structure). Address the Critical issues before proceeding to implementation. These findings can be used to improve the artifacts or you may choose to proceed as-is.

## Exposures

Text inside allowed documents that names an earlier audit, its verdict or its findings. None of it was used as evidence and none changed a judgement here.

- ARCHITECTURE.md:1083, 1118-1128 (gate run 1 to 3, finding ids MIN/MAJ), 1189 (earlier report path and verdict), 1204-1208 (run 2 and run 3 report paths, verdict and counts, finding ids, lint exemption of report files).
- epics.md:21, 57, 82, 97, 319 ("gate run 3", MAJ-5, MIN-1, MIN-5).
- planning/accepted-concerns.md:3, 5, 9-17 (names run reports, lists their finding ids).
- test/traceability-matrix.md:51, 65-69, 75, 77-78, 90 (gate run 1 to 3 findings and ids).
- planning/criteria-test-map.md:3, 97 (regeneration task, decisions that amend earlier test sets).
- planning/prd.md:460, 534, 549 and ux/C-UX-Scenarios/00-ux-scenarios.md:5, 123, 132 (cite planning/readiness-gate-report.md; path only, file not opened).
- reviews/review-arch-implementability.md:5, 16, 17, 24, 31, 39 ("RG" = readiness-gate-report.md, claims it marks PASS) and reviews/review-detailed-design.md:407 (the same file named with a date).
- test/ci/readiness.mjs:51, 73 (file-name pattern of earlier report files; negative readiness message).
- Review-pass verdicts inside required review files (not readiness runs): reviews/review-prd-adversarial.md:11, reviews/review-arch-adversarial.md:7, reviews/review-arch-edge-cases.md:7, ARCHITECTURE.md:936.

## Forbidden files opened

None. No file whose name contains `readiness-report`, `readiness-gate-report`, `phase-5-readiness` or `phase-4-gate`, nothing in test/evidence/gate-runs/, ai-log/, prompts/ or _bmad-output was opened. Directory listings were limited to the exact allowed folders; exact-path existence checks were made for ports/in/policy.ts, policy/core/index.ts, test/ci/verify-red.mjs, test/ci/quality-gate.yml, test/fixtures/index.ts and test/harness (listing only, no content). A grep over five named planning files counted FR-15 banned terms (ARCHITECTURE.md 3, prd.md 14, contracts.md 1, epics.md 0).

## Times

Start: Wed Oct 21 12:59:55 2026. End: Wed Oct 21 13:10:49 HPS 2026.

## Appendix A: working notes written while reading (verbatim)

### Notes after PRD (prd.md 607/607 read)
- N-PRD-1 prd.md:78,425,455: "21 R-* rules"/"21-rule matrix" vs 19 rules in 6.1:284, 12:546 (19 rows counted).
- N-PRD-2 prd.md:433 FR-9 "four state values" vs 3-state enum 5.2:226 / EDGE-34 (:232).
- N-PRD-3 prd.md:388 "must_checkpoint_by (iff HARD_DEADLINE)" vs 293-296 (set whenever bound < own end, rule-independent; equality case EDGE-3 yields no HARD_DEADLINE constraint).
- N-PRD-4 prd.md:297-298 "bound at or before evaluated_at is a constructor error" vs 393/514 NP-9 guard emits ALLOW with valid_until = campus_now (contradiction).
- N-PRD-5 prd.md:514 NP-9 says "6.1 step 4" but bound is step 3.
- N-PRD-6 prd.md:460,534,549 reference planning/readiness-gate-report.md as the home of cold-start record and 38 test list (self-referential gate artifact, not opened per rules).
- N-PRD-7 prd.md:432 estimated_need "derived from model class and declared duration" - no formula/unit table; R-QUOTA-02 (340) undecidable without it.
- N-PRD-8 prd.md:135 OQ-1 open, "carried to readiness gate as open question"; A-3 (130) timezone unconfirmed; OQ-3, OQ-4 open.
- N-PRD-9 prd.md:362-363 6.2.1 has two items numbered 11 (360,362), header says thirteen (346) - numbering defect only.
- N-PRD-10 prd.md:6 status FINAL yet OQs open; prd.md:21-23 narrates review history inside normative text.

### Notes after epics (epics.md 476/476 read) - step 03 coverage
- FR coverage per Traceability lines (no standalone FR coverage map exists in epics.md): FR-1 1.1/1.3/2.3; FR-2 3.1-3.5; FR-3 1.2; FR-4..7 2.1; FR-8 2.3; FR-9 1.2/4.2/5.1/5.3; FR-10 2.2; FR-11 1.3/4.1; FR-12 3.3/4.1; FR-13 1.2/4.2; FR-14 1.1,3.x,4.3,5.x; FR-15 4.3; FR-16 4.3/5.1. 16/16 FRs mapped. NFR-1..13: NFR-1 4.4; 2 1.1/4.2; 3 1.2/4.2; 4 2.1; 5 1.3/2.3/3.2/4.2; 6 1.2/3.1/4.2; 7 3.3(4.4); 8 4.4; 9 2.2/4.4; 10 1.2/4.4; 11 1.1/4.3; 12 1.2/2.3/4.2; 13 2.2/4.2. 13/13 mapped.
- N-EP-1 epics.md:59 "los cinco criterios" for story 1.2 which has 7 criteria (lines 49-55).
- N-EP-2 epics.md:132,338 FR-16/FR-10/EXPERIENCE law 2 disagreement ("no se decide aquí", ARCHITECTURE 15.4): not decided; record as finding.
- N-EP-3 epics.md:241,249 story 3.4 liftFreeze has no full P/Q/I contract (DL-45 pending) yet story is in backlog; PRD <60s lift not measurable.
- N-EP-4 epics.md:378,400,422,442 Epic 5 (4 stories) have no executable test, no files, no UI test infra; Files "not verified".
- N-EP-5 epics.md:347-365 story 4.4 technical enabler, no user value; 2.3, 4.2 are system-property stories (epics.md:57,319 admit).
- N-EP-6 NFR-11 (make dev launcher; stub servers on bound sockets, prd.md:460) has no story AC building a launcher; 1.1 and 4.3 list NFR-11 but ACs (lines 26-30, 338-341) contain no make dev / socket-stub criterion.
- N-EP-7 Many ACs are "Test planned for implementation" (not executable): e.g. 1.1 c3,c4; 1.2 c4-c7; 2.1 c3,c5-c10.
- N-EP-8 NP-4 (DST), NP-7 (retro window), NP-12 (freeze expires mid-eval), NP-2 (freeze while admitted) not named in any story Traceability line (to verify against criteria-test-map).
- N-EP-9 epics.md:7 "G-01..G-10 closed by Juan Esteban Ruiz Ome" (author-recorded rulings, DL-25..34).

### Notes after ARCHITECTURE.md (1219/1219 read, 4 chunks +)
- N-AR-1 ARCHITECTURE.md:591 constructor MUST reject ALLOW/CONSTRAIN with valid_until <= evaluated_at, but 591 (same sentence) and 393/858 past-bound guard emits ALLOW with valid_until = campus_now (= evaluated_at): self-contradiction (also prd.md:297-298 vs 393).
- N-AR-2 ARCHITECTURE.md:153,1013 cause `<PORT>_STALE_EXPIRED` is outside the closed 10-member cause enum (prd.md:225, ARCH:299); ARCH:131 `HARDWARE_UNSATISFIABLE` (recorded in 15.4:1119 as erratum, body not edited).
- N-AR-3 ARCHITECTURE.md:894,1010 NFR-9 "reconciliation invariant 40 <= p99 <= 60" (prd.md:458) together with p99<=45: a lower bound of 40 ms makes a faster fan-out fail the test; the invariant as written is wrong in direction.
- N-AR-4 ARCHITECTURE.md:1120 vs 479,685,719,1038: 13 routes vs 14 (publish route, DL-41); route 14 body, role, success status open (15.5:1137, contracts 6 pt 12) while story 4.1 AC2 (epics.md:291) asserts behaviour.
- N-AR-5 ARCHITECTURE.md:1124-1125,1214-1219 DL-50 overrides first-match strict order: R-QUOTA-01(14) over R-BOUND-01(13); six rules over R-FRZ-02(2); PRD unedited; effect on AG-9 and on single-producer invariant "not verified"; NOT_EVALUATED with lower precedence than primary vs 5.1 description "not verified" whether constructor accepts. Normative PRD (prd.md:313,214,432,426) and architecture ruling disagree.
- N-AR-6 ARCHITECTURE.md:1136 PRD Request has no node_class_id but R-FRZ-01 (prd.md:326), freeze scope NODE_CLASS, R-CONTEND (341) and decision column use node class scope: arm unimplementable from the PRD request shape; open.
- N-AR-7 ARCHITECTURE.md:1134-1142 seven open UX corrections to protected ux files (WINDOW_STARTED, degraded activation, journal route, preview token, tiles RUNNING / GPU-hours, node_class_id, state map); all "before sprint 1", owner Juan "to confirm".
- N-AR-8 ARCHITECTURE.md:1150-1169 18 deferred findings still open with closing conditions; several "not verified".
- N-AR-9 ARCHITECTURE.md:699,713,944,556: PRD FR-13 (prd.md:437) and PRD 6.5 (403) are Go-specific (math/rand, context, Go map order) while stack is TypeScript; ARCH:944 triage still says Go and "no deviation" vs 824.
- N-AR-10 ARCHITECTURE.md:899 FR-15 lint scope excludes reviews/ "by design" vs prd.md:439 (planning/, reviews/, ai-log/) and epics.md:340.
- N-AR-11 ARCHITECTURE.md:218-219 vs 456: response returned before outbox/decision append transaction; a crash between response and append returns a decision never journalled (idempotent replay lookup precedes). Check contracts for resolution.
- N-AR-12 ARCHITECTURE.md:1127 header counts (9 gates vs 11; 8 ports vs 10) left stale by protected-lines policy; 969 "route count is 11", 812 port numbers stale.
- N-AR-13 ARCHITECTURE.md:824 Solu-2 stack rule "not verified against the assignment PDF".
- N-AR-14 ARCHITECTURE.md:1208 FR-15 lint delta exempts report files planning/implementation-readiness-report-solu2*.md (the gate output files are exempt from lint).
- Exposures (text naming earlier audits; not used as evidence): ARCHITECTURE.md:1083,1119-1128,1189,1204,1206,1208; epics.md:21,57,59,82,319 ("gate run 3" labels).

### Notes after contracts.md (251/251) and ports-and-adapters.md (275/275)
- N-CT-1 contracts.md:38,47 Q1/I4 require valid_until strictly later than evaluated_at for every ALLOW/CONSTRAIN while ARCHITECTURE.md:591 / prd.md:393,514 require ALLOW with valid_until = campus_now in the past-bound case: third document carrying the contradiction (see N-AR-1).
- N-CT-2 contracts.md:242,243 open points 3 and 4 (response-before-append crash window; which port failures give DECISION_NOT_PRODUCED vs R-DEP-01) not settled; epics.md:132 story 2.2 AC2 asserts a split.
- N-CT-3 contracts.md:251 publishVersion open points (a)-(g): body, role, success status, validity error, concurrency, published_at source, changed_rule_ids computation; epics.md:291-293 story 4.1 AC2/AC3 asserts behaviour that depends on them. Only 4 of 14 operations have P/Q/I contracts (create draft, lift, 7 GET routes, health/ready, preview decision have none or notes only: contracts.md:124-127).
- N-CT-4 contracts.md:165,240 UNAUTHENTICATED has no HTTP status (story 1.1 AC4 epics.md:29 accepts "no fixed status").
- N-CT-5 contracts.md:246 SNAPSHOT_EVICTED 410 has no serving route (no route reads a snapshot).
- N-CT-6 contracts.md:217 AD-5 "Clause with NO ENFORCEMENT POINT inside this module" (Gateway re-submit, no local adjudication).
- N-PA-1 ports-and-adapters.md:251,7.2 NFR-11 (prd.md:460) "stub servers on bound sockets" vs ports as in-process TS interfaces: needs human ruling, open; no story/test builds it.
- N-PA-2 ports-and-adapters.md:151 says 42 boxes; table has 44 rows (rows 43,44 missing from diagram). 
- N-PA-3 ports-and-adapters.md:74 nine paths/keys still "proposed, human to confirm" (registry/publisher, unit_of_work, app/bootstrap, event_bus, token_signer, key name).
- N-PA-4 ports-and-adapters.md has no component for any UI surface (epic 5 files "not verified", epics.md:377,399,421).

### Notes after SQL (postgres 647/647, sqlite 672/672)
- N-SQL-1 postgres.sql:167 and sqlite.sql:190 `decision_valid_until_after_evaluated CHECK (valid_until IS NULL OR valid_until > evaluated_at)`: the NP-9 / past-bound guard decision (ALLOW with valid_until = campus_now, prd.md:393,514; ARCHITECTURE.md:591) cannot be inserted: PRD behaviour is unrepresentable in the schema (third place, see N-AR-1, N-CT-1).
- N-SQL-2 postgres.sql:123-148, sqlite.sql:146-171 / :97-119: neither decision nor fact_snapshot stores the request fields workload_kind, requested_gpu_count, requested_vram_gb_per_gpu, expected_duration_min, exam_binding, request_id (ADV-24 deferred, ARCHITECTURE.md:1161): ad7-reproducible (ARCH:873) and FR-11/NFR-3 re-evaluation from "recorded inputs alone" lack the request. (to confirm against dto.ts)
- N-SQL-3 postgres.sql:109-111, sqlite.sql:122-125: no `unrestricted` column; Clearance{unrestricted} of prd.md:146 / ARCH:460 (EDGE-12) not persisted ("PROPOSED, human to confirm").
- N-SQL-4 postgres.sql:336-337, sqlite.sql:381-382: freeze has no lifted_by; GET /policy/freezes/{id} returns lifted_by (ARCH:495) - read from audit_events only. No draft_id link between freeze and freeze_draft (postgres.sql:382, sqlite.sql:433): "3 activations of one draft yield 1 freeze" cannot be keyed (ARCH:1164 EDG-8 deferred).
- N-SQL-5 postgres.sql:3-4 PostgreSQL file NOT machine-checked (psql absent); SQLite file no execution evidence either; seven "PROPOSED, human to confirm" choices remain.
- N-SQL-6 postgres.sql:206 QUEUE_ONLY and QUOTA_CAP must carry a deadline NOT NULL, while prd.md:341 R-CONTEND-01 emits QUEUE_ONLY with queue_estimate_ref and no stated deadline: unspecified source of deadline for QUEUE_ONLY (marked PROPOSED).

### Notes after dto.ts (464/464), events.md (474/474), openapi.yaml (1022/1022)
- N-API-1 openapi.yaml:201-221 publish route: only a 201 response, no auth/role, no 4xx/5xx; dto.ts:363 PublishVersionRequestDto is Record<string, never>; contracts open point 12. No 401 response attached on any route (openapi.yaml:13-14, UNAUTHENTICATED unattached).
- N-API-2 openapi.yaml:74-96 preview decision route returns a DecisionDto requiring decision_id (uuid7), evidence_snapshot_ref minLength 1, citations; the route is "not journalled" so these refer to rows that are never stored; ADV-23 deferred (ARCHITECTURE.md:1160).
- N-API-3 dto.ts:300 / events.md:449 ErrorBodyDto.code vs error_code naming mismatch left open; dto.ts:192 ExplanationDto "PROPOSED, human to confirm"; dto.ts:153 Constraint.reason not stored.
- N-API-4 events.md:84-102 example decision.v1 uses evaluated_at 22:10:44.900Z with valid_until 10:55Z while CAMPUS_TZ is America/Panama (UTC-5; ARCH:723 uses -05:00): as written the example evaluation time is 17:10 local, outside NIGHT_WINDOW, inconsistent with R-BOUND-01 at 05:55 local. events.md:179 eventId 0e2 reused for two examples.
- N-API-5 DecisionDto / EvaluateRequestDto request fields (workload_kind, requested_*, expected_duration_min, exam_binding) are inputs only; no stored record or response field returns them (see N-SQL-2).

### Notes after UX: EXPERIENCE.md (365/365), DESIGN.md (220/220), 00-ux-scenarios.md (142/142), scenario-1.md (285/285)
- N-UX-1 EXPERIENCE.md:13 vs 143, DESIGN.md:66 vs ARCH:501/contracts:42: "engine unable to decide" error state exists (law 2) and does not exist (143); G-09 503 DECISION_NOT_PRODUCED (contracts.md:170) has no UX state. Undecided (ARCH 15.4).
- N-UX-2 EXPERIENCE.md:16 law 5 says override on preview route "returns a token actor-bound valid 60 s"; no such field in DecisionDto (open, ARCH 15.5:1140). scenario-1.md:168 next actions 1 and 2 for a STUDENT call preview with evaluated_at_override, which is gated to role_tier >= INSTRUCTOR and a deployment flag (ARCH:486); text says the "pinning is performed by her own client, not by the server": the primary next action is not executable by the persona it is written for.
- N-UX-3 EXPERIENCE.md:37,163-186,210, 00-ux-scenarios.md:52,141: UX-3 Journal and `aegis journal` call GET /policy/journal, a route M2 does not own (NG-10); no story covers UX-3; test/ux/console-parity asserts 13 routes.
- N-UX-4 EXPERIENCE.md:192,194,196,358 / DESIGN.md C-10: preview tiles RUNNING and GPU-hours reclaimed, WINDOW_STARTED, and ACTIVATE WITHOUT VERIFIED RESERVATIONS (degraded) contradict ARCH D1/K2/ARCH:507; ux/ files are "protected" and not corrected (ARCH 15.5). Epics 5.2 excludes them.
- N-UX-5 scenario-1.md:63-75 states actor_ref mismatch gives DENY(ACTOR_UNKNOWN); ruling K1 and contracts/epics give INVALID_REQUEST (epics.md:156).
- N-UX-6 scenario-1.md:246-256 and :162-163: request is BACKGROUND_BATCH by a HUMAN actor; at 09:54-09:59 and 12:00-16:00 campus time (outside NIGHT_WINDOW) R-NIGHT-01 (prd.md:337, precedence 12, before R-BOUND-01) denies BACKGROUND_BATCH; sweep rows and next action 2 claim ALLOW / CONSTRAIN. The sweep test sa-1 (and EDGE tests in criteria) built on this arithmetic would contradict the catalogue.
- N-UX-7 scenario-1.md:249-251 past-bound guard ALLOW with valid_until = campus_now: contradicts postgres.sql:167, contracts.md:47, ARCH:591 (N-AR-1) and is the "sa-1" executable.
- N-UX-8 scenario-1.md:83-89 quota fact has remaining_tokens and remaining_gpu_seconds, catalog min_vram 9.5 (non-integer) vs PRD QuotaFacts{remaining, unit, tier} (prd.md:157) and "no IEEE double" (ARCH:458): quota unit and need formula remain undefined (N-PRD-7).
- N-UX-9 scenario-1.md:227 uses glyph ◑ vs ◐ in DESIGN.md:57; DESIGN.md:107 "3 zones" with A-E; 00-ux-scenarios.md:15 names scenario files as FINAL r3.
- N-UX-10 00-ux-scenarios.md:5,123,132 cites reviews/review-ux-edge-cases.md (does not exist, ARCH:1123) and planning/readiness-gate-report.md.
- N-UX-11 00-ux-scenarios.md:140 R-SYS-01 has no UX scenario; 88 NFR-10 "independent runnability" mislabelled (PRD numbers it NFR-11) and uses `docker compose up` vs `make dev` (prd.md:460).

### Notes after scenario-2 (211/211), scenario-3 (266/266), scenario-4 (328/328)
- N-S2-1 scenario-2.md:6,142 R-ALLOW-01 "precedence 19" (catalogue: 17) and "6.1 step 4" (step 3); :83 "all 8 ports" (10), catalog snapshot "6 h old ... past its 24 h display tolerance" (6 h is inside the 24 h display tolerance, so stale_facts would be empty); :189 UX-STK-1 says the derived follow-on decision is "not separately journaled" vs ARCH:450,457 / M2-AD-8 (derived decision stored with parent_kind DERIVED, depth 1) and contracts.md:38.
- N-S2-2 scenario-2.md:170 EC-2.3 expects R-TIER-01 NO_MATCH after terminal R-TIER-02 (precedence 4): R-TIER-01 is at 5 and must be NOT_EVALUATED.
- N-S2-3 scenario-2.md:150 composer guard cites "POL-TIER 4: 2 x 48 reserved for distributed training": rule not present in the catalogue or PRD (invented policy text).
- N-S3-1 scenario-3.md:16,77 dates: 2026-04-08 is labelled Tuesday (scenario-1.md:16 labels it Wednesday; calendar: Wednesday), Wed 02:00 = 2026-04-09 which scenario-4.md:18 calls Thursday; WIN-4418 lab on 2026-04-09 vs lab schedule Mon/Wed 10:00-12:00 (prd.md:47, scenario-1.md).
- N-S3-2 scenario-3.md:227 EC-3.8 (quota 0 < remaining < need under R-BOUND-01) is CONSTRAIN/R-BOUND-01 with R-QUOTA-02 NOT_EVALUATED, while prd.md:432 FR-8 says with 0 < remaining < need 100 % of requests are CONSTRAIN with QUOTA_CAP; DL-50 (ARCH 15.11) resolves only remaining <= 0 -> FR-8 second clause remains contradicted.
- N-S3-3 scenario-3.md:232 EC-3.13 and scenario-1.md:249 rely on ALLOW with valid_until = campus_now (N-AR-1); scenario-3.md:81 port name "Bridge" stale; :266 says R-NIGHT-01 reads timetable (it does not).
- N-S4-1 scenario-4.md:193,238 EC-4.6 and :193 text: R-VALID-01 (-1) answers DENY(NOT_AUTHORIZED) yet "R-FRZ-01 matches and the request is denied by the freeze" in the same paragraph: self-contradiction (also EXPERIENCE.md:363 flow 06).
- N-S4-2 scenario-4.md:239 EC-4.7 admits (CONSTRAIN/R-FRZ-02) an exam-bound actor lacking the model entitlement; DL-50 (ARCH:1215, EV-FRZ-03 epics.md:269) makes R-AUTH-02 / R-TIER-02 deny: UX acceptance case contradicts the ruling; UX files protected, not edited.
- N-S4-3 scenario-4.md:298 vs :188: surviving R-FRZ-02 requests "PROVISIONAL" (quota cap) vs "authority FINAL"; R-FRZ-02 is terminal at 2 so no QUOTA_CAP can be produced (prd.md:210).
- N-S4-4 scenario-4.md:18-24,197 timings: preview 07:14, "40 minutes before room opens" and "48 minutes away", freeze ends 14:00 but lift at 14:48 "6 h 48 min later" (freeze would be EXPIRED; lift on EXPIRED = FREEZE_NOT_LIFTABLE, contracts.md:127); :201 liveness omits EXPIRED.
- N-S4-5 scenario-4.md:58-68,149 fixture ids DRF-.../FRZ-.../RESV-... are not UUIDs while schemas enforce 36-char uuid for draft_id/freeze_id (sqlite.sql:401,442) and events patterns; :82 token HMAC over `computed_at` vs actor_id||issued_at (ARCH:505).
- N-S4-6 scenario-4.md:315 NFR-10 "standalone docker compose" vs prd.md:460 NFR-11 `make dev`.

### Notes after wireframes (wf-01 76/76, wf-02 125/125, wf-03 178/178)
- N-WF-1 wireframe-01.md:33,67 "9 NOT_EVALUATED" while scenario-1.md:119,204 gives 7 (rules 11-17 are below R-LAB-01 at 10).
- N-WF-2 wireframe-02.md:20,32-34 draws a TRAINING request for S-3 E-2 (scenario-3.md:40,67 uses EVALUATION) and lists R-QUOTA-01 NO_MATCH above "4 NOT_EVALUATED" although R-QUOTA-01 (14) is below R-BOUND-01 (13); :60-61 renders superseded boundaries as WINDOW_SCOPE constraint rows (PRD: WINDOW_SCOPE belongs to R-FRZ-02 / past-bound guard only; single-producer, prd.md:214).
- N-WF-3 wireframe-03.md:63-65 "ACTIVATE FREEZE publishes policy v42" and scenario-4.md:172, prd.md:81 "a freeze is published as a policy-version change" vs contracts.md:107-108 (Q1 policy_version = published_seq in force; Q2 inserts only freeze, preview consumption, outbox, audit): no mechanism creates a new policy_version on activation; epics.md:224 asserts 201 with policy_version only. PRD/UX claim (versioned, diffable, revertible freeze; v41 -> v42 compare) has no contract.
- N-WF-4 wireframe-03.md:14 scope control shows "Node class" selected while listing subjects; :107-136 degraded activation path still drawn (conflict with ARCH D1).
- N-WF-5 wireframe-03 and wireframe-02 keep contrast "14.8:1" claims as measured; not recomputed here.

### Notes after supporting files: criteria-test-map (97/97), accepted-concerns (17/17), ux-state-contract-map (27/27), traceability-matrix (90/90), nfr-evidence (21/21), test-design (49/49), package.json (24/24), tsconfig.json (1/1), readiness.mjs (73/73), story-index.json (441/441), atdd m2_domain (166/166), m2_contracts (785/785)
- Count: 60 executable red tests (51 contracts + 9 domain) = matches 15.10; criteria-test-map has 83 rows; per-row status: executable red rows vs planned counted below at report assembly.
- N-T-1 test files: all 60 tests are red by NotImplementedError by design; no deletion test exists for any rule (AG-8 requires 19 x 2 = 38; prd.md:549), zero tests for R-VALID-01 beyond actor mismatch (exam_binding resolution, MODEL_NOT_FOUND, ACTOR_UNKNOWN planned only via DEP-SHAPE-01), R-DEP-01 clock quality (planned), exact-equality EDGE-3 case (no test or planned id: scenario/EDGE-3 only ARCH:911 `ad3-deadline-attribution`, not in epics), R-BOUND-01 subject scoping (domain test windows carry no subject, m2_domain.test.ts:46,73,109).
- N-T-2 m2_contracts.test.ts:120-121 EV-DEP simulates the 41 ms quota timeout with an injected Error('timeout:41ms'), not an elapsed time; the 40 ms cap and cancellation are asserted nowhere (criteria-test-map.md:36-37).
- N-T-3 m2_contracts.test.ts:405-408 EV-TIER-01 follows NP-5 (model floor 48 > requested 24 -> R-TIER-01) while prd.md:330 predicate of R-TIER-01 reads only fleet classes: oracles disagree; accepted-concerns.md:9 lists it.
- N-T-4 NFR-4 oracle: m2_domain.test.ts covers only kind CLASS for the window sweep (DM-BOUND, DM-START); prd.md:453 requires 6 window kinds x 1000 instants; planned test none.
- N-T-5 traceability-matrix.md:13,19,23-35 maps FR-7, FR-13, NFR-1..13 to tests that do not exercise the requirement (e.g. NFR-8 -> EV-Q1, NFR-10 -> DM-AD6, NFR-11 -> EV-Q1, FR-13 -> DM-AD1, FR-7 -> DM-AD5/EDGE-FINAL covering only clause 2/4 partly); status column says "RED funcional / PLANNED NFR". Overstated mapping rows: 14 NFR rows rely on one unrelated functional test each.
- N-T-6 readiness.mjs:64-68 sprint-status.yaml generated for epics 1..4 only (`for e=1;e<=4`), epic 5 (4 stories) omitted; line 63 readiness 'DRAFT_PENDING_JUAN_PHASE_5'; line 73 prints "GLOBAL READINESS: (negative readiness line)".
- N-T-7 readiness.mjs:51-52 the FR-15 delta lint exempts exactly planning/implementation-readiness-report-solu2*.md; line 37-40 checks that each P0 risk names one existing test (any one).
- N-T-8 package.json:17-23 no production dependencies (express, pg, better-sqlite3) and no launcher script (`make dev`, NFR-11); tsconfig.json:1 includes ports/** and policy/** only; no vitest config; test/ci/verify-red.mjs and quality-gate.yml exist per epics.md:461-463 (not in my read list).
- N-T-9 test-design.md:34 estimate 39-68 h for P0-P2 vs epics.md:470 sprint 1 (1.1,1.2,1.3,2.1) 28-40 h; test-design.md:49 "sin certificacion humana".
- N-T-10 nfr-evidence.md: all 13 NFRs PLANNED, no evidence file exists; test-design.md:30 coverage thresholds future.
- N-T-11 ux-state-contract-map.md:3,18,19,21,22,27: mapping partial; journal/trace DTO missing; preview-decision (ADV-23) unmapped; WINDOW_STARTED and degraded activation unresolved.
- N-T-12 accepted-concerns.md:7-17: sign-off column blank in all 9 rows; owner "(to confirm)"; target "before implementation sprint 1".
- Exposures: accepted-concerns.md:3,5,9-17 (finding ids of earlier gate runs, names report files); traceability-matrix.md:51,65-69,75,77-78,90 ("corrida 1/2/3 del gate", MAJ/CRIT ids); criteria-test-map.md:97 (DL-44 / "gate" amendments, no verdict); ARCHITECTURE/epics as listed earlier; test-design.md none.

### Notes after reviews: phase-3-4-findings (42/42), review-test-quality (43/43), review-arch-implementability (198/198), review-detailed-design (554/554)
- N-RV-1 phase-3-4-findings.md:6-17,23-40 and ARCH 15.6: 10 gaps + 18 deferred findings remain DEFER/open; G-04, G-05 (M9 obligation event name), G-09 closed by ruling but carve-out text in contracts still says "PROPOSED".
- N-RV-2 review-test-quality.md:12,18,37,41-43: concurrency only on one in-memory connection; fixtures use node:sqlite not production drivers (better-sqlite3/pg); no mutation testing; Reviewer signature "pendiente".
- N-RV-3 review-arch-implementability.md:23,24,27,28,39: open: HMAC secret source, Idempotency-Key length/charset, request_chain_id generation, FRZ- display ids vs uuid, retention/purge for preview_run/freeze_draft/idempotency_key (no cap), 6 h catalogue tolerance owner (ARCH:617 cites an item §12 does not contain), fallback if the Audit Ledger is late (ARCH:973).
- N-RV-4 review-detailed-design.md:153,242 A.6/B: contracts "compare-and-swap on the freeze store version" while freeze has no version column; :244 outbox claim/lease for multiple relays undefined; :258-262 Annex A mandatory edge case: no contract re-evaluates a running job at the boundary (reevaluateRunningJob ruled out); "DENY/terminate at the boundary" half belongs to M9 (not testable here).
- N-RV-5 review-detailed-design.md:396-397 ADV-18 (layer map: Freeze Aggregate "pure" yet owns stores/outbox; boot validator needs POLICY_DOCUMENT) and ADV-27 (no boundary identifier on trace_entry; PRD bound-role invariant "every element of B appears once" unrepresentable) confirmed as gaps, not applied.
- N-RV-6 review-detailed-design.md:293,323,324 ADV-22 obligation_observation FK vs optional decision_id, EDG-13 fact_snapshot.ref collision/ON CONFLICT undefined (second evaluation with identical facts may abort), EDG-11 RENDER failure outcome, EDG-12 payload_ref content: deferred, still open.
- N-RV-7 review-detailed-design.md:403 PostgreSQL grants enforcement against a login role and concurrency were not tested (single connection, embedded engine).
- Exposures (earlier readiness-gate references): review-arch-implementability.md:5,16,17,24,31,39 (RG = readiness-gate-report.md; "RG marks PASS" claims; RG sections), review-detailed-design.md:407 (readiness-gate-report.md dated 2026-09-28 only a path/date).
