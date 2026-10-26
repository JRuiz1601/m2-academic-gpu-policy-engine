// =============================================================================
// dto.ts — Data transfer objects of Module M2 Academic GPU Policy Engine (types only).
// Phase: Solu-2 Phase 2, Step 2.2 (task P2-API-1). TypeScript, strict mode, no runtime code.
//
// Rules applied (decision A1): primitive types only (string, integer-valued number, boolean, arrays, string-literal
// unions); no class, no framework type, no Date object, no any, no floating-point field. Every instant is a string in
// the form YYYY-MM-DDTHH:MM:SS.sssZ (ruling M3). Every field names its source in a trailing comment.
// Field names equal the schema column names where a DTO mirrors a stored record (decision A5).
//
// Source tags: AR = planning/ARCHITECTURE.md, CT = planning/detailed-design/contracts.md, PRD = planning/prd.md,
// SQL = planning/detailed-design/schemas/001_m2_schema.sqlite.sql (same names in the PostgreSQL file).
// A name or a shape marked "PROPOSED, human to confirm" is a choice the files do not settle.
// The DTO names (EvaluateRequestDto, EvaluateResponseDto, ...) are PROPOSED, human to confirm (decision A2).
// =============================================================================

// ---------------------------------------------------------------------------
// 1. Shared scalar aliases
// ---------------------------------------------------------------------------

/** A UUID in text form. SQL: uuid columns (PostgreSQL) / 36-character text (SQLite). */
export type UuidString = string;
/** A uuid7: the version nibble is 7. SQL: decision.decision_id, decision_outbox.outbox_id, audit_events.id; AR 4.2. */
export type Uuid7String = string;
/** An instant, UTC, millisecond precision, YYYY-MM-DDTHH:MM:SS.sssZ. Ruling M3; SQL instant columns. */
export type InstantString = string;
/** An actor id (never a name). AR M2-AD-8 "actor ids only"; SQL: *.actor_id. */
export type ActorIdString = string;
/** The policy version identifier: the integer published_seq. AR 4.1 POLICY_VERSION (D8); SQL: policy_version.published_seq. */
export type PolicyVersionSeq = number;
/** A sha256 content hash, 64 lowercase hexadecimal characters. SQL: policy_version.content_hash. */
export type Sha256Hex = string;
/** A policy document id (one of the 12 of PRD 5.3). SQL: policy_document.doc_id. */
export type PolicyDocId = string;

// ---------------------------------------------------------------------------
// 2. Closed sets (string-literal unions)
// ---------------------------------------------------------------------------

/** PRD 5.2 closed set of DENY causes; SQL: decision_cause_enum. */
export type DecisionCause =
  | 'INVALID_REQUEST'
  | 'ACTOR_UNKNOWN'
  | 'MODEL_NOT_FOUND'
  | 'NO_SUCH_HARDWARE'
  | 'HARDWARE_FAILING'
  | 'NOT_AUTHORIZED'
  | 'WINDOW_PROTECTED'
  | 'FREEZE_ACTIVE'
  | 'QUOTA_EXHAUSTED'
  | 'DEPENDENCY_UNAVAILABLE';

/** PRD 5.1; SQL: decision.outcome. */
export type DecisionOutcome = 'ALLOW' | 'DENY' | 'CONSTRAIN';
/** PRD 5.1; SQL: decision.admission. */
export type DecisionAdmission = 'ADMITTED' | 'QUEUED' | 'REJECTED';
/** PRD 5.1; SQL: decision.authority. */
export type DecisionAuthority = 'PROVISIONAL' | 'FINAL';
/** PRD 5.2; SQL: trace_entry.state (three states, no fourth). */
export type TraceState = 'MATCH' | 'NO_MATCH' | 'NOT_EVALUATED';
/** PRD 5.2; SQL: trace_entry.bound_role. */
export type BoundRole = 'governing' | 'superseded' | 'outside_horizon';
/** PRD 5.2; SQL: decision_constraint.kind. */
export type ConstraintKind =
  | 'RESOURCE_SUBSTITUTION'
  | 'HARD_DEADLINE'
  | 'QUEUE_ONLY'
  | 'QUOTA_CAP'
  | 'WINDOW_SCOPE'
  | 'MODEL_VARIANT';
