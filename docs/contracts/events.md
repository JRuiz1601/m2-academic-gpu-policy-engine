# events.md — Events of Module M2 Academic GPU Policy Engine

**Phase:** Solu-2 Phase 2, Step 2.2 (task P2-API-1) · **Source of the event list:** `planning/ARCHITECTURE.md` §5.2 only (8 events; none added) · **Format source:** `Material del Curso/task-solu2_UniversityAICompute_Workshop.pdf`, section "5. Phase 2", Step 2.2, row `events.md / JSON Schema`: "Every event/telemetry payload your module emits or ingests, with eventId, occurredAt (UTC, ISO-8601), schemaVersion." (text extracted from the PDF).
Field names follow `planning/ARCHITECTURE.md` §5.2 except where the schema files hold the stored column (decision A5); every difference is in the table "Mismatches found" at the end. Names and shapes marked *PROPOSED, human to confirm* are choices the files do not settle.

---

## 1. Reading rules

1. **Envelope (decision A3).** Every payload carries `eventId` (uuid7 string), `occurredAt` (UTC ISO-8601 with milliseconds, `YYYY-MM-DDTHH:MM:SS.sssZ`) and `schemaVersion` (integer, starting at 1). The envelope fields sit at the top level of the payload next to the business fields.
2. **Ids only (`AR` M2-AD-8; `AR` §5.2 closing paragraph).** No payload carries a name, an address, a token, a key, or template text. Actor ids are permitted.
3. **Direction.** OUT = this module publishes; IN = this module consumes. `obligation.ack.v1` is **IN** (`AR` §5.2, confirmed by R1e; G-03): it is published by the delegate (M9), journalled by this module in `obligation_observation`, and this module publishes no ack in V1 (`AR` D-8).
4. **Delivery.** Every event is at-least-once (`AR` §5.2). A consumer must treat a duplicate as the same record.
5. **JSON Schema** is draft 2020-12 in a fenced `json` block per event. `additionalProperties` is `false`.
6. Common patterns used in the schemas: uuid7 `^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$`; any uuid `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`; instant `^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$`.

---

## 2. Table of events

| # | Subject | Direction | Producer | Consumers | Delivery | Idempotency key for consumers | Stored as |
|---|---|---|---|---|---|---|---|
| 1 | `policy.decision.v1` | OUT | Decision Outbox | Audit Ledger, M8 (usage on commit), Observability | at-least-once | `decision_id` (`AR` §5.2) | `decision_outbox` row with `decision_id` set |
| 2 | `policy.decision.failed.v1` | OUT | Decision Shell | Audit Ledger, Observability | at-least-once | `failure_id` (confirmed, N4) | `decision_outbox` row with `failure_id` set (K4) |
| 3 | `policy.freeze.drafted.v1` | OUT | Freeze Aggregate | Observability | at-least-once | `eventId` (triage decision D3) | `decision_outbox` row with `draft_id` set, inserted in the same transaction as the draft (D3); `audit_events` records `FREEZE_DRAFT_CREATED` |
| 4 | `policy.freeze.activated.v1` | OUT | Freeze Aggregate | Gateway (cache invalidation), M9, Observability | at-least-once | `eventId` (triage decision D3) | `decision_outbox` row with `freeze_id` set, inserted in the same transaction as the activation (D3); `audit_events` records `FREEZE_ACTIVATED` |
| 5 | `policy.freeze.lifted.v1` | OUT | Freeze Aggregate | Gateway, Observability | at-least-once | `eventId` (triage decision D3) | `decision_outbox` row with `freeze_id` set, inserted in the same transaction as the lift (D3); `audit_events` records `FREEZE_LIFTED` |
| 6 | `policy.version.published.v1` | OUT | Rule Registry | Gateway, Observability, consoles | at-least-once | `eventId` (triage decision D3; `published_seq` is also unique per event) | `decision_outbox` row with `published_seq` set, inserted in the publish transaction (D3) |
| 7 | `job.lifecycle.v1` | IN | K8s / Kubeflow Bridge | Decision Shell → `obligation_observation` | permitted read under SPINE rule 5; not a decision input | `eventId` (PROPOSED, human to confirm) | `obligation_observation` |
| 8 | `obligation.ack.v1` | IN | the delegate (M9); no producer in V1 | Decision Shell → `obligation_observation`, Observability | at-least-once | `eventId` (PROPOSED, human to confirm) | `obligation_observation` |

