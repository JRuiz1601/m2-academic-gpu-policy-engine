# Traspaso a la Fase 3 — M2 Academic GPU Policy Engine (Solu-2)

**Para:** Tomás Quintero (líder de pruebas en la Fase 3) · **De:** Juan Ruiz (revisor en la Fase 3; arquitecto de las Fases 0–2) · **Fecha:** 2026-10-19
**Fuente de reglas:** `Material del Curso/task-solu2_UniversityAICompute_Workshop.pdf` (Fase 3 = sección 6, Fase 4 = sección 7, Fase 5 = sección 8, rúbrica = sección 10, Anexo A).

## 1. Dónde estamos

Las Fases 0 a 2 están hechas y revisadas: contratos P/Q/I de 3 operaciones, catálogo de 38 errores, tabla de 9 invariantes, puertos y adaptadores, esquema SQL en dos motores, DTO, eventos, OpenAPI, cruce contrato↔esquema y la revisión adversarial y de casos borde con su triage. Tú lideras la Fase 3 (pruebas) y la Fase 4 (`epics.md`); yo reviso ambas y cierro la Fase 5. Cada decisión que tomes en el decision-log (`ai-log/decision-log-solu2.md`) va con tu nombre.

## 2. Qué existe y para qué sirve (ruta dentro de `M2-Academic-GPU-Policy-Engine/`)

| Archivo | Para qué lo necesitas |
|---|---|
| `planning/detailed-design/contracts.md` | §2 las 3 operaciones (`evaluateRequest`, `previewFreeze`, `activateFreeze`) con P, Q, I; §3 catálogo de errores (38); §4 tabla de invariantes: qué test debe ponerse en rojo por cada M2-AD. Es tu fuente principal. |
| `planning/ARCHITECTURE.md` | §6 invariantes M2-AD-1…9; §11 Verification Plan (ids de test ya nombrados); §14 decisiones tomadas (TF-1…TF-16 son las de la triage). |
| `planning/detailed-design/ports-and-adapters.md` | Capas, puertos y adaptadores simulados, reglas de importación, diagrama. Define dónde van los stubs. |
| `planning/detailed-design/schemas/` | `001_m2_schema.sqlite.sql` y `.postgres.sql` (fixture `db`), `dto.ts`, `events.md`, `openapi.yaml`. |
| `reviews/review-detailed-design.md` | Hallazgos, triage (20 Accept, 18 Defer) y la sección del caso borde del Anexo A. Léelo antes de escribir el registro de riesgos. |
| `ai-log/decision-log-solu2.md` | Decisiones de las Fases 0–2. Aquí se agregan las tuyas. |
| `planning/prd.md`, `ux/*` | Requisitos y escenarios. No se editan (solo por hallazgos triados). |

## 3. Qué ya está decidido y qué sigue abierto

- **Decidido (no reabrir sin hallazgo):** las 3 operaciones núcleo; TypeScript/Node con Vitest y fast-check; SQLite (en memoria) y PostgreSQL con SQL plano, una migración por motor; puertos como interfaces TypeScript con adaptadores simulados; reloj e ids solo por los puertos `Clock` e `IdGenerator`.
- **Abierto (candidatos a riesgo o a historia):** los 18 hallazgos aplazados (ver «Triage record» en `reviews/review-detailed-design.md`); los marcadores `PROPOSED` en los dos SQL (sección E.1b del mismo archivo); la excepción de `DECISION_NOT_PRODUCED` para el reloj caído (`contracts.md` §3); dos cambios de UX pendientes (`ux/EXPERIENCE.md` aún lista `WINDOW_STARTED` y un estado degradado de activación que el diseño descartó). Estos no estaban en el alcance de las Fases 0–2.

## 4. Tu trabajo en la Fase 3 (mínimos del PDF)

