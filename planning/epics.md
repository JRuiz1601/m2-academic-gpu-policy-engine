# Epics M2 - backlog vertical de implementación posterior

Preparado para Tomás Quintero, 2026-10-19, con asistencia de IA. Estado: listo para revisión de Juan Ruiz. Stop-Point: no implementar. Cuatro épicas y dieciséis historias (límite del enunciado: 3–4 épicas y 9–16 historias; decisión DL-56); todas en backlog. Las dependencias son previas. Este documento especifica trabajo futuro, no declara funcionalidades ya construidas.

Mapa de criterios de aceptación a pruebas: `planning/criteria-test-map.md` (una fila por criterio de las 16 historias, con su estado). Hallazgos aceptados sin corregir en este paquete: `planning/accepted-concerns.md`. Tabla de las disposiciones de los 29 hallazgos de la corrida 4 del gate: `planning/run4-triage.md`.

Base normativa: `detailed-design/contracts.md`, `detailed-design/ports-and-adapters.md`, `detailed-design/schemas/`, PRD y arquitectura existentes. Las referencias P/Q/I se refieren a §2 de contracts. AD usa el prefijo M2. Cada DoD futura exige evidencia verde; la entrega académica actual exige rojo verificable. Los huecos G-01..G-10 fueron cerrados por Juan Esteban Ruiz Ome el 2026-10-20 (decisiones DL-25 a DL-34; `ARCHITECTURE.md` §15.2).

## Epic 1: Elena recorre el sistema y comprende una decisión

### Story 1.1: Elena obtiene su primera decisión explicada

Como Elena Vargas, quiero enviar una solicitud de GPU y recibir una decisión con su regla y su evidencia, para saber de inmediato si puedo trabajar y por qué.

- Traceability (Requirements): FR-1, FR-14, NFR-2, NFR-11; evaluateRequest P1/P2, Q1/Q2/Q4; EV-Q1, EV-P1, EV-P2; /health y /ready (HR-Q1, HR-P1 planificadas); llamada sin sesión (AUTH-U-1 planificada).
- Binding invariants: M2-AD-1, M2-AD-5.
- Contracts: evaluateRequest P1/P2, Q1/Q2/Q4.
- Schema/DTO: EvaluateRequestDto, DecisionDto; tablas decision, fact_snapshot, trace_entry, decision_outbox, en `detailed-design/schemas/dto.ts` y `001_m2_schema.sqlite.sql` / `.postgres.sql`.
- Files: `api/routes/` (§2 row 1), `ports/in/` (row 3), `decision/shell/` (row 4), `policy/core/` (row 5), `policy/renderer/` (row 9), `policy/registry/` and `policy/registry/boot_validator` (rows 6 and 8, minimal; extended in 1.2), `outbox/writer` (row 11, minimal; extended in 1.3), `ports/out/event_bus` and `adapters/sim/event_bus` (rows 25 and 41, minimal; extended in 4.1), `ports/out/repository` (row 27), `adapters/db/sqlite/` (row 29), `adapters/sim/` (rows 30–40), `test/atdd/m2_contracts.test.ts`. La card Success que dibuja la decisión en pantalla es de la historia 4.4 y no es alcance de esta historia (ver el alcance).
- ATDD: criterio 1: EV-Q1; criterio 2: EV-P2 (se comparte con la historia 1.3); criterio 3: test planned for implementation (HR-Q1, HR-P1 en `test/atdd/m2_contracts.test.ts`); criterio 4: test planned for implementation (AUTH-U-1 en `test/atdd/m2_contracts.test.ts`); criterio 5: EV-P1 (se comparte con la historia 1.3). Toda referencia de prueba es ID ejecutable en `test/atdd/`; mediciones NF-* son planes, no tests ejecutados.
- Depends on: Ninguna. Aclaración de alcance (gate run 3, MAJ-5): esta historia incluye las versiones mínimas del registro, del outbox writer y del bus de eventos que necesita para producir una decisión y su fila de outbox; la 1.2, la 1.3 y la 4.1 las amplían. No se renumera nada.
- Alcance: API POST /policy/decisions -> inbound -> dominio -> repositorio con SQLite migrado y adaptadores simulados; flota seed_fleet; la decisión devuelta cita su regla y lleva su evidencia en el DTO. El registro es mínimo: esta historia carga solo `R-ALLOW-01` (precedencia 17) y asegura un camino ALLOW de una sola regla. El registro de las 19 reglas, su orden único y el recorrido completo de la lista los posee la historia 1.2; cada regla la implementa la historia que la nombra (2.1, 2.2, 2.3 y 3.5). La card Success de pantalla es de la historia 4.4 (triage de la corrida 4, hallazgo C-3).

Acceptance criteria:

1. Given una petición válida de inferencia de Elena a las 22:00 con cuota suficiente y un registro con `R-ALLOW-01` como única regla cargada; When envía la petición por HTTP; Then recibe 200 ALLOW/ADMITTED por `R-ALLOW-01`, una decisión y un outbox; la decisión cita la regla (el recorrido de las 19 reglas es de la historia 1.2 y la card de pantalla es de la historia 4.4).
2. Given Elena (actor-elena) envía POST /policy/decisions sin el encabezado Idempotency-Key; When el servidor valida la petición; Then recibe 400 IDEMPOTENCY_KEY_MISSING (contracts.md §3.1) sin fila ni evento.
3. Given el módulo arrancado con registro, reloj, almacén escribible y bus alcanzable; When un cliente sin sesión envía GET /health y GET /ready; Then ambos responden 200 sin autenticación, y si un chequeo falla GET /ready responde 503 READY_CHECK_FAILED (`ARCHITECTURE.md` §5.1; contracts.md §3.1). Test planned for implementation: HR-Q1 y HR-P1 en `test/atdd/m2_contracts.test.ts`.
4. Given una llamada a POST /policy/decisions sin sesión; When el módulo valida al llamante; Then rechaza la llamada con el código UNAUTHENTICATED y no escribe nada (`ARCHITECTURE.md` línea 481 y M2-AD-9: toda ruta salvo /health y /ready exige llamante autenticado; el estado HTTP no está fijado: `contracts.md` §6 punto 1). Test planned for implementation: AUTH-U-1.
5. Given Elena envía POST /policy/decisions con expected_duration_min = 1.5; When el servidor valida el cuerpo; Then recibe 400 WIRE_SHAPE_INVALID sin fila ni evento (`contracts.md` línea 160) (EV-P1).

Definition of Done (implementación futura): criterios 1, 2 y 5 verificados con pruebas verdes y los criterios 3 y 4 con HR-Q1, HR-P1 y AUTH-U-1 cuando existan; EV-Q1, EV-P1, EV-P2 pasan tras reemplazar stubs; se añaden casos de aceptación aún planeados en esta historia; SQL, DTO y eventos coinciden con contrato, cero escrituras ajenas; umbrales NFR aplicables medidos; revisión de pareja y decisiones pendientes de arquitectura resueltas y registradas. La historia no pasa a done con una prueba roja o un NFR solo planeado.

### Story 1.2: Elena entiende una restricción y su regla

Como Elena Vargas, quiero ver qué restricción se aplicó a mi solicitud y qué regla la produjo, para ajustar el trabajo (cuota, modelo o hardware) sin pedir ayuda.

- Traceability (Requirements): FR-3, FR-9, FR-13, NFR-3, NFR-6, NFR-10, NFR-12; evaluateRequest I1/I2/I7, Q4; EV-Q1 (compartido con la historia 1.1), EV-Q2, EV-EX1, DM-AD1, DM-AD2, DM-AD5, DM-AD6, EV-TIER-01, EV-TIER-02, EV-TIER-03; EV-SUPP-01, DM-PURE-01, DM-PURE-02 y EV-TIER-04 planificadas.
- Binding invariants: M2-AD-1, M2-AD-2, M2-AD-6.
- Contracts: evaluateRequest I1/I2/I7, Q4.
- Schema/DTO: DecisionDto, ExplanationDto; tablas trace_entry, decision_citation, decision_constraint, en `detailed-design/schemas/dto.ts` y `001_m2_schema.sqlite.sql` / `.postgres.sql`.
- Files: `policy/core/` (§2 row 5), `policy/registry/` (row 6), `policy/registry/boot_validator` (row 8), `policy/renderer/` (row 9), `decision/shell/` (row 4), `ports/out/quota` (row 21), `adapters/sim/quota` (row 37), `test/atdd/m2_contracts.test.ts`, `test/atdd/m2_domain.test.ts`.
- ATDD: criterio 1: EV-Q2 (compartido con la historia 2.3), EV-EX1, DM-AD1, DM-AD5, DM-AD6; criterio 2: DM-AD2; criterio 3: EV-TIER-01, EV-TIER-02, EV-TIER-03; criterio 4: test planned for implementation (EV-SUPP-01 en `test/atdd/m2_contracts.test.ts`); criterio 5: test planned for implementation (DM-PURE-01 en `test/atdd/m2_domain.test.ts`); criterio 6: test planned for implementation (EV-TIER-04 en `test/atdd/m2_contracts.test.ts`); criterio 7: test planned for implementation (DM-PURE-02 en `test/atdd/m2_domain.test.ts`); criterio 8: EV-Q1 (compartido con la historia 1.1). Toda referencia de prueba es ID ejecutable en `test/atdd/`; mediciones NF-* son planes, no tests ejecutados.
- Depends on: 1.1.
- Alcance: Mostrar CONSTRAIN con autoridad PROVISIONAL para cuota; registro de 19 reglas, orden único, recorrido completo de la lista (dueña de ese recorrido: esta historia) y citas resolubles; determinismo sin llamadas de modelo; la explicación de una decisión ALLOW (criterio 8, tomado del criterio 1 de la historia 1.1 en el triage de la corrida 4).

Acceptance criteria:

1. Given un saldo positivo inferior a la necesidad; When Elena consulta su decisión; Then ve QUOTA_CAP con cap_value=saldo y PROVISIONAL, evidencia y cita.
2. Given el registro de reglas cargado al arranque tiene dos reglas con la misma precedencia; When la aplicación arranca y ejecuta el validador del registro; Then el arranque se rechaza con DUPLICATE_PRECEDENCE (error de arranque, no es un código HTTP del catálogo de contracts.md §3) sin admitir peticiones.
3. Given Elena (STUDENT, tope de 24 GB) pide un modelo de 48 GB; When envía POST /policy/decisions; Then recibe 200 con Decision DENY NOT_AUTHORIZED por R-TIER-02 si no existe variante calificada (EV-TIER-02), 200 CONSTRAIN MODEL_VARIANT por R-TIER-03 si existe (EV-TIER-03), y 200 DENY NO_SUCH_HARDWARE por R-TIER-01 si el piso del modelo supera la VRAM pedida (EV-TIER-01).
4. Given una solicitud cuya regla ganadora deja sin evaluar una regla de cuota aplicable; When Elena consulta la decisión; Then `suppressed[]` contiene esa regla con el hecho que la habría activado (`prd.md` línea 433, FR-9). Test planned for implementation: EV-SUPP-01.
5. Given el código de `policy/core`; When corre el control de importaciones del CI; Then falla si `policy/core` importa un paquete fuera de la lista de M2-AD-1 (`contracts.md` §4, fila M2-AD-1; `prd.md` línea 437, FR-13). Test planned for implementation: DM-PURE-01.
6. Given un actor RESEARCHER (tope de 48 GB) y la misma solicitud de 48 GB sobre un modelo de 48 GB que Elena (STUDENT) no puede usar; When envía POST /policy/decisions con el resto de hechos iguales; Then recibe 200 ALLOW (`prd.md` línea 427, FR-3 cláusula 3). Test planned for implementation: EV-TIER-04.
7. Given `evaluate()` ejecutado con el directorio de fixtures ilegible y sin red; When se evalúa un contexto literal 10 000 veces; Then no hay E/S y las 10 000 salidas son idénticas byte a byte (`prd.md` líneas 437 y 452, FR-13 y NFR-3). Test planned for implementation: DM-PURE-02.
8. Given una solicitud de Elena que resulta ALLOW por `R-ALLOW-01`; When consulta su decisión; Then la Decision trae al menos una cita, un rationale que contiene el id de la regla primaria y evidencia en la entrada de traza de esa regla (`ARCHITECTURE.md` M2-AD-6; la card Success que la dibuja es de la historia 4.4) (EV-Q1).

Nota de voz (gate run 3, MIN-1): los criterios 4, 5 y 7 describen propiedades del sistema; Elena las vive como "la decisión que veo cita lo que no se evaluó" y "mi decisión no depende del reloj ni de la red", y por eso están en esta historia.

Nota de tamaño (decisión DL-46): los ocho criterios se agrupan en una sola historia porque comparten los mismos componentes (`policy/core`, `policy/registry`, `policy/renderer`, filas 5, 6, 8 y 9 de `ports-and-adapters.md` §2) y el mismo contrato (evaluateRequest I1/I2/I7, Q4); la estimación de la historia es de 6–8 h (sección Sprint). No se divide para no duplicar el montaje de esos componentes.

Definition of Done (implementación futura): criterios 1 a 3 y 8 verificados con pruebas verdes y los criterios 4 a 7 con EV-SUPP-01, DM-PURE-01, EV-TIER-04 y DM-PURE-02 cuando existan; EV-Q1, EV-Q2, EV-EX1, DM-AD1, DM-AD2, DM-AD5, DM-AD6, EV-TIER-01, EV-TIER-02, EV-TIER-03 pasan tras reemplazar stubs; se añaden casos de aceptación aún planeados en esta historia; SQL, DTO y eventos coinciden con contrato, cero escrituras ajenas; umbrales NFR aplicables medidos; revisión de pareja y decisiones pendientes de arquitectura resueltas y registradas. La historia no pasa a done con una prueba roja o un NFR solo planeado.

### Story 1.3: Elena reintenta sin duplicar su solicitud

Como Elena Vargas, quiero reintentar la misma solicitud con la misma clave y recibir la misma decisión, para no duplicar decisiones ni gastar cuota dos veces cuando la red falla.

- Traceability (Requirements): FR-1, FR-11, NFR-5; evaluateRequest P4, I9, concurrency; EV-I1, EV-P1, EV-P2, EV-P3, EV-P4; DB-GRANT-1 planificada.
- Binding invariants: M2-AD-8.
- Contracts: evaluateRequest P4, I9, concurrency.
- Schema/DTO: EvaluateRequestDto, DecisionDto, ErrorBodyDto; tablas idempotency_key, decision, decision_outbox, en `detailed-design/schemas/dto.ts` y `001_m2_schema.sqlite.sql` / `.postgres.sql`.
- Files: `decision/shell/` (§2 row 4), `outbox/writer` (row 11), `ports/out/repository` (row 27), `adapters/db/sqlite/` (row 29), `ports/out/id_generator` (row 24), `adapters/sim/fake_id_generator` (row 40), `test/atdd/m2_contracts.test.ts`.
- ATDD: criterio 1: EV-I1; criterio 2: EV-P3 (cuerpo distinto), EV-P4 (clave vencida); criterio 3: test planned for implementation (DB-GRANT-1); además EV-P1 y EV-P2 (EV-P2 y EV-P1 se comparten con la historia 1.1). Toda referencia de prueba es ID ejecutable en `test/atdd/`; mediciones NF-* son planes, no tests ejecutados.
- Depends on: 1.1.
- Alcance: Replay por actor/clave y hash canónico, sin re-evaluación; journal append-only y orden estable; no borrar claves vencidas.

Acceptance criteria:

1. Given tres peticiones simultáneas iguales con una clave; When se completan; Then comparten decision_id y solo existe una decisión y un outbox.
2. Given Elena ya usó la clave K con un cuerpo A; When envía POST /policy/decisions con la clave K y un cuerpo B distinto, o con la clave K pasadas 24 h; Then recibe 409 IDEMPOTENCY_BODY_MISMATCH en el primer caso y 409 IDEMPOTENCY_KEY_EXPIRED en el segundo, sin nueva escritura.
3. Given el rol de base de datos del módulo en el perfil PostgreSQL; When se intenta un UPDATE o un DELETE sobre decision, trace_entry, decision_outbox o idempotency_key; Then la base lo rechaza, y el rol solo tiene INSERT y SELECT (`prd.md` línea 435, FR-11; M2-AD-8). Test planned for implementation: DB-GRANT-1 en `test/atdd/m2_contracts.test.ts` (solo en el perfil PostgreSQL).

Nota de voz (gate run 3, MIN-1): el criterio 3 es una propiedad del sistema; Elena la vive como "mi decisión pasada no cambia", y por eso está en esta historia.

Definition of Done (implementación futura): criterios 1 y 2 verificados con pruebas verdes y el criterio 3 con DB-GRANT-1 cuando exista; EV-I1, EV-P1, EV-P2, EV-P3, EV-P4 pasan tras reemplazar stubs; se añaden casos de aceptación aún planeados en esta historia; SQL, DTO y eventos coinciden con contrato, cero escrituras ajenas; umbrales NFR aplicables medidos; revisión de pareja y decisiones pendientes de arquitectura resueltas y registradas. La historia no pasa a done con una prueba roja o un NFR solo planeado.

## Epic 2: Elena respeta clases y recibe negativas ante fallos

### Story 2.1: Elena no invade la clase con su trabajo nocturno

Como Elena Vargas, quiero que mi trabajo nocturno quede acotado antes de la clase de la mañana y que una ventana de examen me lo niegue, para no invadir un laboratorio protegido ni perder trabajo sin aviso.

- Traceability (Requirements): FR-4, FR-5, FR-6, FR-7, NFR-4; evaluateRequest I4/I6, Time, Q3; NP-9 (guarda de frontera en el pasado, ruling DL-54); EDGE-2158, EDGE-NIGHT, EDGE-1000, EDGE-FINAL, DM-BOUND, DM-START, DM-NP9, EV-LAB-02; EDGE-THESIS, EDGE-STRADDLE-1, EDGE-STRADDLE-2, EDGE-STRADDLE-3, PROP-DEADLINE-1, EDGE-SCOPE-1 y EDGE-DAEMON-1 planificadas.
- Binding invariants: M2-AD-3, M2-AD-5.
- Contracts: evaluateRequest I4/I6, Time, Q3.
- Schema/DTO: DecisionDto, ConstraintDto; tablas decision, decision_constraint, decision_outbox, en `detailed-design/schemas/dto.ts` y `001_m2_schema.sqlite.sql` / `.postgres.sql`.
- Files: `policy/core/` (§2 row 5), `decision/shell/` (row 4), `outbox/writer` (row 11), `ports/out/timetable` (row 17), `ports/out/clock` (row 23), `adapters/sim/timetable` (row 33), `adapters/sim/fake_clock` (row 39), `test/atdd/m2_domain.test.ts`, `test/atdd/m2_contracts.test.ts`.
- ATDD: criterios 1 y 2: EDGE-2158, EDGE-NIGHT, EDGE-1000, EDGE-FINAL, DM-BOUND, DM-START; criterio 3: EDGE-NIGHT cubre el mecanismo y EDGE-THESIS es test planned for implementation (`test/atdd/m2_domain.test.ts`); criterio 4: EV-LAB-02; criterio 11: DM-NP9; criterios 5 a 7: test planned for implementation (EDGE-STRADDLE-1 y EDGE-STRADDLE-3 en `test/atdd/m2_domain.test.ts`, PROP-DEADLINE-1 en `test/atdd/m2_domain.test.ts`); criterios 8 a 10: test planned for implementation (EDGE-STRADDLE-2, EDGE-SCOPE-1 y EDGE-DAEMON-1 en `test/atdd/m2_domain.test.ts`). Los hechos de freeze y de ventanas de los criterios 6 y 9 los siembra el fixture; el agregado de freeze se construye en la épica 3 (aclaración MIN-5). Toda referencia de prueba es ID ejecutable en `test/atdd/`; mediciones NF-* son planes, no tests ejecutados.
- Depends on: 1.1.
- Alcance: Caso obligatorio dedicado: instante campus America/Panama, gracia 300s, noche 22:00-06:00; documentar contradicción 21:58; M2 decide y delega, M9 termina.

Acceptance criteria:

1. Given TRAINING a las 22:00 durante 800 min y clase siguiente a las 10:00; When se evalúa; Then CONSTRAIN con valid_until=must_checkpoint_by=05:55 por fin nocturno; 10:00 re-evaluado DENY R-LAB-01 y diario final con ambas decisiones.
2. Given Elena (STUDENT) con el reloj de campus a las 21:58; When envía POST /policy/decisions con workload_kind TRAINING; Then recibe 200 con Decision DENY, cause WINDOW_PROTECTED, primary_rule_id R-NIGHT-01 y admission REJECTED; no se fabrica un ALLOW para satisfacer el ejemplo.
3. Given una ventana de tipo THESIS como límite gobernante y Elena con una solicitud TRAINING; When se evalúa; Then CONSTRAIN por R-BOUND-01 con la ventana THESIS marcada governing (`prd.md` línea 532, escenario S-8). Hueco de cobertura declarado: EDGE-NIGHT prueba el mecanismo con ventanas de clase y ninguna prueba distingue el tipo THESIS. Test planned for implementation: EDGE-THESIS.
4. Given una ventana EXAM de una asignatura de Elena y una solicitud que no es EXAM_BOUND; When se evalúa; Then 200 DENY WINDOW_PROTECTED por R-LAB-02 (`prd.md` línea 334) (EV-LAB-02).
5. Given una solicitud EVALUATION a las 08:00 con 300 min y un laboratorio a las 09:00; When se evalúa; Then CONSTRAIN por R-BOUND-01 con must_checkpoint_by = valid_until = 08:55 (`prd.md` línea 431, FR-7 cláusula 1). Test planned for implementation: EDGE-STRADDLE-1.
6. Given un freeze que empieza a las 03:00 y un laboratorio a las 09:00, evaluado a la 01:00; When se evalúa; Then must_checkpoint_by = 02:55 con las cuatro fronteras en la traza (`prd.md` línea 431, FR-7 cláusula 3). Test planned for implementation: EDGE-STRADDLE-3.
7. Given 10 000 contextos generados; When se evalúan; Then must_checkpoint_by = valid_until en todos (`prd.md` línea 431, FR-7 cláusula 4). Test planned for implementation: PROP-DEADLINE-1.
8. Given una solicitud TRAINING a las 02:00 con 600 min y un laboratorio a las 09:00; When se evalúa; Then must_checkpoint_by = 05:55 por el fin de la ventana nocturna y la frontera de 08:55 queda superseded (`prd.md` línea 431, FR-7 cláusula 2). Test planned for implementation: EDGE-STRADDLE-2.
9. Given una ventana de laboratorio de CS-340-CV y una solicitud de CS-101-INTRO-ML a las 10:04; When se evalúa; Then no la niega R-LAB-01, porque la ventana es de la asignatura inscrita (`prd.md` línea 428, FR-4, comprobación de alcance). Test planned for implementation: EDGE-SCOPE-1.
10. Given una cuenta NIGHT_TRAINING_DAEMON y una solicitud TRAINING a las 14:30; When se evalúa; Then no la niega R-NIGHT-01 (`prd.md` línea 429, FR-5). Test planned for implementation: EDGE-DAEMON-1.
11. Given una solicitud INTERACTIVE_INFERENCE de 30 min a las 22:00 de campus y una clase que empieza a las 22:03 (la frontera menos la gracia de 5 min queda antes del instante de evaluación); When se evalúa; Then 200 ALLOW/ADMITTED con valid_until igual a evaluated_at y una constraint WINDOW_SCOPE que nombra la frontera; no se emite un CONSTRAIN con plazo vencido (`prd.md` líneas 393 y 514, NP-9; ruling DL-54, `ARCHITECTURE.md` §15.12) (DM-NP9).

Definition of Done (implementación futura): criterios 1, 2, 4 y 11 verificados con pruebas verdes y los criterios 3, 5 a 10 con EDGE-THESIS, EDGE-STRADDLE-1, EDGE-STRADDLE-3, PROP-DEADLINE-1, EDGE-STRADDLE-2, EDGE-SCOPE-1 y EDGE-DAEMON-1 cuando existan; EDGE-2158, EDGE-NIGHT, EDGE-1000, EDGE-FINAL, DM-BOUND, DM-START, DM-NP9, EV-LAB-02 pasan tras reemplazar stubs; se añaden casos de aceptación aún planeados en esta historia; SQL, DTO y eventos coinciden con contrato, cero escrituras ajenas; umbrales NFR aplicables medidos; revisión de pareja y decisiones pendientes de arquitectura resueltas y registradas. La historia no pasa a done con una prueba roja o un NFR solo planeado.

### Story 2.2: Elena recibe una negativa verificable ante fuentes caídas

Como Elena Vargas, quiero recibir una negativa con regla y causa cuando una fuente de datos falla o el hardware está caído u ocupado, para distinguir una falla del sistema de un rechazo de mi solicitud y saber cuándo reintentar.

- Traceability (Requirements): FR-10, NFR-9, NFR-13; evaluateRequest P6/P9, Q-fail; escenario S-7; EV-DEP, EV-CLOCK, EV-FLEET-01, EV-CONTEND-01; DEP-TOL-01 y DEP-SHAPE-01 planificadas.
- Binding invariants: M2-AD-3, M2-AD-4.
- Contracts: evaluateRequest P6/P9, Q-fail.
- Schema/DTO: DecisionDto, ErrorBodyDto; tablas decision, fact_snapshot, decision_outbox, en `detailed-design/schemas/dto.ts` y `001_m2_schema.sqlite.sql` / `.postgres.sql`.
- Files: `decision/shell/` (§2 row 4), `outbox/writer` (row 11), `ports/out/` identity to queue (rows 14–22), `ports/out/clock` (row 23), `adapters/sim/` (rows 30–38), `adapters/sim/fake_clock` (row 39), `test/atdd/m2_contracts.test.ts`.
- ATDD: criterios 1 y 2: EV-CLOCK, EV-DEP; criterio 3: EV-FLEET-01; criterio 4: EV-CONTEND-01; criterios 5 y 6: test planned for implementation (DEP-TOL-01 y DEP-SHAPE-01 en `test/atdd/m2_contracts.test.ts`). Toda referencia de prueba es ID ejecutable en `test/atdd/`; mediciones NF-* son planes, no tests ejecutados.
- Depends on: 1.1.
- Alcance: Fallo dedicado: cuota a 41ms, tolerancias por puerto, cancelación propagada; FreezeState caído es 503; no mezclar 404 con error de transporte.

Acceptance criteria:

1. Given puertos válidos con lectura Clock previa; When se adquieren hechos; Then 10 fuentes se consultan en paralelo con el instante original y máximo 40ms por puerto.
2. Given el puerto quota responde en 41 ms; When Elena envía POST /policy/decisions; Then recibe 200 con Decision DENY, cause DEPENDENCY_UNAVAILABLE, primary_rule_id R-DEP-01 y retry_after_ms=2000, sin mutación externa; si el puerto Clock no devuelve ningún instante, la respuesta es 503 DECISION_NOT_PRODUCED sin fila de outbox (ruling G-09 confirmado, DL-33; `contracts.md` líneas 41 y 147); una lectura de reloj dudosa (stratum >= 15) sí es DENY por R-DEP-01 (`prd.md` línea 320). El desacuerdo entre FR-16, FR-10 y la ley 2 de EXPERIENCE sobre "el motor no puede decidir" está registrado en `ARCHITECTURE.md` §15.4 y no se decide aquí.
3. Given todas las clases que satisfacen la solicitud con available_count <= 0 y failing_count >= 1; When Elena envía POST /policy/decisions; Then recibe 200 con Decision DENY, cause HARDWARE_FAILING, primary_rule_id R-FLEET-01, y R-CONTEND-01 queda NOT_EVALUATED (`prd.md` líneas 331 y 531, escenario S-7) (EV-FLEET-01).
4. Given todas las clases que satisfacen la solicitud con available_count <= 0 y failing_count = 0; When Elena envía POST /policy/decisions; Then recibe 200 con Decision CONSTRAIN QUEUE_ONLY por R-CONTEND-01 y admission QUEUED (`prd.md` línea 341) (EV-CONTEND-01).
5. Given el puerto Timetable caído con un snapshot de 5 minutos y el puerto Catalog caído con un snapshot de 12 h; When Elena envía POST /policy/decisions; Then la primera solicitud es DENY por R-DEP-01 y la segunda procede con Catalog en `stale_facts[]`, con NodeClassTable y Availability como dos puertos distintos (`prd.md` línea 434, FR-10). Test planned for implementation: DEP-TOL-01.
6. Given una respuesta 200 con cuerpo mal formado, un notFound y una lectura de reloj con stratum >= 15; When Elena envía POST /policy/decisions; Then la respuesta mal formada se trata como error de transporte, el notFound lo decide R-VALID-01 y el reloj dudoso produce DENY por R-DEP-01 (`prd.md` línea 434). Test planned for implementation: DEP-SHAPE-01.

Definition of Done (implementación futura): criterios 1 a 4 verificados con pruebas verdes y los criterios 5 y 6 con DEP-TOL-01 y DEP-SHAPE-01 cuando existan; EV-DEP, EV-CLOCK, EV-FLEET-01, EV-CONTEND-01 pasan tras reemplazar stubs; se añaden casos de aceptación aún planeados en esta historia; SQL, DTO y eventos coinciden con contrato, cero escrituras ajenas; umbrales NFR aplicables medidos; revisión de pareja y decisiones pendientes de arquitectura resueltas y registradas. La historia no pasa a done con una prueba roja o un NFR solo planeado.

### Story 2.3: Elena conserva saldo e identidad al pedir recursos

Como Elena Vargas, quiero que el sistema compare mi saldo, mi rol y mi inscripción sin guardar mis credenciales ni descontar cuota por su cuenta, para que mis datos y mi saldo no se expongan.

- Traceability (Requirements): FR-1, FR-5, FR-8, NFR-5, NFR-12; evaluateRequest P7, I6/I9/I10; EV-I2, EV-Q2, EV-PII, EV-AUTH-01, EV-AUTH-02, EV-SYS-01, EV-QBOUND-01; QUOTA-CONC-01 planificada.
- Binding invariants: M2-AD-5, M2-AD-8, M2-AD-9.
- Contracts: evaluateRequest P7, I6/I9/I10.
- Schema/DTO: DecisionDto, ConstraintDto; tablas decision, fact_snapshot, decision_constraint, en `detailed-design/schemas/dto.ts` y `001_m2_schema.sqlite.sql` / `.postgres.sql`.
- Files: `policy/core/` (§2 row 5), `decision/shell/` (row 4), `ports/out/identity` (row 14), `ports/out/quota` (row 21), `adapters/sim/identity` (row 30), `adapters/sim/quota` (row 37), `ports/out/repository` (row 27), `test/atdd/m2_contracts.test.ts`.
- ATDD: criterio 1: EV-Q2 (compartido con la historia 1.2); criterio 2: EV-I2, EV-PII; criterio 3: EV-AUTH-01; criterio 4: EV-AUTH-02; criterio 5: EV-SYS-01; criterio 6: EV-EX1 (compartido con las historias 1.2 y 4.3), EV-QBOUND-01; criterio 7: test planned for implementation (QUOTA-CONC-01 en `test/atdd/m2_contracts.test.ts`). Toda referencia de prueba es ID ejecutable en `test/atdd/`; mediciones NF-* son planes, no tests ejecutados.
- Depends on: 1.2.
- Alcance: M2 compara enteros, no reserva ni descuenta saldo; commit lo decide M8; no usar credenciales ni nombres en snapshot.

Acceptance criteria:

