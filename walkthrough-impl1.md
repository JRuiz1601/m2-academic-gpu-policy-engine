# Implementation Walkthrough — Impl-1 M2

Fecha: 2026-10-26, America/Bogota. Estado: implementado y verificado localmente; **ready-for-review**. No es una firma de producción ni sustituye el dictamen histórico de Solu-2.

## Resultado verificable

`npm run setup` ejecutó `npm ci --ignore-scripts`, typecheck, lint de arquitectura y la suite completa. Resultado: **114/114 pruebas aprobadas, 0 fallidas, 0 omitidas, 8 archivos**. De ellas, 61 son las ATDD originales, 6 validan las fixtures y 47 cubren implementación nueva, API, configuración y arranque (28 de la primera entrega y 19 BDD/errores en `test/implementation/stories.bdd.test.ts`). Registro completo: [impl1-check.log](test/evidence/impl1-check.log); entorno: [impl1-environment.json](test/evidence/impl1-environment.json).

Cola real de la última corrida de `npm run check` (Node v24.18.1; también pasó en Node 22.18.0):

```text

> m2-academic-gpu-policy-engine@1.0.0 typecheck
> tsc --noEmit


> m2-academic-gpu-policy-engine@1.0.0 lint
> node test/ci/implementation-lint.mjs

Implementation lint PASS: typed code, production boundaries, pure domain
Acceptance inventory PASS: no excluded tests; runtime migration matches contract; docs copies equal planning sources

> m2-academic-gpu-policy-engine@1.0.0 test
> vitest run test/atdd test/harness test/implementation


 RUN  v4.1.12 C:/Users/juane/Documents/Universidad/Noveno Semestre/Desarrollo IA/impl1-M2-Academic-GPU-Policy-Engine/M2-Academic-GPU-Policy-Engine


 Test Files  8 passed (8)
      Tests  114 passed (114)
   Start at  15:03:10
   Duration  1.72s (transform 674ms, setup 0ms, import 1.19s, tests 3.37s, environment 1ms)
```

El núcleo puro se evaluó 1000 veces con comparación de resultado determinista: p95 **0.0093 ms**, máximo observado **0.8656 ms**, frente al presupuesto de 30 ms del anexo. Evidencia: [impl1-performance.json](test/evidence/impl1-performance.json). Es una medición local en proceso caliente; no acredita latencia HTTP sostenida ni rendimiento de producción.

## Arquitectura entregada

`src/domain` contiene tipos, registro y evaluación pura; `src/ports` define Store/Runtime; `src/application` coordina lecturas y transacciones; `src/adapters/inbound` contiene HTTP, CLI y consola; `src/adapters/outbound` implementa SQLite y simulación. `fixtures` trae exactamente 31 estaciones de 24 GB y un servidor con dos GPU de 48 GB. La migración inicial es idéntica al SQL acordado; la semilla incluye 12 documentos de políticas y una versión inicial. El core no importa driver SQL, HTTP, reloj del sistema ni datos de pruebas.

La API tiene las 14 operaciones del contrato previo: decisiones/preview, reglas, versiones/lista/detalle/publicación, congelaciones/creación/lista/preview/activación/levantamiento/detalle y health/ready. El servidor también sirve la consola estática en `/`. Las firmas especializadas prevalecen sobre el ejemplo genérico del PDF; ver [implementation-decisions.md](docs/implementation-decisions.md).

## Historias núcleo del PDF

| Historia | Resultado y contrato | Persistencia | Verificación |
|---|---|---|---|
| 2.1 acceso base | POST /policy/decisions permite estación de 24 GB con R-ALLOW-01, justificación y citas; valida sesión, entitlement y entrada | decision, fact_snapshot, trace_entry, decision_citation, idempotency_key y outbox en una transacción; restricciones cuando aplican | ALLOW/negativas, cuerpo completo conforme al esquema, identidad vinculada, concurrencia, reinicio con replay idéntico y rollback |
| 2.2 protección de clase | Mismo endpoint: lunes 10:30 campus, CS-101 10–12, trabajo asíncrono → DENY R-LAB-01 con próxima disponibilidad 17:00 UTC; fin excluido | Ventanas proyectadas en fact_snapshot y decisión trazada; calendario simulado de lectura | Caso del anexo, inicio/fin generado, noche/deadline, cuota combinada, evaluación a las 10:00 y delegación sin tocar GPU |
| 2.3 tier VRAM | Mismo endpoint: Student+modelo 8 GB+servidor 48 GB → DENY R-TIER-02 con sugerencia std-24; excepciones Instructor/Researcher | Modelo/clearance en snapshot, regla y cita en las tablas existentes | Escenario del anexo, ambas excepciones, floor incompatible y variante elegible |

