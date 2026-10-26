# Entrega a Tomás — Fase 5 (M2)

Fecha: 2026-10-20. Texto generado con asistencia de IA. No contiene firma de nadie.

## (a) Lo que decidió Juan (opción elegida el 2026-10-20)
- G-01: se acepta la equivalencia del caso 21:58 (DENY) con un caso nocturno desde las 22:00 y límite 05:55; PRD sin cambios.
- G-02: se sigue FR-4 (inicio incluido, fin excluido); NFR-4 queda como errata.
- G-03: se usan las 19 reglas de PRD §6.2; el PRD dice 21 sin identificar dos.
- G-04: puerto `UnitOfWork` con gancho de fallo solo de pruebas; `TRANSACTION_ABORTED` sigue siendo error interno de prueba.
- G-05: M9 es un supuesto de integración; M2 emite la restricción y el evento; sin afirmación de extremo a extremo.
- G-06: se registra la brecha UX/API sin tocar `ux/`.
- G-07: `Harness` y `Facts` son provisionales; los tipos compartidos pasarán a un módulo de dominio antes del código de producción.
- G-08: los 18 hallazgos aplazados siguen aplazados, con historia receptora y condición de cierre.
- G-09: se confirma `503 DECISION_NOT_PRODUCED` con reloj ilegible, sin fila de outbox y con alarma; se quita `PROPOSED`.
- G-10: lint FR-15 sobre el delta más una excepción documentada; no se reescribe ninguna fuente protegida.
- T-1: aceptado; tres pruebas rojas de AD-9 añadidas (hecho en P3-FIX-1).
- T-2: aceptado; aserciones reforzadas (hecho); `denied_count` de `PV-Q1` sigue abierto.
- T-3: aceptado; pruebas formateadas con Prettier (hecho).
- T-4: aplazado; concurrencia con conexiones separadas y PostgreSQL en las historias 1.3 y 3.3.
- 2026-10-21 (DL-39 … DL-56, tras las corridas 1 a 4 del gate con la skill de BMad): no hay ruta de journal (consulta delegada al Audit Ledger); no se añaden `running_count` ni `gpu_hours_reclaimed`; se divide la 3.3 (nueva 3.5) y se añade la 3.4 (levantar congelación); tras la decisión DL-56 hay 16 historias en 4 épicas (4.5 y 4.4 son las historias de interfaz, sin pruebas todavía; la medición de NFR está en la 4.2); 26 pruebas rojas nuevas desde tu paquete (61 en total; tenía 35); `DM-NP9` (ruling DL-54, `ARCHITECTURE.md` §15.12) es la última; el ruling DL-50 sobre el orden de las reglas está en `ARCHITECTURE.md` §15.11; los hallazgos que dependen de archivos protegidos están en `planning/accepted-concerns.md`, sin firma.
Detalle: `ai-log/decision-log-solu2.md` DL-25 … DL-56 y `planning/ARCHITECTURE.md` capítulo 15; la disposición de cada hallazgo de la corrida 4 está en `planning/run4-triage.md`.

## (b) Archivos que cambiaron desde tu paquete
Comparado con `prompts/ref/tomas-zip-hashes.txt` (12 primeros caracteres del hash); se ignoran los archivos regenerados por `npm run check` y `prompts/`.
Cambiados (19), actualizado el 2026-10-21:
- Diseño y registro: `ai-log/decision-log-solu2.md`, `planning/ARCHITECTURE.md`, `planning/detailed-design/contracts.md`, `ports-and-adapters.md`, `schemas/dto.ts`, `schemas/openapi.yaml`, `planning/epics.md`, `planning/ux-state-contract-map.md`, `reviews/review-test-quality.md`
- Pruebas: `test/atdd/m2_contracts.test.ts`, `test/atdd/m2_domain.test.ts`, `test/fixtures/index.ts`, `test/harness/fixtures.test.ts`, `ports/in/policy.ts`
- Control y trazas: `test/ci/readiness.mjs`, `test/story-index.json`, `test/test-design.md`, `test/traceability-matrix.md`, `test/nfr-evidence.md`
Archivos nuevos respecto a tu paquete (6): `planning/phase-5-readiness-report.md`, `planning/implementation-readiness-report-solu2.md`, `planning/implementation-readiness-report-solu2-run2.md`, `planning/criteria-test-map.md`, `planning/accepted-concerns.md` y este archivo. Los archivos de `ux/` no cambiaron: sus hashes coinciden con `test/evidence/protected-sha256.json`. El detalle por archivo y los supuestos de fixture que debes confirmar están en `prompts/ref/delta-for-tomas-p5.md`.

## (c) Qué debes hacer
1. Abre el diff de las pruebas: `test/atdd/m2_contracts.test.ts`, `test/atdd/m2_domain.test.ts`, `test/fixtures/index.ts`.
2. Ejecuta `npm ci && npm run check` (Node 24.15 o superior). Se esperan 61 pruebas rojas y el gate estructural en PASS (los informes del gate están exentos del lint FR-15 por la decisión DL-53).
3. Lee DL-17 … DL-24 y confirma o edita tus entradas con tus propias palabras.
4. Lee el punto abierto `PV-Q1` `denied_count`: el contrato no fija su valor (`contracts.md` previewFreeze Q4).
5. Lee `planning/phase-5-readiness-report.md`; las firmas siguen en blanco.

## (d) Dónde trabajar
Trabaja desde esta carpeta, no desde el zip anterior.

## (e) Archivos protegidos
No edites `planning/prd.md`, `planning/readiness-gate-report.md`, `ux/*` ni `ai-log/decision-log.md`.