1. Given saldo 5 y necesidad 10; When solicita recursos; Then CONSTRAIN QUOTA_CAP=5, PROVISIONAL y sin cliente mutador de M8.
2. Given Elena con sesión actor-elena; When envía POST /policy/decisions con actor_ref actor-other; Then recibe 200 con Decision DENY, cause INVALID_REQUEST, primary_rule_id R-VALID-01, journalled; cero efectos externos. La causa es INVALID_REQUEST porque lo fijan el ruling K1 (`ARCHITECTURE.md` §14) y `contracts.md` §3.2 ("actor_ref ≠ session actor"); la fila de R-VALID-01 del PRD (`prd.md` línea 319) usa ACTOR_UNKNOWN para un actor que no resuelve, que es otro caso.
3. Given Elena sin inscripción en la asignatura de la solicitud; When envía POST /policy/decisions; Then recibe 200 con Decision DENY NOT_AUTHORIZED por R-AUTH-01 (`prd.md` línea 333) (EV-AUTH-01).
4. Given un modelo que exige el rol INSTRUCTOR y Elena con rol STUDENT; When envía POST /policy/decisions; Then recibe 200 con Decision DENY NOT_AUTHORIZED por R-AUTH-02 (`prd.md` línea 332) (EV-AUTH-02).
5. Given una cuenta de sistema NIGHT_TRAINING_DAEMON y una solicitud BACKGROUND_BATCH, fuera de los tipos permitidos TRAINING y EVALUATION; When se evalúa; Then 200 DENY NOT_AUTHORIZED por R-SYS-01 (`prd.md` líneas 336 y 530, escenario S-6) (EV-SYS-01).
6. Given un saldo de 0; When Elena envía POST /policy/decisions; Then recibe 200 con Decision DENY QUOTA_EXHAUSTED por R-QUOTA-01 (`prd.md` línea 432, FR-8) (EV-EX1); y si además una frontera cae dentro de la duración pedida, sigue siendo DENY y no un CONSTRAIN HARD_DEADLINE (ruling DL-50, `ARCHITECTURE.md` §15.11) (EV-QBOUND-01).
7. Given 100 solicitudes concurrentes contra un saldo R; When se simulan los commits del puerto de cuota; Then los commits exitosos no superan R dividido la necesidad por solicitud (`prd.md` línea 432, FR-8). Test planned for implementation: QUOTA-CONC-01 (M2 no tiene cliente de M8; la prueba usa un M8 simulado).

Definition of Done (implementación futura): criterios 1 a 6 verificados con pruebas verdes y el criterio 7 con QUOTA-CONC-01 cuando exista; EV-AUTH-01, EV-AUTH-02, EV-SYS-01, EV-QBOUND-01, EV-I2, EV-Q2, EV-PII pasan tras reemplazar stubs; se añaden casos de aceptación aún planeados en esta historia; SQL, DTO y eventos coinciden con contrato, cero escrituras ajenas; umbrales NFR aplicables medidos; revisión de pareja y decisiones pendientes de arquitectura resueltas y registradas. La historia no pasa a done con una prueba roja o un NFR solo planeado.

## Epic 3: Rebecca previsualiza y confirma una congelación

### Story 3.1: Rebecca anticipa las consecuencias de una congelación

Como Dr. Rebecca Reed, quiero crear un borrador y ver cuántas solicitudes negaría una congelación antes de activarla, para decidir con evidencia en menos de un minuto.

- Traceability (Requirements): FR-2, FR-14, NFR-6; previewFreeze P1-P6, Q1-Q4, I4; PV-Q1, PV-Q2, PV-UNAVAILABLE; FD-Q1 planificada.
- Binding invariants: M2-AD-5, M2-AD-9.
- Contracts: previewFreeze P1-P6, Q1-Q4, I4.
- Schema/DTO: PreviewFreezeRequestDto, PreviewFreezeResponseDto; tablas freeze_draft, preview_run, audit_events, en `detailed-design/schemas/dto.ts` y `001_m2_schema.sqlite.sql` / `.postgres.sql`.
- Files: `api/routes/` (§2 row 1), `ports/in/` (row 3), `policy/freeze/` (row 10), `outbox/writer` (row 11, para el criterio 3), `ports/out/timetable` (row 17), `ports/out/reservation` (row 18), `ports/out/repository` (row 27), `adapters/sim/timetable` (row 33), `adapters/sim/reservation` (row 34), `test/atdd/m2_contracts.test.ts`.
- ATDD: criterio 1: PV-Q1, PV-Q2; criterio 2: PV-UNAVAILABLE; criterio 3: test planned for implementation (FD-Q1 en `test/atdd/m2_contracts.test.ts`). Toda referencia de prueba es ID ejecutable en `test/atdd/`; mediciones NF-* son planes, no tests ejecutados.
- Depends on: 1.1.
- Alcance: Preview con denied_count/survivors/next_protected_window y runtime_snapshot; no activa, no publica y no altera decisiones; expiración de 60s.

Acceptance criteria:

1. Given draft válido y alcance LAB_OPERATOR de Rebecca; When pide preview; Then preview_run y audit únicamente; token actor-bound y card muestra consecuencias.
2. Given el puerto timetable falla y el preview no puede calcularse; When Rebecca envía POST /policy/freezes/preview; Then recibe 503 PREVIEW_UNAVAILABLE, sin token ni fila preview_run, y la activación queda bloqueada (PV-UNAVAILABLE).
3. Given una ventana válida; When Rebecca envía POST /policy/freezes; Then se crea una fila freeze_draft con expires_at = created_at + 24 h, una fila de outbox policy.freeze.drafted.v1 y una fila de audit FREEZE_DRAFT_CREATED en la misma transacción; un instante imposible da 400 WIRE_SHAPE_INVALID y una ventana vencida 400 WINDOW_IN_PAST (`contracts.md` notas tras §2, línea 125; catálogo §3.1). Test planned for implementation: FD-Q1.

Definition of Done (implementación futura): criterios 1 y 2 verificados con pruebas verdes y el criterio 3 con FD-Q1 cuando exista; PV-Q1, PV-Q2, PV-UNAVAILABLE pasan tras reemplazar stubs; se añaden casos de aceptación aún planeados en esta historia; SQL, DTO y eventos coinciden con contrato, cero escrituras ajenas; umbrales NFR aplicables medidos; revisión de pareja y decisiones pendientes de arquitectura resueltas y registradas. La historia no pasa a done con una prueba roja o un NFR solo planeado.

### Story 3.2: Rebecca detecta borradores vencidos y accesos inválidos

Como Dr. Rebecca Reed, quiero que el preview rechace borradores vencidos y cuentas sin permiso, y poder leer las congelaciones existentes, para no activar una congelación con datos viejos ni desde una cuenta no autorizada.

- Traceability (Requirements): FR-2, FR-14, NFR-5; previewFreeze P3/P4/P5, I1/I2/I3; PV-P1, PV-P2, PV-I1, PV-I2; FZ-READ-1 y FZ-READ-2 planificadas.
- Binding invariants: M2-AD-9.
- Contracts: previewFreeze P3/P4/P5, I1/I2/I3.
- Schema/DTO: PreviewFreezeResponseDto, ErrorBodyDto; tablas freeze_draft, preview_run, en `detailed-design/schemas/dto.ts` y `001_m2_schema.sqlite.sql` / `.postgres.sql`.
- Files: `ports/in/` (§2 row 3), `policy/freeze/` (row 10), `ports/out/repository` (row 27), `ports/out/token_signer` (row 26, proposed in §2), `adapters/sim/token_signer` (row 42, proposed in §2), `test/atdd/m2_contracts.test.ts`.
- ATDD: criterio 1: PV-I1; criterio 2: PV-I2; PV-P1 y PV-P2 cubren rol insuficiente y borrador inexistente; criterio 3: test planned for implementation (FZ-READ-1 y FZ-READ-2 en `test/atdd/m2_contracts.test.ts`). Toda referencia de prueba es ID ejecutable en `test/atdd/`; mediciones NF-* son planes, no tests ejecutados.
- Depends on: 3.1.
- Alcance: Fallo dedicado: draft inexistente/vencido o rol insuficiente; dos previews separados generan dos tokens; no suponer invalidación del anterior.

Acceptance criteria:

1. Given dos previews simultáneos del mismo draft; When se completan; Then dos tokens distintos y dos filas, cero freezes.
2. Given un draft con expires_at T y el reloj de campus igual a T; When Rebecca envía POST /policy/freezes/preview; Then recibe 409 DRAFT_EXPIRED sin preview, audit ni efectos nuevos.
3. Given una congelación activa y una levantada; When Rebecca envía GET /policy/freezes y GET /policy/freezes/{id}; Then recibe la lista con su estado calculado y el detalle de la congelación, y un id desconocido da 404 FREEZE_NOT_FOUND (`ARCHITECTURE.md` §5.1; contracts.md §3.1). Test planned for implementation: FZ-READ-1 (lista) y FZ-READ-2 (detalle y 404).

Definition of Done (implementación futura): criterios 1 y 2 verificados con pruebas verdes y el criterio 3 con FZ-READ-1 y FZ-READ-2 cuando existan; PV-P1, PV-P2, PV-I1, PV-I2 pasan tras reemplazar stubs; se añaden casos de aceptación aún planeados en esta historia; SQL, DTO y eventos coinciden con contrato, cero escrituras ajenas; umbrales NFR aplicables medidos; revisión de pareja y decisiones pendientes de arquitectura resueltas y registradas. La historia no pasa a done con una prueba roja o un NFR solo planeado.

### Story 3.3: Rebecca activa una congelación solo con una confirmación vigente

Como Dr. Rebecca Reed, quiero activar la congelación solo con un motivo escrito y una confirmación vigente de mi cuenta, para que nadie active una congelación sin haber visto sus consecuencias.

- Traceability (Requirements): FR-2, FR-12, FR-14, NFR-7; activateFreeze P3/P6/P8/P10, Q1, Q4, I2, I4; AC-Q1, AC-Q2, AC-P1, AC-P2, AC-I2, AC-ROLE, AC-TOKEN-FORGED, AC-NO-PREVIEW-ROW, AC-TOKEN-ACTOR.
- Binding invariants: M2-AD-5, M2-AD-7, M2-AD-9.
- Contracts: activateFreeze P3/P6/P8/P10, Q1, Q4, I2, I4.
- Schema/DTO: ActivateFreezeRequestDto, ActivateFreezeResponseDto, ErrorBodyDto; tablas freeze, preview_run, audit_events, en `detailed-design/schemas/dto.ts` y `001_m2_schema.sqlite.sql` / `.postgres.sql`.
- Files: `api/routes/` (§2 row 1), `ports/in/` (row 3), `policy/freeze/` (row 10), `ports/out/token_signer` (row 26, proposed in §2), `ports/out/repository` (row 27), `adapters/db/sqlite/` (row 29), `adapters/sim/token_signer` (row 42, proposed in §2), `test/atdd/m2_contracts.test.ts`.
- ATDD: criterio 1: AC-Q1, AC-Q2; criterio 2: AC-P2, AC-TOKEN-FORGED, AC-NO-PREVIEW-ROW, AC-TOKEN-ACTOR, AC-I2; criterio 3: AC-P1, AC-ROLE. Toda referencia de prueba es ID ejecutable en `test/atdd/`; mediciones NF-* son planes, no tests ejecutados.
- Depends on: 3.1, 3.2.
- Alcance: Activar solo con motivo y preview confirmados: token válido a 60s, vencido a 60001ms, ligado a su actor y firmado, rol leído de nuevo. La consistencia bajo concurrencia, el rollback y el efecto sobre las decisiones pasaron a la historia 3.5.

Acceptance criteria:

