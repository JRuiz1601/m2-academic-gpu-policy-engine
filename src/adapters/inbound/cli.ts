import { readFileSync } from 'node:fs';
import { config } from '../../config.ts';
import { createRuntime, sessions } from '../outbound/simulator.ts';
import { evaluateRequest } from '../../application/service.ts';
import { PolicyError } from '../../application/errors.ts';
import type { EvaluateRequestDto } from '../../domain/dto.ts';
try {
    const [file = 'fixtures/request.json', key = 'cli-demo', token = 'student-demo-token'] = process.argv.slice(2);
    const session = sessions()[token];
    if (!session)
        throw new PolicyError('UNAUTHENTICATED', 401);
    const result = await evaluateRequest(createRuntime(config()), { request: JSON.parse(readFileSync(file, 'utf8')) as EvaluateRequestDto, key, session });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.outcome === 'DENY' ? 1 : 0;
}
catch (error) {
    console.error(JSON.stringify(error instanceof PolicyError ? error.toJSON() : { message: error instanceof Error ? error.message : 'CLI failed' }));
    process.exitCode = 2;
}
