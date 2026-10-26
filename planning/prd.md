---
module: M2 — Academic GPU Policy Engine
tier: Intermediate
artifact: prd.md
phase: 1
status: FINAL (post-adversarial-triage — see reviews/review-prd-adversarial.md, 28 findings, all triaged in §13; and reviews/review-arch-edge-cases.md, 35 findings, dispositions cross-referenced in §6.2.1 and §12)
revision: 3
upstream_inputs:
  - project - university_ai_compute_management_platform_brief.pdf
  - _bmad-output/specs/spec-ai-compute-platform/SPEC.md (CAP-1, CAP-2, CAP-3, CAP-6, CAP-7, CAP-8, CAP-10)
  - _bmad-output/specs/spec-ai-compute-platform/ARCHITECTURE-SPINE.md (AD-1, AD-4, AD-5, AD-6, AD-10, rules 1, 2, 4, 5, 6, 7, 8)
  - Material del Curso/task - plan 2 - university-ai-compute-fabric-1.pdf (Phase 1 instructions)
team: Pair assignment — single module, independent subsystem
---

# PRD — Academic GPU Policy Engine (revision 3)

**Module:** M2 — Academic GPU Policy Engine (Tier: Intermediate)
**Fleet under policy:** 31 single-GPU workstations (24 GB VRAM, 16–32 vCPU, 64 GB RAM, 500 GB NVMe) + 1 dual-GPU server (2 × 48 GB VRAM, 64 vCPU, 256 GB RAM, 4 TB NVMe)
**Decision vocabulary:** `ALLOW` · `DENY` · `CONSTRAIN`
**What changed in revision 2:** the adversarial review (`reviews/review-prd-adversarial.md`, 28 findings) found 8 Critical and 14 High defects, including a rule catalogue with no `ALLOW` rule, an unvalidated client-supplied `exam_binding` that was the sole exemption from four rules, an unowned freeze aggregate, and a direct contradiction between FR-10 and NFR-12. All 28 were triaged in §13. Cross-document reconciliation then produced five further findings (§14), three of them structural, and the catalogue ended at **19 rules** with the precedence order changed at four positions. The most instructive correction is **RC-2**: the repair the review recommended for PRD-12 created a *new* dead rule of the same kind, and finding that produced acceptance gate **AG-9**, which now forbids any rule whose condition is a strict subset of another's.

**What changed in revision 3:** the architecture edge-case pass (`reviews/review-arch-edge-cases.md`, 35 findings) walked eleven enumeration domains and found that most of the unhandled mass was not at the rule boundaries but at the **seams between the invariants**. Eight changes reach the PRD, none of which adds or removes a rule. (1) `must_checkpoint_by` is now set by §6.1 step 3 whenever *any* applicable bound cuts the work short, **independent of rule attribution**, because the exact-equality instant satisfied no strict-crossing predicate and produced an admission with no in-flight stop (**EDGE-3**, §6.2.1 item 9). (2) The evaluation instant is read **once, first**, and the fetch duration may not shift it (**EDGE-21**, item 10). (3) `fleet` is split into a `FAIL_CLOSED` class table and a stale-tolerant availability port, because one tolerance cannot be correct for both a hard refusal and a wait estimate (**EDGE-6**). (4) A port call has four outcomes, not two: `notFound` is a **missing fact** decided by `R-VALID-01` as `ACTOR_UNKNOWN` or `MODEL_NOT_FOUND`, and a `200` with a malformed body is promoted to a transport error because a truncated payload otherwise fails **open** through `NaN` (**EDGE-5**, **EDGE-13**, **EDGE-14**). (5) The clock carries a stratum and a leap flag, because an age-only zero-tolerance check passes a **backward** step (**EDGE-8**). (6) An over-age value escalates to fail-closed, or the tolerance is decorative in the only branch that uses it (**EDGE-27**). (7) `INDETERMINATE` is deleted from the trace enum (**EDGE-34**), and `max_gpu_count`/`max_vram_gb` become a `Clearance` object with an explicit `unrestricted` flag (**EDGE-12**). (8) `required_node_count` is declared with its one legitimate, **non-decision** consumer named, because the first review recorded it as read and no rule reads it (**EDGE-33**). Three new acceptance gates — **AG-10**, **AG-11**, and the generalised coverage check behind them — exist because (8) is not a field problem but a *claim* that nothing could check.

---

## 1. Executive Summary

Static permissions answer "who may use what" once, at enrolment. They answer nothing about *now*. This module is the platform's **dynamic access-control point**: a deterministic policy engine that, for every GPU-touching request, resolves the request against eight classes of live institutional state — identity, subject enrolment, role clearance, campus clock, class timetable, reservations, fleet capability, quota — and returns exactly one of `ALLOW`, `DENY`, or `CONSTRAIN`, always with a named rule, a closed-set cause, cited evidence, and a rationale whose first sentence names the cause.

The three-outcome vocabulary is the module's central design choice. A binary allow/deny engine forces the institution to choose between *blocking a legitimate research job* and *letting it evict a class*. `CONSTRAIN` is the third state that makes both unnecessary: it returns an admission the requester can actually use, narrowed until it no longer collides with the institution — a model variant swap, a hard `must_checkpoint_by` deadline, a queue, a quota cap. `DENY` is reserved for the cases where no narrowing produces a lawful request.

`CONSTRAIN` is a superset of two upstream states, so the `Decision` carries an explicit `admission` field (§5): `CONSTRAIN` with a `QUEUE_ONLY` constraint is `QUEUED` (CAP-7's "queued"); every other `CONSTRAIN` is `ADMITTED` (CAP-7's "admitted"). Without that field a consumer switching on `outcome` alone cannot implement CAP-7, and the three-outcome vocabulary would be a lossy re-encoding of the upstream contract rather than an extension of it.

The engine is **headless and pure**: one function, `evaluate(request, facts) -> Decision`, with no network, no clock, no randomness, and no model invocation. Every fact is fetched by the application shell and passed in. That purity is what makes it independently testable with local fixtures and what allows a decision to be replayed byte-for-byte against the exact rule version that produced it.

---

## 2. Problem, Users, and Value

### 2.1 The institutional problem

The university operates 33 GPU nodes under a policy regime that changes faster than any static permission can track. The institutional pressures, each of which must resolve to a *different* answer derivable from a rule the requester can read **before** they submit:

| Pressure | Named protagonist | Correct answer |
|---|---|---|
| A 24-machine Computer Vision lab needs the workstation pool Mon/Wed 10:00–12:00 | **Elena Vargas** is *in* that lab | Background work denied inside the window; interactive inference exempt; a 22:00 slot offered |
| A 70B vision-language model needs 48 GB; Elena's role is cleared to 24 GB | **Elena Vargas** | `DENY` on clearance — a permission boundary, not a hardware shortage — with a compliant model named |
| The same lab needs the 24 machines overnight for a thesis fine-tune that would run into the 09:00 class | **Elena Vargas**, with **Dr. Rebecca Reed** owning the 09:00 window | Admitted with a hard checkpoint deadline 5 minutes before the class opens, never an open-ended grant |
| Tomorrow's final examination may require an emergency compute freeze | **Dr. Rebecca Reed**, accountable to the department | A scoped, previewed, reasoned, reversible freeze that exempts the examination's own reservations and nothing else |

### 2.2 Named academic protagonists

| Protagonist | Role | What the engine owes them | What they can see in the console |
|---|---|---|---|
| **Elena Vargas** (she/her) — Undergraduate, Computer Vision (enrolled in `CS-340-CV`, `CS-480-VLM`), `role_tier = STUDENT` | High-frequency requester; runs inference notebooks during the day; occasionally submits overnight jobs | A decision in < 50 ms with a reason she can act on, not a wall of text; a one-click alternative whenever she is denied | Her own decision history, active constraints with live countdowns, her remaining quota, the rule that produced each outcome |
| **Dr. Rebecca Reed** - Lab Director, GPU Teaching Lab, `role_tier = INSTRUCTOR` with `LAB_OPERATOR` scope | Owns freeze authority and the class-protection schedule; accountable to the department when a class is disturbed | Activate, scope, and lift a freeze in under 60 s; see the **consequence preview** before activating; evidence that no background job was admitted inside a protected window | Freeze console with preview, protected-window calendar, protected-window admission audit, per-request full decision trace |

**Explicitly not personas.** Three machine identities exist in the domain model with fixed authorities and no discretionary power: the **Night Training Daemon** (`NIGHT_TRAINING_DAEMON`), the **Emergency Broadcast Account** (`EMERGENCY_BROADCAST`), and the **Academic Administration Bulk Import** (`BULK_IMPORT`). They are `ActorKind: SYSTEM`, they are declared in §5, they carry a *narrower* rule set (§6.2 `R-SYS-01`, and the `actor_kind = HUMAN` guard on the human temporal rules), and they never stand in for a named human in any scenario or acceptance criterion. The Night Training Daemon is the reason the human night window cannot be applied to all actors: a daemon exists to schedule across the day, and a module that denied it at 14:30 would leave the platform with no lawful overnight path.

### 2.3 Value delivered

1. **Guaranteed class time.** Zero background admissions inside a protected window, provable by replay (FR-4).
2. **Actionable refusal.** Every `DENY` names one cause from a closed enum and at least one next action (FR-9).
3. **Auditable fairness.** Every decision is reconstructable: actor, subject, request, policy version, evidence snapshot, outcome (FR-11).
4. **Hardware-honest refusals.** A 48 GB requirement is never satisfied by a 24 GB node, and a denial never claims otherwise (FR-3).

---

## 3. Scope Boundary

### 3.1 What this module OWNS

| Owned | Definition |
|---|---|
| **Decision contract** | The `Decision` type defined once, normatively, in §5. This is the module's public surface. §5 is normative; any other copy of the type elsewhere in this document is descriptive and must agree. |
| **Rule engine** | Ordered, deterministic evaluation of the 21 `R-*` rules of §6.2. A pure function of `(request, facts, policy_version)`. |
| **Rule catalogue** | The versioned, data-defined rule set: precedence, condition, outcome, constraints, citations. |
| **Explanation renderer** | Deterministic rendering of `trace` → `rationale`, from a stored template keyed by `primary_rule_id` plus matched evidence. **Zero model invocations** (NG-7, FR-9). |
| **Policy version registry** | An immutable, content-addressed artefact loaded at boot. A new version is a new artefact path. M2 never mutates a published version; there is no update endpoint. |
| **Freeze registry** | M2 is the **sole writer** of the `FreezeState` aggregate (spine rule 1). Owns `POST /policy/freezes`, `POST /policy/freezes/preview`, `POST /policy/freezes/{id}/lift`, `GET /policy/freezes`, and the §9.1 lifecycle. A freeze is published as a policy-version change, so activating one is versioned, diffable, and revertible. |
| **Clock abstraction** | Injected `CampusClock`. The engine package contains no reference to any system clock. |
| **Decision event contract** | The *shape* of the `DecisionProduced` event M2 publishes. Storage and the historical query surface are the Audit Ledger's (CAP-10, spine rule 8) — M2 does **not** build a second query path over the same history. |
| **Interactive console** | The request evaluator and the freeze console, as clients of the same public API. |

### 3.2 What this module READS (mocked in the prototype)

All ports are **gRPC** per spine AD-10; M2 exposes no REST surface of its own to external clients beyond the module's own public API, which the platform Gateway fronts. Protocol choice is a spine constraint, not a preference.

| Fact | Port (gRPC) | Owner | M2's access |
|---|---|---|---|
| Identity, role tier, subject enrolment, `clearance { max_gpu_count, max_vram_gb, unrestricted }`, `actor_kind`, `system_role` | `identity.v1.Identity.Resolve(token)`, `access.v1.Access.GetActor(id)` | M1 — User, Role & Subject Access Manager | read-only |
| Model facts: `min_vram_gb`, `required_min_role_tier`, `license_ref`, `weight_class`, `variants[]`, `deprecation` | `catalog.v1.Catalog.GetModel(ref)` | M5 — Model Catalog & Entitlement System | read-only |
| Class timetable → protected windows | `timetable.v1.Timetable.GetProtectedWindows(subject_ids, range)` | Institutional timetable feed (A-1) | read-only |
| Reservation records → reservation-backed windows, and `exam_binding` resolution | `reservation.v1.Reservation.GetWindows(range)`, `.GetReservation(id)` | M4 — GPU Reservation System (sole writer, spine rule 1) | read-only |
| **Fleet capability:** node classes, `gpu_count`, `vram_gb_per_gpu`, `total_vram_gb` | `fleet.v1.NodeClassTable.GetNodeClasses()` | M3 — GPU Lab Digital Twin / K8s bridge (sole cluster authority, AD-5) | read-only · `FAIL_CLOSED` |
| **Fleet availability:** `available_count` (net of cordons), `cordoned_count`, `failing_count` | `fleet.v1.Availability.GetAvailability(class_id)` | M3 — GPU Lab Digital Twin / K8s bridge | read-only · stale-tolerant |
| Quota balance and consumption | `quota.v1.Quota.CheckBalance(context)` | M8 — Token Usage & Quota Service | read-only |
| Queue telemetry for a node class | `queue.v1.Queue.GetQueueEstimate(class_id)` | M3 / M10 | read-only · display only |
| Freeze states (M2-owned) | local registry, read via the shell | **M2** | read + write |
| Campus clock | injected `CampusClock` port | Campus NTP | constructor injection; no default wall clock |

