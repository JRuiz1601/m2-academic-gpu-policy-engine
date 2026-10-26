import {readFileSync,writeFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import YAML from 'yaml';
const read=p=>readFileSync(p,'utf8');
const errors=[];
const requireCheck=(ok,message)=>{if(!ok)errors.push(message);};
const epics=read('planning/epics.md');
const chunks=epics.split(/^### Story /m).slice(1);
const epicSections=epics.split(/^## Epic /m).slice(1);
const perEpic=epicSections.map(s=>(s.match(/^### Story /gm)||[]).length);
requireCheck(epicSections.length>=3&&epicSections.length<=4,'Expected between three and four epics');
perEpic.forEach((n,i)=>requireCheck(n>=3&&n<=5,`Epic ${i+1} must have between three and five stories; got ${n}`));
requireCheck(chunks.length>=9&&chunks.length<=16,'Expected between nine and sixteen stories');
const index=JSON.parse(read('test/story-index.json'));
const testSources=readdirSync('test/atdd').filter(p=>p.endsWith('.test.ts')).map(p=>read('test/atdd/'+p)).join('\n');
const ids=[...testSources.matchAll(/test\('([A-Z0-9-]+) /g)].map(m=>m[1]);
requireCheck(ids.length===new Set(ids).size,'Duplicate test ID');
requireCheck(!/test\.(skip|todo|only)\s*\(/.test(testSources),'Skipped, todo, or only test');
requireCheck(!/expect\(true\)\.toBe\(true\)/.test(testSources),'Tautology');
const dto=read('planning/detailed-design/schemas/dto.ts');
const seen=new Set();const reqs=new Set();const ads=new Set();
for(const chunk of chunks){
 const id=chunk.match(/^(\d+\.\d+):/)?.[1];const item=index.find(i=>i.id===id);
 requireCheck(!!item,`Unknown story ${id}`);if(!item)continue;
 for(const label of ['Requirements','Traceability','Files','Binding invariants','Contracts','Schema/DTO','ATDD','Depends on','Definition of Done','Given','When','Then'])requireCheck(chunk.includes(label),`${id} missing ${label}`);
 const line=chunk.match(/Binding invariants: ([^\n]+)/)?.[1]||'';
 requireCheck(/M2-AD-\d+/.test(line),`${id} missing binding AD`);
 for(const name of chunk.match(/Schema\/DTO: ([^;]+)/)?.[1].split(', ')||[])requireCheck(dto.includes(` ${name}`),`${id} unresolved DTO ${name}`);
 for(const t of item.tests)requireCheck(ids.includes(t),`${id} missing ATDD ${t}`);
 for(const dep of item.depends)requireCheck(seen.has(dep),`${id} forward or unknown dependency ${dep}`);
 for(const r of item.requirements){requireCheck(chunk.includes(r),`${id} requirement metadata drift ${r}`);reqs.add(r);}
 for(const a of item.ads){requireCheck(line.includes(a),`${id} AD metadata drift ${a}`);ads.add(a);}
 seen.add(id);
}
for(let n=1;n<=16;n++)requireCheck(reqs.has('FR-'+n),`Unmapped FR-${n}`);
for(let n=1;n<=13;n++)requireCheck(reqs.has('NFR-'+n),`Unmapped NFR-${n}`);
const trace=read('test/traceability-matrix.md');
for(let n=1;n<=9;n++)requireCheck(ads.has('M2-AD-'+n)&&trace.includes(`| M2-AD-${n} |`),`Unmapped AD-${n}`);
const design=read('test/test-design.md');
for(const line of design.split('\n').filter(l=>l.startsWith('| RK-')&&l.includes('| P0 |'))){
 const columns=line.split('|').map(x=>x.trim());const named=columns[9].split(', ');
 requireCheck(named.some(t=>ids.includes(t)),`P0 without executable test: ${columns[1]}`);
}
for(const prefix of ['EV','PV','AC'])for(const category of ['Q','P','I'])for(const n of [1,2])requireCheck(ids.includes(`${prefix}-${category}${n}`),`Missing minimum ${prefix}-${category}${n}`);
const protectedFiles=JSON.parse(read('test/evidence/protected-sha256.json'));
for(const [p,hash] of Object.entries(protectedFiles))requireCheck(createHash('sha256').update(readFileSync(p)).digest('hex')===hash,`Protected file changed: ${p}`);
const baseline=JSON.parse(read('test/evidence/doc-lint-baseline.json'));
const terms=['efficiently','appropriately','securely','user-friendly','robust','scalable','fast','human-readable','concrete','real','genuinely','seamless','frictionless','straightforward','effective','access-bearing','blast radius','the user','the admin'];
const patterns=terms.map(t=>new RegExp('\\b'+t+'\\b','gi'));
patterns.push(/\b(A|An) (thesis student|CV undergraduate|operator|developer|user|admin)\b/g);
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):[d+'/'+e.name]);
const lint=[];
// DL-53 (2026-10-21): the verbatim output of the readiness skill quotes the PRD and its banned words; exactly these files are exempt from the FR-15 delta lint, nothing else.
const GATE_REPORT=/^planning\/implementation-readiness-report-solu2(-run\d+)?\.md$/;
for(const p of ['planning','reviews','ai-log'].flatMap(walk).filter(p=>p.endsWith('.md')&&!GATE_REPORT.test(p))){
 const text=read(p),counts=patterns.map(r=>(text.match(r)||[]).length);const old=baseline[p]||[];
 counts.forEach((n,i)=>requireCheck(n<=(old[i]||0),`New FR-15 match: ${p} pattern ${i}`));
 if(counts.some(Boolean))lint.push({path:p,total:counts.reduce((a,b)=>a+b,0)});
}
writeFileSync('test/evidence/doc-lint-current.json',JSON.stringify({scope:'delta only; full legacy debt remains',files:lint},null,2));
const red=JSON.parse(read('test/evidence/atdd-results.json'));
requireCheck(red.numTotalTests===ids.length&&red.numFailedTests===ids.length,'Red test inventory/report mismatch');
const failures=red.testResults.flatMap(f=>f.assertionResults);
requireCheck(failures.every(t=>t.status==='failed'&&t.failureMessages.join('\n').includes('NotImplementedError')),'Unexpected red failure');
if(errors.length){console.error('STRUCTURAL GATE FAIL\n'+errors.join('\n'));process.exit(1);}
const sprintPath='implementation-artifacts/sprint-status.yaml';
requireCheck(existsSync(sprintPath),'Sprint status YAML must exist; run bmad-sprint-planning');
if(existsSync(sprintPath)){
 try {
  const status=YAML.parse(read(sprintPath));
  const development=status?.development_status;
  requireCheck(!!development&&typeof development==='object'&&!Array.isArray(development),'Sprint development_status must be a mapping');
  if(development&&typeof development==='object'){
   const keys=Object.keys(development);
   const epicKeys=keys.filter(k=>/^epic-\d+$/.test(k));
   requireCheck(epicKeys.length===4&&[1,2,3,4].every(n=>epicKeys.includes(`epic-${n}`)),'Sprint YAML must list epics 1 through 4');
   const storyKeys=keys.filter(k=>/^\d+-\d+-/.test(k));
   const numericIds=storyKeys.map(k=>k.match(/^(\d+)-(\d+)-/).slice(1).join('.'));
   requireCheck(storyKeys.length===index.length&&new Set(numericIds).size===index.length&&index.every(s=>numericIds.includes(s.id)),'Sprint story IDs must match story-index.json');
   requireCheck(storyKeys.every(k=>development[k]==='backlog'),'Every sprint story must remain backlog');
   requireCheck(epicKeys.every(k=>development[k]==='backlog'),'Every sprint epic must remain backlog');
   requireCheck([1,2,3,4].every(n=>['optional','done'].includes(development[`epic-${n}-retrospective`])),'Every epic must have a valid retrospective entry');
   requireCheck(keys.length===epicKeys.length+storyKeys.length+4,'Unexpected sprint tracking entry');
  }
 } catch(error){requireCheck(false,`Sprint YAML parse failed: ${error.message}`);}
}
if(errors.length){console.error('STRUCTURAL GATE FAIL\n'+errors.join('\n'));process.exit(1);}
console.log(`STRUCTURAL GATE PASS: ${epicSections.length} epics, ${chunks.length} stories; per-epic counts ${perEpic.join(",")}; 29 requirements, 9 AD, ${ids.length} active red tests; protected hashes unchanged; no new FR-15 matches.\nSprint YAML validated without writing; all stories backlog.\nGLOBAL READINESS: see planning/implementation-readiness-report-solu2-run5.md and planning/readiness-gate-report.md for the skill verdict and sign-off.`);
