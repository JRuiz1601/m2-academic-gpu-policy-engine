// Quality gate (story 2.5): runs the cheap checks itself and reads the evidence files of the expensive ones
// (k6 summary from `npm run nfr`, Playwright JSON from `npm run e2e`). Writes test/evidence/quality-gate.json.
// Verdict: FAIL when any measured criterion breaches its threshold; CONCERNS when evidence is missing (not executed); PASS otherwise.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const THRESHOLDS = { p95_ms: 50, error_rate: 0, checks_rate: 1, domain_branches_pct: 90, e2e_failed: 0, e2e_skipped: 0 };
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const criteria = [];
const add = (name, status, measured, threshold, note = '') => criteria.push({ name, status, measured, threshold, note });
const run = (args) => spawnSync(npm, args, { encoding: 'utf8', shell: process.platform === 'win32' });
const readJson = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null);
const metric = (m, key) => m?.values?.[key] ?? m?.[key];

// 1. typecheck + lint + unit/integration tests
const check = run(['run', 'check']);
add('npm run check (typecheck, lint, tests)', check.status === 0 ? 'PASS' : 'FAIL', `exit ${check.status}`, 'exit 0');

// 2. zero-sleep lint
const lint = run(['run', 'lint']);
add('zero-sleep lint', lint.status === 0 && /Zero-sleep lint PASS/.test(lint.stdout) ? 'PASS' : 'FAIL', `exit ${lint.status}`, 'no timing-based waits in test code');

// 3. coverage: branch coverage of src/domain/**
const cov = run(['run', 'coverage']);
const summary = readJson('coverage/coverage-summary.json');
if (cov.status !== 0 || !summary) {
  add('domain branch coverage', cov.status !== 0 ? 'FAIL' : 'CONCERNS', cov.status !== 0 ? `coverage run exit ${cov.status}` : 'no coverage summary', `>= ${THRESHOLDS.domain_branches_pct}%`);
} else {
  let covered = 0, total = 0;
  for (const [file, v] of Object.entries(summary)) {
    if (file === 'total' || !/[\\/]src[\\/]domain[\\/]/.test(file)) continue;
    covered += v.branches.covered;
    total += v.branches.total;
  }
  const pct = total ? (covered / total) * 100 : 0;
  add('domain branch coverage', pct >= THRESHOLDS.domain_branches_pct ? 'PASS' : 'FAIL', `${pct.toFixed(2)}% (${covered}/${total})`, `>= ${THRESHOLDS.domain_branches_pct}%`);
}

// 4. NFR: k6 summary from the burst
const k6 = readJson('test/evidence/nfr/k6-summary.json');
if (!k6) {
  add('NFR p95 latency', 'CONCERNS', 'not executed (no k6 summary)', `< ${THRESHOLDS.p95_ms} ms`);
  add('NFR error rate', 'CONCERNS', 'not executed (no k6 summary)', '== 0');
} else {
  const p95 = metric(k6.metrics.http_req_duration, 'p(95)');
  const failed = metric(k6.metrics.http_req_failed, 'rate') ?? metric(k6.metrics.http_req_failed, 'value');
  const checks = metric(k6.metrics.checks, 'rate') ?? metric(k6.metrics.checks, 'value');
  add('NFR p95 latency', p95 < THRESHOLDS.p95_ms ? 'PASS' : 'FAIL', `${p95.toFixed(2)} ms`, `< ${THRESHOLDS.p95_ms} ms`);
  add('NFR error rate', failed === THRESHOLDS.error_rate && checks === THRESHOLDS.checks_rate ? 'PASS' : 'FAIL', `http_req_failed ${failed}, checks ${checks}`, 'http_req_failed == 0, checks == 1');
}

// 5. E2E: Playwright JSON report
const e2e = readJson('test/evidence/e2e/results.json');
if (!e2e) {
  add('E2E (Playwright)', 'CONCERNS', 'not executed (no results.json)', '0 failed, 0 skipped');
} else {
  const s = e2e.stats;
  const bad = s.unexpected + s.flaky + s.skipped;
  add('E2E (Playwright)', bad === 0 ? 'PASS' : 'FAIL', `${s.expected} passed, ${s.unexpected} failed, ${s.flaky} flaky, ${s.skipped} skipped`, '0 failed, 0 flaky, 0 skipped');
}

const verdict = criteria.some((c) => c.status === 'FAIL') ? 'FAIL' : criteria.some((c) => c.status === 'CONCERNS') ? 'CONCERNS' : 'PASS';
const report = { generated_at: new Date().toISOString(), verdict, thresholds: THRESHOLDS, criteria };
mkdirSync('test/evidence', { recursive: true });
writeFileSync('test/evidence/quality-gate.json', JSON.stringify(report, null, 2) + '\n');
for (const c of criteria) console.log(`${c.status.padEnd(9)} ${c.name.padEnd(40)} ${c.measured}  [threshold ${c.threshold}]`);
console.log(`\nQuality gate verdict: ${verdict}`);
process.exit(verdict === 'FAIL' ? 1 : 0);