---

## 3. Events

### 3.1 `policy.decision.v1` (OUT)

Payload fields from `AR` §5.2. `subject_id`, `model_ref` and `node_class` are read from the stored `decision` columns `subject_id`, `model_ref` and `node_class_id` (ruling N2; see Mismatches found, row 5). `evaluated_at`, `valid_until`, `must_checkpoint_by` are the `decision` columns of the same name.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "policy.decision.v1",
  "type": "object",
  "additionalProperties": false,
  "required": ["eventId", "occurredAt", "schemaVersion", "decision_id", "outcome", "admission", "authority", "cause", "primary_rule_id", "policy_version", "content_hash", "engine_version", "campus_tz", "actor_id", "subject_id", "model_ref", "node_class", "evaluated_at", "valid_until", "must_checkpoint_by", "constraint_kinds", "citation_ids", "stale_facts", "suppressed_rule_ids", "parent_kind", "request_chain_id", "evidence_snapshot_ref"],
  "properties": {
    "eventId": { "type": "string", "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$" },
    "occurredAt": { "type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$" },
    "schemaVersion": { "type": "integer", "minimum": 1 },
    "decision_id": { "type": "string", "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$" },
    "outcome": { "enum": ["ALLOW", "DENY", "CONSTRAIN"] },
    "admission": { "enum": ["ADMITTED", "QUEUED", "REJECTED"] },
    "authority": { "enum": ["PROVISIONAL", "FINAL"] },
    "cause": { "enum": ["INVALID_REQUEST", "ACTOR_UNKNOWN", "MODEL_NOT_FOUND", "NO_SUCH_HARDWARE", "HARDWARE_FAILING", "NOT_AUTHORIZED", "WINDOW_PROTECTED", "FREEZE_ACTIVE", "QUOTA_EXHAUSTED", "DEPENDENCY_UNAVAILABLE", null] },
    "primary_rule_id": { "type": "string", "minLength": 1 },
    "policy_version": { "type": "integer", "minimum": 1 },
    "content_hash": { "type": "string", "pattern": "^[0-9a-f]{64}$" },
    "engine_version": { "type": "string", "minLength": 1 },
    "campus_tz": { "type": "string", "minLength": 1 },
    "actor_id": { "type": "string", "minLength": 1 },
    "subject_id": { "type": "string", "minLength": 1 },
    "model_ref": { "type": "string", "minLength": 1 },
    "node_class": { "type": ["string", "null"], "minLength": 1 },
    "evaluated_at": { "type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$" },
    "valid_until": { "type": ["string", "null"], "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$" },
    "must_checkpoint_by": { "type": ["string", "null"], "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$" },
    "constraint_kinds": { "type": "array", "items": { "enum": ["RESOURCE_SUBSTITUTION", "HARD_DEADLINE", "QUEUE_ONLY", "QUOTA_CAP", "WINDOW_SCOPE", "MODEL_VARIANT"] } },
    "citation_ids": { "type": "array", "items": { "type": "string", "minLength": 1 }, "minItems": 1 },
    "stale_facts": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "suppressed_rule_ids": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "parent_kind": { "enum": ["ROOT", "DERIVED"] },
    "request_chain_id": { "type": "string", "minLength": 1 },
    "evidence_snapshot_ref": { "type": "string", "minLength": 1 }
  }
}
```

Example:

```json
{
  "eventId": "01900000-0000-7000-8000-0000000000e1",
  "occurredAt": "2026-04-09T03:10:44.950Z",
  "schemaVersion": 1,
  "decision_id": "01900000-0000-7000-8000-000000000001",
  "outcome": "CONSTRAIN",
  "admission": "ADMITTED",
  "authority": "FINAL",
  "cause": null,
  "primary_rule_id": "R-BOUND-01",
  "policy_version": 41,
  "content_hash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "engine_version": "1.0.0",
  "campus_tz": "America/Panama",
  "actor_id": "u-elena-vargas",
  "subject_id": "CS-340-CV",
  "model_ref": "vlm-70b",
  "node_class": "std-24",
  "evaluated_at": "2026-04-09T03:10:44.900Z",
  "valid_until": "2026-04-09T10:55:00.000Z",
  "must_checkpoint_by": "2026-04-09T10:55:00.000Z",
  "constraint_kinds": ["HARD_DEADLINE"],
  "citation_ids": ["POL-LAB", "POL-NIGHT"],
  "stale_facts": [],
  "suppressed_rule_ids": [],
  "parent_kind": "ROOT",
  "request_chain_id": "chain-0001",
  "evidence_snapshot_ref": "snap-0001"
}
```

Example with `node_class: null` (the request names no node class; triage decision D10):

```json
{
  "eventId": "01900000-0000-7000-8000-0000000000e2",
  "occurredAt": "2026-04-09T03:12:10.100Z",
  "schemaVersion": 1,
  "decision_id": "01900000-0000-7000-8000-000000000002",
  "outcome": "ALLOW",
  "admission": "ADMITTED",
  "authority": "FINAL",
  "cause": null,
  "primary_rule_id": "R-ALLOW-01",
  "policy_version": 41,
  "content_hash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "engine_version": "1.0.0",
  "campus_tz": "America/Panama",
  "actor_id": "u-elena-vargas",
  "subject_id": "CS-340-CV",
  "model_ref": "vlm-70b",
  "node_class": null,
  "evaluated_at": "2026-04-09T03:12:10.050Z",
  "valid_until": "2026-04-09T10:55:00.000Z",
  "must_checkpoint_by": null,
  "constraint_kinds": [],
  "citation_ids": ["POL-LAB"],
  "stale_facts": [],
  "suppressed_rule_ids": [],
  "parent_kind": "ROOT",
  "request_chain_id": "chain-0002",
  "evidence_snapshot_ref": "snap-0002"
}
```

### 3.2 `policy.decision.failed.v1` (OUT)

Not a `Decision`: carries no `outcome` (`AR` §5.2). `error_code` is a string-literal member of the Typed Error Catalog codes that name a failure before a `Decision` exists (see Mismatches found for the field name).

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "policy.decision.failed.v1",
  "type": "object",
  "additionalProperties": false,
  "required": ["eventId", "occurredAt", "schemaVersion", "failure_id", "stage", "failing_port", "error_code", "retry_after_ms", "actor_id", "received_at"],
  "properties": {
    "eventId": { "type": "string", "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$" },
    "occurredAt": { "type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$" },
    "schemaVersion": { "type": "integer", "minimum": 1 },
    "failure_id": { "type": "string", "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$" },
    "stage": { "enum": ["PORT_FETCH", "CONTEXT_BUILD", "RENDER"] },
    "failing_port": { "type": ["string", "null"] },
    "error_code": { "enum": ["FREEZE_STATE_UNREADABLE", "DECISION_NOT_PRODUCED"] },
    "retry_after_ms": { "type": "integer", "minimum": 0 },
    "actor_id": { "type": "string", "minLength": 1 },
    "received_at": { "type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$" }
  }
}
```