Las historias completas con contexto, DoR, tareas, BDD, DoD y revisión están en [docs/stories](docs/stories). Su estado está en [docs/sprint-status.yaml](docs/sprint-status.yaml). El backlog antiguo se actualizó a in-progress, porque el producto tiene código pero no se han certificado todos sus criterios originales.

## Mapa por historia

| Historia | Meta | Endpoint(s) | Tablas (migración `001_m2_schema.sqlite.sql`) | Pruebas |
|---|---|---|---|---|
| 2.1 acceso base | Permitir estación de 24 GB a un estudiante con derecho y explicar la regla | `POST /policy/decisions` 200 (ALLOW/DENY), 400, 401, 409, 503; `POST /policy/decisions/preview` 200/403 | lectura: policy_document, policy_version; escritura: decision, fact_snapshot, trace_entry, decision_citation, idempotency_key, decision_outbox | `stories.bdd.test.ts`: "Given student mateo and a 24GB workstation request…", "Given no entitlement…", "Given a malformed or non-contract body…"; `core.test.ts`: "2.1 permits…", "2.1 refuses…"; `http.test.ts` |
| 2.2 protección de clase | Negar trabajo asíncrono durante CS-101 lunes 10:00–12:00 con la siguiente disponibilidad | mismo endpoint, 200 DENY R-LAB-01 | misma escritura; ventanas del horario en fact_snapshot | `stories.bdd.test.ts`: "Given CS-101 Monday 10:00–12:00 and clock Monday 10:30…", "…exactly 12:00… (end exclusive)", "…outside the window (13:00)…", "Current behaviour: interactive inference…"; `core.test.ts` "2.2 …" |
| 2.3 tier VRAM | Negar el servidor de 48 GB a un estudiante cuyo modelo cabe en 24 GB y sugerir std-24 | mismo endpoint, 200 DENY R-TIER-02 | misma escritura; modelo y clearance en fact_snapshot | `stories.bdd.test.ts`: "Given a Student requesting the 48GB server…", "…Researcher or Instructor…", "…more than 24GB… Student…", "…Researcher requests the server…", flota de 32 nodos; `core.test.ts` "2.3 …" |
| Errores | Catálogo estructurado sin trazas | 400, 401, 403, 404, 409, 503 (OpenAPI no define 422) | sin escrituras en fallos | `stories.bdd.test.ts` bloque "Error payloads follow the OpenAPI catalog" |

## Desviaciones del ejemplo del PDF

Detalle en [docs/implementation-decisions.md](docs/implementation-decisions.md).

- `/policy/decisions` en lugar de `/api/v1/policy/evaluate`: el contrato OpenAPI previo ya fija esa ruta y su DTO.
- Sin tabla `policy_rules`: las reglas son un registro inmutable en código, versionado en `policy_version`.
- Pista TypeScript: es el stack de la planeación previa (el PDF ilustra otro stack).
- HTTP y SQLite nativos de Node en lugar de Express/ORM: sin dependencias nuevas; Ports & Adapters se conserva.
- Hallazgos del motor (no corregidos): R-AUTH-02 antecede a la variante R-TIER-03; INTERACTIVE_INFERENCE no se bloquea en clase. Ver entradas 11 y 12 de [ai-decision-log.md](ai-decision-log.md).

## Flujos adicionales de la planeación que ya funcionan