/** PRD 5.2 workload kinds. */
export type WorkloadKind =
  | 'INTERACTIVE_INFERENCE'
  | 'BACKGROUND_BATCH'
  | 'TRAINING'
  | 'EVALUATION'
  | 'EXAM_BOUND';
/** AR 4.1; SQL: decision.parent_kind (R2: two values). */
export type ParentKind = 'ROOT' | 'DERIVED';
/** AR 4.1; SQL: decision.submitted_by. */
export type SubmittedBy = 'HUMAN' | 'SYSTEM';
/** AR 4.1; SQL: freeze.scope. */
export type FreezeScope = 'ALL' | 'SUBJECT' | 'NODE_CLASS';
/** AR 4.1; SQL: freeze.state (stored intent). */
export type FreezeStoredState = 'DRAFT' | 'ACTIVE' | 'LIFTED' | 'EXPIRED'; // SQL: freeze.state; EXPIRED is stored only by the closing step of activateFreeze (triage decision D5)
/** AR 5.1 GET /policy/freezes/{id}: the computed lifecycle state adds EXPIRED (AR 4.2: computed, never swept). */
export type FreezeLifecycleState = 'DRAFT' | 'ACTIVE' | 'LIFTED' | 'EXPIRED';
/** AR 5.2 policy.decision.failed.v1 stage. */
export type FailureStage = 'PORT_FETCH' | 'CONTEXT_BUILD' | 'RENDER';
/** AR 4.1; SQL: obligation_observation.state; AR 5.2 obligation.ack.v1. */
export type ObligationState = 'ACKED' | 'MISSED' | 'UNCONFIRMED';

// ---------------------------------------------------------------------------
// 3. ExplanationDto (PDF Step 2.2: "rule IDs, observed values, thresholds")
// ---------------------------------------------------------------------------

/** One observed fact value. PRD 5.1 TraceEntry.evidence ("dotted fact paths + values", AR 4.1 trace_entry.evidence). */
export interface ObservedValueDto {
  fact_path: string; // AR 4.1 trace_entry.evidence: dotted fact path
  value: string | number | boolean | null; // AR 4.1 trace_entry.evidence: observed value (integers only, AR 4.2)
}

/** One threshold a rule compared an observed value against. PRD 6.2 rule conditions. PROPOSED, human to confirm (shape). */
export interface ThresholdDto {
  fact_path: string; // PRD 6.2: the fact the threshold applies to
  comparator: 'LT' | 'LE' | 'EQ' | 'GE' | 'GT' | 'IN' | 'NOT_IN'; // PROPOSED, human to confirm: the files name conditions in prose only
  value: string | number | boolean | null; // PRD 6.2: the threshold value
}

/** The explanation payload (CT section 2 Q4). Derived from trace[] and citations[]; not stored as a row. PROPOSED, human to confirm (shape). */
export interface ExplanationDto {
  primary_rule_id: string; // CT evaluateRequest Q4; SQL: decision.primary_rule_id
  rule_ids: string[]; // CT Q4: rule ids cited (primary rule first, then rules named in trace evidence)
  observed_values: ObservedValueDto[]; // CT Q4: values cited
  thresholds: ThresholdDto[]; // CT Q4: thresholds cited
  citation_ids: PolicyDocId[]; // CT Q4; SQL: decision_citation.doc_id (lexicographic order, AR 4.2)
}

// ---------------------------------------------------------------------------
// 4. The Decision (PRD 5.1) and its parts
// ---------------------------------------------------------------------------

/** PRD 5.1 TraceEntry; SQL: trace_entry. */
export interface TraceEntryDto {
  seq: number; // SQL: trace_entry.seq (per-decision ordinal)
  rule_id: string; // SQL: trace_entry.rule_id
  state: TraceState; // SQL: trace_entry.state
  evidence: ObservedValueDto[]; // SQL: trace_entry.evidence (JSON array of fact paths and values)
  precedence: number; // SQL: trace_entry.precedence, range -1..1000 (AR M2-AD-2)
  bound_role: BoundRole | null; // SQL: trace_entry.bound_role
}