The `error_code` enumeration (two members) is confirmed (ruling N4): `AR` §5.2 names the field without a value set; the two members are the 503 codes of `contracts.md` §3.1 that occur before a `Decision` exists. The stage `RENDER` does not produce a 5xx (`AR` M2-AD-1 clause (b)) and is kept because `AR` §5.2 lists it.

Example:

```json
{
  "eventId": "01900000-0000-7000-8000-0000000000e9",
  "occurredAt": "2026-04-09T03:10:45.020Z",
  "schemaVersion": 1,
  "failure_id": "44444444-4444-4444-4444-444444444444",
  "stage": "PORT_FETCH",
  "failing_port": "quota.v1.Quota",
  "error_code": "DECISION_NOT_PRODUCED",
  "retry_after_ms": 2000,
  "actor_id": "u-elena-vargas",
  "received_at": "2026-04-09T03:10:44.900Z"
}
```

### 3.3 `policy.freeze.drafted.v1` (OUT)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "policy.freeze.drafted.v1",
  "type": "object",
  "additionalProperties": false,
  "required": ["eventId", "occurredAt", "schemaVersion", "draft_id", "content_hash", "created_by", "created_at"],
  "properties": {
    "eventId": { "type": "string", "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$" },
    "occurredAt": { "type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$" },
    "schemaVersion": { "type": "integer", "minimum": 1 },
    "draft_id": { "type": "string", "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$" },
    "content_hash": { "type": "string", "minLength": 1 },
    "created_by": { "type": "string", "minLength": 1 },
    "created_at": { "type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$" }
  }
}
```

Example:

```json
{
  "eventId": "01900000-0000-7000-8000-0000000000e3",
  "occurredAt": "2026-04-09T07:30:00.000Z",
  "schemaVersion": 1,
  "draft_id": "66666666-6666-6666-6666-666666666666",
  "content_hash": "d41d8cd98f00b204e9800998ecf8427e",
  "created_by": "u-rebecca-reed",
  "created_at": "2026-04-09T07:30:00.000Z"
}
```

### 3.4 `policy.freeze.activated.v1` (OUT)

The payload carries no free text (ruling N1): the activation `reason` stays in the `freeze` row and is read through `GET /policy/freezes/{id}`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "policy.freeze.activated.v1",
  "type": "object",
  "additionalProperties": false,
  "required": ["eventId", "occurredAt", "schemaVersion", "freeze_id", "scope", "subject_ids", "node_class_ids", "starts_at", "ends_at", "allowance_ids", "activated_by", "policy_version", "preview_run_id"],
  "properties": {
    "eventId": { "type": "string", "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$" },
    "occurredAt": { "type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$" },
    "schemaVersion": { "type": "integer", "minimum": 1 },
    "freeze_id": { "type": "string", "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$" },
    "scope": { "enum": ["ALL", "SUBJECT", "NODE_CLASS"] },
    "subject_ids": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "node_class_ids": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "starts_at": { "type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$" },
    "ends_at": { "type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$" },
    "allowance_ids": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "activated_by": { "type": "string", "minLength": 1 },
    "policy_version": { "type": "integer", "minimum": 1 },
    "preview_run_id": { "type": "string", "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$" }
  }
}
```

