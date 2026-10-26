# Matriz de trazabilidad actualizada después de Fase 4

RED=prueba activa pendiente de implementación, no requisito satisfecho. PLANNED=medición NFR todavía sin evidencia. DOC=control documental ejecutable. Escenarios UX: S-* del PRD §11 y scenario-1..4 en ux/C-UX-Scenarios; los secundarios se identifican como escenarios del PRD, sin inventar archivos UX.

| PRD FR/NFR | Escenario UX | AD-n | Cláusula de contrato | Test ID | Historia ID | Estado |
|---|---|---|---|---|---|---|
| FR-1 | S-1 | M2-AD-1 | evaluate Q1/Q2, P1; R-AUTH-01/02 (PRD §6.2) | EV-Q1, EV-P1, EV-P2, EV-AUTH-01, EV-AUTH-02 | 1.1, 1.3, 2.3 | RED; alcance parcial donde se indica |
| FR-2 | S-4 / scenario-4 | M2-AD-9 | preview Q1/Q2; activate Q2; evaluate R-FRZ-01/02 (PRD §6.2) | AC-Q1, PV-Q1, EV-FRZ-01, EV-FRZ-02, EV-FRZ-03, LF-Q1, LF-P1, LF-P2, LF-P3 | 3.1, 3.2, 3.3, 3.4, 3.5, 4.5 | RED; alcance parcial donde se indica |
| FR-3 | S-2 / scenario-2 | M2-AD-1 | evaluate Q1/I3; R-TIER-01/02/03 (PRD §6.2) | EV-Q2, EV-TIER-01, EV-TIER-02, EV-TIER-03 | 1.2 | RED; alcance parcial donde se indica |
| FR-4 | S-1 / scenario-1 | M2-AD-3 | evaluate I4/Time | EDGE-1000, DM-BOUND, DM-START, EV-LAB-02 | 2.1 | RED; alcance parcial donde se indica |
| FR-5 | S-3 / scenario-3 | M2-AD-3 | evaluate Time | EDGE-2158, EDGE-NIGHT, EV-SYS-01 | 2.1, 2.3 | RED; alcance parcial donde se indica |
| FR-6 | S-3 / scenario-3 | M2-AD-3 | evaluate I4 | EDGE-NIGHT | 2.1 | RED; alcance parcial donde se indica |
| FR-7 | S-3 / scenario-3 | M2-AD-5 | evaluate I6/Q3 | DM-AD5, EDGE-FINAL, DM-NP9 | 2.1 | RED; alcance parcial donde se indica |
| FR-8 | S-5 (PRD) | M2-AD-5 | evaluate Q1/I6; R-QUOTA-01 (PRD §6.2) | EV-Q2, EV-EX1, EV-QBOUND-01 | 2.3 | RED; alcance parcial donde se indica |
| FR-9 | S-1..4 | M2-AD-6 | evaluate Q4/I7 | EV-EX1, DM-AD6 | 1.2, 4.2, 4.4 | RED; alcance parcial donde se indica |
| FR-10 | Fallo de hechos | M2-AD-4 | evaluate P9; R-FLEET-01, R-CONTEND-01 (PRD §6.2) | EV-DEP, EV-FLEET-01, EV-CONTEND-01 | 2.2 | RED; alcance parcial donde se indica |
| FR-11 | Transversal | M2-AD-8 | evaluate Q2/Q3, P4 | EV-I1, EV-P3, EV-P4 | 1.3, 4.1 | RED; alcance parcial donde se indica |
| FR-12 | S-4 | M2-AD-7 | evaluate I8; publishVersion Q1-Q4 | EV-VERSION, PB-Q1, PB-I1 | 3.3, 4.1 | RED; alcance parcial donde se indica |
| FR-13 | Transversal | M2-AD-1 | evaluate I1 (import gate PLANNED) | DM-AD1 | 1.2, 4.2 | RED; alcance parcial donde se indica |
| FR-14 | S-4 / scenario-4 | M2-AD-9 | preview P3, P6; activate P8 | PV-P1, AC-P2, PV-UNAVAILABLE | 1.1, 3.1, 3.2, 3.3, 3.4, 3.5, 4.5, 4.3, 4.4 | RED; alcance parcial donde se indica |
| FR-15 | Transversal | M2-AD-6 | FR-15 (sin cláusula operativa) | DOC-LINT | 4.3 | DOC delta; deuda heredada abierta |
| FR-16 | S-2 | M2-AD-6 | evaluate Q1/Q4 (copy UI PLANNED) | EV-EX1 | 4.3, 4.4 | RED; alcance parcial donde se indica |
| NFR-1 | Transversal; ver plan NFR | M2-AD-1/4/6/8 según métrica | evaluate I/Q; PRD §8 | DM-AD1; NF-01 (plan) | 4.2 | RED funcional / PLANNED NFR |
| NFR-2 | Transversal; ver plan NFR | M2-AD-1/4/6/8 según métrica | evaluate I/Q; PRD §8 | DM-AD1; NF-02 (plan) | 1.1, 4.2 | RED funcional / PLANNED NFR |
| NFR-3 | Transversal; ver plan NFR | M2-AD-1/4/6/8 según métrica | evaluate I/Q; PRD §8 | DM-AD1; NF-03 (plan) | 1.2, 4.2 | RED funcional / PLANNED NFR |
| NFR-4 | Transversal; ver plan NFR | M2-AD-3 | evaluate I/Q; PRD §8 | DM-BOUND, DM-START; NF-04 (plan) | 2.1 | RED funcional / PLANNED NFR |
| NFR-5 | Transversal; ver plan NFR | M2-AD-1/4/6/8 según métrica | evaluate I/Q; PRD §8 | EV-PII; NF-05 (plan) | 1.3, 2.3, 3.2, 4.2 | RED funcional / PLANNED NFR |
| NFR-6 | Transversal; ver plan NFR | M2-AD-1/4/6/8 según métrica | evaluate I/Q; PRD §8 | EV-EX1, DM-AD6; NF-06 (plan) | 1.2, 3.1, 4.2 | RED funcional / PLANNED NFR |
| NFR-7 | Transversal; ver plan NFR | M2-AD-1/4/6/8 según métrica | evaluate I/Q; PRD §8 | EV-VERSION, PB-Q1; NF-07 (plan) | 3.3, 4.2 | RED funcional / PLANNED NFR |
| NFR-8 | Transversal; ver plan NFR | M2-AD-1/4/6/8 según métrica | evaluate I/Q; PRD §8 | EV-Q1; NF-08 (plan) | 4.2 | RED funcional / PLANNED NFR |
| NFR-9 | Transversal; ver plan NFR | M2-AD-1/4/6/8 según métrica | evaluate I/Q; PRD §8 | EV-DEP; NF-09 (plan) | 2.2, 4.2 | RED funcional / PLANNED NFR |
| NFR-10 | Transversal; ver plan NFR | M2-AD-1/4/6/8 según métrica | evaluate I/Q; PRD §8 | DM-AD6; NF-10 (plan) | 1.2, 4.2 | RED funcional / PLANNED NFR |
| NFR-11 | Transversal; ver plan NFR | M2-AD-1/4/6/8 según métrica | evaluate I/Q; PRD §8 | EV-Q1; NF-11 (plan) | 1.1, 4.3 | RED funcional / PLANNED NFR |
| NFR-12 | Transversal; ver plan NFR | M2-AD-1/4/6/8 según métrica | evaluate I/Q; PRD §8 | EV-Q2, DM-AD5; NF-12 (plan) | 1.2, 2.3, 4.2 | RED funcional / PLANNED NFR |
| NFR-13 | Transversal; ver plan NFR | M2-AD-1/4/6/8 según métrica | evaluate I/Q; PRD §8 | EV-DEP; NF-13 (plan) | 2.2, 4.2 | RED funcional / PLANNED NFR |

