# Plan de evidencia NFR

Todos los NFR de producción están PLANNED. Un rojo por stub o una fixture verde no demuestra rendimiento, fiabilidad ni seguridad del sistema. Los artefactos siguientes son rutas previstas bajo `test/evidence/nfr/`, aún no existen. No se rebajan umbrales ni se presentan como mediciones realizadas. Medir tras implementación (G-01..G-10 se cerraron en DL-25..DL-34). Tomás prepara; Juan revisa; la pareja ejecuta en sprint.

| NFR | Métrica y umbral | Método / fixture / N | Artefacto previsto | Historia | Estado |
|---|---|---|---|---|---|
| NFR-1 | p99<=5ms, p50<=1ms; 100 concurrentes | Timer solo evaluate, 10 000 solicitudes; guardar CPU/RAM/Node/carga | test/evidence/nfr/performance-domain.json | 4.2 | PLANNED |
| NFR-2 | 0 red/modelos desde dominio | Allow-list imports y fixtures inaccesibles; inspección recursiva tras implementación | test/evidence/nfr/purity.json | 1.1, 4.2 | PLANNED |
| NFR-3 | 100% byte-idéntico en 10 000 replays y orden canónico | Semilla 20261019, snapshot/version fijos, comparación de bytes y orden | test/evidence/nfr/replay.json | 1.2, 4.2 | PLANNED |
| NFR-4 | 0 errores en b-1ms,b,b+1ms; 1000 fronteras x6 tipos | Oráculo independiente s<=t<e; PRD contradictorio en inicio G-02; DST en zona de prueba | test/evidence/nfr/boundaries.json | 2.1 | PLANNED |
| NFR-5 | 0 tokens, claves, nombres completos o emails en 10 000 decisiones | Fixtures contaminadas y búsqueda en trace/rationale/DB/eventos/logs | test/evidence/nfr/pii.json | 1.3, 2.3, 3.2, 4.2 | PLANNED |
| NFR-6 | 100% decisiones con regla, cita resoluble y rationale; DENY con acción | Matriz 3 outcomes x19 reglas del registro; G-03 señala 21 en texto PRD | test/evidence/nfr/explanation.json | 1.2, 3.1, 4.2 | PLANNED |
| NFR-7 | <=5s publicación a efecto; 0 efecto en evaluaciones iniciadas | Publicar durante fetch bloqueado; sondas versión antes/después | test/evidence/nfr/activation-lag.json | 3.3, 4.2 | PLANNED |
| NFR-8 | <=30s producción a consulta | Probe de ingesta-consulta; caída bus, recuperación y deduplicación | test/evidence/nfr/journal-lag.json | 4.2 | PLANNED |
| NFR-9 | 10 puertos paralelos; p99<=45ms a 100 concurrentes; timeout=40ms | Carga 10 000; timers por puerto, abortos y 0 huérfanas; 40<=45<=60 | test/evidence/nfr/fanout.json | 2.2, 4.2 | PLANNED |
| NFR-10 | p99<=2ms/render; 0 llamadas externas | Microbenchmark 10 000 renders, timer aislado del fetch | test/evidence/nfr/render.json | 1.2, 4.2 | PLANNED |
| NFR-11 | Un launcher, 0 servicios externos/GPUs; puertos por sockets | Cold start limpio y segunda corrida con servidores fixture en sockets; implementación futura | test/evidence/nfr/cold-start.txt | 1.1, 4.3 | PLANNED |
| NFR-12 | >=90% peticiones con una regla; 0 restricciones innecesarias | Informe distribución FR y predicado de necesidad por frontera | test/evidence/nfr/precision.json | 1.2, 2.3, 4.2 | PLANNED |
| NFR-13 | 100% puertos clasificados; fallo derivado de inputs | Comparar registro de puertos a FR-10; caída, 404, body malformado y edad; Clock G-09 | test/evidence/nfr/fail-modes.json | 2.2, 4.2 | PLANNED |

Fiabilidad adicional: quota a 41ms debe producir DENY y retry_after_ms=2000; bus caído no impide respuesta y outbox sobrevive reinicio. No medir esas garantías con un stub que arroja NotImplementedError. M8 commit y terminación M9 se prueban en sus fronteras simuladas sin añadir sus implementaciones.
