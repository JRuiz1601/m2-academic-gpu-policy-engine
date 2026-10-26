# Correspondencia de estados UX para Fase 4

Estado de revisión: parcial por G-06; archivos UX de origen preservados.

| Vista / estado | Contrato | DTO | Historia | Situación |
|---|---|---|---|---|
| Evaluador Loading | evaluateRequest pendiente | EvaluateRequestDto | 1.1 | Solo estado cliente, no nuevo resultado de dominio |
| Evaluador Success | evaluate Q1/Q4 | DecisionDto | 1.1/1.2 | ALLOW o CONSTRAIN, explicar admisión |
| Evaluador Denied | evaluate P7/P8/P9, Q1/Q4 | DecisionDto | 2.1/2.2/2.3 | DENY llega con 200, causa y regla |
| Evaluador Error | evaluate Q-fail (wire/503) | ErrorBodyDto | 2.2/4.3 | Distinguir falla de superficie de DENY |
| Evaluador Empty inicial | Sin petición | No aplica, estado local | 1.1 | Sin decisión, no inferir resultado |
| Freeze Loading | preview pendiente | PreviewFreezeRequestDto | 3.1 | ACTIVATE deshabilitado |
| Freeze Empty | Lista de freezes | FreezeListResponseDto | 4.3 | items=[], count=0 |
| Freeze Success preview | preview Q1/Q2 | PreviewFreezeResponseDto | 3.1 | Mostrar consecuencias antes de confirmar |
| Freeze Success activation | activate Q1 | ActivateFreezeResponseDto | 3.3 | 201 y referencia freeze_id |
| Freeze Denied/403 | preview P3 / activate P3 | ErrorBodyDto | 3.2/3.3 | ROLE_INSUFFICIENT, sin mutación |
| Freeze Error | preview P6 / activate Q-fail | ErrorBodyDto | 3.2/3.3 | 503 o 409 con código tipado, no activar |
| Journal/trace Loading/Empty/Error/Success | ADV-19: GET journal no definido; trace fetch pendiente | Falta DTO de journal/trace | 4.3 | BLOQUEO de correspondencia completa; Juan triagea |
| Publish pantalla / preview de decisión | ADV-19/23: contrato o persistencia sin cerrar | VersionManifestDto / DecisionDto insuficientes | 4.1/4.3 | BLOQUEO de cierre, no inventar API (actualizado el 2026-10-21: la parte de publicación tiene contrato, ver filas siguientes; el preview de decisión (ADV-23) sigue sin cerrar) |
| Publish pantalla (UX-2), acción de publicar | publishVersion Q1-Q4 (contracts.md §2, ruta 14, decisión DL-41) | PublishVersionRequestDto / PublishVersionResponseDto (= VersionManifestDto) | 4.1 | Con contrato; interfaz sin implementar; cuerpo, rol y estado de éxito siguen abiertos (contracts.md §6 punto 12) |
| Journal pantalla (UX-3), consulta de decisiones pasadas | Sin contrato en M2: consulta delegada al Audit Ledger (PRD línea 83 y NG-10; decisión DL-41, enmienda) | Sin DTO | 4.3 | Abierto: corrección de UX pendiente, dueño Juan (por confirmar), antes del sprint 1 |
| Freeze Success preview, tarjetas `of which RUNNING` y `GPU-hours reclaimed` | Sin contrato: previewFreeze Q1 y Q4 devuelven `denied_count`, `survivors`, `next_protected_window` | Sin DTO por esta razón: la fuente del dato está fuera de M2 (puente/M9; PRD §9.2 línea 487; AD-5); decisión DL-43, enmienda | 3.1 | Abierto: corrección de UX pendiente, dueño Juan (por confirmar), antes del sprint 1 |
| Freeze Success (superseded), enlace al sucesor | Lectura de freeze (GET /policy/freezes/{id}) | FreezeDto.successor_freeze_id (derivado de `supersedes`) | 3.3/4.3 | Cerrado en la API el 2026-10-21 (decisión DL-43); interfaz sin implementar |
| Freeze Success (lift), levantar una congelación | liftFreeze: resultados de `contracts.md` línea 126 (200, MISSING_REASON, FREEZE_NOT_LIFTABLE, FREEZE_NOT_FOUND, ROLE_INSUFFICIENT); sin contrato P/Q/I completo | LiftFreezeRequestDto / LiftFreezeResponseDto | 3.4 | Con resultados y pruebas rojas LF-*; interfaz sin implementar; el contrato completo sigue pendiente |
| Superficies UX-1, UX-2, UX-4, UX-5 y UX-6 completas | Contratos de las historias de interfaz 4.5 y 4.4 (evaluateRequest, previewFreeze, activateFreeze, liftFreeze, reglas y versiones) | DTO ya listados arriba; sin DTO nuevo | 4.5 y 4.4 | Con criterios y pruebas de interfaz planificadas (decisión DL-49); las divergencias abiertas (WINDOW_STARTED, activación degradada, tarjetas RUNNING y GPU-hours, journal) quedan fuera de esas historias |

EXPERIENCE aún menciona WINDOW_STARTED y activación degradada: propuestas de retirar o corregir bajo triage de Juan. Este mapa no afirma que todos los estados originales tengan contrato.