Example:

```json
{
  "eventId": "01900000-0000-7000-8000-0000000000e4",
  "occurredAt": "2026-04-09T07:45:10.000Z",
  "schemaVersion": 1,
  "freeze_id": "55555555-5555-5555-5555-555555555551",
  "scope": "ALL",
  "subject_ids": [],
  "node_class_ids": [],
  "starts_at": "2026-04-09T08:00:00.000Z",
  "ends_at": "2026-04-09T20:00:00.000Z",
  "allowance_ids": ["RSV-EXAM-0001"],
  "activated_by": "u-rebecca-reed",
  "policy_version": 41,
  "preview_run_id": "77777777-7777-7777-7777-777777777777"
}
```

### 3.5 `policy.freeze.lifted.v1` (OUT)

The payload carries no free text (ruling N1): `lift_reason` stays in the `freeze` row and is read through `GET /policy/freezes/{id}`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "policy.freeze.lifted.v1",
  "type": "object",
  "additionalProperties": false,
  "required": ["eventId", "occurredAt", "schemaVersion", "freeze_id", "lifted_by", "policy_version"],
  "properties": {
    "eventId": { "type": "string", "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$" },
    "occurredAt": { "type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$" },
    "schemaVersion": { "type": "integer", "minimum": 1 },
    "freeze_id": { "type": "string", "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$" },
    "lifted_by": { "type": "string", "minLength": 1 },
    "policy_version": { "type": "integer", "minimum": 1 }
  }
}
```

Example:

```json
{
  "eventId": "01900000-0000-7000-8000-0000000000e5",
  "occurredAt": "2026-04-09T14:00:00.000Z",
  "schemaVersion": 1,
  "freeze_id": "55555555-5555-5555-5555-555555555551",
  "lifted_by": "u-rebecca-reed",
  "policy_version": 41
}
```

### 3.6 `policy.version.published.v1` (OUT)

`AR` §5.2 names the fields `version` and `previous_version`; this file uses the schema column name `published_seq` and `previous_published_seq` (decision A5; see Mismatches found). `previous_published_seq` is null for the first publication.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "policy.version.published.v1",
  "type": "object",
  "additionalProperties": false,
  "required": ["eventId", "occurredAt", "schemaVersion", "published_seq", "previous_published_seq", "content_hash", "engine_version", "published_at", "changed_rule_ids"],
  "properties": {
    "eventId": { "type": "string", "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$" },
    "occurredAt": { "type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$" },
    "schemaVersion": { "type": "integer", "minimum": 1 },
    "published_seq": { "type": "integer", "minimum": 1 },
    "previous_published_seq": { "type": ["integer", "null"], "minimum": 1 },
    "content_hash": { "type": "string", "pattern": "^[0-9a-f]{64}$" },
    "engine_version": { "type": "string", "minLength": 1 },
    "published_at": { "type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$" },
    "changed_rule_ids": { "type": "array", "items": { "type": "string", "minLength": 1 } }
  }
}
```