1. Given un preview vigente de Rebecca (actor-reed) y un motivo escrito; When Rebecca envía POST /policy/freezes/{id}/activate con el token a los 60 s exactos; Then recibe 201 con freeze_id y policy_version, el token queda consumido y la fila freeze queda ACTIVE (AC-Q1, AC-Q2).
2. Given un token sin preview, con firma falsificada, sin fila de preview, de otro actor o vencido a los 60001 ms; When Rebecca envía POST /policy/freezes/{id}/activate; Then recibe 409 TOKEN_ABSENT (sin token, firma falsificada o sin fila), 409 TOKEN_ACTOR_MISMATCH (token de otro actor) o 409 PREVIEW_EXPIRED (vencido), sin ninguna escritura (AC-P2, AC-TOKEN-FORGED, AC-NO-PREVIEW-ROW, AC-TOKEN-ACTOR, AC-I2).
3. Given un motivo vacío o un rol revocado entre el preview y la activación; When Rebecca envía POST /policy/freezes/{id}/activate; Then recibe 400 MISSING_REASON o 403 ROLE_INSUFFICIENT, sin ninguna escritura (AC-P1, AC-ROLE).

Definition of Done (implementación futura): criterios 1 a 3 verificados con pruebas verdes; AC-Q1, AC-Q2, AC-P1, AC-P2, AC-I2, AC-ROLE, AC-TOKEN-FORGED, AC-NO-PREVIEW-ROW, AC-TOKEN-ACTOR pasan tras reemplazar stubs; se añaden casos de aceptación aún planeados en esta historia; SQL, DTO y eventos coinciden con contrato, cero escrituras ajenas; umbrales NFR aplicables medidos (NFR-7 en la historia 4.2); revisión de pareja hecha y las decisiones de arquitectura de esta historia registradas en `ARCHITECTURE.md` §15.2 (G-04) y `ports-and-adapters.md` §2 fila 26 (firmador de tokens, ruta propuesta). La historia no pasa a done con una prueba roja o un NFR solo planeado.

### Story 3.4: Rebecca levanta una congelación con un motivo escrito

Como Dr. Rebecca Reed, quiero levantar una congelación con un motivo escrito, para devolver el acceso a los estudiantes en cuanto termina el examen y dejar registro de quién lo hizo.

- Traceability (Requirements): FR-2, FR-14; liftFreeze (resultados de lift en `contracts.md` línea 126; no hay contrato P/Q/I completo); LF-Q1, LF-P1, LF-P2, LF-P3; LF-P4 planificada.
- Binding invariants: M2-AD-5, M2-AD-9.
- Contracts: liftFreeze (resultados en `contracts.md` notas tras §2, línea 126); catálogo §3.1 MISSING_REASON, FREEZE_NOT_LIFTABLE, FREEZE_NOT_FOUND, ROLE_INSUFFICIENT.
- Schema/DTO: LiftFreezeRequestDto, LiftFreezeResponseDto, ErrorBodyDto; tablas freeze, decision_outbox, audit_events, en `detailed-design/schemas/dto.ts` y `001_m2_schema.sqlite.sql` / `.postgres.sql`.
- Files: `api/routes/` (§2 row 1), `ports/in/` (row 3), `policy/freeze/` (row 10), `outbox/writer` (row 11), `ports/out/repository` (row 27), `adapters/db/sqlite/` (row 29), `ports/out/unit_of_work` (row 43, path proposed in §2), `adapters/sim/unit_of_work` (row 44, path proposed in §2), `test/atdd/m2_contracts.test.ts`.
- ATDD: criterio 1: LF-Q1; criterio 2: LF-P1, LF-P2, LF-P3; criterio 3: test planned for implementation (LF-P4 en `test/atdd/m2_contracts.test.ts`). Toda referencia de prueba es ID ejecutable en `test/atdd/`; mediciones NF-* son planes, no tests ejecutados.
- Depends on: 3.3.
- Alcance: Levantar una congelación ACTIVE (`prd.md` líneas 473–476: el levantamiento exige lift_reason y el id de quien activó); no hay contrato P/Q/I completo del lift, solo los resultados de `contracts.md` línea 126. El PRD pide levantar en menos de 60 s (línea 57) y no fija cómo se mide: no verificado.

Acceptance criteria:

1. Given una congelación ACTIVE; When Rebecca envía POST /policy/freezes/{id}/lift con lift_reason; Then recibe 200 y la fila queda LIFTED con su motivo, con una fila de outbox policy.freeze.lifted.v1 y una fila de audit FREEZE_LIFTED en la misma transacción (LF-Q1).
2. Given un lift_reason vacío, una congelación que no está ACTIVE o un llamante por debajo de INSTRUCTOR; When Rebecca (o un estudiante) envía POST /policy/freezes/{id}/lift; Then recibe 400 MISSING_REASON, 409 FREEZE_NOT_LIFTABLE o 403 ROLE_INSUFFICIENT respectivamente, sin ninguna escritura (LF-P1, LF-P2, LF-P3).
3. Given un id de congelación desconocido; When Rebecca envía POST /policy/freezes/{id}/lift; Then recibe 404 FREEZE_NOT_FOUND (contracts.md §3.1). Test planned for implementation: LF-P4.

Definition of Done (implementación futura): criterios 1 y 2 verificados con pruebas verdes y el criterio 3 con LF-P4 cuando exista; LF-Q1, LF-P1, LF-P2, LF-P3 pasan tras reemplazar stubs; se añaden casos de aceptación aún planeados en esta historia; SQL, DTO y eventos coinciden con contrato, cero escrituras ajenas; sin umbrales NFR propios; revisión de pareja y decisiones pendientes de arquitectura resueltas y registradas (el contrato completo P/Q/I del lift sigue pendiente: decisión DL-45). La historia no pasa a done con una prueba roja o un NFR solo planeado.

### Story 3.5: Rebecca conserva una sola congelación consistente ante concurrencia y fallos

Como Dr. Rebecca Reed, quiero que quede una sola congelación activa aunque varias personas confirmen a la vez o falle el proceso, y que las decisiones siguientes la respeten, para que el estado de la congelación sea el mismo para todos.

- Traceability (Requirements): FR-2, FR-14; activateFreeze P11, Q2, Q-fail, I1, I3, I5; evaluateRequest R-FRZ-01 y R-FRZ-02 (`prd.md` líneas 326 y 327); NP-2 en parte (la evaluación siguiente a la activación es DENY por R-FRZ-01, criterio 3; la traza con el valid_until anterior al freeze no tiene criterio); AC-I1, AC-ROLLBACK, EV-FRZ-01, EV-FRZ-02, EV-FRZ-03.
- Binding invariants: M2-AD-5, M2-AD-9.
- Contracts: activateFreeze P11, Q2, Q-fail, I1, I3, I5; evaluateRequest sobre las reglas R-FRZ-01 y R-FRZ-02.
- Schema/DTO: ActivateFreezeResponseDto, DecisionDto, ErrorBodyDto; tablas freeze, preview_run, decision_outbox, audit_events, en `detailed-design/schemas/dto.ts` y `001_m2_schema.sqlite.sql` / `.postgres.sql`.
- Files: `api/routes/` (§2 row 1), `ports/in/` (row 3), `decision/shell/` (row 4), `policy/core/` (row 5), `policy/freeze/` (row 10), `outbox/writer` (row 11), `ports/out/repository` (row 27), `adapters/db/sqlite/` (row 29), `ports/out/unit_of_work` (row 43, path proposed in §2), `adapters/sim/unit_of_work` (row 44, path proposed in §2), `test/atdd/m2_contracts.test.ts`.
- ATDD: criterio 1: AC-I1; criterio 2: AC-ROLLBACK; criterio 3: EV-FRZ-01, EV-FRZ-02; criterio 4: EV-FRZ-03. Toda referencia de prueba es ID ejecutable en `test/atdd/`; mediciones NF-* son planes, no tests ejecutados.
- Depends on: 3.3.
- Alcance: Parte de la antigua 3.3 (decisión DL-46): transacción freeze/token/outbox/audit, unicidad normalizada por alcance, y efecto de la congelación en las decisiones siguientes. Corte propuesto por criterios: la 3.3 trata la autorización de la activación (token, actor, motivo, rol); la 3.5 trata la consistencia bajo concurrencia y fallo y el efecto en las decisiones, que no dependen del token sino de la transacción y de las reglas R-FRZ.

Acceptance criteria:

1. Given ocho activaciones concurrentes del alcance con token vigente; When Rebecca confirma; Then una 201 y siete 409; un freeze ACTIVE, token consumido y outbox/audit consistentes (AC-I1).
2. Given el proceso falla después del insert de la fila freeze y antes del commit; When Rebecca envía POST /policy/freezes/{id}/activate con un token vigente; Then rollback total (error interno de prueba TRANSACTION_ABORTED, que no es un código HTTP), token no consumido, sin evento ni cierre parcial (AC-ROLLBACK).
3. Given un freeze ACTIVE de alcance ALL entre las 08:00 y las 20:00 de campus; When Elena envía POST /policy/decisions dentro de la ventana, una vez sin exam_binding y otra con un exam_binding validado incluido en allowances del freeze; Then la primera recibe 200 DENY FREEZE_ACTIVE por R-FRZ-01 (EV-FRZ-01) y la segunda 200 CONSTRAIN WINDOW_SCOPE por R-FRZ-02 con admission ADMITTED (EV-FRZ-02).
4. Given un freeze ACTIVE de alcance ALL, un exam_binding validado dentro de allowances y un modelo que el actor no puede usar (R-TIER-02) o un rol por debajo del que exige el modelo (R-AUTH-02); When se evalúa la solicitud; Then recibe 200 DENY por esa regla y no un CONSTRAIN WINDOW_SCOPE por R-FRZ-02, con R-FRZ-02 NOT_EVALUATED y listada en suppressed[] (`prd.md` línea 426, FR-2; ruling DL-50, `ARCHITECTURE.md` §15.11) (EV-FRZ-03). Las otras cuatro reglas de FR-2 siguen la misma regla de dominio y no tienen prueba propia (R-AUTH-01 se omite porque R-VALID-01 ya valida la entitlement del exam_binding, `prd.md` línea 362).

Definition of Done (implementación futura): criterios 1 a 4 verificados con pruebas verdes; AC-I1, AC-ROLLBACK, EV-FRZ-01, EV-FRZ-02, EV-FRZ-03 pasan tras reemplazar stubs; se añaden casos de aceptación aún planeados en esta historia; SQL, DTO y eventos coinciden con contrato, cero escrituras ajenas; umbrales NFR aplicables medidos; revisión de pareja hecha y las decisiones de arquitectura de esta historia registradas en `ARCHITECTURE.md` §15.3 (puerto `UnitOfWork`) y `ports-and-adapters.md` §2 filas 43 y 44. La historia no pasa a done con una prueba roja o un NFR solo planeado.

## Epic 4: Elena y Rebecca pueden auditar y operar con evidencia

### Story 4.1: Rebecca publica sin alterar decisiones iniciadas

Como Dr. Rebecca Reed, quiero publicar una nueva versión de la política sin alterar las decisiones ya iniciadas, para corregir una regla sin invalidar lo que ya se decidió.