## Índice AD (cobertura roja mínima)

| AD | Test rojo | Historia |
|---|---|---|
| M2-AD-1 | DM-AD1 | 1.2 |
| M2-AD-2 | DM-AD2 | 1.2 |
| M2-AD-3 | EV-CLOCK, EDGE-NIGHT | 2.1 |
| M2-AD-4 | EV-DEP | 2.2 |
| M2-AD-5 | DM-AD5 | 2.1 |
| M2-AD-6 | DM-AD6 | 1.2 |
| M2-AD-7 | EV-VERSION, PB-Q1 | 4.1 |
| M2-AD-8 | EV-I1, EV-PII, PB-I1 | 1.3, 4.1 |
| M2-AD-9 | AC-I1, EV-I2, AC-TOKEN-FORGED, AC-NO-PREVIEW-ROW, AC-TOKEN-ACTOR, EV-FRZ-01, EV-FRZ-02, EV-FRZ-03, PV-UNAVAILABLE, LF-Q1, LF-P1, LF-P2, LF-P3 | 3.3, 3.4, 3.5 |

## Pruebas añadidas el 2026-10-21 (P5-FIX-2, hallazgos MAJ-1 y MAJ-3 de la corrida 1 del gate con la skill de BMad)

| Test ID | Requisito | Regla o cláusula (oráculo) | Historia | Estado |
|---|---|---|---|---|
| EV-FRZ-01 | FR-2 | R-FRZ-01 (PRD línea 326); FR-2 (línea 426) | 3.3 | RED |
| EV-FRZ-02 | FR-2 | R-FRZ-02 (PRD línea 327); FR-2 (línea 426) | 3.3 | RED |
| EV-TIER-01 | FR-3 | R-TIER-01 (PRD línea 330); NP-5 (línea 510) | 1.2 | RED |
| EV-TIER-02 | FR-3 | R-TIER-02 (PRD línea 329); FR-3 cláusula 1 (línea 427) | 1.2 | RED |
| EV-TIER-03 | FR-3 | R-TIER-03 (PRD línea 328); FR-3 cláusula 1 (línea 427) | 1.2 | RED |
| PV-UNAVAILABLE | FR-14 | contracts.md previewFreeze P6, Q-fail; catálogo PREVIEW_UNAVAILABLE | 3.1 | RED |
| PB-Q1 | FR-12 | contracts.md publishVersion Q1, Q2; M2-AD-7 | 4.1 | RED |
| PB-I1 | FR-11, FR-12 | contracts.md publishVersion Q-fail; M2-AD-8 | 4.1 | RED |
| EV-P3 | FR-11 | contracts.md evaluateRequest P4; catálogo IDEMPOTENCY_BODY_MISMATCH (409) | 1.3 | RED (añadida en P5-FIX-3) |
| EV-P4 | FR-11 | contracts.md evaluateRequest Q2 y P4 (K3); catálogo IDEMPOTENCY_KEY_EXPIRED (409); M2-AD-8 | 1.3 | RED (añadida en P5-FIX-3) |
| EV-FLEET-01 | FR-10 | R-FLEET-01 (PRD línea 331); escenario S-7 (línea 531) | 2.2 | RED (añadida en P5-FIX-4) |
| EV-CONTEND-01 | FR-10 | R-CONTEND-01 (PRD línea 341); invariante de admission (línea 208) | 2.2 | RED (añadida en P5-FIX-4) |
| EV-SYS-01 | FR-5 | R-SYS-01 (PRD línea 336); escenario S-6 (línea 530) | 2.3 | RED (añadida en P5-FIX-4) |
| EV-AUTH-01 | FR-1 | R-AUTH-01 (PRD línea 333) | 2.3 | RED (añadida en P5-FIX-4) |
| EV-AUTH-02 | FR-1 | R-AUTH-02 (PRD línea 332); orden de roles A-4 (línea 131) | 2.3 | RED (añadida en P5-FIX-4) |
| EV-LAB-02 | FR-4 | R-LAB-02 (PRD línea 334) | 2.1 | RED (añadida en P5-FIX-4) |
| LF-Q1 | FR-2 | contracts.md línea 126 (levantar una congelación ACTIVE); M2-AD-9 | 3.4 | RED (añadida en P5-FIX-4) |
| LF-P1 | FR-2 | catálogo MISSING_REASON (400) | 3.4 | RED (añadida en P5-FIX-4) |
| LF-P2 | FR-2 | catálogo FREEZE_NOT_LIFTABLE (409) | 3.4 | RED (añadida en P5-FIX-4) |
| LF-P3 | FR-2 | catálogo ROLE_INSUFFICIENT (403) | 3.4 | RED (añadida en P5-FIX-4) |
| EV-QBOUND-01 | FR-8 | prd.md líneas 338–339 y 432; ruling DL-50 (ARCHITECTURE §15.11) | 2.3 | RED (añadida en P5-FIX-5) |
| EV-FRZ-03 | FR-2 | prd.md líneas 326–333 y 426; ruling DL-50 (ARCHITECTURE §15.11) | 3.5 | RED (añadida en P5-FIX-5) |

