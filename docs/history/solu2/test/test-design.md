# Estrategia de pruebas M2 - Fases 3 y 4

Preparado para Tomás Quintero con asistencia de IA, 2026-10-19. Revisión de Juan Ruiz pendiente.
Fuente: contratos §2/§4, PRD §7/§8 y taller §6/§7. Se usa el mínimo más estricto del handover: dos Q, dos P y dos I por operación.

## Riesgos

Probabilidad e impacto: 1 bajo, 2 medio, 3 alto; puntaje = producto. P0: riesgo de admisión, aislamiento o caso obligatorio; P1: puntaje >=6 restante; P2: 3-4; P3: 1-2. Una elevación a P0 prima sobre el puntaje.
Tomás prepara cada mitigación ahora; Juan decide los huecos antes del gate final; ejecución verde corresponde al sprint posterior.

| ID | Clase | Riesgo | Prob. | Impacto | Puntaje | Prioridad | Contrato/AD | Prueba | Historia |
|---|---|---|---|---|---|---|---|---|---|
| RK-01 | BUS | Trabajo continúa dentro de clase; caso obligatorio | 3 | 3 | 9 | P0 | AD-3, AD-5; evaluate I4/I6 | EDGE-NIGHT, EDGE-1000, EDGE-FINAL | 2.1 |
| RK-02 | SEC | Activación sin permiso vigente o con token ajeno | 3 | 3 | 9 | P0 | AD-9; activate P3/P8 | AC-ROLE, AC-P2, AC-TOKEN-FORGED, AC-NO-PREVIEW-ROW, AC-TOKEN-ACTOR | 3.3 |
| RK-03 | DATA | Carrera crea más de una decisión por clave | 3 | 3 | 9 | P0 | AD-8; evaluate I9 | EV-I1 | 1.3 |
| RK-04 | DATA | Carrera activa varias congelaciones del mismo alcance | 3 | 3 | 9 | P0 | AD-9; activate I1/I2 | AC-I1 | 3.3 |
| RK-05 | OPS | Fuente caída permite admisión sin hechos válidos | 3 | 3 | 9 | P0 | AD-4; evaluate P9 | EV-DEP | 2.2 |
| RK-06 | TECH | Precedencia duplicada causa respuestas distintas | 2 | 3 | 6 | P1 | AD-2; registro | DM-AD2 | 1.2 |
| RK-07 | DATA | Publicación cambia versión durante evaluación | 2 | 3 | 6 | P1 | AD-7; evaluate I8 | EV-VERSION | 4.1 |
| RK-08 | SEC | Explicación o diario filtra identidad o credenciales | 2 | 3 | 6 | P1 | AD-8; evaluate I9 | EV-PII | 4.2 |
| RK-09 | BUS | Explicación carece de regla o hechos observados | 2 | 2 | 4 | P2 | AD-6; evaluate Q4 | EV-EX1, DM-AD6 | 1.2 |
| RK-10 | PERF | Fan-out excede 45 ms y deja llamadas huérfanas | 2 | 3 | 6 | P1 | AD-4; evaluate P9; NFR-9 | EV-DEP (funcional); NF-09 (planeado) | 2.2 |
| RK-11 | DATA | Fallo a mitad de activación consume token sin freeze | 2 | 3 | 6 | P1 | AD-9; activate Q2/Q-fail | AC-ROLLBACK | 3.3 |
| RK-12 | BUS | 21:58 fuera de noche y NFR-4 contradictorio se toman como oráculos | 3 | 3 | 9 | P0 | AD-3; PRD FR-4/5; contracts Time | EDGE-2158, DM-BOUND | 2.1 |

## Niveles, recursos y compuertas

Distribución objetivo del sprint: dominio puro 60%, integración/contratos DB 25%, HTTP 10%, recorrido UX 5%. Es una asignación de esfuerzo/casos futuros, no una medición de la suite actual: ATDD concentra operaciones de aplicación. El dominio contiene determinismo, precedencia, fronteras, reglas y construcción de Decision; DB verifica atomicidad, unicidad y append-only; HTTP verifica DTO/estado; UX verifica estados y prohibición de activación sin preview. No se implementan pantallas en esta unidad.

Preparación: 100% riesgos P0 con prueba activa roja; 9/9 AD con prueba; cero skips, cero fallos de carga; TypeScript y fixtures verdes. Dominio implementado: >=90% líneas y >=90% ramas; P0 y contratos de seguridad 100% de casos pasan. No se declara cobertura de producción con stubs. Mutaciones futuras: quitar unicidad debe romper EV-I1/AC-I1; quitar margen de 300s debe romper EDGE-NIGHT; quitar vínculo de actor debe romper EV-I2/AC-ROLE; quitar cita debe romper DM-AD6. Fallar hoy por stub no demuestra aún sensibilidad a mutantes.

En PR: tipos, fixtures, lint de cambios, trazabilidad y verificación roja (<15 min objetivo). En sprint implementado se elimina la expectativa roja y se exige suite verde. Nightly: 10 000 replays y decisiones contaminadas, fronteras generadas; semanal: carga y pérdida/recuperación del bus. Nunca convertir un fallo desconocido en un rojo aceptable.

Estimación orientativa posterior (no compromiso del equipo): P0 20-35 horas, P1 15-25, P2 4-8; 39-68 horas. Es esfuerzo de pruebas de todos los riesgos P0 a P2; no es el mismo alcance que la estimación del sprint 1 de `planning/epics.md` (1.1, 1.2, 1.3 y 2.1: 28-40 horas de implementación con sus pruebas), por eso las dos cifras no se suman ni se comparan. Medir velocidad en el primer sprint antes de fijar fechas.

## Huecos de testabilidad remitidos a arquitectura

Ver `reviews/phase-3-4-findings.md`: G-01 oráculo de 21:58 y alcance M9; G-02 NFR-4 inicio/fin; G-03 fuentes de NFR-6 (21 vs 19 reglas); G-04 Unit of Work y fallo inyectable; G-05 observación M9/evento de obligación; G-06 UX/API; G-07 puertos de prueba; G-08 inventario de aplazados; G-09 excepción de reloj; G-10 literal FR-15. Controlabilidad: reloj/flota/telemetría y DB nuevos por test. Observabilidad: tablas, outbox y puerto de efectos; no es un mock que retorna la respuesta esperada. Fiabilidad: sin sleeps ni servicios externos, aislamiento por conexión; SQLite en memoria no demuestra concurrencia entre procesos ni paridad PostgreSQL.

## Revisión por épica después de planificar

| Épica | Riesgos dominantes | Nivel | Condición para darla por terminada en implementación |
|---|---|---|---|
| 1 | RK-03/06/09 | Dominio + DB + HTTP | Recorrido completo con explicación y replay único |
| 2 | RK-01/05/10/12 | Dominio + fallos de puertos | Decisión acotada, DENY a las 10:00, timeout abortado |
| 3 | RK-02/04/11 | DB transaccional + HTTP | Preview sin activación y un solo ganador |
| 4 | RK-07/08 | Dominio + carga + UX | Versión fijada, ausencia de secretos, NFR medidos |

ASR accionables: atomicidad, reloj único, determinismo, fallo cerrado, aislamiento. ASR de medición posterior: latencia, publicación y disponibilidad del diario. Estado de revisión documental: preparado; sin certificación humana ni evidencia de NFR de producción.