- Idempotencia por actor+clave, hash del cuerpo completo, rechazo por cuerpo distinto y clave vencida; recuperación sin reevaluar después de reinicio.
- Preview de decisión sin escrituras, override de reloj controlado por rol/flag y validación estructurada de hechos.
- Congelaciones con borrador, preview persistido, token HMAC, vigencia de 60 s, actor y hash vinculados, consumo único y transacción de activación; motivo obligatorio al levantar.
- Versiones secuenciales inmutables y outbox transaccional. La publicación congela el registro fijo de esta compilación; no modifica reglas.
- Denegaciones de permisos, cuota agotada, modelo incompatible, hardware fallando, ventana protegida, actor de sistema inválido y facts fallidos; sustitución de variante, cupo provisional, cola y deadline.
- Consola local adaptable a móvil: evaluador, citas/evidencia, reintento, catálogo y gestión de congelaciones con revisión previa. CLI con códigos de salida y JSON.

## Ceremonia y revisión

Se realizó localmente el ciclo del PDF de contexto → inspección → desglose → código+tests → DoD → revisión y promoción. El archivo de sprint y los archivos de historia registran este ciclo local de seis pasos. Los registros por historia explican la meta, riesgo y evidencia en dos frases y detallan los seis pasos. Esto se ejecutó con un agente de código local; no se atribuyen invocaciones a `bmad-build`, Amelia o herramientas que no están instaladas en esta copia. La autorrevisión y la automatización concluyeron; revisión humana independiente pendiente. La bitácora registra catorce entradas y varias correcciones concretas en [ai-decision-log.md](ai-decision-log.md).

La revisión corrigió dependencia de producción a Harness de pruebas, ordinal obligatorio en citas, cuota que se perdía ante deadline, hash de idempotencia incompleto y sintaxis TypeScript que Vitest aceptaba pero Node nativo rechazaba. Se agregaron pruebas de CLI y arranque real para detectar esta última clase de error.

## Ejecución y límites

Desde esta carpeta: `npm run setup` y `npm start`; abrir http://127.0.0.1:3000. El README contiene curl y configuración. No requiere servicios de otros equipos. SQLite persiste en `data/m2.sqlite`; las pruebas usan memoria o archivos temporales aislados.

Docker se ejecutó de verdad el 2026-10-26 (ver "Ejecución en Docker"). La CI está lista pero no se publicó ni ejecutó en GitHub; el origen no tenía repositorio Git. La entrega usa archivo organizado, opción admitida por el PDF.

[Todos los pendientes](PENDIENTES-IMPL1.md) incluyen pruebas de navegador/accesibilidad, producción, entrega de eventos/M9, NFR avanzados, reevaluación histórica completa, trazabilidad avanzada y reconciliación formal de los hallazgos de run5. No se marca toda la planeación como terminada por haber pasado las pruebas locales.

## Ejecución en Docker

`docker --version`: Docker version 29.6.2, build dfc4efb (Docker Desktop, contexto desktop-linux). Imagen base `node:22.18.0-bookworm-slim`.

- `docker compose up --build -d`: exit 0; el build terminó con `#14 naming to docker.io/library/m2-academic-gpu-policy-engine-policy:latest done` y creó red, volumen `policy-data` y contenedor.
- `GET /health` → 200 `{"status":"OK"}`; `GET /ready` → 200 `{"status":"READY","checks":[registry,clock,store,bus todos ok:true]}` (respondió al primer intento).
- `POST /policy/decisions` del README (student-demo-token, `Idempotency-Key: docker-1`) → 200, ALLOW, R-ALLOW-01, decision_id 01a1521a-0780-7b86-9dc8-eae3507e9cbc. Segunda clave `docker-2` → 200. `GET /` → 200 `text/html`.
- Persistencia: `docker compose down` (sin -v) y `up -d`; el mismo POST con `docker-1` → 200 con el mismo decision_id y el mismo JSON al comparar campos. No es idéntico byte a byte: el replay serializa las claves en otro orden (mismo tamaño, 3548 bytes). El volumen sobrevivió al `down`.
- No verificado: que el healthcheck de la imagen pasara a "healthy" (se observó "starting" a los 6 s). Al final `docker compose down`; no quedaron contenedores y el volumen `policy-data` se conservó (no se usó -v).

## Git history note

The implementation was produced in a workspace without version control; the commits were created at submission time by slicing the final tree and do not reflect the real chronology.
