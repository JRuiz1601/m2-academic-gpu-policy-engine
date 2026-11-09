// Cross-platform NFR runner (story 2.5): start the server on a free port with a temp SQLite DB, wait for the
// "listening" event (no sleeps), run the k6 burst, stop the server, print p95/p99/error rate, exit non-zero on failure.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SUMMARY = process.env.NFR_SUMMARY ?? 'test/evidence/nfr/k6-summary.json';
const SCRIPT = process.env.NFR_SCRIPT ?? 'tests/nfr/policy-burst.js';

function findK6() {
  if (spawnSync('k6', ['version']).status === 0) return 'k6';
  const winPath = 'C:\Program Files\k6\k6.exe';
  if (process.platform === 'win32' && existsSync(winPath)) return winPath;
  return null;
}

function startServer(dbPath) {
  const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'src/main.ts'], {
    env: { ...process.env, PORT: '0', HOST: '127.0.0.1', DATABASE_PATH: dbPath },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (d) => (stderr += String(d)));
  return new Promise((resolve, reject) => {
    child.once('exit', (code) => reject(new Error(`server exited ${code} before listening: ${stderr}`)));
    child.stdout.on('data', (data) => {
      const m = String(data).match(/http:\/\/127\.0\.0\.1:\d+/);
      if (m) resolve({ child, base: m[0] });
    });
  });
}

function stopServer(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null) return resolve();
    child.once('exit', () => resolve());
    child.kill('SIGTERM');
  });
}

const metric = (m, key) => m?.values?.[key] ?? m?.[key];

const k6 = findK6();
if (!k6) {
  console.error('k6 not found (install it: winget install k6 / https://grafana.com/docs/k6). NFR not executed.');
  process.exit(2);
}
const dir = mkdtempSync(join(tmpdir(), 'm2-nfr-'));
mkdirSync(join(SUMMARY, '..'), { recursive: true });
let server, exitCode = 1;
try {
  server = await startServer(join(dir, 'nfr.sqlite'));
  console.log(`server listening at ${server.base}`);
  const run = spawnSync(k6, ['run', '--summary-export', SUMMARY, '-e', `BASE_URL=${server.base}`, SCRIPT], { stdio: 'inherit' });
  exitCode = run.status ?? 1;
  const s = JSON.parse(readFileSync(SUMMARY, 'utf8')).metrics;
  const rows = [
    ['http_req_duration p(95) ms', metric(s.http_req_duration, 'p(95)')],
    ['http_req_duration p(99) ms', metric(s.http_req_duration, 'p(99)')],
    ['http_req_failed rate', metric(s.http_req_failed, 'rate') ?? metric(s.http_req_failed, 'value')],
    ['checks rate', metric(s.checks, 'rate') ?? metric(s.checks, 'value')],
  ];
  console.log('\nNFR summary (' + SCRIPT + ')');
  for (const [k, v] of rows) console.log(`  ${k.padEnd(30)} ${typeof v === 'number' ? v.toFixed(4) : String(v)}`);
  console.log(`  k6 exit code                   ${exitCode}`);
} finally {
  if (server) await stopServer(server.child);
  rmSync(dir, { recursive: true, force: true });
}
process.exit(exitCode);
