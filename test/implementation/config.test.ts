import {it,expect} from 'vitest';
import {config} from '../../src/config.ts';
it('validates configuration and refuses the incomplete production profile',()=>{expect(()=>config({PORT:'-1'})).toThrow();expect(()=>config({SIMULATED_NOW:'tomorrow'})).toThrow();expect(()=>config({TOKEN_SECRET:'short'})).toThrow();expect(()=>config({NODE_ENV:'production'})).toThrow('local simulation');expect(()=>config({ALLOW_CLOCK_OVERRIDE:'maybe'})).toThrow();expect(config({}).port).toBe(3000);});