Example:

```json
{
  "eventId": "01900000-0000-7000-8000-0000000000e6",
  "occurredAt": "2026-04-07T18:12:00.000Z",
  "schemaVersion": 1,
  "published_seq": 41,
  "previous_published_seq": 40,
  "content_hash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "engine_version": "1.0.0",
  "published_at": "2026-04-07T18:12:00.000Z",
  "changed_rule_ids": ["R-BOUND-01"]
}
```

### 3.7 `job.lifecycle.v1` (IN)

Permitted read under SPINE rule 5; it is not a decision input and cannot change an `outcome` (`AR` §5.2).

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "job.lifecycle.v1",
  "type": "object",
  "additionalProperties": false,
  "required": ["eventId", "occurredAt", "schemaVersion", "job_id", "node_class_id", "state", "observed_at"],
  "properties": {
    "eventId": { "type": "string", "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$" },
    "occurredAt": { "type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$" },
    "schemaVersion": { "type": "integer", "minimum": 1 },
    "job_id": { "type": "string", "minLength": 1 },
    "node_class_id": { "type": "string", "minLength": 1 },
    "state": { "enum": ["RUNNING", "CHECKPOINTED", "EXITED"] },
    "observed_at": { "type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$" },
    "decision_id": { "type": "string", "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$" }
  }
}
```

`decision_id` is optional (`AR` §5.2: `decision_id?`).

Example:

```json
{
  "eventId": "01900000-0000-7000-8000-0000000000e7",
  "occurredAt": "2026-04-09T10:55:02.000Z",
  "schemaVersion": 1,
  "job_id": "job-0042",
  "node_class_id": "std-24",
  "state": "CHECKPOINTED",
  "observed_at": "2026-04-09T10:55:01.500Z",
  "decision_id": "01900000-0000-7000-8000-000000000001"
}
```

### 3.8 `obligation.ack.v1` (IN)

Direction IN (`AR` §5.2, R1e). In V1 there is no producer, so `ACKED` cannot occur and this module publishes no ack (`AR` D-8).

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "obligation.ack.v1",
  "type": "object",
  "additionalProperties": false,
  "required": ["eventId", "occurredAt", "schemaVersion", "decision_id", "must_checkpoint_by", "acked_at", "state"],
  "properties": {
    "eventId": { "type": "string", "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$" },
    "occurredAt": { "type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$" },
    "schemaVersion": { "type": "integer", "minimum": 1 },
    "decision_id": { "type": "string", "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$" },
    "must_checkpoint_by": { "type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$" },
    "acked_at": { "type": "string", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$" },
    "state": { "enum": ["ACKED", "MISSED", "UNCONFIRMED"] }
  }
}
```