/** PRD 5.1 suppressed[]; SQL: suppressed_rule. */
export interface SuppressedRuleDto {
  seq: number; // SQL: suppressed_rule.seq
  rule_id: string; // SQL: suppressed_rule.rule_id
  would_have_fired_on: ObservedValueDto[]; // SQL: suppressed_rule.would_have_fired_on (the fact that would have fired it)
}

/** Discriminated union on kind. AR 4.1 CONSTRAINT.value; the member shapes are taken from PRD 6.2 rows and are PROPOSED, human to confirm. */
export type ConstraintValueDto =
  | { kind: 'HARD_DEADLINE'; must_checkpoint_by: InstantString } // PRD 6.2 R-BOUND-01
  | { kind: 'QUEUE_ONLY'; queue_estimate_ref: string } // PRD 6.2 R-CONTEND-01
  | { kind: 'QUOTA_CAP'; cap_value: number; requires_commit_confirmation: boolean } // PRD 6.2 R-QUOTA-02; cap_value is an integer in quota units (PRD FR-8), unit carried by the quota fact
  | { kind: 'WINDOW_SCOPE'; boundary_ref: string } // PRD 6.1 guard on a bound in the past; PRD 6.2 R-FRZ-02
  | { kind: 'MODEL_VARIANT'; model_ref: string } // PRD 6.2 R-TIER-03
  | { kind: 'RESOURCE_SUBSTITUTION'; requested_gpu_count: number; requested_vram_gb_per_gpu: number }; // PRD 6.2 R-TIER-03

/** PRD 5.1 Constraint{ kind, value, reason, enforced_by, deadline }; SQL: decision_constraint. */
export interface ConstraintDto {
  constraint_id: UuidString; // SQL: decision_constraint.constraint_id
  kind: ConstraintKind; // SQL: decision_constraint.kind
  value: ConstraintValueDto; // SQL: decision_constraint.value
  reason: string; // PRD 5.1 Constraint.reason; not stored in decision_constraint (see events.md "Mismatches found")
  enforced_by: string; // SQL: decision_constraint.enforced_by (non-empty; AR M2-AD-5)
  deadline: InstantString | null; // SQL: decision_constraint.deadline (AR M2-AD-5: required for HARD_DEADLINE, QUEUE_ONLY, QUOTA_CAP)
}

/** PRD 5.1 Decision, with trace[] and evidence_snapshot_ref embedded (AR 5.1, D6). */
export interface DecisionDto {
  decision_id: Uuid7String; // SQL: decision.decision_id
  outcome: DecisionOutcome; // SQL: decision.outcome
  admission: DecisionAdmission; // SQL: decision.admission
  authority: DecisionAuthority; // SQL: decision.authority
  primary_rule_id: string; // SQL: decision.primary_rule_id
  cause: DecisionCause | null; // SQL: decision.cause (non-null iff outcome = DENY)
  rationale: string; // SQL: decision.rationale
  next_actions: string[]; // SQL: decision.next_actions (JSON array; the sentinel NO_ALTERNATIVE_AVAILABLE counts as an entry)
  constraints: ConstraintDto[]; // PRD 5.1; SQL: decision_constraint rows
  trace: TraceEntryDto[]; // PRD 5.1, AR 5.1 (D6); SQL: trace_entry rows
  suppressed: SuppressedRuleDto[]; // PRD 5.1; SQL: suppressed_rule rows
  citations: PolicyDocId[]; // PRD 5.1; SQL: decision_citation.doc_id
  policy_version: PolicyVersionSeq; // SQL: decision.policy_version
  content_hash: Sha256Hex; // AR M2-AD-7 (on every Decision); not a decision column: read through policy_version
  engine_version: string; // AR M2-AD-7; not a decision column: read through policy_version
  campus_tz: string; // AR M2-AD-7; SQL: fact_snapshot.campus_tz
  tzdata_version: string; // AR M2-AD-7; SQL: fact_snapshot.tzdata_version
  evaluated_at: InstantString; // SQL: decision.evaluated_at (= fact_snapshot.campus_now)
  valid_until: InstantString | null; // SQL: decision.valid_until (non-null for ALLOW and CONSTRAIN; later than evaluated_at, except the NP-9 guard ALLOW where it equals evaluated_at, ruling DL-54)
  must_checkpoint_by: InstantString | null; // SQL: decision.must_checkpoint_by (= valid_until when non-null)
  retry_after_ms: number | null; // SQL: decision.retry_after_ms
  stale_facts: string[]; // PRD 5.1; SQL: fact_snapshot.staleness (port ids used beyond their display tolerance)
  evidence_snapshot_ref: string; // SQL: decision.evidence_snapshot_ref
  request_chain_id: string; // SQL: decision.request_chain_id
  subject_id: string; // SQL: decision.subject_id (N2; PRD 5 Request.subject_id)
  model_ref: string; // SQL: decision.model_ref (N2; PRD 5 Request.model_ref)
  node_class_id: string | null; // SQL: decision.node_class_id (N2; nullable; the PRD Request has no node_class_id)
  derived_from: Uuid7String | null; // SQL: decision.derived_from
  parent_kind: ParentKind; // SQL: decision.parent_kind
  depth: number; // SQL: decision.depth (0 or 1)
  originating_actor_id: ActorIdString; // SQL: decision.originating_actor_id
  submitted_by: SubmittedBy; // SQL: decision.submitted_by
  explanation: ExplanationDto; // CT Q4; derived, not stored; PROPOSED, human to confirm (field on the Decision)
}