- Traceability (Requirements): FR-11, FR-12; evaluateRequest I8, Q2/Q3; publishVersion Q1-Q4, I1-I3; EV-VERSION, PB-Q1, PB-I1; RV-Q1 y RV-P1 planificadas.
- Binding invariants: M2-AD-7, M2-AD-8.
- Contracts: evaluateRequest I8, Q2/Q3; publishVersion P1, Q1-Q4, I1-I3 (route 14, contracts.md §2).
- Schema/DTO: DecisionDto, VersionManifestDto, PublishVersionResponseDto; tablas policy_version, decision, decision_outbox, en `detailed-design/schemas/dto.ts` y `001_m2_schema.sqlite.sql` / `.postgres.sql`.
- Files: `registry/publisher` (§2 row 7, proposed in §2), `policy/registry/` (row 6), `outbox/writer` (row 11), `outbox/publisher` (row 12), `ports/out/event_bus` (row 25, proposed in §2), `ports/out/repository` (row 27), `adapters/sim/event_bus` (row 41, proposed in §2), `test/atdd/m2_contracts.test.ts`.
- ATDD: criterio 1: EV-VERSION; criterio 2: PB-Q1; criterio 3: PB-I1; criterio 4: test planned for implementation (RV-Q1 y RV-P1 en `test/atdd/m2_contracts.test.ts`). Toda referencia de prueba es ID ejecutable en `test/atdd/`; mediciones NF-* son planes, no tests ejecutados.
- Depends on: 1.3.
- Alcance: Manifest inmutable, published_seq fijado por evaluación, publicación asíncrona at-least-once y consumidor idempotente; define límites de outbox y recuperación.

Acceptance criteria:

1. Given la versión 1 fijada para una evaluación y la versión 2 publicada durante el fetch; When termina la evaluación de Elena (POST /policy/decisions); Then la Decision queda en la versión 1 (EV-VERSION).
2. Given la versión 1 vigente; When Rebecca envía POST /policy/versions/publish; Then se crea una fila policy_version con published_seq=2, content_hash sha256 e immutable=1, y una fila de outbox policy.version.published.v1 con published_seq=2 (PB-Q1).
3. Given el bus de eventos caído; When Rebecca envía POST /policy/versions/publish; Then la publicación se confirma, la fila de outbox permanece, no se publica ningún evento y la entrega se reintenta sin duplicación lógica; no se promete almacenamiento ilimitado (PB-I1). Los tiempos de NFR-7 (publicación) y NFR-8 (consulta del journal) son plan de medición en la historia 4.2.
4. Given la versión 1 vigente y la versión 2 publicada; When Rebecca envía GET /policy/rules, GET /policy/versions y GET /policy/versions/{v}; Then recibe el catálogo de 19 reglas, el historial con published_seq y la versión congelada, y una versión desconocida da 404 VERSION_NOT_FOUND (`ARCHITECTURE.md` §5.1; contracts.md §3.1). Test planned for implementation: RV-Q1 (lecturas) y RV-P1 (404).

Definition of Done (implementación futura): criterios 1 a 3 verificados con pruebas verdes y el criterio 4 con RV-Q1 y RV-P1 cuando existan; EV-VERSION, PB-Q1, PB-I1 pasan tras reemplazar stubs; se añaden casos de aceptación aún planeados en esta historia; SQL, DTO y eventos coinciden con contrato, cero escrituras ajenas; esta historia no tiene umbrales NFR propios (los de NFR-7 y NFR-8 se miden en la historia 4.2); revisión de pareja hecha y las decisiones de arquitectura de esta historia registradas en `contracts.md` §2 `publishVersion` y §6 punto 12, `ARCHITECTURE.md` §15.9 y la decisión DL-41 (la consulta del journal se delega al Audit Ledger, PRD NG-10). La historia no pasa a done con una prueba roja o un NFR solo planeado.

### Story 4.2: Elena obtiene explicaciones sin exponer secretos

Como Elena Vargas, quiero que la misma solicitud con los mismos hechos produzca siempre la misma decisión y sin secretos, para poder reproducir y confiar en una negativa.

- Traceability (Requirements): FR-9, FR-13, NFR-1, NFR-2, NFR-3, NFR-5, NFR-6, NFR-7, NFR-8, NFR-9, NFR-10, NFR-12, NFR-13; evaluateRequest I1/I5/I7/I9, Time, concurrency, Q4; publishVersion Q4; EV-EX1, EV-PII, DM-AD1, DM-AD6, EV-DEP; DM-REPLAY-1, EV-PII-2, DM-PREC-1 y DEP-FAILMODE-1 planificadas; plan de medición NFR-1, NFR-7, NFR-8, NFR-9, NFR-10 (no es un test ejecutable; antes historia 4.4, decisión DL-56).
- Binding invariants: M2-AD-1, M2-AD-2, M2-AD-4, M2-AD-6, M2-AD-8.
- Contracts: evaluateRequest I1/I5/I7/I9, Time, concurrency, Q4; publishVersion Q4.
- Schema/DTO: DecisionDto, ExplanationDto; tablas fact_snapshot, trace_entry, decision_citation, en `detailed-design/schemas/dto.ts` y `001_m2_schema.sqlite.sql` / `.postgres.sql`.
- Files: `policy/renderer/` (§2 row 9), `policy/core/` (row 5), `decision/shell/` (row 4), `ports/out/repository` (row 27), `test/atdd/m2_contracts.test.ts`, `test/atdd/m2_domain.test.ts`; planes de medición `test/evidence/nfr/performance-domain.json` y los demás nombrados en `test/nfr-evidence.md` (rutas previstas, aún no existen); not verified (no path in ports-and-adapters.md §2 for the measurement scripts).
- ATDD: criterio 1: DM-AD1, DM-AD6; criterio 2: EV-PII; criterio 3: test planned for implementation (DM-REPLAY-1 en `test/atdd/m2_domain.test.ts`); criterio 4: test planned for implementation (EV-PII-2 en `test/atdd/m2_contracts.test.ts`); criterio 5: test planned for implementation (DM-PREC-1 en `test/atdd/m2_domain.test.ts`); criterio 6: test planned for implementation (DEP-FAILMODE-1 en `test/atdd/m2_contracts.test.ts`); EV-EX1 y EV-DEP apoyan los criterios 1 y 6; criterios 7 a 9: ninguno ejecutable ahora, plan de medición en `test/nfr-evidence.md` (estado PLANNED; no hay ID de test en `test/atdd/` para ellos). Toda referencia de prueba es ID ejecutable en `test/atdd/`; mediciones NF-* son planes, no tests ejecutados.
- Depends on: 1.2, 2.2, 4.1.
- Alcance: Reproducibilidad y evidencia de la decisión: misma entrada, misma salida byte a byte; explicación citada sin secretos; fallo de puerto como DENY con regla. Medición de rendimiento y de tiempos (antes historia 4.4, decisión DL-56): NFR-1 (evaluate p99<=5ms, p50<=1ms a 100 concurrentes), NFR-9 (fan-out de 10 puertos p99<=45ms), NFR-10 (render p99<=2ms), NFR-7 (publicación <=5s) y NFR-8 (consulta del journal <=30s, vía Audit Ledger); sin rebajar umbrales; registrar equipo, carga y semilla; no confundir observaciones del stub con medidas.

Acceptance criteria:

1. Given la misma petición, los mismos hechos y la misma versión de política; When se evalúan dos veces; Then las dos Decision son idénticas byte a byte y cada una cita su regla (DM-AD1, DM-AD6).
2. Given Elena envía POST /policy/decisions con hechos contaminados (nombre, correo y token Bearer en el hecho identity); When la decisión se renderiza y persiste; Then ni la Decision, ni el snapshot, ni los eventos contienen esos textos (EV-PII).
3. Given 10 000 repeticiones de la misma entrada (petición, hechos y versión de política) con colecciones en distinto orden de llegada; When se evalúan; Then las 10 000 salidas son idénticas byte a byte y las colecciones salen en el orden canónico de `prd.md` §6.5 (`prd.md` línea 452, NFR-3). Test planned for implementation: DM-REPLAY-1.
4. Given 10 000 decisiones generadas con fixtures contaminadas (nombre completo, correo, token Bearer); When se renderizan y persisten; Then ningún rastro, rationale, fila de journal ni línea de log contiene esos textos (`prd.md` línea 454, NFR-5). Test planned for implementation: EV-PII-2.
5. Given la matriz de solicitudes de prueba de FR; When se mide cuántas reglas coinciden por solicitud; Then al menos el 90 % resuelve con exactamente una regla y ninguna restricción es innecesaria (`prd.md` línea 461, NFR-12). Test planned for implementation: DM-PREC-1.
6. Given el registro de puertos y la tabla de FR-10; When se compara; Then el 100 % de los puertos está en la tabla y el modo de fallo de cada regla se deriva de sus entradas (`prd.md` línea 462, NFR-13). Test planned for implementation: DEP-FAILMODE-1.
7. Given 10 000 solicitudes sintéticas con 100 concurrentes sobre la implementación; When se ejecuta el script de medición de cada NFR; Then se guarda una medición con equipo, carga y semilla y los percentiles cumplen los umbrales de NFR-1, NFR-9 y NFR-10 (plan de medición, no test ejecutable ahora).
8. Given una medición supera su umbral; When se ejecuta el gate de implementación; Then el gate falla y la publicación queda bloqueada hasta corregir (plan de medición, no test ejecutable ahora).
9. Given los cinco archivos de medición del plan (NFR-1, NFR-7, NFR-8, NFR-9 y NFR-10); When se decide el cierre de la historia; Then se cierra solo si los cinco archivos existen con equipo, carga y semilla registrados y todos los umbrales se cumplen; si uno no se cumple, la historia sigue abierta y el módulo no se declara listo para publicar (criterio de salida del antiguo habilitador 4.4; plan de medición, no test ejecutable ahora).

Nota de voz (gate run 3, MIN-1): los criterios 3 a 6 son propiedades del sistema; Elena las vive como "una decisión que me niegan se puede reproducir y no filtra mis datos", y por eso están en esta historia. Los criterios 7 a 9 (decisión DL-56) son planes de medición del equipo, sin test ejecutable; Elena los vive como "la decisión llega a tiempo".

Definition of Done (implementación futura): criterios 1 y 2 verificados con pruebas verdes, los criterios 3 a 6 con DM-REPLAY-1, EV-PII-2, DM-PREC-1 y DEP-FAILMODE-1 cuando existan y los criterios 7 a 9 con las mediciones guardadas en `test/evidence/nfr/` (ningún umbral rebajado); EV-EX1, EV-PII, DM-AD1, DM-AD6, EV-DEP pasan tras reemplazar stubs; se añaden casos de aceptación aún planeados en esta historia; SQL, DTO y eventos coinciden con contrato, cero escrituras ajenas; umbrales NFR de rendimiento y de tiempos aplicables medidos (criterios 7 a 9); revisión de pareja y decisiones pendientes de arquitectura resueltas y registradas. La historia no pasa a done con una prueba roja, con un NFR solo planeado ni con una medición ausente.

### Story 4.3: Elena y Rebecca distinguen éxito negativa y fallo de interfaz