Example:

```json
{
  "eventId": "01900000-0000-7000-8000-0000000000e8",
  "occurredAt": "2026-04-09T10:55:03.000Z",
  "schemaVersion": 1,
  "decision_id": "01900000-0000-7000-8000-000000000001",
  "must_checkpoint_by": "2026-04-09T10:55:00.000Z",
  "acked_at": "2026-04-09T10:55:02.500Z",
  "state": "ACKED"
}
```

---

## 4. Consumer idempotency

| Event | A consumer deduplicates on | Source |
|---|---|---|
| `policy.decision.v1` | `decision_id` | `AR` §5.2: "consumers idempotent on `decision_id`" |
| `policy.decision.failed.v1` | `failure_id` | confirmed (ruling N4; `AR` §5.2 states no key) |
| `policy.freeze.drafted.v1`, `policy.freeze.activated.v1`, `policy.freeze.lifted.v1`, `policy.version.published.v1` | `eventId` | triage decision D3 (`AR` §5.2 states no key for these events); the publisher sets `eventId` from the `outbox_id` of the row (PROPOSED, human to confirm) |
| `job.lifecycle.v1`, `obligation.ack.v1` | `eventId` | PROPOSED, human to confirm |

At-least-once delivery means a consumer may see the same event more than once and must produce the same effect each time.

---

## 5. Mismatches found (decision A5)