La forma de los hechos inyectados (freeze_states, catalog, access, reservation) la define solo el fixture; ninguna fuente la fija. Con la decisión DL-44 (que enmienda DL-40) las seis reglas que faltaban tienen una prueba roja: `R-FLEET-01`, `R-SYS-01`, `R-AUTH-01`, `R-AUTH-02`, `R-LAB-02` y `R-CONTEND-01`. La ventana de tesis (S-8) sigue sin prueba: EDGE-NIGHT cubre el mecanismo con ventanas de clase y EDGE-THESIS está planificada (brecha de cobertura declarada). Los criterios con prueba planificada están en `planning/criteria-test-map.md`. Las pruebas de lift usan una congelación sembrada en el fixture (`seedFreeze`); el lift no tiene contrato P/Q/I completo.

## Mínimos por operación

| Operación | Q | P sin mutación | I concurrencia/frontera |
|---|---|---|---|
| evaluateRequest | EV-Q1, EV-Q2 | EV-P1, EV-P2 | EV-I1, EV-I2 |
| previewFreeze | PV-Q1, PV-Q2 | PV-P1, PV-P2 | PV-I1, PV-I2 |
| activateFreeze | AC-Q1, AC-Q2 | AC-P1, AC-P2 | AC-I1, AC-I2 |

