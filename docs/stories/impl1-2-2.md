# Impl-1 / 2.2 — Time-Window Lab Class Protection Gate

Estado: ready-for-review. Meta: proteger la clase CS-101 de los trabajos en segundo plano. La prioridad temporal puede afectar todas las solicitudes y los límites de ejecución; pruebas de frontera y reloj simulado justifican ceremonia completa.

1. Contexto y DoR: anexo M2, PRD R-LAB-01/02, R-NIGHT-01, R-BOUND-01 y AD-1/3/5/6. Usa el mismo POST /policy/decisions y DTO; no inventa una ruta de calendario.
2. Inspección: fixtures de ProtectedWindow, pruebas de inicio/fin generado, esquema y regla de gracia de cinco minutos. El reloj del host no entra en el core.
3. Desglose: instantes/ventana → filtro de asignatura → gate medio abierto → próximo instante disponible → límite nocturno → almacenamiento de evidencia.
4. Código y pruebas: `evaluate.ts`, `facts.ts`, `fixtures/timetable.json`, pruebas DM-BOUND, DM-START, EDGE y escenarios nuevos de lunes 10:30 y exactamente 12:00. Se verifica precedencia temporal, cita, próximo fin y delegación del deadline a M9.
5. DoD automatizado: `npm run check`, registro `test/evidence/impl1-check.log`. El tipo de trabajo interactivo mantiene la excepción acordada en el PRD; el anexo pide rechazar trabajos asíncronos.
6. Revisión: cuota agotada domina un deadline (DL-50) y cuota insuficiente se conserva aunque haya plazo. Revisión humana de la reconciliación documental pendiente.

BDD: Given ventana CLASS CS-101 lunes 10:00–12:00 campus UTC−05, When Mateo pide BACKGROUND_BATCH a las 10:30, Then DENY R-LAB-01 con texto de protección y `2026-10-19T17:00:00.000Z` como próxima disponibilidad de esa clase. Given reloj exactamente al fin, When evalúa un trabajo EVALUATION autorizado, Then la clase ya no lo bloquea.

Base de datos: ProtectedWindow llega del puerto simulado; su proyección se guarda en fact_snapshot y la decisión en las tablas existentes. No se apropia del calendario de otro módulo.
