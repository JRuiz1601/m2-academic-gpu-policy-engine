# Impl-2 / 2.6 — Emergency freeze and policy console (Flow E, Playwright + POM)

Estado: ready-for-review. Meta: que la operadora Rebecca congele la flota desde la consola, vea el banner rojo "FLEET COMPUTE FROZEN - EXAM IN PROGRESS" y que una evaluación que no es de examen reciba DENY con "Emergency freeze active: Final Exam CS-101". Riesgo: un banner que no aparece o una razón perdida deja a la operadora sin señal de que la flota está congelada.

1. Contexto: anexo de Impl-2 (2.6) y contrato UX de revisión de consecuencias.
2. Inspección: `src/adapters/inbound/web/index.html` (borrador → vista previa → confirmar), ruta de DENY por congelación en `src/domain/evaluate.ts`. Se mantiene el flujo borrador/vista previa/confirmación; no se reemplazó por un interruptor.
3. Desglose: (c) rationale con motivo, (a) alias `/admin/policy-console`, (b) banner con sondeo, POM + specs, auditoría de mutación.
4. Código y pruebas: `src/domain/evaluate.ts`, `src/application/service.ts`, `src/application/facts.ts`, `src/adapters/inbound/http.ts`, consola HTML; `test/unit/freeze-rationale.test.ts`, `test/implementation/http.test.ts`, `tests/e2e/pages/PolicyConsolePage.ts`, `tests/e2e/policy-console.spec.ts`.
5. DoD: `npm run check` verde; `npx playwright test` 3/3; traza real en `test/evidence/e2e/trace-main-scenario.zip` y `test/evidence/e2e/run.log`; auditoría en `docs/mutation-sanity-2.6.md`.
6. Revisión: autorrevisión; revisión humana independiente pendiente.

## Desviaciones y notas

* El anexo habla de HTTP 423 / DENY; el contrato devuelve 200 con cuerpo DENY por diseño (decisión K1) y se mantiene.
* El escenario "una solicitud de examen permitida sigue adelante" no se puede ejecutar de extremo a extremo: el simulador no tiene fuente de reservas. Se cubre a nivel de dominio.
* El Chromium empaquetado de Playwright lo bloquea la política de control de aplicaciones de esta máquina Windows; las corridas locales usan Chrome del sistema con `E2E_CHANNEL=chrome` (por defecto, y en CI, se usa el Chromium empaquetado).
