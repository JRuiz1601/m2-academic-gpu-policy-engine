# AI Decision Log — M2 Academic GPU Policy Engine (Solu-2)
## Phases 0–2 · contracts, ports and adapters, schemas, DTO, events, OpenAPI

**Recorded:** 2026-10-19 (Colombia time) · **Covers:** Solu-2 Phase 0 (gap audit and stack), Phase 1 (contracts), Phase 2 (detailed design, cross-check, gate reviews and triage)
**Owner of the decisions:** Juan Esteban Ruiz Ome (Architect, Owner A for Phases 0–2) · **Pair:** Tomás Quintero — see DL-16
**Companion documents:** `planning/ARCHITECTURE.md` · `planning/detailed-design/contracts.md` · `planning/detailed-design/ports-and-adapters.md` · `planning/detailed-design/schemas/` · `reviews/review-arch-implementability.md` · `reviews/review-detailed-design.md`
**Not edited by this log:** `ai-log/decision-log.md` (the earlier log for PRD, architecture and UX revisions 1–3).

---

## 0. What this log is

This is the record of the points where the AI proposed something and a person declined it, changed it or sent it back, and of the verification that caught defects in the AI's own output. It is not a changelog.

**Where the reasons come from.** Each entry says whether the reason is *Juan's stated reason* or *analysis recorded at the time*. A stated reason was chosen by Juan, from a short list of options, in the session on 2026-10-19 (Colombia time); the question and his answer are listed in Appendix A. Where no reason was asked, the entry gives the analysis that the review file recorded when the decision was taken, and says so. No entry gives a motive that Juan did not state.

**Distribution.** 16 entries (`DL-1`…`DL-16`). Of them, 9 are rejections of a proposal or option (DL-1 to DL-8, DL-11), 1 is a withdrawn acceptance (DL-12), and 6 are accepted decisions or records. The adversarial and edge-case review of the detailed design produced 38 distinct findings (28 adversarial, 20 edge-case, 10 duplicates): 20 Accept, 18 Defer, **0 Reject** (DL-13 explains why there is no Reject). Phases 3–4 add 8 entries, `DL-17`…`DL-24` (section 5). Phase 5 adds 14 entries, DL-25 … DL-38 (section 6): 10 ACCEPTED, 2 MODIFIED (DL-26, DL-34) and 2 ACCEPTED as deferred (DL-32, DL-38). The readiness gate run 1 adds 5 entries, DL-39 … DL-43 (section 7), all ACCEPTED (DL-41 and DL-43 with a same-day amendment); the log had 43 entries after them. Gate run 2 adds 5 entries, DL-44 … DL-48 (section 8): 4 ACCEPTED and 1 entry that records the absence of a decision (DL-47); the log had 48 entries after them. Gate run 3 adds 5 entries, DL-49 … DL-53 (section 9), all ACCEPTED; the log has 53 entries in total. Appendix C lists every entry in the course template; where a field is not recorded in the entry, the cell says so.

### 0.1 Entry format

| Field | Purpose |
|---|---|
| **Proposal** | What was proposed, in the proposer's terms. |
| **Status** | `ACCEPTED` / `REJECTED` / `MODIFIED` / `REVERSED`. |
| **Rationale** | The argument. `Juan's stated reason` marks the part Juan chose. |
| **What was kept** | For a rejection: the part of the proposal that survived. |
| **Falsifier** | The observation that would reopen it. |
| **Trace** | Where the decision lives now. |

The deny-list of `prd.md` FR-15 is binding on this file by reference.

---

## 1. Rejections of proposals and options

### DL-1 — `CHAINED` as a value of `parent_kind`
- **Proposal.** The ER diagram of `ARCHITECTURE.md` listed `parent_kind "ROOT|DERIVED|CHAINED"`. Neither the PRD nor the architecture defined `CHAINED` or a way to create it (finding G-22 of the implementability review: "Derived/chained decisions have no entry point").
- **Status.** REJECTED (ruling R2).
- **Rationale.** *Juan's stated reason:* nobody defined it. A value with no definition and no creation path is a gap an implementer fills by inventing: one team would write a chain of re-evaluations, another a retry marker, and a test cannot be written against either. With two values, `ROOT` (no `derived_from`) and `DERIVED` (with `derived_from`), the column is derivable from a single request field.
- **What was kept.** `derived_from` (optional parent decision id) and `parent_kind` with two values; the server computes `depth`.
- **Falsifier.** A requirement in the PRD that needs a third relationship between decisions, with a definition and a test.
- **Trace.** `ARCHITECTURE.md` §4.1 `parent_kind "ROOT|DERIVED (two values only; CHAINED removed, R2)"`; §5.1 decisions row; §14 line "Phase 1 closure (P1-CONTRACTS-1): R1–R4". Candidate entries C-17, C-21.

### DL-2 — `WINDOW_STARTED` and the rejection of a freeze that has already started
- **Proposal.** `activateFreeze` validated `starts_at`; a freeze whose `starts_at` was earlier than `campus_now` was refused with `400 WINDOW_STARTED`.
- **Status.** REJECTED (ruling K2).
- **Rationale.** *Juan's stated reason:* the browser clock. Between the moment the operator fills the form and the moment the server validates it, seconds pass, so a freeze that starts "now" almost always arrives with a `starts_at` in the past and would fail by race, not by error. The only freeze that protects nothing is one whose `ends_at` has already passed; that case is still refused.
- **What was kept.** `WINDOW_IN_PAST` when `ends_at <= campus_now`.
- **Falsifier.** A freeze with `starts_at` in the past that causes a wrong admission decision, shown by a test with the fake clock.
- **Trace.** `contracts.md` §3 (catalog without `WINDOW_STARTED`); `ARCHITECTURE.md` §14 K2; candidate C-25. **Open consequence:** `ux/EXPERIENCE.md` UX-4 (`E-VALIDATION`) still lists `WINDOW_STARTED`; the UX file has not been changed (`review-detailed-design.md` Part E.2, row 1).

### DL-3 — a degraded activation path when the preview is unavailable
- **Proposal.** The UX defines an "Error (degraded)" state in which the console offers to activate a freeze although the preview failed.
- **Status.** REJECTED (ruling D1 of P1-ARCH-AMEND).
- **Rationale.** *Juan's stated reason:* security. Activating a freeze without seeing its consequences is the unsafe action that the server-enforced preview exists to prevent (M2-AD-9). A second path that skips the preview defeats the invariant for the one moment, an outage, when it matters most.
- **What was kept.** A preview `503` blocks activation; the operator retries.
- **Falsifier.** An incident where an urgent freeze could not be activated because the preview stayed down, with a measured duration that the operations owner judges unacceptable.
- **Trace.** `ARCHITECTURE.md` §5.1 preview row; §14 P1-ARCH-AMEND D1; candidate C-11. **Open consequence:** the UX degraded state is not yet amended (`review-detailed-design.md` Part E.2, row 2).

### DL-4 — the Annex A operation `reevaluateRunningJob`
- **Proposal.** The course Annex A lists `evaluateRequest`, `activateEmergencyFreeze` and `reevaluateRunningJob` as the candidate operations of this module.
- **Status.** REJECTED (the module uses `evaluateRequest`, `previewFreeze`, `activateFreeze`).
- **Rationale.** *Juan's stated reason:* the PRD rules. Annex A of the course task (`task-solu2_UniversityAICompute_Workshop.pdf`) says its operations are "starting points, not answers", that the module's own PRD and `ARCHITECTURE.md` take precedence, and that deviations must be justified in the decision log (this entry is that justification); the module decides on each request, and re-evaluating a job that is already running belongs to the component that runs it (M9), not to this module.
- **What was kept.** The boundary-time behaviour of the Annex edge case (a job approved at 21:58 under the night policy and running past 10:00) is covered by `valid_until` and `must_checkpoint_by` on every `ALLOW`, with the obligation published to M9.
- **Falsifier.** A PRD change that makes this module responsible for stopping running jobs.
- **Trace.** `contracts.md` §2 (three operations); candidate C-1; `review-detailed-design.md` Part B, Annex A row 2.

### DL-5 — a sentinel value for facts that do not exist (`NULL` was chosen)
- **Proposal.** When the actor or the model does not exist, store a fixed text such as `UNKNOWN` in `fact_snapshot.actor_kind`, `role_tier`, `model_facts`, `quota_facts`, which were `NOT NULL`.
- **Status.** REJECTED (finding ADV-2, triage decision TF-1).
- **Rationale.** *Juan's stated reason:* do not invent data. A stored `UNKNOWN` looks like recorded data and leaks into queries and metrics; `NULL` says "does not exist" without ambiguity. A trigger limits `NULL` to the three causes in which the fact can be absent.
- **What was kept.** The four columns are nullable; `decision_null_facts_by_cause` allows a `NULL` only for `ACTOR_UNKNOWN`, `MODEL_NOT_FOUND` and `DEPENDENCY_UNAVAILABLE`.
- **Falsifier.** A consumer of `fact_snapshot` that cannot distinguish "absent" from "not recorded" and needs the sentinel.
- **Trace.** `ARCHITECTURE.md` §4.1 `FACT_SNAPSHOT`, §14 TF-1; both SQL files (`fact_snapshot` columns and trigger `decision_null_facts_by_cause`); candidates C-61, C-73.

### DL-6 — accepting the dual write for freeze and version events
- **Proposal.** Publish `policy.freeze.*` and `policy.version.published` after the commit, outside the transactional outbox, and record the loss risk as a Trade-off.
- **Status.** REJECTED (finding ADV-4, triage decision TF-3).
- **Rationale.** *Juan's stated reason:* coherence with M2-AD-8. The module already promises at-least-once publication for decision events through the outbox; two delivery regimes for events of the same module is an inconsistency that is hard to defend. The operational risk is specific: if the bus fails after the commit, the Gateway never learns of the freeze and keeps admitting jobs with a stale cache.
- **What was kept.** The outbox row is written in the same transaction as the change; a rollback publishes nothing. The `decision_outbox` event types and key columns were widened (exactly one key column, matching the event type); the table stays append-only.
- **Falsifier.** Evidence that the bus is more reliable than the database commit path, or a consumer that tolerates lost freeze events.
- **Trace.** `ARCHITECTURE.md` §4.1 `DECISION_OUTBOX`, §5.2 event rows, §14 TF-3; both SQL files (`decision_outbox`); `events.md`; candidates C-62, C-75.

### DL-7 — marking an expired freeze as `LIFTED` (a stored `EXPIRED` was chosen)
- **Proposal.** To stop an expired `ACTIVE` freeze from occupying its scope key, set it to `LIFTED` with a system reason.
- **Status.** REJECTED (finding ADV-6, triage decision TF-5).
- **Rationale.** *Juan's stated reason:* honest states. "Expired" and "lifted" are different facts: moving to `LIFTED` would emit a `policy.freeze.lifted.v1` that no person decided and make the audit trail say that someone lifted what simply ran out.
- **What was kept.** `freeze.state` has a stored `EXPIRED` value, written only by the closing step of `activateFreeze` before it inserts the new freeze; read paths still compute `EXPIRED` from `ends_at`. The closing step writes no event.
- **Falsifier.** A read path that disagrees with the stored value, found by a test with the fake clock.
- **Trace.** `ARCHITECTURE.md` §4.1 `FREEZE.state`, §14 TF-5; both SQL files (`freeze_state_enum`, `freeze_expired_only_after_end`); candidates C-64, C-77.

### DL-8 — range checks on the wire for `Request`
- **Proposal.** Keep `minimum`/`maximum` and an `enum` for `requested_gpu_count`, `requested_vram_gb_per_gpu` and `expected_duration_min` in the OpenAPI request schema, so an out-of-range value returns `400`.
- **Status.** REJECTED (finding ADV-1, triage decision TF-9).
- **Rationale.** *Juan's stated reason:* the PRD asks for a visible `DENY`. A value out of range must be stored as a `DENY(INVALID_REQUEST)` that the student sees in her journal, not disappear in a `400`. `contracts.md` P7 says so, and the wire schema contradicted it.
- **What was kept.** The wire schema validates types and non-empty strings only; the core decides ranges and journals the denial; the non-empty `CHECK`s on `decision.subject_id` and `model_ref` stay.
- **Falsifier.** A requirement that out-of-range requests must never reach the core.
- **Trace.** `openapi.yaml` `EvaluateRequestDto`; `contracts.md` P1 and P7; `ARCHITECTURE.md` §14 TF-9; candidates C-60, C-81.

### DL-11 — trusting the completion reports of the coding agent
- **Proposal.** Treat the final report of each Claude Code task as evidence that the task is done.
- **Status.** REJECTED (standing rule of the owner).
- **Rationale.** *Juan's stated approach:* ask for the explanation when he did not understand, decide with it, and verify the files themselves instead of the report. The audits of the files found problems that no report mentioned: the task text itself blocked three times on the orchestrator's own mistakes (a file list that contradicted the rules in P1-CONTRACTS-1, a wrong step reference in P2-PORTS-1, a backup name that already existed in P2-TRIAGE-FIX-1), caught by the agent's pre-check; the PostgreSQL file did not load (DL-12); and after the triage, `ports-and-adapters.md` still described the token signature with `computed_at` and a review header still said "Proposed", both found by audit and fixed in P2-CLOSE-1.
- **What was kept.** The task-queue protocol (one task file, a pre-check, `DONE.log`, `LAST-REPORT.md`, backups before every edit), the Stop-Point Rule (stubs and failing tests only), and the protected files (`prd.md`, `ux/*`, `readiness-gate-report.md`, `ai-log/decision-log.md` unchanged since 2026-09-28).
- **Falsifier.** A task whose report was wrong in a way the audit also missed.
- **Trace.** `prompts/backup/` (BLOCKED.* and NEXT.* files); `prompts/DONE.log`; `reviews/review-detailed-design.md` Triage record.

---

## 2. Withdrawn acceptance

### DL-12 — the PostgreSQL schema was accepted as complete and did not load
- **Proposal.** The PostgreSQL migration produced in P2-SCHEMA-1 and P2-SCHEMA-2 was accepted as finished; it had been compared with the SQLite file by hand and never run.
- **Status.** REVERSED (P2-CROSSCHECK-1, fix F3).
- **Rationale.** The cross-check loaded the file in an embedded PostgreSQL (`@electric-sql/pglite`) and it failed: `FREEZE` is a reserved word in PostgreSQL, so `CREATE TABLE freeze` is a syntax error. The same pass added three fixes found by reading constraint bodies instead of comments: trigger `preview_run_consumed_once` (a token is consumed once), trigger `policy_version_seq_next` (`published_seq` is the next integer), and `decision_single_deadline` (a checkpoint needs a deadline). *Analysis recorded at the time; no stated reason was asked.*
- **What was kept.** The table name `freeze` is unchanged; the identifier is quoted (`"freeze"`) in the PostgreSQL file only.
- **Falsifier.** Another identifier that PostgreSQL reserves, or a construct the embedded engine accepts and PostgreSQL 16 rejects.
- **Trace.** `001_m2_schema.postgres.sql` (quoted `"freeze"`, the two triggers); `review-detailed-design.md` A.7 and Triage record; candidates C-56 to C-59.

---

## 3. Accepted decisions and records

### DL-9 — TypeScript on Node.js as the language of the module
- **Proposal.** Phase 0 left the language open (finding G-25 of the implementability review); the Stack Decisions block proposed TypeScript on Node.js with Express, PostgreSQL 16 plus SQLite WAL (`pg`, `better-sqlite3`), Vitest and fast-check, and `Clock`/`IdGenerator` ports.
- **Status.** ACCEPTED.
- **Rationale.** *Juan's stated reason:* types that travel. The DTOs, the OpenAPI schema and the event payloads are written once as types and checked by the compiler, which cuts disagreements between layers.
- **What was kept.** Ports are TypeScript interfaces with simulated adapters; gRPC and the production `Clock`/`IdGenerator` adapters are documentary only.
- **Falsifier.** A requirement of the course or of M9 that fixes another language.
- **Trace.** `ARCHITECTURE.md` §7 and §9; `ports-and-adapters.md`; candidates C-9, C-10, C-33, C-34.

### DL-10 — idempotency of `POST /policy/decisions`
- **Proposal.** Finding G-06: the idempotency key had two uniqueness homes, no body hash, no window and no scope. Ruling D2 of P1-ARCH-AMEND, then K3 and N5.
- **Status.** ACCEPTED.
- **Rationale.** *Analysis recorded at the time (no stated reason asked):* a key unique per `(actor_id, key)` stops one actor from receiving another actor's decision; a stored body hash lets a replay with a different body fail with `409`; a 24-hour window bounds the table; the designed retry flow (`503`, three automatic retries) would otherwise write three decisions for one click. An expired key is refused with `409 IDEMPOTENCY_KEY_EXPIRED` and rows are never deleted. N5: the header is required on `POST /policy/decisions` and optional on `POST /policy/decisions/preview`, which is not journalled.
- **What was kept.** No server-derived keys.
- **Falsifier.** A client that cannot send a key on the decision route.
- **Trace.** `ARCHITECTURE.md` §4.1 `IDEMPOTENCY_KEY`, §5.1 idempotency paragraph; `contracts.md` §3 and `evaluateRequest`; both SQL files; candidates C-12, C-26, C-55.

### DL-13 — outcome of the adversarial and edge-case review of the detailed design
- **Proposal.** The gate of Phases 1–2 runs two lenses (`bmad-review-adversarial-general`, `bmad-review-edge-case-hunter`) on `planning/detailed-design/` and triages the output.
- **Status.** ACCEPTED, with a proposed disposition for each finding that the owner decided: 38 distinct findings, **20 Accept, 18 Defer, 0 Reject**.
- **Rationale.** No finding was rejected: the review file records, for each, the evidence found in the files, and none was refuted whole (examples: `contracts.md` Q3 still listed `reason`; the unique index compared the whole serialized array, so `["b","a"]` and `["a","b"]` were different scopes; the OpenAPI request schema refused at the wire a range that `contracts.md` P7 journals as a `DENY`). ADV-18 and ADV-27 were marked "not verified" at triage and were re-read afterwards. One finding (the first half of ADV-16, "the SQL files are not parallel") was refuted in part because the reviewer read the files before fix F2. The 18 Deferred findings are gaps of lower impact, or they depend on a UX or PRD decision (ADV-19, ADV-21, ADV-23), or, as for EDG-19, they follow an earlier decision (A2 limited `dto.ts` to the operation DTOs; the event payload schemas live in `events.md`). ADV-18 and ADV-27 were confirmed as gaps on that re-read and remain Deferred. *Analysis recorded at the time.*
- **What was kept.** Every Accepted finding points to the artifact change that fixed it (`Accepted (human) - fixed in …`).
- **Falsifier.** A Deferred finding that fails a test in Phase 3.
- **Trace.** `reviews/review-detailed-design.md` (Parts A–E, Appendices 1–2, Triage record); `ARCHITECTURE.md` §14 TF-1 to TF-16; candidates C-60 to C-72, C-73 to C-88.

### DL-14 — a database trigger for `evaluated_at = campus_now`, not a Trade-off
- **Proposal.** The Step 2.3 cross-check found the equality between `decision.evaluated_at` and `fact_snapshot.campus_now` kept only by the `Decision` constructor, and offered either a documented Trade-off or a trigger.
- **Status.** ACCEPTED (trigger).
- **Rationale.** The course asks to fix the schema first and to soften the contract with a Trade-off only when the schema cannot be fixed. A cross-table equality cannot be a `CHECK`, but it can be a trigger in both engines. *Analysis recorded at the time.* The M2-AD-5 gap (write grants exist only in PostgreSQL) cannot be fixed in SQLite, so it was written as a Trade-off instead.
- **What was kept.** The M2-AD-5 Trade-off text names the import-graph test `ad5-write-scope.test.ts` as the only guard in the SQLite profile.
- **Falsifier.** A decision insert path that must run before its snapshot exists.
- **Trace.** Both SQL files, trigger `decision_evaluated_at_matches_snapshot`; `ARCHITECTURE.md` M2-AD-5 Trade-off, §14 TF-13, TF-14; candidates C-85, C-86.

### DL-15 — the error for an unreadable clock (open, to confirm)
- **Proposal.** When the `Clock` port returns no instant, no `Decision`, event or outbox row can be dated; reuse `DECISION_NOT_PRODUCED` (HTTP 503) with a carve-out instead of adding a code (which would make the catalog 39).
- **Status.** ACCEPTED, marked `PROPOSED, human to confirm` in `contracts.md` §3.
- **Rationale.** The owner chose to answer 503 and store nothing (triage decision TF-2), and to reuse the existing code with a written exception. The exception contradicts the code's usual meaning (a failed-event row is written), so it stays visible as a proposal.
- **What was kept.** A clock reading that exists but fails the quality rule still journals `DENY(DEPENDENCY_UNAVAILABLE)`.
- **Falsifier.** A test or a reader that needs the carve-out spelled as its own code.
- **Trace.** `contracts.md` §3 and P9; `ARCHITECTURE.md` §5.1, §14 TF-2; candidates C-61, C-74.

### DL-16 — who did what in Phases 0–2
- **Proposal.** Pair roles: the partner who leads Phases 1–2 becomes the Reviewer in Phase 3; the other becomes the Test Lead.
- **Status.** ACCEPTED.
- **Rationale.** *Juan's stated answer:* Juan led Phases 0–2 as Architect and owner of the decisions. Tomás Quintero has not taken part in Phases 0–2; he joins as Test Lead in Phase 3 and the roles of Phases 3–5 are shared. This log does not credit Tomás with any decision above.
- **What was kept.** Phases 4–5 stay shared.
- **Falsifier.** n/a (a statement of fact).
- **Trace.** This log; the handover note for Tomás when it exists.

---

## 4. Register of the candidate decisions C-1 … C-88

`reviews/review-arch-implementability.md` carries 87 candidate entries (C-8 was never issued) with the reasoning column left empty. This register keeps their text and points to the entry in this log that holds the reasoning. "review file only" means the decision is recorded there and no stated reason was asked.

