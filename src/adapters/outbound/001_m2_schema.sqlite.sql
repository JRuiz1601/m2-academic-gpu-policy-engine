-- =============================================================================
-- 001_m2_schema.sqlite.sql — Module M2 Academic GPU Policy Engine
-- Engine: SQLite (WAL mode, STRICT tables), driver better-sqlite3, plain SQL.
-- Parallel file: 001_m2_schema.postgres.sql (same table and column names).
-- Phase: Solu-2 Phase 2, Step 2.2 (schema only). Task P2-SCHEMA-1.
--
-- Sections and the document each implements
--   1. Tables        planning/ARCHITECTURE.md section 4.1 (15 entities) + audit_events (S4)
--   2. Invariants    ARCHITECTURE.md M2-AD-3, M2-AD-5, M2-AD-7, M2-AD-8, M2-AD-9;
--                    planning/detailed-design/contracts.md section 2 (I clauses), section 4
--   3. Append-only   ARCHITECTURE.md M2-AD-8 (S6: BEFORE UPDATE / BEFORE DELETE triggers)
--   4. Indexes       ARCHITECTURE.md section 4.2 and section 5.1
--   5. Seed          planning/prd.md section 5.3 (12 POLICY_DOCUMENT rows)
--   6. Reference statements for the repository (comment block, not executed)
--
-- Rulings applied: S1 (two files, plain SQL), S2 (SQLite type mapping), S3 (created_at on
-- every table, updated_at only outside the M2-AD-8 no-UPDATE group, no wall-clock default),
-- S4 (audit_events), S5 (seed), S6 (physical append-only). Markers "-- PROPOSED, human to
-- confirm" flag every choice the files do not settle.
--
-- Type mapping (S2): instants are TEXT in ISO-8601 UTC, fixed width
--   YYYY-MM-DDTHH:MM:SS.sssZ (millisecond precision, ruling M3; the
--   fixed width makes text order equal time order); ids are TEXT; JSON is TEXT with
--   json_valid in a CHECK; booleans are INTEGER with CHECK (x IN (0, 1)). No floating-point column.
--
-- Annex A edge case (Policy Engine row of the Solu-2 PDF, Annex A, text extracted from the
-- PDF; some words are lost in extraction):
--   "Pure evaluator; immutable policy_versions; decisions log with rule_ids NOT NULL"
--   "Job approved at 21:58 under night policy running past 10:00 class"
--   The module resolves the edge case at admission (R-BOUND-01 -> CONSTRAIN / HARD_DEADLINE).
--   Physical support in this file:
--     decision.valid_until NOT NULL for ALLOW and CONSTRAIN;
--     decision.must_checkpoint_by = valid_until whenever non-null;
--     decision_constraint.deadline NOT NULL for HARD_DEADLINE;
--     decision.primary_rule_id NOT NULL; policy_version rows cannot be updated or deleted.
--   Not expressible in SQL here: that the deadline equals the governing boundary minus
--   PROTECTION_GRACE (computed by policy/core; contracts.md I4 of evaluateRequest).
-- =============================================================================

PRAGMA foreign_keys = ON;      -- per connection; the repository adapter sets it on each connection
PRAGMA journal_mode = WAL;     -- persistent for a file database; ignored by :memory:

-- =============================================================================
-- 1. TABLES
-- =============================================================================

-- policy_version: AR 4.1 POLICY_VERSION; AR M2-AD-7. The version identifier is the integer
-- published_seq (D8, R4): +1 per publish, computed in the publish transaction. There is no
-- AUTOINCREMENT and no sequence on purpose: a rolled-back publish must not consume a number.
CREATE TABLE policy_version (
    published_seq   INTEGER NOT NULL PRIMARY KEY,
    published_at    TEXT    NOT NULL,
    content_hash    TEXT    NOT NULL,
    engine_version  TEXT    NOT NULL,
    campus_tz       TEXT    NOT NULL,
    immutable       INTEGER NOT NULL,
    created_at      TEXT    NOT NULL,
    -- INVARIANT M2-AD-7 / CT I8 (evaluateRequest): the version identifier is positive.
    CONSTRAINT policy_version_seq_positive CHECK (published_seq > 0),
    -- INVARIANT M2-AD-7 / CT I8: sha256 content hash, 64 lowercase hexadecimal characters.
    CONSTRAINT policy_version_hash_sha256 CHECK (length(content_hash) = 64 AND content_hash NOT GLOB '*[^0-9a-f]*'),
    -- INVARIANT M2-AD-7: a stored version is frozen at publication.
    CONSTRAINT policy_version_immutable_true CHECK (immutable = 1),
    CONSTRAINT policy_version_engine_nonempty CHECK (length(engine_version) > 0),
    CONSTRAINT policy_version_tz_nonempty CHECK (length(campus_tz) > 0),
    CONSTRAINT policy_version_published_at_iso CHECK (published_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', published_at) IS published_at),
    CONSTRAINT policy_version_created_at_iso CHECK (created_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at)
) STRICT;

-- policy_document: AR 4.1 POLICY_DOCUMENT; prd.md 5.3. Loaded by this migration (R3); the
-- running module only reads it. content_hash is nullable: prd.md 5.3 gives no hash for any
-- document, so it is NULL for all 12 seed rows (ruling M4). updated_at exists by rule S3
-- (the table is not in the M2-AD-8 no-UPDATE list); the module has no write grant (R3).
CREATE TABLE policy_document (
    doc_id        TEXT NOT NULL PRIMARY KEY,
    title         TEXT NOT NULL,
    owner         TEXT NOT NULL,
    version       TEXT NOT NULL,
    content_hash  TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    CONSTRAINT policy_document_doc_id_nonempty CHECK (length(doc_id) > 0),
    CONSTRAINT policy_document_title_nonempty CHECK (length(title) > 0),
    CONSTRAINT policy_document_owner_nonempty CHECK (length(owner) > 0),
    CONSTRAINT policy_document_version_nonempty CHECK (length(version) > 0),
    CONSTRAINT policy_document_created_at_iso CHECK (created_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at),
    CONSTRAINT policy_document_updated_at_iso CHECK (updated_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) IS updated_at),
    CONSTRAINT policy_document_updated_after_created CHECK (updated_at >= created_at)
) STRICT;

