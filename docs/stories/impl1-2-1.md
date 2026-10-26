# Impl-1 / 2.1 — Baseline GPU Access Request Evaluation

Estado: ready-for-review. Meta: permitir a Mateo usar una estación de 24 GB con regla y explicación citadas. Afecta identidad, autorización, catálogo, persistencia y API; una regresión puede conceder acceso indebido, por lo que requiere ceremonia completa.

1. Contexto y DoR: anexo M2 del PDF, PRD R-VALID/R-AUTH/R-ALLOW y AD-1/6/8/9; contrato EvaluateRequestDto/DecisionDto y POST /policy/decisions. El esquema y las pruebas anteriores existían; el motor era un stub.
2. Inspección: package.json, tsconfig, core, puerto de entrada, fixtures, migración SQL y ATDD. Se mantuvo TypeScript y se eliminó el enlace de producción a `test/fixtures`.
3. Desglose: tipos de dominio → reglas puras → Store/Runtime → SQLite → servicio transaccional → HTTP/CLI → pruebas y consola.
4. Código y pruebas: `src/domain/evaluate.ts`, `src/application/service.ts`, adaptadores y `test/implementation/core.test.ts`/`http.test.ts`. Se verifican ALLOW citado, falta de entitlement, identidad vinculada a sesión, wire inválido, concurrencia y reinicio con replay.
5. DoD automatizado: `npm run check`; evidencia conjunta en `test/evidence/impl1-check.log`. No skips. Lint de límites y tsc estricto con erasableSyntaxOnly.
6. Revisión: se corrigió idempotencia para incluir todo el cuerpo y se verificó persistencia antes de respuesta. Autorrevisión completada; revisión humana pendiente, sin promoción a done.

BDD: Given Student y modelo de 8 GB con estación de 24 GB, When evalúa su solicitud, Then ALLOW con R-ALLOW-01, citas y “Standard student lab policy satisfied”. Given actor sin entitlement, When solicita esa asignatura, Then DENY por R-AUTH-01.

Base de datos: usa el esquema inicial acordado; decision, fact_snapshot, trace_entry, decision_constraint, decision_citation, idempotency_key y decision_outbox. No agrega columnas al ejemplo previo.