// ---------------------------------------------------------------------------
// 5. Core operation 1 — evaluateRequest (POST /policy/decisions; CT section 2)
// ---------------------------------------------------------------------------

/** HTTP headers of POST /policy/decisions. AR 5.1 (D2): required, unique per (actor_id, key). */
export interface EvaluateRequestHeadersDto {
  'Idempotency-Key': string; // AR 5.1; SQL: idempotency_key."key" (length and charset not stated: only non-empty is enforced)
}

/** Body of POST /policy/decisions: the Request of PRD 5, plus derived_from (AR 5.1, D7). */
export interface EvaluateRequestDto {
  request_id: string; // PRD 5 Request.request_id
  request_chain_id: string; // PRD 5 Request.request_chain_id; SQL: decision.request_chain_id
  actor_ref: ActorIdString; // PRD 5 Request.actor_ref (must equal the session actor, AR M2-AD-9)
  workload_kind: WorkloadKind; // PRD 5 Request.workload_kind
  subject_id: string; // PRD 5 Request.subject_id
  model_ref: string; // PRD 5 Request.model_ref
  requested_gpu_count: number; // PRD 5, FR-1: integer in [1, 2]
  requested_vram_gb_per_gpu: number; // PRD 5, FR-1: 24 or 48
  expected_duration_min: number; // PRD 5, FR-1: integer in [1, 4320]
  exam_binding: string | null; // PRD 5 Request.exam_binding (a reservation id)
  derived_from?: Uuid7String; // AR 5.1 (D7): optional parent decision id
}

/** Body of the 200 response of POST /policy/decisions: a Decision for all three outcomes (AR 5.1, K1). */
export type EvaluateResponseDto = DecisionDto;

/** Query of POST /policy/decisions/preview. AR 5.1 (EDGE-10): gated by role_tier >= INSTRUCTOR and ALLOW_CLOCK_OVERRIDE. */
export interface PreviewDecisionQueryDto {
  evaluated_at_override?: InstantString; // AR 5.1
}

// ---------------------------------------------------------------------------
// 6. Core operation 2 — previewFreeze (POST /policy/freezes/preview; CT section 2)
// ---------------------------------------------------------------------------

/** Body of POST /policy/freezes/preview. CT previewFreeze: the body carries draft_id (AR 5.1 does not state the body: PROPOSED, human to confirm). */
export interface PreviewFreezeRequestDto {
  draft_id: UuidString; // SQL: freeze_draft.draft_id
}