Como Elena Vargas y Dr. Rebecca Reed, quiero distinguir una negativa de una falla de la interfaz, para no confundir un rechazo con un error del sistema.

- Traceability (Requirements): FR-14, FR-15, FR-16, NFR-11; evaluateRequest Q1/Q4; previewFreeze Q-fail; activateFreeze Q-fail; EV-EX1, PV-P1, AC-P2, PV-UNAVAILABLE; DOC-LINT (control de `test/ci/readiness.mjs`) y COPY-01 planificada.
- Binding invariants: M2-AD-6, M2-AD-9.
- Contracts: evaluateRequest Q1/Q4; previewFreeze Q-fail; activateFreeze Q-fail.
- Schema/DTO: DecisionDto, FreezeListResponseDto, ErrorBodyDto; tablas decision, freeze, preview_run, en `detailed-design/schemas/dto.ts` y `001_m2_schema.sqlite.sql` / `.postgres.sql`.
- Files: `api/routes/` (§2 row 1), `api/cli/` (row 2), `ports/in/` (row 3), `test/atdd/m2_contracts.test.ts`; not verified (no path in ports-and-adapters.md §2 for the Loading/Empty/Error/Success/Denied interface states).
- ATDD: criterio 1: EV-EX1; criterio 2: PV-UNAVAILABLE, AC-P2; criterio 3: DOC-LINT (script de `test/ci/readiness.mjs`, no es un test de `test/atdd/`); criterio 4: test planned for implementation (COPY-01 en `test/ux/copy-table.test.ts`, ruta propuesta, no existe). Toda referencia de prueba es ID ejecutable en `test/atdd/`; mediciones NF-* son planes, no tests ejecutados.
- Depends on: 1.1, 3.3, 4.1.
- Alcance: UX por API pública; Loading/Empty/Error/Success/Denied mapeados; lint FR-15 con deuda explícita; integrar cambios UX solo tras triage de Juan.

Acceptance criteria:

1. Given Elena recibe una Decision DENY de la regla R-QUOTA-01; When consulta la decisión por la API; Then la Decision trae primary_rule_id, cause QUOTA_EXHAUSTED, citas, un rationale cuya primera frase contiene la causa y al menos una next_action (EV-EX1). El copy de la card sin texto prohibido por FR-16, la lista vacía y el estado Loading son criterios de interfaz sin test ejecutable en esta fase (no hay código de interfaz) y quedan como plan. Una falla del reloj sin instante no es una card DENY: es el 503 DECISION_NOT_PRODUCED del ruling G-09 (`contracts.md` líneas 41 y 147); el desacuerdo con FR-16 y la ley 2 de EXPERIENCE está en `ARCHITECTURE.md` §15.4.
2. Given el preview devolvió 503 PREVIEW_UNAVAILABLE y no existe token (PV-UNAVAILABLE); When Rebecca envía POST /policy/freezes/{id}/activate con preview_token vacío; Then recibe 409 TOKEN_ABSENT, sin nueva fila freeze (AC-P2). Rutas sin contrato: ver `ARCHITECTURE.md` §15.5 antes de afirmar cobertura UX.
3. Given un cambio en `planning/`, `reviews/` o `ai-log/`; When corre el lint de documentos; Then falla ante cualquier término prohibido de FR-15 nuevo respecto de la línea base (`prd.md` línea 439; `test/ci/readiness.mjs`).
4. Given la tabla de copy de las cards renderizadas; When se busca texto prohibido; Then 0 cards DENY contienen error, failed, 403 ni CANNOT EVALUATE (`prd.md` línea 440, FR-16). Test planned for implementation: COPY-01.

Definition of Done (implementación futura): criterios 1 y 2 verificados con pruebas verdes, el criterio 3 con el lint y el criterio 4 con COPY-01 cuando exista; EV-EX1, PV-P1, AC-P2, PV-UNAVAILABLE pasan tras reemplazar stubs; se añaden casos de aceptación aún planeados en esta historia; SQL, DTO y eventos coinciden con contrato, cero escrituras ajenas; umbrales NFR aplicables medidos; revisión de pareja y decisiones pendientes de arquitectura resueltas y registradas. La historia no pasa a done con una prueba roja o un NFR solo planeado.

### Story 4.4: Elena usa el evaluador, el catálogo de reglas y la CLI

Como Elena Vargas, quiero componer una solicitud en el evaluador y ver la decisión con su regla, su causa y una alternativa ejecutable, llegar a una regla desde su cita en el catálogo y repetir la evaluación desde la CLI o el explorador de la API, para actuar sin pedir ayuda y sin confundir una negativa con una falla del sistema.

- Traceability (Requirements): FR-14, FR-9, FR-16; superficie UX-1 (`ux/EXPERIENCE.md` línea 28); estados Loading (§4.1), E-COLD, E-VALIDATION, E-SYSTEM, E-UPSTREAM-SIDE y Success ALLOW/CONSTRAIN/DENY (§4.2–4.4); comprobaciones de accesibilidad 1.4.1, 1.4.3, 1.4.10, 2.2.1, 3.3.1/3.3.3, 4.1.3, 1.3.1 y 2.5.3 (§7, líneas 302–319); UI-EVAL-1 a UI-EVAL-4 planificadas; catálogo de reglas (antes 5.3): FR-14, FR-9; superficie UX-2 (`ux/EXPERIENCE.md` línea 29); estados de la vista de reglas (§5, líneas 170–177); comprobaciones 1.4.1 y 1.3.1 (§7); UI-RULES-1 y UI-RULES-2 planificadas; CLI y explorador (antes 5.4): FR-14; superficies UX-6 y UX-5 (`ux/EXPERIENCE.md` líneas 32–35); estados de la CLI y del explorador (§5, líneas 204–210); UI-CLI-1 a UI-CLI-3 planificadas.
- Binding invariants: M2-AD-6, M2-AD-7, M2-AD-9.
- Contracts: evaluateRequest P1, Q1, Q4; POST /policy/decisions/preview (`ARCHITECTURE.md` línea 486); GET /policy/rules, GET /policy/versions, GET /policy/versions/{v} (`ARCHITECTURE.md` §5.1); publishVersion Q1 (para el estado "versión pendiente"); evaluateRequest Q1, Q-fail; previewFreeze Q1; catálogo de errores §3 (código de salida 2, `contracts.md` línea 132).
- Schema/DTO: EvaluateRequestDto, DecisionDto, ErrorBodyDto, PreviewFreezeResponseDto, VersionManifestDto, VersionsResponseDto, VersionDetailResponseDto; tablas decision, trace_entry, preview_run, policy_version, policy_document, en `detailed-design/schemas/dto.ts` y `001_m2_schema.sqlite.sql` / `.postgres.sql`.
- Files: not verified (no path for interface code in ports-and-adapters.md §2); rutas propuestas `ui/evaluator/` y `ui/rule-catalogue/`; `api/cli/` (§2 row 2) y `api/routes/` (row 1); el explorador sirve `openapi.yaml` en `/api/docs` (ruta del explorador: not verified).
- ATDD: test planned for implementation: criterios 1 a 4: UI-EVAL-1 a UI-EVAL-4 en `test/ui/evaluator.test.ts`; criterios 5 y 6: UI-RULES-1 y UI-RULES-2 en `test/ui/rule-catalogue.test.ts`; criterios 7 a 9: UI-CLI-1 a UI-CLI-3 en `test/ui/cli.test.ts` (rutas propuestas; no hay infraestructura de pruebas de interfaz en el paquete). Ningún test rojo de interfaz en esta fase (Stop-Point). Las lecturas de la API las cubre RV-Q1 y RV-P1 (planificadas en la historia 4.1). Toda otra referencia de prueba es ID ejecutable en `test/atdd/`.
- Depends on: 1.1, 1.2, 2.2, 3.1, 4.1, 4.3.
- Alcance: superficies UX-1 (evaluador, zonas A–E: composer, decisión, traza, terminal), UX-2 (catálogo de reglas y versiones) y UX-6 y UX-5 (CLI y explorador de la API, 14 operaciones), reunidas en esta historia por la decisión DL-56 (antes historias 5.1, 5.3 y 5.4). Los botones de siguiente acción del evaluador llaman a POST /policy/decisions/preview. Fuera de alcance: la anulación de reloj con token (`ux/EXPERIENCE.md` línea 16), porque `ARCHITECTURE.md` §15.5 la mantiene abierta. El punto de fiabilidad "reachability" de cada regla depende de que existan las pruebas de alcanzabilidad que cita el PRD: no verificado. No hay regla de responsive para UX-2 en `ux/EXPERIENCE.md` §8: no verificado. Los comandos de la CLI son `aegis eval`, `aegis rules` y `aegis freeze --preview`. Excluido: el comando `aegis journal` y la superficie UX-3 (journal), porque la consulta del historial es del Audit Ledger (`planning/prd.md` línea 83 y NG-10; decisión DL-41).

Acceptance criteria:

1. Given Elena compone una solicitud válida a las 10:04 dentro de la ventana del laboratorio; When la envía desde el evaluador; Then ve una card DENY con el chip de regla R-LAB-01 y el chip de causa por separado, la traza expandida y al menos una acción siguiente (`ux/EXPERIENCE.md` §4.4 y Flow 01). Test planned for implementation: UI-EVAL-1.
2. Given Elena envía un campo fuera de rango (por ejemplo requested_vram_gb_per_gpu = 32); When el composer valida; Then muestra el error en línea con el rango aceptado y el valor legal más cercano, sin modal y sin enviar (`ux/EXPERIENCE.md` línea 139, E-VALIDATION; comprobación 3.3.1/3.3.3 con 6 cargas inválidas, línea 312). Test planned for implementation: UI-EVAL-2.
3. Given una falla de un puerto o del servidor; When el evaluador la recibe; Then muestra un banner SYSTEM con el puerto, la causa y el reintento, distinguible de una card DENY por posición y glifo en escala de grises, y anuncia el banner una sola vez (`ux/EXPERIENCE.md` líneas 138, 145, 306 y 313; comprobaciones 1.4.1 y 4.1.3). Test planned for implementation: UI-EVAL-3.
4. Given el evaluador abierto con un ancho de 1280 px, de 900 px y de 390 px; When se cambia el ancho; Then a 1280 px hay cuatro zonas, a 900 px la zona D se pliega bajo la card y a 390 px aparece solo el aviso que apunta a la CLI con el curl de la solicitud (`ux/EXPERIENCE.md` líneas 325–331, §8), sin desplazamiento horizontal a 320 px (comprobación 1.4.10, línea 309). Test planned for implementation: UI-EVAL-4.
5. Given la versión 41 vigente; When Rebecca abre el catálogo; Then ve las 19 reglas en orden de precedencia, las dos de pre-vuelo (R-VALID-01 y R-DEP-01) separadas por una línea fina, cada una con su resultado, su condición y sus citas, y un sello que dice que todas las citas resuelven (`ux/EXPERIENCE.md` línea 177). Test planned for implementation: UI-RULES-1.
6. Given la versión 42 que no carga; When Rebecca abre el catálogo; Then ve un banner SYSTEM que dice que se muestra la versión 41 congelada y que las decisiones nuevas usan la 41, y puede comparar versiones con GET /policy/versions/{v} (`ux/EXPERIENCE.md` líneas 176–177). Test planned for implementation: UI-RULES-2.
7. Given una solicitud en un archivo r.json; When el técnico ejecuta `aegis eval --request r.json`; Then imprime un resumen de 12 líneas, con `--json` imprime la Decision completa y con `--curl` imprime la solicitud reproducible (`ux/EXPERIENCE.md` línea 209). Test planned for implementation: UI-CLI-1.
8. Given un error de la API; When la CLI lo recibe; Then escribe en stderr una sola línea `E-<CODE> <cause> <retry_after_ms>`, sale con código 2 y con `--json` emite el mismo cuerpo de error que la API (`ux/EXPERIENCE.md` línea 208; `contracts.md` línea 132). Test planned for implementation: UI-CLI-2.
9. Given una consulta que no devuelve elementos; When el técnico la ejecuta en la CLI o en el explorador; Then la CLI imprime `0 decisions matched` y sale con 0 y la API responde 200 con `items: []` y `count: 0`, nunca 404 (`ux/EXPERIENCE.md` línea 207). Test planned for implementation: UI-CLI-3.

