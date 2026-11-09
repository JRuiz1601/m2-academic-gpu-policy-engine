# Impl-2 / 2.5 — High-concurrency burst under k6 (Flow D)

Estado: in-progress (NFR de latencia NO cumplido; no se promueve). Meta: que 100 evaluaciones simultáneas al inicio de clase respondan con p95 < 50 ms, todas 200 y válidas. Riesgo: una cola serializada de escrituras hace que la última solicitud espere a las otras 99.

1. Contexto: anexo de Impl-2 (2.5), `tests/nfr/policy-burst.js`.
2. Inspección: perfil de CPU del camino caliente; la evaluación pura es ~1 %, SQLite ~60 %.
3. Desglose: script k6 y runner, línea base, optimización medida, martillo de concurrencia, quality gate, tres corridas de evidencia.
4. Código y pruebas: `tests/nfr/policy-burst.js`, `tests/nfr/run-nfr.mjs`, `scripts/quality-gate.mjs`, `src/adapters/outbound/sqlite.ts` (sentencias preparadas, `insertMany`), `src/adapters/outbound/simulator.ts` (texto de fixtures), `test/unit/store-performance-paths.test.ts`, `test/implementation/concurrency.test.ts`.
5. DoD: `npm run check` verde. Martillo: 50 llamadas con la misma clave dan 1 decisión y respuestas idénticas byte a byte; 100 claves distintas dan 100 decisiones, sin 5xx y 100 filas de outbox; dos activaciones simultáneas dejan una sola congelación ACTIVE (lo garantiza la transacción BEGIN IMMEDIATE con la comprobación de duplicado). Latencia: ver `docs/nfr-impl2.md` (p95 227–292 ms; presupuesto no cumplido).
6. Revisión: autorrevisión; revisión humana independiente pendiente. NEEDS DECISION sobre el presupuesto (group commit o reducir el alcance).
