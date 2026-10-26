# Revisión de calidad de tests

Auto-revisión técnica asistida, 2026-10-19; revisión de Juan pendiente. Alcance: `test/atdd/`, fixtures y stubs. Evidencia reproducible: `npm run check`, JSON y terminal en `test/evidence/`.

| Criterio | Evaluación | Acción |
|---|---|---|
| Dos Q, dos P y dos I por operación | EV, PV y AC tienen seis mínimos cada uno | Ver IDs en traceability-matrix |
| Rojo activo por interfaz no implementada | verify-red valida cada failureMessage y código 1 | No aceptar skip, error de import o fallo sin tests |
| Aserciones de comportamiento | Retorno, DB, outbox, auditoría; P compara snapshot completo y cero efectos | No hay assert true ni cuerpos vacíos |
| Dependencias simuladas | Solo hechos/fallos inyectados; respuestas de SUT nunca configuradas | No sustituir SUT por mock que ya trae resultado |
| Tiempo y aislamiento | Nueva DB por prueba, cierre afterEach, reloj manual | No sleeps; semilla explícita en propiedades |
| Concurrencia | Promise.all/Settled con recuento de ganadores/filas | Memoria SQLite no demuestra locks entre procesos: añadir PostgreSQL o archivo con conexiones separadas al implementar |
| Explicación | Regla, cita, evidencia y causa en rationale | Resolver cita con DB también en sprint |
| Caso obligatorio | Cuatro perspectivas: literal, plazo nocturno, frontera, estado persistido | Terminación M9 no está probada ni implementada |
| AD-1..9 | Cada AD tiene test rojo y vínculo a historia | Import-allow-list de producción todavía PLANNED |
| Metadatos de pruebas | IDs activos y manifiesto verificable | No denominar test ejecutado a un NF planeado |

Hallazgos corregidos durante preparación: el test de rollback inicialmente podía confundirse con un nuevo error HTTP; ahora su código se declara interno de fixture. El seam del dominio depende de un error del stub inbound: se informa en G-07 y no se presenta como arquitectura de implementación. Fixture SQLite usa node:sqlite en vez del driver de producción decidido; su alcance está limitado al harness y conserva SQL original.

Resultado: preparado para revisión de pareja, con limitaciones explícitas. No se afirma que contratos hayan pasado, que exista cobertura de líneas de producción, que la suite haya resistido mutation testing o que todos los NFR estén demostrados. El caso 21:58 y los hallazgos heredados impiden certificar gate global.

## Revisión del Reviewer (Juan Esteban Ruiz Ome), 2026-10-20

La sección anterior es la auto-revisión del paquete del Test Lead; esta sección es la del Reviewer.

**(a) Qué se verificó.**
- Hashes protegidos: los 13 archivos de `test/evidence/protected-sha256.json` coinciden (13/13). Que los archivos heredados sean idénticos a los originales de la Fase 2: no verificado más allá de esos hashes.
- `npm run check` antes de P3-FIX-1: 35 pruebas rojas, gate estructural PASS. Después: tipos sin errores, harness verde, `RED-CONTRACT PASS: 38/38`, gate estructural PASS con 38 pruebas rojas activas.

**(b) Hallazgos.**

| Id | Hallazgo | Decisión | Estado |
|---|---|---|---|
| T-1 | Faltaban pruebas rojas para M2-AD-9 (firma falsificada, token sin fila, token de otro actor) | Aceptado | ACEPTADO y aplicado: `AC-TOKEN-FORGED`, `AC-NO-PREVIEW-ROW`, `AC-TOKEN-ACTOR` |
| T-2 | Tres aserciones débiles (`PV-Q1`, `DM-BOUND`/`DM-START`, `EV-PII`) | Aceptado | ACEPTADO y aplicado salvo `denied_count`, abierto |
| T-3 | Pruebas sin formato | Aceptado | ACEPTADO y aplicado (Prettier; los títulos no cambian) |
| T-4 | Concurrencia en conexiones separadas y PostgreSQL | Aplazado | APLAZADO a historias 1.3 y 3.3 |

**(c) Punto abierto: `PV-Q1` `denied_count`.** El contrato no fija su valor (`contracts.md` previewFreeze Q4: los ids de regla detrás de `denied_count` no están en `AR` §5.1). La prueba solo exige un entero mayor o igual a 0 y la igualdad con la fila `preview_run`.

**(d) Límites.** No hay mutation testing. No hay cobertura de código de producción. La concurrencia se prueba sobre una sola conexión en memoria. El fixture usa `node:sqlite`, no PostgreSQL.

Firma del Reviewer: pendiente (la firma la escribe Juan).
