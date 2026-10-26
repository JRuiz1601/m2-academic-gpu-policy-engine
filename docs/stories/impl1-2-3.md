# Impl-1 / 2.3 — VRAM Hardware Tier Restriction Gate

Estado: ready-for-review. Meta: reservar el servidor de 48 GB para solicitudes autorizadas y orientar a estudiantes a la estación de 24 GB. Afecta el catálogo compartido y la autorización por tier; no es un cambio compacto y se siguió ceremonia completa.

1. Contexto y DoR: anexo M2, PRD R-TIER-01/02/03, R-FLEET-01 y AD-1/2/4/6. `model_ref` resuelve el tamaño del catálogo, sin confiar en un campo nuevo del cliente.
2. Inspección: clearance, catálogo/variantes, flota 31×24 y 1×2×48, contratos y escenarios EV-TIER-01/02/03.
3. Desglose: modelo/floor → capacidades → clearance → variante elegible → motivo con alternativa → tests y API.
4. Código y pruebas: `evaluate.ts`, `registry.ts`, `fixtures/models.json`, `fixtures/fleet.json`; pruebas nuevas de estudiante con 8 GB solicitando 48 GB y excepciones INSTRUCTOR/RESEARCHER. Se conservan las pruebas anteriores de floor incompatible y variante elegible.
5. DoD automatizado: `npm run check`, evidencia en `test/evidence/impl1-check.log`. La respuesta incluye VRAM observada en explanation y propone `std-24`.
6. Revisión: el campo `model_vram_required_gb` del ejemplo no se añadió porque contradice el contrato previo; el tamaño se obtiene de facts. Autorrevisión completa, validación humana pendiente.

BDD: Given Mateo STUDENT y modelo de 8 GB, When solicita 48GB_SERVER, Then DENY R-TIER-02 con “Workload fits standard 24GB workstation; server tier restricted” y alternativa std-24. Given INSTRUCTOR o RESEARCHER autorizado, When solicita el servidor para ese modelo, Then puede recibir ALLOW si no hay otra restricción.

Base de datos: no cambia tablas; la proyección del modelo y clearance se guarda en fact_snapshot y la explicación cita el registro y POLICY_DOCUMENT. No se reservan GPU ni se ejecutan trabajos.