| # | Where | What differs | What this task did |
|---|---|---|---|
| 1 | `ErrorBodyDto.code` (decision A2) versus `AR` §12 ARCH-23 and `contracts.md` §3.1 (`DECISION_NOT_PRODUCED`: body `{error_code, failing_port, retry_after_ms}`) | field name `code` versus `error_code` | `dto.ts` uses `code` (decision A2). The event `policy.decision.failed.v1` keeps `error_code` (`AR` §5.2) |
| 2 | `ErrorCodeDto` versus the HTTP meaning of the catalog | decision A2 makes `ErrorCodeDto` exactly the CODE column (38 codes after triage decision D8) and 10 of them are `DECISION.cause` members that travel in a `Decision` body with HTTP 200, never in an `ErrorBodyDto` | `ErrorCodeDto` has all 38; `openapi.yaml` attaches only the 25 error-response codes to routes and uses `DecisionCause` inside the `Decision` schema |
| 3 | `runtime_snapshot`: SQL boolean versus `AR` §5.1 / `contracts.md` Q1 enumeration `"AVAILABLE" \| "UNAVAILABLE"` | type | RESOLVED by N3: `dto.ts` and `openapi.yaml` use the enumeration; storage stays boolean in `preview_run` (true = AVAILABLE). Open point 5 of `contracts.md` removed |
| 4 | `Decision` fields `content_hash`, `engine_version` (`AR` M2-AD-7: "on every `Decision`"), `campus_tz`, `tzdata_version` | not columns of the `decision` table | `DecisionDto` carries them; they are read through `policy_version` (`policy_version` table) and `fact_snapshot.campus_tz` / `tzdata_version` |
| 5 | Event `policy.decision.v1` fields `subject_id`, `model_ref`, `node_class` (`AR` §5.2) | were not columns of the `decision` table | RESOLVED by N2: columns added to `decision` (both SQL files). Column-to-field mapping: `decision.subject_id` → `subject_id`; `decision.model_ref` → `model_ref`; `decision.node_class_id` → `node_class`, and `node_class` is `null` when the column is NULL (triage decision D10). The event field names stay as `AR` §5.2 writes them |
| 6 | `Constraint.reason` (`prd.md` 5.1) | no column in `decision_constraint` | `ConstraintDto` carries `reason`; it is not stored |
| 7 | `lifted_by` (`AR` §5.1 `GET /policy/freezes/{id}`, event `policy.freeze.lifted.v1`) | not a column of `freeze` | `FreezeDto` and the event carry it; the stored source is `audit_events.actor_id` for the action `FREEZE_LIFTED` |
| 8 | Event fields `version`, `previous_version` (`AR` §5.2) versus `policy_version.published_seq` (D8) | name | the event uses `published_seq` and `previous_published_seq` |
| 9 | `Request.node_class_id` (`AR` §4.2 ordering table, `request.node_class_id`) versus `prd.md` §5 Request | `prd.md` §5 Request has no `node_class_id` | `EvaluateRequestDto` follows `prd.md` §5 and omits it; the stored column and the event field `node_class` are nullable (D10); the PRD gap stays recorded in `reviews/review-detailed-design.md` Part E |
| 10 | Envelope `occurredAt` and `eventId` (PDF row) versus snake_case business fields | naming style | envelope names follow the PDF row; business fields follow `AR` §5.2 and the schema |
| 11 | `FreezeStoredState` (`DRAFT`, `ACTIVE`, `LIFTED`; SQL `freeze.state`) versus the computed lifecycle state of `AR` §5.1 (adds `EXPIRED`) | enumeration | `dto.ts` has both (`FreezeStoredState`, `FreezeLifecycleState`); `FreezeDto.state` is the lifecycle one |
| 12 | `reason` in `policy.freeze.activated.v1` and `lift_reason` in `policy.freeze.lifted.v1` versus the ids-only statement | free text written by a person can contain a name | RESOLVED by N1: both fields removed from the two events (payloads, schemas, examples, `AR` §5.2 rows); the text stays in `freeze.reason` / `freeze.lift_reason` and `FreezeDto` |
| 13 | `Idempotency-Key` scope: `AR` §5.1 prose "required on both `POST` routes" versus `AR` §14 D2 and `contracts.md` (only `POST /policy/decisions`) | which routes | `openapi.yaml` requires the header on `POST /policy/decisions` and declares it optional on `POST /policy/decisions/preview`. RESOLVED by N5: `AR` §5.1 sentence corrected |
| 14 | `ExplanationDto` as a field of `Decision` | not in `prd.md` 5.1, `AR` or the schema | `DecisionDto.explanation` is derived from `trace` and `citations`, not stored (PROPOSED, human to confirm) |
| 15 | `cap_value` (QUOTA_CAP) and `journal_lag` (`AR` §5.3, seconds) carry no unit in the name | integers whose unit AR gives elsewhere | `cap_value` is in quota units (`prd.md` FR-8); `journal_lag` is not in any DTO |

---

## 6. Needs human decision (proposals in this file)

1. Consumer idempotency on `eventId` for the two inbound events (`job.lifecycle.v1`, `obligation.ack.v1`), whose `AR` row states no key.
2. The rule that the publisher sets `eventId` from the `outbox_id` of the outbox row (D3 leaves the source of `eventId` unstated).

Settled by the human in P2-TRIAGE-FIX-1 and removed from this list: the idempotency key `eventId` of the four freeze and version events (D3), `node_class` nullable (D10).

Settled by the human in P2-RULINGS-3 and removed from this list: the `error_code` value set and `failure_id` (N4), `reason` / `lift_reason` in event payloads (N1), the `decision` columns for `subject_id`, `model_ref`, `node_class` (N2).
