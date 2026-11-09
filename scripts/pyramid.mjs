// Counts automated tests per layer and compares the distribution with the 70/20/10 pyramid (+ NFR).
// Layers are assigned by directory, never by renaming tests:
//   unit        = test/unit            (pure or in-memory, no sockets)
//   integration = test/atdd, test/harness, test/implementation (HTTP adapter, SQLite, contract, concurrency)
//   e2e         = tests/e2e            (Playwright; counted from test/evidence/e2e/results.json)
//   nfr         = tests/nfr            (k6 scenarios; counted as files)
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const run = spawnSync(npx, ['vitest', 'run', '--reporter=json'], { encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 });
const start = run.stdout.indexOf('{');
if (start < 0) {
  console.error('vitest produced no JSON report');
  process.exit(1);
}
const report = JSON.parse(run.stdout.slice(start));
const norm = (p) => p.replace(/\\/g, '/');
const counts = { unit: 0, integration: 0, e2e: 0 };
const perFile = [];
for (const file of report.testResults) {
  const path = norm(file.name);
  const n = file.assertionResults.length;
  const layer = /\/test\/unit\//.test(path) ? 'unit' : 'integration';
  counts[layer] += n;
  perFile.push([layer, path.split('/test/')[1], n]);
}
if (existsSync('test/evidence/e2e/results.json')) {
  const e2e = JSON.parse(readFileSync('test/evidence/e2e/results.json', 'utf8'));
  counts.e2e = e2e.stats.expected + e2e.stats.unexpected + e2e.stats.flaky + e2e.stats.skipped;
}
const nfrScripts = existsSync('tests/nfr') ? readdirSync('tests/nfr').filter((f) => f.endsWith('.js')).length : 0;
const total = counts.unit + counts.integration + counts.e2e;
const pct = (n) => ((n / total) * 100).toFixed(1);
console.log('| Layer | Tests | Share | Target |');
console.log('|---|---|---|---|');
console.log(`| Unit | ${counts.unit} | ${pct(counts.unit)} % | 70 % |`);
console.log(`| Integration | ${counts.integration} | ${pct(counts.integration)} % | 20 % |`);
console.log(`| E2E | ${counts.e2e} | ${pct(counts.e2e)} % | 10 % |`);
console.log(`| NFR (k6 scenarios) | ${nfrScripts} | not in the ratio | n/a |`);
console.log(`| Total (unit+integration+e2e) | ${total} | 100 % | |`);
console.log('\nPer file:');
for (const [layer, file, n] of perFile.sort((a, b) => a[0].localeCompare(b[0]) || b[2] - a[2])) console.log(`  ${layer.padEnd(12)} ${String(n).padStart(3)}  ${file}`);