-- fact_snapshot: AR 4.1 FACT_SNAPSHOT; typed projection, ids only (AR 4.2, M2-AD-8).
-- ref is content-addressed; the hash function and length are not stated in AR: only
-- non-empty is enforced (open point, see the report).
-- D1 (ADV-2, task P2-TRIAGE-FIX-1): actor_kind, role_tier, model_facts and quota_facts are nullable. A NULL means the fact does not exist
-- (unknown actor, unknown model, failed port); no sentinel value is stored. Trigger decision_null_facts_by_cause allows a NULL only for a
-- decision whose cause is ACTOR_UNKNOWN, MODEL_NOT_FOUND or DEPENDENCY_UNAVAILABLE.
CREATE TABLE fact_snapshot (
    ref                                  TEXT    NOT NULL PRIMARY KEY,
    actor_id                             TEXT    NOT NULL,
    actor_kind                           TEXT,
    role_tier                            TEXT,
    max_gpu_count                        INTEGER,
    max_vram_gb                          INTEGER,
    subject_ids                          TEXT    NOT NULL,
    model_facts                          TEXT,
    node_classes                         TEXT    NOT NULL,
    protected_windows                    TEXT    NOT NULL,
    freeze_states                        TEXT    NOT NULL,
    quota_facts                          TEXT,
    queue_estimates                      TEXT    NOT NULL,
    campus_now                           TEXT    NOT NULL,
    campus_tz                            TEXT    NOT NULL,
    utc_offset_seconds_at_evaluated_at   INTEGER NOT NULL,
    tzdata_version                       TEXT    NOT NULL,
    night_window                         TEXT    NOT NULL,
    clock_override                       TEXT,
    staleness                            TEXT    NOT NULL,
    policy_version                       INTEGER NOT NULL REFERENCES policy_version (published_seq),
    created_at                           TEXT    NOT NULL,
    CONSTRAINT fact_snapshot_ref_nonempty CHECK (length(ref) > 0),
    CONSTRAINT fact_snapshot_actor_kind_enum CHECK (actor_kind IN ('HUMAN', 'SYSTEM')),
    -- max_gpu_count and max_vram_gb are nullable: the ER carries no "unrestricted" column
    -- (PROPOSED, human to confirm; see the report).
    CONSTRAINT fact_snapshot_max_gpu_nonneg CHECK (max_gpu_count IS NULL OR max_gpu_count >= 0),
    CONSTRAINT fact_snapshot_max_vram_nonneg CHECK (max_vram_gb IS NULL OR max_vram_gb >= 0),
    -- subject_ids is a JSON array of ids (PROPOSED, human to confirm; the ER types it string).
    CONSTRAINT fact_snapshot_subject_ids_array CHECK (json_valid(subject_ids) AND json_type(subject_ids) = 'array'),
    CONSTRAINT fact_snapshot_model_facts_json CHECK (json_valid(model_facts)),
    CONSTRAINT fact_snapshot_node_classes_array CHECK (json_valid(node_classes) AND json_type(node_classes) = 'array'),
    CONSTRAINT fact_snapshot_protected_windows_array CHECK (json_valid(protected_windows) AND json_type(protected_windows) = 'array'),
    CONSTRAINT fact_snapshot_freeze_states_array CHECK (json_valid(freeze_states) AND json_type(freeze_states) = 'array'),
    CONSTRAINT fact_snapshot_quota_facts_json CHECK (json_valid(quota_facts)),
    CONSTRAINT fact_snapshot_queue_estimates_json CHECK (json_valid(queue_estimates)),
    CONSTRAINT fact_snapshot_night_window_json CHECK (json_valid(night_window)),
    CONSTRAINT fact_snapshot_clock_override_json CHECK (clock_override IS NULL OR json_valid(clock_override)),
    CONSTRAINT fact_snapshot_staleness_json CHECK (json_valid(staleness)),
    CONSTRAINT fact_snapshot_campus_now_iso CHECK (campus_now GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', campus_now) IS campus_now),
    CONSTRAINT fact_snapshot_created_at_iso CHECK (created_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at)
) STRICT;

-- decision: AR 4.1 DECISION; contracts.md evaluateRequest Q1, Q2.
-- primary_rule_id: the ER marks it FK ("always in the registry") but the registry is the frozen
-- rule set, not a table, and the ER names no target table: stored as non-empty TEXT.
-- snapshot_retained: see the report (AR M2-AD-8 puts DECISION in the no-UPDATE group, so the
-- value written at insert can never flip to false).
CREATE TABLE decision (
    decision_id             TEXT    NOT NULL PRIMARY KEY,
    outcome                 TEXT    NOT NULL,
    admission               TEXT    NOT NULL,
    authority               TEXT    NOT NULL,
    cause                   TEXT,
    primary_rule_id         TEXT    NOT NULL,
    rationale               TEXT    NOT NULL,
    next_actions            TEXT    NOT NULL,
    evaluated_at            TEXT    NOT NULL,
    valid_until             TEXT,
    must_checkpoint_by      TEXT,
    retry_after_ms          INTEGER,
    request_chain_id        TEXT    NOT NULL,
    subject_id              TEXT    NOT NULL,
    model_ref               TEXT    NOT NULL,
    node_class_id           TEXT,
    originating_actor_id    TEXT    NOT NULL,
    submitted_by            TEXT    NOT NULL,
    derived_from            TEXT    REFERENCES decision (decision_id),
    parent_kind             TEXT    NOT NULL,
    depth                   INTEGER NOT NULL,
    snapshot_retained       INTEGER NOT NULL,
    evidence_snapshot_ref   TEXT    NOT NULL REFERENCES fact_snapshot (ref),
    policy_version          INTEGER NOT NULL REFERENCES policy_version (published_seq),
    created_at              TEXT    NOT NULL,
    -- uuid7: the version nibble (character 15) is 7 (AR 4.2 "decision_id is uuid7").
    CONSTRAINT decision_id_uuid7 CHECK (length(decision_id) = 36 AND decision_id GLOB '????????-????-7???-????-????????????'),
    CONSTRAINT decision_outcome_enum CHECK (outcome IN ('ALLOW', 'DENY', 'CONSTRAIN')),
    CONSTRAINT decision_admission_enum CHECK (admission IN ('ADMITTED', 'QUEUED', 'REJECTED')),
    CONSTRAINT decision_authority_enum CHECK (authority IN ('PROVISIONAL', 'FINAL')),
    -- INVARIANT M2-AD-1 / CT I3 (evaluateRequest): the 10-member closed cause set (prd.md 5.2).
    CONSTRAINT decision_cause_enum CHECK (cause IS NULL OR cause IN ('INVALID_REQUEST', 'ACTOR_UNKNOWN', 'MODEL_NOT_FOUND', 'NO_SUCH_HARDWARE', 'HARDWARE_FAILING', 'NOT_AUTHORIZED', 'WINDOW_PROTECTED', 'FREEZE_ACTIVE', 'QUOTA_EXHAUSTED', 'DEPENDENCY_UNAVAILABLE')),
    -- INVARIANT M2-AD-1 / CT I3: cause is non-null iff outcome = DENY (prd.md 5.1).
    CONSTRAINT decision_cause_iff_deny CHECK ((cause IS NOT NULL) = (outcome = 'DENY')),
    -- INVARIANT M2-AD-1 / CT I3: admission = REJECTED iff outcome = DENY; ALLOW is always ADMITTED (prd.md 5.1).
    CONSTRAINT decision_rejected_iff_deny CHECK ((admission = 'REJECTED') = (outcome = 'DENY')),
    CONSTRAINT decision_allow_admitted CHECK (outcome <> 'ALLOW' OR admission = 'ADMITTED'),
    CONSTRAINT decision_rule_nonempty CHECK (length(primary_rule_id) > 0),
    CONSTRAINT decision_rationale_nonempty CHECK (length(rationale) > 0),
    -- INVARIANT M2-AD-6 / CT I7: a DENY carries at least 1 next action or the sentinel (counted as one entry).
    CONSTRAINT decision_next_actions_array CHECK (json_valid(next_actions) AND json_type(next_actions) = 'array' AND (outcome <> 'DENY' OR json_array_length(next_actions) >= 1)),
    -- INVARIANT M2-AD-3 / CT I4 (ruling DL-54, ARCHITECTURE.md 15.12): valid_until is non-null for ALLOW and CONSTRAIN and later than evaluated_at, except the past-bound guard (prd.md NP-9), an ALLOW with valid_until = evaluated_at. A CHECK sees only this row: it cannot require the WINDOW_SCOPE constraint of that guard; the Decision constructor does.
    CONSTRAINT decision_valid_until_required CHECK (outcome = 'DENY' OR valid_until IS NOT NULL),
    CONSTRAINT decision_valid_until_after_evaluated CHECK (valid_until IS NULL OR valid_until > evaluated_at OR (outcome = 'ALLOW' AND valid_until = evaluated_at)),
    -- INVARIANT M2-AD-3 / CT I4: must_checkpoint_by, when non-null, equals valid_until.
    CONSTRAINT decision_single_deadline CHECK (must_checkpoint_by IS NULL OR (valid_until IS NOT NULL AND must_checkpoint_by = valid_until)), -- P2-CROSSCHECK-1 F4: a checkpoint needs a deadline
    CONSTRAINT decision_retry_after_nonneg CHECK (retry_after_ms IS NULL OR retry_after_ms >= 0),
    CONSTRAINT decision_chain_nonempty CHECK (length(request_chain_id) > 0),
    CONSTRAINT decision_subject_nonempty CHECK (length(subject_id) > 0),
    CONSTRAINT decision_model_ref_nonempty CHECK (length(model_ref) > 0),
    CONSTRAINT decision_node_class_nonempty CHECK (node_class_id IS NULL OR length(node_class_id) > 0),
    CONSTRAINT decision_originating_actor_nonempty CHECK (length(originating_actor_id) > 0),
    CONSTRAINT decision_submitted_by_enum CHECK (submitted_by IN ('HUMAN', 'SYSTEM')),
    -- INVARIANT M2-AD-8 / CT I9 (evaluateRequest): parent_kind is ROOT or DERIVED only (R2); depth <= 1.
    CONSTRAINT decision_parent_kind_enum CHECK (parent_kind IN ('ROOT', 'DERIVED')),
    CONSTRAINT decision_depth_max_1 CHECK (depth >= 0 AND depth <= 1),
    CONSTRAINT decision_parent_depth_coherent CHECK ((parent_kind = 'ROOT' AND derived_from IS NULL AND depth = 0) OR (parent_kind = 'DERIVED' AND derived_from IS NOT NULL AND depth = 1)),
    CONSTRAINT decision_snapshot_retained_bool CHECK (snapshot_retained IN (0, 1)),
    CONSTRAINT decision_evaluated_at_iso CHECK (evaluated_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', evaluated_at) IS evaluated_at),
    CONSTRAINT decision_valid_until_iso CHECK (valid_until IS NULL OR (valid_until GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', valid_until) IS valid_until)),
    CONSTRAINT decision_must_checkpoint_by_iso CHECK (must_checkpoint_by IS NULL OR (must_checkpoint_by GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', must_checkpoint_by) IS must_checkpoint_by)),
    CONSTRAINT decision_created_at_iso CHECK (created_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at)
    -- NOT EXPRESSIBLE AS A CHECK: DECISION.evaluated_at = FACT_SNAPSHOT.campus_now (cross-table equality, AR 4.2):
    --   enforced by decision/shell in the one transaction of AR 4.2 (contracts.md evaluateRequest Q2).
    -- NOT EXPRESSIBLE AS A CHECK: admission = QUEUED iff some constraint has kind QUEUE_ONLY, and
    --   authority = PROVISIONAL iff some constraint has kind QUOTA_CAP (prd.md 5.1): cross-table;
    --   enforced by the Decision constructor in policy/core (contracts.md I3).
) STRICT;

-- decision_constraint: AR 4.1 CONSTRAINT. "constraint" is a reserved word in SQL; the table is
-- named decision_constraint (PROPOSED, human to confirm).
CREATE TABLE decision_constraint (
    constraint_id  TEXT NOT NULL PRIMARY KEY,
    decision_id    TEXT NOT NULL REFERENCES decision (decision_id),
    kind           TEXT NOT NULL,
    value          TEXT NOT NULL,
    enforced_by    TEXT NOT NULL,
    deadline       TEXT,
    created_at     TEXT NOT NULL,
    CONSTRAINT decision_constraint_id_uuid CHECK (length(constraint_id) = 36 AND constraint_id GLOB '????????-????-????-????-????????????'),
    -- INVARIANT M2-AD-5 / CT I6: the 6-member closed kind set (prd.md 5.2).
    CONSTRAINT decision_constraint_kind_enum CHECK (kind IN ('RESOURCE_SUBSTITUTION', 'HARD_DEADLINE', 'QUEUE_ONLY', 'QUOTA_CAP', 'WINDOW_SCOPE', 'MODEL_VARIANT')),
    CONSTRAINT decision_constraint_value_json CHECK (json_valid(value)),
    -- INVARIANT M2-AD-5 (D11, ADV-26, task P2-TRIAGE-FIX-1): the kind inside value equals the kind column.
    CONSTRAINT decision_constraint_value_kind_matches CHECK (json_extract(value, '$.kind') IS kind),
    -- INVARIANT M2-AD-5 / CT I6: every constraint names the delegate that enforces it.
    CONSTRAINT decision_constraint_enforced_by_nonempty CHECK (length(enforced_by) > 0),
    -- INVARIANT M2-AD-5 / CT I6: HARD_DEADLINE, QUEUE_ONLY and QUOTA_CAP carry a deadline; MODEL_VARIANT and
    -- RESOURCE_SUBSTITUTION carry none (AR M2-AD-5 rule; the ER comment names HARD_DEADLINE only; PROPOSED, human to confirm).
    CONSTRAINT decision_constraint_deadline_by_kind CHECK ((kind IN ('HARD_DEADLINE', 'QUEUE_ONLY', 'QUOTA_CAP') AND deadline IS NOT NULL) OR (kind IN ('MODEL_VARIANT', 'RESOURCE_SUBSTITUTION') AND deadline IS NULL) OR kind = 'WINDOW_SCOPE'),
    CONSTRAINT decision_constraint_deadline_iso CHECK (deadline IS NULL OR (deadline GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', deadline) IS deadline)),
    CONSTRAINT decision_constraint_created_at_iso CHECK (created_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at)
    -- NOT EXPRESSIBLE AS A CHECK: enforced_by resolves against the delegate registry (AR M2-AD-5): the registry is not a table;
    --   enforced by the Decision constructor (contracts.md I6). deadline = decision.valid_until: cross-table; enforced by policy/core.
) STRICT;

-- trace_entry: AR 4.1 TRACE_ENTRY; key (decision_id, seq), the ordinal is per decision (AR 4.2).
CREATE TABLE trace_entry (
    decision_id  TEXT    NOT NULL REFERENCES decision (decision_id),
    seq          INTEGER NOT NULL,
    rule_id      TEXT    NOT NULL,
    state        TEXT    NOT NULL,
    evidence     TEXT    NOT NULL,
    precedence   INTEGER NOT NULL,
    bound_role   TEXT,
    created_at   TEXT    NOT NULL,
    PRIMARY KEY (decision_id, seq),
    CONSTRAINT trace_entry_seq_nonneg CHECK (seq >= 0),
    CONSTRAINT trace_entry_rule_nonempty CHECK (length(rule_id) > 0),
    -- INVARIANT M2-AD-1 / CT I2: three trace states, no fourth (AR M2-AD-8 "Three trace states, not four").
    CONSTRAINT trace_entry_state_enum CHECK (state IN ('MATCH', 'NO_MATCH', 'NOT_EVALUATED')),
    CONSTRAINT trace_entry_evidence_json CHECK (json_valid(evidence)),
    -- INVARIANT M2-AD-2: precedence range [-1, 1000].
    CONSTRAINT trace_entry_precedence_range CHECK (precedence >= -1 AND precedence <= 1000),
    CONSTRAINT trace_entry_bound_role_enum CHECK (bound_role IS NULL OR bound_role IN ('governing', 'superseded', 'outside_horizon')),
    CONSTRAINT trace_entry_created_at_iso CHECK (created_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at)
    -- NOT EXPRESSIBLE AS A CHECK: exactly one 'governing' bound_role per decision (prd.md 5.1 bound-role invariant): enforced by policy/core.
) STRICT;

-- suppressed_rule: AR 4.1 SUPPRESSED_RULE. Part of the decision record written in the one transaction of AR 4.2: it joins the
-- no-UPDATE / no-DELETE group (ruling M1), so it has no updated_at column (S3).
CREATE TABLE suppressed_rule (
    decision_id         TEXT    NOT NULL REFERENCES decision (decision_id),
    seq                 INTEGER NOT NULL,
    rule_id             TEXT    NOT NULL,
    would_have_fired_on  TEXT   NOT NULL,
    created_at          TEXT    NOT NULL,
    PRIMARY KEY (decision_id, seq),
    CONSTRAINT suppressed_rule_seq_nonneg CHECK (seq >= 0),
    CONSTRAINT suppressed_rule_rule_nonempty CHECK (length(rule_id) > 0),
    CONSTRAINT suppressed_rule_fact_json CHECK (json_valid(would_have_fired_on)),
    CONSTRAINT suppressed_rule_created_at_iso CHECK (created_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at)
) STRICT;

-- decision_citation: AR 4.1 DECISION_CITATION; key (decision_id, doc_id). Part of the decision record: it joins the no-UPDATE /
-- no-DELETE group (ruling M1), so it has no updated_at column (S3).
CREATE TABLE decision_citation (
    decision_id  TEXT    NOT NULL REFERENCES decision (decision_id),
    doc_id       TEXT    NOT NULL REFERENCES policy_document (doc_id),
    ordinal      INTEGER NOT NULL,
    created_at   TEXT    NOT NULL,
    PRIMARY KEY (decision_id, doc_id),
    CONSTRAINT decision_citation_ordinal_nonneg CHECK (ordinal >= 0),
    CONSTRAINT decision_citation_created_at_iso CHECK (created_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at)
    -- INVARIANT M2-AD-6 / CT I7: a citation resolves in policy_document (foreign key above); "at least 1 citation per decision"
    --   is NOT EXPRESSIBLE AS A CHECK (cross-row): enforced by the Decision constructor.
) STRICT;

-- decision_outbox: AR 4.1 DECISION_OUTBOX with the K4 shape, extended by D3 (ADV-4, task P2-TRIAGE-FIX-1) to the freeze and version events:
-- the outbox row is inserted in the same transaction as the change, so a rollback publishes nothing. Exactly one key column is non-null
-- and it matches the event type. idempotency_key is NULL for every event except policy.decision.v1 (ruling M5, extended); the other
-- events are deduplicated on eventId (AR 5.2 states no other key). D4 (ADV-5): first_attempt_at and journal_lag left this table; the
-- first attempt is read from outbox_delivery.attempted_at and the lag is a computed query (AR 5.3). The ER draws
-- POLICY_VERSION ||--o{ DECISION_OUTBOX but lists no policy_version column in DECISION_OUTBOX; none is added (see the report).
CREATE TABLE decision_outbox (
    outbox_id         TEXT    NOT NULL PRIMARY KEY,
    event_type        TEXT    NOT NULL,
    decision_id       TEXT    REFERENCES decision (decision_id),
    failure_id        TEXT,
    draft_id          TEXT    REFERENCES freeze_draft (draft_id),
    freeze_id         TEXT    REFERENCES freeze (freeze_id),
    published_seq     INTEGER REFERENCES policy_version (published_seq),
    idempotency_key   TEXT,
    payload_ref       TEXT    NOT NULL,
    created_at        TEXT    NOT NULL,
    CONSTRAINT decision_outbox_id_uuid7 CHECK (length(outbox_id) = 36 AND outbox_id GLOB '????????-????-7???-????-????????????'),
    CONSTRAINT decision_outbox_event_type_enum CHECK (event_type IN ('policy.decision.v1', 'policy.decision.failed.v1', 'policy.freeze.drafted.v1', 'policy.freeze.activated.v1', 'policy.freeze.lifted.v1', 'policy.version.published.v1')),
    -- INVARIANT M2-AD-8 / CT I9 (K4, D3): exactly one key column (decision_id, failure_id, draft_id, freeze_id, published_seq) is non-null.
    CONSTRAINT decision_outbox_exactly_one_id CHECK ((decision_id IS NOT NULL) + (failure_id IS NOT NULL) + (draft_id IS NOT NULL) + (freeze_id IS NOT NULL) + (published_seq IS NOT NULL) = 1),
    -- INVARIANT M2-AD-8 (K4, D3): the event type matches the key column that is set.
    CONSTRAINT decision_outbox_type_matches_id CHECK ((event_type = 'policy.decision.v1' AND decision_id IS NOT NULL) OR (event_type = 'policy.decision.failed.v1' AND failure_id IS NOT NULL) OR (event_type = 'policy.freeze.drafted.v1' AND draft_id IS NOT NULL) OR (event_type IN ('policy.freeze.activated.v1', 'policy.freeze.lifted.v1') AND freeze_id IS NOT NULL) OR (event_type = 'policy.version.published.v1' AND published_seq IS NOT NULL)),
    -- INVARIANT M2-AD-8 / K4 (ruling M5, extended by D3): only a policy.decision.v1 row carries an idempotency key.
    CONSTRAINT decision_outbox_key_only_decision_events CHECK (idempotency_key IS NULL OR event_type = 'policy.decision.v1'),
    CONSTRAINT decision_outbox_failure_id_uuid CHECK (failure_id IS NULL OR (length(failure_id) = 36 AND failure_id GLOB '????????-????-????-????-????????????')),
    CONSTRAINT decision_outbox_payload_ref_nonempty CHECK (length(payload_ref) > 0),
    CONSTRAINT decision_outbox_created_at_iso CHECK (created_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at)
) STRICT;

-- outbox_delivery: AR 4.1 OUTBOX_DELIVERY; one row per attempt, key (outbox_id, attempt_no) (D3).
CREATE TABLE outbox_delivery (
    outbox_id     TEXT    NOT NULL REFERENCES decision_outbox (outbox_id),
    attempt_no    INTEGER NOT NULL,
    attempted_at  TEXT    NOT NULL,
    outcome       TEXT    NOT NULL,
    delivered_at  TEXT,
    created_at    TEXT    NOT NULL,
    -- INVARIANT M2-AD-8 / CT I9 (D3): keyed by (outbox_id, attempt_no); attempt numbers start at 1.
    PRIMARY KEY (outbox_id, attempt_no),
    CONSTRAINT outbox_delivery_attempt_positive CHECK (attempt_no >= 1),
    CONSTRAINT outbox_delivery_outcome_nonempty CHECK (length(outcome) > 0),
    CONSTRAINT outbox_delivery_delivered_after_attempt CHECK (delivered_at IS NULL OR delivered_at >= attempted_at),
    CONSTRAINT outbox_delivery_attempted_at_iso CHECK (attempted_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', attempted_at) IS attempted_at),
    CONSTRAINT outbox_delivery_delivered_at_iso CHECK (delivered_at IS NULL OR (delivered_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', delivered_at) IS delivered_at)),
    CONSTRAINT outbox_delivery_created_at_iso CHECK (created_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at)
) STRICT;

-- idempotency_key: AR 4.1 IDEMPOTENCY_KEY; D2, K3. The key row is inserted FIRST in the append transaction, so the unique
-- key (not a prior read) decides the race before any decision row exists; the foreign key to decision is therefore
-- DEFERRABLE INITIALLY DEFERRED (PROPOSED, human to confirm).
CREATE TABLE idempotency_key (
    actor_id                   TEXT NOT NULL,
    "key"                      TEXT NOT NULL,
    request_hash               TEXT NOT NULL,
    decision_id                TEXT NOT NULL REFERENCES decision (decision_id) DEFERRABLE INITIALLY DEFERRED,
    created_at                 TEXT NOT NULL,
    replay_window_expires_at   TEXT NOT NULL,
    -- INVARIANT M2-AD-8 / CT I9 (D2): one (actor_id, key) yields one decision; unique per (actor_id, key).
    PRIMARY KEY (actor_id, "key"),
    CONSTRAINT idempotency_key_actor_nonempty CHECK (length(actor_id) > 0),
    CONSTRAINT idempotency_key_key_nonempty CHECK (length("key") > 0),
    CONSTRAINT idempotency_key_hash_nonempty CHECK (length(request_hash) > 0),
    CONSTRAINT idempotency_key_created_at_iso CHECK (created_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at),
    -- INVARIANT M2-AD-8 (D2): replay_window_expires_at = created_at + 24 h.
    CONSTRAINT idempotency_key_window_24h CHECK (replay_window_expires_at = strftime('%Y-%m-%dT%H:%M:%fZ', created_at, '+24 hours'))
) STRICT;

-- obligation_observation: AR 4.1 OBLIGATION_OBSERVATION; state changes are appended as new rows (R1b), key (decision_id, observation_seq).
CREATE TABLE obligation_observation (
    decision_id          TEXT    NOT NULL REFERENCES decision (decision_id),
    observation_seq      INTEGER NOT NULL,
    state                TEXT    NOT NULL,
    must_checkpoint_by   TEXT    NOT NULL,
    observed_at          TEXT    NOT NULL,
    source               TEXT    NOT NULL,
    created_at           TEXT    NOT NULL,
    PRIMARY KEY (decision_id, observation_seq),
    CONSTRAINT obligation_observation_seq_nonneg CHECK (observation_seq >= 0),
    CONSTRAINT obligation_observation_state_enum CHECK (state IN ('ACKED', 'MISSED', 'UNCONFIRMED')),
    CONSTRAINT obligation_observation_source_enum CHECK (source IN ('OBLIGATION_ACK', 'job.lifecycle.v1', 'timeout')),
    CONSTRAINT obligation_observation_checkpoint_iso CHECK (must_checkpoint_by GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', must_checkpoint_by) IS must_checkpoint_by),
    CONSTRAINT obligation_observation_observed_iso CHECK (observed_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', observed_at) IS observed_at),
    CONSTRAINT obligation_observation_created_at_iso CHECK (created_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at)
) STRICT;

-- freeze: AR 4.1 FREEZE. lifted_by appears in the route list of AR 5.1 (GET /policy/freezes/{id}) but not in the ER: not added
-- here; the lifting actor is recorded in audit_events (S4).
CREATE TABLE freeze (
    freeze_id                  TEXT    NOT NULL PRIMARY KEY,
    scope                      TEXT    NOT NULL,
    subject_ids                TEXT    NOT NULL,
    node_class_ids             TEXT    NOT NULL,
    allowances                 TEXT    NOT NULL,
    starts_at                  TEXT    NOT NULL,
    ends_at                    TEXT    NOT NULL,
    state                      TEXT    NOT NULL,
    reason                     TEXT    NOT NULL,
    lift_reason                TEXT,
    activated_by               TEXT,
    activated_by_role_tier     TEXT,
    activated_at               TEXT,
    supersedes                 TEXT    REFERENCES freeze (freeze_id),
    policy_version             INTEGER NOT NULL REFERENCES policy_version (published_seq),
    created_at                 TEXT    NOT NULL,
    updated_at                 TEXT    NOT NULL,
    CONSTRAINT freeze_id_uuid CHECK (length(freeze_id) = 36 AND freeze_id GLOB '????????-????-????-????-????????????'),
    CONSTRAINT freeze_scope_enum CHECK (scope IN ('ALL', 'SUBJECT', 'NODE_CLASS')),
    -- INVARIANT M2-AD-9 / CT I3 (activateFreeze): subject_ids, node_class_ids and allowances are JSON arrays; allowances is NOT NULL.
    CONSTRAINT freeze_subject_ids_array CHECK (json_valid(subject_ids) AND json_type(subject_ids) = 'array'),
    CONSTRAINT freeze_node_class_ids_array CHECK (json_valid(node_class_ids) AND json_type(node_class_ids) = 'array'),
    CONSTRAINT freeze_allowances_array CHECK (json_valid(allowances) AND json_type(allowances) = 'array'),
    -- INVARIANT M2-AD-9 / CT I3: subject_ids is empty unless scope = SUBJECT; node_class_ids is empty unless scope = NODE_CLASS.
    CONSTRAINT freeze_subject_ids_by_scope CHECK (scope = 'SUBJECT' OR json_array_length(subject_ids) = 0),
    CONSTRAINT freeze_node_class_ids_by_scope CHECK (scope = 'NODE_CLASS' OR json_array_length(node_class_ids) = 0),
    -- INVARIANT M2-AD-9 / CT I3: ends_at > starts_at.
    CONSTRAINT freeze_window_ordered CHECK (ends_at > starts_at),
    -- INVARIANT M2-AD-9 (D6, EDG-5, task P2-TRIAGE-FIX-1): a SUBJECT freeze names at least 1 subject; a NODE_CLASS freeze names at least 1 node class.
    CONSTRAINT freeze_subject_ids_required CHECK (scope <> 'SUBJECT' OR json_array_length(subject_ids) >= 1),
    CONSTRAINT freeze_node_class_ids_required CHECK (scope <> 'NODE_CLASS' OR json_array_length(node_class_ids) >= 1),
    -- D5 (ADV-6): EXPIRED is a stored value written only by the closing step of activateFreeze (section 6, statement 3a); read paths still compute EXPIRED from ends_at for ACTIVE rows.
    CONSTRAINT freeze_state_enum CHECK (state IN ('DRAFT', 'ACTIVE', 'LIFTED', 'EXPIRED')),
    -- INVARIANT M2-AD-9 (D5, PROPOSED, human to confirm): the closing step stamps updated_at with campus_now, so an EXPIRED row has ends_at <= updated_at.
    CONSTRAINT freeze_expired_only_after_end CHECK (state <> 'EXPIRED' OR ends_at <= updated_at),
    CONSTRAINT freeze_reason_nonempty CHECK (length(reason) > 0),
    -- INVARIANT M2-AD-9: a LIFTED freeze carries a non-empty lift_reason; an ACTIVE or LIFTED freeze names who and when activated it.
    CONSTRAINT freeze_lift_reason_when_lifted CHECK (state <> 'LIFTED' OR (lift_reason IS NOT NULL AND length(lift_reason) > 0)),
    CONSTRAINT freeze_activation_recorded CHECK (state = 'DRAFT' OR (activated_by IS NOT NULL AND length(activated_by) > 0 AND activated_by_role_tier IS NOT NULL AND length(activated_by_role_tier) > 0 AND activated_at IS NOT NULL)),
    CONSTRAINT freeze_starts_at_iso CHECK (starts_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', starts_at) IS starts_at),
    CONSTRAINT freeze_ends_at_iso CHECK (ends_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', ends_at) IS ends_at),
    CONSTRAINT freeze_activated_at_iso CHECK (activated_at IS NULL OR (activated_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', activated_at) IS activated_at)),
    CONSTRAINT freeze_created_at_iso CHECK (created_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at),
    CONSTRAINT freeze_updated_at_iso CHECK (updated_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) IS updated_at),
    CONSTRAINT freeze_updated_after_created CHECK (updated_at >= created_at)
    -- NOT EXPRESSIBLE AS A CHECK: activation also requires ends_at > campus_now (AR 4.1 comment): campus_now is the Clock port value;
    --   enforced by activateFreeze (contracts.md activateFreeze P7).
) STRICT;

-- freeze_draft: AR 4.1 FREEZE_DRAFT. The ER draws FREEZE ||--o| FREEZE_DRAFT but lists no freeze_id column in FREEZE_DRAFT; none is added.
CREATE TABLE freeze_draft (
    draft_id      TEXT NOT NULL PRIMARY KEY,
    draft_body    TEXT NOT NULL,
    content_hash  TEXT NOT NULL,
    created_by    TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    expires_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    CONSTRAINT freeze_draft_id_uuid CHECK (length(draft_id) = 36 AND draft_id GLOB '????????-????-????-????-????????????'),
    CONSTRAINT freeze_draft_body_json CHECK (json_valid(draft_body)),
    CONSTRAINT freeze_draft_hash_nonempty CHECK (length(content_hash) > 0),
    CONSTRAINT freeze_draft_created_by_nonempty CHECK (length(created_by) > 0),
    CONSTRAINT freeze_draft_created_at_iso CHECK (created_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at),
    -- INVARIANT M2-AD-9 (EDGE-30): a draft expires 24 h after creation.
    CONSTRAINT freeze_draft_expires_24h CHECK (expires_at = strftime('%Y-%m-%dT%H:%M:%fZ', created_at, '+24 hours')),
    CONSTRAINT freeze_draft_updated_at_iso CHECK (updated_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) IS updated_at),
    CONSTRAINT freeze_draft_updated_after_created CHECK (updated_at >= created_at)
) STRICT;

-- preview_run: AR 4.1 PREVIEW_RUN. runtime_snapshot is a boolean as the ER types it; 1 = AVAILABLE, 0 = UNAVAILABLE
-- (ruling N3: the API exposes the enumeration "AVAILABLE" | "UNAVAILABLE"; storage stays boolean).
CREATE TABLE preview_run (
    preview_run_id         TEXT    NOT NULL PRIMARY KEY,
    draft_id               TEXT    NOT NULL REFERENCES freeze_draft (draft_id),
    actor_id               TEXT    NOT NULL,
    content_hash           TEXT    NOT NULL,
    issued_at              TEXT    NOT NULL,
    expires_at             TEXT    NOT NULL,
    consumed_at            TEXT,
    denied_count           INTEGER NOT NULL,
    survivors              TEXT    NOT NULL,
    next_protected_window  TEXT,
    runtime_snapshot       INTEGER NOT NULL,
    created_at             TEXT    NOT NULL,
    updated_at             TEXT    NOT NULL,
    CONSTRAINT preview_run_id_uuid CHECK (length(preview_run_id) = 36 AND preview_run_id GLOB '????????-????-????-????-????????????'),
    CONSTRAINT preview_run_actor_nonempty CHECK (length(actor_id) > 0),
    CONSTRAINT preview_run_hash_nonempty CHECK (length(content_hash) > 0),
    CONSTRAINT preview_run_denied_count_nonneg CHECK (denied_count >= 0),
    CONSTRAINT preview_run_survivors_array CHECK (json_valid(survivors) AND json_type(survivors) = 'array'),
    CONSTRAINT preview_run_runtime_snapshot_bool CHECK (runtime_snapshot IN (0, 1)),
    CONSTRAINT preview_run_issued_at_iso CHECK (issued_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', issued_at) IS issued_at),
    -- INVARIANT M2-AD-9 / CT I3 (previewFreeze): expires_at = issued_at + 60 s (PREVIEW_TOKEN_TTL, prd.md 5.4).
    CONSTRAINT preview_run_expires_60s CHECK (expires_at = strftime('%Y-%m-%dT%H:%M:%fZ', issued_at, '+60 seconds')),
    -- INVARIANT M2-AD-9 / CT I2 (activateFreeze) (K5): a token is consumed inside [issued_at, expires_at] (closed at the end).
    CONSTRAINT preview_run_consumed_in_window CHECK (consumed_at IS NULL OR (consumed_at >= issued_at AND consumed_at <= expires_at)),
    CONSTRAINT preview_run_consumed_at_iso CHECK (consumed_at IS NULL OR (consumed_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', consumed_at) IS consumed_at)),
    CONSTRAINT preview_run_next_window_iso CHECK (next_protected_window IS NULL OR (next_protected_window GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', next_protected_window) IS next_protected_window)),
    CONSTRAINT preview_run_created_at_iso CHECK (created_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at),
    CONSTRAINT preview_run_updated_at_iso CHECK (updated_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) IS updated_at),
    CONSTRAINT preview_run_updated_after_created CHECK (updated_at >= created_at)
    -- NOT EXPRESSIBLE AS A CHECK: preview_run.actor_id equals the caller and content_hash equals the draft hash recomputed now
    --   (cross-table, caller-dependent): enforced by the single conditional UPDATE in section 6, statement 1.
) STRICT;

-- audit_events: S4. Append-only audit of freeze lifecycle actions. The action list is taken from the freeze routes of AR 5.1
-- (create draft, preview, activate, lift) and is a CHECK enumeration, confirmed by ruling M2. No updated_at (no-UPDATE group).
CREATE TABLE audit_events (
    id           TEXT NOT NULL PRIMARY KEY,
    occurred_at  TEXT NOT NULL,
    actor_id     TEXT NOT NULL,
    action       TEXT NOT NULL,
    freeze_id    TEXT REFERENCES freeze (freeze_id),
    detail       TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    CONSTRAINT audit_events_id_uuid7 CHECK (length(id) = 36 AND id GLOB '????????-????-7???-????-????????????'),
    CONSTRAINT audit_events_actor_nonempty CHECK (length(actor_id) > 0),
    -- The four actions of the freeze routes in AR 5.1 (ruling M2).
    CONSTRAINT audit_events_action_enum CHECK (action IN ('FREEZE_DRAFT_CREATED', 'FREEZE_PREVIEW_COMPUTED', 'FREEZE_ACTIVATED', 'FREEZE_LIFTED')),
    -- detail holds ids only (no names, no tokens): the check enforces a JSON object; the ids-only rule is enforced by the writer (AR M2-AD-8).
    CONSTRAINT audit_events_detail_object CHECK (json_valid(detail) AND json_type(detail) = 'object'),
    CONSTRAINT audit_events_occurred_at_iso CHECK (occurred_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', occurred_at) IS occurred_at),
    CONSTRAINT audit_events_created_at_iso CHECK (created_at GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9].[0-9][0-9][0-9]Z' AND strftime('%Y-%m-%dT%H:%M:%fZ', created_at) IS created_at)
) STRICT;

-- =============================================================================
-- 2. INVARIANTS THAT NEED MORE THAN A COLUMN CHECK
-- =============================================================================

-- INVARIANT M2-AD-9 / CT I1 (activateFreeze): at most 1 ACTIVE freeze per normalised scope key.
-- The key is (scope, subject_ids, node_class_ids); the arrays are stored lexicographically ordered (AR 4.2), json() minifies the text.
CREATE UNIQUE INDEX freeze_one_active_per_scope
    ON freeze (scope, json(subject_ids), json(node_class_ids))
    WHERE state = 'ACTIVE';

-- INVARIANT M2-AD-8 / CT I9 (evaluateRequest, D7): a DERIVED decision hangs off a ROOT decision (depth of the parent = 0), so a chain A -> B -> C is refused.
-- NOT EXPRESSIBLE AS A CHECK (cross-row); a BEFORE INSERT trigger reads no clock (PROPOSED, human to confirm).
CREATE TRIGGER decision_parent_is_root
BEFORE INSERT ON decision
WHEN NEW.derived_from IS NOT NULL
 AND (SELECT depth FROM decision WHERE decision_id = NEW.derived_from) IS NOT 0
BEGIN
    SELECT RAISE(ABORT, 'DERIVED_FROM_INVALID');
END;

-- INVARIANT M2-AD-3 (D13, AD3.d, task P2-TRIAGE-FIX-1): DECISION.evaluated_at equals the campus_now of the FACT_SNAPSHOT it references
-- (AR 4.2). NOT EXPRESSIBLE AS A CHECK (cross-table); the snapshot row is inserted before the decision row in the one transaction.
CREATE TRIGGER decision_evaluated_at_matches_snapshot
BEFORE INSERT ON decision
WHEN NEW.evaluated_at IS NOT (SELECT campus_now FROM fact_snapshot WHERE ref = NEW.evidence_snapshot_ref)
BEGIN
    SELECT RAISE(ABORT, 'EVALUATED_AT_SNAPSHOT_MISMATCH');
END;

-- INVARIANT M2-AD-3 (D1, ADV-2): a snapshot with an absent fact (NULL actor_kind, role_tier, model_facts or quota_facts) may back only a decision
-- whose cause is ACTOR_UNKNOWN, MODEL_NOT_FOUND or DEPENDENCY_UNAVAILABLE.
CREATE TRIGGER decision_null_facts_by_cause
BEFORE INSERT ON decision
WHEN (NEW.cause IS NULL OR NEW.cause NOT IN ('ACTOR_UNKNOWN', 'MODEL_NOT_FOUND', 'DEPENDENCY_UNAVAILABLE'))
 AND EXISTS (SELECT 1 FROM fact_snapshot WHERE ref = NEW.evidence_snapshot_ref
               AND (actor_kind IS NULL OR role_tier IS NULL OR model_facts IS NULL OR quota_facts IS NULL))
BEGIN
    SELECT RAISE(ABORT, 'FACTS_ABSENT_FOR_CAUSE');
END;

-- INVARIANT M2-AD-9 / CT I2 (activateFreeze): one PREVIEW_RUN is consumed at most once. A row whose consumed_at is set accepts no further UPDATE,
-- so a second consumption, or a reset of consumed_at to NULL, is refused whatever statement is issued (task P2-CROSSCHECK-1, Step 3).
-- The conditional UPDATE of section 6, statement 1 touches only rows with consumed_at IS NULL and passes.
CREATE TRIGGER preview_run_consumed_once
BEFORE UPDATE ON preview_run
WHEN OLD.consumed_at IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'TOKEN_CONSUMED');
END;

-- INVARIANT M2-AD-7 / AR 4.1 POLICY_VERSION.published_seq (D8): "monotonic, +1 per publish, gapless". A new version must carry the next integer,
-- so a skipped or repeated number is refused; two concurrent publishes both compute the same next number and the PRIMARY KEY refuses the second
-- (task P2-CROSSCHECK-1, Step 3).
CREATE TRIGGER policy_version_seq_next
BEFORE INSERT ON policy_version
WHEN NEW.published_seq <> (SELECT COALESCE(MAX(published_seq), 0) + 1 FROM policy_version)
BEGIN
    SELECT RAISE(ABORT, 'PUBLISHED_SEQ_NOT_NEXT');
END;

-- =============================================================================
-- 3. APPEND-ONLY (S6): BEFORE UPDATE and BEFORE DELETE triggers on every table of the M2-AD-8 list
--    policy_version, decision, trace_entry, decision_constraint, fact_snapshot, decision_outbox,
--    outbox_delivery, idempotency_key, obligation_observation, audit_events, suppressed_rule,
--    decision_citation (12 tables; the last two joined by ruling M1)
-- INVARIANT M2-AD-8 / CT I9 and M2-AD-7 / CT I8: no UPDATE and no DELETE on these tables.
-- =============================================================================

CREATE TRIGGER policy_version_no_update BEFORE UPDATE ON policy_version BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_policy_version'); END;
CREATE TRIGGER policy_version_no_delete BEFORE DELETE ON policy_version BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_policy_version'); END;
CREATE TRIGGER decision_no_update BEFORE UPDATE ON decision BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_decision'); END;
CREATE TRIGGER decision_no_delete BEFORE DELETE ON decision BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_decision'); END;
CREATE TRIGGER trace_entry_no_update BEFORE UPDATE ON trace_entry BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_trace_entry'); END;
CREATE TRIGGER trace_entry_no_delete BEFORE DELETE ON trace_entry BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_trace_entry'); END;
CREATE TRIGGER decision_constraint_no_update BEFORE UPDATE ON decision_constraint BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_decision_constraint'); END;
CREATE TRIGGER decision_constraint_no_delete BEFORE DELETE ON decision_constraint BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_decision_constraint'); END;
CREATE TRIGGER fact_snapshot_no_update BEFORE UPDATE ON fact_snapshot BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_fact_snapshot'); END;
CREATE TRIGGER fact_snapshot_no_delete BEFORE DELETE ON fact_snapshot BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_fact_snapshot'); END;
CREATE TRIGGER decision_outbox_no_update BEFORE UPDATE ON decision_outbox BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_decision_outbox'); END;
CREATE TRIGGER decision_outbox_no_delete BEFORE DELETE ON decision_outbox BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_decision_outbox'); END;
CREATE TRIGGER outbox_delivery_no_update BEFORE UPDATE ON outbox_delivery BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_outbox_delivery'); END;
CREATE TRIGGER outbox_delivery_no_delete BEFORE DELETE ON outbox_delivery BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_outbox_delivery'); END;
CREATE TRIGGER idempotency_key_no_update BEFORE UPDATE ON idempotency_key BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_idempotency_key'); END;
CREATE TRIGGER idempotency_key_no_delete BEFORE DELETE ON idempotency_key BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_idempotency_key'); END;
CREATE TRIGGER obligation_observation_no_update BEFORE UPDATE ON obligation_observation BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_obligation_observation'); END;
CREATE TRIGGER obligation_observation_no_delete BEFORE DELETE ON obligation_observation BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_obligation_observation'); END;
CREATE TRIGGER audit_events_no_update BEFORE UPDATE ON audit_events BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_audit_events'); END;
CREATE TRIGGER audit_events_no_delete BEFORE DELETE ON audit_events BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_audit_events'); END;
CREATE TRIGGER suppressed_rule_no_update BEFORE UPDATE ON suppressed_rule BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_suppressed_rule'); END;
CREATE TRIGGER suppressed_rule_no_delete BEFORE DELETE ON suppressed_rule BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_suppressed_rule'); END;
CREATE TRIGGER decision_citation_no_update BEFORE UPDATE ON decision_citation BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_decision_citation'); END;
CREATE TRIGGER decision_citation_no_delete BEFORE DELETE ON decision_citation BEGIN SELECT RAISE(ABORT, 'APPEND_ONLY_decision_citation'); END;

-- =============================================================================
-- 4. INDEXES (each names the ordering of AR 4.2 or the route of AR 5.1 that needs it)
-- =============================================================================

-- AR 4.2 ordering "trace[]: (precedence, rule_id)".
CREATE INDEX trace_entry_by_precedence ON trace_entry (decision_id, precedence, rule_id);
-- AR 4.2 ordering "constraints[]: (kind, deadline, value)" (value is JSON text; the index covers the first two keys).
CREATE INDEX decision_constraint_by_kind ON decision_constraint (decision_id, kind, deadline);
-- AR 5.1 GET /policy/freezes (filter by state, scope, from, to).
CREATE INDEX freeze_by_filters ON freeze (state, scope, starts_at, ends_at);
-- AR 5.1 / M2-AD-9 activation: "locates an unconsumed PreviewRun with a matching hash inside the window".
CREATE INDEX preview_run_unconsumed ON preview_run (draft_id, actor_id, content_hash) WHERE consumed_at IS NULL;
-- AR 5.3 lag metric: "the oldest outbox row with no delivered attempt".
CREATE INDEX decision_outbox_by_created ON decision_outbox (created_at);
-- AR 5.1 GET /policy/versions?since_seq= is served by the primary key of policy_version (published_seq).

-- =============================================================================
-- 5. SEED: the 12 POLICY_DOCUMENT rows of prd.md 5.3 (ids, titles, owners, versions as the PRD gives them)
-- content_hash is NULL for all 12 rows (ruling M4).
-- created_at / updated_at use the fixed value 1970-01-01T00:00:00.000Z because the migration has no Clock port (ruling M4).
-- =============================================================================
INSERT INTO policy_document (doc_id, title, owner, version, content_hash, created_at, updated_at) VALUES
    ('POL-FRZ',               'Emergency Compute Freeze Policy',     'Academic Administration', '2026-03-02', NULL, '1970-01-01T00:00:00.000Z', '1970-01-01T00:00:00.000Z'),
    ('POL-TIER',              'GPU Tier & Clearance Policy',         'Academic Administration', '2026-02-11', NULL, '1970-01-01T00:00:00.000Z', '1970-01-01T00:00:00.000Z'),
    ('POL-ENTITLE',           'Model Entitlement & Licensing Policy','M5 / Research Office',    '2026-01-20', NULL, '1970-01-01T00:00:00.000Z', '1970-01-01T00:00:00.000Z'),
    ('ROLE-TIERS',            'Role Tier Table',                     'M1',                      '2026-02-11', NULL, '1970-01-01T00:00:00.000Z', '1970-01-01T00:00:00.000Z'),
    ('POL-LAB',               'Protected Window Policy',             'Academic Administration', '2026-03-02', NULL, '1970-01-01T00:00:00.000Z', '1970-01-01T00:00:00.000Z'),
    ('POL-NIGHT',             'Overnight Training Window Policy',    'Academic Administration', '2026-03-02', NULL, '1970-01-01T00:00:00.000Z', '1970-01-01T00:00:00.000Z'),
    ('POL-QUOTA',             'Quota Tier Policy',                   'Academic Administration', '2026-03-02', NULL, '1970-01-01T00:00:00.000Z', '1970-01-01T00:00:00.000Z'),
    ('QUOTA-TIERS',           'Quota Tier Table',                    'M8',                      '2026-03-02', NULL, '1970-01-01T00:00:00.000Z', '1970-01-01T00:00:00.000Z'),
    ('FLEET-INV-2026-Q3',     'GPU Fleet Inventory, Q3 2026',        'M3',                      '2026-07-01', NULL, '1970-01-01T00:00:00.000Z', '1970-01-01T00:00:00.000Z'),
    ('SCHEDULE-2026-T5',      'Term 5 Class Timetable',              'Academic Administration', '2026-04-06', NULL, '1970-01-01T00:00:00.000Z', '1970-01-01T00:00:00.000Z'),
    ('CAMPUS-NOTICE-2026-04', 'Emergency Freeze Notice, April 2026', 'Dean''s Office',          '2026-04-09', NULL, '1970-01-01T00:00:00.000Z', '1970-01-01T00:00:00.000Z'),
    ('CATALOG',               'Model Catalog',                       'M5',                      '2026-04-01', NULL, '1970-01-01T00:00:00.000Z', '1970-01-01T00:00:00.000Z');

-- =============================================================================
-- 6. Reference statements for the repository (not executed by this migration)
-- The application supplies every instant ($now) from the Clock port; none of these statements reads a wall clock.
--
-- SQLite transaction mode: every write transaction that can race starts with
--     BEGIN IMMEDIATE;
--
-- Statement 1 — consume a preview token (single conditional statement; K5 closed end; used by activateFreeze, same transaction as the freeze insert):
--     UPDATE preview_run
--        SET consumed_at = $now, updated_at = $now
--      WHERE preview_run_id = $preview_run_id
--        AND consumed_at IS NULL
--        AND actor_id = $caller
--        AND content_hash = $draft_hash
--        AND $now <= expires_at
--     RETURNING preview_run_id;
--     -- 0 rows returned: map to TOKEN_CONSUMED, PREVIEW_EXPIRED, TOKEN_STALE or TOKEN_ACTOR_MISMATCH by reading the row afterwards;
--     -- the read happens after the single statement decided the race, so no race depends on it.
--
-- Statement 2 — insert the idempotency key first in the append transaction (the unique key decides the race):
--     INSERT INTO idempotency_key (actor_id, "key", request_hash, decision_id, created_at, replay_window_expires_at)
--     VALUES ($actor_id, $key, $request_hash, $decision_id, $now, strftime('%Y-%m-%dT%H:%M:%fZ', $now, '+24 hours'))
--     ON CONFLICT (actor_id, "key") DO NOTHING
--     RETURNING actor_id;
--     -- 0 rows returned: the key exists; the repository reads the stored row and answers the stored Decision, IDEMPOTENCY_BODY_MISMATCH or
--     -- IDEMPOTENCY_KEY_EXPIRED (contracts.md evaluateRequest P4); on PostgreSQL a concurrent insert waits for the first transaction.
--
-- Statement 3a — close the expired ACTIVE freezes of the same normalised scope, in the same transaction and before statement 3 (D5, ADV-6):
--     UPDATE freeze SET state = 'EXPIRED', updated_at = $now
--      WHERE state = 'ACTIVE' AND scope = $scope AND json(subject_ids) = json($subject_ids) AND json(node_class_ids) = json($node_class_ids)
--        AND ends_at <= $now;
--     -- writes no event and no audit row; freeze_expired_only_after_end refuses the value for a row whose ends_at is later than updated_at.
--
-- Statement 3 — activate a freeze: INSERT INTO freeze (...) VALUES (... 'ACTIVE' ...); a second ACTIVE row with the same scope key raises a
--     unique violation (freeze_one_active_per_scope), mapped to DUPLICATE_ACTIVE_FREEZE; the insert and statement 1 commit or roll back together.
-- =============================================================================
