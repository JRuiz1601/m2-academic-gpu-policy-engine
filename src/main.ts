import { config } from './config.ts';
import { createRuntime, sessions } from './adapters/outbound/simulator.ts';
import { createHttpServer } from './adapters/inbound/http.ts';
const c = config(), runtime = createRuntime(c), server = createHttpServer(runtime, c, sessions());
server.listen(c.port,c.host,()=>{const address=server.address();const port=address&&typeof address==='object'?address.port:c.port;console.log(`M2 listening at http://${c.host}:${port}; simulated campus clock ${c.simulatedNow}`);});
for (const signal of ['SIGINT', 'SIGTERM'] as const)
    process.on(signal, () => server.close(() => process.exit(0)));
