# Review of the detailed design (Solu-2 Phase 2 gate)

Date: 2026-10-19 · Task: P2-CROSSCHECK-1 · Module: M2 Academic GPU Policy Engine · The dispositions were proposed on 2026-10-19 (P2-CROSSCHECK-1) and decided by the human in the triage applied by P2-TRIAGE-FIX-1; the final status of each row is in its last column and in the Triage record.

## PDF text executed (section 5, Phase 2)

Step 2.3: "Re-open your Binding Table from Phase 1. For every I clause, point to the exact CHECK/UNIQUE/guard line in the schema or domain file. Any clause with no pointer is a defect: fix the schema (preferred) or soften the contract with a documented trade-off (an AD-n Trade-off: entry)."

Gate: run the adversarial and the edge-case-hunter lenses on `planning/detailed-design/` and "save the triaged output to reviews/review-detailed-design.md". Grading: every finding Accept/Defer/Reject with reasoning; Accepted findings visibly fixed in the artifacts (the fixes are a later task, after the human triages).

(Both quotes are copied from the task text `prompts/NEXT.md` of P2-CROSSCHECK-1; they were not re-extracted from the PDF in this task: "not verified against the PDF".)

## Files reviewed (path, line count at Step 0, before Step 3; the SQL files after Step 3 are in the last column)

| File | Lines at Step 0 | Lines after Step 3 |
|---|---|---|
| `planning/detailed-design/contracts.md` | 218 | 218 |
| `planning/detailed-design/ports-and-adapters.md` | 273 | 273 |
| `planning/detailed-design/schemas/001_m2_schema.sqlite.sql` | 613 | 633 |
| `planning/detailed-design/schemas/001_m2_schema.postgres.sql` | 566 | 594 |
| `planning/detailed-design/schemas/dto.ts` | 450 | 450 |
| `planning/detailed-design/schemas/events.md` | 436 | 436 |
| `planning/detailed-design/schemas/openapi.yaml` | 985 | 985 |

Read for comparison: `planning/ARCHITECTURE.md`, `planning/prd.md`, `ux/EXPERIENCE.md` (the last two only where cited).

## Legend of pointer classes

- `DB-PHYSICAL`: a named CHECK, UNIQUE, partial unique index, FK, trigger or privilege rule, cited as name + line in the SQLite file (`S:`) and in the PostgreSQL file (`P:`).
- `DOMAIN-GUARD`: a named function, constructor check or state-machine guard that exists as a signature or rule in `contracts.md` or `ports-and-adapters.md` (no production code exists yet), with the Phase 3 test id that turns RED if it is removed (`contracts.md` §4 / `ARCHITECTURE.md` §11).
- `NONE`: no pointer: a defect.
- Verdicts: OK, DEFECT, TRADE-OFF NEEDED.

---

# Part A — Step 2.3 pointer table

Method: the SQL was read; the body of each constraint, trigger or index cited was read and compared with the clause (second list below). A comment that says `-- INVARIANT ...` was not taken as proof. Line numbers are those of the files after Step 3 (Step 3 added 2 triggers to each file; the lines of the constraints before section 2 did not move).

## A.1 Pointers per clause

`eR` = `evaluateRequest`, `pF` = `previewFreeze`, `aF` = `activateFreeze` (`contracts.md` §2). AD rows come from the 9 rows of `contracts.md` §4, split by mechanism.

| ref | clause (short quote) | AD-n | class | SQLite pointer | PostgreSQL pointer | domain pointer | verdict | note |
|---|---|---|---|---|---|---|---|---|
| eR.I1 | "`evaluate()` is a pure function of `(request, facts, policy_version)`" | AD-1 | DOMAIN-GUARD | — | — | signature `evaluate(request, facts, policy_version)` (`contracts.md` §4 row AD-1); `test/arch/ad1-imports.test.ts` | OK | not expressible in SQL |
| eR.I2 | "exactly one `primary_rule_id`, in the registry; every rule below the terminal rule is recorded `NOT_EVALUATED`" | AD-1 | DB-PHYSICAL (part) + DOMAIN-GUARD | `decision_rule_nonempty` S:181; `trace_entry_state_enum` S:252 | P:158; P:220 | `Decision` constructor rejects a `primary_rule_id` outside the registry; `test/arch/ad1-trace-complete.test.ts` | OK | registry membership and the `NOT_EVALUATED` completeness are cross-row or registry facts (S:139-140: "the registry is the frozen rule set, not a table"). No test id is named for the constructor's registry check alone (the row names `ad1-imports` and `ad1-trace-complete`) |
| eR.I3 | "`admission` and `authority` follow the equivalences in Q1" | AD-1 | DB-PHYSICAL (part) + DOMAIN-GUARD | `decision_rejected_iff_deny` S:179; `decision_allow_admitted` S:180; `decision_authority_enum` S:173 | P:156; P:157; P:150 | `Decision` constructor (`contracts.md` I3); the QUEUED ⟺ QUEUE_ONLY and PROVISIONAL ⟺ QUOTA_CAP equivalences are cross-table (S:208-210); test `ad1-trace-complete` named by the row does not target them | OK | `authority` has no physical guard; the equivalence tests are not named in §4 (Phase 3 mapping) |
| eR.I4 | "`valid_until` non-null and later than `evaluated_at`; `must_checkpoint_by = valid_until`; `evaluated_at` single instant read first" | AD-3 | DB-PHYSICAL + DOMAIN-GUARD | `decision_valid_until_required` S:186; `decision_valid_until_after_evaluated` S:187; `decision_single_deadline` S:189 | P:163; P:164; P:166 | shell reads `campus.clock` first; `test/arch/ad3-clock-order.test.ts` | OK after Step 3 | before F4 the clause "`must_checkpoint_by = valid_until` whenever non-null" was not enforced when `valid_until` was null (S:189 / P:166, finding EDG-2) |
| eR.I5 | "every fact port that can change `outcome` … has an admission tolerance in the register" | AD-4 | DOMAIN-GUARD | — | — | `PORT_REGISTER`; `test/arch/ad4-register.test.ts` | OK | |
| eR.I6 | "every emitted constraint has a non-null `enforced_by`; `HARD_DEADLINE`, `QUEUE_ONLY`, `QUOTA_CAP` carry a non-null `deadline`; no client for a mutating method" | AD-5 | DB-PHYSICAL + DOMAIN-GUARD | `decision_constraint_enforced_by_nonempty` S:228 (+ NOT NULL S:220); `decision_constraint_deadline_by_kind` S:231; `decision_constraint_kind_enum` S:225 | P:198; P:201; P:196 | constructor; import-graph; `test/arch/ad5-enforced-by.test.ts`, `ad5-write-scope.test.ts` | OK | |
| eR.I7 | "at least 1 `citation_id` that resolves in `POLICY_DOCUMENT`; 0 model calls" | AD-6 | DB-PHYSICAL (part) + DOMAIN-GUARD | FK `decision_citation.doc_id` S:280 | P:244 | constructor rejects empty `citations[]`; `test/arch/ad6-citations.test.ts`, `ad6-no-model.test.ts` | OK | "at least 1" is cross-row (S:286-287) |
| eR.I8 | "one `policy_version` read from start to finish; version, `content_hash`, `engine_version`, `campus_tz`, `tzdata_version` on the `Decision`" | AD-7 | DB-PHYSICAL + DOMAIN-GUARD | FK `decision.policy_version` S:167; `policy_version_hash_sha256` S:61; `fact_snapshot.campus_tz`, `tzdata_version` NOT NULL S:109, S:111 | P:144; P:54; P:`fact_snapshot` columns | one resolved registry reference at start; `test/arch/ad7-pinning.test.ts` | OK | "read from start to finish" is a runtime property |
| eR.I9 | "one `(actor_id, key)` yields one `decision_id`; the stored snapshot contains actor ids and none of: names, addresses, tokens, keys" | AD-8 | DB-PHYSICAL (part) + DOMAIN-GUARD | `PRIMARY KEY (actor_id, "key")` S:347; no-UPDATE triggers S:558-559 | P:304; REVOKE P:524 | typed `FACT_SNAPSHOT` projection with a write-time allow-list; `test/arch/ad8-derived.test.ts`, `test/nfr/nfr-5.test.ts` | OK | the "ids only" half is DOMAIN-GUARD only: the JSON columns of `fact_snapshot` accept any text |
| eR.I10 | "`Request.actor_ref` equals the session actor or the result is `DENY(INVALID_REQUEST)`" | AD-9 | DOMAIN-GUARD | — | — | `R-VALID-01`; `test/arch/ad9-actor-binding.test.ts` | OK | |
| pF.I1 | "a `preview_token` exists only for a `PREVIEW_RUN` row the server wrote; `curl` cannot forge it" | AD-9 | DOMAIN-GUARD | `preview_run` row (PK `preview_run_id`) | same | HMAC with `server_secret` (`contracts.md` previewFreeze Q1); no test named for "no row, no token" | DEFECT | `AR` §11 row "preview precondition" (`sa-5.test.ts`) lists: preview stubbed to fail, hash mismatch, expired token, three activations; no forged-token case. Test-mapping gap, not fixable in SQL |
| pF.I2 | "`PREVIEW_RUN.actor_id` equals the caller; the token is valid for that actor only" | AD-9 | DOMAIN-GUARD | `preview_run_actor_nonempty` S:457; conditional UPDATE is a comment (section 6, statement 1, S:611-621: `AND actor_id = $caller`) | P:399; comment P:572-582 | repository statement 1; test for the actor code `TOKEN_ACTOR_MISMATCH` not named | DEFECT | the binding is a reference statement in a comment, not a constraint. The row-level guard is DOMAIN-GUARD, and `AR` §11 names no test for a token of another actor (`ad9-actor-binding.test.ts` covers `Request.actor_ref`). Test-mapping gap |
| pF.I3 | "`expires_at = issued_at + 60 s`" | AD-9 | DB-PHYSICAL | `preview_run_expires_60s` S:464 | P:404 | — | OK | |
| pF.I4 | "the preview does not write `FREEZE`, `DECISION` or `DECISION_OUTBOX`; not journalled, not published" | AD-5, AD-9 | DOMAIN-GUARD | — (SQLite has no grants) | grants P:516, P:522 give `m2_app` INSERT on `freeze`, `decision`, `decision_outbox`; no PostgreSQL guard | `ad5-write-scope.test.ts` limits the tables the module writes; `previewFreeze` is allowed to write `preview_run` only | DEFECT | no named test turns RED if `previewFreeze` inserts a `FREEZE` or `DECISION` row (both are tables the module owns). Test-mapping gap |
| aF.I1 | "at most 1 `FREEZE` row with `state = 'ACTIVE'` per normalised scope key" | AD-9 | DB-PHYSICAL | `freeze_one_active_per_scope` S:502 | P:436 | `test/arch/ad9-freeze-concurrency.test.ts` | OK | the key is `(scope, subject_ids, node_class_ids)`; sorted arrays are the writer's duty (see ADV/EDG and Part E) |
| aF.I2 | "activated only against an unconsumed, unexpired, actor-bound `PREVIEW_RUN` whose hash equals the draft hash; one `PREVIEW_RUN` is consumed at most once" | AD-9 | DB-PHYSICAL + DOMAIN-GUARD | `preview_run_consumed_once` S:519 (**added in Step 3**); `preview_run_consumed_in_window` S:466 | P:465 (**added in Step 3**); P:406 | conditional UPDATE statement 1; `test/scenario/sa-5.test.ts` | OK after Step 3 | **before Step 3: DEFECT** — `preview_run` is outside the no-UPDATE group (S:454-455 `updated_at`; P:522 `GRANT UPDATE ... preview_run`), so `consumed_at` could be overwritten or reset; no constraint refused it |
| aF.I3 | "`FREEZE` satisfies `ends_at > starts_at`; `subject_ids` empty unless `SUBJECT`; `node_class_ids` empty unless `NODE_CLASS`; `allowances` non-null array" | AD-9 | DB-PHYSICAL | `freeze_window_ordered` S:404; `freeze_subject_ids_by_scope` S:401; `freeze_node_class_ids_by_scope` S:402; `freeze_allowances_array` S:399 | P:356; P:353; P:354; P:351 | `test/arch/ad9-scope-predicate.test.ts` | OK | |
| aF.I4 | "`activated_by_role_tier` is the tier read at activation" | AD-9 | DB-PHYSICAL (part) + DOMAIN-GUARD | `freeze_activation_recorded` S:409 (non-null once not DRAFT) | P:361 | role tier re-read fresh; `test/arch/ad9-role-revocation.test.ts` | OK | the value is not checkable in SQL |
| aF.I5 | "activation changes no table that another component owns" | AD-5 | DB-PHYSICAL (PostgreSQL only) + DOMAIN-GUARD | none: the file holds only M2-owned tables | grants P:516-528 | import-graph; `test/arch/ad5-write-scope.test.ts` | TRADE-OFF NEEDED | the SQLite profile has no grants; `AR` M2-AD-5 Trade-off (`ARCHITECTURE.md` line 631) does not mention it. Proposed entry text in Part A.4 |

## A.2 Binding-table rows split by mechanism (`contracts.md` §4)

