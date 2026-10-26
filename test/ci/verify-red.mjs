import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
mkdirSync('test/evidence',{recursive:true});
const report='test/evidence/atdd-results.json';
const result=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','test/atdd','--reporter=json',`--outputFile=${report}`],{encoding:'utf8'});
writeFileSync('test/evidence/atdd-terminal.txt',result.stdout+'\n'+result.stderr);
if(!existsSync(report))throw Error('RED FAIL: no runner report');
const r=JSON.parse(readFileSync(report,'utf8'));
const tests=r.testResults.flatMap(f=>f.assertionResults);
const invalid=tests.filter(t=>t.status!=='failed'||!t.failureMessages.join('\n').includes('NotImplementedError'));
if(result.status!==1||tests.length<33||invalid.length||r.numPendingTests||r.numPassedTests||r.numTotalTests!==tests.length){
 console.error('RED FAIL', {exit:result.status,total:r.numTotalTests,invalid:invalid.map(t=>t.fullName)});process.exit(1);
}
const message=`RED-CONTRACT PASS: ${tests.length}/${tests.length} active acceptance tests fail with NotImplementedError; runner exit=1. This verifies preparation, not implemented behaviour.`;
writeFileSync('test/evidence/red-verification.txt',message+'\n');console.log(message);
