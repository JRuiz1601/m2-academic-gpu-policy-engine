import { test, expect } from '@playwright/test';
import { PolicyConsolePage } from './pages/PolicyConsolePage';

const STUDENT = { Authorization: 'Bearer student-demo-token' };
let seq = 0;
const evaluation = () => ({
  request_id: `e2e-req-${++seq}`,
  request_chain_id: `e2e-chain-${seq}`,
  actor_ref: 'mateo',
  workload_kind: 'INTERACTIVE_INFERENCE',
  subject_id: 'CS-101',
  model_ref: 'small-24',
  requested_gpu_count: 1,
  requested_vram_gb_per_gpu: 24,
  expected_duration_min: 30,
  exam_binding: null,
});

test.describe('Story 2.6: emergency freeze and policy console', () => {
  test('Rebecca freezes the fleet for the Final Exam and a non-exam request is denied', async ({ page, request }) => {
    const console_ = new PolicyConsolePage(page);
    await console_.open();
    await console_.actAs('Rebecca');
    await expect(console_.banner).toBeHidden();

    await console_.createFreezeDraft({ reason: 'Final Exam CS-101' });
    expect(await console_.reviewConsequences()).toContain('Trabajos afectados');
    await console_.confirmActivation();

    await expect(console_.banner).toBeVisible();
    await expect(console_.banner).toHaveText('FLEET COMPUTE FROZEN - EXAM IN PROGRESS');
    await expect(console_.freezeRow('ACTIVE')).toBeVisible();

    // Simultaneous API evaluation by a non-exam request (policy DENY is a 200 body by contract design).
    const response = await request.post('/policy/decisions', { headers: { ...STUDENT, 'Idempotency-Key': 'e2e-key-1' }, data: evaluation() });
    expect(response.status()).toBe(200);
    const decision = await response.json();
    expect(decision.outcome).toBe('DENY');
    expect(decision.primary_rule_id).toBe('R-FRZ-01');
    expect(decision.rationale).toContain('Emergency freeze active: Final Exam CS-101');

    await console_.liftFreeze('Exam finished (cleanup)');
  });

  test('lifting the freeze removes the banner and evaluation is allowed again', async ({ page, request }) => {
    const console_ = new PolicyConsolePage(page);
    await console_.open();
    await console_.actAs('Rebecca');
    await console_.createFreezeDraft({ reason: 'Final Exam CS-101' });
    await console_.reviewConsequences();
    await console_.confirmActivation();
    await expect(console_.banner).toBeVisible();

    await console_.liftFreeze('Exam finished');
    await expect(console_.banner).toBeHidden();
    await expect(console_.freezeRow('ACTIVE')).toHaveCount(0);
    await expect(console_.latestFreezeRow('LIFTED')).toBeVisible();

    const response = await request.post('/policy/decisions', { headers: { ...STUDENT, 'Idempotency-Key': 'e2e-key-2' }, data: evaluation() });
    expect(response.status()).toBe(200);
    expect((await response.json()).outcome).toBe('ALLOW');
  });

  test('a student session cannot operate the console and sees the structured 403 message', async ({ page }) => {
    const console_ = new PolicyConsolePage(page);
    await console_.open();
    await console_.actAs('Mateo');
    await console_.refreshFreezes();
    await expect(console_.statusMessage).toContainText('ROLE_INSUFFICIENT');
    await expect(console_.banner).toBeHidden();
  });
});