| ref | mechanism | AD-n | class | SQLite pointer | PostgreSQL pointer | domain pointer | verdict | note |
|---|---|---|---|---|---|---|---|---|
| AD1.a | `evaluate(request, facts, policy_version)` signature with no other parameter | AD-1 | DOMAIN-GUARD | — | — | `policy/core`; `ad1-imports.test.ts` | OK | |
| AD1.b | build-time import allow-list over `policy/core` | AD-1 | DOMAIN-GUARD | — | — | `ad1-imports.test.ts` (adding `pg` turns it red) | OK | |
| AD1.c | `Decision` constructor rejects a `primary_rule_id` outside the registry | AD-1 | DOMAIN-GUARD | `decision_rule_nonempty` S:181 (non-empty only) | P:158 | constructor; test for this check alone not named (see eR.I2) | OK | same note as eR.I2 |
| AD2.a | boot validator over the registry (duplicate precedence, range, citation, template, subsumption, unread field) | AD-2 | DOMAIN-GUARD (+ DB range) | `trace_entry_precedence_range` S:255 (range −1..1000 on stored trace) | P:222 | boot validator; `/ready`; `ad2-precedence`, `ad2-subsumption`, `ad2-shipped-registry` | OK | |
| AD2.b | `/ready` runs the validator | AD-2 | DOMAIN-GUARD | — | — | `ad2-shipped-registry.test.ts` | OK | |
| AD3.a | bound computed once in the core before the walk | AD-3 | DOMAIN-GUARD | — | — | `ad3-boundary.test.ts`, `single-deadline.test.ts` | OK | |
| AD3.b | `Decision` constructor rejects `valid_until` null or `≤ evaluated_at` | AD-3 | DB-PHYSICAL + DOMAIN-GUARD | S:186, S:187 | P:163, P:164 | `ad3-past-bound.test.ts` | OK | |
| AD3.c | shell reads `campus.clock` first | AD-3 | DOMAIN-GUARD | — | — | `ad3-clock-order.test.ts` | OK | |
| AD3.d | `DECISION.evaluated_at = FACT_SNAPSHOT.campus_now` | AD-3 | DOMAIN-GUARD only | none (`NOT EXPRESSIBLE AS A CHECK`, S:206-207; P comment) | none | constructor and one transaction; no named test for the equality | TRADE-OFF NEEDED | `AR` §4.2 says "`evaluated_at` has `CHECK (evaluated_at = FACT_SNAPSHOT.campus_now)`"; `review-arch-implementability.md` G-10 records the decision to keep it in the shell, but the M2-AD-3 Trade-off (`ARCHITECTURE.md` line 595) speaks only of `valid_until`. Not fixed in SQL: G-10 was settled by the human (a trigger would reopen it). Proposed entry text in Part A.4 |
| AD4.a | `PORT_REGISTER` as data; register test against `ports/out/` | AD-4 | DOMAIN-GUARD | — | — | `ad4-register.test.ts` | OK | |
| AD4.b | per-adapter result classifier (`ok`, `notFound`, transport error, `ok(malformed)`) | AD-4 | DOMAIN-GUARD | — | — | `ad4-port-failure.test.ts`, `ad4-payload-schema.test.ts` | OK | |
| AD4.c | `R-DEP-01` row at precedence 0 inside the walk | AD-4 | DOMAIN-GUARD | — | — | `ad4-port-failure.test.ts`, `predicate-totality.test.ts` | OK | |
| AD5.a | `Decision` constructor rejects null `enforced_by` and null `deadline` for the three kinds | AD-5 | DB-PHYSICAL + DOMAIN-GUARD | S:228, S:231 | P:198, P:201 | `ad5-enforced-by.test.ts` | OK | |
| AD5.b | import-graph test over `policy/core` and `decision/shell` | AD-5 | DOMAIN-GUARD | — | — | `ad5-write-scope.test.ts` | OK | |
| AD5.c | write grants limited to the owned tables (PostgreSQL profile) | AD-5 | DB-PHYSICAL (PostgreSQL only) | none | GRANT P:516, P:520, P:522 | `ad8-grants.test.ts` is named for AD-8, none for AD-5 grants | TRADE-OFF NEEDED | same as aF.I5 |
| AD5.d | clause with no enforcement point inside the module (Gateway re-submits after `valid_until`; delegates do not adjudicate) | AD-5 | NONE (declared) | — | — | `ad5-no-local-adjudication.test.ts` scans packages inside the repository | OK | the `contracts.md` row declares it, and the M2-AD-5 Trade-off (`ARCHITECTURE.md` line 631) states "the module cannot guarantee a deadline is honoured" |
| AD6.a | `Decision` constructor rejects empty `citations[]` | AD-6 | DOMAIN-GUARD (+ FK) | FK S:280 | P:244 | `ad6-citations.test.ts` | OK | |
| AD6.b | renderer takes `rationale_template[primary_rule_id]` plus matched evidence | AD-6 | DOMAIN-GUARD | `decision_rationale_nonempty` S:182 | P:159 | `ad6-derivation.test.ts`, `ad6-templates.test.ts` | OK | |
| AD6.c | boot validator rejects an unresolved `citation_id` | AD-6 | DOMAIN-GUARD (+ FK) | FK S:280 | P:244 | `ad6-citations.test.ts` | OK | |
| AD6.d | import-graph over the renderer (no model client, no network) | AD-6 | DOMAIN-GUARD | — | — | `ad6-no-model.test.ts` | OK | |
| AD7.a | no `UPDATE` or `DELETE` on `POLICY_VERSION` | AD-7 | DB-PHYSICAL | `policy_version_no_update` S:544, `policy_version_no_delete` S:545 | triggers P:490, P:492; REVOKE P:524 | `ad7-immutable.test.ts` | OK | PostgreSQL trigger rejects for every role (P:480-489 comment) |
| AD7.b | `content_hash` over rule set, constants, `CAMPUS_TZ`, `tzdata_version`, `engine_version` | AD-7 | DOMAIN-GUARD (+ DB shape) | `policy_version_hash_sha256` S:61; `policy_version_seq_next` S:529 (**added in Step 3**, gapless id) | P:54; P:479 | `ad7-reproducible.test.ts` | OK | only the hash shape is physical |
| AD7.c | evaluation takes one resolved registry reference at start | AD-7 | DOMAIN-GUARD (+ FK) | FK S:167 | P:144 | `ad7-pinning.test.ts` | OK | `contracts.md` §4 row AD-7 says the "referential check ... has no stated mechanism (Section 6)": Section 6 has no such point (finding ADV in Part C) |
| AD8.a | no `UPDATE`/`DELETE` on the 12 tables | AD-8 | DB-PHYSICAL | triggers S:546-S:567 (22 triggers) + S:544-545 | `REVOKE UPDATE, DELETE` P:524 (11 tables) + triggers P:490/P:492 (`policy_version`) | `ad8-immutable.test.ts` (SQLite), `ad8-grants.test.ts` (PostgreSQL) | OK | the PostgreSQL mechanism is a privilege: a role that owns the tables or holds the privilege can still write; SQLite triggers refuse every connection. Different strength, recorded in Part E |
| AD8.b | `UNIQUE (actor_id, key)` on `IDEMPOTENCY_KEY` | AD-8 | DB-PHYSICAL | `PRIMARY KEY (actor_id, "key")` S:347 | P:304 | `ad8-idempotence.test.ts` | OK | |
| AD8.c | outbox check: exactly one of `decision_id` and `failure_id` non-null | AD-8 | DB-PHYSICAL | `decision_outbox_exactly_one_id` S:306 (+ S:308, S:310) | P:269 (+ P:271, P:273) | — | OK | |
| AD8.d | `CHECK (depth <= 1)` | AD-8 | DB-PHYSICAL | `decision_depth_max_1` S:199; `decision_parent_depth_coherent` S:200; trigger `decision_parent_is_root` S:508 | P:176; P:177; trigger P:451 | `ad8-derived.test.ts` | OK | |
| AD8.e | typed `FACT_SNAPSHOT` projection with a write-time allow-list | AD-8 | DOMAIN-GUARD | typed columns S:94-114 | P:`fact_snapshot` | `nfr-5.test.ts` | OK | see eR.I9 |
| AD9.a | activation locates and consumes an unconsumed `PREVIEW_RUN` in one transaction | AD-9 | DB-PHYSICAL (after Step 3) + DOMAIN-GUARD | S:519 (consumed once); S:466; statement 1 S:611-621 (comment) | P:465; P:406; P:572-582 (comment) | `sa-5.test.ts` | OK after Step 3 | same as aF.I2 |
| AD9.b | partial unique index on the normalised scope key `WHERE state = 'ACTIVE'` | AD-9 | DB-PHYSICAL | S:502 | P:436 | `ad9-freeze-concurrency.test.ts` | OK | |
| AD9.c | `CHECK` constraints of `FREEZE` | AD-9 | DB-PHYSICAL | S:399, S:401, S:402, S:404, S:409 | P:351, P:353, P:354, P:356, P:361 | `ad9-scope-predicate.test.ts` | OK | |
| AD9.d | `R-VALID-01` compares `Request.actor_ref` with the session actor; HTTP 200 `DENY` | AD-9 | DOMAIN-GUARD | — | — | `ad9-actor-binding.test.ts` | OK | |
| AD9.e | role tier re-read at activation | AD-9 | DOMAIN-GUARD | — | — | `ad9-role-revocation.test.ts` | OK | |

## A.3 Constraint bodies read (second list)

Bodies read in `001_m2_schema.sqlite.sql` (S) and `001_m2_schema.postgres.sql` (P); "matches" means the body enforces the clause named in the table.

| Name | Body (short quote) | Matches |
|---|---|---|
| `decision_rejected_iff_deny` S:179 / P:156 | `CHECK ((admission = 'REJECTED') = (outcome = 'DENY'))` | yes |
| `decision_allow_admitted` S:180 / P:157 | `CHECK (outcome <> 'ALLOW' OR admission = 'ADMITTED')` | yes, ALLOW part of Q1 only |
| `decision_cause_iff_deny` S:177 / P:154 | `CHECK ((cause IS NOT NULL) = (outcome = 'DENY'))` | yes |
| `decision_valid_until_required` S:186 / P:163 | `CHECK (outcome = 'DENY' OR valid_until IS NOT NULL)` | yes |
| `decision_valid_until_after_evaluated` S:187 / P:164 | `CHECK (valid_until IS NULL OR valid_until > evaluated_at)` | yes (text instants are fixed width, so text order is time order, M3) |
| `decision_single_deadline` S:189 / P:166 (body changed by F4) | `CHECK (must_checkpoint_by IS NULL OR (valid_until IS NOT NULL AND must_checkpoint_by = valid_until))`; the body read in Step 1 was `must_checkpoint_by IS NULL OR must_checkpoint_by = valid_until` | yes after F4; the earlier body passed a null `valid_until` |
| `decision_depth_max_1` S:199 / P:176 | `CHECK (depth >= 0 AND depth <= 1)` | yes |
| `decision_parent_depth_coherent` S:200 / P:177 | ROOT ⟺ `derived_from` null ⟺ depth 0; DERIVED ⟺ non-null ⟺ depth 1 | yes |
| `decision_parent_is_root` S:508 / P:451 | `BEFORE INSERT ... WHEN NEW.derived_from IS NOT NULL AND (SELECT depth ...) IS NOT 0` raises `DERIVED_FROM_INVALID` | yes (refuses a chain A → B → C) |
| `decision_constraint_deadline_by_kind` S:231 / P:201 | the three kinds require `deadline IS NOT NULL`; `MODEL_VARIANT` and `RESOURCE_SUBSTITUTION` require NULL; `WINDOW_SCOPE` free | yes |
| `decision_constraint_enforced_by_nonempty` S:228 / P:198 | `CHECK (length(enforced_by) > 0)` with column `NOT NULL` | yes |
| `decision_outbox_exactly_one_id` S:306 / P:269 | S: `(decision_id IS NULL) <> (failure_id IS NULL)`; P: `num_nonnulls(decision_id, failure_id) = 1` | yes |
| `PRIMARY KEY (actor_id, "key")` S:347 / P:304 | composite primary key | yes |
| `idempotency_key_window_24h` S:353 / P:309 | `replay_window_expires_at = created_at + 24 h` | yes (D2) |
| `policy_version_hash_sha256` S:61 / P:54 | S: length 64 and no non-hex character; P: `~ '^[0-9a-f]{64}$'` | yes (shape only) |
| `policy_version_no_update` / `_no_delete` S:544-545 / P:490-492 | `RAISE(ABORT, 'APPEND_ONLY_policy_version')` / `RAISE EXCEPTION 'APPEND_ONLY_%'` | yes |
| the 22 other no-UPDATE/no-DELETE triggers S:546-567 | each `BEFORE UPDATE`/`BEFORE DELETE ... RAISE(ABORT, 'APPEND_ONLY_<table>')` | yes, 11 tables × 2 |
| `REVOKE UPDATE, DELETE` P:524 | 12 tables including `policy_version` | yes (privilege, not trigger, for 11 of them) |
| `freeze_one_active_per_scope` S:502 / P:436 | S: `UNIQUE INDEX ON freeze (scope, json(subject_ids), json(node_class_ids)) WHERE state = 'ACTIVE'`; P: same columns without `json()` | yes; array element order matters (jsonb and `json()` text compare in order) |
| `freeze_subject_ids_by_scope` S:401 / P:353 | `scope = 'SUBJECT' OR json_array_length(subject_ids) = 0` | yes |
| `freeze_window_ordered` S:404 / P:356 | `CHECK (ends_at > starts_at)` | yes |
| `freeze_activation_recorded` S:409 / P:361 | non-DRAFT states need non-empty `activated_by`, `activated_by_role_tier`, non-null `activated_at` | yes |
| `preview_run_expires_60s` S:464 / P:404 | `expires_at = issued_at + 60 seconds` | yes |
| `preview_run_consumed_in_window` S:466 / P:406 | `consumed_at IS NULL OR (consumed_at >= issued_at AND consumed_at <= expires_at)` | yes, K5 closed end; does not stop a second write |
| `preview_run_consumed_once` S:519 / P:465 (Step 3) | `BEFORE UPDATE ... WHEN OLD.consumed_at IS NOT NULL` raises `TOKEN_CONSUMED` | yes |
| `policy_version_seq_next` S:529 / P:479 (Step 3) | `BEFORE INSERT ... WHEN NEW.published_seq <> COALESCE(MAX(published_seq), 0) + 1` raises `PUBLISHED_SEQ_NOT_NEXT` | yes |

## A.4 Proposed Trade-off entry texts (not applied: `ARCHITECTURE.md` is read-only in this task)

All `PROPOSED, human to confirm`.

- For `M2-AD-3` (row AD3.d): "**Trade-off:** `evaluated_at = FACT_SNAPSHOT.campus_now` is a cross-table equality that no `CHECK` can express; it is kept by the Decision constructor and the single transaction of §4.2, and no database object refuses a row that breaks it. A trigger comparing the two instants on insert would close the gap at the cost of one read per decision insert." (smallest alternative: that trigger.)
- For `M2-AD-5` (row AD5.c and aF.I5): "**Trade-off:** write grants limited to the owned tables exist only in the PostgreSQL profile. The SQLite profile has no privilege model; its schema holds only tables this module owns, and the import-graph test `ad5-write-scope.test.ts` is the only guard against a write to another component's aggregate."

## A.5 Part A counts