/** Body of the 200 response of POST /policy/freezes/preview. AR 5.1; CT previewFreeze Q1. */
export interface PreviewFreezeResponseDto {
  preview_token: string; // AR 5.1: carries the preview_run_id, signed with HMAC(server_secret, draft_id || content_hash || actor_id || issued_at) (triage decision D7); encoding not stated
  denied_count: number; // SQL: preview_run.denied_count
  survivors: string[]; // SQL: preview_run.survivors (ids; element type PROPOSED, human to confirm)
  next_protected_window: InstantString | null; // SQL: preview_run.next_protected_window
  runtime_snapshot: 'AVAILABLE' | 'UNAVAILABLE'; // AR 5.1, CT previewFreeze Q1 (N3); stored as boolean preview_run.runtime_snapshot: true = 'AVAILABLE', false = 'UNAVAILABLE'
  expires_at: InstantString; // SQL: preview_run.expires_at (= issued_at + 60 s)
}

// ---------------------------------------------------------------------------
// 7. Core operation 3 — activateFreeze (POST /policy/freezes/{id}/activate; CT section 2)
// ---------------------------------------------------------------------------

/** Body of POST /policy/freezes/{id}/activate; the path id is the draft_id (CT activateFreeze). */
export interface ActivateFreezeRequestDto {
  reason: string; // CT activateFreeze P6 (non-empty); SQL: freeze.reason
  preview_token: string; // AR 5.1
}

/** Body of the 201 response of POST /policy/freezes/{id}/activate. AR 5.1; CT activateFreeze Q1. */
export interface ActivateFreezeResponseDto {
  freeze_id: UuidString; // SQL: freeze.freeze_id
  policy_version: PolicyVersionSeq; // SQL: freeze.policy_version
}

// ---------------------------------------------------------------------------
// 8. Errors
// ---------------------------------------------------------------------------

/** Exactly the CODE column of the Typed Error Catalog (CT section 3: 28 request-level and freeze-route codes + 10 DECISION.cause members = 38). */
export type ErrorCodeDto =
  | 'WIRE_SHAPE_INVALID'
  | 'IDEMPOTENCY_KEY_MISSING'
  | 'IDEMPOTENCY_BODY_MISMATCH'
  | 'IDEMPOTENCY_KEY_EXPIRED'
  | 'UNAUTHENTICATED'
  | 'ROLE_INSUFFICIENT'
  | 'CLOCK_OVERRIDE_FORBIDDEN'
  | 'DERIVED_FROM_INVALID'
  | 'FREEZE_STATE_UNREADABLE'
  | 'DECISION_NOT_PRODUCED'
  | 'SNAPSHOT_EVICTED'
  | 'VERSION_NOT_FOUND'
  | 'REGISTRY_UNREADABLE'
  | 'READY_CHECK_FAILED'
  | 'DRAFT_NOT_FOUND'
  | 'FREEZE_NOT_FOUND'
  | 'FREEZE_NOT_LIFTABLE'
  | 'DRAFT_EXPIRED'
  | 'MISSING_REASON'
  | 'WINDOW_INVALID_RANGE'
  | 'WINDOW_IN_PAST'
  | 'TOKEN_ABSENT'
  | 'TOKEN_STALE'
  | 'TOKEN_ACTOR_MISMATCH'
  | 'TOKEN_CONSUMED'
  | 'PREVIEW_EXPIRED'
  | 'DUPLICATE_ACTIVE_FREEZE'
  | 'PREVIEW_UNAVAILABLE'
  | DecisionCause;

/** The body of every non-Decision error response (AR 2.1.1 "problem-details body"; CT section 3). */
export interface ErrorBodyDto {
  code: ErrorCodeDto; // decision A2 names the field `code`; AR 12 ARCH-23 and CT 3.1 name it error_code (see Mismatches)
  http_status: number; // CT section 3 column "HTTP / exit status"
  message: string; // CT section 3 column "explanation template", rendered
  retry_after_ms: number | null; // AR 12 ARCH-23 body {error_code, failing_port, retry_after_ms}
  failing_port: string | null; // AR 12 ARCH-23
  stage: FailureStage | null; // CT DECISION_NOT_PRODUCED (stage in {PORT_FETCH, CONTEXT_BUILD}); AR 5.2 policy.decision.failed.v1
  failing_check: string | null; // CT READY_CHECK_FAILED ({check_name}); AR 5.1 /ready "503 with the failing check named"
}

// ---------------------------------------------------------------------------
// 9. Other routes of AR 5.1 that accept or return a body
// ---------------------------------------------------------------------------

