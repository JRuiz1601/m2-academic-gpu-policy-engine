# M2 Academic GPU Policy Engine — Impl-1

Implementación local de las tres historias del anexo M2: evaluación de acceso GPU, protección horaria de clases y restricción de VRAM. Incluye API, consola web, CLI, SQLite persistente, flota simulada, congelaciones, publicación de versiones y pruebas automatizadas.

Requisito: Node.js >=22.18.0 y npm. Verificado con `npm run check` (95/95 inicial) en Node 22.18.0 y 24.18.1; las ejecuciones previas registradas usaron 22.23.x y 26.5.0. Node 20 no está soportado: el código se ejecuta con eliminación nativa de tipos (sin bandera desde 22.18) y usa `node:sqlite`, ausentes o bajo bandera en versiones anteriores. En un Node no soportado `npm start` falla con el error del propio Node (sintaxis TypeScript / módulo no encontrado), no con un mensaje propio; se documenta en lugar de añadir un chequeo. Desde esta carpeta:

```sh
npm run setup
npm start
```

Abrir **http://127.0.0.1:3000**. `setup` instala las dependencias fijadas y ejecuta tipos, controles de arquitectura y todas las pruebas. Las pruebas HTTP abren sockets de loopback; el entorno debe permitirlos. No se necesitan GPU, cuentas externas ni `.env` para ejecutar localmente.

```sh
npm run check                      # tipos + lint de arquitectura + pruebas
npm run cli                        # evalúa fixtures/request.json
npm run cli -- fixtures/request.json otra-clave student-demo-token
```

La CLI usa salida 0 para admisión, 1 para denegación y 2 para errores. La misma clave y solicitud recuperan la decisión guardada; usar una clave nueva para una evaluación nueva.

Configuración opcional:

```sh
cp .env.example .env
```

`PORT`, `HOST`, `DATABASE_PATH`, `TOKEN_SECRET`, `SIMULATED_NOW` y `ALLOW_CLOCK_OVERRIDE` están documentadas en [.env.example](.env.example). El reloj es deliberadamente fijo para reproducir la simulación; no avanza con el reloj del equipo. Cambiar `SIMULATED_NOW` y reiniciar para evaluar otra hora. Los instantes del contrato están en UTC y las reglas locales usan America/Panama (UTC−05:00). Ejemplo de lunes 10:30 local: `2026-10-19T15:30:00.000Z`.

Alternativa con Docker:

```sh
docker compose up --build
```

Compose conserva SQLite en un volumen. Verificado en una corrida real con Docker 29.6.2 (build, `/health`, `/ready`, POST y persistencia tras `down`/`up`); detalle en el walkthrough.

## API y demostración

El contrato previo usa `POST /policy/decisions`; se conserva esa ruta en lugar del ejemplo genérico `/api/v1/policy/evaluate` del PDF. El resultado usa `outcome`, `primary_rule_id`, `rationale` y evidencia completa, e incluye `CONSTRAIN`. El requisito de VRAM se obtiene del catálogo por `model_ref`, evitando confiar en un tamaño declarado por el cliente. No se añadió la tabla genérica `policy_rules`: se usa el registro inmutable de la arquitectura acordada.

```sh
curl -s http://127.0.0.1:3000/policy/decisions \
  -H 'Authorization: Bearer student-demo-token' \
  -H 'Idempotency-Key: demo-1' -H 'Content-Type: application/json' \
  --data-binary @fixtures/request.json
```

Sesiones locales: `student-demo-token` (Mateo), `instructor-demo-token` (Rebecca, LAB_OPERATOR) y `researcher-demo-token`. Son fixtures públicas de demostración; no son credenciales de una universidad. La identidad se resuelve del token en el servidor y no de roles enviados en el cuerpo. El perfil `NODE_ENV=production` se rechaza hasta integrar autenticación y fuentes reales.

La API expone las 14 operaciones del OpenAPI previo, además de servir la consola estática en `/`. `/health` y `/ready` son públicos; las rutas de políticas requieren sesión. Las congelaciones requieren INSTRUCTOR o superior con LAB_OPERATOR. Las decisiones DENY devuelven HTTP 200; los errores de entrada, permisos y conflictos usan el catálogo estructurado. La decisión, evidencia, clave y outbox se confirman en una transacción antes de responder.

## Estructura y entrega

```text
src/domain/       DTO propios, reglas puras y registro (sin red, SQL ni pruebas)
src/ports/        contratos Store/Runtime y adaptador de compatibilidad para las ATDD (policy.ts)
src/application/  evaluación, idempotencia, evidencia, borradores, tokens, transacciones
src/adapters/     inbound: HTTP, CLI, consola web · outbound: SQLite, migración, simuladores
fixtures/         31 estaciones de 24 GB y un servidor 2 x 48 GB, modelos, sesiones, horario
test/             atdd (61 previas), harness, implementation (HTTP, BDD, núcleo, arranque), ci (lint)
docs/             prd, contracts (copias), stories, sprint-status, decisiones, history/ (Solu-2)
planning/ ux/     planeación y UX previas (fuente de verdad de contratos y PRD)
```

[walkthrough-impl1.md](walkthrough-impl1.md) contiene el informe y la evidencia. [PENDIENTES-IMPL1.md](PENDIENTES-IMPL1.md) distingue el alcance entregado de los requisitos avanzados pendientes. [ai-decision-log.md](ai-decision-log.md) registra decisiones y correcciones; [docs/sprint-status.yaml](docs/sprint-status.yaml) rastrea las tres historias del PDF. La CI está preparada en `.github/workflows/implementation.yml` para publicar esta carpeta como raíz del repositorio.

Los informes Solu-2 y sus pruebas RED son evidencia histórica, conservada en `planning/` y `docs/history/solu2/` (ver su README). Sus scripts de gate (`verify:red`, `gate`, `check:preparation`) se retiraron; `npm run check` es el control vigente. No se declara aprobado retrospectivamente el cierre de Solu-2 ni todos los criterios de las 16 historias originales.

## Git history note

The implementation was produced in a workspace without version control; the commits were created at submission time by slicing the final tree and do not reflect the real chronology.