| C-id | Decision as recorded | Entry |
|---|---|---|
| C-1 | Core operations are `evaluateRequest`, `previewFreeze`, `activateFreeze`; Annex A `reevaluateRunningJob` unused (decided by the human). | DL-4 |
| C-2 | Keep 9 invariants; record as finding (decided by the human). | review file only |
| C-3 | Add D-10 to AR §10, or close it by implementing the trigger now. | review file only |
| C-4 | Delivery-state design for the outbox (separate state table vs append-only status rows). | review file only |
| C-5 | Idempotency: per-actor scope, window length, hash column, drop or keep server-derived keys. | review file only |
| C-6 | Degraded freeze preview: build or drop. | review file only |
| C-7 | Skill used: `bmad-review-adversarial-general` stood in for the non-existent `/bmad-review`, scope narrowed by the brief. | review file only |
| C-9 | Stack Decisions block (TypeScript/Node, Express, PostgreSQL + SQLite with `pg`/`better-sqlite3`, Vitest + fast-check, Clock/IdGenerator ports). | review file only |
| C-10 | Project language: **TypeScript on Node.js** — decision taken by the human (G-25). | DL-9 |
| C-11 | D1 (G-19): a preview `503` keeps activation blocked; no degraded-activation path. | DL-3 |
| C-12 | D2 (G-06): `Idempotency-Key` required on `POST /policy/decisions`, unique per `(actor_id, key)`, body hash stored, 24 h window, no server-derived keys. | DL-10 |
| C-13 | D3 (G-05): delivery state in a new append-only `OUTBOX_DELIVERY`, one row per attempt. | review file only |
| C-14 | D4 (G-23): activate/lift use `role_tier ≥ INSTRUCTOR` with `LAB_OPERATOR` scope; `/health` and `/ready` unauthenticated. | review file only |
| C-15 | D5 (G-14): module owns and writes `DECISION`, `TRACE_ENTRY`, `CONSTRAINT`, `FACT_SNAPSHOT` append-only; full owned-table list. | review file only |
| C-16 | D6 (G-20): `200 {Decision}` embeds `trace[]` and the snapshot reference; 13 routes. | review file only |
| C-17 | D7 (G-22): optional `derived_from`; `submitted_by` HUMAN; server computes depth. | review file only |
| C-18 | D8 (G-12): `policy_version` = integer `published_seq`; hash separate. | review file only |
| C-19 | G-03: `obligation.ack.v1` direction IN, no V1 producer. | review file only |
| C-20 | R1: the five "proposed" items confirmed — single idempotency uniqueness home, append-only `OBLIGATION_OBSERVATION`, Decision Shell writes the four decision tables,… | review file only |
| C-21 | R2: `CHAINED` removed; `parent_kind` is `ROOT` or `DERIVED`. | DL-1 |
| C-22 | R3: `POLICY_DOCUMENT` loaded by the migration (12 seed rows); runtime read-only. | review file only |
| C-23 | R4: `published_seq` +1 per publish; a rolled-back publish consumes no number. | review file only |
| C-24 | K1: an `actor_ref` that differs from the session actor returns `200` with `DENY` / `INVALID_REQUEST` / `R-VALID-01`; the `403` is removed. | review file only |
| C-25 | K2: `WINDOW_STARTED` removed; a freeze with `starts_at` earlier than `campus_now` is allowed; `WINDOW_IN_PAST` only when `ends_at <= campus_now`. | DL-2 |
| C-26 | K3: expired key row refused with `409 IDEMPOTENCY_KEY_EXPIRED` (retryable N); rows never deleted; concurrent same-key call waits on the unique constraint. | DL-10 |
| C-27 | K4: `DECISION_OUTBOX` keyed by `outbox_id` (uuid7) with `event_type`, nullable `decision_id` and `failure_id`, exactly one non-null; `policy.decision.failed.v1`… | review file only |
| C-28 | K5: preview token valid while `now <= issued_at + 60 s`, expired when `now > issued_at + 60 s`. | review file only |
| C-29 | P2-PORTS-1 layer-mapping choices not decided by the human: (a) `decision/shell`, `outbox/writer`, `outbox/publisher` left outside the six PDF layers; (b)… | review file only |
| C-30 | L1: `decision/shell/`, `outbox/writer`, `outbox/publisher` keep the layer name "Inbound Port (use-case interface)" as implementations of `ports/in/`, with "DTOs, Core… | review file only |
| C-31 | L2: Rule Registry split into `policy/registry/` (Core Domain, types and hash) and `registry/publisher` (publish step). | review file only |
| C-32 | L3: composition root `app/bootstrap` wires adapters to ports, runs the boot validator, serves `/health` and `/ready`. | review file only |
| C-33 | L4: `ports/out/event_bus` with the in-memory `adapters/sim/event_bus`; NATS JetStream documentary only. | review file only |
| C-34 | L5: production `Clock` and `IdGenerator` adapters stay documentary only. | review file only |
| C-35 | L6: `ports/out/token_signer` with `adapters/sim/token_signer` reading the key from `PREVIEW_TOKEN_SIGNING_KEY`. | review file only |
| C-36 | L7: `created_at` and `updated_at` supplied through the `Clock` port; no wall-clock default in any table. | review file only |
| C-37 | L8: paths proposed in P2-PORTS-1 confirmed. | review file only |
| C-38 | Schema task will include a small append-only `audit_events` table for freeze lifecycle actions, and `updated_at` only on tables whose rows change. | review file only |
| C-39 | S1–S2: two migration files, one per engine (PostgreSQL 16 with `pg`, SQLite WAL with `better-sqlite3`), same table and column names; SQLite type mapping (TEXT… | review file only |
| C-40 | S3: `created_at` on every table; `updated_at` only on tables outside the M2-AD-8 no-UPDATE list; both supplied from the `Clock` port, no wall-clock default. | review file only |
| C-41 | S4: append-only `audit_events` table for freeze lifecycle actions; action list `FREEZE_DRAFT_CREATED`, `FREEZE_PREVIEW_COMPUTED`, `FREEZE_ACTIVATED`, `FREEZE_LIFTED`. | review file only |
| C-42 | S5: `POLICY_DOCUMENT` seeded by the migration with 12 rows. | review file only |
| C-43 | M1: `SUPPRESSED_RULE` and `DECISION_CITATION` join the M2-AD-8 no-UPDATE / no-DELETE group (12 tables with `audit_events`); their `updated_at` columns are removed;… | review file only |
| C-44 | M2: the four `audit_events` actions are confirmed: `FREEZE_DRAFT_CREATED`, `FREEZE_PREVIEW_COMPUTED`, `FREEZE_ACTIVATED`, `FREEZE_LIFTED`. | review file only |
| C-45 | M3: instants are ISO-8601 UTC with millisecond precision, `YYYY-MM-DDTHH:MM:SS.sssZ`. | review file only |
| C-46 | M4: `POLICY_DOCUMENT` seed with `content_hash` NULL for all 12 rows and the fixed value `1970-01-01T00:00:00.000Z` for `created_at` and `updated_at`. | review file only |
| C-47 | M5: `DECISION_OUTBOX.idempotency_key` is NULL when `failure_id` is set (check `failure_id IS NULL OR idempotency_key IS NULL`, both files). | review file only |
| C-48 | A1–A2: `dto.ts` only (TypeScript, primitive types, integers only, instants as `YYYY-MM-DDTHH:MM:SS.sssZ` strings); DTO names `EvaluateRequestDto`,… | review file only |
| C-49 | A3: 8 events from AR §5.2 only, envelope `eventId` (uuid7), `occurredAt`, `schemaVersion` (integer from 1), JSON Schema draft 2020-12 per event,… | review file only |
| C-50 | A4: OpenAPI 3.1, 13 operations on 12 path items, `security: []` on `/health` and `/ready`, error responses with the catalog statuses of contracts.md (24 of 37 codes… | review file only |
| C-51 | N1: `reason` is removed from `policy.freeze.activated.v1` and `lift_reason` from `policy.freeze.lifted.v1` (payloads, JSON Schemas, examples, AR §5.2 rows); the text… | review file only |
| C-52 | N2: `decision` gains `subject_id` (NOT NULL), `model_ref` (NOT NULL) and `node_class_id` (nullable) in both SQL files, with non-empty CHECKs; AR §4.1 `DECISION`… | review file only |
| C-53 | N3: the API exposes `runtime_snapshot` as `"AVAILABLE" / "UNAVAILABLE"`; storage stays boolean in `preview_run` (true = AVAILABLE). | review file only |
| C-54 | N4: the `error_code` value set of `policy.decision.failed.v1` (two members) and its idempotency key `failure_id` are confirmed. | review file only |
| C-55 | N5: `Idempotency-Key` is required on `POST /policy/decisions` and optional on `POST /policy/decisions/preview` (not journalled); AR §5.1 sentence corrected. | DL-10 |
| C-56 | P2-CROSSCHECK-1 F1: trigger `preview_run_consumed_once` in both SQL files; a `PREVIEW_RUN` with a non-null `consumed_at` accepts no UPDATE (second consumption and… | DL-12 |
| C-57 | P2-CROSSCHECK-1 F2: trigger `policy_version_seq_next` in both SQL files; a new `policy_version` row must carry `MAX(published_seq) + 1` (`PUBLISHED_SEQ_NOT_NEXT`). | DL-12 |
| C-58 | P2-CROSSCHECK-1 F3: the table name `freeze` is quoted as `"freeze"` in the PostgreSQL file (7 places) because FREEZE is a reserved PostgreSQL keyword; the name is… | DL-12 |
| C-59 | P2-CROSSCHECK-1 F4: `decision_single_deadline` also requires `valid_until IS NOT NULL` when `must_checkpoint_by` is non-null (both files). | DL-12 |
| C-60 | ADV-1 (proposed Accept): keep range and enum checks of `Request` out of the wire schema so `R-VALID-01` journals them, and decide whether the N2 non-empty CHECKs on… | DL-8 |
| C-61 | ADV-2 and ADV-3 (proposed Accept): how a `Decision` records absent facts (unknown actor, failed port) and a failed Clock port (nullable columns or a stated sentinel;… | DL-5 |
| C-62 | ADV-4 (proposed Accept): freeze and version events leave through a transactional outbox (extend the `decision_outbox` event type set), or the dual write is accepted… | DL-6 |
| C-63 | ADV-5 (proposed Accept): `first_attempt_at` and `journal_lag` leave `decision_outbox` (append-only) for `outbox_delivery`, or the table leaves the no-UPDATE group. | DL-13 |
| C-64 | ADV-6, ADV-7 and EDG-5 (proposed Accept): the active freeze scope key (expired `ACTIVE` rows, sorted and de-duplicated arrays, overlapping scopes, non-empty arrays… | DL-13 |
| C-65 | ADV-8, ADV-9 and ADV-28 (proposed Accept): activation locates the `PREVIEW_RUN` through the verified token; `computed_at` versus `issued_at`; the reachability of… | DL-13 |
| C-66 | ADV-11, ADV-12 and ADV-13 (proposed Accept): contracts.md activateFreeze Q3 and Q4 follow ruling N1 and the response body the route returns; the contracts state which… | DL-13 |
| C-67 | ADV-17 (proposed Accept): `node_class` of `policy.decision.v1` becomes nullable or leaves `required`. | DL-13 |
| C-68 | ADV-20 (proposed Accept): a contract for `liftFreeze` and a code for lifting a freeze that is not `ACTIVE` (name `FREEZE_NOT_LIFTABLE`, status 409, both PROPOSED). | DL-13 |
| C-69 | ADV-26 (proposed Accept): `decision_constraint.value.kind` equals the `kind` column (candidate check). | DL-13 |
| C-70 | EDG-14 (proposed Accept): the input of `request_hash` (canonical form, fields, `derived_from`). | DL-13 |
| C-71 | EDG-17 (proposed Accept): impossible instants on the wire map to `WIRE_SHAPE_INVALID` before any insert. | DL-13 |
| C-72 | Part A of the review: Trade-off entry texts for M2-AD-3 (`evaluated_at = FACT_SNAPSHOT.campus_now` kept in the constructor) and M2-AD-5 (write grants only in the… | DL-13 |
| C-73 | P2-TRIAGE-FIX-1 D1 (ADV-2): `fact_snapshot.actor_kind`, `role_tier`, `model_facts`, `quota_facts` are nullable; a NULL only when the fact does not exist (causes… | DL-5 |
| C-74 | D2 (ADV-3): a Clock read with no instant writes no Decision, event or outbox row; HTTP 503 `DECISION_NOT_PRODUCED` and an alarm; P9 narrowed to a reading that exists… | DL-15 |
| C-75 | D3 (ADV-4): the outbox covers the freeze and version events (same transaction); key columns `draft_id`, `freeze_id`, `published_seq`; `decision_outbox_exactly_one_id`… | DL-6 |
| C-76 | D4 (ADV-5): `first_attempt_at` and `journal_lag` leave `decision_outbox`; the lag is a computed query. | DL-13 |
| C-77 | D5 (ADV-6): a stored `EXPIRED` value of `freeze.state`, written only by the closing step of `activateFreeze` before the insert; no event; read paths still compute… | DL-7 |
| C-78 | D6 (ADV-7, EDG-4, EDG-5): arrays written sorted without duplicates (the writer's duty, unique index unchanged); CHECKs that a `SUBJECT` or `NODE_CLASS` freeze has at… | DL-13 |
| C-79 | D7 (ADV-8, ADV-9, ADV-28): the token carries `preview_run_id`; HMAC over `draft_id ‖ content_hash ‖ actor_id ‖ issued_at`; check order signature, actor, expiry,… | DL-13 |
| C-80 | D8 (ADV-20): new code `FREEZE_NOT_LIFTABLE`, 409; the catalog goes from 37 to 38 codes. | DL-13 |
| C-81 | D9 (ADV-1): `EvaluateRequestDto` validates types only on the wire; the core decides ranges; the N2 non-empty CHECKs stay. | DL-8 |
| C-82 | D10 (ADV-17): `policy.decision.v1` `node_class` accepts `null`. | DL-13 |
| C-83 | D11 (ADV-26): CHECK that `value.kind` equals the column `kind` in `decision_constraint`. | DL-13 |
| C-84 | D12 (EDG-14): `request_hash` is the SHA-256 of the canonical JSON of nine named fields; `request_id` and `request_chain_id` excluded. | DL-13 |
| C-85 | D13 (AD3.d): insert trigger `decision_evaluated_at_matches_snapshot` in both SQL files; the binding-table row AD-3 and Part A now show a physical pointer. | DL-14 |
| C-86 | D14 (AD5.c, aF.I5): the PostgreSQL-only grants limit is written into the M2-AD-5 Trade-off text. | DL-13 |
| C-87 | D15 (pF.I1, pF.I2, pF.I4): three RED tests are named: `ad9-no-row-no-token.test.ts`, `ad9-token-actor.test.ts`, `ad9-preview-writes-nothing.test.ts`. | DL-13 |
| C-88 | D16 (ADV-11, ADV-12, ADV-13, EDG-17): Q4 and Q3 of `activateFreeze` follow the response and ruling N1; Q2 of the freeze operations names the `audit_events` row in the… | DL-13 |

---

## Appendix A — evidence of the owner's direction

Questions were put to Juan with fixed options; the answer chosen is the stated reason used above. Session of 2026-10-19 (Colombia time).

| Entry | Question (short) | Option chosen |
|---|---|---|
| DL-1 | main reason to remove `CHAINED` | "Nobody defined it" |
| DL-2 | why allow a freeze whose `starts_at` is past | "The browser clock" |
| DL-3 | why no degraded activation path | "Security" |
| DL-4 | why not use `reevaluateRunningJob` | "The PRD rules" |
| DL-5 | why `NULL` and not a sentinel | "Do not invent data" |
| DL-6 | why not accept the dual write | "Coherence with M2-AD-8" |
| DL-7 | why not mark `LIFTED` | "Honest states" |
| DL-8 | why not reject ranges on the wire | "The PRD asks for a visible DENY" |
| DL-9 | main reason for TypeScript | "Types that travel" |
| DL-11 | how decisions were made | "Ask for the explanation and verify" |
| DL-16 | how to record authorship | "Juan led 0–2" |

Triage decisions TF-1 to TF-16 (Accept/Defer per finding) were chosen from option lists in the same session, with the recommended option marked; the choices are in `reviews/review-detailed-design.md` (Triage record).

---

## 5. Phases 3–4 · test design, acceptance tests, epics and sprint planning

**Recorded:** 2026-10-20 (Colombia time) · **Decided by:** Tomás Quintero (Test Lead in Phase 3, lead of Phase 4) · **Reviewer:** Juan Esteban Ruiz Ome
**How the decisions were taken.** Tomás read each entry below and confirmed it; the confirmation was passed to Juan on 2026-10-20. The proposal in each entry is what the AI produced during the work (the TEA test-design, ATDD, framework, CI and trace personas and the PM / sprint-planning skill); the rationale is the argument recorded in the Phases 3–4 package (`reviews/phase-3-4-findings.md`, `reviews/review-test-quality.md`, `planning/phase-4-gate-report.md`). Where Tomás wants the rationale in his own words, he edits his entry here.
**Distribution.** 8 entries (`DL-17`…`DL-24`): 5 rejections of an AI proposal (DL-17, DL-18, DL-20, DL-22, DL-23) and 3 modifications (DL-19, DL-21, DL-24). None of them is an unmodified acceptance.
**Fields required by the course template** appear in the first line of each entry: Phase | Persona / Skill | Prompt summary | Decision | Artifact changed | Decided by.

### DL-17 — approving the Annex A request literally at 21:58
- **Phase 3 | TEA test-design | "Cover the Annex A mandatory case without breaking the PRD" | REJECTED | `test/atdd/m2_domain.test.ts`, `reviews/phase-3-4-findings.md` | Tomás Quintero.**
- **Proposal.** Write a test that treats the 21:58 request as inside the night window and approves it.
- **Status.** REJECTED.
- **Rationale.** PRD FR-5 opens the night window at 22:00, so a request at 21:58 is outside it; approving it would invent an ALLOW the PRD does not support.
- **What was kept.** A test that expects DENY at 21:58 (`EDGE-2158`) and an equivalent night case from 22:00 whose admission is bounded at 05:55 (`EDGE-NIGHT`).
- **Falsifier.** The course confirms that the Annex A case must be admitted at 21:58, or the PRD window is amended.
- **Trace.** Finding G-01; Juan's ruling on G-01 in the Phase 5 section of this log (equivalence accepted on 2026-10-20).

### DL-18 — simulating the M9 termination as if M2 performed it
- **Phase 3 | TEA ATDD | "Demonstrate the class case end to end" | REJECTED | `test/atdd/`, `planning/epics.md` story 2.1 | Tomás Quintero.**
- **Proposal.** A test in which the policy engine ends a running job when the class starts.
- **Status.** REJECTED.
- **Rationale.** M2 delegates enforcement: it emits the deadline constraint (`HARD_DEADLINE`, `enforced_by: M9`) and does not end processes. A test that shows M2 ending a job would assert behaviour M2 must not have.
- **What was kept.** A deadline constraint plus a DENY at 10:00, with both decisions persisted in the journal and the outbox (`EDGE-1000`, `EDGE-FINAL`). The M9 observation stays an integration test for later.
- **Falsifier.** An architecture decision that gives M2 the termination duty.
- **Trace.** Finding G-05; `test/atdd/m2_contracts.test.ts` `EDGE-FINAL`.

### DL-19 — a native database driver for the test fixture
- **Phase 3 | TEA framework | "An ephemeral, reproducible database for the tests" | MODIFIED | `test/fixtures/index.ts` | Tomás Quintero.**
- **Proposal.** Use a native driver for the fixture database.
- **Status.** MODIFIED.
- **Rationale.** The fixture uses `node:sqlite` in memory and only in tests; production keeps the driver decided in DL-9 and the SQL file is loaded unchanged. The clock and the telemetry are injected.
- **What was kept.** The shipped SQL migration as the schema of every test database.
- **Falsifier.** A difference in behaviour between `node:sqlite` and `better-sqlite3` that makes a test pass on one and fail on the other.
- **Trace.** `test/fixtures/index.ts`; `reviews/review-test-quality.md` (note on the fixture driver).

### DL-20 — accepting any non-zero exit as a valid red state
- **Phase 3 | TEA CI | "Accept only the expected red tests" | REJECTED | `test/ci/verify-red.mjs` | Tomás Quintero.**
- **Proposal.** Treat any failing run as proof that the tests are red.
- **Status.** REJECTED.
- **Rationale.** A broken import or a typo also exits non-zero and proves nothing about the contract. Each test has to fail with `NotImplementedError`, with no skips and no passing tests.
- **What was kept.** `verify-red` checks every failure message, the exit code and the test count.
- **Falsifier.** A test that fails for the wrong reason and still passes `verify-red`.
- **Trace.** `test/ci/verify-red.mjs`; `test/evidence/red-verification.txt`.

### DL-21 — one boundary rule for both ends of a window
- **Phase 3 | TEA trace | "Cover the NFR-4 boundary" | MODIFIED | `test/atdd/m2_domain.test.ts`, `reviews/phase-3-4-findings.md` | Tomás Quintero.**
- **Proposal.** Use `t < b` at both the start and the end of a window.
- **Status.** MODIFIED.
- **Rationale.** FR-4 includes the start and NFR-4 does not. The tests follow FR-4 (start `s <= t`, end `t < e`), report the contradiction, and leave the protected PRD unedited.
- **What was kept.** `DM-START` and `DM-BOUND`.
- **Falsifier.** A ruling that NFR-4 governs.
- **Trace.** Finding G-02; Juan's ruling on G-02 (FR-4 followed).

### DL-22 — slicing the backlog by technical layer
- **Phase 4 | PM / sprint-planning | "Create an implementable backlog" | REJECTED | `planning/epics.md` | Tomás Quintero.**
- **Proposal.** Epics for the database, the domain and the API.
- **Status.** REJECTED.
- **Rationale.** A layer is not something Elena or Rebecca can see. The backlog is cut by outcomes for the two personas: 4 epics, 12 stories, earlier dependencies only, measurable definition of done.
- **What was kept.** Dependencies listed per story and the binding invariants (M2-AD-n) named in each.
- **Falsifier.** A story that no persona can observe or that needs a later story.
- **Trace.** `planning/epics.md`; `test/story-index.json`.

### DL-23 — declaring a global PASS from the local validator
- **Phase 4 | sprint-planning | "Certify the delivery" | REJECTED | `planning/phase-4-gate-report.md`, `implementation-artifacts/sprint-status.yaml` | Tomás Quintero.**
- **Proposal.** Report the readiness gate as passed because the local script passed.
- **Status.** REJECTED.
- **Rationale.** The script checks structure only (counts, links, hashes, language delta). It does not check meaning, inherited findings or production behaviour. The sprint file stays a draft in backlog and the global state is "not certified" until the human review in Phase 5.
- **What was kept.** The structural gate and its drill (a link removed, the gate fails, the link restored, the gate passes).
- **Falsifier.** A defect that the local gate accepts and a semantic audit catches.
- **Trace.** `planning/phase-4-gate-report.md`; `test/evidence/gate-drill.json`.

### DL-24 — cleaning every existing source for FR-15
- **Phase 3–4 | CI doc-lint | "Respect FR-15 and the protected files" | MODIFIED | `test/ci/readiness.mjs`, `test/evidence/doc-lint-baseline.json` | Tomás Quintero.**
- **Proposal.** Rewrite all existing files so that none contains a banned term.
- **Status.** MODIFIED.
- **Rationale.** Rewriting would edit protected sources and quotations of the PRD. The lint compares against a baseline, requires zero new matches in the new artifacts, and lists the existing matches as inventory.
- **What was kept.** A baseline, an inventory of the existing matches and the zero-new-matches rule.
- **Falsifier.** A new banned term that enters through a file the delta lint does not read.
- **Trace.** Finding G-10; Juan's ruling on G-10 (delta plus documented exception).

---

## 6. Phase 5 rulings

**Recorded:** 2026-10-20 (Colombia time) · **Decided by:** Juan Esteban Ruiz Ome (Architect and Reviewer), by selecting one option from a list for each question.
**How the decisions were taken.** The AI put 14 questions to Juan (G-01 … G-10 from `reviews/phase-3-4-findings.md`, T-1 … T-4 from the test-quality review). The AI wrote the option texts; Juan selected one for each. Each entry states the proposal, the option selected and where the effect lives. No motive beyond the selected option is recorded. The questions and options are in Appendix B.
**Distribution.** 14 entries (`DL-25`…`DL-38`): 10 ACCEPTED, 2 MODIFIED (DL-26, DL-34) and 2 ACCEPTED as deferred (DL-32, DL-38; the format of section 0.1 has no `DEFERRED` status). DL-25 … DL-34 are G-01 … G-10 in order; DL-35 … DL-38 are T-1 … T-4.
**Fields required by the course template** appear in the first line of each entry: Phase | Persona / Skill | Prompt summary | Decision | Artifact changed | Decided by.

### DL-25 — the Annex A request at 21:58 and the night window that opens at 22:00 (G-01)
- **Phase 5 | Orchestrator review of the Phases 3–4 package | "The Annex A request at 21:58 versus the night window that opens at 22:00" | ACCEPTED | `planning/ARCHITECTURE.md` §15.2, `ai-log/decision-log-solu2.md` | Juan Esteban Ruiz Ome (option selected on 2026-10-20).**
- **Proposal.** Treat the 21:58 case of Annex A and a night case from 22:00 as equivalent evidence (`reviews/phase-3-4-findings.md` line 8).
- **Status.** ACCEPTED.
- **Rationale.** Option selected: accept the equivalence; DENY at 21:58 and an equivalent night case from 22:00 with a 05:55 limit; documented in ARCHITECTURE v2 and the decision log; PRD untouched. Evidence: `prd.md` line 261 defines `NIGHT_WINDOW` as `[22:00, 06:00)`, and line 429 (FR-5) enforces it for human actors.
- **What was kept.** The PRD is unchanged. `EDGE-2158` (DENY at 21:58), `EDGE-NIGHT` (bound 05:55), `EDGE-1000` and `EDGE-FINAL` stay as they are. This follows DL-17.
- **Falsifier.** The course confirms that the Annex A case must be admitted at 21:58, or the PRD window is amended.
- **Trace.** `ARCHITECTURE.md` §15.2 (G-01); `test/atdd/m2_domain.test.ts` and `test/atdd/m2_contracts.test.ts`; DL-17.

### DL-26 — NFR-4 against FR-4 at a window start (G-02)
- **Phase 5 | Orchestrator review of the Phases 3–4 package | "NFR-4 says `t<b` also at a window start; FR-4 includes the start" | MODIFIED | `planning/ARCHITECTURE.md` §15.4 | Juan Esteban Ruiz Ome (option selected on 2026-10-20).**
- **Proposal.** Resolve the contradiction before the global gate (`reviews/phase-3-4-findings.md` line 9).
- **Status.** MODIFIED. The text of NFR-4 is not applied; FR-4 is.
- **Rationale.** Option selected: follow FR-4 (start included, end excluded); NFR-4 recorded as an erratum; `DM-START` and `DM-BOUND` already cover it. Evidence: `prd.md` line 428 (FR-4) states "`campus_now ∈ [w.starts_at, w.ends_at)`" and half-open containment; line 453 (NFR-4) states `contains(window, t)` is `true` iff `t < b` for both a start and an end boundary.
- **What was kept.** The PRD is not edited. The tests use start included (`s <= t`) and end excluded (`t < e`).
- **Falsifier.** A grader applies NFR-4 literally at a start boundary, or `DM-START` / `DM-BOUND` fail at delta 0 against an implementation.
- **Trace.** `ARCHITECTURE.md` §15.4; `DM-START`, `DM-BOUND` in `test/atdd/m2_domain.test.ts`.

### DL-27 — 21 rules in the PRD text, 19 in the registry (G-03)
- **Phase 5 | Orchestrator review of the Phases 3–4 package | "PRD says 21 rules; §6.2 registers 19" | ACCEPTED | `planning/ARCHITECTURE.md` §15.4 | Juan Esteban Ruiz Ome (option selected on 2026-10-20).**
- **Proposal.** Fix the denominator of the NFR report (`reviews/phase-3-4-findings.md` line 10).
- **Status.** ACCEPTED.
- **Rationale.** Option selected: use 19 and declare it; no rule invented. Evidence: `prd.md` lines 425 (FR-1) and 455 (NFR-6) say "21-rule matrix", line 77 says "21 `R-*` rules"; line 284 says "walk the 19 rules" and the table of §6.2 from line 311 lists 19 ids (`R-VALID-01`, `R-DEP-01`, and 17 numbered rules).
- **What was kept.** The 19 existing ids. Two more rules are not identified anywhere in the files.
- **Falsifier.** The course or the PRD owner names the two missing rules.
- **Trace.** `ARCHITECTURE.md` §15.4.

### DL-28 — a transaction boundary for `activateFreeze` (G-04)
- **Phase 5 | Orchestrator review of the Phases 3–4 package | "No transaction boundary (Unit of Work) or failure injection point for `activateFreeze` rollback" | ACCEPTED | `planning/ARCHITECTURE.md` §15.3 | Juan Esteban Ruiz Ome (option selected on 2026-10-20).**
- **Proposal.** Define the boundary before story 3.3 (`reviews/phase-3-4-findings.md` line 11).
- **Status.** ACCEPTED.
- **Rationale.** Option selected: a `UnitOfWork` port with a test-only failure hook; `TRANSACTION_ABORTED` stays an internal test error, not an HTTP code. Evidence: `contracts.md` activateFreeze Q2 (line 107) requires one transaction in which "either all writes commit or none does"; the catalog stays at 38 codes (`contracts.md` line 210).
- **What was kept.** The hook `after-freeze-insert` lives in the test harness only (`test/fixtures/index.ts`, `fault`). `ports-and-adapters.md` is not edited in this task.
- **Falsifier.** `AC-ROLLBACK` passes against an implementation that writes outside the unit of work, or `TRANSACTION_ABORTED` appears in an HTTP response.
- **Trace.** `ARCHITECTURE.md` §15.3; `AC-ROLLBACK`; closes the receiving condition of EDG-18 (story 3.3).

### DL-29 — the obligation toward M9 (G-05)
- **Phase 5 | Orchestrator review of the Phases 3–4 package | "No event name, correlation, timeout or owner for the M9 obligation" | ACCEPTED (as an assumption) | `planning/ARCHITECTURE.md` §15.2 | Juan Esteban Ruiz Ome (option selected on 2026-10-20).**
- **Proposal.** Define shape, correlation, timeout and owner of the M9 obligation (`reviews/phase-3-4-findings.md` line 12).
- **Status.** ACCEPTED as an integration assumption, not as a design.
- **Rationale.** Option selected: declared as an integration assumption; M2 emits the constraint and the decision event; observation and termination belong to M9; no end-to-end claim. Evidence: `contracts.md` §6 point 11 states the obligation has no event name or port method.
- **What was kept.** The tests check `HARD_DEADLINE` with `enforced_by: M9` and the decision outbox. No test simulates a termination.
- **Falsifier.** The M9 owner states a different shape or owner, or an M2 test claims that a job was terminated.
- **Trace.** `ARCHITECTURE.md` §15.2; `contracts.md` §6 point 11; `EDGE-NIGHT`, `EDGE-FINAL`.

### DL-30 — UX routes against the 13 API routes (G-06)
- **Phase 5 | Orchestrator review of the Phases 3–4 package | "UX routes (journal, publish, student freeze read) differ from the 13 API routes" | ACCEPTED | `planning/ARCHITECTURE.md` §15.5 | Juan Esteban Ruiz Ome (option selected on 2026-10-20).**
- **Proposal.** Triage the differences before any UX change (`reviews/phase-3-4-findings.md` line 13).
- **Status.** ACCEPTED.
- **Rationale.** Option selected: record the gap without touching `ux/`. Evidence: `planning/ux-state-contract-map.md` marks the mapping partial and lists journal/trace and publish states without a DTO.
- **What was kept.** Nothing under `ux/` changes. Seven rows are recorded in §15.5, all `open`.
- **Falsifier.** A UX file is edited without a recorded triage, or a UX state is found that neither the map nor §15.5 lists.
- **Trace.** `ARCHITECTURE.md` §15.5; `planning/ux-state-contract-map.md`.

### DL-31 — the provisional test seam (G-07)
- **Phase 5 | Orchestrator review of the Phases 3–4 package | "Tests use a provisional seam (Harness, Facts) and `policy/core` imports the stub error" | ACCEPTED | `planning/ARCHITECTURE.md` §15.8 | Juan Esteban Ruiz Ome (option selected on 2026-10-20).**
- **Proposal.** Mark the seam provisional (`reviews/phase-3-4-findings.md` line 14).
- **Status.** ACCEPTED.
- **Rationale.** Option selected: mark it provisional and fix the target: shared types move to a domain module with no infrastructure imports before production code. Evidence: `policy/core/index.ts` line 2 imports `NotImplementedError` from `ports/in/policy.js`, and line 3 reads "Temporary test seam only. Replace with domain-only DTO imports before implementation (G-07)."
- **What was kept.** The final ports stay those of `ports-and-adapters.md`.
- **Falsifier.** Production code is written while `policy/core` still imports from `ports/in`.
- **Trace.** `ARCHITECTURE.md` §15.8; `policy/core/index.ts`.

### DL-32 — the 18 deferred findings (G-08)
- **Phase 5 | Orchestrator review of the Phases 3–4 package | "18 deferred findings from Phase 2" | ACCEPTED (deferred) | `planning/ARCHITECTURE.md` §15.6 | Juan Esteban Ruiz Ome (option selected on 2026-10-20).**
- **Proposal.** Keep the inherited deferrals with an explicit inventory (`reviews/phase-3-4-findings.md` lines 23–40).
- **Status.** ACCEPTED as deferred. No finding is claimed as fixed.
- **Rationale.** Option selected: keep all deferred, each with its receiving story and a closing condition. Evidence: the inventory of 18 rows in `reviews/phase-3-4-findings.md`.
- **What was kept.** Receiving stories exactly as in the inventory. Five closing conditions are marked "not verified" in §15.6 because the finding text gives none.
- **Falsifier.** A story closes without its closing condition, or a deferred finding is reported fixed without a test.
- **Trace.** `ARCHITECTURE.md` §15.6.

### DL-33 — the unreadable clock (G-09)
- **Phase 5 | Orchestrator review of the Phases 3–4 package | "`Clock` unreadable: carve-out of `DECISION_NOT_PRODUCED` marked PROPOSED" | ACCEPTED | `planning/detailed-design/contracts.md` lines 41 and 147 | Juan Esteban Ruiz Ome (option selected on 2026-10-20).**
- **Proposal.** Confirm or reject the carve-out marked `PROPOSED` (`reviews/phase-3-4-findings.md` line 15). This entry supersedes the status of DL-15.
- **Status.** ACCEPTED. DL-15 (marked "open, to confirm") is superseded; it is not edited.
- **Rationale.** Option selected: confirm it: `503 DECISION_NOT_PRODUCED`, no outbox row, operational alarm; remove `PROPOSED`. Evidence: the carve-out is stated at `contracts.md` line 41 (Q-fail) and line 147 (catalog row).
- **What was kept.** The code is reused; the catalog stays at 38 codes. `ARCHITECTURE.md` §14 TF-2 keeps its original wording; §15.2 records that this ruling supersedes it.
- **Falsifier.** A test or a reader needs the carve-out as its own error code.
- **Trace.** `contracts.md` lines 41 and 147; `ARCHITECTURE.md` §15.2; DL-15.

### DL-34 — FR-15 on files that are not ours (G-10)
- **Phase 5 | Orchestrator review of the Phases 3–4 package | "FR-15 banned terms: about 124 matches in files that are not ours" | MODIFIED | `test/ci/readiness.mjs`, `test/evidence/doc-lint-baseline.json` (unchanged here) | Juan Esteban Ruiz Ome (option selected on 2026-10-20).**
- **Proposal.** Lint the delta against the baseline and inventory the debt (`reviews/phase-3-4-findings.md` line 17).
- **Status.** MODIFIED. The literal global rule is not applied.
- **Rationale.** Option selected: delta against baseline plus a documented exception; no protected source rewritten. Evidence: `prd.md` itself lists the banned terms, and existing sources contain matches (finding G-10).
- **What was kept.** New artifacts must have zero new matches; the exception covers Plan-2 files and the PRD.
- **Falsifier.** A new banned term enters through a file the delta lint does not read.
- **Trace.** `ARCHITECTURE.md` §15.2 (G-10); `reviews/phase-3-4-findings.md`; DL-24.

### DL-35 — tests for M2-AD-9 that did not exist (T-1)
- **Phase 5 | Orchestrator review of the Phases 3–4 package | "Tests named in contracts §4 for AD-9 do not exist" | ACCEPTED | `test/atdd/m2_contracts.test.ts`, `test/fixtures/index.ts` | Juan Esteban Ruiz Ome (option selected on 2026-10-20).**
- **Proposal.** Add red tests for AD-9.
- **Status.** ACCEPTED and applied in P3-FIX-1.
- **Rationale.** Option selected: accept; three red tests are added. Evidence: `contracts.md` §3 rows `TOKEN_ABSENT` (line 159) and `TOKEN_ACTOR_MISMATCH` (line 161).
- **What was kept.** `AC-TOKEN-FORGED` and `AC-NO-PREVIEW-ROW` expect `TOKEN_ABSENT`; `AC-TOKEN-ACTOR` expects `TOKEN_ACTOR_MISMATCH`. Each still fails with `NotImplementedError`.
- **Falsifier.** One of the three passes against an implementation that does not verify the signature, the row or the actor.
- **Trace.** `test/atdd/m2_contracts.test.ts`; `test/traceability-matrix.md` (M2-AD-9 row); `test/story-index.json` (story 3.3); `ARCHITECTURE.md` §15.5.

### DL-36 — weak assertions (T-2)
- **Phase 5 | Orchestrator review of the Phases 3–4 package | "Weak assertions in `PV-Q1`, `DM-BOUND`, `DM-START`, `EV-PII`" | ACCEPTED | `test/atdd/m2_contracts.test.ts`, `test/atdd/m2_domain.test.ts` | Juan Esteban Ruiz Ome (option selected on 2026-10-20).**
- **Proposal.** Strengthen the assertions.
- **Status.** ACCEPTED and applied in P3-FIX-1, except `denied_count` of `PV-Q1`, which stays open.
- **Rationale.** Option selected: strengthen all three. Evidence: `contracts.md` previewFreeze Q4 states that the rule ids behind `denied_count` are "not stated in `AR` §5.1: not verified", so the contract does not fix its value.
- **What was kept.** `PV-Q1` asserts an integer ≥ 0 and equality with the `preview_run` row; `DM-BOUND` and `DM-START` assert the full DENY inside the window and the absence of `WINDOW_PROTECTED` / `R-LAB-01` outside; `EV-PII` asserts that `identity` was read.
- **Falsifier.** The contract fixes `denied_count` and `PV-Q1` still does not assert it.
- **Trace.** `reviews/review-test-quality.md` (Reviewer section).

### DL-37 — test formatting (T-3)
- **Phase 5 | Orchestrator review of the Phases 3–4 package | "Test lines over 400 characters" | ACCEPTED | `test/atdd/*.ts`, `test/fixtures/index.ts`, `test/harness/fixtures.test.ts` | Juan Esteban Ruiz Ome (option selected on 2026-10-20).**
- **Proposal.** Format the tests.
- **Status.** ACCEPTED and applied in P3-FIX-1.
- **Rationale.** Option selected: format with Prettier. Prettier is not added to `package.json`; it runs through `npx`.
- **What was kept.** Test titles and ids are unchanged; the sorted list of titles before and after differs only by the three new tests.
- **Falsifier.** A test title or id differs after formatting, or `npm run check` stops reporting the active red tests.
- **Trace.** `reviews/review-test-quality.md` (Reviewer section).

### DL-38 — concurrency on one in-memory connection (T-4)
- **Phase 5 | Orchestrator review of the Phases 3–4 package | "Concurrency tests on one in-memory connection" | ACCEPTED (deferred) | `reviews/review-test-quality.md` | Juan Esteban Ruiz Ome (option selected on 2026-10-20).**
- **Proposal.** Repeat the concurrency tests on separate connections.
- **Status.** ACCEPTED as deferred. Nothing changes now.
- **Rationale.** Option selected: defer with a closing condition: repeat with separate connections and PostgreSQL in stories 1.3 and 3.3. The tests `EV-I1` and `AC-I1` run on one in-memory `node:sqlite` connection.
- **What was kept.** The current tests stay; their limit is stated in the Reviewer section of `reviews/review-test-quality.md`.
- **Falsifier.** Story 1.3 or 3.3 closes with concurrency tests that still use one connection.
- **Trace.** `reviews/review-test-quality.md`; `test/story-index.json` stories 1.3 and 3.3.

---

## Appendix B — questions and options of 2026-10-20

The option texts were written by the AI; the person selected one. No motive beyond the selected option is recorded.

| Id | Question (short) | Option chosen |
|---|---|---|
| G-01 | The Annex A request at 21:58 versus the night window that opens at 22:00 (PRD FR-5) | Accept the equivalence: DENY at 21:58 and an equivalent night case from 22:00 with a 05:55 limit; documented in ARCHITECTURE v2 and the decision log; PRD untouched |
| G-02 | NFR-4 says `t<b` also at a window start; FR-4 includes the start | Follow FR-4 (start included, end excluded); NFR-4 recorded as erratum; `DM-START` and `DM-BOUND` already cover it |
| G-03 | PRD says 21 rules; §6.2 registers 19 | Use 19 and declare it; no rule invented |
| G-04 | No transaction boundary (Unit of Work) or failure injection point for `activateFreeze` rollback | A `UnitOfWork` port with a test-only failure hook; `TRANSACTION_ABORTED` stays an internal test error, not an HTTP code |
| G-05 | No event name, correlation, timeout or owner for the M9 obligation | Declared as an integration assumption; M2 emits the constraint and the decision event; observation and termination belong to M9; no end-to-end claim |
| G-06 | UX routes (journal, publish, student freeze read) differ from the 13 API routes | Record the gap without touching `ux/` |
| G-07 | Tests use a provisional seam (Harness, Facts) and `policy/core` imports the stub error | Mark it provisional and fix the target: shared types move to a domain module with no infrastructure imports before production code |
| G-08 | 18 deferred findings from Phase 2 | Keep all deferred, each with its receiving story and a closing condition |
| G-09 | `Clock` unreadable: carve-out of `DECISION_NOT_PRODUCED` marked PROPOSED | Confirm it: `503 DECISION_NOT_PRODUCED`, no outbox row, operational alarm; remove PROPOSED |
| G-10 | FR-15 banned terms: about 124 matches in files that are not ours | Delta against baseline plus a documented exception; no protected source rewritten |
| T-1 | Tests named in contracts §4 for AD-9 do not exist | Accept: Tomás adds 3 red tests (done in P3-FIX-1) |
| T-2 | Weak assertions in `PV-Q1`, `DM-BOUND`, `DM-START`, `EV-PII` | Accept: strengthen all three (done; `denied_count` of `PV-Q1` stays open) |
| T-3 | Test lines over 400 characters | Accept: format with Prettier (done) |
| T-4 | Concurrency tests on one in-memory connection | Defer with a closing condition: repeat with separate connections and PostgreSQL in stories 1.3 and 3.3 |

---

## Appendix C — the 76 entries in the course template

Columns follow Annex B of the Solu-2 statement. Each cell is taken from the entry itself or from the task file named in it; `not recorded in the entry` and `not recorded` mark fields the log does not hold. "Human decision" maps `ACCEPTED` → ACCEPT, `MODIFIED` → MODIFY, `REJECTED` → REJECT.

| Entry | Phase | Persona / Skill | Prompt (summary) | AI output (summary) | Human decision | Reason (summary) | Artifact changed | Decided by |
|---|---|---|---|---|---|---|---|---|
| DL-1 | 1 | not recorded in the entry | `prompts/backup/NEXT.P1-CONTRACTS-1.md`: close Phase 1 rulings, write contracts | `parent_kind` listed `CHAINED` with no definition or creation path | REJECT | Nobody defined it; two values (`ROOT`, `DERIVED`) are enough | `ARCHITECTURE.md` §4.1, §5.1 | Juan Esteban Ruiz Ome |
| DL-2 | 1 | not recorded in the entry | `prompts/backup/NEXT.P1-RULINGS-1.md`: apply five contract rulings K1–K5 | `activateFreeze` refused a freeze whose `starts_at` is past (`WINDOW_STARTED`) | REJECT | The browser clock: a freeze starting now arrives with a past `starts_at` by race | `contracts.md` §3; `ARCHITECTURE.md` §14 K2 | Juan Esteban Ruiz Ome |
| DL-3 | 1 | not recorded in the entry | `prompts/backup/NEXT.P1-ARCH-AMEND.md`: apply Phase 1 gap rulings | The UX offers a degraded activation when the preview failed | REJECT | Security: a path that skips the preview defeats M2-AD-9 | `ARCHITECTURE.md` §5.1, §14 D1 | Juan Esteban Ruiz Ome |
| DL-4 | 2 | not recorded in the entry | not recorded | Annex A lists `reevaluateRunningJob` among the module operations | REJECT | The PRD rules; Annex A operations are starting points | `contracts.md` §2 | Juan Esteban Ruiz Ome |
| DL-5 | 2 | not recorded in the entry | `prompts/backup/NEXT.P2-TRIAGE-FIX-1.md`: apply triage of the detailed-design review | Store a fixed `UNKNOWN` for facts that do not exist | REJECT | Do not invent data; `NULL` says the fact does not exist | `ARCHITECTURE.md` §4.1, §14 TF-1; both SQL files | Juan Esteban Ruiz Ome |
| DL-6 | 2 | not recorded in the entry | `prompts/backup/NEXT.P2-TRIAGE-FIX-1.md`: apply triage of the detailed-design review | Publish freeze and version events after commit, outside the outbox | REJECT | Coherence with M2-AD-8: one delivery regime for events | `ARCHITECTURE.md` §4.1, §5.2, §14 TF-3; SQL; `events.md` | Juan Esteban Ruiz Ome |
| DL-7 | 2 | not recorded in the entry | `prompts/backup/NEXT.P2-TRIAGE-FIX-1.md`: apply triage of the detailed-design review | Mark an expired freeze `LIFTED` to free its scope key | REJECT | Honest states: expired and lifted are different facts | `ARCHITECTURE.md` §4.1, §14 TF-5; SQL | Juan Esteban Ruiz Ome |
| DL-8 | 2 | not recorded in the entry | `prompts/backup/NEXT.P2-TRIAGE-FIX-1.md`: apply triage of the detailed-design review | Keep range checks on the wire so out-of-range values return `400` | REJECT | The PRD asks for a visible `DENY` journalled for the student | `openapi.yaml`; `contracts.md` P1, P7 | Juan Esteban Ruiz Ome |
| DL-9 | 0 | not recorded in the entry | not recorded | TypeScript on Node.js with the stack of the Stack Decisions block | ACCEPT | Types that travel across DTOs, OpenAPI and events | `ARCHITECTURE.md` §7, §9; `ports-and-adapters.md` | Juan Esteban Ruiz Ome |
| DL-10 | 1 | not recorded in the entry | `prompts/backup/NEXT.P1-ARCH-AMEND.md`: apply Phase 1 gap rulings | Idempotency key unique per actor with body hash and 24 h window | ACCEPT | Analysis recorded at the time: no cross-actor replay, bounded table | `ARCHITECTURE.md` §4.1, §5.1; `contracts.md`; SQL | Juan Esteban Ruiz Ome |
| DL-11 | 0–2 | not recorded in the entry | not recorded | Treat each coding-agent completion report as evidence of completion | REJECT | Ask for the explanation and verify the files themselves | `prompts/backup/` BLOCKED and NEXT files | Juan Esteban Ruiz Ome |
| DL-12 | 2 | not recorded in the entry | `prompts/backup/NEXT.P2-CROSSCHECK-1.md`: contract–schema cross-check and gate reviews | The PostgreSQL schema was accepted as complete without being run | REJECT (acceptance reversed) | Loading it in an embedded PostgreSQL failed (`FREEZE` is a reserved word) | `001_m2_schema.postgres.sql` | Juan Esteban Ruiz Ome |
| DL-13 | 2 | `bmad-review-adversarial-general`, `bmad-review-edge-case-hunter` | `prompts/backup/NEXT.P2-CROSSCHECK-1.md`: contract–schema cross-check and gate reviews | Two review lenses on `planning/detailed-design/` | ACCEPT | No finding was refuted whole: 20 Accept, 18 Defer, 0 Reject | `reviews/review-detailed-design.md`; `ARCHITECTURE.md` §14 TF-1 to TF-16 | Juan Esteban Ruiz Ome |
| DL-14 | 2 | not recorded in the entry | `prompts/backup/NEXT.P2-CROSSCHECK-1.md`: contract–schema cross-check and gate reviews | A Trade-off or a trigger for `evaluated_at = campus_now` | ACCEPT (trigger) | The schema is fixed first; a trigger works in both engines | Both SQL files; `ARCHITECTURE.md` M2-AD-5 Trade-off | Juan Esteban Ruiz Ome |
| DL-15 | 2 | not recorded in the entry | `prompts/backup/NEXT.P2-TRIAGE-FIX-1.md`: apply triage of the detailed-design review | Reuse `DECISION_NOT_PRODUCED` with a carve-out for an unreadable clock | ACCEPT (confirmed later by DL-33) | The owner chose 503 and no stored row (TF-2) | `contracts.md` §3, P9; `ARCHITECTURE.md` §14 TF-2 | Juan Esteban Ruiz Ome |
| DL-16 | 0–2 | not recorded in the entry | not recorded | Pair roles: the partner who leads Phases 1–2 is Reviewer in Phase 3 | ACCEPT | Juan led Phases 0–2; Tomás joins as Test Lead in Phase 3 | This log | Juan Esteban Ruiz Ome |
| DL-17 | 3 | TEA test-design | Cover the Annex A mandatory case without breaking the PRD | A test that approves the 21:58 request inside the night window | REJECT | FR-5 opens the night window at 22:00; approving would invent an ALLOW | `test/atdd/m2_domain.test.ts`; `reviews/phase-3-4-findings.md` | Tomás Quintero |
| DL-18 | 3 | TEA ATDD | Demonstrate the class case end to end | A test in which the engine ends a running job at class start | REJECT | M2 emits `HARD_DEADLINE` for M9 and does not end processes | `test/atdd/`; `planning/epics.md` story 2.1 | Tomás Quintero |
| DL-19 | 3 | TEA framework | An ephemeral, reproducible database for the tests | A native driver for the fixture database | MODIFY | `node:sqlite` in memory, tests only; production keeps the driver of DL-9 | `test/fixtures/index.ts` | Tomás Quintero |
| DL-20 | 3 | TEA CI | Accept only the expected red tests | Any failing run counts as red | REJECT | A broken import also exits non-zero; each test must fail with `NotImplementedError` | `test/ci/verify-red.mjs` | Tomás Quintero |
| DL-21 | 3 | TEA trace | Cover the NFR-4 boundary | `t < b` at both ends of a window | MODIFY | FR-4 includes the start; tests follow FR-4 and report the contradiction | `test/atdd/m2_domain.test.ts`; `reviews/phase-3-4-findings.md` | Tomás Quintero |
| DL-22 | 4 | PM / sprint-planning | Create an implementable backlog | Epics for the database, the domain and the API | REJECT | A layer is not visible to Elena or Rebecca; cut by outcomes | `planning/epics.md` | Tomás Quintero |
| DL-23 | 4 | sprint-planning | Certify the delivery | Report the gate as passed because the local script passed | REJECT | The script checks structure only; global state stays not certified | `planning/phase-4-gate-report.md`; `implementation-artifacts/sprint-status.yaml` | Tomás Quintero |
| DL-24 | 3–4 | CI doc-lint | Respect FR-15 and the protected files | Rewrite all existing files so none contains a banned term | MODIFY | Rewriting edits protected sources; delta against a baseline instead | `test/ci/readiness.mjs`; `test/evidence/doc-lint-baseline.json` | Tomás Quintero |
| DL-25 | 5 | Orchestrator review of the Phases 3–4 package | Orchestrator review of the Phases 3–4 package | Treat the 21:58 case and a night case from 22:00 as equivalent evidence | ACCEPT | Option selected: accept the equivalence; PRD untouched | `ARCHITECTURE.md` §15.2; this log | Juan Esteban Ruiz Ome |
| DL-26 | 5 | Orchestrator review of the Phases 3–4 package | Orchestrator review of the Phases 3–4 package | Resolve the NFR-4 against FR-4 contradiction | MODIFY | Option selected: follow FR-4; NFR-4 recorded as erratum | `ARCHITECTURE.md` §15.4 | Juan Esteban Ruiz Ome |
| DL-27 | 5 | Orchestrator review of the Phases 3–4 package | Orchestrator review of the Phases 3–4 package | Fix the denominator of the NFR report (21 or 19 rules) | ACCEPT | Option selected: use 19 and declare it | `ARCHITECTURE.md` §15.4 | Juan Esteban Ruiz Ome |
| DL-28 | 5 | Orchestrator review of the Phases 3–4 package | Orchestrator review of the Phases 3–4 package | Define a transaction boundary for `activateFreeze` | ACCEPT | Option selected: `UnitOfWork` port with a test-only failure hook | `ARCHITECTURE.md` §15.3 | Juan Esteban Ruiz Ome |
| DL-29 | 5 | Orchestrator review of the Phases 3–4 package | Orchestrator review of the Phases 3–4 package | Define shape, correlation, timeout and owner of the M9 obligation | ACCEPT (as an assumption) | Option selected: integration assumption; no end-to-end claim | `ARCHITECTURE.md` §15.2 | Juan Esteban Ruiz Ome |
| DL-30 | 5 | Orchestrator review of the Phases 3–4 package | Orchestrator review of the Phases 3–4 package | Triage the UX routes that differ from the 13 API routes | ACCEPT | Option selected: record the gap without touching `ux/` | `ARCHITECTURE.md` §15.5 | Juan Esteban Ruiz Ome |
| DL-31 | 5 | Orchestrator review of the Phases 3–4 package | Orchestrator review of the Phases 3–4 package | Mark the test seam provisional | ACCEPT | Option selected: provisional; shared types move to a domain module | `ARCHITECTURE.md` §15.8 | Juan Esteban Ruiz Ome |
| DL-32 | 5 | Orchestrator review of the Phases 3–4 package | Orchestrator review of the Phases 3–4 package | Keep the inherited deferrals with an explicit inventory | ACCEPT (deferred) | Option selected: keep all deferred with story and closing condition | `ARCHITECTURE.md` §15.6 | Juan Esteban Ruiz Ome |
| DL-33 | 5 | Orchestrator review of the Phases 3–4 package | Orchestrator review of the Phases 3–4 package | Confirm or reject the `PROPOSED` clock carve-out | ACCEPT | Option selected: confirm it and remove `PROPOSED` | `contracts.md` lines 41, 147 | Juan Esteban Ruiz Ome |
| DL-34 | 5 | Orchestrator review of the Phases 3–4 package | Orchestrator review of the Phases 3–4 package | Lint the delta against the baseline and inventory the debt | MODIFY | Option selected: delta plus documented exception | `ARCHITECTURE.md` §15.2; `test/evidence/doc-lint-baseline.json` | Juan Esteban Ruiz Ome |
| DL-35 | 5 | Orchestrator review of the Phases 3–4 package | Orchestrator review of the Phases 3–4 package | Add red tests for M2-AD-9 | ACCEPT | Option selected: accept; three red tests added | `test/atdd/m2_contracts.test.ts`; `test/fixtures/index.ts` | Juan Esteban Ruiz Ome |
| DL-36 | 5 | Orchestrator review of the Phases 3–4 package | Orchestrator review of the Phases 3–4 package | Strengthen weak assertions | ACCEPT | Option selected: strengthen all three; `denied_count` stays open | `test/atdd/m2_contracts.test.ts`; `test/atdd/m2_domain.test.ts` | Juan Esteban Ruiz Ome |
| DL-37 | 5 | Orchestrator review of the Phases 3–4 package | Orchestrator review of the Phases 3–4 package | Format the tests | ACCEPT | Option selected: format with Prettier | `test/atdd/*.ts`; `test/fixtures/index.ts` | Juan Esteban Ruiz Ome |
| DL-38 | 5 | Orchestrator review of the Phases 3–4 package | Orchestrator review of the Phases 3–4 package | Repeat concurrency tests on separate connections | ACCEPT (deferred) | Option selected: defer to stories 1.3 and 3.3 | `reviews/review-test-quality.md` | Juan Esteban Ruiz Ome |
| DL-39 | 5 | Orchestrator review of the readiness gate (run 1) | Close the findings of the readiness gate run 1 (NEEDS WORK) | Fix MAJ-1/2/3 and the minors, document MAJ-4/5/6 as CONCERNS (option A, recommended), or fix everything (option B) | ACCEPT | Option B selected: the statement asks to fix a failing gate; the rubric asks strict Given-When-Then | `planning/epics.md`; contracts; tests (task P5-FIX-2) | Juan Esteban Ruiz Ome |
| DL-40 | 5 | Orchestrator review of the readiness gate (run 1) | Close the findings of the readiness gate run 1 (NEEDS WORK) | Criteria and red tests for FR-2, FR-3 and PREVIEW_UNAVAILABLE only (option A), all 19 rules (option B), or criteria without tests (option C) | ACCEPT | Option A selected; the other rules stay a declared implementation-phase gap | `test/atdd/m2_contracts.test.ts`; `planning/epics.md` | Juan Esteban Ruiz Ome |
| DL-41 | 5 | Orchestrator review of the readiness gate (run 1) | Close the findings of the readiness gate run 1 (NEEDS WORK) | Add publish and journal as routes 14 and 15 (option A), move publish out of M2 (B), or document only (C) | ACCEPT (with amendment) | Option A first; amended the same day: no journal route (PRD line 83, NG-10), only publish | `contracts.md`; `openapi.yaml`; `dto.ts` | Juan Esteban Ruiz Ome |
| DL-42 | 5 | Orchestrator review of the readiness gate (run 1) | Close the findings of the readiness gate run 1 (NEEDS WORK) | Split story 4.2 into 4.2 and 4.4 (option A), move NFRs into capability stories (B), or leave 4.2 (C) | ACCEPT | Option A selected | `planning/epics.md`; `test/story-index.json` | Juan Esteban Ruiz Ome |
| DL-43 | 5 | Orchestrator review of the readiness gate (run 1) | Close the findings of the readiness gate run 1 (NEEDS WORK) | Close in the API the UX differences it can cover (option A), close all by changing the API (B), or declare all as a gap (C) | ACCEPT (with amendment) | Option A first; amended the same day: no `running_count` or `gpu_hours_reclaimed` (PRD §9.2 line 487) | `dto.ts`; `openapi.yaml`; `ARCHITECTURE.md` §15.5 | Juan Esteban Ruiz Ome |
| DL-44 | 5 | Orchestrator review of the readiness gate (run 2) | Act on the findings of the readiness gate run 2 (NEEDS WORK) | Six rules had no story, criterion or test: a criterion and one red test per rule (A), all 19 rules by 2 tests (B), or keep the gap as descope (C) | ACCEPT (amends DL-40) | Option A: criteria in the matching stories and 6 red tests without logic; it is what the audit asks to remove the Critical | `test/atdd/m2_contracts.test.ts`; `planning/epics.md` | Juan Esteban Ruiz Ome |
| DL-45 | 5 | Orchestrator review of the readiness gate (run 2) | Act on the findings of the readiness gate run 2 (NEEDS WORK) | No story for the freeze lift, drafts, reads and health; clause gaps in FR-2, 7, 8, 9, 10, 13, 15, 16: criteria and a lift story with at most 4 red tests (A), or document only (B) | ACCEPT | Option A: a lift story with its criteria and red tests, one criterion per missing clause, a cap of 4 red tests, the rest marked with the planned test | `planning/epics.md`; `test/atdd/m2_contracts.test.ts` | Juan Esteban Ruiz Ome |
| DL-46 | 5 | Orchestrator review of the readiness gate (run 2) | Act on the findings of the readiness gate run 2 (NEEDS WORK) | Same want and benefit in every story, stories 3.3 and 1.2 bundled: rewrite, split 3.3, justify 1.2 and record the migration (A), split 3.3 and 1.2 (B), or rewrite and record only (C) | ACCEPT | Option A: each story has its own want and benefit; 3.3 is split; 1.2 stays with a note on why it bundles; a DL records the single migration | `planning/epics.md`; `test/story-index.json` | Juan Esteban Ruiz Ome |
| DL-47 | 5 | Standing confirmation | Confirm single migration per engine | Existing strategy kept | ACCEPTED (confirmed) | Standing Recommended instruction of 2026-10-21; no added personal rationale | planning/epics.md; schemas | Juan Esteban Ruiz Ome (confirmation recorded by executor) |
| DL-48 | 5 | Orchestrator review of the readiness gate (run 2) | Act on the findings of the readiness gate run 2 (NEEDS WORK) | Findings that depend on protected files: an accepted-concerns section with mitigation, owner and sign-off (A), or ask permission to edit the PRD and the UX (B) | ACCEPT | Option A: one row per finding with the reason it is not corrected, the mitigation, the owner, the date and Juan's sign-off; the fixable Minors are corrected or recorded as errata | `planning/accepted-concerns.md`; `ARCHITECTURE.md` §15.4, §15.10 | Juan Esteban Ruiz Ome |
| DL-49 | 5 | Orchestrator review of the readiness gate (run 3) | Act on the findings of the readiness gate run 3 (NOT READY) | No story builds a user interface: a new epic 5 with UI stories (A), reduce FR-14 to the API (B), or leave it as a signed concern (C) | ACCEPT | Option A: 4 stories from `ux/EXPERIENCE.md` with accessibility and responsive criteria and planned tests, no UI code; it does not touch the PRD or the UX | `planning/epics.md`; `test/story-index.json` | Juan Esteban Ruiz Ome |
| DL-50 | 5 | Orchestrator review of the readiness gate (run 3) | Act on the findings of the readiness gate run 3 (NOT READY) | The rule table contradicts FR-8 and FR-2: the FR requirement wins (A), the table wins (B), or leave it open (C) | ACCEPT | Option A: a ruling in section 15 so that DENY by quota, tier and authorisation dominate BOUND and FRZ-02; a policy engine must not admit with zero quota or an unauthorised actor | `ARCHITECTURE.md` §15.11; `contracts.md`; `test/atdd/m2_contracts.test.ts` | Juan Esteban Ruiz Ome |
| DL-51 | 5 | Orchestrator review of the readiness gate (run 3) | Act on the findings of the readiness gate run 3 (NOT READY) | Findings that come from the PRD and the UX: keep them protected with signed concerns (A, confirms DL-48), or unprotect them (B) | ACCEPT | Option A: everything in our own files is corrected; the rest stays as concerns with mitigation | `planning/accepted-concerns.md` | Juan Esteban Ruiz Ome |
| DL-52 | 5 | Orchestrator review of the readiness gate (run 3) | Act on the findings of the readiness gate run 3 (NOT READY) | Closing the gate cycle: one gate run 4 with complete reading and then close (A), iterate until READY (B), or close now (C) | ACCEPT | Option A: the auditor must read PRD, ARCHITECTURE section 15, contracts and epics completely; the verdict is reported as is | none (plan) | Juan Esteban Ruiz Ome |
| DL-53 | 5 | Orchestrator review of the readiness gate (run 3) | Act on the findings of the readiness gate run 3 (NOT READY) | FR-15 lint and the gate reports: a documented exception in `readiness.mjs` (A), a baseline entry per report (B), or rewrite the reports (C) | ACCEPT | Option A: the lint excludes the verbatim skill output; recorded with its reason; the verdict stays intact | `test/ci/readiness.mjs` | Juan Esteban Ruiz Ome |
| DL-54 | 5 | Orchestrator review of the readiness gate (run 4) | Triage the 29 findings of the readiness gate run 4 (NEEDS WORK) | The NP-9 guard against the strict inequality: the named case wins (A), the general rule wins (B), or leave it as a concern (C) | ACCEPT | Option A (Recommended; chosen by the standing instruction): the specific named case wins; contracts, SQL `CHECK`s and the affected tests aligned; ruling in section 15 and an erratum for the PRD | `ARCHITECTURE.md` §15.4 and §15.12; `contracts.md`; both SQL files; `dto.ts`; `planning/epics.md`; `test/atdd/m2_domain.test.ts` | Juan Esteban Ruiz Ome |
| DL-55 | 5 | Orchestrator review of the readiness gate (run 4) | Triage the 29 findings of the readiness gate run 4 (NEEDS WORK) | Triage without another loop: fix own files and record the rest as concern or exemption (A), iterate another cycle (B), or close without triage (C) | ACCEPT | Option A (Recommended; chosen by the standing instruction): own-file defects are fixed; protected files give errata or accepted concerns with owner and target; C-2 becomes a signed exemption | `planning/run4-triage.md`; `planning/accepted-concerns.md` | Juan Esteban Ruiz Ome |
| DL-56 | 5 | Orchestrator check of the assignment limits (after gate run 4) | Return `planning/epics.md` to the limits of the statement (3–4 epics, 9–16 stories) | Dissolve epic 5 and merge: freeze console into 3.6, evaluator, rule catalogue and CLI into 4.4, measurement plans into 4.2 (A), remove the interface and return to 15 stories (B), or keep 5 epics and 19 stories and document it (C) | ACCEPT | Option A (Recommended; chosen by the standing instruction): keeps the interface coverage of DL-49 and every split of DL-45 and DL-46, removes the technical enabler by folding its plans into 4.2, and meets the 9–16 limit exactly; amends the structure created by DL-49 and DL-42 | `planning/epics.md`; `test/story-index.json`; `test/traceability-matrix.md`; `planning/criteria-test-map.md`; `test/nfr-evidence.md`; `planning/ux-state-contract-map.md`; `planning/accepted-concerns.md`; `planning/run4-triage.md`; `test/ci/readiness.mjs` | Juan Esteban Ruiz Ome |
| DL-57 | 5 | Assignment structure review | Fix per-epic bound | Move console 3.6 to 4.5 (A), merge (B), retain six stories (C) | ACCEPT | A, Recommended under standing instruction; amends DL-56 | epics, indexes, readiness gate | Juan Esteban Ruiz Ome |
| DL-58 | 5 | Handover completion | Preserve the sprint skill output | A. Apply the documented correction (Recommended); B. retain the existing state. | ACCEPTED | The file must come from the skill; repeated checks must preserve its bytes. | test/ci/readiness.mjs; implementation-artifacts/sprint-status.yaml; test/evidence/gate-runs/sprint-planning-terminal.txt | Juan Esteban Ruiz Ome (standing instruction) |
| DL-59 | 5 | Handover completion | TEA TR-01 Accept | A. Apply the test-only correction (Recommended); B. retain the finding. | ACCEPTED | Cheap test-only correction; every expected outcome remains asserted. The seven rejection reasons are asserted as one array, with the seven-error count kept. | reviews/review-tea-skills.md; test/atdd/m2_contracts.test.ts: AC-I1 | Juan Esteban Ruiz Ome (standing instruction) |
| DL-60 | 5 | Handover completion | TEA TR-02 Accept | A. Apply the test-only correction (Recommended); B. retain the finding. | ACCEPTED | Cheap test-only correction; every expected outcome remains asserted. The end-boundary property now asserts before, equal and after outcomes without an assertion guard. | reviews/review-tea-skills.md; test/atdd/m2_domain.test.ts: DM-BOUND | Juan Esteban Ruiz Ome (standing instruction) |
| DL-61 | 5 | Handover completion | TEA TR-03 Accept | A. Apply the test-only correction (Recommended); B. retain the finding. | ACCEPTED | Cheap test-only correction; every expected outcome remains asserted. The start-boundary property now asserts before, equal and after outcomes without an assertion guard. | reviews/review-tea-skills.md; test/atdd/m2_domain.test.ts: DM-START | Juan Esteban Ruiz Ome (standing instruction) |
| DL-62 | 5 | Handover completion | TEA TR-04 Accept | A. Apply the test-only correction (Recommended); B. retain the finding. | ACCEPTED | Cheap test-only correction; every expected outcome remains asserted. Group the application contract tests under a named describe scope. | reviews/review-tea-skills.md; test/atdd/m2_contracts.test.ts | Juan Esteban Ruiz Ome (standing instruction) |
| DL-63 | 5 | Handover completion | TEA TR-05 Accept | A. Apply the test-only correction (Recommended); B. retain the finding. | ACCEPTED | Cheap test-only correction; every expected outcome remains asserted. Group the domain tests under a named describe scope. | reviews/review-tea-skills.md; test/atdd/m2_domain.test.ts | Juan Esteban Ruiz Ome (standing instruction) |
| DL-64 | 5 | Handover completion | TEA TR-06 Accept | A. Apply the test-only correction (Recommended); B. retain the finding. | ACCEPTED | Cheap test-only correction; every expected outcome remains asserted. Build fresh timetable, catalogue and access facts through fixture factories, with scenario overrides visible. | reviews/review-tea-skills.md; test/fixtures/index.ts; test/atdd/m2_contracts.test.ts | Juan Esteban Ruiz Ome (standing instruction) |
| DL-65 | 5 | Handover completion | TEA TR-07 Accept | A. Apply the test-only correction (Recommended); B. retain the finding. | ACCEPTED | Cheap test-only correction; every expected outcome remains asserted. Build fresh protected windows through a factory, preserving each scenario boundary. | reviews/review-tea-skills.md; test/fixtures/index.ts; test/atdd/m2_domain.test.ts | Juan Esteban Ruiz Ome (standing instruction) |
| DL-66 | 5 | Handover completion | TEA TR-G01 Defer | A. Defer until implementation and its harness exist (Recommended); B. exceed the stop-point now. | DEFERRED | Owner for follow-up: Tomás (test/harness preparation), Juan (unsettled oracle); no agreed deadline. The grouped gap includes import and no-I/O guards, a 10,000-replay observation, port payload schemas and cross-scope fixtures beyond the current stub seams. Creating those harness contracts now would introduce new assumptions; keep named domain examples with their implementation stories and add them before those stories close. Closing condition: Add the named planned unit/property tests (including THESIS, scoped schedules, daemon exemption, import/I/O guards, canonical replay, poisoned data and port fail-mode classification), using the documented PRD/contracts outcomes. Preserve fixed clocks and independent expected values. | reviews/review-tea-skills.md; Not fixed; all affected ACs retained in trace report and matrix. | Juan Esteban Ruiz Ome (standing instruction) |
| DL-67 | 5 | Handover completion | TEA TR-G02 Defer | A. Defer until implementation and its harness exist (Recommended); B. exceed the stop-point now. | DEFERRED | Owner for follow-up: Tomás (test/harness preparation), Juan (unsettled oracle); no agreed deadline. The closure needs implementation or the missing API, UI, measurement or database/commit harness; the current task permits stubs and test corrections only. Closing condition: Implement a public API test harness in the implementation phase. Given documented valid/invalid requests and session roles, call each endpoint and assert documented status/body and no-write outcomes. Keep unauthenticated status unspecified until architecture fixes it; do not invent publish authorization/status. Suggested stable IDs: existing HR-Q1/HR-P1/AUTH-U-1/FD-Q1/FZ-READ-1/FZ-READ-2/LF-P4/RV-Q1/RV-P1, plus API variants of mapped existing IDs. | reviews/review-tea-skills.md; Not fixed; all affected ACs retained in trace report and matrix. | Juan Esteban Ruiz Ome (standing instruction) |
| DL-68 | 5 | Handover completion | TEA TR-G03a Accept | A. Apply the test-only correction (Recommended); B. retain the finding. | ACCEPTED | Existing DTO and rows expose these checks without an adapter: ALLOW primary rule, one activation audit and token consumption, and the suppressed freeze rule state in both denial cases. | reviews/review-tea-skills.md; test/atdd/m2_contracts.test.ts: EV-Q1, AC-I1, EV-FRZ-03 | Juan Esteban Ruiz Ome (standing instruction) |
| DL-69 | 5 | Handover completion | TEA TR-G03b Defer | A. Defer until implementation and its harness exist (Recommended); B. exceed the stop-point now. | DEFERRED | Owner for follow-up: Tomás (test/harness preparation), Juan (unsettled oracle); no agreed deadline. The closure needs implementation or the missing API, UI, measurement or database/commit harness; the current task permits stubs and test corrections only. Closing condition: Complete the source-specific missing assertions listed per AC: minimal rule registry, boot denial, fan-out/40ms cancellation, clock-with-no-instant, M8 mutation boundary, consumed token/audit, partial closing rollback, suppressed R-FRZ-02, retry and idempotent event delivery. Use tests at domain, boot/integration and adapter levels as each clause requires. | reviews/review-tea-skills.md; Not fixed; all affected ACs retained in trace report and matrix. | Juan Esteban Ruiz Ome (standing instruction) |
| DL-70 | 5 | Handover completion | TEA TR-G04 Defer | A. Defer until implementation and its harness exist (Recommended); B. exceed the stop-point now. | DEFERRED | Owner for follow-up: Tomás (test/harness preparation), Juan (unsettled oracle); no agreed deadline. The closure needs implementation or the missing API, UI, measurement or database/commit harness; the current task permits stubs and test corrections only. Closing condition: When interface implementation is authorized, add the named UI-FRZ/UI-EVAL/UI-RULES/UI-CLI/COPY-01 tests. Given loading, empty, validation, permission and system-error states, exercise the implemented journey and assert visible outcome/accessibility at documented widths. No interface implementation is authorized by this trace run. | reviews/review-tea-skills.md; Not fixed; all affected ACs retained in trace report and matrix. | Juan Esteban Ruiz Ome (standing instruction) |
| DL-71 | 5 | Handover completion | TEA TR-G05 Defer | A. Defer until implementation and its harness exist (Recommended); B. exceed the stop-point now. | DEFERRED | Owner for follow-up: Tomás (test/harness preparation), Juan (unsettled oracle); no agreed deadline. The closure needs implementation or the missing API, UI, measurement or database/commit harness; the current task permits stubs and test corrections only. Closing condition: Provide the five measurement harnesses/evidence files specified by test/nfr-evidence.md; run against implementation with recorded equipment, load, seed and original thresholds. Prove an over-threshold result fails its implementation gate. No stub runtime is performance evidence. | reviews/review-tea-skills.md; Not fixed; all affected ACs retained in trace report and matrix. | Juan Esteban Ruiz Ome (standing instruction) |
| DL-72 | 5 | Handover completion | TEA TR-G06 Defer | A. Defer until implementation and its harness exist (Recommended); B. exceed the stop-point now. | DEFERRED | Owner for follow-up: Tomás (test/harness preparation), Juan (unsettled oracle); no agreed deadline. The closure needs implementation or the missing API, UI, measurement or database/commit harness; the current task permits stubs and test corrections only. Closing condition: Add DB-GRANT-1 against the PostgreSQL role and QUOTA-CONC-01 against a simulated atomic M8 commit. Given forbidden UPDATE/DELETE or 100 concurrent commits, assert rejection and remaining/need bound. In-memory SQLite is not equivalent evidence. | reviews/review-tea-skills.md; Not fixed; all affected ACs retained in trace report and matrix. | Juan Esteban Ruiz Ome (standing instruction) |
| DL-73 | 5 | Handover completion | TEA TR-G07 Accept | A. Apply the test-only correction (Recommended); B. retain the finding. | ACCEPTED | Cheap matrix clarification: retain DOC-LINT as an auxiliary script control, outside the 61 ATDD cases. | reviews/review-tea-skills.md; test/traceability-matrix.md: TEA trace run; check-baseline.log and check-final.log | Juan Esteban Ruiz Ome (standing instruction) |
| DL-74 | 5 | Handover completion | TEA TR-08 Reject | A. Keep Vitest scope and record why this advice does not apply (Recommended); B. add unrelated browser or broker dependencies. | ACCEPTED | The reviewed files execute under Vitest and call internal ports. Step 1 explicitly skips Playwright loading profiles for other runners; registry run preconditions close M9/L9/M10 when packages are absent. Adding browser or broker packages would not close a defect in this suite. | reviews/review-tea-skills.md; No package change; rationale retained here. | Juan Esteban Ruiz Ome (standing instruction) |
| DL-75 | 5 | Handover completion | Confirm DL-47 and concern ownership | A. Apply the documented correction (Recommended); B. retain the existing state. | ACCEPTED | P5-FINAL-1 part C explicitly chooses confirmation; this records the instruction without inventing a personal rationale. | ai-log/decision-log-solu2.md DL-47; planning/accepted-concerns.md | Juan Esteban Ruiz Ome (standing instruction) |
| DL-76 | 5 | Handover completion | Append Solu-2 evidence to the inherited gate report | A. Apply the documented correction (Recommended); B. retain the existing state. | ACCEPTED | The handover explicitly chooses an append-only Solu-2 section, retaining the literal run5 NOT READY verdict. | planning/readiness-gate-report.md; test/evidence/protected-sha256.json | Juan Esteban Ruiz Ome (standing instruction) |

---

## 7. Readiness gate run 1 · decisions of 2026-10-21

**Recorded:** 2026-10-21 (Colombia time) · **Decided by:** Juan Esteban Ruiz Ome (Architect and Reviewer), by selecting one option from a list for each question.
**How the decisions were taken.** The readiness gate run with the BMad skill (`bmad-check-implementation-readiness`, run 1, `planning/implementation-readiness-report-solu2.md`) returned NEEDS WORK with 6 Major and 4 Minor findings. The AI put five questions to Juan; the AI wrote the option texts; Juan selected one for each. For DL-41 and DL-43 Juan amended the first selection on the same day, after the AI reported a conflict with the PRD while preparing the task; both entries record the first selection and the amendment. No motive beyond the selected option and the reason given with it is recorded. The options are in the Appendix B block at the end of this file.
**Distribution.** 5 entries (`DL-39`…`DL-43`), all ACCEPTED (DL-41 and DL-43 with a same-day amendment).
**Fields required by the course template** appear in the first line of each entry: Phase | Persona / Skill | Prompt summary | Decision | Artifact changed | Decided by.

### DL-39 — scope of the fix after the gate (S1)
- **Phase 5 | Orchestrator review of the readiness gate (run 1) | "Close the findings of the readiness gate run 1 (NEEDS WORK)" | ACCEPTED | `planning/epics.md`, contracts, schemas, tests, `ai-log/decision-log-solu2.md` (task P5-FIX-2) | Juan Esteban Ruiz Ome (option selected on 2026-10-21).**
- **Proposal.** Three scopes for the ten findings (6 Major, 4 Minor): A fix MAJ-1/2/3 and the minors and document MAJ-4/5/6 as CONCERNS; B fix everything, including the split of story 4.2 and the publish route; C document everything as CONCERNS with no file changed.
- **Status.** ACCEPTED (option B).
- **Rationale.** Reason given with the choice: the statement asks to fix a failing gate and rerun it; the rubric asks strict Given-When-Then; documenting everything as CONCERNS would leave the placeholder defect in 12 stories.
- **What was kept.** All ten findings are addressed by task P5-FIX-2. The items that need a decision the sources do not give stay as open points, not as invented rules.
- **Falsifier.** The rerun of the gate still returns Major findings among MAJ-1 … MAJ-6.
- **Trace.** `planning/implementation-readiness-report-solu2.md`; `ARCHITECTURE.md` §15.9; DL-40 … DL-43.

### DL-40 — coverage of MAJ-1: freeze rules, tier rules and PREVIEW_UNAVAILABLE (S2)
- **Phase 5 | Orchestrator review of the readiness gate (run 1) | "Close the findings of the readiness gate run 1 (NEEDS WORK)" | ACCEPTED | `test/atdd/m2_contracts.test.ts`, `planning/epics.md`, `test/traceability-matrix.md` | Juan Esteban Ruiz Ome (option selected on 2026-10-21).**
- **Proposal.** `R-FRZ-01/02`, `R-TIER-01/02/03` and `PREVIEW_UNAVAILABLE` had no criterion and no test (finding MAJ-1). Options: A criteria and red tests only for FR-2, FR-3 and PREVIEW_UNAVAILABLE (about 6 to 8 tests, no production logic; the other rules stay a declared gap); B all 19 rules with 2 tests each (PRD AG-8, about 38 more tests); C criteria only, no new tests.
- **Status.** ACCEPTED (option A).
- **Rationale.** Option selected: A. The option text states that no production logic is written and that the other rules stay a declared implementation-phase gap. A reason beyond the option text is not recorded.
- **What was kept.** Six red tests (`EV-FRZ-01`, `EV-FRZ-02`, `EV-TIER-01`, `EV-TIER-02`, `EV-TIER-03`, `PV-UNAVAILABLE`). `R-SYS-01`, `R-FLEET-01` and the thesis window (scenario S-8) stay without criterion or test and are declared as a gap (`test/traceability-matrix.md`, section of 2026-10-21).
- **Falsifier.** One of the six tests passes against a stub, or an implementation phase starts without a test for the three declared uncovered rules.
- **Trace.** `test/atdd/m2_contracts.test.ts`; `planning/epics.md` stories 1.2, 3.1, 3.3; `test/story-index.json`.

### DL-41 — the publish route and the journal route (S3)
- **Phase 5 | Orchestrator review of the readiness gate (run 1) | "Close the findings of the readiness gate run 1 (NEEDS WORK)" | ACCEPTED (with amendment) | `contracts.md`, `schemas/openapi.yaml`, `schemas/dto.ts`, `ports-and-adapters.md` | Juan Esteban Ruiz Ome (option selected on 2026-10-21, amended the same day).**
- **Proposal.** Story 4.1 needs `POST /policy/versions/publish` and the UX calls `GET /policy/journal`; neither is among the 13 routes (finding MAJ-5). Options: A add both to the contract as routes 14 and 15; B move publish out of M2 (contradicts `ARCHITECTURE.md` §2.2); C decide and document only, without touching `openapi.yaml`.
- **Status.** ACCEPTED. First selection: option A. Amendment the same day: `GET /policy/journal` is not created.
- **Rationale.** First selection: option A. Amendment: while preparing the task the AI reported that `planning/prd.md` line 83 and NG-10 (line 120) say M2 builds no second query path over the history, which belongs to the Audit Ledger. Options for the amendment: (1) no route, query delegated to the ledger; (2) create the route and record an exception to NG-10; (3) leave as NEEDS DECISION. Juan selected (1). FR-11 is met through the ledger.
- **What was kept.** Only route 14 (`publishVersion`) is added, with open point 12 for what the sources do not fix (body, role, success status, validity check). The journal screen of the UX moves to the pending UX corrections.
- **Falsifier.** The course or the PRD owner requires M2 itself to answer journal queries, or a publish implementation needs a rule that open point 12 left undecided.
- **Trace.** `contracts.md` §2 `publishVersion` and §6 point 12; `openapi.yaml` `/policy/versions/publish`; `dto.ts`; `ports-and-adapters.md` §2; `ARCHITECTURE.md` §15.5 and §15.9; tests `PB-Q1`, `PB-I1`.

### DL-42 — splitting story 4.2 (S4)
- **Phase 5 | Orchestrator review of the readiness gate (run 1) | "Close the findings of the readiness gate run 1 (NEEDS WORK)" | ACCEPTED | `planning/epics.md`, `test/story-index.json`, `test/ci/readiness.mjs` | Juan Esteban Ruiz Ome (option selected on 2026-10-21).**
- **Proposal.** Story 4.2 carried 11 requirements and performance thresholds that its Definition of Done would have counted as met (finding MAJ-4). Options: A split into 4.2 (reproducibility and evidence) and 4.4 (NFR measurement, a declared technical enabler with an exit criterion); B move the NFRs into the capability stories (touches 8 stories); C leave 4.2 and document it (the finding stays Major).
- **Status.** ACCEPTED (option A).
- **Rationale.** Option selected: A. A reason beyond the option text is not recorded.
- **What was kept.** Story 4.2 keeps FR-9, FR-13 and the data-facing NFRs; story 4.4 carries NFR-1, NFR-7, NFR-8, NFR-9, NFR-10 as a measurement plan, labelled as not an executable test now. Epic 4 has four stories; the total is 13.
- **Falsifier.** A story Definition of Done claims a performance threshold without a measurement file, or the exit criterion of 4.4 is not met at the end of the implementation phase.
- **Trace.** `planning/epics.md` stories 4.2 and 4.4; `test/nfr-evidence.md` still points the performance rows to 4.2 (not edited in this task).

### DL-43 — differences between the UX and the API (S5)
- **Phase 5 | Orchestrator review of the readiness gate (run 1) | "Close the findings of the readiness gate run 1 (NEEDS WORK)" | ACCEPTED (with amendment) | `schemas/dto.ts`, `schemas/openapi.yaml`, `ARCHITECTURE.md` §15.5, `ux-state-contract-map.md` | Juan Esteban Ruiz Ome (option selected on 2026-10-21, amended the same day).**
- **Proposal.** The UX and the API differ in eight places (finding MAJ-6); the UX files are protected. Options: A close in the API those it can cover and declare the rest; B close all by changing the API (would contradict G-02 and D1); C declare all as a gap.
- **Status.** ACCEPTED. First selection: option A. Amendment the same day: `running_count` and `gpu_hours_reclaimed` are not added.
- **Rationale.** First selection: option A. Amendment: while preparing the task the AI reported that `planning/prd.md` §9.2 line 487 and AD-5 say M2 cannot observe job state. Options for the amendment: (1) no fields, the two preview tiles stay pending; (2) add them as `number | null`, always null in M2. Juan selected (1).
- **What was kept.** Closed in the API: the publish route and `FreezeDto.successor_freeze_id`. Open as "UX correction pending, owner Juan (to confirm), before sprint 1": `WINDOW_STARTED`, degraded activation, `node_class_id` in the request, the journal screen and the two preview tiles. "Preview returns a token" stays open because no PRD, contract or §5.1 text gives a basis for a token on that route.
- **Falsifier.** The UX files are corrected, or an implementation adds a field to the preview response that a source does not define.
- **Trace.** `ARCHITECTURE.md` §15.5 and §15.9; `ux-state-contract-map.md`; `dto.ts` `FreezeDto`.

---

## Appendix B (addition) — questions and options of 2026-10-21

The option texts were written by the AI; the person selected one. No motive beyond the selected option is recorded. Chosen options are marked.

| Id | Question | Options | Option chosen |
|---|---|---|---|
| DL-39 | Scope of the fix after the gate (NEEDS WORK: 6 Major, 4 Minor) | A. Fix MAJ-1/2/3 and the minors, document MAJ-4/5/6 as CONCERNS (recommended). B. Fix everything, including splitting 4.2 and deciding the publish route. C. Only document everything as CONCERNS (no file changed) | B |
| DL-40 | MAJ-1 coverage (`R-FRZ-*`, `R-TIER-*`, `PREVIEW_UNAVAILABLE` without criterion or test) | A. Criteria and red tests only for FR-2, FR-3 and PREVIEW_UNAVAILABLE (about 6 to 8 tests, no production logic; the other rules stay a declared gap). B. The 19 rules by 2 tests (PRD AG-8; about 38 more tests). C. Only criteria, no new tests | A |
| DL-41 | Publish route (MAJ-5) | A. Add it to the contract (`POST /policy/versions/publish` and `GET /policy/journal` as routes 14 and 15). B. Move publish out of the scope of M2 (contradicts `ARCHITECTURE.md` §2.2). C. Only decide and document, without touching `openapi.yaml`. Amendment of the same day, after a conflict with PRD line 83 and NG-10: (1) no route, delegate to the ledger; (2) create the route and record an exception to NG-10; (3) leave as NEEDS DECISION | A, then amendment (1) |
| DL-42 | Story 4.2 (MAJ-4) | A. Split into 4.2 (reproducibility verification) and 4.4 (NFR measurement, technical enabler with exit criterion). B. Move the NFR requirements into the capability stories (touches 8 stories). C. Leave 4.2 as it is and document it (the finding stays Major) | A |
| DL-43 | UX and API differences (MAJ-6, 8 differences; UX files protected) | A. Close those the API can cover and declare the rest. B. Close all by changing the API (would contradict G-02 and D1). C. Only declare all as a gap. Amendment of the same day, after PRD §9.2 line 487: (1) no fields, declare the two tiles pending; (2) add `running_count` and `gpu_hours_reclaimed` as `number | null`, always null in M2 | A, then amendment (1) |

---

## 8. Readiness gate run 2 · decisions of 2026-10-21

**Recorded:** 2026-10-21 (Colombia time) · **Decided by:** Juan Esteban Ruiz Ome (Architect and Reviewer), by selecting one option from a list for each question, except DL-47, which records that no decision was found.
**How the decisions were taken.** The second run of the BMad readiness skill (`planning/implementation-readiness-report-solu2-run2.md`, run by an independent agent) returned NEEDS WORK with 1 Critical, 10 Major and 6 Minor findings. The AI put four questions to Juan (DL-44, DL-45, DL-46, DL-48); the AI wrote the option texts; Juan selected one for each. DL-47 is not a selection: no earlier human decision exists in the sources, and the entry says so. No motive beyond the selected option and the reason given with it is recorded. The options are in the second Appendix B addition at the end of this file.
**Distribution.** 5 entries (`DL-44`…`DL-48`): 4 ACCEPTED (DL-44 amends DL-40) and 1 entry that records the absence of a decision (DL-47). The log has 48 entries in total.
**Fields required by the course template** appear in the first line of each entry: Phase | Persona / Skill | Prompt summary | Decision | Artifact changed | Decided by.

### DL-44 — six rules without story, criterion or test (CRIT-1), amending DL-40
- **Phase 5 | Orchestrator review of the readiness gate (run 2) | "Act on the findings of the readiness gate run 2 (NEEDS WORK)" | ACCEPTED | `test/atdd/m2_contracts.test.ts`, `planning/epics.md`, `planning/criteria-test-map.md` | Juan Esteban Ruiz Ome (option selected on 2026-10-21).**
- **Proposal.** `R-FLEET-01`, `R-SYS-01`, `R-AUTH-01`, `R-AUTH-02`, `R-LAB-02` and `R-CONTEND-01` (6 of the 19 rules) and scenarios S-6, S-7 and S-8 had no story, criterion or test (finding CRIT-1). This reverses part of DL-40, which had left `R-SYS-01` and `R-FLEET-01` as a declared gap. Options: A a criterion and one red test for each of the six rules; B all 19 rules by 2 tests (PRD AG-8, about 38 more red tests); C keep the gap as a descope (the Critical stays, because the audit asks for the decision in the protected PRD).
- **Status.** ACCEPTED (option A). This entry amends DL-40.
- **Rationale.** Reason given with the choice: criteria in the matching stories and 6 red tests without logic, linking S-6, S-7 and S-8 to those tests; recorded as an amendment to DL-40; it is what the audit asks to remove the Critical.
- **What was kept.** Six red tests: `EV-FLEET-01`, `EV-CONTEND-01` (story 2.2, S-7), `EV-AUTH-01`, `EV-AUTH-02`, `EV-SYS-01` (story 2.3, S-6) and `EV-LAB-02` (story 2.1). S-8 (thesis window) is tied to a criterion of story 2.1 with `EDGE-NIGHT` as the test of the mechanism; no test distinguishes the THESIS kind, and `EDGE-THESIS` is a planned test: a coverage gap, declared. No production logic was written; the shape of the injected facts is a fixture assumption for Tomás to confirm.
- **Falsifier.** One of the six tests passes against a stub, or an implementation phase starts without `EDGE-THESIS`.
- **Trace.** `test/atdd/m2_contracts.test.ts`; `planning/epics.md` stories 2.1, 2.2, 2.3; `planning/criteria-test-map.md`; `test/traceability-matrix.md`; DL-40.

### DL-45 — freeze lift, drafts, reads, health and FR clause gaps (MAJ-6, MAJ-7)
- **Phase 5 | Orchestrator review of the readiness gate (run 2) | "Act on the findings of the readiness gate run 2 (NEEDS WORK)" | ACCEPTED | `planning/epics.md`, `test/atdd/m2_contracts.test.ts`, `ports/in/policy.ts`, `test/fixtures/index.ts` | Juan Esteban Ruiz Ome (option selected on 2026-10-21).**
- **Proposal.** No story or criterion existed for the freeze lift, draft creation, the read routes and health/ready, and criteria were missing for clauses of FR-2, FR-7, FR-8, FR-9, FR-10, FR-13, FR-15 and FR-16. Options: A criteria in existing stories and a story for the lift, with at most 4 new red tests; B only document them as concerns (the Major would remain).
- **Status.** ACCEPTED (option A).
- **Rationale.** Reason given with the choice: a new lift story with its criteria and red tests; criteria added to stories for drafts, reads and health/ready; one criterion per missing FR clause; a cap of 4 red tests; the rest is marked with the planned implementation test.
- **What was kept.** New story 3.4 (freeze lift) with 4 red tests (`LF-Q1`, `LF-P1`, `LF-P2`, `LF-P3`); the oracle is the outcome note of `contracts.md` line 126, because there is no full P/Q/I contract for the lift. Criteria with a planned test and its planned id: `HR-Q1`, `HR-P1`, `EV-SUPP-01`, `DM-PURE-01`, `EDGE-STRADDLE-1`, `EDGE-STRADDLE-3`, `PROP-DEADLINE-1`, `DEP-TOL-01`, `DEP-SHAPE-01`, `QUOTA-CONC-01`, `FD-Q1`, `FZ-READ-1`, `FZ-READ-2`, `LF-P4`, `FRZ-QUANT-01`, `RV-Q1`, `RV-P1`, `COPY-01`; `DOC-LINT` is a script check of `test/ci/readiness.mjs`.
- **Falsifier.** A planned test is never written before the story is declared done, or the lift contract gets a P/Q/I definition that differs from the outcome note used as oracle.
- **Trace.** `planning/epics.md` stories 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 3.2, 3.4, 3.5, 4.1, 4.3; `planning/criteria-test-map.md` (58 rows); `test/atdd/m2_contracts.test.ts`.

### DL-46 — story statements, split of story 3.3, story 1.2 (MAJ-4, MAJ-5)
- **Phase 5 | Orchestrator review of the readiness gate (run 2) | "Act on the findings of the readiness gate run 2 (NEEDS WORK)" | ACCEPTED | `planning/epics.md`, `test/story-index.json`, `test/ci/readiness.mjs` | Juan Esteban Ruiz Ome (option selected on 2026-10-21).**
- **Proposal.** Every story used the same want and benefit sentence, and stories 3.3 and 1.2 bundled several capabilities (findings MAJ-4, MAJ-5; the single migration, finding MAJ-10, is DL-47). Options: A rewrite the statements, split 3.3, justify 1.2 and record the migration decision; B split 3.3 and 1.2; C only rewrite the statements and record the migration (no story is split; MAJ-5 stays Major).
- **Status.** ACCEPTED (option A).
- **Rationale.** Reason given with the choice: each story gets its own want and benefit; 3.3 is split; 1.2 stays with a note on why it bundles; a DL records the single migration.
- **What was kept.** Every story has its own statement. Story 3.3 keeps the authorization of the activation (token, actor, reason, role); new story 3.5 takes the consistency under concurrency and failure and the effect on decisions; nothing is renumbered, so the lift story of DL-45 is 3.4. Story 1.2 stays unsplit with a written reason (shared components and contract). The story count is 15 and `test/ci/readiness.mjs` checks 15.
- **Falsifier.** A later audit still finds a story whose statement repeats another story's, or the cut between 3.3 and 3.5 leaves a criterion that needs both.
- **Trace.** `planning/epics.md` stories 1.2, 3.3, 3.5 and every statement; `test/story-index.json`.

### DL-47 — one migration per engine that creates every table (MAJ-10)
- **Phase 5 | Orchestrator review of the readiness gate (run 2) | "Act on the findings of the readiness gate run 2 (NEEDS WORK)" | ACCEPTED (standing confirmation) | `planning/epics.md` (section "Project setup already in place") | confirmed by Juan Esteban Ruiz Ome under his standing instruction of 2026-10-21 to take the Recommended option; recorded by the executor.**
- **Proposal.** The schema is delivered as one migration per engine (`001_m2_schema.sqlite.sql`, `001_m2_schema.postgres.sql`), so no story creates the tables it needs (finding MAJ-10).
- **Status.** ACCEPTED by the standing confirmation recorded in P5-FINAL-1; originally no prior decision found. The sources state one migration file per engine and why (`ARCHITECTURE.md` line 720: the two engines differ, so each gets its own file; candidate C-39 of this log, "review file only"); no source states a decision or a reason for creating all tables in one migration instead of one set per story.
- **Rationale.** Confirmed under the standing instruction; the historical absence of a recorded rationale is retained. No additional personal motive is attributed.
- **What was kept.** The files as they are. `planning/epics.md` says that the choice is present in the files and that this entry records the absence of a decision.
- **Falsifier.** Juan confirms or replaces the choice with a recorded reason; the entry then changes from "confirmed by Juan Esteban Ruiz Ome under his standing instruction of 2026-10-21 to take the Recommended option; recorded by the executor" to that decision.
- **Trace.** `planning/epics.md` section "Project setup already in place"; the two SQL files; `ARCHITECTURE.md` line 720.

### DL-48 — findings that depend on protected files (MAJ-1, MAJ-2, MAJ-3, MAJ-8, MAJ-9, MIN-5, MIN-6)
- **Phase 5 | Orchestrator review of the readiness gate (run 2) | "Act on the findings of the readiness gate run 2 (NEEDS WORK)" | ACCEPTED | `planning/accepted-concerns.md`, `planning/ARCHITECTURE.md` §15.4 and §15.10 | Juan Esteban Ruiz Ome (option selected on 2026-10-21).**
- **Proposal.** The UX, the PRD and its gates, the lack of UI stories and the language of the epics are findings whose file is protected or whose fix is a scope decision. Options: A an "accepted concerns" section with mitigation, owner and sign-off; B ask permission to edit the PRD and the UX (this unfreezes those files and recalculates the protected hashes).
- **Status.** ACCEPTED (option A).
- **Rationale.** Reason given with the choice: one row per finding with the reason it is not corrected, the mitigation, the owner, the date and Juan's sign-off; the fixable Minors (the 46 and 48 counts, "13 routes", `HARDWARE_UNSATISFIABLE`, the broken reference) are corrected or recorded as errata.
- **What was kept.** `planning/accepted-concerns.md` with 8 rows (the 7 findings plus MIN-4), owner "Juan Esteban Ruiz Ome (to confirm)", target "before implementation sprint 1", sign-off blank. Errata for lines inside 1–1075 of `ARCHITECTURE.md` in §15.4. The protected files are untouched.
- **Falsifier.** A gate run still counts one of these findings as uncorrected without a row, or a sign-off is written by someone other than Juan.
- **Trace.** `planning/accepted-concerns.md`; `ARCHITECTURE.md` §15.4, §15.10.

---

## Appendix B (second addition) — questions and options of 2026-10-21, after gate run 2

The option texts were written by the AI; the person selected one. No motive beyond the selected option is recorded. Chosen options are marked.

| Id | Question | Options | Option chosen |
|---|---|---|---|
| DL-44 | CRIT-1: 6 of 19 PRD rules (`R-FLEET-01`, `R-SYS-01`, `R-AUTH-01`, `R-AUTH-02`, `R-LAB-02`, `R-CONTEND-01`) and scenarios S-6, S-7, S-8 have no story, criterion or test (this reverses part of DL-40) | A. One criterion and one red test for each of the 6 rules. B. All 19 rules with 2 tests (PRD AG-8): about 38 more red tests, large, duplicates the suite. C. Keep the gap and document it as a descope: the Critical stays in the audit | A |
| DL-45 | MAJ-6/7: no story or criterion for freeze lift, draft creation, read routes, health/ready; clause gaps in FR-2, 7, 8, 9, 10, 13, 15, 16 | A. Criteria in existing stories and a "lift freeze" story; at most 4 new red tests. B. Only document them as concerns with mitigation: no new stories or criteria, the Major would remain | A |
| DL-46 | MAJ-4/5/10: the same want and benefit in every story, 3.3 and 1.2 bundle too much, a single migration without a recorded decision | A. Rewrite the statements, split 3.3, justify 1.2, record the migration decision. B. Split 3.3 and 1.2: cleaner, more changes in indexes, matrix and counters. C. Only rewrite the statements and record the migration: no story split, MAJ-5 stays Major | A |
| DL-47 | MAJ-10: single upfront migration; no earlier human decision is recorded in any source | not offered as options: entry written as "no prior decision found", Decided by pending confirmation by Juan, reason not verified | not a selection |
| DL-48 | Findings that depend on protected files (UX MAJ-1 and MIN-5, PRD and gates MAJ-3 and MAJ-8, no UI stories MAJ-2, epics in Spanish MIN-6) | A. An "accepted concerns" section with mitigation, owner and sign-off. B. Ask permission to edit the PRD and the UX: unfreezes those files, recalculates the protected hashes, changes artefacts delivered in earlier phases | A |

---

## 9. Readiness gate run 3 · decisions of 2026-10-21

**Recorded:** 2026-10-21 (Colombia time) · **Decided by:** Juan Esteban Ruiz Ome (Architect and Reviewer), by selecting one option from a list for each question.
**How the decisions were taken.** The third run of the BMad readiness skill (`planning/implementation-readiness-report-solu2-run3.md`, run by an independent agent) returned NOT READY with 1 Critical, 10 Major and 10 Minor findings, worse than run 2 although the package had improved; each auditor reads differently. The AI put five questions to Juan; the AI wrote the option texts; Juan selected one for each. DL-53 was decided earlier the same day and is recorded here. No motive beyond the selected option and the reason given with it is recorded. The options are in the third Appendix B addition at the end of this file.
**Distribution.** 5 entries (`DL-49`…`DL-53`), all ACCEPTED. The log has 53 entries in total. DL-47 stays "pending confirmation by Juan".
**Fields required by the course template** appear in the first line of each entry: Phase | Persona / Skill | Prompt summary | Decision | Artifact changed | Decided by.

### DL-49 — no story builds a user interface (CRIT-1 of run 3)
- **Phase 5 | Orchestrator review of the readiness gate (run 3) | "Act on the findings of the readiness gate run 3 (NOT READY)" | ACCEPTED | `planning/epics.md`, `test/story-index.json`, `planning/criteria-test-map.md` | Juan Esteban Ruiz Ome (option selected on 2026-10-21).**
- **Proposal.** No story builds any user interface, although `planning/prd.md` FR-14 (line 438) and section 3.1 (line 84) make the evaluator and the freeze console a deliverable of M2. Options: A a new epic 5 with interface stories; B reduce FR-14 to the API only (needs an edit of the protected PRD and contradicts DL-48); C leave it as a signed concern (the Critical stays for any auditor that reads the PRD completely).
- **Status.** ACCEPTED (option A).
- **Rationale.** Reason given with the choice: 4 stories derived from `ux/EXPERIENCE.md` (evaluator, freeze console, rule catalogue, CLI) with accessibility and responsive criteria and planned tests (no interface code, Stop-Point); it does not touch the PRD or the UX.
- **What was kept.** Epic 5 with stories 5.1 (evaluator, UX-1), 5.2 (freeze console, UX-4, 390 px), 5.3 (rule catalogue, UX-2) and 5.4 (CLI and API Explorer, UX-6 and UX-5). The journal surface (UX-3) and the command `aegis journal` are out, with the reason NG-10 and DL-41. Accessibility and responsive criteria come from `ux/EXPERIENCE.md` lines 302–331. The open UX divergences are excluded from the stories. No interface code and no interface red test: the package has no interface test infrastructure, so the tests are planned (`UI-EVAL-1` to `UI-EVAL-4`, `UI-FRZ-1` to `UI-FRZ-4`, `UI-RULES-1`, `UI-RULES-2`, `UI-CLI-1` to `UI-CLI-3`).
- **Falsifier.** An interface story is declared done with a planned test that was never written, or the UX files change in a way that makes a story criterion false.
- **Trace.** `planning/epics.md` epic 5; `planning/criteria-test-map.md`; `ARCHITECTURE.md` §15.10.

### DL-50 — the requirement over the precedence table (MAJ-1 and MAJ-2 of run 3)
- **Phase 5 | Orchestrator review of the readiness gate (run 3) | "Act on the findings of the readiness gate run 3 (NOT READY)" | ACCEPTED | `planning/ARCHITECTURE.md` §15.4 and §15.11, `planning/detailed-design/contracts.md`, `test/atdd/m2_contracts.test.ts`, `planning/epics.md` | Juan Esteban Ruiz Ome (option selected on 2026-10-21).**
- **Proposal.** `R-BOUND-01` (precedence 13) precedes `R-QUOTA-01` (14), so with remaining 0 and a time boundary the request is admitted with a `HARD_DEADLINE`, while FR-8 says 100 % DENY; and `R-FRZ-02` (precedence 2) is terminal, so the six rules that FR-2 says must still deny are never evaluated (story 3.5 criterion 4 could not be satisfied). Options: A the requirement of the FR wins, fail closed; B the precedence table wins and FR-8 and FR-2 are rewritten as "when the rule is reached" (it admits with zero quota if a boundary applies); C leave it open as a concern (the Major stays).
- **Status.** ACCEPTED (option A).
- **Rationale.** Reason given with the choice: a ruling in ARCHITECTURE section 15: DENY by quota, tier and authorisation dominate BOUND and FRZ-02 even though the table orders them later; criteria are corrected and one red test is added per case; the safe side: a policy engine must not admit with zero quota or an unauthorised actor.
- **What was kept.** `R-QUOTA-01` dominates `R-BOUND-01`; the six rules of FR-2 dominate `R-FRZ-02`; the overridden `CONSTRAIN` rule is `NOT_EVALUATED` and listed in `suppressed[]` (three states, no fourth). The PRD is unchanged and the deviation from its section 6.2 is an erratum in `ARCHITECTURE.md` §15.4. Two red tests: `EV-QBOUND-01` and `EV-FRZ-03` (a third test was not needed). Criteria corrected in stories 2.3 and 3.5; `contracts.md` has a note in the evaluate contract.
- **Falsifier.** The `Decision` constructor of the implementation rejects a `NOT_EVALUATED` rule that precedes the primary rule, or the effect on gate AG-9 (`planning/prd.md` line 550) turns out to break the subsumption check.
- **Trace.** `ARCHITECTURE.md` §15.4 and §15.11; `contracts.md` evaluateRequest note; `EV-QBOUND-01`, `EV-FRZ-03`; DL-40, DL-44.

### DL-51 — PRD and UX stay protected (confirms DL-48)
- **Phase 5 | Orchestrator review of the readiness gate (run 3) | "Act on the findings of the readiness gate run 3 (NOT READY)" | ACCEPTED | `planning/accepted-concerns.md` | Juan Esteban Ruiz Ome (option selected on 2026-10-21).**
- **Proposal.** Findings MAJ-3, MAJ-4, MAJ-6 and MAJ-7 of run 3 come from the PRD and the UX themselves (19 or 21 rules, four or three states, Go or TypeScript, 7 UX divergences, open decisions). Options: A keep both protected and keep signed concerns (this confirms DL-48); B unprotect the PRD and the UX to correct them (errata edits and recalculated protected hashes; the AI had not verified whether the assignment statement allows modifying the Plan-2 artefacts).
- **Status.** ACCEPTED (option A).
- **Rationale.** Reason given with the choice: everything in our own files is corrected (stories, dependencies, criteria, stale text); the rest stays as concerns with mitigation; the final verdict may not reach READY but it is honest and traceable.
- **What was kept.** `planning/accepted-concerns.md` rewritten with the finding ids of run 3, sign-off blank, owner "Juan Esteban Ruiz Ome (to confirm)". The protected files are untouched.
- **Falsifier.** A later reading of the assignment statement allows or requires editing the Plan-2 artefacts.
- **Trace.** `planning/accepted-concerns.md`; DL-48.

### DL-52 — closing the gate cycle after fix round 5
- **Phase 5 | Orchestrator review of the readiness gate (run 3) | "Act on the findings of the readiness gate run 3 (NOT READY)" | ACCEPTED | `prompts/NEXT.md` plan (no file changed by this entry) | Juan Esteban Ruiz Ome (option selected on 2026-10-21).**
- **Proposal.** Options: A one gate run 4 with complete reading and then close, whatever the verdict; B iterate until READY (no round limit; with the PRD and the UX protected it is unlikely to converge); C close now with run 3 as the verdict (no more fixes or gates; final verdict NOT READY with concerns).
- **Status.** ACCEPTED (option A).
- **Rationale.** Reason given with the choice: the auditor must read the PRD, ARCHITECTURE section 15, contracts and epics completely (gate 3 left most of the architecture unopened and reported G-01 to G-10 as open although they are closed in section 15.2); the skill's verdict is reported as is, with concerns signed by Juan.
- **What was kept.** A run 4 follows this fix round; its verdict is reported as the skill gives it and the cycle closes after it.
- **Falsifier.** Run 4 again leaves most of the architecture unread, which would make its verdict as weak as run 3.
- **Trace.** `ai-log/decision-log-solu2.md` this entry; `planning/phase-5-readiness-report.md` (verdict history).

### DL-53 — FR-15 lint and the gate reports
- **Phase 5 | Orchestrator review of the readiness gate (run 3) | "Act on the findings of the readiness gate run 3 (NOT READY)" | ACCEPTED | `test/ci/readiness.mjs` | Juan Esteban Ruiz Ome (option selected on 2026-10-21, decided earlier the same day and recorded now).**
- **Proposal.** The FR-15 delta lint failed because the verbatim gate reports quote PRD words and findings. Options: A a documented exception in `readiness.mjs` for the gate reports; B a baseline entry for each report (same effect, to be updated every run); C rewrite the words in the reports (alters the report that supports the verdict).
- **Status.** ACCEPTED (option A).
- **Rationale.** Reason given with the choice: the lint excludes the files `implementation-readiness-report-solu2*.md` (verbatim skill output that quotes the PRD); recorded with its reason; the skill output is not rewritten, so the verdict stays intact.
- **What was kept.** `test/ci/readiness.mjs` exempts exactly `planning/implementation-readiness-report-solu2.md` and `planning/implementation-readiness-report-solu2-run<N>.md` from the delta lint, with a comment citing this entry; nothing else is exempted. The reports and the baseline file are not edited.
- **Falsifier.** A file other than a verbatim skill output is added to the exempt pattern, or a new banned term enters through those files into a document that is not a verbatim report.
- **Trace.** `test/ci/readiness.mjs` (constant `GATE_REPORT`); DL-24, DL-34.

---

## Appendix B (third addition) — questions and options of 2026-10-21, after gate run 3

The option texts were written by the AI; the person selected one. No motive beyond the selected option is recorded. Chosen options are marked.

| Id | Question | Options | Option chosen |
|---|---|---|---|
| DL-49 | CRIT-1: no story builds any UI, although FR-14 (`prd.md` line 438) and section 3.1 (line 84) make the evaluator and the freeze console a deliverable of M2 | A. A new epic 5 with UI stories. B. Reduce FR-14 to the API only: needs editing the protected PRD, contradicts DL-48. C. Leave it as a signed concern: the Critical stays for any auditor that reads the PRD completely | A |
| DL-50 | MAJ-1 and MAJ-2: `R-BOUND-01` (13) precedes `R-QUOTA-01` (14), so with remaining 0 and a time boundary the request is admitted with `HARD_DEADLINE` while FR-8 says 100 % DENY; `R-FRZ-02` (2) is terminal, so the six rules of FR-2 are never evaluated | A. The FR requirement wins, fail closed. B. The precedence table wins: rewrite FR-8 and FR-2 as "when the rule is reached"; admits with zero quota if a boundary applies. C. Leave it open as a concern: record the contradiction as an erratum; the Major stays | A |
| DL-51 | MAJ-3, 4, 6, 7: findings that come from the PRD and the UX themselves (19 or 21 rules, 4 or 3 states, Go or TypeScript, 7 UX divergences, open decisions) | A. Keep them protected, signed concerns (confirms DL-48). B. Unprotect the PRD and the UX to correct them: errata edits and recalculated protected hashes; the AI had not verified whether the assignment statement allows modifying the Plan-2 artefacts | A |
| DL-52 | Closing the gate cycle after fix round 5 | A. One gate run 4 with complete reading, then close whatever the verdict. B. Iterate until READY: no round limit, unlikely to converge with PRD and UX protected. C. Close now with run 3 as the verdict: no more fixes or gates | A |
| DL-53 | FR-15 lint and the gate reports: the lint fails because the verbatim reports quote PRD words and findings | A. A documented exception in `readiness.mjs` for the gate reports. B. A baseline entry for each report: same effect, must be updated every run. C. Rewrite the words in the reports: alters the report that supports the verdict | A |

---

## 10. Readiness gate run 4 · decisions of 2026-10-21

**Recorded:** 2026-10-21 (Colombia time) · **Decided by:** Juan Esteban Ruiz Ome (Architect and Reviewer), by the standing instruction to take the option marked Recommended.
**How the decisions were taken.** The fourth run of the BMad readiness skill (`planning/implementation-readiness-report-solu2-run4.md`, run by an independent agent that read 37 files completely) returned NEEDS WORK with 3 Critical, 14 Major and 12 Minor findings. DL-52 had fixed that the cycle closes after run 4. The AI put two questions; the AI wrote the option texts (file `prompts/ref/dl54-55-options.md`); the option marked Recommended was chosen for each by the standing instruction of Juan Esteban Ruiz Ome. No motive beyond that instruction and the reason given with the option is recorded. The options are in the fourth Appendix B addition at the end of this file.
**Distribution.** 2 entries (`DL-54`, `DL-55`), both ACCEPTED. The log has 55 entries in total. DL-47 stays "pending confirmation by Juan".
**Fields required by the course template** appear in the first line of each entry: Phase | Persona / Skill | Prompt summary | Decision | Artifact changed | Decided by.

### DL-54 — the named NP-9 case over the general invariant (C-1 of run 4)
- **Phase 5 | Orchestrator review of the readiness gate (run 4) | "Triage the 29 findings of the readiness gate run 4 (NEEDS WORK)" | ACCEPTED | `planning/ARCHITECTURE.md` §15.4 and §15.12, `planning/detailed-design/contracts.md`, both SQL files, `planning/detailed-design/schemas/dto.ts`, `planning/epics.md`, `test/atdd/m2_domain.test.ts` | Juan Esteban Ruiz Ome (option selected on 2026-10-21 by the standing instruction to take the Recommended option).**
- **Proposal.** `planning/prd.md` lines 297–298, `ARCHITECTURE.md` line 591, `contracts.md` Q1 and I4 and the SQL `CHECK`s require `valid_until` strictly later than `evaluated_at` for every `ALLOW` and `CONSTRAIN`; the NP-9 guard (`planning/prd.md` lines 393 and 514) emits an `ALLOW` with `valid_until = campus_now`. Options: A the named NP-9 case wins over the general invariant; B the general rule wins and the NP-9 guard is changed to `DENY` or to a bound at `campus_now` plus a minimum (contradicts a named PRD case); C leave it as a signed concern (the Critical stays).
- **Status.** ACCEPTED (option A).
- **Rationale.** Reason given with the choice: the specific named case wins over the general invariant: `valid_until >= evaluated_at`, strictly later except the NP-9 guard where it equals `campus_now`; contracts Q1 and I4, the SQL `CHECK`s and the affected tests are aligned; recorded as a ruling in `ARCHITECTURE.md` section 15 and an erratum for PRD 6.1 and 6.3. Chosen by the standing instruction to take the Recommended option.
- **What was kept.** Ruling in `ARCHITECTURE.md` §15.12; erratum in §15.4 (the PRD and lines 1–1075 are not edited); `contracts.md` Q1, I4 and the `M2-AD-3` row; both `CHECK`s admit equality only for `outcome = 'ALLOW'` (a `CHECK` cannot require the `WINDOW_SCOPE` constraint, which the constructor enforces); `dto.ts` comment; story 2.1 criterion 11; one red test, `DM-NP9` (oracle `planning/prd.md` lines 393 and 514). No existing test asserted the strict inequality for the guard case, so no assertion was changed. Not decided: whether `must_checkpoint_by` is set in the guard case.
- **Falsifier.** The `Decision` constructor of the implementation rejects the guard `ALLOW`, or a `CONSTRAIN` is produced with `valid_until = evaluated_at`, or the PRD is later edited to settle the contradiction the other way.
- **Trace.** `ARCHITECTURE.md` §15.4 and §15.12; `contracts.md` lines 38, 47 and 215; `DM-NP9`; `planning/run4-triage.md` row C-1.

### DL-55 — triage of the 29 findings of run 4 without another fix-and-gate loop
- **Phase 5 | Orchestrator review of the readiness gate (run 4) | "Triage the 29 findings of the readiness gate run 4 (NEEDS WORK)" | ACCEPTED | `planning/run4-triage.md`, `planning/accepted-concerns.md`, `planning/epics.md`, `planning/ARCHITECTURE.md` §15.4 and §15.7 | Juan Esteban Ruiz Ome (option selected on 2026-10-21 by the standing instruction to take the Recommended option).**
- **Proposal.** Run 4 returned 3 Critical, 14 Major and 12 Minor findings. Options: A triage: correct what is in our files, the rest as a signed concern or a signed exemption; B iterate another cycle of fix and gate (the PRD and the UX stay protected, so it is unlikely to converge); C close with the run-4 report without triage (no fixes, no concerns update).
- **Status.** ACCEPTED (option A).
- **Rationale.** Reason given with the choice: own-file defects (counts, stale text, dependencies, wording) are fixed; anything that needs editing the protected PRD, UX or `ARCHITECTURE.md` lines 1–1075 becomes an erratum or an accepted concern with mitigation, owner, target and Juan's signature cell; C-2 (DL-50 against the PRD first-match model) becomes a signed exemption, which the auditor itself lists as an acceptable closure. Chosen by the standing instruction to take the Recommended option.
- **What was kept.** `planning/run4-triage.md` with 29 rows: FIXED 6, ERRATUM 7, ACCEPTED CONCERN 14, SIGNED EXEMPTION 1, NEEDS DECISION 1. `planning/accepted-concerns.md` has a "Run-4 ids" column, five new rows (RUN4-A to RUN4-E) and every sign-off cell blank. Design gaps that need a human ruling were not decided. No new gate run was made.
- **Falsifier.** A finding classed as an accepted concern turns out to be correctable inside a file of this package, or an erratum contradicts a later edit of a protected file.
- **Trace.** `planning/run4-triage.md`; `planning/accepted-concerns.md`; DL-48, DL-51, DL-52.

---

## Appendix B (fourth addition) — questions and options of 2026-10-21, after gate run 4

The option texts were written by the AI; the person selected one (here, by the standing instruction to take the option marked Recommended). No motive beyond the selected option is recorded. Chosen options are marked.

| Id | Question | Options | Option chosen |
|---|---|---|---|
| DL-54 | C-1: `planning/prd.md` lines 297–298 and `ARCHITECTURE.md` line 591 (also `contracts.md` Q1 and I4) require `valid_until` strictly later than `evaluated_at`; the NP-9 guard (`planning/prd.md` lines 393 and 514) emits an `ALLOW` with `valid_until = campus_now` | A. The named NP-9 case wins over the general rule: `valid_until >= evaluated_at`, strictly later except the NP-9 guard; contracts, SQL `CHECK`s and affected tests aligned; ruling in section 15 and an erratum for PRD 6.1 and 6.3 (Recommended). B. The general rule wins: change the NP-9 guard to `DENY` or to a bound at `campus_now` plus a minimum; contradicts a named PRD case. C. Leave it as a signed concern: the Critical stays | A |
| DL-55 | Triage of the 29 findings of run 4 (3 Critical, 14 Major, 12 Minor) without another fix-and-gate loop | A. Triage: correct what is in our files, the rest as a signed concern or a signed exemption (Recommended). B. Iterate another cycle of fix and gate: PRD and UX stay protected, unlikely to converge. C. Close with the run-4 report without triage: no fixes, no concerns update | A |

---

## 11. Assignment limits on epics and stories · decision of 2026-10-21

**Recorded:** 2026-10-21 (Colombia time) · **Decided by:** Juan Esteban Ruiz Ome (Architect and Reviewer), by the standing instruction to take the option marked Recommended.
**How the decision was taken.** The finding was made by the orchestrator while preparing a drill, not by an auditor: the statement of the course (`Material del Curso/task-solu2_UniversityAICompute_Workshop.pdf`, row "Output" of the module table and rubric component 4, as quoted in the task file; the PDF was not re-read by the author of this entry) requires 3–4 epics and 9–16 stories in `planning/epics.md`. After DL-49 (epic 5) and the splits of DL-42, DL-45 and DL-46 the package had 5 epics and 19 stories. The orchestrator had approved those splits without checking the upper bound. The AI wrote the option texts (file `prompts/ref/dl56-options.md`); the option marked Recommended was chosen by the standing instruction. No motive beyond that instruction and the reason given with the option is recorded. The options are in the fifth Appendix B addition at the end of this file.
**Distribution.** 1 entry (`DL-56`), ACCEPTED. The log has 56 entries in total. DL-47 stays "pending confirmation by Juan".
**Fields required by the course template** appear in the first line of the entry: Phase | Persona / Skill | Prompt summary | Decision | Artifact changed | Decided by.

### DL-56 — back to 4 epics and 16 stories
- **Phase 5 | Orchestrator check of the assignment limits (after gate run 4) | "Return epics.md to the limits of the statement (3–4 epics, 9–16 stories)" | ACCEPTED | `planning/epics.md`, `test/story-index.json`, `test/traceability-matrix.md`, `planning/criteria-test-map.md`, `test/nfr-evidence.md`, `planning/ux-state-contract-map.md`, `planning/accepted-concerns.md`, `planning/run4-triage.md`, `test/ci/readiness.mjs` | Juan Esteban Ruiz Ome (option selected on 2026-10-21 by the standing instruction to take the Recommended option).**
- **Proposal.** Amends the structure created by DL-49 (epic 5 with four interface stories) and DL-42 (story 4.2 split, new story 4.4 as a technical enabler); neither entry is rewritten. Options: A dissolve epic 5 and merge: the interface into 3.6 (freeze console) and 4.4 (evaluator, rule catalogue, CLI and API Explorer), and the measurement plans (the former 4.4) into 4.2 as plan criteria; B remove the interface and return to 15 stories (contradicts DL-49 and leaves the Critical about the interface); C keep 5 epics and 19 stories and document it (breaks a stated requirement of the assignment).
- **Status.** ACCEPTED (option A).
- **Rationale.** Reason given with the choice: it keeps the interface coverage that DL-49 added and every split that DL-45 and DL-46 justified, removes the old technical-enabler story (no user value) by folding its measurement plan into 4.2, and meets the 9–16 limit exactly. Chosen by the standing instruction to take the Recommended option.
- **What was kept.** 4 epics and 16 stories (3 + 3 + 6 + 4), every dependency backward. Story 3.6 is the former 5.2 (depends on 3.1 to 3.5). Story 4.4 is the former 5.1, 5.3 and 5.4 (nine criteria, planned ids `UI-EVAL-*`, `UI-RULES-*`, `UI-CLI-*` kept; depends on 1.1, 1.2, 2.2, 3.1, 4.1, 4.3). The former technical enabler 4.4 is criteria 7 to 9 of story 4.2 (same planned artefact paths; criterion 9 is the exit criterion). 86 criteria. Journal and `aegis journal` stay out (NG-10, DL-41). No production code and no test was added; the red tests stay 61. Recorded in `ARCHITECTURE.md` §15.13.
- **Falsifier.** The statement of the course turns out to allow more than 16 stories, or a later change splits a story again and the count leaves the 9–16 range.
- **Trace.** `ARCHITECTURE.md` §15.13; `planning/epics.md`; `test/ci/readiness.mjs` (expects 4 epics and 16 stories); DL-42, DL-45, DL-46, DL-49.

---

## Appendix B (fifth addition) — questions and options of 2026-10-21, after the check of the assignment limits

The option texts were written by the AI; the person selected one (here, by the standing instruction to take the option marked Recommended). No motive beyond the selected option is recorded. Chosen options are marked.

| Id | Question | Options | Option chosen |
|---|---|---|---|
| DL-56 | How to return to 3–4 epics and at most 16 stories (the package had 5 epics and 19 stories after DL-49 and the splits of DL-42, DL-45 and DL-46) | A. Dissolve epic 5 and merge: the interface into 3.6 (freeze console) and 4.4 (evaluator, rule catalogue, CLI and API Explorer); the measurement plans (the former 4.4) move to 4.2 as plan criteria. Result: 4 epics, 16 stories (3+3+6+4), all dependencies backward (Recommended). B. Remove the interface and return to 15 stories: contradicts DL-49 and leaves the Critical about the interface. C. Keep 5 epics and 19 stories and document it: breaks a stated requirement of the assignment | A |


## 12. Per-epic bound correction · 2026-10-21
Distribution: 57 entries total; DL-47 remains pending until P5-FINAL-1.

### DL-57 — move freeze console to Epic 4
- **Phase 5 | Assignment structure review | Fix 3–5 stories per epic | ACCEPTED | epics, indexes, readiness gate | Decided by Juan Esteban Ruiz Ome, 2026-10-21.**
- **Proposal.** Move console story 3.6 to 4.5; amends DL-56's structure.
- **Status.** ACCEPTED, option A, chosen by the standing instruction to take the Recommended option.
- **Rationale.** The console is an operating surface in Epic 4; it depends only on 3.1–3.5. Nothing else is renumbered.
- **What was kept.** 16 stories, 86 criteria, 61 red tests; distribution 3,3,5,5. Gate now checks all three assignment bounds.
- **Falsifier.** Any epic has fewer than three or more than five stories.
- **Trace.** planning/epics.md; test/story-index.json; test/ci/readiness.mjs.

## Appendix B — DL-57 options (option texts written by the AI)
| Id | A (Recommended; chosen) | B | C |
|---|---|---|---|
| DL-57 | Move console 3.6 to 4.5 | Merge 3.5 into 3.3, undo DL-46 | Keep six stories in Epic 3, violates assignment |


## Phase 5 completion record · DL-58 · 2026-10-22
Current total: 58 decision entries.

### DL-58 — Preserve the sprint skill output
- **Phase 5 | Handover completion | Preserve the sprint skill output | ACCEPTED | test/ci/readiness.mjs; implementation-artifacts/sprint-status.yaml; test/evidence/gate-runs/sprint-planning-terminal.txt | Decided by Juan Esteban Ruiz Ome, 2026-10-22.**
- **Proposal.** The structural gate validates the skill-generated sprint YAML instead of writing a draft.
- **Status.** ACCEPTED; taken under the standing rule to follow the Recommended option.
- **Rationale.** The file must come from the skill; repeated checks must preserve its bytes.
- **What was kept.** The structural gate validates the skill-generated sprint YAML instead of writing a draft.
- **Falsifier.** The evidence named in Trace contradicts this record.
- **Trace.** test/ci/readiness.mjs; implementation-artifacts/sprint-status.yaml; test/evidence/gate-runs/sprint-planning-terminal.txt

## Appendix B — DL-58 (option texts written by the AI)
| Id | Options | Choice |
|---|---|---|
| DL-58 | A. Apply the documented correction (Recommended); B. retain the existing state. | A (Recommended; standing instruction) |


## Phase 5 completion record · DL-59 · 2026-10-22
Current total: 59 decision entries.

### DL-59 — TEA TR-01 Accept
- **Phase 5 | Handover completion | TEA TR-01 Accept | ACCEPTED | reviews/review-tea-skills.md; test/atdd/m2_contracts.test.ts: AC-I1 | Decided by Juan Esteban Ruiz Ome, 2026-10-22.**
- **Proposal.** The seven rejection reasons are asserted as one array, with the seven-error count kept.
- **Status.** ACCEPTED; taken under the standing rule to follow the Recommended option.
- **Rationale.** Cheap test-only correction; every expected outcome remains asserted. The seven rejection reasons are asserted as one array, with the seven-error count kept.
- **What was kept.** The seven rejection reasons are asserted as one array, with the seven-error count kept.
- **Falsifier.** The evidence named in Trace contradicts this record.
- **Trace.** reviews/review-tea-skills.md; test/atdd/m2_contracts.test.ts: AC-I1

## Appendix B — DL-59 (option texts written by the AI)
| Id | Options | Choice |
|---|---|---|
| DL-59 | A. Apply the test-only correction (Recommended); B. retain the finding. | A (Recommended; standing instruction) |


## Phase 5 completion record · DL-60 · 2026-10-22
Current total: 60 decision entries.

### DL-60 — TEA TR-02 Accept
- **Phase 5 | Handover completion | TEA TR-02 Accept | ACCEPTED | reviews/review-tea-skills.md; test/atdd/m2_domain.test.ts: DM-BOUND | Decided by Juan Esteban Ruiz Ome, 2026-10-22.**
- **Proposal.** The end-boundary property now asserts before, equal and after outcomes without an assertion guard.
- **Status.** ACCEPTED; taken under the standing rule to follow the Recommended option.
- **Rationale.** Cheap test-only correction; every expected outcome remains asserted. The end-boundary property now asserts before, equal and after outcomes without an assertion guard.
- **What was kept.** The end-boundary property now asserts before, equal and after outcomes without an assertion guard.
- **Falsifier.** The evidence named in Trace contradicts this record.
- **Trace.** reviews/review-tea-skills.md; test/atdd/m2_domain.test.ts: DM-BOUND

## Appendix B — DL-60 (option texts written by the AI)
| Id | Options | Choice |
|---|---|---|
| DL-60 | A. Apply the test-only correction (Recommended); B. retain the finding. | A (Recommended; standing instruction) |


## Phase 5 completion record · DL-61 · 2026-10-22
Current total: 61 decision entries.

### DL-61 — TEA TR-03 Accept
- **Phase 5 | Handover completion | TEA TR-03 Accept | ACCEPTED | reviews/review-tea-skills.md; test/atdd/m2_domain.test.ts: DM-START | Decided by Juan Esteban Ruiz Ome, 2026-10-22.**
- **Proposal.** The start-boundary property now asserts before, equal and after outcomes without an assertion guard.
- **Status.** ACCEPTED; taken under the standing rule to follow the Recommended option.
- **Rationale.** Cheap test-only correction; every expected outcome remains asserted. The start-boundary property now asserts before, equal and after outcomes without an assertion guard.
- **What was kept.** The start-boundary property now asserts before, equal and after outcomes without an assertion guard.
- **Falsifier.** The evidence named in Trace contradicts this record.
- **Trace.** reviews/review-tea-skills.md; test/atdd/m2_domain.test.ts: DM-START

## Appendix B — DL-61 (option texts written by the AI)
| Id | Options | Choice |
|---|---|---|
| DL-61 | A. Apply the test-only correction (Recommended); B. retain the finding. | A (Recommended; standing instruction) |


## Phase 5 completion record · DL-62 · 2026-10-22
Current total: 62 decision entries.

### DL-62 — TEA TR-04 Accept
- **Phase 5 | Handover completion | TEA TR-04 Accept | ACCEPTED | reviews/review-tea-skills.md; test/atdd/m2_contracts.test.ts | Decided by Juan Esteban Ruiz Ome, 2026-10-22.**
- **Proposal.** Group the application contract tests under a named describe scope.
- **Status.** ACCEPTED; taken under the standing rule to follow the Recommended option.
- **Rationale.** Cheap test-only correction; every expected outcome remains asserted. Group the application contract tests under a named describe scope.
- **What was kept.** Group the application contract tests under a named describe scope.
- **Falsifier.** The evidence named in Trace contradicts this record.
- **Trace.** reviews/review-tea-skills.md; test/atdd/m2_contracts.test.ts

## Appendix B — DL-62 (option texts written by the AI)
| Id | Options | Choice |
|---|---|---|
| DL-62 | A. Apply the test-only correction (Recommended); B. retain the finding. | A (Recommended; standing instruction) |


## Phase 5 completion record · DL-63 · 2026-10-22
Current total: 63 decision entries.

### DL-63 — TEA TR-05 Accept
- **Phase 5 | Handover completion | TEA TR-05 Accept | ACCEPTED | reviews/review-tea-skills.md; test/atdd/m2_domain.test.ts | Decided by Juan Esteban Ruiz Ome, 2026-10-22.**
- **Proposal.** Group the domain tests under a named describe scope.
- **Status.** ACCEPTED; taken under the standing rule to follow the Recommended option.
- **Rationale.** Cheap test-only correction; every expected outcome remains asserted. Group the domain tests under a named describe scope.
- **What was kept.** Group the domain tests under a named describe scope.
- **Falsifier.** The evidence named in Trace contradicts this record.
- **Trace.** reviews/review-tea-skills.md; test/atdd/m2_domain.test.ts

## Appendix B — DL-63 (option texts written by the AI)
| Id | Options | Choice |
|---|---|---|
| DL-63 | A. Apply the test-only correction (Recommended); B. retain the finding. | A (Recommended; standing instruction) |


## Phase 5 completion record · DL-64 · 2026-10-22
Current total: 64 decision entries.

### DL-64 — TEA TR-06 Accept
- **Phase 5 | Handover completion | TEA TR-06 Accept | ACCEPTED | reviews/review-tea-skills.md; test/fixtures/index.ts; test/atdd/m2_contracts.test.ts | Decided by Juan Esteban Ruiz Ome, 2026-10-22.**
- **Proposal.** Build fresh timetable, catalogue and access facts through fixture factories, with scenario overrides visible.
- **Status.** ACCEPTED; taken under the standing rule to follow the Recommended option.
- **Rationale.** Cheap test-only correction; every expected outcome remains asserted. Build fresh timetable, catalogue and access facts through fixture factories, with scenario overrides visible.
- **What was kept.** Build fresh timetable, catalogue and access facts through fixture factories, with scenario overrides visible.
- **Falsifier.** The evidence named in Trace contradicts this record.
- **Trace.** reviews/review-tea-skills.md; test/fixtures/index.ts; test/atdd/m2_contracts.test.ts

## Appendix B — DL-64 (option texts written by the AI)
| Id | Options | Choice |
|---|---|---|
| DL-64 | A. Apply the test-only correction (Recommended); B. retain the finding. | A (Recommended; standing instruction) |


## Phase 5 completion record · DL-65 · 2026-10-22
Current total: 65 decision entries.

### DL-65 — TEA TR-07 Accept
- **Phase 5 | Handover completion | TEA TR-07 Accept | ACCEPTED | reviews/review-tea-skills.md; test/fixtures/index.ts; test/atdd/m2_domain.test.ts | Decided by Juan Esteban Ruiz Ome, 2026-10-22.**
- **Proposal.** Build fresh protected windows through a factory, preserving each scenario boundary.
- **Status.** ACCEPTED; taken under the standing rule to follow the Recommended option.
- **Rationale.** Cheap test-only correction; every expected outcome remains asserted. Build fresh protected windows through a factory, preserving each scenario boundary.
- **What was kept.** Build fresh protected windows through a factory, preserving each scenario boundary.
- **Falsifier.** The evidence named in Trace contradicts this record.
- **Trace.** reviews/review-tea-skills.md; test/fixtures/index.ts; test/atdd/m2_domain.test.ts

## Appendix B — DL-65 (option texts written by the AI)
| Id | Options | Choice |
|---|---|---|
| DL-65 | A. Apply the test-only correction (Recommended); B. retain the finding. | A (Recommended; standing instruction) |


## Phase 5 completion record · DL-66 · 2026-10-22
Current total: 66 decision entries.

### DL-66 — TEA TR-G01 Defer
- **Phase 5 | Handover completion | TEA TR-G01 Defer | DEFERRED | reviews/review-tea-skills.md; Not fixed; all affected ACs retained in trace report and matrix. | Decided by Juan Esteban Ruiz Ome, 2026-10-22.**
- **Proposal.** Add the named planned unit/property tests (including THESIS, scoped schedules, daemon exemption, import/I/O guards, canonical replay, poisoned data and port fail-mode classification), using the documented PRD/contracts outcomes. Preserve fixed clocks and independent expected values.
- **Status.** DEFERRED; taken under the standing rule to follow the Recommended option.
- **Rationale.** Owner for follow-up: Tomás (test/harness preparation), Juan (unsettled oracle); no agreed deadline. The grouped gap includes import and no-I/O guards, a 10,000-replay observation, port payload schemas and cross-scope fixtures beyond the current stub seams. Creating those harness contracts now would introduce new assumptions; keep named domain examples with their implementation stories and add them before those stories close. Closing condition: Add the named planned unit/property tests (including THESIS, scoped schedules, daemon exemption, import/I/O guards, canonical replay, poisoned data and port fail-mode classification), using the documented PRD/contracts outcomes. Preserve fixed clocks and independent expected values.
- **What was kept.** Add the named planned unit/property tests (including THESIS, scoped schedules, daemon exemption, import/I/O guards, canonical replay, poisoned data and port fail-mode classification), using the documented PRD/contracts outcomes. Preserve fixed clocks and independent expected values.
- **Falsifier.** The evidence named in Trace contradicts this record.
- **Trace.** reviews/review-tea-skills.md; Not fixed; all affected ACs retained in trace report and matrix.

## Appendix B — DL-66 (option texts written by the AI)
| Id | Options | Choice |
|---|---|---|
| DL-66 | A. Defer until implementation and its harness exist (Recommended); B. exceed the stop-point now. | A (Recommended; standing instruction) |


## Phase 5 completion record · DL-67 · 2026-10-22
Current total: 67 decision entries.

### DL-67 — TEA TR-G02 Defer
- **Phase 5 | Handover completion | TEA TR-G02 Defer | DEFERRED | reviews/review-tea-skills.md; Not fixed; all affected ACs retained in trace report and matrix. | Decided by Juan Esteban Ruiz Ome, 2026-10-22.**
- **Proposal.** Implement a public API test harness in the implementation phase. Given documented valid/invalid requests and session roles, call each endpoint and assert documented status/body and no-write outcomes. Keep unauthenticated status unspecified until architecture fixes it; do not invent publish authorization/status. Suggested stable IDs: existing HR-Q1/HR-P1/AUTH-U-1/FD-Q1/FZ-READ-1/FZ-READ-2/LF-P4/RV-Q1/RV-P1, plus API variants of mapped existing IDs.
- **Status.** DEFERRED; taken under the standing rule to follow the Recommended option.
- **Rationale.** Owner for follow-up: Tomás (test/harness preparation), Juan (unsettled oracle); no agreed deadline. The closure needs implementation or the missing API, UI, measurement or database/commit harness; the current task permits stubs and test corrections only. Closing condition: Implement a public API test harness in the implementation phase. Given documented valid/invalid requests and session roles, call each endpoint and assert documented status/body and no-write outcomes. Keep unauthenticated status unspecified until architecture fixes it; do not invent publish authorization/status. Suggested stable IDs: existing HR-Q1/HR-P1/AUTH-U-1/FD-Q1/FZ-READ-1/FZ-READ-2/LF-P4/RV-Q1/RV-P1, plus API variants of mapped existing IDs.
- **What was kept.** Implement a public API test harness in the implementation phase. Given documented valid/invalid requests and session roles, call each endpoint and assert documented status/body and no-write outcomes. Keep unauthenticated status unspecified until architecture fixes it; do not invent publish authorization/status. Suggested stable IDs: existing HR-Q1/HR-P1/AUTH-U-1/FD-Q1/FZ-READ-1/FZ-READ-2/LF-P4/RV-Q1/RV-P1, plus API variants of mapped existing IDs.
- **Falsifier.** The evidence named in Trace contradicts this record.
- **Trace.** reviews/review-tea-skills.md; Not fixed; all affected ACs retained in trace report and matrix.

## Appendix B — DL-67 (option texts written by the AI)
| Id | Options | Choice |
|---|---|---|
| DL-67 | A. Defer until implementation and its harness exist (Recommended); B. exceed the stop-point now. | A (Recommended; standing instruction) |


## Phase 5 completion record · DL-68 · 2026-10-22
Current total: 68 decision entries.

### DL-68 — TEA TR-G03a Accept
- **Phase 5 | Handover completion | TEA TR-G03a Accept | ACCEPTED | reviews/review-tea-skills.md; test/atdd/m2_contracts.test.ts: EV-Q1, AC-I1, EV-FRZ-03 | Decided by Juan Esteban Ruiz Ome, 2026-10-22.**
- **Proposal.** Add the named checks while retaining every existing assertion and all 61 IDs.
- **Status.** ACCEPTED; taken under the standing rule to follow the Recommended option.
- **Rationale.** Existing DTO and rows expose these checks without an adapter: ALLOW primary rule, one activation audit and token consumption, and the suppressed freeze rule state in both denial cases.
- **What was kept.** Add the named checks while retaining every existing assertion and all 61 IDs.
- **Falsifier.** The evidence named in Trace contradicts this record.
- **Trace.** reviews/review-tea-skills.md; test/atdd/m2_contracts.test.ts: EV-Q1, AC-I1, EV-FRZ-03

## Appendix B — DL-68 (option texts written by the AI)
| Id | Options | Choice |
|---|---|---|
| DL-68 | A. Apply the test-only correction (Recommended); B. retain the finding. | A (Recommended; standing instruction) |


## Phase 5 completion record · DL-69 · 2026-10-22
Current total: 69 decision entries.

### DL-69 — TEA TR-G03b Defer
- **Phase 5 | Handover completion | TEA TR-G03b Defer | DEFERRED | reviews/review-tea-skills.md; Not fixed; all affected ACs retained in trace report and matrix. | Decided by Juan Esteban Ruiz Ome, 2026-10-22.**
- **Proposal.** Complete the source-specific missing assertions listed per AC: minimal rule registry, boot denial, fan-out/40ms cancellation, clock-with-no-instant, M8 mutation boundary, consumed token/audit, partial closing rollback, suppressed R-FRZ-02, retry and idempotent event delivery. Use tests at domain, boot/integration and adapter levels as each clause requires.
- **Status.** DEFERRED; taken under the standing rule to follow the Recommended option.
- **Rationale.** Owner for follow-up: Tomás (test/harness preparation), Juan (unsettled oracle); no agreed deadline. The closure needs implementation or the missing API, UI, measurement or database/commit harness; the current task permits stubs and test corrections only. Closing condition: Complete the source-specific missing assertions listed per AC: minimal rule registry, boot denial, fan-out/40ms cancellation, clock-with-no-instant, M8 mutation boundary, consumed token/audit, partial closing rollback, suppressed R-FRZ-02, retry and idempotent event delivery. Use tests at domain, boot/integration and adapter levels as each clause requires.
- **What was kept.** Complete the source-specific missing assertions listed per AC: minimal rule registry, boot denial, fan-out/40ms cancellation, clock-with-no-instant, M8 mutation boundary, consumed token/audit, partial closing rollback, suppressed R-FRZ-02, retry and idempotent event delivery. Use tests at domain, boot/integration and adapter levels as each clause requires.
- **Falsifier.** The evidence named in Trace contradicts this record.
- **Trace.** reviews/review-tea-skills.md; Not fixed; all affected ACs retained in trace report and matrix.

## Appendix B — DL-69 (option texts written by the AI)
| Id | Options | Choice |
|---|---|---|
| DL-69 | A. Defer until implementation and its harness exist (Recommended); B. exceed the stop-point now. | A (Recommended; standing instruction) |


## Phase 5 completion record · DL-70 · 2026-10-22
Current total: 70 decision entries.

### DL-70 — TEA TR-G04 Defer
- **Phase 5 | Handover completion | TEA TR-G04 Defer | DEFERRED | reviews/review-tea-skills.md; Not fixed; all affected ACs retained in trace report and matrix. | Decided by Juan Esteban Ruiz Ome, 2026-10-22.**
- **Proposal.** When interface implementation is authorized, add the named UI-FRZ/UI-EVAL/UI-RULES/UI-CLI/COPY-01 tests. Given loading, empty, validation, permission and system-error states, exercise the implemented journey and assert visible outcome/accessibility at documented widths. No interface implementation is authorized by this trace run.
- **Status.** DEFERRED; taken under the standing rule to follow the Recommended option.
- **Rationale.** Owner for follow-up: Tomás (test/harness preparation), Juan (unsettled oracle); no agreed deadline. The closure needs implementation or the missing API, UI, measurement or database/commit harness; the current task permits stubs and test corrections only. Closing condition: When interface implementation is authorized, add the named UI-FRZ/UI-EVAL/UI-RULES/UI-CLI/COPY-01 tests. Given loading, empty, validation, permission and system-error states, exercise the implemented journey and assert visible outcome/accessibility at documented widths. No interface implementation is authorized by this trace run.
- **What was kept.** When interface implementation is authorized, add the named UI-FRZ/UI-EVAL/UI-RULES/UI-CLI/COPY-01 tests. Given loading, empty, validation, permission and system-error states, exercise the implemented journey and assert visible outcome/accessibility at documented widths. No interface implementation is authorized by this trace run.
- **Falsifier.** The evidence named in Trace contradicts this record.
- **Trace.** reviews/review-tea-skills.md; Not fixed; all affected ACs retained in trace report and matrix.

## Appendix B — DL-70 (option texts written by the AI)
| Id | Options | Choice |
|---|---|---|
| DL-70 | A. Defer until implementation and its harness exist (Recommended); B. exceed the stop-point now. | A (Recommended; standing instruction) |


## Phase 5 completion record · DL-71 · 2026-10-22
Current total: 71 decision entries.

### DL-71 — TEA TR-G05 Defer
- **Phase 5 | Handover completion | TEA TR-G05 Defer | DEFERRED | reviews/review-tea-skills.md; Not fixed; all affected ACs retained in trace report and matrix. | Decided by Juan Esteban Ruiz Ome, 2026-10-22.**
- **Proposal.** Provide the five measurement harnesses/evidence files specified by test/nfr-evidence.md; run against implementation with recorded equipment, load, seed and original thresholds. Prove an over-threshold result fails its implementation gate. No stub runtime is performance evidence.
- **Status.** DEFERRED; taken under the standing rule to follow the Recommended option.
- **Rationale.** Owner for follow-up: Tomás (test/harness preparation), Juan (unsettled oracle); no agreed deadline. The closure needs implementation or the missing API, UI, measurement or database/commit harness; the current task permits stubs and test corrections only. Closing condition: Provide the five measurement harnesses/evidence files specified by test/nfr-evidence.md; run against implementation with recorded equipment, load, seed and original thresholds. Prove an over-threshold result fails its implementation gate. No stub runtime is performance evidence.
- **What was kept.** Provide the five measurement harnesses/evidence files specified by test/nfr-evidence.md; run against implementation with recorded equipment, load, seed and original thresholds. Prove an over-threshold result fails its implementation gate. No stub runtime is performance evidence.
- **Falsifier.** The evidence named in Trace contradicts this record.
- **Trace.** reviews/review-tea-skills.md; Not fixed; all affected ACs retained in trace report and matrix.

## Appendix B — DL-71 (option texts written by the AI)
| Id | Options | Choice |
|---|---|---|
| DL-71 | A. Defer until implementation and its harness exist (Recommended); B. exceed the stop-point now. | A (Recommended; standing instruction) |


## Phase 5 completion record · DL-72 · 2026-10-22
Current total: 72 decision entries.

### DL-72 — TEA TR-G06 Defer
- **Phase 5 | Handover completion | TEA TR-G06 Defer | DEFERRED | reviews/review-tea-skills.md; Not fixed; all affected ACs retained in trace report and matrix. | Decided by Juan Esteban Ruiz Ome, 2026-10-22.**
- **Proposal.** Add DB-GRANT-1 against the PostgreSQL role and QUOTA-CONC-01 against a simulated atomic M8 commit. Given forbidden UPDATE/DELETE or 100 concurrent commits, assert rejection and remaining/need bound. In-memory SQLite is not equivalent evidence.
- **Status.** DEFERRED; taken under the standing rule to follow the Recommended option.
- **Rationale.** Owner for follow-up: Tomás (test/harness preparation), Juan (unsettled oracle); no agreed deadline. The closure needs implementation or the missing API, UI, measurement or database/commit harness; the current task permits stubs and test corrections only. Closing condition: Add DB-GRANT-1 against the PostgreSQL role and QUOTA-CONC-01 against a simulated atomic M8 commit. Given forbidden UPDATE/DELETE or 100 concurrent commits, assert rejection and remaining/need bound. In-memory SQLite is not equivalent evidence.
- **What was kept.** Add DB-GRANT-1 against the PostgreSQL role and QUOTA-CONC-01 against a simulated atomic M8 commit. Given forbidden UPDATE/DELETE or 100 concurrent commits, assert rejection and remaining/need bound. In-memory SQLite is not equivalent evidence.
- **Falsifier.** The evidence named in Trace contradicts this record.
- **Trace.** reviews/review-tea-skills.md; Not fixed; all affected ACs retained in trace report and matrix.

## Appendix B — DL-72 (option texts written by the AI)
| Id | Options | Choice |
|---|---|---|
| DL-72 | A. Defer until implementation and its harness exist (Recommended); B. exceed the stop-point now. | A (Recommended; standing instruction) |


## Phase 5 completion record · DL-73 · 2026-10-22
Current total: 73 decision entries.

### DL-73 — TEA TR-G07 Accept
- **Phase 5 | Handover completion | TEA TR-G07 Accept | ACCEPTED | reviews/review-tea-skills.md; test/traceability-matrix.md: TEA trace run; check-baseline.log and check-final.log | Decided by Juan Esteban Ruiz Ome, 2026-10-22.**
- **Proposal.** The matrix links the documentary control separately and keeps it outside the acceptance-test count.
- **Status.** ACCEPTED; taken under the standing rule to follow the Recommended option.
- **Rationale.** Cheap matrix clarification: retain DOC-LINT as an auxiliary script control, outside the 61 ATDD cases.
- **What was kept.** The matrix links the documentary control separately and keeps it outside the acceptance-test count.
- **Falsifier.** The evidence named in Trace contradicts this record.
- **Trace.** reviews/review-tea-skills.md; test/traceability-matrix.md: TEA trace run; check-baseline.log and check-final.log

## Appendix B — DL-73 (option texts written by the AI)
| Id | Options | Choice |
|---|---|---|
| DL-73 | A. Apply the test-only correction (Recommended); B. retain the finding. | A (Recommended; standing instruction) |


## Phase 5 completion record · DL-74 · 2026-10-22
Current total: 74 decision entries.

### DL-74 — TEA TR-08 Reject
- **Phase 5 | Handover completion | TEA TR-08 Reject | ACCEPTED | reviews/review-tea-skills.md; No package change; rationale retained here. | Decided by Juan Esteban Ruiz Ome, 2026-10-22.**
- **Proposal.** Reconsider only if browser or Pact tests are introduced.
- **Status.** ACCEPTED; taken under the standing rule to follow the Recommended option.
- **Rationale.** The reviewed files execute under Vitest and call internal ports. Step 1 explicitly skips Playwright loading profiles for other runners; registry run preconditions close M9/L9/M10 when packages are absent. Adding browser or broker packages would not close a defect in this suite.
- **What was kept.** Reconsider only if browser or Pact tests are introduced.
- **Falsifier.** The evidence named in Trace contradicts this record.
- **Trace.** reviews/review-tea-skills.md; No package change; rationale retained here.

## Appendix B — DL-74 (option texts written by the AI)
| Id | Options | Choice |
|---|---|---|
| DL-74 | A. Keep Vitest scope and record why this advice does not apply (Recommended); B. add unrelated browser or broker dependencies. | A (Recommended; standing instruction) |


## Phase 5 completion record · DL-75 · 2026-10-22
Current total: 75 decision entries.

### DL-75 — Confirm DL-47 and concern ownership
- **Phase 5 | Handover completion | Confirm DL-47 and concern ownership | ACCEPTED | ai-log/decision-log-solu2.md DL-47; planning/accepted-concerns.md | Decided by Juan Esteban Ruiz Ome, 2026-10-22.**
- **Proposal.** DL-47 and concern owners are confirmed under the standing instruction of 2026-10-21; sign-off cells remain blank in this task.
- **Status.** ACCEPTED; taken under the standing rule to follow the Recommended option.
- **Rationale.** P5-FINAL-1 part C explicitly chooses confirmation; this records the instruction without inventing a personal rationale.
- **What was kept.** DL-47 and concern owners are confirmed under the standing instruction of 2026-10-21; sign-off cells remain blank in this task.
- **Falsifier.** The evidence named in Trace contradicts this record.
- **Trace.** ai-log/decision-log-solu2.md DL-47; planning/accepted-concerns.md

## Appendix B — DL-75 (option texts written by the AI)
| Id | Options | Choice |
|---|---|---|
| DL-75 | A. Apply the documented correction (Recommended); B. retain the existing state. | A (Recommended; standing instruction) |


## Phase 5 completion record · DL-76 · 2026-10-22
Current total: 76 decision entries.

### DL-76 — Append Solu-2 evidence to the inherited gate report
- **Phase 5 | Handover completion | Append Solu-2 evidence to the inherited gate report | ACCEPTED | planning/readiness-gate-report.md; test/evidence/protected-sha256.json | Decided by Juan Esteban Ruiz Ome, 2026-10-22.**
- **Proposal.** Keep every Plan-2 byte and append Solu-2 evidence; update only its pinned hash.
- **Status.** ACCEPTED; taken under the standing rule to follow the Recommended option.
- **Rationale.** The handover explicitly chooses an append-only Solu-2 section, retaining the literal run5 NOT READY verdict.
- **What was kept.** Keep every Plan-2 byte and append Solu-2 evidence; update only its pinned hash.
- **Falsifier.** The evidence named in Trace contradicts this record.
- **Trace.** planning/readiness-gate-report.md; test/evidence/protected-sha256.json

## Appendix B — DL-76 (option texts written by the AI)
| Id | Options | Choice |
|---|---|---|
| DL-76 | A. Apply the documented correction (Recommended); B. retain the existing state. | A (Recommended; standing instruction) |
