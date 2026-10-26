# Hallazgos de Fases 3 y 4 para Juan Ruiz

Revisión asistida por IA para Tomás Quintero. Fecha: 2026-10-19. No constituye revisión ni firma de Juan.
No se modifican documentos protegidos. Estado de triage técnico propuesto: MODIFY significa ajuste en nuevos artefactos; DEFER requiere decisión de Juan antes del cierre. Prioridad no equivale a aprobación humana.

| ID | Prioridad | Evidencia | Disposición y mitigación | Responsable / efecto en gate |
|---|---|---|---|---|
| G-01 | P0 | Anexo A usa 21:58; PRD FR-5 define [22:00,06:00) | MODIFY: EDGE-2158 verifica DENY literal; EDGE-NIGHT usa 22:00 y obtiene 05:55; EDGE-1000 verifica DENY a las 10:00. EDGE-FINAL verifica diario/outbox de ambas evaluaciones. No se simula una terminación como si M2 la ejecutara | Juan: confirmar equivalencia pedagógica; cierre de extremo a extremo pendiente de M9 |
| G-02 | P0 | NFR-4 dice t<b también en inicio; FR-4 dice inicio incluido | MODIFY en tests nuevos: inicio s<=t; fin t<e. DM-BOUND cubre fin; DM-START cubre inicio. PRD intacto | Juan debe resolver contradicción antes de gate global |
| G-03 | P1 | NFR-6 y FR-1 mencionan 21 reglas; registro §6.2 tiene 19 | DEFER: usar 19 IDs existentes para plan, nunca inventar dos | Juan valida denominador del informe NFR |
| G-04 | P1 | EDG-18 sin frontera transaccional de repositorio | DEFER: AC-ROLLBACK especifica rollback mediante hook de fixture `after-freeze-insert`. TRANSACTION_ABORTED es error interno de prueba, no nuevo código HTTP ni modificación del catálogo | Juan define Unit of Work y punto de inyección antes de implementar 3.3 |
| G-05 | P0 | ADV-22 y evaluate Q3 sin nombre de evento de obligación | DEFER: se verifica HARD_DEADLINE/enforced_by y outbox de decisión. Observación/terminación M9 queda como prueba de integración futura, no afirmación de cumplimiento | Juan define shape, correlación, timeout y dueño; no cerrado por SQL |
| G-06 | P1 | ADV-19/21/23 y EXPERIENCE mantienen rutas/estados distintos | DEFER: ux-state-contract-map documenta correspondencia y huecos | Juan modifica UX solo tras triage; no se firma cobertura total UX |
| G-07 | P1 | No existen tipos completos de hechos, repositorio transaccional o configuración de puertos | MODIFY: Harness y Facts son costura provisional solo para pruebas; los stubs no son diseño definitivo. policy/core importa el error del stub inbound: no es patrón para producción | Juan aprueba puertos definitivos y mueve tipos compartidos antes de código de producción |
| G-08 | P1 | 18 aplazados heredados; no equivalen a defectos corregidos | DEFER: inventario explícito más abajo; incorporados a historias con dependencia de decisión | Juan conserva o cambia triage con motivo |
| G-09 | P1 | contracts Q-fail excepción Clock sin instante marcada PROPOSED | DEFER: no asumir fecha local para inventar evento. NF-13 y 2.2 exigen decisión documentada | Juan confirma alarma/sin outbox antes de implementación |
| G-10 | P1 | FR-15 lista términos dentro del propio PRD y fuentes contienen coincidencias previas | MODIFY: lint de delta frente al baseline, más inventario completo de deuda. No se vende como cumplimiento literal global | Juan decide exclusiones o corrige fuentes tras triage |

## Inventario de 18 hallazgos heredados aplazados (sin duplicados)

| Hallazgo | Tema | Historia receptora | Estado |
|---|---|---|---|
| ADV-10 | Edición de draft y TOKEN_STALE | 3.2 | DEFER heredado |
| ADV-14 | Outbox cuando falla la lectura de su DB | 2.2 | DEFER heredado |
| ADV-15 | Retención y SNAPSHOT_EVICTED | 4.1 | DEFER heredado |
| ADV-16 | UUID SQLite y paridad | 1.3 | DEFER heredado |
| ADV-18 | Capas del agregado/validador | 1.1 | DEFER heredado |
| ADV-19 | Rutas journal/publish sin API | 4.3 | DEFER heredado |
| ADV-21 | Lectura de freeze por estudiante | 4.3 | DEFER heredado |
| ADV-22 | Correlación de eventos M9 | 2.1 | DEFER heredado |
| ADV-23 | Preview de decisión sin persistencia | 4.3 | DEFER heredado |
| ADV-24 | request_id no persistido | 1.3 | DEFER heredado |
| ADV-25 | Tiempo UUID7 distinto al Clock | 1.3 | DEFER heredado |
| ADV-27 | bound_role por frontera vs fila | 2.1 | DEFER heredado |
| EDG-8 | Reactivar draft a lo largo del tiempo | 3.3 | DEFER heredado |
| EDG-11 | Fallo RENDER | 1.2 | DEFER heredado |
| EDG-12 | Reconstrucción del evento fallido | 2.2 | DEFER heredado |
| EDG-13 | Colisión de snapshot | 1.3 | DEFER heredado |
| EDG-18 | Unit of Work | 3.3 | DEFER heredado |
| EDG-19 | DTO de eventos | 4.1 | DEFER heredado |

No se reabre el triage heredado ni se atribuye una nueva aceptación a Juan. ARCHITECTURE v2 y gate institucional siguen siendo Fase 5.
