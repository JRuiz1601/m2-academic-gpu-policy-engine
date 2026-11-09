# Impl-2 / 2.4 — Midnight Window Rollover (Flow A, ATDD-first)

Estado: done. Meta: que un trabajo nocturno (política NIGHT) reciba aviso a las 05:55:00, sea expulsado a las 06:00:00 y que una extensión que cruce esa hora sea denegada citando el inicio de clases. Riesgo: un error de borde de un segundo o de zona horaria deja trabajos de GPU corriendo dentro de la ventana protegida de clases.

1. Contexto y DoR: anexo de Impl-2 (historia 2.4), AD-04, `fixtures/timetable.json`; contrato `POST /policy/window-boundary` agregado a ambos OpenAPI (commit `docs(contract)`).
2. Inspección: reloj como puerto (`Runtime.clock`), `http.ts`, `facts.ts`, reglas R-BOUND-01 / R-NIGHT-01. Inconsistencia 06:00 vs 08:00 resuelta en `docs/implementation-decisions.md` (decisión 11).
3. Desglose: contrato, fase roja (tests + stubs), dominio puro, reloj `TimeDilationClock`, caso de uso, ruta HTTP, fixture 08:00, auditoría de mutación.
4. Código y pruebas: `src/domain/window-boundary.ts`, `src/application/window-boundary.ts`, `src/adapters/outbound/time-dilation-clock.ts`, ruta en `src/adapters/inbound/http.ts`; `test/unit/window-boundary.test.ts`, `test/implementation/window-boundary.http.test.ts`. No se invocó `bmad-testarch-atdd` ni `bmad-dev-story`: son flujos interactivos de varios pasos (usan `uv`); se aplicó el mismo ciclo a mano.
5. DoD: `npm run check` verde (log en `test/evidence/green/story-2.4-green-phase.log`); auditoría de mutación en `docs/mutation-sanity-2.4.md` (2 pruebas vacías corregidas, 1 mutante equivalente).
6. Revisión: autorrevisión; revisión independiente completada por Juan Esteban Ruiz Ome el 2026-11-09 (2026-11-09T11:17:27-0500), revisión del equipo, no de un auditor externo.

## Evidencia Flow A

* Fase roja: `test/evidence/red/story-2.4-red-phase.log` — 15 fallos, todos `AssertionError` (404 de ruta ausente o valores del stub), commit `test(story-2.4): ATDD red phase` empujado antes del commit `feat(story-2.4)`.
* Fase verde: `test/evidence/green/story-2.4-green-phase.log`.