**Why the timetable and reservations are separate ports.** The first revision of this document served both through one `GET /schedule/protected-windows`. That fused two different aggregates with different owners behind one read with no consistency statement, and made a timetable fact indistinguishable from a reservation fact downstream. `ProtectedWindow` therefore carries a `source(TIMETABLE|RESERVATION)` discriminator, and the shell records the `captured_at` of each source separately (fixes review finding PRD-24).

**No shared database, no cross-team API negotiation, no shared cluster.** Every port above is served in the standalone prototype by a `FixturePort` or a loopback `StubPort`, with a documented, replaceable interface for each.

### 3.3 Non-goals (explicit — these are the hallucination guards)

| # | Non-goal | Why it is not ours |
|---|---|---|
| NG-1 | Placement, node selection, or gang-scheduling admitted workloads | Placement is M3/M10 (AD-5). The engine answers *class-level feasibility*, never *which node*. This is also why FR-3's "zero substitutions" clause is stated as a property of the decision, not of a placement. |
| NG-2 | Creating, moving, or cancelling GPU reservations | M4 owns reservation state. The engine reads windows and resolves `exam_binding`; it never writes a reservation. |
| NG-3 | Metering, decrementing, or resetting quota | M8 owns balances. The engine reads a balance and emits a *provisional* cap; M8's atomic compare-and-decrement at commit is the binding act (§9.3). |
| NG-4 | Model registration, licensing workflow, deprecation notices | M5. |
| NG-5 | Launching, checkpointing, or killing a training job | M9 / K8s bridge. The engine emits a deadline; it does not enforce one (spine rule 7: preemption is command-driven, never inferred locally). |
| NG-6 | Telemetry ingestion, metric storage, dashboards | M11. |
| NG-7 | LLM inference on the decision path | Prohibited by FR-9 and FR-13. A decision must be byte-reproducible. |
| NG-8 | The numeric value of institutional policy numbers (quota-hours, tier caps) | Owned by Academic Administration. The engine enforces the values it is given. |
| NG-9 | A GUI for institutional administration | Out of scope per the Spec-2 spine's deferred items. |
| NG-10 | Historical query and storage of decisions | Audit Ledger (CAP-10). M2 publishes the event and owns the event's *schema*. |

---

## 4. Assumptions and Open Questions

| ID | Statement | Class | If false |
|---|---|---|---|
| A-1 | The campus timetable is available as a read-only feed of `{subject_id, kind, starts_at, ends_at, required_node_count, recurrence}`, owned by Academic Administration. | **[RISKY]** — the single highest-impact unresolved dependency | FR-4 degrades to `source = MANUAL`: **Dr. Rebecca Reed** enters protected windows through the same freeze/window console that owns the freeze registry (§3.1), and the engine's contract is unchanged — only the fact source moves. This fallback is buildable because §3.1 now defines the write API; in revision 1 it pointed at an endpoint that did not exist. |
| A-2 | `CampusClock` is the only legal time base for window rules, and campus-local wall time is resolved through the configured IANA zone. | [SAFE] | Rules become ambiguous at DST transitions; see NP-4, which specifies the behaviour. |
| A-3 | The default campus time zone is `America/Panama` (no DST, UTC−05:00 year-round). | **[RISKY]** | The engine is TZ-parameterised and unaffected; only the configured default and the DST property test change. **Open item: confirm with Dr. Rebecca Reed.** |
| A-4 | Role tiers form a total order: `STUDENT < TEACHING_ASSISTANT < INSTRUCTOR < RESEARCHER < LAB_OPERATOR < ACADEMIC_ADMIN`. `TEACHING_ASSISTANT` is M1's term for the TA role; CAP-6's five tiers are a coarser view of the same scale, and M1 is the authority. | [SAFE] | `R-AUTH-02` becomes a set-containment test and `Actor.role_tier` becomes `Actor.role_tiers: set<RoleTier>`. The fallback is stated here so it is implementable, which it was not in revision 1. |
| A-5 | A model's `min_vram_gb` is a hard floor that no configuration may reduce. | [SAFE] | — |
| A-6 | Workload kinds are a closed set of five: `INTERACTIVE_INFERENCE`, `BACKGROUND_BATCH`, `TRAINING`, `EVALUATION`, `EXAM_BOUND`. `EXAM_BOUND` exists so an examination reservation is a *declared* workload kind rather than a magic flag on a batch job. | [SAFE] | — |
| A-7 | A catalog variant carries its own `min_vram_gb` **and** its own `required_min_role_tier`. A variant that lowers VRAM but raises the required tier is not a workaround. | [SAFE] | `R-TIER-03` must compare the variant's tier as well, which it already does. |
| OQ-1 | Who may authorise a freeze allowance, and at what cadence? | Open — Dr. Reed proposes, Academic Administration ratifies | `R-FRZ-02` matches on exact reservation id, which is correct under either answer. Unresolved. **Carried to the readiness gate as an open question, not a blocker.** |
| OQ-2 | Does a `CONSTRAIN`-downgraded request require the requester's acknowledgement? | **Closed for V1: applied server-side.** `requires_acknowledgement` is advisory and informational; a constraint is binding whether or not the requester clicks anything. | — (decision log **L-2**) |
| OQ-3 | Are weekend lab sessions protected? | Open | V1 protects weekends only if the timetable says so. A weekly recurrence expands to explicit instants at NORMALIZE, so a Saturday lab needs no code change. |
| OQ-4 | Does the night window differ by term? | Open | The window is a policy-versioned parameter. V1 ships one window. |

---

## 5. Domain Model

```
Actor           : actor_id, actor_kind(HUMAN|SYSTEM), system_role(nullable), role_tier,
                 subject_ids[], clearance{max_gpu_count, max_vram_gb, unrestricted:bool}
                 -- `unrestricted` is EXPLICIT. Over two nullable scalars a null cap and an
                    infinite cap are indistinguishable, so R-TIER-02 would refuse a Night
                    Training Daemon for physical infeasibility it did not cause on one
                    reading and admit it to an auto-substituted variant on the other.
                    Recorded as edge-case finding EDGE-12.
Request         : request_id, request_chain_id, actor_ref, workload_kind, subject_id, model_ref,
                 requested_gpu_count, requested_vram_gb_per_gpu, expected_duration_min,
                 exam_binding (nullable reservation_id)
ModelFacts      : model_ref, weight_class, min_vram_gb, required_min_role_tier, license_ref,
                 deprecation(nullable), variants[] {model_ref, min_vram_gb, required_min_role_tier}
QuotaFacts      : remaining, unit, tier, captured_at
NodeClass       : class_id, gpu_count, vram_gb_per_gpu, total_vram_gb, available_count,
                 cordoned_count, failing_count
                 -- available_count is NET of cordons and failures. Stated explicitly because
                    revision 1's "available_count − cordoned_count" double-subtracted.
ProtectedWindow : window_id, subject_id, kind(LAB|CLASS|EXAM|THESIS), source(TIMETABLE|RESERVATION),
                 starts_at, ends_at, required_node_count, recurrence(nullable)
                 -- required_node_count is read by NO rule, deliberately. It sizes a
                    reservation for a room, and this module decides requests; the
                    judgement that a class needs 24 of 24 nodes belongs to whoever
                    provisions, not to whoever admits. Its one consumer is the freeze
                    preview's next_protected_window tile, a non-decision surface. It is
                    declared here WITH that consumer named, because the alternative was
                    a field recorded as read and read by nothing. (AG-10, EDGE-33.)
FreezeState     : freeze_id, scope(ALL|SUBJECT|NODE_CLASS), subject_ids[], node_class_ids[],
                 starts_at, ends_at, allowances[] (exact reservation ids), state, reason,
                 lift_reason(nullable), activated_by, activated_at, supersedes(nullable)

DecisionContext : request + actor + campus_now + model_facts + quota_facts + node_classes[]
                 + protected_windows[] + freeze_states[] + queue_estimates{} + policy_version
                 + fact_snapshot_ref
```

**`priority_class` is removed from `Request`.** Revision 1 carried a `NORMAL|THESIS|EXAM` flag that no rule read — an unread field, which is a decision the document looks like it made and has not made. A thesis commitment is not a property of a *request*; it is an institutional reservation of a period of time, so it belongs in the schedule as a `ProtectedWindow` of kind `THESIS`, on the same port, from the same owner, as every other protected window. An examination is likewise not a flag; it is a reservation, referenced by `exam_binding` and resolved through `Reservation.GetReservation` (NP-11). One model, one source of truth, no parallel mechanism. (Decision log **L-9**.)

### 5.1 `Decision` — the single normative definition

```
Decision : decision_id
           outcome(ALLOW | DENY | CONSTRAIN)
           admission(ADMITTED | QUEUED | REJECTED)      -- see the invariant below
           authority(PROVISIONAL | FINAL)              -- see §9.3
           primary_rule_id                             -- always non-null, always in the registry
           cause(nullable)                             -- non-null iff outcome = DENY
           rationale                                   -- the rendered first sentence, never empty
           next_actions[]                              -- ≥1 iff outcome = DENY
           constraints[]                               -- Constraint{ kind, value, reason, enforced_by, deadline(nullable) }
           trace[]                                     -- TraceEntry{ rule_id, state, evidence[], precedence, bound_role(nullable) }
           suppressed[]                                -- rules NOT_EVALUATED whose predicate was satisfiable, with the fact that would have fired them
           citations[]                                 -- doc_ids from the policy_documents registry
           policy_version
           evaluated_at                                -- DEFINED AS campus_now (see NFR-3)
           valid_until                                 -- NOT NULL for ALLOW and CONSTRAIN (§6.3)
           must_checkpoint_by (nullable)                -- = valid_until whenever non-null
           retry_after_ms (nullable)
           stale_facts[]                               -- port ids used beyond their display tolerance
           evidence_snapshot_ref
           request_chain_id                            -- links a narrowed re-submission to its parent
           derived_from (nullable decision_id)          -- set for auto-proposed alternatives
```

**Admission invariant.** `admission = REJECTED` ⟺ `outcome = DENY`. `admission = QUEUED` ⟺ (`outcome = CONSTRAIN` ∧ some constraint has `kind = QUEUE_ONLY`). Every other `CONSTRAIN` has `admission = ADMITTED`. `ALLOW` always has `admission = ADMITTED`. This is what lets a consumer implement CAP-7's three outcomes from this module's two enums.

**Authority invariant.** `authority = PROVISIONAL` iff the decision carries a `QUOTA_CAP` constraint; every other decision is `FINAL`. A `PROVISIONAL` decision confers no authority until M8's commit succeeds (§9.3).

**Single-deadline invariant.** `must_checkpoint_by = valid_until` whenever `must_checkpoint_by` is non-null. There is exactly one instant at which authority lapses, and a decision cannot name two.

**Single-producer invariant.** At most **one** rule may produce a terminal outcome (strict total order, first match wins), so `constraints[]` contains at most one *rule-derived* constraint group — identified by its `primary_rule_id` — plus the `valid_until` bound from §6.3. A decision can never carry two rule-derived constraint groups. Consequence for the requester, stated in FR-6: when a deadline and a quota cap both apply, the earlier rule wins and the later one is reported `NOT_EVALUATED` **with the fact still shown**, because a requester who is told "stop at 05:55" and not told "you have 3 h of quota" will be surprised twice.

**Bound-role invariant.** Every element of `B` (§6.3) appears in the trace exactly once, carrying `bound_role ∈ {governing, superseded, outside_horizon}`. `governing` is unique. A boundary that set no bound is still reported, so the console can render the full picture and the requester can see which protection to appeal.

### 5.2 Closed sets

| Set | Members |
|---|---|
| Workload kinds | `INTERACTIVE_INFERENCE` · `BACKGROUND_BATCH` · `TRAINING` · `EVALUATION` · `EXAM_BOUND` |
| Protected-window kinds | `LAB` · `CLASS` · `EXAM` · `THESIS` |
| Constraint kinds | `RESOURCE_SUBSTITUTION` · `HARD_DEADLINE` · `QUEUE_ONLY` · `QUOTA_CAP` · `WINDOW_SCOPE` · `MODEL_VARIANT` |
| **`DENY` causes** | `INVALID_REQUEST` · `ACTOR_UNKNOWN` · `MODEL_NOT_FOUND` · `NO_SUCH_HARDWARE` · `HARDWARE_FAILING` · `NOT_AUTHORIZED` · `WINDOW_PROTECTED` · `FREEZE_ACTIVE` · `QUOTA_EXHAUSTED` · `DEPENDENCY_UNAVAILABLE` |
| `TraceEntry.state` | `MATCH` · `NO_MATCH` · `NOT_EVALUATED` |
| `TraceEntry.bound_role` | `governing` · `superseded` · `outside_horizon` |
| System roles | `NIGHT_TRAINING_DAEMON` · `EMERGENCY_BROADCAST` · `BULK_IMPORT` |

The `DENY` cause enum is **closed**. The covering relation is: every cause maps to **at least one** `primary_rule_id`, every rule maps to **at least one** cause, and **every (rule, cause) pair the catalogue can produce is enumerated in §6.2 and has a test**. It is *not* a bijection, and revision 2's claim that it was was wrong in the direction that mattered: `R-VALID-01` alone produces three causes and revision 3 makes it four, so a "one rule, one cause" assertion was not merely untrue, it would have been untrue of the module's very first rule and the test would have been quietly narrowed until it passed. A gate that has to be weakened before it can be enforced is not a gate. `AG-11` replaces the bijection with the pair-enumeration check, which is stronger: it fails both on a cause no rule produces *and* on a cause a rule can produce but has not declared.