1. **`test/test-design.md`** (`/bmad-testarch-test-design`): registro de riesgos con al menos 8 riesgos (id, riesgo, probabilidad 1–3, impacto 1–3, puntaje, prioridad P0–P3, contrato o AD-n que lo mitiga). El caso borde obligatorio del módulo debe ser P0. Asignación de niveles de prueba (la lógica de dominio pura con la mayor parte) y umbrales de cobertura. Lista de huecos de testabilidad en la arquitectura (esos vuelven a mí).
2. **Fixtures** (`/bmad-testarch-framework`, solo andamiaje): `fake_clock`, `seed_fleet` (31 × (1 × 24 GB) + 1 × (2 × 48 GB), todos HEALTHY), `sim_telemetry`, `db` (SQLite en memoria o Postgres, migrada desde `001_*.sql`), `explain_assert`.
3. **Suite ATDD en rojo** (`/bmad-testarch-atdd`): `test/atdd/<modulo>_contracts.test.ts`, al menos 2 pruebas por operación por categoría: camino feliz (Q), violación de precondición (P) con error tipado y sin mutación de estado, invariante bajo concurrencia, repetición o frontera, el caso borde obligatorio (con aserciones sobre el estado final) y explicabilidad (el `Decision` cita al menos 1 id de regla). Cada prueba llama a un stub de interfaz que lanza `NotImplementedError` y tiene aserciones reales sobre el valor devuelto, el estado resultante, los eventos emitidos y, en rechazos, lo que **no** ocurrió. `assert true`, cuerpos vacíos y aserciones sobre mocks configurados por ti son tautologías y se penalizan.
4. **`test/nfr-evidence.md`** (`/bmad-testarch-nfr`): una fila por NFR del PRD (métrica y umbral, cómo se mide, artefacto, estado). Mínimo: uno de rendimiento (con número de concurrencia), uno de fiabilidad (timeout, reintento o recuperación) y uno de seguridad o aislamiento.
5. **CI** (`/bmad-testarch-ci`): `test/ci/quality-gate.yml` (o Makefile).
6. **Revisión de calidad y trazabilidad** (`/bmad-testarch-test-review test/atdd/` → `reviews/review-test-quality.md`; `/bmad-testarch-trace` → `test/traceability-matrix.md`, columnas PRD FR/NFR · escenario UX · AD-n · cláusula de contrato · id de test · id de historia · estado).
7. **Matriz de habilidades TEA** del PDF (3.7), «con tus propias palabras».

**Compuerta de la Fase 3:** ningún riesgo P0 sin una prueba en rojo, y ningún AD-n sin un test que se ponga en rojo si se viola la regla.

**Primer paso práctico:** los stubs de interfaz (funciones y clases que lanzan `NotImplementedError`) aún no existen en el repositorio. Las rutas propuestas están en `ports-and-adapters.md` §2. Se permiten stubs y pruebas en rojo; **no** lógica de producción (penalización de −20).

## 5. Caso borde obligatorio de M2 (Anexo A, fila 2)

«Un job aprobado a las 21:58 bajo la política nocturna y que sigue corriendo pasadas las 10:00 de una ventana de clase → la reevaluación da DENY/terminación en el límite.» En nuestro diseño no hay operación `reevaluateRunningJob`; el módulo emite `valid_until` y `must_checkpoint_by` en cada `ALLOW` y publica la obligación a M9 (ver `reviews/review-detailed-design.md`, sección «Annex A row 2», donde quedó marcado como PARCIAL: el plazo = límite − gracia no se puede expresar en SQL). Tienes que decidir cómo se prueba y escribir esa decisión en el log.

## 6. Reglas que cuidar

- Sin lógica de producción. Sin tautologías.
- `prd.md` FR-15: lista de términos prohibidos que aplica a `planning/`, `reviews/` y `ai-log/` (está en `planning/prd.md`, fila FR-15). Revísala antes de entregar.
- No editar `prd.md`, `ux/*`, `planning/readiness-gate-report.md` ni `ai-log/decision-log.md`.
- El decision-log pide, por cada entrada: Fase · Persona/Skill · Prompt (resumen) · Salida de la IA (resumen) · Decisión (ACCEPT / MODIFY / REJECT) · Razón · Artefacto cambiado · quién decidió. Al menos 2 rechazos o correcciones de propuestas de la IA, con su razonamiento técnico.
- Cada uno debe poder dar una explicación de 3 minutos del paquete.

## 7. Qué hago yo mientras tanto

Reviso lo que entregues (Fase 3 y 4), atiendo los huecos de arquitectura que salgan de tus pruebas, preparo `ARCHITECTURE.md` v2 y firmo el gate de preparación del sprint. Si algo del diseño te parece mal, abre un hallazgo en lugar de cambiarlo: se triagea y queda en el log.

## 8. Entorno

Necesitas el mismo andamiaje BMad (`.claude/skills` y `_bmad` de la raíz del proyecto, que contiene las habilidades `bmad-testarch-*`), Node con TypeScript, y `vitest` y `fast-check`. Si trabajas en un clon aparte, copia también `Material del Curso/task-solu2_UniversityAICompute_Workshop.pdf`.

**Cómo recibes los archivos:** Juan te envía un zip con toda la carpeta del módulo, más `.claude/skills`, `_bmad` y el PDF del taller (`Material del Curso/task-solu2_UniversityAICompute_Workshop.pdf`). Descomprime respetando la estructura de carpetas (el módulo, `.claude` y `_bmad` quedan al mismo nivel) y empieza leyendo este archivo. Las carpetas `prompts/` y `prompts/backup/` son del flujo de trabajo de Fase 0–2; puedes ignorarlas.