Las pruebas de tier, exhaustividad de las 19 reglas, API, grants PostgreSQL, UI y evidencia NFR completa se amplían al implementar historias: esta matriz no declara cobertura ejecutable completa de cada FR. Gate académico de preparación exige rojo por P0 y AD, no que exista software ya aprobado.

Ruling DL-50 (`ARCHITECTURE.md` §15.11, 2026-10-21): un DENY de `R-QUOTA-01` domina a `R-BOUND-01` y un DENY de una de las seis reglas de FR-2 domina a `R-FRZ-02`; lo comprueban `EV-QBOUND-01` y `EV-FRZ-03`. Las historias de interfaz (4.5 y 4.4, decisión DL-56) no tienen pruebas ejecutables: sus pruebas están planificadas en `planning/criteria-test-map.md` porque el paquete no tiene infraestructura de pruebas de interfaz.


## TEA trace run

Recorded 2026-10-22. Codex executed the local bmad-testarch-trace Create workflow after the local test-review workflow; no slash invocation is claimed. Full retained output: [trace-skill-output.md](evidence/tea/trace-skill-output.md). The following numbers quote the workflow snapshot before triage corrections; no changed gate or new coverage percentage is inferred from later assertions.

- **Gate decision: FAIL.**
- **Full static AC coverage: 5/86 = 6%** (rounded); 37 PARTIAL, 43 NONE, 1 UNIT-ONLY.
- **P0 AC coverage: 3/56 = 5%**; **P1 AC coverage: 2/30 = 7%**. Per-AC priorities are analyst assignments disclosed by the skill, not new human policy decisions. P2/P3 denominators are zero; the workflow convention prints 100% for an empty bucket and establishes no evidence there.
- **P0 risk red preparation: 6/6 = 100%** for RK-01, RK-02, RK-03, RK-04, RK-05 and RK-12, from test/test-design.md. Every named risk has a story and at least one executable red test. This is a separate oracle from full acceptance criteria.
- **Production passes: 0/61 = 0%**. The baseline check confirms 61/61 acceptance tests fail with NotImplementedError, runner exit 1; six harness tests pass, type checking passes, no load failures or skips. Planned cases and NFR plans are excluded from executable evidence.

All original rows above remain. A story reference alone does not supply a test. All P0 ACs have story ownership; the following P0 ACs lack an executable red test in the snapshot. Their named planned tests and closure work remain open:

| P0 AC | Planned reference | Closing condition |
|---|---|---|
| 1.1.AC4 | none (planned: AUTH-U-1 in `test/atdd/m2_contracts.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 1.2.AC5 | none (planned: DM-PURE-01 in `test/atdd/m2_domain.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 1.2.AC6 | none (planned: EV-TIER-04 in `test/atdd/m2_contracts.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 1.2.AC7 | none (planned: DM-PURE-02 in `test/atdd/m2_domain.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 1.3.AC3 | none (planned: DB-GRANT-1 in `test/atdd/m2_contracts.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 2.1.AC3 | none (planned: EDGE-THESIS in `test/atdd/m2_domain.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 2.1.AC5 | none (planned: EDGE-STRADDLE-1 in `test/atdd/m2_domain.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 2.1.AC6 | none (planned: EDGE-STRADDLE-3 in `test/atdd/m2_domain.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 2.1.AC7 | none (planned: PROP-DEADLINE-1 in `test/atdd/m2_domain.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 2.1.AC8 | none (planned: EDGE-STRADDLE-2 in `test/atdd/m2_domain.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 2.1.AC9 | none (planned: EDGE-SCOPE-1 in `test/atdd/m2_domain.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 2.1.AC10 | none (planned: EDGE-DAEMON-1 in `test/atdd/m2_domain.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 2.2.AC5 | none (planned: DEP-TOL-01 in `test/atdd/m2_contracts.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 2.2.AC6 | none (planned: DEP-SHAPE-01 in `test/atdd/m2_contracts.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 2.3.AC7 | none (planned: QUOTA-CONC-01 in `test/atdd/m2_contracts.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 3.1.AC3 | none (planned: FD-Q1 in `test/atdd/m2_contracts.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 3.2.AC3 | none (planned: FZ-READ-1, FZ-READ-2 in `test/atdd/m2_contracts.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 3.4.AC3 | none (planned: LF-P4 in `test/atdd/m2_contracts.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 4.5.AC1 | none (planned: UI-FRZ-1 in `test/ui/freeze-console.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 4.5.AC2 | none (planned: UI-FRZ-2 in `test/ui/freeze-console.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 4.5.AC3 | none (planned: UI-FRZ-3 in `test/ui/freeze-console.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 4.5.AC4 | none (planned: UI-FRZ-4 in `test/ui/freeze-console.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 4.2.AC4 | none (planned: EV-PII-2 in `test/atdd/m2_contracts.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |
| 4.2.AC6 | none (planned: DEP-FAILMODE-1 in `test/atdd/m2_contracts.test.ts`) | Tomás prepares the named test and its harness; Juan resolves any unfixed oracle; the implementation story cannot close before the criterion is tested. |

P0 partial criteria also remain gaps: a direct application invocation does not verify HTTP status, session middleware or visible interface state. Full 86-row classification and exact omitted outcomes are in trace-criteria-matrix.json and the skill report.

| Gap ID | Skill severity | Reported gap | Closure |
|---|---|---|---|
| TR-G01 | CRITICAL | Domain, isolation and boundary oracles are planned rather than executable | Add the named planned unit/property tests (including THESIS, scoped schedules, daemon exemption, import/I/O guards, canonical replay, poisoned data and port fail-mode classification), using the documented PRD/contracts outcomes. Preserve fixed clocks and independent expected values. |
| TR-G02 | CRITICAL | HTTP routes, session boundaries and response status handling are not exercised | Implement a public API test harness in the implementation phase. Given documented valid/invalid requests and session roles, call each endpoint and assert documented status/body and no-write outcomes. Keep unauthenticated status unspecified until architecture fixes it; do not invent publish authorization/status. Suggested stable IDs: existing HR-Q1/HR-P1/AUTH-U-1/FD-Q1/FZ-READ-1/FZ-READ-2/LF-P4/RV-Q1/RV-P1, plus API variants of mapped existing IDs. |
| TR-G03 | CRITICAL | Existing red specifications omit specific acceptance outcomes | Complete the source-specific missing assertions listed per AC: minimal rule registry, boot denial, fan-out/40ms cancellation, clock-with-no-instant, M8 mutation boundary, consumed token/audit, partial closing rollback, suppressed R-FRZ-02, retry and idempotent event delivery. Use tests at domain, boot/integration and adapter levels as each clause requires. |
| TR-G04 | CRITICAL | UI, CLI and accessibility acceptance tests have no executable harness | When interface implementation is authorized, add the named UI-FRZ/UI-EVAL/UI-RULES/UI-CLI/COPY-01 tests. Given loading, empty, validation, permission and system-error states, exercise the implemented journey and assert visible outcome/accessibility at documented widths. No interface implementation is authorized by this trace run. |
| TR-G05 | HIGH | Performance and activation/journal measurements remain plans | Provide the five measurement harnesses/evidence files specified by test/nfr-evidence.md; run against implementation with recorded equipment, load, seed and original thresholds. Prove an over-threshold result fails its implementation gate. No stub runtime is performance evidence. |
| TR-G06 | CRITICAL | Cross-process/database-role and quota-commit acceptance tests are absent | Add DB-GRANT-1 against the PostgreSQL role and QUOTA-CONC-01 against a simulated atomic M8 commit. Given forbidden UPDATE/DELETE or 100 concurrent commits, assert rejection and remaining/need bound. In-memory SQLite is not equivalent evidence. |
| TR-G07 | HIGH | Documentation lint is not an ATDD case | Keep DOC-LINT classified as an auxiliary script control with its own execution evidence; do not fabricate an ATDD ID or count it in 61 tests. Link it explicitly when reporting whole-repository controls. |

Auxiliary control: DOC-LINT is the script check in test/ci/readiness.mjs, with baseline and final terminal evidence in test/evidence/tea/check-baseline.log and check-final.log. It stays outside the 61 ATDD cases. The FR-15 delta control and production behavior are different claims.

Disposition details, owners and conditions: reviews/review-tea-skills.md. Cheap test-review corrections and the TR-G03 assertion subset are applied after this snapshot; missing harnesses and measurements remain deferred. The snapshot's FAIL is retained, with no waiver or production readiness inferred.