**Three states, not four.** `INDETERMINATE` was declared here and in `ARCHITECTURE.md` §4.1 and produced by neither, and the two documents between them named three states where the schema named four. It is removed rather than adopted: a fact that is present but untrustworthy is already carried by `Decision.stale_facts[]` and by the fail mode its port is given, so the state conveyed nothing a reader could act on — while the `NOT_EVALUATED` count assertion in `AG-8` silently assumed the other two were the only possibilities. Recorded as edge-case finding **EDGE-34**.

**`ACTOR_UNKNOWN` and `MODEL_NOT_FOUND` are the same rule.** Both are "the thing you named does not resolve", both are decided by `R-VALID-01` at precedence −1, and neither is `DEPENDENCY_UNAVAILABLE`: a mistyped identifier is a request defect, and rendering it as a system fault sends the escalation to a platform team that cannot fix a typo. A negative lookup is also never served from a cache — a model deleted this morning must not resolve, from a 24-hour-old catalogue copy, to a licence that was revoked yesterday. Recorded as **EDGE-13** and **EDGE-14**; the alternative of one rule per lookup was declined so that one owner covers every non-resolution case, which is what keeps the one-cause-one-rule bijection writable.

### 5.3 Policy documents registry

FR-9 requires every citation to resolve. A citation that resolves to nothing is not a citation, so the ids are data with an owner:

| `doc_id` | Title | Owner | Version |
|---|---|---|---|
| `POL-FRZ` | Emergency Compute Freeze Policy | Academic Administration | 2026-03-02 |
| `POL-TIER` | GPU Tier & Clearance Policy | Academic Administration | 2026-02-11 |
| `POL-ENTITLE` | Model Entitlement & Licensing Policy | M5 / Research Office | 2026-01-20 |
| `ROLE-TIERS` | Role Tier Table | M1 | 2026-02-11 |
| `POL-LAB` | Protected Window Policy | Academic Administration | 2026-03-02 |
| `POL-NIGHT` | Overnight Training Window Policy | Academic Administration | 2026-03-02 |
| `POL-QUOTA` | Quota Tier Policy | Academic Administration | 2026-03-02 |
| `QUOTA-TIERS` | Quota Tier Table | M8 | 2026-03-02 |
| `FLEET-INV-2026-Q3` | GPU Fleet Inventory, Q3 2026 | M3 | 2026-07-01 |
| `SCHEDULE-2026-T5` | Term 5 Class Timetable | Academic Administration | 2026-04-06 |
| `CAMPUS-NOTICE-2026-04` | Emergency Freeze Notice, April 2026 | Dean's Office | 2026-04-09 |
| `CATALOG` | Model Catalog | M5 | 2026-04-01 |

`LIC-<model>` is **not** a citation id. Model licences are cited as the model's own `license_ref` field, resolved through `POL-ENTITLE`. A format string is not an identifier.

### 5.4 Constants

| Constant | Value | Declared in |
|---|---|---|
| `NIGHT_WINDOW` | `[22:00, 06:00)` campus-local, half-open, crosses midnight | policy-versioned parameter |
| `PROTECTION_GRACE` | `300 s` | §6.4 |
| `NEAR_BOUNDARY_DISPLAY_HORIZON` | `8 h` | **display only** — see the note below |
| `FACT_TIMEOUT_MS` | `40` | FR-10 |
| `CAMPUS_TZ` | `America/Panama` (A-3, unconfirmed) | configuration |
| `QUEUE_ESTIMATE_TTL` | `60 s` | FR-10 |
| `MAX_REQUEST_DURATION_MIN` | `4320` | FR-1 |
| `PREVIEW_TOKEN_TTL` | `60 s` | §9.1 |

`PROTECTION_GRACE` is declared **once**, here, and referenced by name from every rule that needs it. Revision 1 spelled the same 300 s three different ways.

**`GRACE_HORIZON` is retired, and the reason is instructive.** Revision 2 introduced it as a decision input to `R-GRACE-01` (a boundary within 8 h triggers a constraint). Reconciling §6.3's unified bound formula against the rule showed that for any workload kind in `R-GRACE-01`'s set, "a protection boundary `b` lies within the horizon **and** the job would still be live at `b`" is a strict subset of "the job would still be live at the earliest boundary" — so `R-GRACE-01` could only ever fire when `R-STRADDLE-01` would also fire, one position later. A rule that is a strict subset of another rule in a first-match-wins order is not a control, it is a comment. The 8 h figure survives as `NEAR_BOUNDARY_DISPLAY_HORIZON`, a **rendering** threshold that decides which bounds the console highlights, and it is declared here as what it is rather than being smuggled into a rule condition. See §6.2.1 item 4.

---

## 6. The Decision Algorithm

### 6.1 Shape

```
evaluate(request, facts, policy_version) -> Decision        -- PURE. No I/O, no clock, no rand.
  0. ASSERT     policy_version resolves to a frozen, content-hashed rule set
  1. VALIDATE   request shape, enums, ranges (§7 FR-1)        -> DENY(INVALID_REQUEST)  [R-VALID-01]
  2. REDUCE     walk the 19 rules in strict total precedence order (§6.2);
                each reports MATCH | NO_MATCH | NOT_EVALUATED;
                the first rule with a terminal outcome becomes primary_rule_id
                and every rule below it is recorded NOT_EVALUATED
  3. BOUND      compute the boundary set B (§6.3) and, for every ALLOW and every
                CONSTRAIN,
                   bound     = MIN( campus_now + expected_duration_min,
                                   min(b in B, b > campus_now) - PROTECTION_GRACE )
                   valid_until = bound ;  must_checkpoint_by = bound
                the deadline does NOT depend on which rule fired: whenever bound is
                earlier than campus_now + expected_duration_min, must_checkpoint_by
                is set, including the exact-equality case that satisfies no
                strict-crossing predicate (EDGE-3)
                a null bound, or a bound at or before evaluated_at, is a constructor
                error; and a source with no applicable instance contributes nothing to
                B, so an empty B yields valid_until = campus_now + expected_duration_min
  4. CONSTRAIN  expand the matched CONSTRAIN rule into explicit, machine-checkable
                constraints, each naming enforced_by
  5. RENDER     deterministic rationale from primary_rule_id + matched evidence (§5.3)
  6. PIN        attach policy_version, evaluated_at (= campus_now), derived_from,
                request_chain_id, and the governing boundary plus the superseded ones
```

**Why step 3 precedes step 4.** In revision 1 the bound was computed *after* the rules, and each rule computed its own deadline from its own boundary. That let a rule emit a `must_checkpoint_by` **later** than the decision's own `valid_until` — for example, `R-GRACE-01` could name a 09:00 lab (→ 08:55) while the enclosing overnight window expired at 06:00 (→ 05:55), producing a decision that asked a delegate to enforce a checkpoint deadline two hours after the admission had already lapsed. A delegate has no correct behaviour for that instruction, and a requester shown two conflicting instants is shown a bug. Computing one `bound` first, and requiring every constraint that carries a deadline to quote it, removes the whole class. **Invariant: `must_checkpoint_by = valid_until` on every decision that carries either one.** The rule that fired is still named, and the governing boundary is still identified, so nothing is lost — only the contradiction is.

`evaluate()` performs **no I/O, publishes nothing, and mutates nothing.** Fact acquisition, journal publication, and every outbound call belong to the application shell (`app/`), which is the only component permitted to do I/O. This boundary is stated explicitly because revision 1 asserted "the evaluation context has no I/O port bound" while also requiring the context to be built from eight remote ports — a self-refuting specification. **NFR-2 now measures the correct thing:** zero network calls *originating in the engine package*, and `evaluate()` is drivable from a literal `DecisionContext` with the fixtures directory made unreadable.

### 6.2 Rule catalogue and precedence

Precedence is a **strict total order** over integers, validated at boot: the registry refuses to start if two rules declare the same `precedence`, if any value is outside `[−1, 1000]`, if any rule lacks a `citation_id`, if any rule lacks a `rationale_template_id`, if any `citation_id` does not resolve in §5.3, or if any rule's declared predicate is a **strict subset** of another's (`AG-9`). The range includes −1 because two rules legitimately precede the numbered catalogue. This removes an entire class of nondeterminism that a functional test cannot catch, because a functional test all runs in one process where iteration order happens to be stable.

Two rules sit **before** the catalogue proper, because they gate whether the catalogue can be evaluated at all. They are given negative precedence and are evaluated first:

| P | Rule ID | Fires when | Outcome | Citations |
|---|---|---|---|---|
| −1 | `R-VALID-01` | The request fails shape validation (unknown enum, out-of-range number, malformed id); **or** `exam_binding` is non-null and does not resolve via `Reservation.GetReservation` to an `ACTIVE` reservation whose `subject_id` matches the request and whose window covers `campus_now`; **or** `exam_binding` resolves but the actor holds no entitlement to that reservation's `subject_id`; **or** `model_ref` does not resolve in the catalogue; **or** `actor_ref` does not resolve for this session | `DENY(INVALID_REQUEST)` · `DENY(MODEL_NOT_FOUND)` · `DENY(ACTOR_UNKNOWN)` · `DENY(NOT_AUTHORIZED)` | `POL-ENTITLE`, `POL-FRZ`, `CATALOG` |
| 0 | `R-DEP-01` | Any fact port classified `FAIL_CLOSED` in §7 FR-10 returns an error, exceeds `FACT_TIMEOUT_MS = 40`, or returns a value older than its **admission tolerance**; **or** any `ADMISSION_STALE_TOLERANT` port's only available value is older than that port's own tolerance; **or** a port returns `200` with a body that fails its schema; **or** a clock reading is untrustworthy (`stratum ≥ 15`, a leap flag, a negative age, or a regression behind the last accepted instant) | `DENY(DEPENDENCY_UNAVAILABLE)` with `retry_after_ms = 2000` | `POL-QUOTA`, `POL-LAB`, `POL-TIER` |

The catalogue proper:

