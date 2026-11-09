// Story 2.5 (Flow D): 100 concurrent policy evaluations at class start.
// Run through `npm run nfr` (starts the server and passes BASE_URL), or: k6 run -e BASE_URL=http://127.0.0.1:3000 tests/nfr/policy-burst.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    class_start_burst: { executor: 'per-vu-iterations', vus: 100, iterations: 1, maxDuration: '30s' },
  },
  thresholds: {
    http_req_duration: ['p(95)<50'],
    http_req_failed: ['rate==0'],
    checks: ['rate==1'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3000';

export default function () {
  const body = JSON.stringify({
    request_id: `burst-req-${__VU}`,
    request_chain_id: `burst-chain-${__VU}`,
    actor_ref: 'mateo',
    workload_kind: 'INTERACTIVE_INFERENCE',
    subject_id: 'CS-101',
    model_ref: 'small-24',
    requested_gpu_count: 1,
    requested_vram_gb_per_gpu: 24,
    expected_duration_min: 30,
    exam_binding: null,
  });
  const res = http.post(`${BASE_URL}/policy/decisions`, body, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer student-demo-token',
      'Idempotency-Key': `burst-key-${__VU}`,
    },
  });
  check(res, {
    'status is 200': (r) => r.status === 200,
    'valid decision shape': (r) => {
      const d = r.json();
      return typeof d.outcome === 'string' && typeof d.primary_rule_id === 'string';
    },
  });
}

