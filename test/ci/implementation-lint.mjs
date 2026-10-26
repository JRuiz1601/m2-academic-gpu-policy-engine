import ts from 'typescript';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
function walk(path){return readdirSync(path,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(`${path}/${e.name}`):[`${path}/${e.name}`]);}
for(const path of walk('src').filter(p=>p.endsWith('.ts'))){
 const text=readFileSync(path,'utf8');
 const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);
 function visit(node){
  assert.notEqual(node.kind,ts.SyntaxKind.AnyKeyword,`${path}: explicit any`);
  if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node)){
   const name=node.moduleSpecifier?.text??'';
   assert(!/\/test\/|vitest|planning\//.test(name),`${path}: production imports preparation/tests`);
   if(path.includes('/domain/'))assert(!/^(node:|express|pg|better-sqlite3)/.test(name),`${path}: domain imports IO`);
  }
  if(path.includes('/domain/')&&ts.isCallExpression(node))assert(!['Date.now','Math.random'].includes(node.expression.getText(file)),`${path}: nondeterministic domain`);
  if(path.includes('/domain/')&&ts.isNewExpression(node)&&node.expression.getText(file)==='Date')assert(node.arguments?.length,`${path}: implicit wall clock`);
  ts.forEachChild(node,visit);
 }
 visit(file);
}
console.log('Implementation lint PASS: typed code, production boundaries, pure domain');
for(const path of walk('test').filter(p=>p.endsWith('.test.ts'))){const text=readFileSync(path,'utf8');assert(!/\b(?:test|it|describe)\.(skip|todo|only)\s*(?:\(|\.each)/.test(text),`${path}: excluded tests`);}
assert.equal(readFileSync('src/adapters/outbound/001_m2_schema.sqlite.sql','utf8'),readFileSync('planning/detailed-design/schemas/001_m2_schema.sqlite.sql','utf8'),'Runtime SQL diverges from agreed schema');
for(const f of readdirSync('planning/detailed-design/schemas'))assert.equal(readFileSync('docs/contracts/'+f,'utf8'),readFileSync('planning/detailed-design/schemas/'+f,'utf8'),'docs/contracts/'+f+' diverges from planning source');
assert(readFileSync('docs/prd.md','utf8').endsWith(readFileSync('planning/prd.md','utf8')),'docs/prd.md diverges from planning/prd.md');
console.log('Acceptance inventory PASS: no excluded tests; runtime migration matches contract; docs copies equal planning sources');