| P | Rule ID | Fires when | Outcome | Citations |
|---|---|---|---|---|
| 1 | `R-FRZ-01` | An `ACTIVE` `FreezeState` covers the request's subject scope, node-class scope, or `ALL`, and `campus_now ∈ [starts_at, ends_at)`, and the request carries no `exam_binding` in that freeze's `allowances[]` | `DENY(FREEZE_ACTIVE)` | `POL-FRZ`, `CAMPUS-NOTICE-2026-04` |
| 2 | `R-FRZ-02` | An `ACTIVE` `FreezeState` covers the request's scope and `campus_now` is inside its window, **and** the request's validated `exam_binding` is in that freeze's `allowances[]` | `CONSTRAIN → WINDOW_SCOPE` (admitted only inside the freeze's allowed scope), `admission = ADMITTED` | `POL-FRZ` |
| 3 | `R-TIER-03` | The request **as declared** is not satisfiable — either no node class satisfies it fleet-wide (`R-TIER-01`'s predicate) or it exceeds the actor's clearance (`R-TIER-02`'s predicate) — **and** the catalog holds ≥ 1 variant of the same model family whose `min_vram_gb` is within the actor's cap **and** whose `required_min_role_tier` is at or below the actor's `role_tier` (A-7) | `CONSTRAIN → MODEL_VARIANT + RESOURCE_SUBSTITUTION`, `admission = ADMITTED` | `POL-TIER`, `CATALOG`, `ROLE-TIERS` |
| 4 | `R-TIER-02` | The request exceeds the actor's clearance (`max_gpu_count` or `max_vram_gb`) **and no qualifying variant exists** (strict complement of `R-TIER-03`'s second clause) | `DENY(NOT_AUTHORIZED)` | `POL-TIER`, `ROLE-TIERS` |
| 5 | `R-TIER-01` | No node class in the fleet has `gpu_count ≥ requested_gpu_count` **and** `vram_gb_per_gpu ≥ requested_vram_gb_per_gpu`, **and no qualifying variant exists** (strict complement of `R-TIER-03`) | `DENY(NO_SUCH_HARDWARE)` | `POL-TIER`, `FLEET-INV-2026-Q3` |
| 6 | `R-FLEET-01` | Every class satisfying the requirement and available to the actor has `available_count ≤ 0` **and** `failing_count ≥ 1` (hardware is *failing*, not merely busy) | `DENY(HARDWARE_FAILING)` | `FLEET-INV-2026-Q3` |
| 7 | `R-AUTH-02` | `actor.role_tier < model_facts.required_min_role_tier` | `DENY(NOT_AUTHORIZED)` | `ROLE-TIERS`, `POL-ENTITLE` |
| 8 | `R-AUTH-01` | The actor holds no entitlement to `request.subject_id`, **or** `model_facts.license_ref` is not accepted for that subject | `DENY(NOT_AUTHORIZED)` | `POL-ENTITLE`, `CATALOG` |
| 9 | `R-LAB-02` | `campus_now ∈ [w.starts_at, w.ends_at)` for a `ProtectedWindow` with `kind = EXAM` and `w.subject_id ∈ actor.subject_ids`, **and** the request is not `EXAM_BOUND` against that window's reservation | `DENY(WINDOW_PROTECTED)` | `POL-LAB`, `SCHEDULE-2026-T5` |
| 10 | `R-LAB-01` | `campus_now ∈ [w.starts_at, w.ends_at)` for a `ProtectedWindow` with `kind ∈ {LAB, CLASS}` and `w.subject_id ∈ actor.subject_ids`, **and** `workload_kind ∉ {INTERACTIVE_INFERENCE, EXAM_BOUND}`, **and** no validated `exam_binding` matches `w` | `DENY(WINDOW_PROTECTED)` | `SCHEDULE-2026-T5`, `POL-LAB` |
| 11 | `R-SYS-01` | `actor_kind = SYSTEM` and the actor's `system_role` is not permitted to use the requested `workload_kind` (permitted: `NIGHT_TRAINING_DAEMON` → `TRAINING`, `EVALUATION`; `EMERGENCY_BROADCAST` → `EXAM_BOUND`; `BULK_IMPORT` → none — it may not request compute) | `DENY(NOT_AUTHORIZED)` | `POL-ENTITLE`, `ROLE-TIERS` |
| 12 | `R-NIGHT-01` | `actor_kind = HUMAN`, `workload_kind ∈ {TRAINING, BACKGROUND_BATCH}`, `campus_now ∉ NIGHT_WINDOW` campus-local, **and** no validated `exam_binding` | `DENY(WINDOW_PROTECTED)` | `POL-NIGHT` |
| 13 | `R-BOUND-01` | `campus_now + expected_duration_min` **strictly exceeds** `b* − PROTECTION_GRACE`, i.e. the request would still be live when its earliest boundary `b* = min{ b ∈ B : b > campus_now }` arrives (§6.3). **Every** workload kind. | `CONSTRAIN → HARD_DEADLINE` with `must_checkpoint_by = valid_until = bound`, `admission = ADMITTED`; the trace names `b*` as `governing` and every other element of `B` as `superseded` | `POL-LAB`, `POL-NIGHT`, `POL-FRZ` |
| 14 | `R-QUOTA-01` | `quota_facts.remaining ≤ 0` | `DENY(QUOTA_EXHAUSTED)` | `POL-QUOTA`, `QUOTA-TIERS` |
| 15 | `R-QUOTA-02` | `0 < quota_facts.remaining < estimated_need` | `CONSTRAIN → QUOTA_CAP` with `cap_value = quota_facts.remaining`, `authority = PROVISIONAL`, `requires_commit_confirmation = true`, `admission = ADMITTED` | `POL-QUOTA`, `QUOTA-TIERS` |
| 16 | `R-CONTEND-01` | Every class satisfying the requirement and available to the actor has `available_count ≤ 0` and `failing_count = 0` (busy, not broken), **and** no freeze covers the request | `CONSTRAIN → QUEUE_ONLY` with `queue_estimate_ref` (an opaque id, resolved by M3 — the engine never computes a duration), `admission = QUEUED` | `FLEET-INV-2026-Q3` |
| 17 | `R-ALLOW-01` | **No rule at precedence −1 through 16 produced a terminal outcome** | `ALLOW`, `admission = ADMITTED`, bounded by §6.1 step 3 | `POL-TIER`, `POL-ENTITLE` |

### 6.2.1 Why the catalogue looks the way it does

Thirteen structural decisions, each forced by a specific failure. Revision 1's catalogue is preserved in `ai-log/decision-log.md` alongside the finding that broke it, because a rule table is the single most consequential design decision in this module and the corrections are its best governance evidence.

| # | Decision | The failure it prevents |
|---|---|---|
| 1 | **`R-ALLOW-01` exists at precedence 17.** | Revision 1 had **no `ALLOW` rule and no default**. A well-formed request from an enrolled student at 14:00 with quota remaining matched nothing, and the engine had no representation for "no rule fired" — so the module's *most common* outcome was unproducible and FR-1's "exactly one terminal outcome" was unfalsifiable. The fallthrough is an explicit, cited `ALLOW` rule, not an implicit default. |
| 2 | **`R-TIER-03` (variant) is at 3, `R-TIER-02` (clearance) at 4.** | Revision 1 had them the other way round, which made `R-TIER-03` dead code: its condition ("exceeds the actor's clearance") is a strict subset of `R-TIER-02`'s, and the first matching rule wins. FR-3's two acceptance clauses could therefore not both hold. The variant rule is now first **and** is bounded by A-7: a variant that lowers VRAM but raises the required role tier is not a workaround, which is what stops the rule from becoming a naming convention that bypasses an authorisation boundary. |
| 3 | **`R-FRZ-02` (allowance) is at 2, immediately after `R-FRZ-01`.** | Revision 1 put it at 14, last, below five `DENY` rules. A freeze allowance exists precisely to protect a scheduled examination; evaluating it after `R-TIER-02`, `R-AUTH-01/02`, and `R-QUOTA-01` meant an exam-bound request from a quota-exhausted or under-cleared actor was hard-denied and the allowance never got a look. This **reverses decision-log entry L-7**, which had argued for the low placement. The review was right and the original reasoning was wrong. |
| 4 | **`R-GRACE-01`, `R-STRADDLE-01` and `R-THESIS-01` are merged into one `R-BOUND-01` at 13, and the bound is computed before the rules, not by them.** | **This is the finding the review's own lesson produced, applied a second time.** Revision 1 had three rules producing deadlines from three different boundary lists. The first repair (finding PRD-12) added a durability precondition to `R-GRACE-01` so it would stop shadowing `R-STRADDLE-01` — and that repair *worked*, and thereby revealed the deeper problem: with the precondition in place, for any workload kind in its set, "a protection boundary lies within 8 h **and** the job would still be live there" is a **strict subset** of "the job would still be live at the earliest boundary." `R-GRACE-01` could therefore only ever fire when `R-STRADDLE-01` would also fire, one position later. The fix for a dead rule had produced a second dead rule of the same kind. `R-THESIS-01` had the same shape, since a thesis window is just a `ProtectedWindow` of kind `THESIS`. Three rules, one behaviour, two of them decoration. There is now **one** deadline producer, one `bound` (§6.3), one boundary set, and the invariant `must_checkpoint_by = valid_until`. The 8 h horizon survives as `NEAR_BOUNDARY_DISPLAY_HORIZON`, declared as the rendering threshold it actually is. **A rule whose condition is a strict subset of another rule's, in a first-match-wins order, is not a control. It is a comment with a citation.** That test is now `AG-9`. |
| 5 | **`R-FLEET-01` (failing hardware) is separate from `R-CONTEND-01` (busy hardware).** | CAP-3 requires failing hardware to reject *immediately with a distinguishable cause*, and CAP-7 requires that outcome to be distinguishable from a queue outcome in 100 % of cases. Revision 1 subtracted cordoned nodes inside `R-CONTEND-01` and answered `QUEUE_ONLY`, converting a hard rejection into a queue with no distinguishing cause. `available_count` is now declared net of cordons, so the double-subtraction is gone too. |
| 6 | **`R-VALID-01` and `R-DEP-01` are catalogue rows at precedence −1 and 0.** | Revision 1 set `R-DEP-01` as a `primary_rule_id` in FR-10 and NP-1 while it appeared nowhere in the catalogue, so it had no precedence and no citation, and §6.2's claim to be a strict *total* order was false for the rule that fires in the module's mandatory failure path. `R-VALID-01` exists because revision 1 accepted an unvalidated, client-supplied `exam_binding` as the sole exemption from `R-FRZ-01`, `R-LAB-01`, `R-LAB-02`, and `R-NIGHT-01`. |
| 7 | **A thesis deadline is a `ProtectedWindow` of kind `THESIS`, not a rule.** | See item 4. The thesis commitment is institutional protection, it comes from M4, and it arrives on the same port as every other window. Modelling it as a rule meant the module held a second, hand-maintained copy of a schedule that already exists elsewhere — a duplicate source of truth for a resource commitment, which is precisely the class of defect the spine's single-writer rule exists to prevent. |
| 8 | **The precedence range is `[−1, 1000]`, not `[0, 1000]`.** | Revision 1's boot validator rejected negative precedence, which would have made the two pre-flight rules unrepresentable and silently forced them into the numbered range, where they would have had to compete for a position with rules they gate. |
| 9 | **The deadline is set by §6.1 step 3, not by a rule's aftermath — and it is set whether or not a rule fires.** | Item 4 removed the three competing producers, but the replacement kept the single producer inside `R-BOUND-01`'s aftermath, and that left one constructible input broken. A request whose `campus_now + expected_duration_min` **equals** `b* − PROTECTION_GRACE` satisfies a strict-crossing predicate, so `R-BOUND-01` does not match: no `HARD_DEADLINE`, `must_checkpoint_by` stays null, and the Gateway's launch-time `valid_until` check passes. The job then runs into the protection the module exists to enforce, with a clean, fully attributed `ALLOW` in the journal. The rule predicate decides *whether a constraint needs explaining*; step 3 decides *what time is granted*, and the two are now written in different places on purpose. **EDGE-3.** |
| 10 | **The evaluation instant is read once, before the fan-out, and the fetch duration may not shift it.** | If `campus_now` is read last, a request arriving at 08:59:59.900 with a 140 ms slowest port is evaluated at 09:00:00.040 and denied by `R-LAB-01` instead of admitted under a bound — the same request, a different answer, decided by which part of the shell happened to be slowest. `NFR-4`'s property test supplies `campus_now` directly and is structurally unable to see this, which is why the ordering has to be stated as a requirement and tested in the shell. **EDGE-21.** |
| 11 | **A field with no consumer is a promise the engine does not keep — and the gate that catches it is the one this review built.** | `required_node_count` was declared on the timetable fact, cited in an acceptance criterion, and recorded by the first review as "retained and now read". Running the generalised coverage check over the current catalogue established that **no rule reads it**. Its only legitimate consumer is the freeze preview's `next_protected_window` tile, which is a non-decision surface. The lesson generalises past the field: the defect is not that this field is unread, it is that the module could *claim* a field was read and no gate existed to check the claim. `AG-10` is that gate, scoped to rule inputs and named non-decision surfaces. **EDGE-33.** |

| 11 | **A freeze allowance is authorised by the reservation record, and that is why `R-VALID-01` carries the entitlement clause.** | `R-FRZ-02` moved from 14 to 2 (item 3), and the consequence had to be followed rather than assumed: at precedence 2 it is terminal for any request whose `exam_binding` matches, so `R-AUTH-01` at 8 and `R-AUTH-02` at 7 never run for an exam-bound request. Revision 2's guarantee that "an allowance does not bypass authorisation" was therefore **false as soon as the move was made**, and the old scenario text still asserted it. The guarantee is restored one level up, where the binding is validated: `R-VALID-01` now requires the actor to hold an entitlement to the reservation's `subject_id`, and answers `DENY(NOT_AUTHORIZED)` when it does not. This is the right owner for the check for the same reason it is the right owner for `MODEL_NOT_FOUND`: the question is "does this reference resolve, and resolve *for you*", and one owner for every non-resolution case is what keeps the pair-enumeration check writable. The alternative — a `R-FRZ-03` authorisation rule above the allowance — was declined: it would give a freeze a second opinion about authorisation, and a freeze's job is to stop compute, not to grant it. **Decision log L-12.** |
| 12 | **`R-VALID-01` is the only place a reference is resolved.** | Four causes now hang off one rule at precedence −1, which made §5.2's "bijection" claim visibly false, and the honest fix was to the claim rather than to the rule. A mistyped model, an unknown actor, an unbound reservation, and a reservation the requester has no right to are all the same shape of question with four different answers, and answering them in four different rules would mean four places to keep consistent and four precedence positions to order. **EDGE-13**, **EDGE-14**, and the seam between `L-7`'s reversal and `R-AUTH-01`. |

**Ordering rationale.** Institutional safety overrides outrank capability; capability outranks authorisation; authorisation outranks temporal protection; temporal protection outranks consumption; consumption outranks contention; and the default admission is last. The two positions that were **wrong** in revision 1 — the freeze allowance and the model variant — are the two places where an *exemption* was placed below the *restriction* it exempts. That single pattern explains both bugs, which is worth more to a reader than the table itself. (Decision log **L-4**, **L-7**, **L-3**.)

**The one inversion that is not an exemption, and what it costs.** `R-DEP-01` at 0 sits **above** `R-FRZ-01` at 1, so during a freeze a broken dependency produces `DENY(DEPENDENCY_UNAVAILABLE)` rather than `DENY(FREEZE_ACTIVE)`. That is deliberate: a freeze read is not a remote port, so the only way `R-DEP-01` can precede the freeze is if some *other* port has failed, and "the quota service is unreachable" is the more actionable message, with `retry_after_ms` attached. The cost is that a requester under a freeze may be told to retry rather than that the fleet is closed — and the mitigation is that the freeze console renders a separate, always-visible banner, so the state is communicated by the surface that owns it rather than by the denial that happened to be produced first.

### 6.3 The bounding rule — no admission is open-ended

**The boundary set.** Every temporal rule reads the same set, built once per evaluation. There is no second, rule-specific boundary list — revision 1 had three, and the disagreement between them is what produced the incoherent deadlines described in §6.1.

```
B = { w.starts_at, w.ends_at   :  w ∈ protected_windows,
                                    w.subject_id ∈ actor.subject_ids,
                                    w.ends_at > campus_now }
  ∪ { f.starts_at               :  f ∈ freeze_states, f.starts_at > campus_now }
  ∪ { end of the enclosing access window }
```

The **enclosing access window** is `NIGHT_WINDOW`'s end at 06:00 when `campus_now ∈ NIGHT_WINDOW` and no freeze covers the request; otherwise the active freeze's `ends_at`. A source with **no applicable instance contributes nothing** to `B`, and its absence is not an error — at 14:00 on a day with no protected windows and no freeze there is no enclosing access window, and inventing a boundary for one would put a deadline on a request that has none. Where an instance does exist, its end is in `B` and is `> campus_now` whenever `campus_now` lies inside it, so `min{ b ∈ B : b > campus_now }` — written **`b*`** — is defined whenever `B` is non-empty. If all three non-duration sources are empty then `B = ∅` and `bound = campus_now + expected_duration_min`; the formula's own guard is `min(∅) = +∞`. `R-BOUND-01` treats **every** element of `B` identically; nothing in `B` is more important than anything else, and the only question is which is earliest.

**The bound.** For every `ALLOW` and every `CONSTRAIN`:

```
bound        = MIN( campus_now + expected_duration_min ,  b* - PROTECTION_GRACE )
valid_until  = bound
must_checkpoint_by = bound          (iff the decision carries a HARD_DEADLINE)
```

A `Decision` with a null `valid_until` is a **constructor error**, not a runtime possibility. The trace records `b*` with `bound_role = governing` and every other element of `B` with `bound_role = superseded`, which is what lets the console show the requester the full picture without the engine ever holding two deadlines.

**Guard on a bound in the past.** If `b* - PROTECTION_GRACE ≤ campus_now` — which happens when a schedule correction moves a boundary backwards, or when `PROTECTION_GRACE` pushes a boundary inside the grace band — the engine does **not** emit a constraint whose deadline has already expired. It emits `ALLOW` with `valid_until = campus_now`, `admission = ADMITTED`, and a `WINDOW_SCOPE` constraint naming the boundary and stating that no time is granted inside it. A `CONSTRAIN` with a deadline in the past is a contradiction, and a delegate asked to enforce an expired deadline has no correct behaviour. (NP-9.)

This is the specific resolution of the module's mandatory edge case. A job admitted under the overnight policy that would run into a protected morning class window is **never silently grandfathered** and **never killed at 06:00 sharp with no warning**: it is admitted with a visible, counted-down, named deadline that a delegate enforces — and the card shows that the *overnight window's end* is normally the binding bound, with the morning lab bound listed as superseded, so the requester learns which protection is actually stopping her and can appeal the right one.

### 6.4 Half-open interval convention

Every temporal rule uses `t ∈ [start, end)`. A window `[10:00, 12:00)` protects 10:00:00.000 through 11:59:59.999 and does not protect 12:00:00.000. This is fixed by this document (§6.4), is consistent with SPEC CAP-2's interval semantics, and is not configurable per rule. `PROTECTION_GRACE` is applied identically to schedule boundaries and freeze boundaries, so a freeze at 04:00 produces a 03:55 deadline exactly as a lab at 09:00 produces an 08:55 deadline.

### 6.5 Canonical ordering (required for NFR-3)

Two identical `(request, fact snapshot, policy_version)` inputs MUST produce byte-identical output. That requires every collection in `DecisionContext` and `Decision` to be stored in a declared canonical order, because Go randomises map iteration and several of these are maps:

| Collection | Canonical order |
|---|---|
| `protected_windows[]` | by `(starts_at, window_id)` |
| `freeze_states[]` | by `(starts_at, freeze_id)` |
| `node_classes[]` | by `class_id` |
| `actor.subject_ids[]` | lexicographic |
| `freeze.allowances[]` | lexicographic |
| `trace[]` | by rule `precedence`, then `rule_id` |
| `citations[]` | lexicographic by `doc_id` |
| `constraints[]` | by `(kind, deadline, value)` |
| `next_actions[]` | by `action_id` |

`evaluated_at` is set to `campus_now`, not to a wall-clock reading, so it is part of the pinned input triple and does not break byte-identity. A generated-context test asserts these orderings over 10 000 contexts containing ≥ 2 windows, ≥ 2 classes, and ≥ 2 freezes.

---

## 7. Functional Requirements

| ID | System responsibility | Trigger | Inputs | Validation | Outputs | Measurable acceptance condition |
|---|---|---|---|---|---|---|
| **FR-1** | Resolve an access request to exactly one terminal outcome. | Any GPU request that reaches the decision endpoint. | `Request`, `DecisionContext` | Enums closed; `expected_duration_min ∈ [1, 4320]`; `requested_gpu_count ∈ [1, 2]`; `requested_vram_gb_per_gpu ∈ {24, 48}`; the only physically realisable pairs are `(1, 24)` → class `std-24` and `(2, 48)` → class `dual-48`; every other pair reaches `R-TIER-01` or `R-TIER-02` | One `Decision` | Over the 3-outcome × 21-rule matrix, **100 %** of requests resolve to exactly one `outcome` and exactly one `admission`; **0** produce an empty or multi-valued outcome; **0** produce a null `primary_rule_id`. |
| **FR-2** | Enforce institutional freeze overrides, and protect the examination the freeze exists for. | A freeze is `ACTIVE` for the request's scope at `campus_now`. | `FreezeState[]`, `Request.exam_binding` | Freeze window half-open; `exam_binding` must have passed `R-VALID-01`; allowance match is **exact reservation id** | `DENY(FREEZE_ACTIVE)`, or `CONSTRAIN → WINDOW_SCOPE` with `admission = ADMITTED` | With a freeze covering `ALL` from 08:00–20:00, **100 %** of non-exam requests in `[08:00:00.000, 20:00:00.000)` are `DENY` with `R-FRZ-01`. **100 %** of requests whose validated `exam_binding` is in `allowances[]` **and** which are not denied by `R-TIER-01`, `R-TIER-02`, `R-AUTH-01`, `R-AUTH-02`, `R-QUOTA-01`, or `R-FLEET-01` are admitted with `WINDOW_SCOPE`. The six excluded rules are enumerated in the requirement text so the quantifier is honest. |
| **FR-3** | Enforce the VRAM / GPU-count tier gate against the heterogeneous fleet. | A request declares `requested_gpu_count` and `requested_vram_gb_per_gpu`. | `NodeClass[]`, actor clearance, `ModelFacts` | Class must satisfy `gpu_count ≥ requested` **and** `vram_gb_per_gpu ≥ requested`; a variant must satisfy the cap on **both** VRAM and role tier (A-7) | `DENY(NO_SUCH_HARDWARE)`, `DENY(NOT_AUTHORIZED)`, or `CONSTRAIN → MODEL_VARIANT` | **Clause 1:** a 70B VLM requiring 48 GB requested by `role_tier = STUDENT` (cap 24 GB) returns `DENY(NOT_AUTHORIZED)` with `primary_rule_id = R-TIER-02` in 100 % of cases where no qualifying variant exists, and `CONSTRAIN → MODEL_VARIANT` with `primary_rule_id = R-TIER-03` in 100 % of cases where one does — the two inputs are disjoint, so both clauses hold simultaneously. **Clause 2:** `0` decisions assert a node class whose `vram_gb_per_gpu` is below the request's requirement. **Clause 3:** the same request evaluated by `role_tier = RESEARCHER` (cap 48 GB) returns `ALLOW` in 100 % of cases with identical facts otherwise. |
| **FR-4** | Protect scheduled lab, class, and examination windows from background load. | `campus_now ∈ [w.starts_at, w.ends_at)` for a window matching an actor's enrolment. | `ProtectedWindow[]`, `Request.workload_kind` | Half-open containment; `w.subject_id ∈ actor.subject_ids`; `INTERACTIVE_INFERENCE` and `EXAM_BOUND` exempt | `DENY(WINDOW_PROTECTED)` with `R-LAB-01` or `R-LAB-02` | With lab protection Mon/Wed 10:00–12:00 local for `CS-340-CV`: **100 %** of `TRAINING` / `BACKGROUND_BATCH` / `EVALUATION` requests for `CS-340-CV` evaluated inside the window are `DENY`. **Boundary sweep:** at `09:59:59.999` → `R-LAB-01` `NO_MATCH`; at `10:00:00.000` → `MATCH`; at `11:59:59.999` → `MATCH`; at `12:00:00.000` → `NO_MATCH`. Exactly 2 flips across the sweep. **Scope check:** the same request for `CS-101-INTRO-ML` at 10:04 is **not** denied by `R-LAB-01`, because the window is scoped to the enrolled subject. |
| **FR-5** | Enforce the overnight training window for human actors. | A `TRAINING` or `BACKGROUND_BATCH` request from a `HUMAN` actor is evaluated outside `NIGHT_WINDOW`. | `campus_now` campus-local, policy-versioned `NIGHT_WINDOW` | Half-open `[22:00, 06:00)`; crosses midnight; `actor_kind = HUMAN` | `DENY(WINDOW_PROTECTED)` | A `TRAINING` request from a `HUMAN` actor at 14:30 local is `DENY` with `R-NIGHT-01` in 100 % of cases. **Boundary sweep:** `21:59:59.999` → `MATCH`; `22:00:00.000` → `NO_MATCH`; `05:59:59.999` → `NO_MATCH`; `06:00:00.000` → `MATCH`. The identical request from the Night Training Daemon at 14:30 is **not** denied by `R-NIGHT-01` in 100 % of cases, and is denied by `R-SYS-01` if its `workload_kind` is outside its permitted set. |
| **FR-6** | Bound an admission by its earliest institutional boundary, and report every other boundary honestly. (Revision 2 merged the former FR-6 *and* FR-7's rule, `R-GRACE-01` + `R-STRADDLE-01`, into one: see §6.2.1 item 4. The requirement survives; it is no longer split across two rules that could not both fire.) | `campus_now + expected_duration_min` exceeds `b* − PROTECTION_GRACE` for `b* = min{ b ∈ B : b > campus_now }` (§6.3). | `ProtectedWindow[]`, `FreezeState[]`, `campus_now`, `expected_duration_min`, `NIGHT_WINDOW` | **Strict** greater-than; same-instant is not a crossing; every element of `B` is treated identically — none is more important than another | `CONSTRAIN → HARD_DEADLINE` with `must_checkpoint_by = valid_until = bound`; trace marks `b*` `governing` and the rest `superseded` | **Worked case A (the job outruns the overnight window).** A `TRAINING` request at **01:10** local with `expected_duration_min = 540` on a day with a 09:00 lab: `B = {06:00 overnight end, 09:00, 12:00}`, `b* = 06:00`, `bound = 05:55`, own end `10:10` — `CONSTRAIN` / `R-BOUND-01` with `must_checkpoint_by = valid_until = 05:55`, in 100 % of cases. The trace marks the 09:00 lab bound `superseded` at `08:55`. **Negative case.** The same request at 01:10 with `expected_duration_min = 30` (own end 01:40) is `ALLOW` / `R-ALLOW-01` with `valid_until = 01:40`, in 100 % of cases. **Own-completion case.** A `TRAINING` request at 01:10 with `expected_duration_min = 240` (own end 05:10, before `05:55`) is `ALLOW` with `valid_until = 05:10`, in 100 % of cases, and `05:55` is reported `superseded`. **No shadowing.** Deleting `R-BOUND-01` from the catalogue makes cases A and B return `ALLOW` with an open-ended `valid_until`; `test/rules/r-bound-01.test.ts` asserts both the presence and the deletion (AG-8, AG-9). |
| **FR-7** | Prevent boundary straddle: a job admitted under the overnight policy that would run into a protected morning window is never grandfathered. (The mandatory edge case.) | Same predicate as FR-6, read for the case where the **straddled boundary is a protected morning window** rather than the overnight window's end. | As FR-6 | As FR-6 | `CONSTRAIN → HARD_DEADLINE`, `admission = ADMITTED` | **Clause 1 (the mandatory edge case, verified arithmetically).** An `EVALUATION` request at **08:00** Wednesday with `expected_duration_min = 300` on a day with a `WIN-4418` lab at 09:00–12:00: `B = {09:00, 12:00}` (the request is outside `NIGHT_WINDOW`, so the overnight end is not in `B`), `b* = 09:00`, `bound = 08:55`, own end `13:00` — `CONSTRAIN` / `R-BOUND-01`, `must_checkpoint_by = valid_until = 08:55`, in 100 % of cases, and `ALLOW` is not reachable for this input. **Clause 2 (the night-window end binds first, and saying so is the point).** The same request at **02:00** with `expected_duration_min = 600`: `B = {06:00, 09:00, 12:00}`, `b* = 06:00`, `bound = 05:55` — `must_checkpoint_by = 05:55`, and the 08:55 lab bound is reported `superseded`, in 100 % of cases. The requester is therefore told that it is the *overnight window*, not the class, that ends her run, and can appeal the right one. **Clause 3 (earlier bound governs, and both are named).** With a freeze starting 03:00 **and** a lab at 09:00, evaluated at 01:00: `B = {03:00, 06:00, 09:00, 12:00}`, `b* = 03:00`, `must_checkpoint_by = 02:55`, in 100 % of cases, with all four bounds in the trace and three marked `superseded`. **Clause 4 (never two deadlines).** For every generated context, `must_checkpoint_by = valid_until` in 100 % of cases, asserted over 10 000 contexts by `test/props/single-deadline.test.ts`. |
| **FR-8** | Cap requests against remaining quota, without read-then-write. | `quota_facts.remaining` is zero or below the estimated need. | `QuotaFacts` | `estimated_need` derived from model class and declared duration; **all comparisons in integer units**; `quota` port is `FAIL_CLOSED` at tolerance 0 | `DENY(QUOTA_EXHAUSTED)` or `CONSTRAIN → QUOTA_CAP` with `authority = PROVISIONAL` | With `remaining = 0`, 100 % of requests are `DENY` with `R-QUOTA-01`. With `0 < remaining < need`, 100 % are `CONSTRAIN` with `cap_value = remaining` and `authority = PROVISIONAL`. **Concurrency:** 100 concurrent requests against a balance of R, with R/N of the need each, produce at most ⌊N⌋ commits at M8; a `test/concurrency/quota-commit.test.ts` asserts that the number of successful M8 compare-and-decrements never exceeds `remaining / per_request_need`. **Zero** float comparisons appear on the balance — asserted by type signature, not by inspection. |
| **FR-9** | Render a deterministic, cited explanation for every decision — including for the constraints that did **not** apply. | Any `Decision` is produced. | `trace[]`, `citations[]`, matched evidence, the `NOT_EVALUATED` rules and their inputs | Template keyed by `primary_rule_id`; **no model invocation**; **no PII, no credentials**; every `citation_id` resolves in the §5.3 registry; a `NOT_EVALUATED` rule whose input fact would have mattered is reported as `suppressed` with that fact attached | `rationale` + structured `trace` | **100 %** of decisions carry ≥ 1 `citation_id` that resolves to a `doc_id` in the §5.3 registry, asserted by a boot-time registry validation that refuses to start on an unresolved id. **100 %** of `DENY` decisions carry ≥ 1 `next_action` **or** the explicit sentinel `NO_ALTERNATIVE_AVAILABLE`. **100 %** of `DENY` rationales name a `primary_rule_id` and a `cause` from the §5.2 enum in their first sentence. **100 %** of `trace[]` entries carry one of the four `state` values, never a null. **Suppressed-fact clause:** every rule recorded `NOT_EVALUATED` whose predicate was satisfiable on the same snapshot appears in a `suppressed[]` list with the value that would have made it fire — so a requester constrained to `05:55` sees "your remaining quota is 3 h, which ends before the deadline" rather than discovering it at 03:00. Rendering is byte-identical across 1 000 renders of the same `Decision`. |
| **FR-10** | Degrade safely when a fact source is unavailable or stale. | A fact port returns an error, exceeds `FACT_TIMEOUT_MS = 40`, or returns a value older than its **admission tolerance**. | Port error, the last snapshot supplied by the shell, and its `captured_at` | **Two separate bounds per port**, below. Admission tolerance governs whether a fact may support a decision; display tolerance governs whether it is shown as fresh. | `DENY(DEPENDENCY_UNAVAILABLE)` with `retry_after_ms` for a `FAIL_CLOSED` breach; the decision continues with a `stale_facts[]` entry for a display-only staleness | **Table (the authoritative classification; NFR-13 asserts against this table, not against a rule family):** `quota` FAIL_CLOSED @ 0 s · `clock` FAIL_CLOSED @ 0 s · `Identity/Access` FAIL_CLOSED @ 0 s (identity is the whole basis of authorisation) · `Reservation` FAIL_CLOSED @ 0 s (it is the sole validation path for `exam_binding`) · `Timetable` FAIL_CLOSED @ 60 s (a stale timetable can be blind to a class that started 9 minutes ago) · **`fleet.NodeClassTable` FAIL_CLOSED @ 0 s / display @ 6 h** (the class table is the sole evidence for `R-TIER-01`'s hard-infeasibility `DENY`, and a refusal whose only fact may come from a 60-second-old cache is a refusal that can be wrong, which is worse than a refusal that is unavailable) · **`fleet.Availability` ADMISSION_STALE_TOLERANT @ 60 s / display @ 6 h** (the counters are contention state, and answering from a 60-second-old copy is exactly right: the requester is being told to wait) · `Catalog` ADMISSION_STALE_TOLERANT @ 6 h, display @ 24 h (a model does not become dangerous with age, but a licence revocation or deprecation should not take a day to bite) · `Bridge.GetQueueEstimate` display only @ 60 s. **`fleet` is two ports, not one:** revision 2's single row had to serve two unrelated facts and so had to be correct for a refusal or correct for a wait estimate, and it cannot be both. NFR-13's clause that each rule's fail mode is derived from its declared inputs is what forces the split, and a test fails if the two merge back. **A port call has four outcomes, not two:** `ok(value)`, `notFound` (a negative lookup, decided by `R-VALID-01` as `ACTOR_UNKNOWN` or `MODEL_NOT_FOUND`, never `R-DEP-01` and never a cached body), a transport error, and `ok(malformed)` — a 200 whose body fails the adapter's schema, which is **promoted to a transport error**, because a rule predicate is a total function over the fact type and a missing field is the cheapest fail-open in the module: `undefined − undefined` is `NaN`, `NaN ≤ 0` is false, and a truncated availability payload therefore answers "the fleet is not contended" on a 24-machine reservation. **An over-age value is an error, not a fact:** a value older than its own admission tolerance escalates to the `FAIL_CLOSED` path, without which the tolerance is decorative in the only branch that uses it. The clock additionally carries a **quality**, not just an instant: a reading with `stratum ≥ 15`, a leap flag, a negative age, or an instant behind the last reading this process accepted is a port error, because an age-only check of `FAIL_CLOSED(0)` passes a *backward* step and a two-second backward step at 08:13 walks around a freeze that began at 08:00 with a clean, fully attributed trace. **Acceptance:** with the `quota` port down, 100 % of requests are `DENY` with `R-DEP-01` and `retry_after_ms`; with the `Catalog` port down and a snapshot 12 h old, 100 % of requests proceed and 100 % carry `Catalog` in `stale_facts[]`; with the `Timetable` port down and a snapshot 5 minutes old, 100 % of requests are `DENY` with `R-DEP-01` and `cause = DEPENDENCY_UNAVAILABLE`; with `fleet.Availability` at 61 s and no fresher copy, 100 % are `R-DEP-01` while `fleet.NodeClassTable` continues to answer; with `fleet.NodeClassTable` down, `R-TIER-01` may not fire from a cached copy. The clock port is never stale-tolerant. |
| **FR-11** | Journal every decision, append-only, without blocking admission. | A `Decision` is produced. | Full `Decision` + `evidence_snapshot_ref` | Append only: the M2 database role has `INSERT` and `SELECT` and **not** `UPDATE` or `DELETE`; publication is asynchronous | `DecisionProduced` event on the platform bus, within 5 ms of the decision, **after** it is returned to the caller | 100 % of decisions are queryable by `(actor_id, subject_id, model_ref, outcome, time range)` within 30 s of production. Re-running the same closed-window query over a total order of `(evaluated_at, decision_id)` returns a bit-identical result set. **0** rows are ever updated or deleted, asserted against the live role's grants. **0** decisions are dropped when the bus is unavailable (NP-10). |
| **FR-12** | Version policy and pin decisions to exactly one version. | A rule-set change is published. | A new content-hashed rule set | Monotonic version; immutable once referenced; read start-to-finish | `policy_version` on every decision, journal entry, and event | A published version takes effect for new decisions within 5 s; a version published **during** an in-flight evaluation does not affect that evaluation; a version referenced by any journal entry is byte-frozen forever, asserted by a store-level rejection test. A version carries the diff (`changed_rule_ids`) so a stale console can state *what* changed. |
| **FR-13** | Keep the engine free of ambient time, I/O, and randomness. | Any code path in the engine package. | `CampusClock` and all facts injected as arguments | **Import allow-list, not a symbol scan** (a symbol scan is defeated by a one-line alias): `engine/` may import neither `net`, `net/http`, `net/url`, `os`, `math/rand`, `crypto/rand`, `context`, nor `time`'s `Now`/`Since`. The only time source reachable from `engine/` is the injected `CampusClock`. | Build-time gate + tests | **1.** CI fails if `engine/` imports any denied package. **2.** `evaluate()` is exercised with the `fixtures/` directory made unreadable and with no network, proving no I/O. **3.** An interface-conformance test asserts the only time source reachable from `engine/` is the injected `CampusClock`. **4.** 10 000 replays are byte-identical (NFR-3). |
| **FR-14** | Expose an interactive evaluator and a freeze console, as clients of the public API. | Dr. Rebecca Reed or a member of the module team opens the prototype. | Public API only | No privileged back door; the console cannot reach behind the engine | Evaluator screen; freeze console with a mandatory **consequence preview** | 100 % of console actions are achievable through documented API calls, and the console's client is a black-box test that reaches the engine **only** through those calls. The freeze console's `ACTIVATE` control is disabled until a consequence preview has been rendered for the current draft hash and a non-empty `reason` is present; activation with the preview call stubbed to fail is blocked, asserted by `test/scenario/sa-5.test.ts`. |
| **FR-15** | Keep this document's own language falsifiable. | Any edit to `planning/`, `reviews/`, or `ai-log/`. | The banned-term list below | CI doc-lint | Build fails | The doc-lint fails CI on any occurrence of: `efficiently`, `appropriately`, `securely`, `user-friendly`, `robust`, `scalable`, `fast`, `human-readable`, `concrete`, `real`, `genuinely`, `seamless`, `frictionless`, `straightforward`, `effective`, `access-bearing`, `blast radius`. And fails on any occurrence of `the user`, `the admin`, or a regex match for `\b(A|An) (thesis student|CV undergraduate|operator|developer|user|admin)\b` with no proper name. |
| **FR-16** | Reserve the word "error" for a **broken surface**, and never for a `DENY` and never for the engine being unable to decide — because it never is. | A `DENY` is rendered, or a surface fails. | `Decision`; the rendered copy table | A `DENY` is a result, not a fault. `R-DEP-01` at precedence 0 is a **rule**, so a dependency failure is a `DENY` too; the only true "error" states in this module are a failed journal fetch, a failed trace fetch, and a failed preview computation | Decision card copy | 0 rendered `DENY` cards contain the strings `error`, `failed`, `403`, or `CANNOT EVALUATE`; the `cause` enum has no member that means "generic refusal" (§5.2), asserted by an enum-membership test; the string `CANNOT EVALUATE` appears in **0** copies, asserted by a grep over the rendered-copy table — it is a prohibited string precisely because revision 2's UI named a state the domain does not contain, and copy that names a state a reader has never seen teaches them the module has modes it does not have. |

---

## 8. Non-Functional Requirements

Each metric is a number with a stated measurement method. Banned elastic terms are listed in FR-15 and enforced by a doc-lint that runs in CI, not by assertion.

| ID | Requirement | Target | Measurement method |
|---|---|---|---|
| **NFR-1** | `evaluate()` latency — the rule walk, constraint expansion, and rationale render, excluding fact acquisition | `p99 ≤ 5 ms`, `p50 ≤ 1 ms` at **100** concurrent evaluations | Load test: 100 concurrent synthetic requests over a 10 000-request run; percentile over a server-side timer wrapped around `evaluate()` only |
| **NFR-2** | Decision-path purity | `0` network calls **originating in the `engine/` package** per decision; `0` model invocations | Import-allow-list CI check over `engine/`; plus a test that drives `evaluate()` from a literal `DecisionContext` with `fixtures/` unreadable |
| **NFR-3** | Determinism | 100 % byte-identical `Decision` for the same `(request, fact snapshot, policy_version)` over 10 000 replays, with `evaluated_at = campus_now` | Golden-file replay harness + byte comparison; plus a canonical-ordering assertion over 10 000 generated contexts (§6.5) |
| **NFR-4** | Boundary correctness | For every window boundary `b` and every generated instant `t ∈ {b − 1 ms, b, b + 1 ms}`: `contains(window, t)` is `true` iff `t < b`, for both a start boundary and an end boundary. **0** exceptions; any exception is a test failure, not a waiver. | Property test over 1 000 generated boundary instants per window type × 6 window kinds (LAB, CLASS, EXAM, freeze, night-window start, night-window end). The expected value is computed independently of the engine, not read back from it. |
| **NFR-5** | No credential or PII leakage | `0` occurrences of bearer tokens, API keys, actor full names, or e-mail addresses in any trace, rationale, journal entry, or log line | Scrubbing assertion over 10 000 generated decisions including deliberately poisoned fixtures; regex deny-list. Actor **ids** are permitted and are what the journal stores. |
| **NFR-6** | Explanation completeness | 100 % of decisions carry a non-null `primary_rule_id` from the registry, ≥ 1 resolvable citation, and a non-empty `rationale`. **0** `DENY` decisions render a rationale that does not name a rule and a `cause` from the §5.2 enum. | Contract test over the 3-outcome × 21-rule matrix; schema assertion that a `DENY` without `next_actions` and without the `NO_ALTERNATIVE_AVAILABLE` sentinel is rejected at construction |
| **NFR-7** | Policy activation latency | `≤ 5 s` from publish to effect on new decisions; `0` effect on in-flight decisions | Publish/readiness-probe test |
| **NFR-8** | Journal availability | `≤ 30 s` from decision production to queryability | Ingest-to-query lag probe |
| **NFR-9** | Fact fan-out latency (separate budget from NFR-1) | 10 ports fetched in parallel, `p99 ≤ 45 ms` at 100 concurrent | Load test with per-port timers. **Reconciliation invariant:** `FACT_TIMEOUT_MS × 1 ≤ NFR-9 p99 ≤ FACT_TIMEOUT_MS × 1.5`, asserted as a test so the two constants cannot drift apart. A port that exceeds the cap has its cancellation propagated and is counted in `fact_aborts_total` — the cap **aborts**, it does not stop waiting, or 100 concurrent evaluations would leave 1 000 orphaned upstream calls inside one p99 window and turn the module's latency problem into the platform's |
| **NFR-10** | Explanation render cost | `p99 ≤ 2 ms` per rationale, `0` external calls | Micro-benchmark over 10 000 renders |
| **NFR-11** | Independent runnability | A single launcher (`make dev`) brings up the prototype on a clean machine with `0` external services and `0` GPUs present, **and** a second test runs the engine against fixture-backed **stub servers on bound sockets**, proving the port boundary is a boundary and not a compile-time fiction | Cold-start record in `planning/readiness-gate-report.md` |
| **NFR-12** | Rule-precision | `≥ 90 %` of requests resolve with exactly **one** rule matched (no cascading triage), and `0 %` of `CONSTRAIN` decisions carry a constraint the requester does not need | Distribution report over the FR test matrix; a "needless constraint" predicate test over the boundary matrix |
| **NFR-13** | Fail-closed coverage | **100 %** of ports are present in the §7 FR-10 classification table, and the table is the **sole** authority — no rule is classified independently of its inputs. A rule whose input port is `FAIL_CLOSED` is fail-closed by inheritance; a rule whose every input is `STALE_TOLERANT` is fail-open with a `stale_facts[]` entry. | Table-completeness test over the registered port list + an inheritance test that derives each rule's fail mode from its declared inputs and compares it to the rule's documented behaviour. **This replaces revision 1's NFR-12**, which classified rules by *family name* and therefore contradicted FR-10 on every rule that reads the catalogue. |

---

## 9. State Model

### 9.1 Freeze lifecycle (M2 is the sole writer)

```
DRAFT ──activate(reason, preview_token)──▶ ACTIVE ──campus_now ≥ ends_at──▶ EXPIRED
                                              │
                                              └──lift(lift_reason, by)──▶ LIFTED
```

`ACTIVE` is terminal-with-expiry. `LIFTED` requires a non-empty `lift_reason` and the **id** of the named activating person. A freeze cannot be edited while `ACTIVE`; superseding it means lifting and activating a new one, which produces two distinct `freeze_id`s and a `supersedes` pointer, so an audit never has to guess which freeze applied. Activation requires a `preview_token` — a hash of the draft freeze with a 60 s TTL — so "the person activating must look at the consequences" is a server-enforced precondition rather than a UI convention, and a caller using `curl` cannot skip the preview either.

### 9.2 Decision-effect state (what the engine publishes, not what it owns)

| Published field | Meaning | Delegate that enforces it |
|---|---|---|
| `valid_until` | The instant after which this decision confers no authority | Gateway + M9 re-check before every launch |
| `must_checkpoint_by` | Hard deadline; failing to exit by this instant is a policy violation attributable to the job. **Always equal to `valid_until`** (§5.1) — the decision names one instant, not two. | M9 (`SIGTERM`, checkpoint retained) |
| `constraints[]` | Machine-checkable obligations, each with an `enforced_by`; applied server-side, never advisory (OQ-2) | Gateway + M9 |
| `suppressed[]` | Facts from rules that did **not** apply but would have. Not binding; carried so the console can answer "and what about my quota?" without a re-evaluation round-trip | none — display only |

A constraint without a non-null `enforced_by` is a constructor error. A deadline nobody enforces is a lie, and the console's "deadline passed" state must name the delegate that failed to signal — the engine cannot observe job state (AD-5: the bridge is the sole cluster authority), so it distinguishes *no signal from the delegate within 60 s* from *the bridge confirmed the job is still running*, which have different owners.

### 9.3 Quota commit protocol

Spine rule 4: a quota decrement is atomic, never read-then-write; a read-then-write pattern in the decrement path is an invariant violation, not a future optimisation. Because M2 cannot mutate a balance (NG-3, rule 1), the atomic compare-and-decrement happens at M8 at commit time, and a `QUOTA_CAP` decision is therefore **provisional**:

1. `R-QUOTA-02` reads the balance and emits `CONSTRAIN → QUOTA_CAP` with `cap_value = remaining` and `authority = PROVISIONAL`.
2. At launch, M8 performs an atomic compare-and-decrement of `per_request_need` against the live balance.
3. On success the decision becomes `FINAL`. On failure the grant is revoked and the requester is re-evaluated against the new balance.
4. `provisional` decisions are journaled as such, so an audit can see which admissions were confirmed and which were revoked.

`R-QUOTA-01`'s balance is read with tolerance 0, so a zero balance that has since been refilled is never used to deny.

---

## 10. Error Model and Mandatory Non-Happy Paths

| ID | Condition | Behaviour | Rationale |
|---|---|---|---|
| **NP-1 (mandatory)** | **Quota port down, or slower than `FACT_TIMEOUT_MS = 40`** | Fail **closed**: `DENY(DEPENDENCY_UNAVAILABLE)` with `R-DEP-01`, `retry_after_ms = 2000`, and the failing port named in the trace | An authorisation-class input; a lost quota read must never become an unbounded grant. During an exam freeze this is the difference between a refused request and a 70 GB job on the exam machines. |
| **NP-2 (mandatory)** | **Emergency freeze activated while a job is already admitted** | The engine has no state to mutate and nothing to stop. The *next* evaluation of that request returns `DENY(FREEZE_ACTIVE)` with `R-FRZ-01`, and the trace shows the freeze id alongside the pre-freeze `valid_until`. The shell publishes `policy.freeze.activated.v1`; the delegate preempts (spine rule 7: preemption is command-driven, never inferred locally). | Tests the module against its own purity contract, and is the only way to prove the engine holds no admission state. |
| **NP-3** | `campus_now` lands exactly on a window's `end` and on the night window's `start` | The half-open convention resolves it deterministically: outside the lab window, inside the night window. Tested at 1 ms granularity (NFR-4) | Boundary correctness is a correctness property, not a tolerance. |
| **NP-4** | DST spring-forward inside a lab window | Rule evaluation uses campus-local wall time via the configured IANA zone, so a `01:00–04:00` window on a transition day is evaluated as 2 elapsed hours. `R-LAB-01`/`R-LAB-02` remain correct because they are containment tests on wall time; `R-BOUND-01` and §6.1 step 3 are computed on **absolute instants**, never wall-clock arithmetic. | Prevents the classic "01:30 never happens" denial hole. With `CAMPUS_TZ = America/Panama` (A-3) this path is unreachable in V1, and the property test still exercises it under a DST zone. |
| **NP-5** | Request is self-contradictory (declares 24 GB but the model's floor is 48 GB) | `DENY(NO_SUCH_HARDWARE)` with `R-TIER-01`; the trace cites both the request and the model floor. Never silently corrected. | Silent correction hides a client bug. |
| **NP-6** | Policy version changes between the request arriving and the decision being produced | The decision is evaluated wholly against one pinned version; the new version applies from the next evaluation. `policy_version` is on the decision, the journal entry, and the event. | Determinism (NFR-3) outranks instant propagation. |
| **NP-7** | A protected window is added whose `starts_at` is in the past relative to `campus_now` | `ends_at ≤ campus_now` → ignored. `starts_at < campus_now < ends_at` → treated as active. A window fully in the past is ignored, never retro-denied. | Retroactive denial of already-admitted work is not a policy the institution can defend. |
| **NP-8** | Two rules declare the same precedence | Impossible by construction: the boot validator refuses to start (FR-13's build gate, §6.2). | Removes a whole class of nondeterminism. |
| **NP-9** | The minimum bound in §6.1 step 4 is already in the past | No `CONSTRAIN` with an expired deadline is emitted. `ALLOW` with `valid_until = campus_now` and a `WINDOW_SCOPE` constraint naming the boundary and stating that no time is granted inside it. | A delegate asked to enforce a deadline in the past has no correct behaviour, and a constraint the requester cannot satisfy is not a constraint. |
| **NP-10** | The event bus is unavailable when a decision is produced | The decision is **still produced and returned**. Admission is never blocked on publication (spine: the Audit Ledger "is never a synchronous dependency of any admission path"). The shell buffers up to 10 000 events in memory, retries, and raises a `journal_lag` metric; a backlog over 60 s raises a paging alarm to the on-call address in `OWNERSHIP.md`. | Revision 1 placed the journal publish inside `evaluate()`, which made bus availability part of the p99 decision path and inverted a binding spine guarantee. |
| **NP-11** | `exam_binding` is supplied but names a reservation that is cancelled, belongs to another subject, or does not exist | `DENY(INVALID_REQUEST)` with `R-VALID-01`. Never silently dropped — a dropped binding would let the request fall through to `R-FRZ-01` and produce a `DENY` whose reason is misleading. | Revision 1 accepted an unvalidated, client-supplied id as the sole exemption from four rules. |
| **NP-12** | A freeze expires *during* an in-flight evaluation | The evaluation reads one consistent freeze snapshot taken at `campus_now`; a freeze that expires mid-evaluation affects only the next decision. `EXPIRED` is computed from the clock, never from a job's state. | Half-open lifecycle boundaries behave like every other boundary. |

---

## 11. Scenario → Requirement Traceability

| Scenario | Protagonist | FRs exercised | NFRs exercised | Rules expected to fire |
|---|---|---|---|---|
| **S-1 Scheduled Lab Protection** — background jobs denied Mon/Wed 10:00–12:00 | Elena Vargas | FR-1, FR-4, FR-9, FR-14 | NFR-3, NFR-4, NFR-6 | `R-LAB-01` (primary); 8 `NO_MATCH`, 10 `NOT_EVALUATED` |
| **S-2 VRAM Tier Gate** — 70B / 48 GB refused with a tier explanation | Elena Vargas | FR-1, FR-3, FR-9, FR-16 | NFR-5, NFR-6, NFR-12 | `R-TIER-02` (primary, `DENY`) with `R-TIER-03` `NO_MATCH`; `R-ALLOW-01` on the re-evaluated alternative |
| **S-3 Overnight Grace / Straddle** — a night-approved job bounded before the protected morning window | Elena Vargas, with Dr. Rebecca Reed owning the 09:00 window | FR-1, FR-5, FR-6, FR-7, FR-9 | NFR-3, NFR-4, NFR-9, NFR-12 | `R-BOUND-01` at 05:55 (overnight end governs, the 08:55 lab bound is `superseded`) and at 08:55 (lab governs); `R-ALLOW-01` for the short run |
| **S-4 Emergency Freeze** — an exam freeze denies all non-exam requests | Dr. Rebecca Reed | FR-1, FR-2, FR-7, FR-9, FR-12, FR-14, FR-16 | NFR-6, NFR-7, NFR-11 | `R-FRZ-01` (primary); `R-FRZ-02` for the 3 allowance-bearing requests |
| **S-5 Quota Exhaustion** — Elena's remaining balance is below her declared need | Elena Vargas | FR-1, FR-8, FR-9 | NFR-5, NFR-6 | `R-QUOTA-02` (primary, `CONSTRAIN → QUOTA_CAP`, `authority = PROVISIONAL`) |
| **S-6 Night Training Daemon** — the SYSTEM actor's narrowed rule set | Night Training Daemon (`NIGHT_TRAINING_DAEMON`), operated on Dr. Rebecca Reed's behalf | FR-1, FR-5 | NFR-6, NFR-12 | `R-SYS-01` for a disallowed workload kind; `R-NIGHT-01` recorded `NO_MATCH` on the `actor_kind = HUMAN` guard |
| **S-7 Failing hardware** — every satisfying class is degraded, not busy | Elena Vargas | FR-1, FR-9, FR-10 | NFR-6, NFR-13 | `R-FLEET-01` (`DENY(HARDWARE_FAILING)`), with `R-CONTEND-01` `NOT_EVALUATED` |
| **S-8 Thesis commitment** — a thesis window bounds an otherwise-admissible run | Elena Vargas, with Dr. Rebecca Reed countersigning the window | FR-1, FR-6, FR-7, FR-9 | NFR-4, NFR-6 | `R-BOUND-01` with the `THESIS` window as the `governing` boundary |

**Every FR in §7 is exercised by at least one scenario above or by a named test in `planning/readiness-gate-report.md`.** FR-10, FR-11, FR-12, FR-13 and FR-15 are cross-cutting and are proven by contract, property, and lint tests rather than by a screen; the readiness gate names each of those tests by id. Revision 1's version of this sentence was false: FR-8 was exercised by nothing, and the readiness gate named no tests at all.

---

## 12. Acceptance Gates for This PRD

| Gate | Condition | Result |
|---|---|---|
| AG-1 | All 16 FRs have a measurable acceptance condition containing a number or an exhaustive quantifier. | **PASS** |
| AG-2 | All 13 NFRs state a target and a measurement method; the banned-term list (FR-15) is enforced by a CI doc-lint. | **PASS** |
| AG-3 | ≥ 2 mandatory non-happy paths (NP-1, NP-2), plus NP-3…NP-12. | **PASS** |
| AG-4 | Boundary stated in owned / read / non-goal form, with no cross-team code or database dependency. | **PASS** |
| AG-5 | Every rule referenced anywhere in §§5–10 appears in §6.2 with an id, a precedence position, a condition, an outcome, and ≥ 1 citation. | **PASS** — 19 rules, 19 rows; asserted by `test/arch/registry-completeness.test.ts` |
| AG-6 | Zero occurrences of "the user", "the admin", or an unnamed generic role in §§2, 5, 6, 7, 10, 11. | **PASS** — enforced by the FR-15 lint, whose deny-list includes `operator`, `developer`, `admin`, and a regex for `A/An <role>` with no proper name |
| AG-7 | Every `citation_id` in §6.2 resolves to a `doc_id` in the §5.3 registry, and every `DENY` cause in §5.2 maps to ≥ 1 rule and vice versa. | **PASS** — asserted by `test/arch/registry-completeness.test.ts` and boot-time validation |
| AG-8 | Every rule in §6.2 is **reachable**: a passing test exists that makes it the `primary_rule_id`, and a passing test exists that would fail if the rule were deleted. | **PASS** — required after review finding PRD-12, where an acceptance test passed identically with its subject removed. 19 rules × 2 tests = 38 tests, listed in the readiness gate report. |
| **AG-9** | **No rule's condition is a strict subset of another rule's.** For all *i* ≠ *j*: `cond(i) ⊄ cond(j)` and `cond(j) ⊄ cond(i)`, checked pairwise over the catalogue's declared predicate metadata. | **PASS** — added after cross-document reconciliation found that the review's own PRD-12 fix (`R-GRACE-01` gaining a durability precondition) had made it a strict subset of `R-STRADDLE-01`, and that `R-THESIS-01` had the same shape. Both were merged into `R-BOUND-01`; the 8 h horizon survives only as a display threshold. **This gate exists because the bug class was found three times in one document and the third time inside the repair for the second.** Asserted by `test/arch/ad2-subsumption.test.ts`. |
| **AG-10** | **Every field declared in a fact type has a named consumer**: at least one rule predicate, or one named non-decision surface (the freeze preview tile, the console's evidence panel, the event payload). | **PASS** — added after the architecture edge-case pass found `required_node_count` declared, cited in an acceptance criterion, and recorded by the first review as "retained and now read", when no rule reads it. The defect is not the unread field; it is that the module could *claim* a field was read and no gate existed to check the claim — the same shape as `AG-9`, which exists because a repair for one dead rule produced a second. Asserted by `test/arch/ad2-fact-coverage.test.ts` against the **shipped** fact types, not a fixture. |
| **AG-11** | **Every `DENY` cause in §5.2 names a non-overlapping classification**: for each cause, the set of inputs that produce it is disjoint from every other cause's, and a mistyped identifier or a missing entity is never classified as `DEPENDENCY_UNAVAILABLE`. | **PASS** — added after EDGE-13/EDGE-14. `ACTOR_UNKNOWN` and `MODEL_NOT_FOUND` were folded into `R-VALID-01` rather than given rules of their own, and `notFound` is a distinct port shape from a transport error, so the three cases a request can be "not admitted" for non-resolution reasons are separately citable and separately the escalation's responsibility. Asserted by `test/arch/registry-completeness.test.ts` (cause↔rule bijection) and `test/arch/ad4-port-failure.test.ts` (the `404` column). |

---

## 13. Review Triage Log

Source: `reviews/review-prd-adversarial.md` — 28 findings (8 Critical, 14 High, 5 Medium, 1 Low), lens `bmad-review-adversarial-general`, against SPEC.md and ARCHITECTURE-SPINE.md.

| Finding | Sev | Verdict | Disposition |
|---|---|---|---|
| PRD-1 No `ALLOW` rule, no default | Critical | **ACCEPT** | Added `R-ALLOW-01` at precedence 17 as an explicit cited rule. §6.2.1 item 1. |
| PRD-2 `R-TIER-03` shadowed; FR-3 self-cancelling | Critical | **ACCEPT** | `R-TIER-03` moved to 3, `R-TIER-02` to 4, `R-TIER-02` made the strict complement, FR-3 split into three disjoint clauses. §6.2.1 item 2. **Reverses decision-log L-3.** |
| PRD-3 FR-10 vs NFR-12 contradiction; 60-min stale timetable | Critical | **ACCEPT** | Replaced the family-based classification with a **port**-based one carrying two bounds (admission tolerance, display tolerance). `Timetable` is now FAIL_CLOSED at 60 s. NFR-13 replaced NFR-12 and derives each rule's fail mode from its inputs. |
| PRD-4 Unvalidated client-supplied `exam_binding` | Critical | **ACCEPT** | Added `Reservation.GetReservation` port, `R-VALID-01` at precedence −1, NP-11, and an identity requirement: the actor is resolved from the authenticated session, and a `Request.actor_ref` that does not equal the session actor is `R-VALID-01`. |
| PRD-5 Freeze aggregate unowned, no write API | Critical | **ACCEPT** | §3.1 now declares M2 the sole writer and names four endpoints; §9.1 gains the `preview_token` precondition. |
| PRD-6 "0 network calls" self-refuting | Critical | **ACCEPT** | §6.1 states the engine/shell boundary explicitly; NFR-2 measures imports in `engine/` and adds the unreadable-fixtures test. |
| PRD-7 CAP-3/CAP-7 "hardware failing" cause missing | Critical | **ACCEPT** | Added `R-FLEET-01` at 6; `available_count` declared net of cordons; `HARDWARE_FAILING` added to the cause enum; scenario S-7 added. |
| PRD-8 `R-QUOTA-02` is read-then-write (spine rule 4) | Critical | **ACCEPT** | §9.3 commit protocol; `authority = PROVISIONAL|FINAL`; quota port tolerance 0; FR-8 gains a concurrency acceptance clause. |
| PRD-9 `R-DEP-01` absent from the catalogue | High | **ACCEPT** | Added at precedence 0 with citations. AG-5 extended to "every rule referenced anywhere". |
| PRD-10 FR-6's example violates FR-6's own bound | High | **ACCEPT — and superseded** | The number was corrected, and then the rule it belonged to was merged away entirely. Recorded as **RC-1** below, because the arithmetic error and the structural error had the same root: the boundary formula had never been evaluated end-to-end against a night-window-to-morning-class gap taken from the timetable. |
| PRD-11 `R-STRADDLE-01` unsatisfiable + forward reference | High | **ACCEPT** | The forward reference disappears with the rule. `PROTECTION_GRACE` is declared once in §5.4, and the boundary set is now a single named object `B` in §6.3 instead of three rule-specific lists. |
| PRD-12 `R-GRACE-01` shadows `R-STRADDLE-01`; test can't fail | High | **ACCEPT — and the suggested fix was insufficient** | AG-8 was added and satisfied. The suggested remedy (narrow `R-GRACE-01`'s workload set so the two rules yield different outcomes) would have made `R-GRACE-01` a strict subset of `R-STRADDLE-01` — a *second* dead rule, created by the repair. Superseded by **RC-2**: both rules merged into `R-BOUND-01`, and AG-9 added so the class of bug cannot recur silently. |
| PRD-13 `R-FRZ-02` at 14 makes FR-2 impossible | High | **ACCEPT** | Moved to precedence 2. **Reverses decision-log L-7.** FR-2's quantifier now names the six rules that remain excluded. |
| PRD-14 Five unread fields; the daemon has no lawful path | High | **ACCEPT — one suggestion declined** | Added `R-LAB-02` (EXAM), subject scoping on `R-LAB-01`, `R-SYS-01`; `actor_kind = HUMAN` guard on `R-NIGHT-01`; `required_node_count` and `recurrence` retained and now read; scenarios S-6 and S-8 added. The review's suggested `R-THESIS-01` was **rejected**: a thesis commitment is a scheduled window, not a rule, and modelling it as a rule would give M2 a hand-maintained second copy of a schedule it does not own. It is now a `ProtectedWindow` of kind `THESIS` on the same port from the same owner. **Recorded as L-9.** |
| PRD-15 Latency arithmetically impossible; 50 vs 100 concurrent | High | **ACCEPT** | Split into NFR-1 (`evaluate()`) and NFR-9 (fan-out); `FACT_TIMEOUT_MS` 150 → 40; load raised to 100; the reconciliation invariant is asserted as a test. |
| PRD-16 Journal publish synchronous inside `evaluate()` | High | **ACCEPT** | §6.1 step 6 now only pins fields; publication moved to the shell after return; NP-10 specifies the failure path. |
| PRD-17 Scope leak: Audit Ledger query API, REST vs gRPC, mutable registry | High | **ACCEPT** | §3.1 narrowed to the event *shape*; NG-10 added; all ports rewritten as gRPC service/method names; the registry is an immutable artefact. |
| PRD-18 `CONSTRAIN` merges queued and admitted; wait estimate has no source | High | **ACCEPT** | `admission` field + invariant in §5.1; `queue_estimate_ref` is an opaque id resolved by M3, so it enters the pinned snapshot and NFR-3 survives. |
| PRD-19 `R-AUTH-02`'s deciding input undefined; `TA` not in CAP-6 | High | **ACCEPT** | `required_min_role_tier` added to `ModelFacts`; `TEACHING_ASSISTANT` documented against M1 and CAP-6 (A-4); A-4's fallback is now implementable. |
| PRD-20 NFR-4 and NFR-6 cannot fail | High | **ACCEPT** | NFR-4 restated as a computable predicate with an independently-computed expectation; NFR-6's tautological clause replaced with a content requirement. |
| PRD-21 Elastic terms and tautological FRs | High | **ACCEPT** | FR-15 adds the missing terms to the ban list and gives the lint a home in CI; §5.3 gives citations a registry; FR-3, FR-4, FR-5, FR-8, FR-14, FR-16 rewritten to be falsifiable. |
| PRD-22 Traceability false for FR-8; gate names no tests | High | **ACCEPT** | S-5 through S-8 added; §11 now names the test ids; AG-6's deny-list widened. |
| PRD-23 Dangling refs and misattributed AD ids | Medium | **ACCEPT** | `EC-4` → NP-4; `AD-4` → §6.4; `AD-5` → "rule 7 and AD-5"; L-4, L-9 and R-UX-03 now exist in `ai-log/decision-log.md`; the 12 citation ids resolve in §5.3. |
| PRD-24 A-1's fallback is unbuildable; two aggregates behind one read | Medium | **ACCEPT** | A-1's fallback now names the §3.1 write API; `Timetable` and `Reservation` are separate ports; `ProtectedWindow.source` discriminator added. |
| PRD-25 `requested_gpu_count ∈ [1, 8]` against a 2-GPU maximum | Low | **ACCEPT** | Range narrowed to `[1, 2]` and the two realisable pairs enumerated. |
| PRD-26 `Decision` defined twice, fields missing | Medium | **ACCEPT** | Single normative definition in §5.1; the §3.1 copy deleted; `QuotaFacts` defined. |
| PRD-27 Byte-identity unachievable; Go map order unaddressed | Medium | **ACCEPT** | `evaluated_at = campus_now` stated; §6.5 canonical-ordering table added and asserted by a generated-context test. |
| PRD-28 Purity gate is a defeatable symbol lint | Medium | **ACCEPT** | Replaced by an import allow-list plus three tests (FR-13). NFR-11 now also proves the port boundary with bound sockets. |

**Accepted in part:** 2 — PRD-10 and PRD-12. In both the review's arithmetic was fixed and the structural cause survived, resurfacing as RC-1 and RC-2.
**Findings declined:** 1 — PRD-14's proposed `R-THESIS-01`, replaced by a `ProtectedWindow` kind (L-9).
**Findings declined by the reviewer:** 0. The reviewer proposed nothing this author judged wrong on the merits.

---

## 14. Reconciliation Findings (raised during cross-document work, not by the review)

Applying the revision-2 PRD to `ux/C-UX-Scenarios/scenario-3.md` produced five further defects, three of them structural rather than editorial. They are logged with the same rigour as the review's findings, because the alternative — quietly fixing them — would leave no record that the class of bug survived triage once.

| Finding | Sev | Verdict | Disposition |
|---|---|---|---|
| **RC-1** FR-6's worked example is still arithmetically wrong after the PRD-10 fix | Critical | **ACCEPT** | At 01:10 with 420 min the request ends 08:10, *before* the 08:55 bound, so the rule does not fire and the example asserts the opposite of the truth. Recomputed to 540 min. The root cause is that PRD-10 corrected one number inside a formula that had never been evaluated end-to-end. The formula now lives in §6.3 as a named object, and FR-6/FR-7 carry three worked cases each with the arithmetic shown. |
| **RC-2** The PRD-12 fix makes `R-GRACE-01` a strict subset of `R-STRADDLE-01` | Critical | **ACCEPT** | Merged into `R-BOUND-01`; `GRACE_HORIZON` retired to `NEAR_BOUNDARY_DISPLAY_HORIZON`, a display-only constant. AG-9 added. §6.2.1 item 4. **This is the finding that justifies AG-9 existing at all.** |
| **RC-3** A rule can emit `must_checkpoint_by` later than the decision's own `valid_until` | Critical | **ACCEPT** | `R-GRACE-01` could name a 09:00 lab (→ 08:55) while the enclosing overnight window expired at 06:00 (→ 05:55), producing an instruction a delegate cannot execute and a requester cannot satisfy. The bound is now computed in §6.1 step 3, **before** the rules, and the invariant `must_checkpoint_by = valid_until` is stated in §5.1 and asserted by FR-7 clause 4 over 10 000 generated contexts. |
| **RC-4** EC-3.8 assumed two rule-derived constraints can coexist | High | **ACCEPT** | They cannot and should not. The single-producer invariant in §5.1 replaces the assumption: the earlier rule wins, the later is `NOT_EVALUATED`, and its fact is surfaced through the new `suppressed[]` field (FR-9). The requester is told "you have 3 h of quota, which ends before the 05:55 deadline" rather than discovering it at 03:00. |
| **RC-5** `priority_class` was a request field that no rule read | High | **ACCEPT** | Removed from `Request`. A thesis commitment is a `ProtectedWindow` of kind `THESIS` on the same port from the same owner; an examination is a reservation reached through `exam_binding`. One source of truth, no parallel mechanism. **L-9.** |