- Clauses and mechanisms in the table: 19 `I` clauses (`evaluateRequest` 10, `previewFreeze` 4, `activateFreeze` 5; counted from `contracts.md` §2) + 33 split binding-table mechanisms (AD-1 3, AD-2 2, AD-3 4, AD-4 3, AD-5 4, AD-6 4, AD-7 3, AD-8 5, AD-9 5) = **52** lines; the 9 binding-table rows are all represented.
- **OK 46** (15 of the 19 `I` clauses + 31 of the 33 mechanisms; three of them, aF.I2, AD9.a and eR.I4, are OK only after the Step 3 fixes F1 and F4). **DEFECT 3** (pF.I1, pF.I2, pF.I4: all three are test-mapping gaps in `contracts.md` §4 / `ARCHITECTURE.md` §11 and none is fixable in SQL). **TRADE-OFF NEEDED 3** (aF.I5, AD3.d, AD5.c; aF.I5 and AD5.c are one underlying item, so 2 distinct Trade-off texts in A.4). 46 + 3 + 3 = 52.
- `DOMAIN-GUARD` only (no database object that refuses a violation): eR.I1, eR.I5, eR.I10, pF.I1, pF.I2 (its binding is a comment-only statement), pF.I4, AD1.a, AD1.b, AD2.b, AD3.a, AD3.c, AD3.d, AD4.a, AD4.b, AD4.c, AD5.b, AD6.d, AD9.d, AD9.e.
- Before Step 3 the count was: DEFECT 6 (the three above plus aF.I2, AD9.a and eR.I4), OK 43, TRADE-OFF NEEDED 3. Fix F2 (gapless `published_seq`) closed no clause of the 52 (it serves the race list of Part B); F3 closed no clause either (it made the PostgreSQL file loadable, so every `P:` pointer is now machine-checked to exist).

## A.6 Observations found while reading (not clauses; carried to Part E)

- `contracts.md` activateFreeze "Concurrency": "a compare-and-swap on the freeze store version" — the `freeze` table has no version column in either file (S:376-418, P:333-381).
- `ARCHITECTURE.md` §4.1 (line 280): `published_seq` is "monotonic, +1 per publish, gapless (P1-ARCH-AMEND D8)" — before Step 3 only `policy_version_seq_positive` S:59 and the primary key existed.
- The SQLite file's append-only mechanism is 22 triggers (11 tables) + 2 on `policy_version`; PostgreSQL uses `REVOKE` for 11 tables and triggers only for `policy_version`.

---

# Step 3 — fixes applied to both SQL files

| # | Constraint | SQLite | PostgreSQL | Stated by | Test probe (run in Step 7) |
|---|---|---|---|---|---|
| F1 | trigger `preview_run_consumed_once` | S:519 | P:465 (function `m2_preview_run_consumed_once`) | `contracts.md` activateFreeze I2 "one `PREVIEW_RUN` is consumed at most once"; `ARCHITECTURE.md` §5.1 "`consumed_at` is written in the same transaction as the activation, so a second presentation is `409 TOKEN_CONSUMED`" | see Step 7 |
| F2 | trigger `policy_version_seq_next` | S:529 | P:479 (function `m2_policy_version_seq_next`) | `ARCHITECTURE.md` §4.1 `POLICY_VERSION.published_seq` "monotonic, +1 per publish, gapless" (D8) | see Step 7 |

| F3 | the table name `freeze` quoted as `"freeze"` in 7 places (table, 2 foreign keys, partial unique index, 2 `GRANT` lists, `freeze_by_filters`); the name is unchanged | — (SQLite accepts the bare word) | P:329, P:343, P:419, P:437, P:518, P:522, P:539 | `FREEZE` is a reserved keyword in PostgreSQL; the file stopped at the first use (`syntax error at or near "freeze"` when loaded in the embedded engine) | loaded in embedded PostgreSQL before F3: ERROR; after F3: loaded, 16 tables, 5 user triggers |
| F4 | `decision_single_deadline` body: `must_checkpoint_by IS NULL OR (valid_until IS NOT NULL AND must_checkpoint_by = valid_until)` | S:189 | P:166 | `contracts.md` evaluateRequest Q1 "`must_checkpoint_by`, when non-null, equals `valid_until`"; the earlier body let a `DENY` (null `valid_until`) carry a non-null `must_checkpoint_by`, because `NULL = x` is not true (finding EDG-2) | before F4: the `DENY` row with a checkpoint and no deadline was ACCEPTED (SQLite); after F4: REJECTED by name in SQLite and in embedded PostgreSQL; an `ALLOW` with `valid_until = must_checkpoint_by` is ACCEPTED |

Nothing else in the SQL changed: no new table, the 12-table append-only group, the `created_at` rules and the column order are untouched. Line counts are unchanged by F3 and F4 (the F4 comment is on the same line); the two SQL files end at 633 lines (SQLite) and 594 lines (PostgreSQL), including F1 and F2. The pointer lines of Part A were taken after F1–F4. Trigger count: SQLite 25 before Step 3, 27 after; PostgreSQL user triggers 3 before Step 3 (`decision_parent_is_root`, `policy_version_no_update`, `policy_version_no_delete`), 5 after. The two reviewers of Parts C and D started while F2 was being written, so ADV-16 saw the PostgreSQL trigger and not the SQLite one.

---

## A.7 Part A pointers re-run after P2-TRIAGE-FIX-1 (current line numbers)

The triage fixes (D1, D3, D4, D5, D6, D11, D13 and the comment cleanup) added or removed lines in both SQL files, so the `S:` and `P:` numbers of A.1, A.2 and A.3 above are those of the end of P2-CROSSCHECK-1 and are superseded by this table. The SQL files now have 672 lines (SQLite) and 647 lines (PostgreSQL). Every pointer below was read in the file after the edits (24 spot-checked by reading the line: see Step 6 of the P2-TRIAGE-FIX-1 self-check).

| ref | SQLite pointer | PostgreSQL pointer | verdict now | change since A.1/A.2 |
|---|---|---|---|---|
| eR.I1, eR.I5, eR.I10 | — | — | OK | none (DOMAIN-GUARD) |
| eR.I2 | `decision_rule_nonempty` S:184; `trace_entry_state_enum` S:257 | P:161; P:225 | OK | lines moved |
| eR.I3 | `decision_rejected_iff_deny` S:182; `decision_allow_admitted` S:183; `decision_authority_enum` S:176 | P:159; P:160; P:153 | OK | lines moved |
| eR.I4 | `decision_valid_until_required` S:189; `decision_valid_until_after_evaluated` S:190; `decision_single_deadline` S:192 | P:166; P:167; P:169 | OK | lines moved |
| eR.I6 | `decision_constraint_enforced_by_nonempty` S:233; `decision_constraint_deadline_by_kind` S:236; `decision_constraint_kind_enum` S:228; `decision_constraint_value_kind_matches` S:231 (D11) | P:203; P:206; P:199; P:201 | OK | D11 adds the `value.kind` check |
| eR.I7 | FK `decision_citation.doc_id` S:285 | P:249 | OK | lines moved |
| eR.I8 | FK `decision.policy_version` S:170; `policy_version_hash_sha256` S:61; `fact_snapshot.campus_tz` S:112, `tzdata_version` S:114 | P:147; P:54; P:99; P:101 | OK | lines moved |
| eR.I9 | `PRIMARY KEY (actor_id, "key")` S:354; no-UPDATE triggers S:579-600 | P:313; `REVOKE UPDATE, DELETE` P:571 | OK | lines moved; D1 makes four snapshot columns nullable (trigger S:540 / P:498) |
| pF.I1 | — (token existence is a domain rule) | — | OK | D15 names the RED test `test/arch/ad9-no-row-no-token.test.ts` (`contracts.md` §4 row AD-9; `ARCHITECTURE.md` §11): DEFECT cleared |
| pF.I2 | `preview_run_actor_nonempty` S:470; statement 1 (comment) S:644-654 | P:418; P:619-629 | OK | D15 names `test/arch/ad9-token-actor.test.ts`; D7 puts `actor_id` inside the HMAC: DEFECT cleared |
| pF.I3 | `preview_run_expires_60s` S:477 | P:423 | OK | lines moved |
| pF.I4 | — (SQLite has no grants) | grants P:563, P:569 give `m2_app` INSERT on the owned tables | OK | D15 names `test/arch/ad9-preview-writes-nothing.test.ts`: DEFECT cleared |
| aF.I1 | `freeze_one_active_per_scope` S:515 | P:455 | OK | lines moved |
| aF.I2 | `preview_run_consumed_once` S:552; `preview_run_consumed_in_window` S:479 | P:512; P:425 | OK | lines moved; D7 adds the order of checks (`contracts.md` P8) |
| aF.I3 | `freeze_allowances_array` S:406; `freeze_subject_ids_by_scope` S:408; `freeze_node_class_ids_by_scope` S:409; `freeze_window_ordered` S:411; `freeze_subject_ids_required` S:413; `freeze_node_class_ids_required` S:414 | P:360; P:362; P:363; P:365; P:367; P:368 | OK | D6 adds the two "at least 1 element" checks |
| aF.I4 | `freeze_activation_recorded` S:422 | P:376 | OK | lines moved |
| aF.I5 | none: only M2-owned tables | grants P:563-571 | TRADE-OFF NEEDED | text now written in `ARCHITECTURE.md` M2-AD-5 Trade-off (D14); the human still has to keep or replace it |
| AD1.a-c, AD2.b | — | — | OK | none |
| AD2.a | `trace_entry_precedence_range` S:260 | P:227 | OK | lines moved |
| AD3.a, AD3.c | — | — | OK | none |
| AD3.b | S:189, S:190 | P:166, P:167 | OK | lines moved |
| AD3.d | `decision_evaluated_at_matches_snapshot` S:531 | P:483 | OK (DB-PHYSICAL) | D13: was TRADE-OFF NEEDED, now a physical pointer; `contracts.md` §4 row AD-3 updated |
| AD4.a-c | — | — | OK | none |
| AD5.a | S:233, S:236 | P:203, P:206 | OK | lines moved |
| AD5.b, AD5.d | — | — | OK | none |
| AD5.c | none | GRANT P:563, P:567, P:569 | TRADE-OFF NEEDED | text now in `ARCHITECTURE.md` M2-AD-5 Trade-off (D14); stays a Trade-off |
| AD6.a, AD6.c | FK S:285 | P:249 | OK | lines moved |
| AD6.b | `decision_rationale_nonempty` (S:185) | (P:162) | OK | lines moved |
| AD6.d | — | — | OK | none |
| AD7.a | `policy_version_no_update` S:577, `policy_version_no_delete` S:578 | triggers P:537, P:539; REVOKE P:571 | OK | lines moved |
| AD7.b | `policy_version_hash_sha256` S:61; `policy_version_seq_next` S:562 | P:54; P:526 | OK | lines moved |
| AD7.c | FK S:170 | P:147 | OK | lines moved |
| AD8.a | triggers S:579-600 (22) + S:577-578 | `REVOKE UPDATE, DELETE` P:571 (11 tables) + P:537, P:539 | OK | lines moved; probe: `m2_app` UPDATE and DELETE on `decision_outbox` are refused in the embedded engine |
| AD8.b | S:354 | P:313 | OK | lines moved |
| AD8.c | `decision_outbox_exactly_one_id` S:315; `decision_outbox_type_matches_id` S:317; `decision_outbox_key_only_decision_events` S:319 | P:279; P:281; P:283 | OK | D3 widens the check to five key columns |
| AD8.d | `decision_depth_max_1` S:202; `decision_parent_depth_coherent` S:203; trigger `decision_parent_is_root` S:521 | P:179; P:180; P:470 | OK | lines moved |
| AD8.e | typed columns S:97-117 (D1: four nullable) | P:81-105 | OK | D1 |
| AD9.a | S:552; S:479; statement 1 S:644-654 | P:512; P:425; P:619-629 | OK | lines moved |
| AD9.b | S:515 | P:455 | OK | lines moved |
| AD9.c | S:406-422 | P:360-376 | OK | D5, D6 add `freeze_state_enum` S:416 / P:370, `freeze_expired_only_after_end` S:418 / P:372 |
| AD9.d, AD9.e | — | — | OK | none |

## A.8 Part A recount after P2-TRIAGE-FIX-1

- Lines: 52 (19 `I` clauses + 33 mechanisms), unchanged.
- **OK 50, DEFECT 0, TRADE-OFF NEEDED 2** (aF.I5 and AD5.c, which are one underlying item with its text now in `ARCHITECTURE.md` M2-AD-5, triage decision D14). Changes: pF.I1, pF.I2, pF.I4 DEFECT → OK (D15 names one RED test each); AD3.d TRADE-OFF NEEDED → OK (D13, physical pointer).
- `DOMAIN-GUARD` only (no database object): eR.I1, eR.I5, eR.I10, pF.I1, pF.I2, pF.I4, AD1.a, AD1.b, AD2.b, AD3.a, AD3.c, AD4.a, AD4.b, AD4.c, AD5.b, AD6.d, AD9.d, AD9.e (AD3.d left the list).

---

# Part B — Step 2.2 minimums and the Annex A edge case

`S:` = `001_m2_schema.sqlite.sql`, `P:` = `001_m2_schema.postgres.sql` (lines after Step 3).