Definición de tamaño (decisión DL-56): la historia tiene nueve criterios (cuatro del evaluador, dos del catálogo y tres de la CLI), por debajo del límite de diez; las tres superficies comparten el mismo consumo de `api/routes/` y la misma ausencia de infraestructura de pruebas de interfaz.

Definition of Done (implementación futura): criterios 1 a 9 verificados con pruebas de interfaz cuando exista la infraestructura (UI-EVAL-1 a UI-EVAL-4, UI-RULES-1, UI-RULES-2, UI-CLI-1 a UI-CLI-3); SQL, DTO y eventos coinciden con contrato; la paridad entre consola y CLI se mide sobre las operaciones de `openapi.yaml` (14), no sobre las 13 de la UX (`ux/EXPERIENCE.md` línea 210, que incluye una ruta de journal que no existe); revisión de pareja y decisiones pendientes registradas (las divergencias UX/API están en `ARCHITECTURE.md` §15.5). La historia no pasa a done con una prueba planificada sin escribir.

### Story 4.5: Rebecca usa la consola de congelación en su teléfono

Como Dr. Rebecca Reed, quiero redactar, previsualizar, activar y levantar una congelación desde una pantalla de 390 px que me muestre las consecuencias antes de confirmar, para activar solo con lo que ya vi y poder explicarlo después.

- Traceability (Requirements): FR-14, FR-2; superficie UX-4 (`ux/EXPERIENCE.md` línea 31); estados Loading con vista previa, E-NOT-YET, E-VALIDATION (casos a, b y c), E-SYSTEM de la vista previa, Success de activación y de levantamiento (§5, líneas 190–200); comprobaciones 2.1.1/2.4.7, 4.1.3, 1.4.4 y 1.4.10 (§7, líneas 309–319); UI-FRZ-1 a UI-FRZ-4 planificadas.
- Binding invariants: M2-AD-5, M2-AD-9.
- Contracts: previewFreeze P1–P6, Q1–Q4; activateFreeze P3, P6, P8, P10, Q1; liftFreeze (resultados de `contracts.md` línea 126).
- Schema/DTO: PreviewFreezeRequestDto, PreviewFreezeResponseDto, ActivateFreezeRequestDto, LiftFreezeRequestDto, ErrorBodyDto; tablas freeze_draft, preview_run, freeze, en `detailed-design/schemas/dto.ts` y `001_m2_schema.sqlite.sql` / `.postgres.sql`.
- Files: not verified (no path for interface code in ports-and-adapters.md §2); ruta propuesta `ui/freeze-console/`; consume `api/routes/` (row 1).
- ATDD: test planned for implementation (UI-FRZ-1 a UI-FRZ-4 en `test/ui/freeze-console.test.ts`, ruta propuesta). Ningún test rojo de interfaz en esta fase. La prueba de bloqueo con la vista previa caída es `PV-UNAVAILABLE` y `AC-P2` en `test/atdd/`.
- Depends on: 3.1, 3.2, 3.3, 3.4, 3.5.
- Alcance: superficie UX-4. Excluido, por estar abierto en `ARCHITECTURE.md` §15.5 y en `planning/accepted-concerns.md`: el caso WINDOW_STARTED, la activación degradada sin reservas verificadas y las tarjetas `of which RUNNING` y `GPU-hours reclaimed` (sin fuente de datos en M2); el enlace al sucesor se muestra con `successor_freeze_id`.

Acceptance criteria:

1. Given un borrador válido; When Rebecca pide la vista previa; Then el botón ACTIVATE permanece deshabilitado mientras carga y sigue enfocable con su descripción accesible, y la tarjeta muestra el conteo de solicitudes negadas, las reservas que sobreviven, la próxima ventana protegida y "valid for 60 s" (`ux/EXPERIENCE.md` líneas 192 y 317). Test planned for implementation: UI-FRZ-1.
2. Given una vista previa que falla con 503 PREVIEW_UNAVAILABLE; When Rebecca intenta activar; Then la consola bloquea la activación, muestra un banner SYSTEM con el puerto y el efecto, y no ofrece ninguna activación degradada (`ux/EXPERIENCE.md` línea 195; `contracts.md` previewFreeze P6). Test planned for implementation: UI-FRZ-2.
3. Given Rebecca recorre el camino de activación solo con teclado; When avanza por alcance, ventana, vista previa, confirmación y motivo; Then el orden de foco es ese, cada parada tiene anillo visible de 2 px y el vencimiento de los 60 s se anuncia una vez (`ux/EXPERIENCE.md` líneas 310 y 318; comprobaciones 2.1.1/2.4.7 y 4.1.3). Test planned for implementation: UI-FRZ-3.
4. Given la consola a 390 px y con zoom de 400 %; When Rebecca consulta la vista previa; Then usa una columna, objetivos táctiles de al menos 44 px, la cuenta atrás del plazo fijada arriba y la cifra de solicitudes afectadas siempre visible (`ux/EXPERIENCE.md` líneas 319 y 330; comprobaciones 1.4.4 y 1.4.10). Test planned for implementation: UI-FRZ-4.

Definition of Done (implementación futura): criterios 1 a 4 verificados con pruebas de interfaz cuando exista la infraestructura (UI-FRZ-1 a UI-FRZ-4); SQL, DTO y eventos coinciden con contrato; revisión de pareja y decisiones pendientes registradas. La historia no pasa a done con una prueba planificada sin escribir.

## Project setup already in place

Artefactos existentes en `AI Compute Fabric/M2-Academic-GPU-Policy-Engine/`, abiertos y leídos el 2026-10-21:

- `package.json`: `engines.node` >= 24.15.0; scripts `test` (vitest run test/atdd), `test:harness` (vitest run test/harness), `typecheck` (tsc --noEmit), `verify:red` (node test/ci/verify-red.mjs), `gate` (node test/ci/readiness.mjs) y `check` (los cuatro en cadena). Solo `devDependencies`: vitest ^4, typescript ^5.9, la librería de pruebas de propiedades ^4.3, @types/node ^24 y yaml ^2.8; sin dependencias de producción.
- `tsconfig.json`: ES2023, módulo y resolución NodeNext, `strict`, `noEmit`, `skipLibCheck`, tipos `node` y `vitest/globals`; incluye `test/**/*.ts`, `ports/**/*.ts`, `policy/**/*.ts` y `planning/detailed-design/schemas/dto.ts`.
- Vitest: no hay archivo de configuración propio (`ls` de la raíz del módulo); se usan los valores por defecto con las rutas de los scripts.
- `test/ci/verify-red.mjs` (15 líneas): ejecuta vitest sobre `test/atdd` con reporte JSON y exige que todas las pruebas fallen con `NotImplementedError`, que no haya pendientes ni pasadas y que haya al menos 33.
- `test/ci/readiness.mjs` (73 líneas): valida épicas, historias y sus etiquetas, ids de pruebas, nombres de DTO, hashes protegidos y el lint FR-15 contra la línea base, y regenera `implementation-artifacts/sprint-status.yaml` si pasa.
- `test/ci/quality-gate.yml`: flujo de GitHub Actions en push y pull request con Node 24.15.0, `npm ci`, `npm run check` y subida de `test/evidence/`.
- `test/harness/fixtures.test.ts`: pruebas de los fixtures (6).
- Una sola migración por motor: `planning/detailed-design/schemas/001_m2_schema.sqlite.sql` y `001_m2_schema.postgres.sql`. Crear todas las tablas en una migración es una elección presente en los archivos; el registro no tiene una decisión previa que la fije (entrada DL-47: no prior decision found, reason not verified, pendiente de confirmación de Juan), por eso las historias que nombran tablas no las crean una a una.
- No hay historia de arranque de proyecto: el entorno de desarrollo y la integración continua ya existen como los archivos de arriba. No hay infraestructura de pruebas de interfaz: las historias 4.5 y 4.4 declaran sus pruebas como planificadas.

## Sprint propuesto y capacidad

Sprint 1: 1.1, 1.2, 1.3, 2.1; objetivo: Elena evalúa y reintenta con explicación, y la frontera de clase no permite nueva admisión. Capacidad asumida: dos integrantes, cinco días, cuatro horas netas por día cada uno = 40 horas. Rango estimado 28-40 horas; no es una fecha prometida. 1.1 8-12h, 1.2 6-8h, 1.3 6-8h, 2.1 8-12h. Tomás prepara pruebas y Juan revisa arquitectura; reparto de implementación se acuerda después de Fase 5. Si excede capacidad, 2.1 conserva prioridad y se reduce alcance de presentación de 1.2, sin quitar sus invariantes.

Sprint 2 candidato: 2.2, 2.3, 3.1, 3.2; sprint 3 candidato: 3.3, 3.4, 3.5, 4.1, 4.2, 4.3; sprint 4 candidato: 4.5 y 4.4 (superficies de interfaz, sin código de interfaz en esta fase). Reestimar con velocidad observada. Ningún sprint se inicia mientras el gate final no esté firmado; el YAML es borrador de seguimiento, sin estado ready-for-dev.

## Revisión de implementabilidad y UX

Revisión PM/Dev asistida: dieciséis historias en cuatro épicas (tres en las épicas 1 y 2, cinco en la 3 y cinco en la 4; 4.5 y 4.4 reúnen las superficies de interfaz y no tienen código ni pruebas de interfaz todavía, decisión DL-56); primera atraviesa todas las capas con flota y puertos simulados. Caso obligatorio 2.1, fallos dedicados 2.2 y 3.2. Dependencias solo anteriores; 29 requisitos aparecen y 9 AD están vinculados. No se atribuye esta revisión a personas que no participaron. `reviews/phase-3-4-findings.md` contiene contradicciones y aplazados; `ux-state-contract-map.md` impide presentar rutas ausentes como implementables.