/** One rule record. AR 5.1 GET /policy/rules: "precedence, condition, outcome, citations, template id". Shape PROPOSED, human to confirm. */
export interface RuleDto {
  rule_id: string; // PRD 6.2
  precedence: number; // PRD 6.2, range -1..1000
  condition: string; // AR 5.1: rendered condition text
  outcome: string; // AR 5.1: outcome text (for example DENY(FREEZE_ACTIVE))
  citation_ids: PolicyDocId[]; // AR 5.1 "citations"
  rationale_template_id: string; // AR 5.1 "template id"
}

/** Body of the 200 response of GET /policy/rules?version=. AR 5.1. */
export interface RulesResponseDto {
  published_seq: PolicyVersionSeq; // SQL: policy_version.published_seq (the version returned)
  rules: RuleDto[]; // AR 5.1
}

/** One version manifest. AR 5.1 GET /policy/versions: "Version history, content hashes, published_seq". */
export interface VersionManifestDto {
  published_seq: PolicyVersionSeq; // SQL: policy_version.published_seq
  published_at: InstantString; // SQL: policy_version.published_at
  content_hash: Sha256Hex; // SQL: policy_version.content_hash
  engine_version: string; // SQL: policy_version.engine_version
  campus_tz: string; // SQL: policy_version.campus_tz
}

/** Body of the 200 response of GET /policy/versions?since_seq=. AR 5.1. */
export interface VersionsResponseDto {
  versions: VersionManifestDto[]; // AR 5.1
}

/** One policy document row. SQL: policy_document. */
export interface PolicyDocumentDto {
  doc_id: PolicyDocId; // SQL: policy_document.doc_id
  title: string; // SQL: policy_document.title
  owner: string; // SQL: policy_document.owner
  version: string; // SQL: policy_document.version
  content_hash: Sha256Hex | null; // SQL: policy_document.content_hash (NULL for the 12 seed rows, ruling M4)
}

/** Body of the 200 response of GET /policy/versions/{v}. AR 5.1: the manifest, the rendered rule records and the 12 policy documents. */
export interface VersionDetailResponseDto {
  manifest: VersionManifestDto; // AR 5.1
  rules: RuleDto[]; // AR 5.1
  policy_documents: PolicyDocumentDto[]; // AR 5.1 "the 12 POLICY_DOCUMENT rows"
}

/**
 * Body of POST /policy/versions/publish (route 14; decision DL-41, 2026-10-21). The sources do not state what the request
 * carries (the rule set artefact, its location, or nothing): open point 12 of contracts.md section 6. Empty object until decided.
 */
export type PublishVersionRequestDto = Record<string, never>;

/**
 * Body of the 201 response of POST /policy/versions/publish. The manifest of the new version (same shape as
 * GET /policy/versions). Status and body: PROPOSED, human to confirm (open point 12 of contracts.md section 6).
 */
export type PublishVersionResponseDto = VersionManifestDto;

/** Body of POST /policy/freezes. AR 5.1 "Create a FreezeDraft"; fields from the draft_body of AR 4.1 and the FREEZE columns. Shape PROPOSED, human to confirm. */
export interface CreateFreezeDraftRequestDto {
  scope: FreezeScope; // SQL: freeze.scope
  subject_ids: string[]; // SQL: freeze.subject_ids (lexicographic order, AR 4.2)
  node_class_ids: string[]; // SQL: freeze.node_class_ids
  allowances: string[]; // SQL: freeze.allowances (exact reservation ids)
  starts_at: InstantString; // SQL: freeze.starts_at
  ends_at: InstantString; // SQL: freeze.ends_at
  reason: string; // SQL: freeze.reason (non-empty, CT MISSING_REASON)
}

/** Body of the 201 response of POST /policy/freezes. AR 5.1. */
export interface CreateFreezeDraftResponseDto {
  draft_id: UuidString; // SQL: freeze_draft.draft_id
  content_hash: string; // SQL: freeze_draft.content_hash
  expires_at: InstantString; // SQL: freeze_draft.expires_at (= created_at + 24 h)
}