| Requirement | Verdict | Evidence |
|---|---|---|
| Schema: every entity of `ARCHITECTURE.md` §4.1 (15) plus `audit_events` | MET | both files load in an engine: SQLite in memory 16 tables; embedded PostgreSQL 16 tables (after F3); column names and order identical in all 16 tables (0 differences) |
| Schema: PK, FK, NOT NULL, CHECK, UNIQUE present | MET | 152 named CHECKs in SQLite (S) and 97 in PostgreSQL (P); the 55 extra in S are ISO-text and `json_valid` checks that PostgreSQL covers with its column types (`timestamptz`, `jsonb`, `uuid`); FKs e.g. S:167, S:280; composite PKs S:248, S:283, S:347 |
| Schema: at least 2 constraints enforce an invariant physically (named) | MET | `freeze_one_active_per_scope` S:502 / P:436; `decision_single_deadline` S:189 / P:166; `decision_cause_iff_deny` S:177 / P:154; append-only triggers S:544-567 |
| `created_at` / `updated_at` where needed | MET | `updated_at` exists only on the 4 tables outside the no-UPDATE group: `policy_document` S:81, `freeze` S:393, `freeze_draft` S:428, `preview_run` S:455. The other 12 tables carry only `created_at`, because they accept no UPDATE (ruling S3, M1). 12 + 4 = 16 |
| `audit_events` exists | MET | S:478 / P:`CREATE TABLE audit_events` (action list of 4, ruling M2) |
| Atomicity: idempotency key per actor | MET | `PRIMARY KEY (actor_id, "key")` S:347 / P:304; statement 2 `INSERT ... ON CONFLICT (actor_id, "key") DO NOTHING RETURNING actor_id` S:623-629 / P:584-590 (comment-only reference statement; the repository code does not exist yet) |
| Atomicity: preview token consumption | MET after F1 | statement 1, one conditional `UPDATE ... WHERE consumed_at IS NULL AND actor_id = $caller AND content_hash = $draft_hash AND $now <= expires_at RETURNING` S:611-621 / P:572-582; trigger `preview_run_consumed_once` S:519 / P:465 (F1). Before F1 nothing refused a second write |
| Atomicity: freeze activation | MET | partial unique index S:502 / P:436; statement 3. `contracts.md` activateFreeze Concurrency also says "a compare-and-swap on the freeze store version", and `freeze` has no version column (S:376-418); the index alone decides the race |
| Atomicity: `published_seq` increment | PARTIAL | `PRIMARY KEY` S:51 / P:`published_seq` plus `policy_version_seq_next` S:529 / P:479 (F2) refuse a duplicate or a skipped number; `BEGIN IMMEDIATE` is declared for SQLite (section 6, S:608). No reference statement for the publish transaction exists (the repository has `publisher`, `ports-and-adapters.md` row 7, no route: ADV-19) |
| Atomicity: outbox claim | PARTIAL | `outbox_delivery` is keyed `(outbox_id, attempt_no)` S:327 / P:`PRIMARY KEY (outbox_id, attempt_no)`: two relays choosing the same attempt number collide on the key. No claim or lease statement and no row naming a claiming relay exists; `AR` states none |
| DTO: one request and one response DTO per operation (13) | PARTIAL | `dto.ts`: request DTOs `EvaluateRequestDto`, `PreviewFreezeRequestDto`, `ActivateFreezeRequestDto`, `CreateFreezeDraftRequestDto`, `LiftFreezeRequestDto`, plus query DTOs `PreviewDecisionQueryDto`, `FreezeListQueryDto`; response DTOs for all 13. Routes with a query parameter and no query DTO: `GET /policy/rules?version=`, `GET /policy/versions?since_seq=`; path-only routes (`/versions/{v}`, `/freezes/{id}`, `/health`, `/ready`) have none |
| DTO: `ErrorBodyDto` | MET | `dto.ts` exports `ErrorBodyDto` (code union of the 27 request-level codes plus the 10 causes) |
| DTO: `ExplanationDto` with rule ids, observed values, thresholds | MET | fields `rule_ids`, `observed_values`, `thresholds` (`dto.ts`, interface `ExplanationDto`) |
| Events: `eventId`, `occurredAt`, `schemaVersion` in each of the 8 schemas | MET | machine-checked in Step 7: all three names are in `required` of each of the 8 schemas |
| OpenAPI: paths for all 13 operations | MET | 12 path items, 13 operations (Step 7) |
| OpenAPI: all error responses of the Typed Error Catalog present | PARTIAL | 24 of the 37 catalog codes are attached to routes; 10 are `DECISION.cause` members inside the `Decision` schema (HTTP 200); 3 request-level codes are not attached: `UNAUTHENTICATED` (status not stated), `DERIVED_FROM_INVALID` (status not stated), `SNAPSHOT_EVICTED` (no route reads a snapshot) |

## Annex A row 2 mandatory edge case

Source of the row: the header comment of the SQL files (S:26-30) quotes the Policy Engine row of Annex A of the PDF ("Job approved at 21:58 under night policy running past 10:00 class"); the text was extracted from the PDF with some words lost, and was not re-read in this task: "not verified against the PDF". The task text states the expected result: re-evaluation yields DENY/terminate at the boundary.

| Cover | Verdict | Evidence |
|---|---|---|
| (a) a contract invariant | PARTIAL | `contracts.md` evaluateRequest I4 ("`valid_until` is non-null and later than `evaluated_at` for every `ALLOW` and `CONSTRAIN`; `must_checkpoint_by = valid_until` whenever non-null"), I6 (`HARD_DEADLINE` carries a non-null `deadline`), Time (`bound = MIN(campus_now + expected_duration_min, b* − PROTECTION_GRACE)`). The module resolves the case at admission (a `CONSTRAIN` with a `HARD_DEADLINE` before the 10:00 window), as the SQL header says (S:30). The operation `reevaluateRunningJob` was ruled out by the human in Phase 0, so no contract re-evaluates a running job at the boundary: the "DENY/terminate at the boundary" half belongs to the delegate (M9) through the obligation in Q3 |
| (b) a physical enforcement | PARTIAL | `decision_valid_until_required` S:186 / P:163, `decision_valid_until_after_evaluated` S:187 / P:164, `decision_single_deadline` S:189 / P:166 (after F4), `decision_constraint_deadline_by_kind` S:231 / P:201 (a `HARD_DEADLINE` needs a deadline), `obligation_observation` rows S:357. The equality "deadline = governing boundary − `PROTECTION_GRACE`" is computed in `policy/core`; no SQL object can state it (S:36-37) |
| (c) a P0 risk | not yet produced (Phase 3/4) | |
| (d) a red test | not yet produced (Phase 3/4) | `contracts.md` §4 names `ad3-deadline-attribution.test.ts` and `ad3-boundary.test.ts` as the tests that will carry it |
| (e) a dedicated story | not yet produced (Phase 3/4) | |

---

# Part C — adversarial lens (fresh context)

Run by a subagent that received the file list and the `also_consider` text and none of the Part A / Part B conclusions. The subagent read the files while Step 3 was being written (see the note under Step 3). The raw output is in Appendix 1, unedited. Dispositions are `PROPOSED`; the human decides. "Known?" compares with the 11 open points of `contracts.md` §6 and the "Mismatches found" table of `events.md`. "Accept" targets are fixes for a later task; none is applied here.