/** Body of POST /policy/freezes/{id}/lift. AR 5.1 "Requires lift_reason". */
export interface LiftFreezeRequestDto {
  lift_reason: string; // SQL: freeze.lift_reason (non-empty)
}

/** Body of the 200 response of POST /policy/freezes/{id}/lift. AR 5.1 gives `200` only; shape PROPOSED, human to confirm. */
export interface LiftFreezeResponseDto {
  freeze_id: UuidString; // SQL: freeze.freeze_id
  state: 'LIFTED'; // SQL: freeze.state
}

/** Body of the 200 response of GET /policy/freezes/{id}. AR 5.1 field list. */
export interface FreezeDto {
  freeze_id: UuidString; // SQL: freeze.freeze_id
  scope: FreezeScope; // SQL: freeze.scope
  subject_ids: string[]; // SQL: freeze.subject_ids
  node_class_ids: string[]; // SQL: freeze.node_class_ids
  allowances: string[]; // SQL: freeze.allowances
  starts_at: InstantString; // SQL: freeze.starts_at
  ends_at: InstantString; // SQL: freeze.ends_at
  state: FreezeLifecycleState; // AR 5.1 "the computed lifecycle state"
  reason: string; // SQL: freeze.reason
  lift_reason: string | null; // SQL: freeze.lift_reason
  lifted_by: ActorIdString | null; // AR 5.1; not a freeze column (recorded in audit_events, see Mismatches)
  activated_by: ActorIdString | null; // SQL: freeze.activated_by
  activated_by_role_tier: string | null; // SQL: freeze.activated_by_role_tier
  activated_at: InstantString | null; // SQL: freeze.activated_at
  supersedes: UuidString | null; // SQL: freeze.supersedes
  successor_freeze_id: UuidString | null; // derived on read: the freeze whose supersedes equals this freeze_id; not a column (decision DL-43, 2026-10-21; UX-4 "superseded by")
  policy_version: PolicyVersionSeq; // SQL: freeze.policy_version
}

/** A live draft as listed by GET /policy/freezes. SQL: freeze_draft. */
export interface FreezeDraftDto {
  draft_id: UuidString; // SQL: freeze_draft.draft_id
  content_hash: string; // SQL: freeze_draft.content_hash
  created_by: ActorIdString; // SQL: freeze_draft.created_by
  created_at: InstantString; // SQL: freeze_draft.created_at
  expires_at: InstantString; // SQL: freeze_draft.expires_at
}

/** One item of GET /policy/freezes. AR 5.1 "freeze states and live drafts". Discriminated union PROPOSED, human to confirm. */
export type FreezeListItemDto =
  | { item_kind: 'FREEZE'; freeze: FreezeDto }
  | { item_kind: 'DRAFT'; draft: FreezeDraftDto };

/** Query of GET /policy/freezes. AR 5.1 "filterable by state, scope, from, to". */
export interface FreezeListQueryDto {
  state?: FreezeLifecycleState; // AR 5.1
  scope?: FreezeScope; // AR 5.1
  from?: InstantString; // AR 5.1
  to?: InstantString; // AR 5.1
}

/** Body of the 200 response of GET /policy/freezes. AR 5.1; the `items` and `count` names come from UX-5 ("items: [] and a count: 0"). PROPOSED, human to confirm. */
export interface FreezeListResponseDto {
  items: FreezeListItemDto[]; // UX-5
  count: number; // UX-5
}

/** Body of the 200 response of GET /health. AR 5.1 gives `200` only; shape PROPOSED, human to confirm. */
export interface HealthResponseDto {
  status: 'OK'; // AR 5.1 "Liveness"
}

/** One readiness check. AR 5.1 /ready: registry validated, clock reachable at stratum <= 4, own store writable, bus reachable. */
export interface ReadyCheckDto {
  check_name: 'registry' | 'clock' | 'store' | 'bus'; // AR 5.1; names PROPOSED, human to confirm
  ok: boolean; // AR 5.1
}

/** Body of the 200 response of GET /ready. AR 5.1; shape PROPOSED, human to confirm. */
export interface ReadyResponseDto {
  status: 'READY'; // AR 5.1
  checks: ReadyCheckDto[]; // AR 5.1
}