| id | finding | location | known? | disposition | reasoning | fix target | status |
|---|---|---|---|---|---|---|---|
| ADV-1 | the OpenAPI request schema refuses at the wire what `R-VALID-01` must journal as `DENY(INVALID_REQUEST)`; the `decision` table refuses an empty `subject_id` | `openapi.yaml` 785-793; `contracts.md` P7 line 33; S:192-194 | no | Accept | verified: `openapi.yaml` has `requested_gpu_count: { type: integer, minimum: 1, maximum: 2 }` and `requested_vram_gb_per_gpu: { enum: [24, 48] }`, while P1 limits the wire check to types and P7 says range violations are a journalled 200 `DENY`. `decision_subject_nonempty` and `decision_model_ref_nonempty` (added by ruling N2) would then refuse to store an empty-string id that P7/P8 must journal | `openapi.yaml` EvaluateRequestDto; decide whether the N2 non-empty CHECKs stay (needs a human decision) | Accepted (human, D9: types only on the wire, the N2 non-empty CHECKs stay) - fixed in `schemas/openapi.yaml` `components.schemas.EvaluateRequestDto` (`requested_gpu_count`, `requested_vram_gb_per_gpu`, `expected_duration_min` are `type: integer` only); SQL unchanged (S:195-197 / P:172-174 stay) |
| ADV-2 | `fact_snapshot` columns are `NOT NULL` but `ACTOR_UNKNOWN`, `MODEL_NOT_FOUND`, `DEPENDENCY_UNAVAILABLE` decisions are journalled with no such facts | S:96-107 / P:`fact_snapshot`; `contracts.md` P8, P9 | no | Accept | S:96-107 declares `actor_kind`, `role_tier`, `model_facts`, `quota_facts` `NOT NULL`; no clause says what is stored when the fact does not exist. Needs a human decision (nullable columns or a stated sentinel) | `ARCHITECTURE.md` §4.1/§4.2 `FACT_SNAPSHOT`; both SQL files | Accepted (human, D1: the four columns are nullable, NULL only when the fact does not exist, no sentinel) - fixed in `ARCHITECTURE.md` §4.1 `FACT_SNAPSHOT`; S:100-109 / P:87-96 (nullable columns); triggers `decision_null_facts_by_cause` S:540 / P:498 |
| ADV-3 | when the Clock port fails there is no instant for `evaluated_at`, `campus_now`, `created_at` | `contracts.md` P9 line 35, Time line 54; `ports-and-adapters.md` L7; S:108, S:152 | no | Accept | P9 makes a failed clock a journalled `DENY(DEPENDENCY_UNAVAILABLE)`, and `evaluated_at` is `NOT NULL`; nothing names the value. Needs a human decision | `contracts.md` P9 / Time | Accepted (human, D2: a Clock read with no instant writes no Decision, event or outbox row; 503 and an alarm; P9 narrowed) - fixed in `contracts.md` §2 evaluateRequest P9 and Q-fail, §3.1 `DECISION_NOT_PRODUCED` (carve-out PROPOSED, human to confirm); `ARCHITECTURE.md` §5.1 decisions row; `openapi.yaml` `/policy/decisions` 503 |
| ADV-4 | freeze and version events have no transactional outbox (dual write) | S:304; `events.md` table rows 3-6 ("not stated"); `contracts.md` activateFreeze Q3, Q-fail | partly (the `events.md` table says "not stated") | Accept | `decision_outbox_event_type_enum` admits only the two decision events, while Q3 promises at-least-once publication and Q-fail "0 events are published" on rollback. Needs a human decision (extend the outbox enum or accept the loss) | `ARCHITECTURE.md` §5.2/§4.1; SQL `decision_outbox` | Accepted (human, D3: the outbox covers the four freeze and version events, same transaction, key columns with FKs, idempotency key `eventId`) - fixed in S:301-321 / P:265-285 (`decision_outbox`, constraints S:313-319 / P:277-283); `ARCHITECTURE.md` §4.1 `DECISION_OUTBOX`, §5.2 rows; `events.md` §2 and §4; `contracts.md` activateFreeze Q2 and the notes after §2 |
| ADV-5 | `decision_outbox.first_attempt_at` and `journal_lag` are updated after insert in a table that accepts no UPDATE | S:300-301, S:554-555; `ARCHITECTURE.md` §4.1 lines 378-379 | no | Accept | AR line 379 reads `journal_lag` "0 after delivery", which implies an UPDATE; the table is in the no-UPDATE group (M2-AD-8). Either the columns move to `outbox_delivery` or the group changes | `ARCHITECTURE.md` §4.1 `DECISION_OUTBOX`; both SQL files | Accepted (human, D4: both columns leave `decision_outbox`; first attempt read from `outbox_delivery`; lag is a computed query) - fixed in S:301 / P:265 (columns and their checks removed); `ARCHITECTURE.md` §4.1 `DECISION_OUTBOX`, `OUTBOX_DELIVERY`, §5.3 Lag metric |
| ADV-6 | a freeze past `ends_at` keeps `state = 'ACTIVE'` and still occupies the scope key | S:502-504; `contracts.md` P11 line 104, Time line 118 | no | Accept | `EXPIRED` is computed and never swept (`ARCHITECTURE.md` line 454), and the partial index tests only the stored `state`; P11 therefore returns `DUPLICATE_ACTIVE_FREEZE` for an expired freeze until it is lifted. A clock condition cannot go into an index. Needs a human decision | `contracts.md` P11; `ARCHITECTURE.md` §5.1 | Accepted (human, D5: `activateFreeze` closes the expired ACTIVE freezes of the same scope in its transaction; a stored `EXPIRED` value) - fixed in S:416, S:418 / P:370, P:372 (`freeze_state_enum`, `freeze_expired_only_after_end`); statement 3a S:664 / P:639; `contracts.md` activateFreeze P11, Q2, Time; `ARCHITECTURE.md` §4.1 `FREEZE.state`, §4.2 liveness sentence, §5.1 activate row; `dto.ts` `FreezeStoredState`; `openapi.yaml` `FreezeStoredState` |
| ADV-7 | the uniqueness key is the whole serialized array: overlapping scopes and different element order are different keys | S:500-504 / P:436 | partly (aF.I1 note in Part A) | Accept | machine-confirmed in Step 7: two ACTIVE `SUBJECT` freezes with `["b","a"]` and `["a","b"]` were both accepted in SQLite. Sorting is a writer duty (`ARCHITECTURE.md` line 407 "lexically ordered"); the index does not check it | `contracts.md` activateFreeze P11 (add a normalisation clause); optional SQL | Accepted (human, D6: arrays written sorted, no duplicates, the writer's duty; the unique index is unchanged) - fixed in `contracts.md` §2 activateFreeze Q2; `ARCHITECTURE.md` §4.1 `FREEZE` attribute comments |
| ADV-8 | the token string is never verified; the lookup is by `(draft_id, actor_id)` and hash, and the consume statement needs `$preview_run_id` | `contracts.md` P8 line 101, previewFreeze Concurrency line 82; S:611-621 | no | Accept | P8 says "a `PREVIEW_RUN` exists for `(draft_id, actor_id = caller)` whose `content_hash` equals the draft hash"; no step recomputes the HMAC or maps the token to a row; two live previews of one draft make the row ambiguous (line 82: "both stay valid") | `contracts.md` activateFreeze P8 | Accepted (human, D7: the token carries `preview_run_id`; P8 recomputes the HMAC and locates the row by it) - fixed in `contracts.md` §2 activateFreeze P8; §3.1 `TOKEN_ABSENT`; `ARCHITECTURE.md` §5.1 activate row and token paragraph, M2-AD-9 rule |
| ADV-9 | `TOKEN_ACTOR_MISMATCH` cannot be reached as specified | `contracts.md` P8 line 101 | no | Accept | with the lookup restricted to `actor_id = caller`, another actor's row yields `TOKEN_ABSENT`, never the actor code | `contracts.md` activateFreeze P8 (same change as ADV-8) | Accepted (human, D7: check order signature, actor, expiry, consumption, stale hash) - fixed in `contracts.md` §2 activateFreeze P8 (order stated; `TOKEN_ACTOR_MISMATCH` is step 2) |
| ADV-10 | `TOKEN_STALE` cannot happen because nothing edits a draft; `freeze_draft.updated_at` has no writer | `contracts.md` line 152; S:428, S:437; `openapi.yaml` paths | no | Defer | no route edits a draft today, but `AR` §5.1 does not say drafts are immutable; the check is harmless and the answer is a statement in the contract | `contracts.md` P8 note | Deferred (human, confirmed) |
| ADV-11 | Q4 says the response cites `reason`, `activated_by_role_tier`, `preview_run_id`; the response DTO has `freeze_id` and `policy_version` only | `contracts.md` Q4 line 109; `dto.ts` `ActivateFreezeResponseDto` | no | Accept | verified: Q4 reads "the response and the event cite `activated_by` ..., `activated_by_role_tier`, `reason`, and `preview_run_id`"; Q1 gives the response as `{freeze_id, policy_version}`; after ruling N1 the event has no `reason` either | `contracts.md` activateFreeze Q4 | Accepted (human, D16: Q4 cites only fields the response has) - fixed in `contracts.md` §2 activateFreeze Q4 |
| ADV-12 | Q3 still lists `reason` in the `policy.freeze.activated.v1` payload | `contracts.md` line 108; `events.md` §3.4 | no | Accept | verified: Q3 text "`allowance_ids[], reason, activated_by, policy_version, preview_run_id`"; ruling N1 removed `reason` from `ARCHITECTURE.md` §5.2 and `events.md`; `contracts.md` was left unedited by that ruling's Step 2 text | `contracts.md` activateFreeze Q3 | Accepted (human, D16: Q3 drops `reason`) - fixed in `contracts.md` §2 activateFreeze Q3 |
| ADV-13 | the contracts never write `audit_events`; the schema defines four actions | `contracts.md` previewFreeze I4 line 81, activateFreeze Q2 line 107; S:489 | no | Accept | Q2 of `activateFreeze` lists the `FREEZE` insert and the `consumed_at` write, not the `FREEZE_ACTIVATED` audit row; I4 of `previewFreeze` says "not journalled". Whether the audit row is part of the transaction is not stated | `contracts.md` Q2 of the four freeze operations | Accepted (human, D16: Q2 of the freeze operations names the `audit_events` row written in the same transaction) - fixed in `contracts.md` §2 previewFreeze Q2 (`FREEZE_PREVIEW_COMPUTED`), activateFreeze Q2 (`FREEZE_ACTIVATED`), and the notes after §2 for create (`FREEZE_DRAFT_CREATED`) and lift (`FREEZE_LIFTED`) |
| ADV-14 | `FREEZE_STATE_UNREADABLE` must append a failure row to the same database whose read failed; no `stage` fits | `contracts.md` P6 line 32, Q-fail line 41; `events.md` §3.2 | no | Defer | plausible; `PORT_FETCH` is the nearest stage in `events.md`; needs a statement from `AR` §2.1.1 on which store failures reach the outbox | `contracts.md` P6 | Deferred (human, confirmed) |
| ADV-15 | `SNAPSHOT_EVICTED` cannot happen: no delete path, `snapshot_retained` cannot flip | `contracts.md` catalog line 141; S:141-142, S:542-543 | yes (open point 7 and the `snapshot_retained` comment in S:141-142) | Defer | already recorded; no new fact | — | Deferred (human, confirmed) |
| ADV-16 | the SQL files are not parallel (gapless trigger in one; GLOB UUID checks accept non-hex) | P:479; S:170 | no | Defer | first half refuted: the SQLite file now has `policy_version_seq_next` S:529 (F2), the reviewer read the files before F2 was complete. Second half holds: S:170 `GLOB '????????-????-7???-????-????????????'` accepts any character; PostgreSQL's `uuid` type does not. Low impact: ids come from the `IdGenerator` | S:170 and the other uuid GLOB checks | Deferred (human, confirmed) |
| ADV-17 | `policy.decision.v1` requires `node_class` as a non-empty string but `decision.node_class_id` is nullable | `events.md` lines 46, 64; S:159 | partly (mismatch 5 and 9) | Accept | verified: `required` of the schema includes `"node_class"`, the column is nullable (ruling N2) | `events.md` §3.1 (allow `null` or drop it from `required`) | Accepted (human, D10: `node_class` accepts `null`) - fixed in `events.md` §3.1 (schema `"type": ["string", "null"]`, second example with `node_class: null`, mapping row 5); `ARCHITECTURE.md` §5.2 `policy.decision.v1` row (`node_class?`) |
| ADV-18 | the layer map gives the Freeze Aggregate and the boot validator roles that conflict with where they work | `ports-and-adapters.md` rows 4, 8, 10 | no | Defer | rows not re-read for this triage: "not verified" | `ports-and-adapters.md` §2 | Deferred (human, confirmed); re-read in P2-TRIAGE-FIX-1: see the Triage record |
| ADV-19 | UX-2/UX-3 call `GET /policy/journal` and `POST /policy/versions/publish`, which have no route | `ux/EXPERIENCE.md` line 37; `openapi.yaml` | yes for the journal (`review-arch-implementability.md` G-20); the publish route: not verified | Defer | a UX/PRD change (Part E); the 13 routes are a human decision | `ux/EXPERIENCE.md` | Deferred (human, confirmed) |
| ADV-20 | `liftFreeze` has no contract and no outcome for a freeze that is not ACTIVE | `openapi.yaml` lift responses; `contracts.md` §2 (3 operations) | no | Accept | `contracts.md` §2 has three operations; `AR` §5.1 lists `400/403/404` for lift. A lift of a `LIFTED` freeze, or a draft id, has no code (proposed code name `FREEZE_NOT_LIFTABLE`, status 409: PROPOSED) | `contracts.md` §2 and §3; `openapi.yaml` lift | Accepted (human, D8: new code `FREEZE_NOT_LIFTABLE`, 409; a short note, not a fourth full contract; the catalog goes to 38) - fixed in `contracts.md` §2 (notes after activateFreeze) and §3.1; `dto.ts` `ErrorCodeDto`; `openapi.yaml` lift `409` and `ErrorCodeDto`; `ARCHITECTURE.md` §5.1 lift row |
| ADV-21 | `DENY(FREEZE_ACTIVE)` carries a `freeze_id` that a student cannot resolve (`403`); no successor reference exists | `openapi.yaml` 499-508; `dto.ts` `FreezeDto`; `ux/EXPERIENCE.md` | no | Defer | UX decision on who may read a freeze; `supersedes` is stored (S:390) but no clause sets it | `ux/EXPERIENCE.md`, `ARCHITECTURE.md` §5.1 | Deferred (human, confirmed) |
| ADV-22 | `job.lifecycle.v1` has an optional `decision_id` but `obligation_observation.decision_id` is `NOT NULL`; no clause writes the first `UNCONFIRMED` row or owns the `timeout` source | `events.md` §3.7; S:357-372 | no | Defer | design gap in the observation path (Phase 2 follow-up, G-03 area) | `contracts.md`, `events.md` | Deferred (human, confirmed) |
| ADV-23 | `POST /policy/decisions/preview` returns a `DecisionDto` with a `decision_id` and `evidence_snapshot_ref` of a row that is never stored; UX says the preview "returns a token" | `openapi.yaml` 74-96; `ux/EXPERIENCE.md` | no | Defer | needs a human decision on the preview body | `openapi.yaml`, `ux/EXPERIENCE.md` | Deferred (human, confirmed) |
| ADV-24 | `request_id` is a required request field and is stored nowhere | `dto.ts` `EvaluateRequestDto`; S:143-168 | no | Defer | `PRD` §5 lists it; `DECISION` stores `request_chain_id` only | `ARCHITECTURE.md` §4.1 | Deferred (human, confirmed) |
| ADV-25 | uuid7 ids embed a time that need not equal `evaluated_at` | `ports-and-adapters.md` §5 rule 2 | no | Defer | two ports (Clock and IdGenerator); the ids only order records | `ports-and-adapters.md` §5 | Deferred (human, confirmed) |
| ADV-26 | `ConstraintDto.kind`, `value.kind` and `must_checkpoint_by` / `deadline` can disagree | `dto.ts` lines 139-156; S:226 | no | Accept | S:226 `decision_constraint_value_json` checks `json_valid(value)` only (verified); the union carries its own `kind` (`dto.ts` `ConstraintValueDto`). Candidate check `json_extract(value, '$.kind') = kind` (PROPOSED) | SQL `decision_constraint`; `contracts.md` | Accepted (human, D11: CHECK that the `kind` inside `value` equals the column `kind`) - fixed in `decision_constraint_value_kind_matches` S:231 / P:201 |
| ADV-27 | `bound_role` is stored per trace row; a boundary with no rule row cannot be represented | S:239-258; `prd.md` line 216 | no | Defer | whether the boundary id lives in `evidence` JSON: not verified | `ARCHITECTURE.md` §4.1 `TRACE_ENTRY` | Deferred (human, confirmed); re-read in P2-TRIAGE-FIX-1: see the Triage record |
| ADV-28 | the HMAC covers `draft_id ‖ content_hash ‖ computed_at`, not `actor_id`; `computed_at` is not a `PREVIEW_RUN` column | `contracts.md` previewFreeze Q1 line 72, I2 line 79 | no | Accept | `PREVIEW_RUN` has `issued_at` (S:447), not `computed_at`; the actor binding is in the row, not the signature | `contracts.md` previewFreeze Q1 | Accepted (human, D7: the HMAC covers `draft_id ‖ content_hash ‖ actor_id ‖ issued_at`; `computed_at` does not exist) - fixed in `contracts.md` §2 previewFreeze Q1 and I2; `ARCHITECTURE.md` §5.1 preview row, token paragraph, M2-AD-9 rule, §8.6 option A; `dto.ts` `PreviewFreezeResponseDto.preview_token` comment |

Count: 28 findings; proposed Accept 16, Defer 12, Reject 0.

---

# Part D — edge-case-hunter lens (fresh context)

Same input, same subagent rule. Raw JSON in Appendix 2, unedited. Duplicates of Part C are marked; their disposition is the one of the `ADV-n` they duplicate.

| id | finding | location | known? | disposition | reasoning | fix target | status |
|---|---|---|---|---|---|---|---|
| EDG-1 | `node_class` required in the event while `node_class_id` is nullable | `events.md` 46, 64; S:159 | — | duplicate of ADV-17 | | | Accepted (human, as ADV-17) - fixed in `events.md` §3.1 |
| EDG-2 | a `DENY` row with a non-null `must_checkpoint_by` and null `valid_until` passed `decision_single_deadline` | S:189 / P:166 | no | Accept | machine-confirmed before F4 (SQLite: ACCEPTED); `contracts.md` Q1 states the guard. **Already applied as F4**; after F4 REJECTED in SQLite and in embedded PostgreSQL | done: both SQL files | Accepted (human) - fixed in `decision_single_deadline` S:192 / P:169 (F4, applied before P2-TRIAGE-FIX-1) |
| EDG-3 | an expired freeze keeps the ACTIVE scope key | S:502-504 | — | duplicate of ADV-6 | | | Accepted (human, as ADV-6) - fixed in S:416, S:418 / P:370, P:372 and `contracts.md` activateFreeze Q2 |
| EDG-4 | unsorted or duplicate array elements bypass the unique index | S:500-504 | — | duplicate of ADV-7 | | | Accepted (human, as ADV-7) - fixed in `contracts.md` activateFreeze Q2 (sorted, no duplicates) |
| EDG-5 | a `SUBJECT` or `NODE_CLASS` freeze with an empty array is allowed | S:401-402 / P:353-354 | no | Accept | machine-confirmed in Step 7: a `SUBJECT` freeze with `subject_ids = []` was ACCEPTED. `ARCHITECTURE.md` line 407 states only "CHECK empty unless scope=SUBJECT", so the stricter guard is a new decision; candidate `scope <> 'SUBJECT' OR json_array_length(subject_ids) >= 1` (PROPOSED) | SQL `freeze`; `contracts.md` aF.I3 | Accepted (human, D6: SUBJECT needs at least 1 subject, NODE_CLASS at least 1 node class) - fixed in `freeze_subject_ids_required` S:413 / P:367 and `freeze_node_class_ids_required` S:414 / P:368; `ARCHITECTURE.md` §4.1 `FREEZE` comments |
| EDG-6 | wire range check versus journalled `DENY` | `openapi.yaml` 791-793 | — | duplicate of ADV-1 | | | Accepted (human, as ADV-1) - fixed in `openapi.yaml` `EvaluateRequestDto` |
| EDG-7 | the token value is ignored in the lookup | `contracts.md` P8 | — | duplicate of ADV-8 | | | Accepted (human, as ADV-8) - fixed in `contracts.md` activateFreeze P8 |
| EDG-8 | one draft can yield several freezes over time (no draft-to-freeze link) | S:420; `contracts.md` line 117 | no | Defer | the ER draws `FREEZE ||--o| FREEZE_DRAFT` without a column (S:420 comment); the guarantee "3 activations of one draft yield 1 freeze" is for concurrent calls | `ARCHITECTURE.md` §4.1 `FREEZE_DRAFT` | Deferred (human, confirmed) |
| EDG-9 | freeze and version events lost on a crash after commit | S:304 | — | duplicate of ADV-4 | | | Accepted (human, as ADV-4) - fixed in S:301 / P:265 (`decision_outbox`) and `ARCHITECTURE.md` §5.2 |
| EDG-10 | inbound event without or with an unknown `decision_id`, or redelivered | `events.md` §3.7 | — | duplicate of ADV-22 | | | Deferred (human, as ADV-22) |
| EDG-11 | a failure at stage `RENDER` has no response or event code | `events.md` 129, 139; `contracts.md` line 140 | partly (`events.md` §3.2 note: stage RENDER "does not produce a 5xx") | Defer | the note is in the text, not in the mismatch table | `events.md` §3.2 | Deferred (human, confirmed) |
| EDG-12 | `payload_ref` cannot rebuild the failed event (stage, port, code stored nowhere) | S:299; `events.md` §3.2 | no | Defer | content of `payload_ref`: not verified | SQL `decision_outbox` | Deferred (human, confirmed) |
| EDG-13 | content-addressed `fact_snapshot.ref` collides on equal facts | S:94-95; `contracts.md` Q2 | yes (S:91-93 comment: hash function and length "not stated"; recorded in P2-SCHEMA-1) | Defer | whether `ref` includes `campus_now`: not verified | `ARCHITECTURE.md` §4.2 | Deferred (human, confirmed) |
| EDG-14 | `request_hash` input is undefined | `contracts.md` P4 line 30; S:342 | no | Accept | no clause defines the hash input (canonical form, which fields, `derived_from`); needs a human decision | `contracts.md` P4 | Accepted (human, D12: `request_hash` = SHA-256 of the canonical JSON of nine named fields; `request_id` and `request_chain_id` excluded) - fixed in `contracts.md` §2 evaluateRequest P4 |
| EDG-15 | `FREEZE_ACTIVATED` audit row not in Q2 | `contracts.md` line 107; S:489 | — | duplicate of ADV-13 | | | Accepted (human, as ADV-13) - fixed in `contracts.md` activateFreeze Q2 |
| EDG-16 | lift of a non-ACTIVE freeze | `openapi.yaml` lift | — | duplicate of ADV-20 | | | Accepted (human, as ADV-20) - fixed in `contracts.md` notes after §2 and §3.1 `FREEZE_NOT_LIFTABLE` |
| EDG-17 | the wire pattern accepts impossible dates (`2026-13-45T99:99:99.000Z`); the SQL `strftime` check would then fail at insert | `openapi.yaml` 575; `dto.ts` 25; S:410 | no | Accept | the instant pattern in the OpenAPI schema is a regular expression only (`^[0-9]{4}-...Z$`); `freeze_starts_at_iso` S:410 rejects at write time with a database error; no clause maps this to `WIRE_SHAPE_INVALID` | `contracts.md` P1 of the freeze operations | Accepted (human, D16: an instant that is not a valid calendar instant answers 400 `WIRE_SHAPE_INVALID`) - fixed in `contracts.md` §2 previewFreeze P1 and activateFreeze P1, and the create-draft note after §2 |
| EDG-18 | the repository port names no transaction or unit-of-work boundary | `ports-and-adapters.md` row 27 | no | Defer | search of the file for "transaction" in row 27: no hit; the contracts require one transaction (Q2); not verified beyond that search | `ports-and-adapters.md` §2 | Deferred (human, confirmed) |
| EDG-19 | `dto.ts` has no DTO for the 8 event payloads | `dto.ts`; `ports-and-adapters.md` §5 rule 4 | no | Defer | decision A2 limited `dto.ts` to operation DTOs; `events.md` carries the JSON Schemas | `dto.ts` | Deferred (human, confirmed) |
| EDG-20 | `value.kind` can disagree with `kind` | S:225-231 | — | duplicate of ADV-26 | | | Accepted (human, as ADV-26) - fixed in `decision_constraint_value_kind_matches` S:231 / P:201 |

Count: 20 findings; 10 duplicates of Part C; of the other 10, proposed Accept 4 (EDG-2, EDG-5, EDG-14, EDG-17), Defer 6, Reject 0. Combined with Part C, the distinct proposed counts are Accept 20, Defer 18, Reject 0.

---

# Part E — inventories and decision-log candidates

## E.1 Every `PROPOSED` marker in the two SQL files (none removed or resolved)

Text taken from `grep -n PROPOSED` at the end of Step 3. S = SQLite, P = PostgreSQL. The header lines S:18 and P:19 only explain the marker and are not counted.

| S line | P line | what is proposed | depends on | smallest option | who decides | both files / agree |
|---|---|---|---|---|---|---|
| 120 | 106 | `max_gpu_count`, `max_vram_gb` nullable (no "unrestricted" column) | `ARCHITECTURE.md` §4.1 `FACT_SNAPSHOT` lists no such column | keep nullable | human (Architect-lead) | both, same text |
| 123 | 109 | `subject_ids` is a JSON array of ids | the ER types it "string" | keep a JSON array | human | both, same text |
| 214 | 186 | table name `decision_constraint` (`constraint` is reserved) | none | keep | human | both, same text |
| 230 | 200 | `deadline` required for `QUEUE_ONLY`, `QUOTA_CAP`, `HARD_DEADLINE`; none for `MODEL_VARIANT`, `RESOURCE_SUBSTITUTION` | `AR` M2-AD-5 rule; the ER comment names `HARD_DEADLINE` only | keep | human | both, same text |
| 338 | 295 | `idempotency_key.decision_id` foreign key `DEFERRABLE INITIALLY DEFERRED` | `ARCHITECTURE.md` §5.1 (key inserted first) | keep | human | both, same text |
| 441 | 384 | `runtime_snapshot` boolean, 1/true = `AVAILABLE` | ruling N3 settled the mapping; the comment still cites "contracts.md open point 5", which N3 removed | none: the marker and its reference are stale after N3 | human (remove the marker in a later edit) | both, same text |
| 507 | 441 | the `decision_parent_is_root` trigger | `AR` M2-AD-8 `CHECK (depth <= 1)` | keep | human | both, same text |
| — | 484 | trigger mechanism for the immutability of `policy_version` | `AR` M2-AD-7 "referential check" has no stated mechanism | keep the trigger | human | PostgreSQL only; SQLite has the same triggers (S:544-545) without a marker: the files disagree on the marker, not on the object |
| — | 511 | role `m2_version_admin` holding `UPDATE` on `policy_version` for test `ad7-immutable` | `AR` §11 test `ad7-immutable.test.ts` | keep | human | PostgreSQL only (SQLite has no roles) |

Summary: 9 markers; 7 appear in both files with the same text; 2 appear in the PostgreSQL file only; no marker appears in the SQLite file only; the two files agree on every shared marker.

## E.2 Cross-check findings that need a UX or PRD change (no edit made to `ux/*` or `prd.md`)

Each row was re-verified against the files as they are now.

| # | Finding | Where (verified) | Change needed |
|---|---|---|---|
| 1 | the `WINDOW_STARTED` validation path is still defined in the freeze console | `ux/EXPERIENCE.md` line 194 (`E-VALIDATION`, four cases; the line contains `WINDOW_STARTED`); `contracts.md` open point of K2 (a freeze with `starts_at` before `campus_now` is accepted) | UX-4 `E-VALIDATION` case list |
| 2 | no degraded activation path exists in the module (D1) | `ux/EXPERIENCE.md` line 196 ("Error (degraded)" and "the only one in this module where the console offers the unsafe action"); `ARCHITECTURE.md` §14 D1 | UX-4 degraded state and its action |
| 3 | `node_class_id` is absent from the `Request` of the PRD, while `AR` §4.2 and the freeze scope use it | `prd.md` §5 Request (lists `requested_gpu_count, requested_vram_gb_per_gpu, expected_duration_min`, no `node_class_id`); `events.md` mismatch 9 | `prd.md` §5 Request, or a statement of where the value comes from |
| 4 | UX-3 and UX-2 depend on `GET /policy/journal` and `POST /policy/versions/publish`, which are not among the 13 routes | `ux/EXPERIENCE.md` line 37 ("a surface with no route is a design fiction") | UX-2/UX-3 or `AR` §5.1 (ADV-19) |
| 5 | the freeze view shows `superseded by FRZ-…` with a link to the successor; `FreezeDto` holds only `supersedes` | `ux/EXPERIENCE.md` line 200; `dto.ts` `FreezeDto.supersedes` | UX-4 or `AR` §5.1 (ADV-21) |
| 6 | `ux/EXPERIENCE.md` UX-1 says the override preview returns a token; `POST /policy/decisions/preview` returns a `Decision` | `ux/EXPERIENCE.md` (phrase "returns a token", matched by grep in the file); `openapi.yaml` 74-96 | UX-1 or `AR` §5.1 (ADV-23) |
| dropped | "3 versus 5 stat cards" | a search for "stat card" in `ux/EXPERIENCE.md` and `ux/DESIGN.md` found no match | dropped: could not be re-verified |

## E.3 Candidate decision-log entries

Written to `reviews/review-arch-implementability.md` (C-56 onward), each "Reasoning: (left empty for the human)": one per Step 3 fix (C-56 F1, C-57 F2, C-58 F3, C-59 F4) and one per Accept-proposed row that records a decision (C-60 onward). The gap rows G-xx were not touched.

---

## E.1b `PROPOSED` markers in the SQL files after P2-TRIAGE-FIX-1 (replaces the line numbers of E.1)

| S line | P line | what is proposed | note |
|---|---|---|---|
| 123 | 109 | `max_gpu_count`, `max_vram_gb` nullable | unchanged |
| 126 | 112 | `subject_ids` is a JSON array of ids | unchanged |
| 217 | 189 | table name `decision_constraint` | unchanged |
| 235 | 205 | `deadline` required per constraint kind | unchanged |
| 345 | 304 | `idempotency_key.decision_id` foreign key `DEFERRABLE INITIALLY DEFERRED` | unchanged |
| 417 | 371 | `freeze_expired_only_after_end`: an `EXPIRED` row has `ends_at <= updated_at` | new, from D5 (the human decided the stored value, not this check) |
| 520 | 460 | the `decision_parent_is_root` trigger | unchanged |
| — | 531 | trigger mechanism for the immutability of `policy_version` | PostgreSQL only, as in E.1 |
| — | 558 | role `m2_version_admin` | PostgreSQL only, as in E.1 |

The stale marker on `runtime_snapshot` (S:441 / P:384 in E.1) is gone (D16). Summary: SQLite 7 markers, PostgreSQL 9; 7 appear in both files with the same text, 2 in the PostgreSQL file only; the files agree on every shared marker. No marker was removed or resolved other than the stale one.

# Triage record

- Date: 2026-10-19. Decided by: the human, through the orchestrator task `prompts/NEXT.md` P2-TRIAGE-FIX-1 (decisions D1–D17). Counts: **Accept 20, Defer 18, Reject 0** (38 distinct findings; 29 Accepted rows and 19 Deferred rows in Parts C and D because 10 EDG rows duplicate ADV rows). Every Accepted row now carries "Accepted (human, …) - fixed in …" with the artifact and line or section; every Deferred row reads "Deferred (human, confirmed)". The human decision is written in the status cell, in one line.
- Re-read of the two items the triage marked "not verified" (D17):
  - **ADV-18** (`ports-and-adapters.md` rows 4, 8, 10): confirmed as a gap. Row 10 reads "Freeze Aggregate, `policy/freeze/`: state machine `DRAFT → ACTIVE → LIFTED`, scope predicate; owns `FreezeState`, `FreezeDraft`, `PreviewRun`" with layer "Core Domain & Invariants (pure)", while a pure layer cannot own stores or write outbox rows (D3 makes the Freeze Aggregate the producer of three outbox rows). Row 8 reads "Boot validator ... duplicate precedence, range `[−1, 1000]`, citations, strict-subset predicates, unread fact fields" with "nothing outside Core Domain", while the check of an unresolved `doc_id` needs `POLICY_DOCUMENT`. Not cheap (it moves components between layers), so not applied. Smallest option: rewrite row 10 as a pure state machine plus a use-case implementation in an Inbound Port row (like rows 4, 7, 11) that owns the stores and the outbox writes; give the registry check of row 8 the loaded `POLICY_DOCUMENT` ids as an argument. PROPOSED, human to confirm.
  - **ADV-27** (`prd.md` line 216, `TRACE_ENTRY`): confirmed as a gap. `prd.md` §5.1 "Bound-role invariant": "Every element of `B` (§6.3) appears in the trace exactly once, carrying `bound_role`"; `ARCHITECTURE.md` §4.1 `TRACE_ENTRY` has `bound_role` on a per-rule row and no boundary identifier, and `evidence` is "dotted fact paths + values". Not cheap (a schema column plus a check), so not applied. Smallest option: a nullable `boundary_id` column on `trace_entry` and a rule that every element of `B` appears once. PROPOSED, human to confirm.
- Needs human decision (details in the P2-TRIAGE-FIX-1 report): the carve-out of `DECISION_NOT_PRODUCED` for a Clock read with no instant (D2); the numbering collision between the triage ids D1–D16 and the D1–D8 of P1-ARCH-AMEND in `ARCHITECTURE.md`; the fallback of the lag metric to `created_at` while no attempt exists (D4); `eventId` taken from `outbox_id` (D3); the check `freeze_expired_only_after_end` (D5); the second trigger `decision_null_facts_by_cause`, which turns "allowed only when the fact does not exist" (D1) into a database rule; the wire enum of `workload_kind` in `EvaluateRequestDto`, left in place because D9 names only the numeric fields; ADV-18 and ADV-27 above.

# Step 7 — self-check results

- SQLite in memory (`node:sqlite`): loads; 16 tables; `PRAGMA foreign_key_check` returns no row; triggers 25 before Step 3, 27 after. Probes (minimum parent rows built by the probe): F1 first consumption ACCEPTED, second consumption REJECTED (`TOKEN_CONSUMED`), reset to NULL REJECTED; F2 seq 1 ACCEPTED, seq 3 REJECTED (`PUBLISHED_SEQ_NOT_NEXT`), seq 1 again REJECTED, seq 2 ACCEPTED; F4 a `DENY` with a checkpoint and no deadline REJECTED by `decision_single_deadline` (ACCEPTED before F4), an `ALLOW` with `valid_until = must_checkpoint_by` ACCEPTED. EDG-5 and ADV-7 probes (not fixed): a `SUBJECT` freeze with `subject_ids = []` ACCEPTED; two ACTIVE `SUBJECT` freezes `["b","a"]` and `["a","b"]` both ACCEPTED.
- PostgreSQL: machine-validated with the embedded engine `@electric-sql/pglite` 0.2 (fetched into a temporary folder outside the module root, removed afterwards). Before F3 the file failed at the first use of `freeze` (`syntax error at or near "freeze"`); after F3 it loads: 16 tables, 5 user triggers (3 before Step 3). Same probes F1 and F2 give the same results as in SQLite; F4 `DENY` row REJECTED (`violates check constraint "decision_single_deadline"`), `ALLOW` row ACCEPTED (foreign-key triggers disabled with `session_replication_role = replica` for that probe). Column names and order of the 16 tables match the SQLite file (0 differences). Constructs not exercised: the roles and `GRANT`/`REVOKE` effects (the grants ran without error; their enforcement against a login role was not tested), and concurrency (single connection).
- Mermaid in `ports-and-adapters.md`: 1 block, `mermaid` 10.9.1 `parse` with `jsdom` returns OK (syntax only; it was not rendered).
- Counts: 19 `I` clauses in `contracts.md` §2 and 19 rows `eR/pF/aF` in Part A; 9 binding rows and 33 split-mechanism rows (all 9 AD-n represented). 24 pointer lines spot-checked by reading the line in the file (SQLite and PostgreSQL): 24 OK, 0 fail. 0 hits for the wall-clock defaults (`DEFAULT now`, `CURRENT_TIMESTAMP`) and for the two floating-point type names in code positions of the SQL files; 0 hits for the banned words in the SQL files and in this review file outside the unedited appendices (the appendices were also checked: 0 hits).
- Events: 8 schemas, `eventId`, `occurredAt`, `schemaVersion` required in 8; 8 examples valid. OpenAPI: valid (swagger-parser); 12 path items, 13 operations.
- Unchanged: `ARCHITECTURE.md` (2026-10-19 20:32:34 UTC), `contracts.md` (20:33:16), `ports-and-adapters.md` (19:17:55), `dto.ts` (20:33:50), `events.md` (20:34:32), `openapi.yaml` (20:34:52) have the mtimes they had at Step 0; `prd.md`, `ux/*`, `readiness-gate-report.md`, `ai-log/decision-log.md` are dated 2026-09-28.

---

# Appendix 1 — raw output of the adversarial lens (unedited)

(The subagent was run in a fresh context with the file list and the `also_consider` text only. Text exactly as returned.)

- The OpenAPI request schema rejects at the wire the same range and enum violations that `contracts.md` P7 says must become a journalled `DENY(INVALID_REQUEST)` with HTTP 200. The SQL `decision` table also refuses to store a decision with an empty `subject_id`. A request with `requested_gpu_count: 3` or an empty `subject_id` therefore cannot yield the journalled Decision the contract promises.
  - Location: `schemas/openapi.yaml` EvaluateRequestDto lines 785-793; `contracts.md` evaluateRequest P7 line 33; `schemas/001_m2_schema.sqlite.sql` line 192.
  - Quotes: openapi "`requested_gpu_count: { type: integer, minimum: 1, maximum: 2 }`" and "`requested_vram_gb_per_gpu: { enum: [24, 48] }`". Contract P7 "`requested_gpu_count ∈ [1, 2]` ... violation: `DENY` with `cause = INVALID_REQUEST`". SQL "`CONSTRAINT decision_subject_nonempty CHECK (length(subject_id) > 0)`".

- `fact_snapshot` declares actor and fact columns `NOT NULL`, but decisions with `ACTOR_UNKNOWN`, `MODEL_NOT_FOUND` or `DEPENDENCY_UNAVAILABLE` are journalled with that snapshot. For those cases the facts do not exist (unknown actor, failed port). The schema has no way to represent "absent" except fabricated values.
  - Location: `001_m2_schema.sqlite.sql` lines 96-107 (same in the postgres file); `contracts.md` P8/P9, lines 34-35.
  - Quotes: "`actor_kind TEXT NOT NULL`", "`role_tier TEXT NOT NULL`", "`model_facts TEXT NOT NULL`", "`quota_facts TEXT NOT NULL`". Contract "`DENY` with `cause ∈ {MODEL_NOT_FOUND, ACTOR_UNKNOWN, ...}`".

- When the Clock port itself fails (`R-DEP-01`), no instant exists. Yet `decision.evaluated_at`, `fact_snapshot.campus_now` and every `created_at` are `NOT NULL`, and L7 says every `created_at` comes from the Clock port. The contract does not say what value is journalled for a `DEPENDENCY_UNAVAILABLE` decision caused by the clock.
  - Location: `contracts.md` P9 line 35 and Time line 54; `ports-and-adapters.md` L7 line 268; `001_m2_schema.sqlite.sql` lines 108 and 152.
  - Quotes: "the clock reading has `stratum < 15`, `leap_indicator = 0`, a non-negative age". Ports file "`created_at` and `updated_at` come from the `Clock` port". SQL "`evaluated_at TEXT NOT NULL`".

- The freeze and version events have no transactional outbox, so publishing them is a dual write. `decision_outbox.event_type` only admits the two decision events, and `events.md` says the storage of the other events is "not stated". `activateFreeze` Q-fail still promises "0 events are published" on rollback and Q3 promises at-least-once publication.
  - Location: `001_m2_schema.sqlite.sql` line 304; `events.md` table lines 25-28; `contracts.md` activateFreeze Q3 and Q-fail, lines 108 and 110.
  - Quotes: SQL "`event_type IN ('policy.decision.v1', 'policy.decision.failed.v1')`". events.md "not stated (`audit_events` records `FREEZE_ACTIVATED`)".

- `decision_outbox` carries columns that can only be known after insert (`first_attempt_at`, `journal_lag`), but the table is in the no-UPDATE/no-DELETE group. `first_attempt_at` can never be set after insert and `journal_lag` is frozen at its insert-time value.
  - Location: `001_m2_schema.sqlite.sql` lines 300-301 and 544-545; `contracts.md` Q3 line 39 (`journal_lag` metric).
  - Quotes: "`first_attempt_at  TEXT,`", "`journal_lag       INTEGER NOT NULL,`", "`CREATE TRIGGER decision_outbox_no_update BEFORE UPDATE ON decision_outbox`".

- The partial unique index on ACTIVE freezes will block re-activation of a scope forever once a freeze has merely run out. `EXPIRED` is computed and never swept, so the row stays `state = 'ACTIVE'` and still occupies the key. P11 then returns `DUPLICATE_ACTIVE_FREEZE` until someone lifts the expired freeze.
  - Location: `001_m2_schema.sqlite.sql` lines 502-504 (same in postgres); `contracts.md` activateFreeze P11 line 104 and Time line 118.
  - Quotes: SQL "`ON freeze (scope, json(subject_ids), json(node_class_ids)) WHERE state = 'ACTIVE'`". Contract "`EXPIRED` is computed from the clock, never swept."

- The uniqueness key is the whole serialized array, so overlapping scopes are not "duplicates". An `ALL` freeze and a `SUBJECT` freeze can both be ACTIVE, and `["A"]` and `["A","B"]` are different keys. Nothing in the DB enforces sorted or de-duplicated array elements, so `["B","A"]` and `["A","B"]` can also coexist. `DUPLICATE_ACTIVE_FREEZE` only catches exact matches.
  - Location: `001_m2_schema.sqlite.sql` lines 500-501.
  - Quote: "The key is (scope, subject_ids, node_class_ids); the arrays are stored lexicographically ordered (AR 4.2), json() minifies the text."

- `preview_token = HMAC(...)` is one-way, but the consume statement needs `$preview_run_id`. P8 locates the row by `(draft_id, actor_id)` and hash, never by the token string. No P clause verifies the token's signature, and with several valid previews per draft it is undefined which row is consumed.
  - Location: `contracts.md` previewFreeze Q1 line 72 and Concurrency line 82; activateFreeze P8 line 101; `001_m2_schema.sqlite.sql` section 6 statement 1, lines 601-609.
  - Quotes: "`preview_token = HMAC(server_secret, draft_id ‖ content_hash ‖ computed_at)`", "`WHERE preview_run_id = $preview_run_id`". Contract "so both stay valid until each reaches 60 s".

- `TOKEN_ACTOR_MISMATCH` is unreachable as specified. P8 only looks for a `PREVIEW_RUN` with `actor_id = caller`, so a row belonging to another actor produces `TOKEN_ABSENT`.
  - Location: `contracts.md` activateFreeze P8 line 101.
  - Quote: "a `PREVIEW_RUN` exists for `(draft_id, actor_id = caller)` ... `TOKEN_ABSENT` (no such row) ... `TOKEN_ACTOR_MISMATCH` (row belongs to another actor)".

- `TOKEN_STALE` can never fire: no route modifies a draft, so the draft hash cannot differ from `PREVIEW_RUN.content_hash`. `freeze_draft.updated_at` and its check are also meaningless. The contract never states that drafts are immutable.
  - Location: `openapi.yaml` freeze paths (only `POST /policy/freezes` creates a draft); `contracts.md` line 152; `001_m2_schema.sqlite.sql` lines 428 and 437.
  - Quotes: contract "Draft hash now differs from `PREVIEW_RUN.content_hash`". SQL "`updated_at    TEXT NOT NULL,`" on `freeze_draft`.

- `activateFreeze` Q4 claims the response and the stored freeze expose `reason`, `activated_by_role_tier` and `preview_run_id`. The response DTO has only `freeze_id` and `policy_version`, and the `freeze` table and `FreezeDto` have no `preview_run_id` or draft link.
  - Location: `contracts.md` Q4 line 109; `dto.ts` lines 257-260; `001_m2_schema.sqlite.sql` freeze table lines 376-392.
  - Quotes: contract "the response and the event cite `activated_by` ..., `activated_by_role_tier`, `reason`, and `preview_run_id`". DTO "`export interface ActivateFreezeResponseDto { freeze_id: UuidString; policy_version: PolicyVersionSeq; }`" (the interface body spans lines 257-260).

- `contracts.md` activateFreeze Q3 still lists `reason` in the `policy.freeze.activated.v1` payload. Ruling N1 (`ARCHITECTURE.md` §14) removed it, and `events.md` omits it with `additionalProperties: false`.
  - Location: `contracts.md` line 108; `events.md` §3.4 required list, line 203.
  - Quotes: contract "`allowance_ids[], reason, activated_by, policy_version, preview_run_id`". Architecture §14 "N1 ... `reason` and `lift_reason` removed from the payloads".

- `previewFreeze` I4 says the preview is "not journalled", and no clause writes `audit_events`. The schema defines `FREEZE_PREVIEW_COMPUTED`, and `activateFreeze` Q2 never mentions the `FREEZE_ACTIVATED` audit row. The contracts and the audit table disagree on which operations write audit rows.
  - Location: `contracts.md` previewFreeze I4 line 81 and activateFreeze Q2 line 107; `001_m2_schema.sqlite.sql` line 489.
  - Quotes: "the preview does not write `FREEZE`, `DECISION` or `DECISION_OUTBOX`; it is not journalled and not published". SQL "`'FREEZE_PREVIEW_COMPUTED', 'FREEZE_ACTIVATED'`".

- `FREEZE_STATE_UNREADABLE` (P6) says the store read failed, yet Q-fail requires appending a `policy.decision.failed.v1` row to `DECISION_OUTBOX` in that same database. `FreezeState` is the module's own table, so the write is likely to fail too. The failed event also requires a `stage`, and no stage is defined for this failure.
  - Location: `contracts.md` P6 line 32 and Q-fail line 41; `ports-and-adapters.md` row 27 line 51; `events.md` §3.2 line 123.
  - Quotes: "no `Decision` is recorded", "the module appends the event `policy.decision.failed.v1`". Ports file "covers the store that AR §2.1.1 calls 'the module's database connection' and the table it calls `FreezeState`".

- `SNAPSHOT_EVICTED` (410, "past its retention horizon") is defined, but `fact_snapshot` is append-only with no DELETE grant or trigger bypass. `decision.snapshot_retained` is declared and can never flip, since `decision` is no-UPDATE. No mechanism can evict a snapshot and no route serves the read.
  - Location: `contracts.md` catalog line 141 and Section 6 item 7; `001_m2_schema.sqlite.sql` lines 141-142 and 542-543.
  - Quotes: SQL "`CREATE TRIGGER fact_snapshot_no_delete BEFORE DELETE ON fact_snapshot`"; "the value written at insert can never flip to false". Contract "Read of a fact snapshot past its retention horizon".

- The two SQL files are declared parallel but are not. PostgreSQL has a gapless `published_seq` trigger and SQLite has none, so SQLite accepts skipped or repeated version numbers. SQLite's `GLOB '????????-????-7???-...'` UUID checks accept non-hex characters, while PostgreSQL uses the `uuid` type.
  - Location: `001_m2_schema.postgres.sql` lines 468-480; `001_m2_schema.sqlite.sql` line 170; header "same table and column names".
  - Quotes: Postgres "`IF NEW.published_seq <> (SELECT COALESCE(MAX(published_seq), 0) + 1 FROM policy_version)`". SQLite "`decision_id GLOB '????????-????-7???-????-????????????'`".

- The `policy.decision.v1` schema requires `node_class` as a non-empty string, but its source `decision.node_class_id` is nullable. The `Request` has no `node_class_id` (mismatch row 9), so nothing says where the value comes from. Any decision without a node class makes the event schema-invalid.
  - Location: `events.md` lines 46 and 64; `001_m2_schema.sqlite.sql` line 159; `dto.ts` line 186.
  - Quotes: events "`\"node_class\": { \"type\": \"string\", \"minLength\": 1 }`" (also in `required`). SQL "`node_class_id           TEXT,`".

- The layer map is inconsistent about who does the work. The Freeze Aggregate (row 10) is "Core Domain & Invariants (pure)", yet `events.md` names it as the producer of three events. The boot validator (row 8) depends on "nothing outside Core Domain", yet must reject an "unresolved `doc_id`" that lives in the DB. No implementer is listed for `previewFreeze`, `activateFreeze`, create/lift draft or the registry read routes.
  - Location: `ports-and-adapters.md` rows 4, 8 and 10 (lines 28, 32, 34); `events.md` table lines 25-27; `contracts.md` §4 AD-2 row.
  - Quotes: events "`policy.freeze.activated.v1` | OUT | Freeze Aggregate". Ports file "Boot validator ... unresolved ..." (row 8 text: "duplicate precedence, range `[−1, 1000]`, citations, strict-subset predicates, unread fact fields"). Contract "unresolved `doc_id`".

- UX-3 and UX-2 depend on routes that exist in neither the 13 operations of `openapi.yaml` nor the architecture route list. `GET /policy/journal` and `POST /policy/versions/publish` are absent. UX line 37 itself says "a surface with no route is a design fiction".
  - Location: `ux/EXPERIENCE.md` line 37; `openapi.yaml` paths; `ports-and-adapters.md` row 7 (publish use case with no route).
  - Quote: "UX-3 calls `GET /policy/journal`; UX-2 calls ... `POST /policy/versions/publish`".

- `liftFreeze` has no contract (P/Q/I) and no response for lifting a freeze that is not ACTIVE (already `LIFTED`, `EXPIRED`, or a draft id). Only 400/403/404 exist.
  - Location: `openapi.yaml` lift responses, lines 447-482; `contracts.md` §2 lists only three operations.
  - Quote: openapi "'200': description: The lifted freeze (AR 5.1 gives 200 only; body PROPOSED, human to confirm)".

- `GET /policy/freezes/{id}` is 403 for below-INSTRUCTOR callers, but a `DENY(FREEZE_ACTIVE)` returned to a student carries a `freeze_id`. UX says a journal row's `freeze_id` must be resolvable, and a student cannot resolve it. The UX "superseded by FRZ-… with a link to the successor" needs a successor reference, but `FreezeDto` only has `supersedes` (predecessor), and no clause ever sets `supersedes`.
  - Location: `openapi.yaml` lines 499-508; `dto.ts` line 403; `ux/EXPERIENCE.md` lines 37 and 200.
  - Quotes: openapi "Caller below role_tier INSTRUCTOR with LAB_OPERATOR scope (AR 5.1)". DTO "`supersedes: UuidString | null`". UX "`superseded by FRZ-…` with a link to the successor".

- `job.lifecycle.v1` has an optional `decision_id`, but `obligation_observation` is keyed by `decision_id` (NOT NULL). No rule says how an event without a `decision_id` is matched or dropped. No clause writes the initial `UNCONFIRMED` row. No operation owns the `timeout` source, which implies a background clock-driven writer. `obligation.ack.v1` carries `MISSED`/`UNCONFIRMED` states although it is an "ack".
  - Location: `events.md` lines 337 and 377; `001_m2_schema.sqlite.sql` lines 358 and 368; `contracts.md` evaluateRequest Q2 line 38.
  - Quotes: events "`decision_id` is optional (`AR` §5.2: `decision_id?`)". SQL "`source IN ('OBLIGATION_ACK', 'job.lifecycle.v1', 'timeout')`".

- The preview route `/policy/decisions/preview` returns a full `DecisionDto` whose required fields are `decision_id` (uuid7) and `evidence_snapshot_ref`. The route is "not journalled", so these identifiers point at rows that never exist. The UX says the override preview "returns a token", but the response has no token field.
  - Location: `openapi.yaml` lines 74-96 and 745; `ux/EXPERIENCE.md` line 16.
  - Quotes: openapi "Same evaluation, not journalled, not published (AR 5.1)". UX "it returns a token that is actor-bound and valid for 60 s".

- `request_id` is a required request field but is stored nowhere (no `decision` column, no event field, no idempotency column). Only `request_chain_id` survives, so a single request cannot be traced.
  - Location: `dto.ts` line 206; `001_m2_schema.sqlite.sql` decision table lines 143-168.
  - Quote: "`request_id: string; // PRD 5 Request.request_id`".

- `uuid7` ids embed a timestamp, but the ports file says the Clock port is the only time source. The `IdGenerator` is a separate port with no stated link to `campus.clock`, so `decision_id` time bits can disagree with `evaluated_at` and with the fake clock in tests.
  - Location: `ports-and-adapters.md` §5 rule 2 line 128 and row 24 line 48.
  - Quote: "Time and randomness enter only through the Clock / IdGenerator ports."

- `ConstraintDto.kind` and `ConstraintValueDto.kind` are duplicated. `HARD_DEADLINE.value.must_checkpoint_by` duplicates `deadline`, which must equal `valid_until`. SQL only checks `json_valid(value)`, so the copies can disagree and nothing in the contracts says which is authoritative.
  - Location: `dto.ts` lines 140-156; `001_m2_schema.sqlite.sql` line 226.
  - Quotes: "`{ kind: 'HARD_DEADLINE'; must_checkpoint_by: InstantString }`", "`CONSTRAINT decision_constraint_value_json CHECK (json_valid(value))`".

- `bound_role` is stored per `trace_entry` (one row per rule, key `(decision_id, seq)`). The PRD invariant requires every boundary in `B` to appear exactly once with a role. The schema has no boundary identifier column, so a boundary that maps to no rule row, or two boundaries on one rule, cannot be represented. Whether the identity is kept in `evidence` JSON: not verified.
  - Location: `001_m2_schema.sqlite.sql` lines 239-258; `prd.md` line 216.
  - Quotes: SQL "`bound_role   TEXT,`". PRD "Every element of `B` (§6.3) appears in the trace exactly once, carrying `bound_role`".

- The preview token HMAC is over `draft_id ‖ content_hash ‖ computed_at`, which excludes `actor_id`, yet I2 says the token is valid for that actor only. `computed_at` is not a stored `PREVIEW_RUN` column (it has `issued_at`), so the signed value cannot be recomputed. The response `expires_at` (= `issued_at + 60 s`) is also still a valid instant under K5, so clients reading `expires_at` as the expiry get a one-instant disagreement.
  - Location: `contracts.md` previewFreeze Q1 line 72, I2 line 79, Time line 83.
  - Quotes: "`HMAC(server_secret, draft_id ‖ content_hash ‖ computed_at)`", "the token is valid for that actor only", "valid AT 60 s, expired above it".

---

# Appendix 2 — raw output of the edge-case-hunter lens (unedited)

```json
[
{"location":"schemas/events.md:64 (also :46 required list) vs schemas/001_m2_schema.sqlite.sql:159 -- quote: '\"node_class\": { \"type\": \"string\", \"minLength\": 1 }' and 'node_class_id TEXT,'","trigger_condition":"decision.node_class_id is NULL (PRD Request has no node_class_id), event requires non-empty string node_class","guard_snippet":"\"node_class\": { \"type\": [\"string\", \"null\"], \"minLength\": 1 }","potential_consequence":"Every decision event with null node class fails its own schema; consumers reject it."},
{"location":"schemas/001_m2_schema.sqlite.sql:189 and schemas/001_m2_schema.postgres.sql:166 -- quote: 'CHECK (must_checkpoint_by IS NULL OR must_checkpoint_by = valid_until)'","trigger_condition":"DENY row has valid_until NULL and must_checkpoint_by non-NULL; comparison is NULL so CHECK passes","guard_snippet":"CHECK (must_checkpoint_by IS NULL OR (valid_until IS NOT NULL AND must_checkpoint_by = valid_until))","potential_consequence":"Persisted decision can carry a checkpoint obligation with no deadline, violating the single-deadline invariant."},
{"location":"contracts.md:104 and :118; schemas/001_m2_schema.sqlite.sql:502-504 -- quote: 'EXPIRED is computed from the clock, never swept' and 'WHERE state = ''ACTIVE'''","trigger_condition":"A freeze passes ends_at: stored state stays ACTIVE, so the partial unique index still holds the scope","guard_snippet":"on activate, reject only ACTIVE rows with ends_at > campus_now, or add a state transition to EXPIRED in the same transaction","potential_consequence":"Scope permanently blocked by an expired freeze; every new activation returns DUPLICATE_ACTIVE_FREEZE."},
{"location":"schemas/001_m2_schema.sqlite.sql:500-504 and schemas/001_m2_schema.postgres.sql:434-438 -- quote: 'the arrays are stored lexicographically ordered (AR 4.2)'","trigger_condition":"subject_ids or node_class_ids arrive unsorted or with duplicates; no CHECK or contract step normalises them","guard_snippet":"normalise (sort, dedupe) draft arrays before hashing and insert; reject duplicates at WIRE_SHAPE_INVALID","potential_consequence":"[\"a\",\"b\"] and [\"b\",\"a\"] both activate; unique index fails to prevent duplicate ACTIVE freezes."},
{"location":"schemas/001_m2_schema.sqlite.sql:401-402 (Postgres :353-354) -- quote: 'CHECK (scope = ''SUBJECT'' OR json_array_length(subject_ids) = 0)'","trigger_condition":"scope = SUBJECT with empty subject_ids, or scope = NODE_CLASS with empty node_class_ids","guard_snippet":"CHECK (scope <> 'SUBJECT' OR json_array_length(subject_ids) >= 1), same for NODE_CLASS","potential_consequence":"Activatable freeze matching no subject or node class; operator believes campus is frozen."},
{"location":"schemas/openapi.yaml:791-793 vs contracts.md:27 and :33 -- quote: 'requested_gpu_count: { type: integer, minimum: 1, maximum: 2 }' versus 'violation: DENY with cause = INVALID_REQUEST ... journalled'","trigger_condition":"requested_gpu_count 3, vram 32, duration 5000 or unknown workload_kind sent to evaluateRequest","guard_snippet":"remove minimum/maximum/enum from EvaluateRequestDto wire schema; leave range checks to R-VALID-01","potential_consequence":"Schema layer returns 400 not journalled; contract promises journalled 200 DENY; two behaviours."},
{"location":"contracts.md:101 (activateFreeze P8) and schemas/dto.ts:253 -- quote: 'a PREVIEW_RUN exists for (draft_id, actor_id = caller) whose content_hash equals the draft hash'","trigger_condition":"Several PREVIEW_RUN rows per draft, or body preview_token is wrong or forged; lookup ignores the token value","guard_snippet":"verify token_signer.verify(preview_token) then select the PREVIEW_RUN by its preview_run_id; else TOKEN_ABSENT","potential_consequence":"Any live preview consumed regardless of supplied token; forged token never rejected; row chosen ambiguously."},
{"location":"schemas/001_m2_schema.sqlite.sql:420 (freeze_draft, no freeze_id) and contracts.md:117 -- quote: 'lists no freeze_id column in FREEZE_DRAFT; none is added' and '3 activations of one draft yield 1 freeze'","trigger_condition":"Draft already activated, freeze later lifted or expired, then re-previewed and re-activated within 24 h","guard_snippet":"record activated_freeze_id on the draft and reject activation of an already-activated draft (DRAFT_ALREADY_ACTIVATED)","potential_consequence":"One draft yields several freezes over time; one-draft-one-freeze guarantee holds only while first is ACTIVE."},
{"location":"schemas/001_m2_schema.sqlite.sql:304 and contracts.md:108 -- quote: 'CHECK (event_type IN (''policy.decision.v1'', ''policy.decision.failed.v1''))' versus 'at-least-once, consumers Gateway, M9, Observability'","trigger_condition":"Crash after freeze activate, lift, draft or version publish commits but before bus publish","guard_snippet":"extend outbox event_type enum and write an outbox row in the same transaction for freeze and version events","potential_consequence":"Freeze and version events lost; Gateway cache keeps serving a stale freeze state."},
{"location":"schemas/events.md:29-30 and :129; schemas/001_m2_schema.sqlite.sql:357-372 -- quote: 'decision_id\": { \"type\": \"string\"' optional in job.lifecycle.v1 versus 'decision_id TEXT NOT NULL REFERENCES decision' in obligation_observation","trigger_condition":"Inbound job.lifecycle.v1 without decision_id, unknown decision_id, or redelivered eventId (at-least-once)","guard_snippet":"add event_id column with UNIQUE (event_id) to obligation_observation; define drop or park path for events with no resolvable decision_id","potential_consequence":"Duplicate or unattributable observations rows; ingestion violates FK or silently drops obligation state."},
{"location":"schemas/events.md:129,139 and contracts.md:140 -- quote: 'stage\": { \"enum\": [\"PORT_FETCH\", \"CONTEXT_BUILD\", \"RENDER\"] }' versus 'error_code ... enum [FREEZE_STATE_UNREADABLE, DECISION_NOT_PRODUCED]'","trigger_condition":"Failure at stage RENDER: no 5xx, no error_code member, no contract clause says what is returned","guard_snippet":"define response and error_code for RENDER failure (e.g. DENY via template fallback) or remove RENDER from stage enum","potential_consequence":"Renderer failure has undefined outcome: no Decision, no valid failed event, request left unanswered."},
{"location":"schemas/001_m2_schema.sqlite.sql:299 and schemas/events.md:123 -- quote: 'payload_ref TEXT NOT NULL'","trigger_condition":"Publisher rebuilds policy.decision.failed.v1 after crash; stage, failing_port, error_code, actor_id, received_at stored nowhere","guard_snippet":"add failure columns (stage, failing_port, error_code, actor_id, received_at, retry_after_ms) or define payload_ref as an embedded JSON payload","potential_consequence":"Failed-decision event cannot be reproduced on retry; fields lost or fabricated. Content of payload_ref: not verified."},
{"location":"schemas/001_m2_schema.sqlite.sql:95 (fact_snapshot.ref PRIMARY KEY) and contracts.md:38 (Q2) -- quote: 'ref is content-addressed'","trigger_condition":"Two evaluations produce identical projected facts (same ref); plain INSERT violates the primary key","guard_snippet":"INSERT INTO fact_snapshot ... ON CONFLICT (ref) DO NOTHING, and ensure ref covers decision_id or campus_now","potential_consequence":"Second concurrent evaluation aborts its transaction though valid; spurious 5xx. Whether ref includes campus_now: not verified."},
{"location":"contracts.md:30 and schemas/001_m2_schema.sqlite.sql:342 -- quote: 'a different request_hash'","trigger_condition":"Retry has reordered keys, whitespace, a new request_id or a different derived_from; hash input undefined","guard_snippet":"define request_hash = sha256(canonical JSON of body excluding request_id), including derived_from","potential_consequence":"Legitimate retries rejected as IDEMPOTENCY_BODY_MISMATCH, or divergent bodies treated as replays."},
{"location":"contracts.md:107 (activateFreeze Q2) and schemas/001_m2_schema.sqlite.sql:489 -- quote: 'in one transaction: one FREEZE row is inserted ... and PREVIEW_RUN.consumed_at is set' versus audit action 'FREEZE_ACTIVATED'","trigger_condition":"Activate commits without the audit_events row, or the audit insert fails after the freeze insert","guard_snippet":"add to Q2: insert audit_events(FREEZE_ACTIVATED) in the same transaction; same for draft, preview, lift","potential_consequence":"Freeze active with no audit record; lifted_by lost since it exists only in audit_events."},
{"location":"schemas/openapi.yaml:432-482 (liftFreeze) and contracts.md section 3.1","trigger_condition":"Lift called on a freeze already LIFTED, EXPIRED, or never activated; no code or status exists","guard_snippet":"add FREEZE_NOT_LIFTABLE 409 (state <> ACTIVE) to catalog and add a '409' response to liftFreeze","potential_consequence":"Double lift overwrites or errors unpredictably; lift_reason and lifted_by audit overwritten."},
{"location":"schemas/openapi.yaml:575 and schemas/dto.ts:25 -- quote: 'pattern: ''^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$'''","trigger_condition":"Client sends starts_at such as 2026-13-45T99:99:99.000Z or 2026-02-31; pattern accepts it","guard_snippet":"add format: date-time and a semantic validation step returning WIRE_SHAPE_INVALID before any insert","potential_consequence":"SQL strftime CHECK rejects insert at write time, surfacing as unmapped 500 instead of 400."},
{"location":"ports-and-adapters.md:51 (row 27, ports/out/repository) and contracts.md:38,107","trigger_condition":"Single operation must write 8+ tables atomically; repository port defines no transaction or unit-of-work boundary","guard_snippet":"declare repository.withTransaction(fn) in ports/out/repository, with BEGIN IMMEDIATE semantics for SQLite","potential_consequence":"Adapters may commit per call; partial Decision records or consumed token without a freeze."},
{"location":"ports-and-adapters.md:130 (hard rule 4) and schemas/dto.ts (no event types)","trigger_condition":"ports/out/event_bus publishes 8 payloads from events.md; dto.ts defines no DTO for any event","guard_snippet":"add PolicyDecisionEventDto ... ObligationAckEventDto to dto.ts, mirroring events.md schemas, and reference them in the event_bus signature","potential_consequence":"Event payloads untyped at the port boundary; drift between events.md and publisher code undetected."},
{"location":"schemas/001_m2_schema.sqlite.sql:225-231 and schemas/dto.ts:139-152","trigger_condition":"decision_constraint.value.kind differs from the kind column (e.g. kind QUOTA_CAP, value kind HARD_DEADLINE)","guard_snippet":"CHECK (json_extract(value, '$.kind') = kind)","potential_consequence":"Stored constraint contradicts itself; DTO discriminated union deserialises into wrong member."}
]
```
