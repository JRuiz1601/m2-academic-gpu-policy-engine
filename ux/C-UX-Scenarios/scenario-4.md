# Scenario 4 — Emergency Freeze Rule
## Module M2 — Academic GPU Policy Engine

**Annex scenario:** *"Lab admin activates an emergency compute freeze for an upcoming examination; all non-exam requests are denied."*
**Protagonist:** Dr. Rebecca Reed — Lab Director, GPU Teaching Lab (`role_tier = INSTRUCTOR`, `LAB_OPERATOR` scope)
**Rules under demonstration:** `R-FRZ-01` at precedence **1** → `DENY` · `R-FRZ-02` at precedence **2** → `CONSTRAIN → WINDOW_SCOPE` · `R-DEP-01` at precedence **0** → `DENY` (failure path) · `R-VALID-01` at precedence **−1** → `DENY(NOT_AUTHORIZED)` (allowance cannot outlive its entitlement)
**Surfaces:** UX-4 Freeze Console (mobile, 390 px), UX-1 Evaluator (verifying the effect), UX-3 Journal (proving it afterwards)
**PRD revision:** 3 · **Catalogue:** 19 rules, precedence `−1 … 17`

> **A note on naming.** The consequence preview below is called the **consequence preview**, and the console's tile is `REQUESTS AFFECTED`. The earlier drafts of this document called it a *blast radius* and the persona note called the person pressing the button an *operator*; both are on `prd.md` FR-15's deny-list, and a document that bans a word in one file and uses it in the next has a lint that will be switched off within a week. The named person is Dr. Rebecca Reed, and she is named.

---

## 1. Scenario outline

| | |
|---|---|
| **When** | Thursday 2026-04-09, 07:12 local, the day of the `CS-480-VLM` final examination |
| **Where** | Dr. Reed's phone, in the corridor outside the lab, 40 minutes before the room opens |
| **Why** | 37 training and batch jobs are queued or running. If any of them land on the 24 machines the exam room needs, the exam starts late or on underpowered hardware — an institutional incident, not a technical one. |
| **What she wants** | Stop everything that is not the exam, for 6 hours, without touching the exam's own reservations. |
| **What she does not know** | Whether the exam's own reservation records are recognised as allowances by the policy engine, or whether a freeze would kill the exam itself. |
| **Internal tension** | The action is hard to reverse in practice, the deadline is 48 minutes away, and she is on a phone. The freeze is the only capability in this module that destroys work already in progress. The console's entire job in this scenario is to make it **safe to press**. |
| **Resolution** | Draft → consequence preview → activate with a named reason → 37 requests begin returning `R-FRZ-01` `DENY`, 3 exam-bound requests are admitted under `R-FRZ-02` with `WINDOW_SCOPE`, 6 h 48 min later she lifts it with a reason. |
| **Residue** | The journal shows exactly who froze what, when, with which reason, and exactly which requests it denied. Nobody has to take her word for it. |

---

## 2. [C] Conceptualise

**Form factor.** 390 px. The freeze console is the only surface in the module that must work on a phone, because it is the one surface used under time pressure away from a desk. 44 px minimum touch targets; no hover-only affordance; the confirm action is a real button, never a long-press, never a swipe.

**Layout (single column, top to bottom)**

```
┌──────────────────────────────┐
│ A  scope builder             │  ← ① what is affected
│ B  window picker             │  ← ② when
│ C  allowance chips           │  ← ③ what survives (the exam)
│ D  CONSEQUENCE PREVIEW        │  ← ④ the gate. Cannot be skipped.
│ E  reason input (required)   │  ← ⑤ who and why
│ F  ACTIVATE                  │  ← ⑥ disabled until D and E are complete
└──────────────────────────────┘
```

**The design thesis:** the irreversible action sits *below* its own consequences. Dr. Reed cannot reach the button without having scrolled past a preview of what it does. This is the freeze console's only real design idea, and it is worth more than any other visual decision in the module.

**The second thesis, and it is the one that changed in revision 3:** the preview token is a *freshness* token, not a *permission* token. It lasts 60 seconds and says nothing about who may freeze the fleet, so every freeze-mutating route re-reads Dr. Reed's `LAB_OPERATOR` tier at the moment of activation. In revision 2 the only gate was the token, and the consequence was that the module's one irreversible action sat behind a wall of 33 GPUs and one authenticated session away from any caller. (Edge-case finding **EDGE-7**.)

---

## 3. [P] Specifications

### 3.1 The draft freeze

```json
{
  "draft_id": "DRF-2026-04-09-001",
  "scope": "SUBJECT",
  "subject_ids": ["CS-340-CV", "CS-480-VLM", "CS-101-INTRO-ML"],
  "node_class_ids": [],
  "starts_at": "2026-04-09T08:00:00-05:00",
  "ends_at": "2026-04-09T14:00:00-05:00",
  "allowances": ["RESV-2026-04-09-EXAM-01", "RESV-2026-04-09-EXAM-02", "RESV-2026-04-09-EXAM-03"],
  "reason": "CS-480-VLM final examination — 24 machines reserved for the exam room.",
  "created_by": "u-rebecca-reed",
  "created_at": "2026-04-09T07:14:22.006-05:00",
  "expires_at": "2026-04-10T07:14:22.006-05:00"
}
```

`POST /policy/freezes` returns `201 { draft_id, content_hash, expires_at }` and stores the row. Three properties of the stored draft are load-bearing and none of them existed in revision 2:

- **`node_class_ids` is empty, and the store enforces it.** `CHECK (scope = 'ALL') OR (scope = 'SUBJECT' AND subject_ids <> '[]' AND node_class_ids = '[]') OR (scope = 'NODE_CLASS' AND node_class_ids <> '[]' AND subject_ids = '[]')`. Without those three `CHECK`s a `SUBJECT` freeze carrying node-class ids is *interpretable two ways*, and the two readings differ by a total denial of service: under an intersection it covers nothing while the console renders an active-freeze banner and the audit records an activation; under a union it denies subjects the freeze authority never selected. (`in_scope` is a **disjunction** — `prd.md` EDGE-11.)
- **`allowances` is a non-null array of exact reservation ids**, enforced by `CHECK NOT NULL AND jsonb_typeof = 'array'`. A corrupted `null` makes `.some(…)` throw, and it also makes the exemption test truthy inside an examination freeze if any reading treats it as empty-and-unbounded.
- **`expires_at` is 24 h out.** A draft is a loaded action; an abandoned one must not be sitting in the store where a later press picks it up. Activation additionally requires `ends_at > campus_now` server-side, so a window in the past is `400 WINDOW_IN_PAST` even if the draft is fresh.

**OQ-1 resolution, recorded here because this scenario forces it:** allowances are **per-reservation-id**, not per-subject and not per-requester. A subject-level allowance would be indistinguishable from "the whole class is exempt", which is exactly the failure the freeze exists to prevent. See decision log **L-5**.

### 3.2 Consequence preview (the gate)

`POST /policy/freezes/preview` evaluates the draft's consequences against live facts, **persists** a `PreviewRun`, and returns a server-issued token over `HMAC(server_secret, draft_id ‖ content_hash ‖ computed_at)`.

```
┌──────────────────────────────────────┐
│ REQUESTS AFFECTED                    │
│                                      │
│   37   requests will be denied       │
│   14   of them are RUNNING now       │
│    3   exam reservations survive     │
│    6   machines return to the pool   │
│  8.5  GPU-hours reclaimed            │
│                                      │
│  ▸ by rule    R-FRZ-01 × 37          │
│  ▸ by subject CS-340-CV       21     │
│               CS-480-VLM       9     │
│               CS-101-INTRO-ML 7     │
│  ▸ surviving  RESV-…-EXAM-01  ws-gpu-03…11  │
│               RESV-…-EXAM-02  ws-gpu-12…20 │
│               RESV-…-EXAM-03  ws-gpu-21…26 │
│  ▸ next protected window  none before 14:00│
│  ▸ facts current  07:14:22 CST · stratum 2│
│                                      │
│  valid for 60 s                       │
└──────────────────────────────────────┘
```

**Governing rule:** `ACTIVATE` is disabled until (a) a preview has been *rendered* for the current `content_hash` and (b) a non-empty `reason` is present. If the preview call fails, the button stays disabled and the banner reads `SYSTEM — the set of affected requests could not be computed; activation is blocked`. Verified by `test/scenario/sa-5.test.ts`, which stubs the preview endpoint to fail and attempts activation.

The three surviving reservations are listed **by machine range**, not as a count. A number alone would not let her verify that the exam's own machines were excluded.

**`next_protected_window` is the tile that uses `required_node_count`.** It is the one field in the timetable fact that no rule reads, and it is on this tile because the judgement "a 24-machine reservation needs 24 of 24" belongs to whoever provisions a room, not to whoever admits a request. Naming the consumer is the point: `prd.md` AG-10 now requires every declared field to have a named reader, and this is the reader. (Edge-case finding **EDGE-33**.)

**Why the tile says how fresh its facts are.** The count of 37 is only as good as the ten ports behind it, and on a phone in a corridor the question "was this computed from current facts?" is the first question a person who is about to press an irreversible button should be able to answer. A `runtime_snapshot: UNAVAILABLE` value replaces the timestamp with a named reason and **keeps the button disabled** — a preview computed from a degraded fact set is not a preview, it is a guess with a number on it.

### 3.3 Activation and its immediate consequence

Activation presents the token. Three checks run server-side, in this order, and any one of them is a refusal with a distinct reason:

| Check | Source of the check | Failure |
|---|---|---|
| `role_tier ≥ INSTRUCTOR` with a `LAB_OPERATOR` scope, **re-read now** | `access.v1.Access.GetActor` — a fresh call, never the preview's copy | `403` |
| `preview_token.actor_id` equals the caller, and it is unconsumed | `PREVIEW_RUN` | `403` / `409 TOKEN_CONSUMED` |
| `preview_token.content_hash` matches the current draft, and `issued_at + 60 s > now` | `PREVIEW_RUN` | `409` |
| No other `ACTIVE` freeze for the normalised scope key | a **partial unique index** `WHERE state = 'ACTIVE'`, so the database raises it | `409` |

The role re-read is the one that matters and the one revision 2 did not have. The window between a preview and an activation is exactly the window in which a revocation lands, and a token that survived it for its remaining seconds was the whole of the gap. A test drives it: the tier is revoked between preview and activation, and the second call is `403`. (Edge-case finding **EDGE-7**.)

**The token's lifetime is printed on the card, not announced in a toast.** The preview shows `valid for 60 s · 47 s remaining` on a ticking ring; at expiry the ACTIVATE button goes disabled, a `PREVIEW_EXPIRED` notice appears in place, and the only offered action is `Recompute preview` — one tap, which re-runs the preview and issues a new token. The reason it is spelled out rather than merely enforced is that the alternative failure is a person pressing ACTIVATE at 61 s and being refused with no explanation of why the button was there a moment ago, which reads as a broken button and generates a ticket a log line cannot answer. The 60 s TTL is a **server-side invariant**; the countdown is a courtesy, and the copy says which of the two is which.

**The 60 s TTL is a policy choice with its cost named.** A 15-minute window would let Dr. Reed draft, walk to the room, and press the button — and would also let the fleet state the preview described grow up to 15 minutes old, which during a 40-minute lead-in to an examination is a third of the lead-in. 60 s keeps the preview within a distance of the press a person can reason about, and the **draft** is preserved server-side as a `FREEZE_DRAFT` with `expires_at = created_at + 24 h`, so nothing is lost when the token expires: only the *activation right* is short-lived, and the draft is the long-lived object. That split — short-lived authority, long-lived draft — is what lets the console be usable on a phone without letting a phone carry a 24-hour permission.

**On the `409` for a duplicate scope:** the check is a partial unique index, not a read-then-write. A read-then-write is what a double-tap on a 44-pixel target under time pressure defeats — two transactions both read *none*, both insert, both commit, both publish `policy.freeze.activated.v1`, and both apply. After that, every `R-FRZ-01` decision must choose which `freeze_id` to cite, and lifting one leaves the other active while the console says no freeze is in force. A test fires 8 simultaneous activations of one scope and asserts exactly one `201` and seven `409`s. (Edge-case finding **EDGE-17**.)

The freeze emits `policy.freeze.activated.v1`. The engine itself mutates nothing — it is a pure function — so the *next* evaluation of any request now meets rule 1.

Verification evaluation, one minute later, on Elena's `TRAINING` request from `scenario-3.md`:

```
○ DENY                                 R-FRZ-01    FREEZE_ACTIVE
                                       POL-FRZ · CAMPUS-NOTICE-2026-04

You asked to start a training job on 1 × 24 GB for CS-340-CV.

An emergency compute freeze is active from 08:00 to 14:00 today for
CS-340-CV, CS-480-VLM and CS-101-INTRO-ML. Background and training work is
denied for every non-examination reservation during the freeze.

Why:   FRZ-2026-04-09-001 is ACTIVE
       scope    SUBJECT ∈ {CS-340-CV, CS-480-VLM, CS-101-INTRO-ML}
       window   [08:00:00, 14:00:00) — campus time 08:13:07.441 is inside it
       binding  exam_binding = null, and this freeze allows only
               RESV-2026-04-09-EXAM-01/02/03
       fact:    freeze_states[FRZ-2026-04-09-001].active
       notice:  CAMPUS-NOTICE-2026-04 (posted 07:14 by the Dean's office)

What you can do:
  [ Join the post-exam queue (opens 14:00) ]  ← re-evaluates to CONSTRAIN / QUEUE_ONLY
  [ Read the notice ]
  [ Ask Dr. Rebecca Reed to add an allowance ]

Your previous run b7e4419a was stopped at 08:13 by the freeze, not by its
deadline. Your checkpoint from 08:12 is retained.

Evaluated 2026-04-09 08:13:07.441 CST · clock stratum 2 · policy v42
request 5e2a44c1 · decision 0192f7c5-…-1
```

Three details do the work here:

1. **`R-FRZ-01` is precedence 1**, so this denial appears even though `R-TIER`, `R-AUTH`, and `R-NIGHT` all pass. The trace shows rows 3–17 as `NOT_EVALUATED`, not `NO_MATCH` — see `scenario-1.md` §3.3 for why that distinction is load-bearing.
2. **The policy version is 42.** The freeze was published as a policy-version change, so the change is versioned, diffable, and revertible — consistent with FR-12 and with the catalogue's `Compare versions` action. `GET /policy/rules?version=41` still returns the previous set, which is what lets the console show Dr. Reed what changed before she lifts anything.
3. **The card explains what happened to her running job**, distinguishing "stopped by a freeze" from "stopped by its deadline". A requester who loses a night's training to an exam deserves to know which mechanism took it.

### 3.4 The 3 surviving requests — `R-FRZ-02`

```
◑ CONSTRAIN                            R-FRZ-02   precedence 2   POL-FRZ

Admitted for the examination only.

  ◑ WINDOW_SCOPE        allowed binding RESV-2026-04-09-EXAM-01
    node range          ws-gpu-03 … ws-gpu-11  (9 of 24)
    prohibited          any use outside this reservation; any submission
                        without exam_binding is denied
    expires with        the freeze, 2026-04-09 14:00:00 CST
    notice shown to     RESV-2026-04-09-EXAM-02, RESV-2026-04-09-EXAM-03
    authority           FINAL
```

**`R-FRZ-02` sits at precedence 2, immediately after `R-FRZ-01` — and that reverses decision-log entry L-7, which argued for the low placement.** Revision 1 put it at 14, last, below five `DENY` rules; the reasoning was that an allowance is a narrow exception and an exception evaluated first might outrank the clearance rules. The review found the opposite failure: an allowance exists *precisely* to protect a scheduled examination, and evaluating it after `R-TIER-02`, `R-AUTH-01/02`, and `R-QUOTA-01` meant an exam-bound request from a quota-exhausted or under-cleared actor was hard-denied and the allowance never got a look. On examination morning, the quota of an individual instructor is not a reason to fail an institution's examination.

**The consequence of the move, stated rather than assumed.** At precedence 2, `R-FRZ-02` is terminal for any request whose binding matches — so `R-AUTH-01` at 8 and `R-AUTH-02` at 7 never run for that request, and the old claim that *an allowance does not bypass authorisation* became false. The guarantee is restored at precedence −1: `R-VALID-01` requires the actor to hold an entitlement to the reservation's `subject_id`, and answers `DENY(NOT_AUTHORIZED)` when it does not. A binding that fails that check is no binding at all, so `R-FRZ-01` matches and the request is denied by the freeze — with the *correct* cause, since the thing that stopped it is the freeze and the thing wrong with the request is the binding. Decision log **L-12**.

### 3.5 Lifting

At 14:48 she lifts it. `POST /policy/freezes/{id}/lift` requires a non-empty `lift_reason` and a fresh `LAB_OPERATOR` read, shows the count of requests still blocked at that instant (4), traps focus, and restores focus to its trigger on close. `LIFTED` is terminal. Superseding a freeze means lifting and activating a new one, producing two distinct `freeze_id`s and a `supersedes` pointer, so the audit never has to guess which one applied.

`GET /policy/freezes/{id}` returns scope, window, `allowances`, `reason`, `activated_by`, `activated_by_role_tier`, `activated_at`, `lift_reason`, `lifted_by`, `supersedes`, and the **computed** lifecycle state. Without that route a journal row's `freeze_id` is unresolvable, and the audit could prove *that* a freeze denied 37 requests but not *what the freeze was*. (Edge-case finding **EDGE-32**.)

**`ACTIVE` is stored intent; `EXPIRED` is computed.** Liveness is `state ∉ {DRAFT, LIFTED} ∧ starts_at ≤ t ∧ t < ends_at`, evaluated inside the rule predicate from the clock on every evaluation. A row left unswept past its `ends_at` therefore denies nothing, and the mechanism is the rule text rather than a reconciliation job. `/ready` runs the expiry reconciliation as a **non-blocking** reconciliation and reports the count; it is never a gate, because a gate would refuse traffic to repair a table that is already refusing nothing.

### 3.6 Validation of every state (V)

| State | Specification |
|---|---|
| **Loading** | The preview region shows 3 mono stat tiles as skeletons and **the ACTIVATE button is disabled for the whole duration**. A slow preview is a good preview; an impatient person pressing ACTIVATE during a 900 ms skeleton is the failure this prevents. |
| **Empty** | E-NOT-YET: "No freeze is active. The fleet is governed by the standing rule set, version 41. Next protected window: CS-340-CV lab, Mon 10:00–12:00." |
| **Error — client** | Four, all specified: (a) `E-VALIDATION` — `ends_at` must be after `starts_at`, with the nearest legal value offered; (b) `E-VALIDATION` — scope must name ≥ 1 subject or node class, with a one-tap "select all current subjects" affordance; (c) `E-VALIDATION` — `ends_at` already past ⇒ `400 WINDOW_IN_PAST`, with the current time shown next to the picker so the mistake is visible rather than merely rejected; (d) `E-VALIDATION` — reason empty. |
| **Error — dependency** | Two: (a) the **freeze-state store** is unreachable ⇒ activation blocked, reason "a freeze that cannot be recorded cannot be lifted"; (b) a fact port is unavailable or stale beyond its admission tolerance ⇒ the preview returns `runtime_snapshot: UNAVAILABLE` with the failing port named, the button stays disabled, and the banner states that the count may under-state the affected set. The stale-tolerant bound named in the banner is now **per port** — 60 s for the timetable and the availability counters, 0 s for the clock, the identity pair, the reservation store, and the class table — because a single "60 min" figure was the artifact of classifying the fleet as one port. (`prd.md` FR-10, EDGE-6.) |
| **Error — token** | `PREVIEW_EXPIRED` offers a one-tap recompute, because the boundary is `issued_at + 60 s > now` — the console is *inside* the window at exactly 60 s and outside it at 60.001 s. `TOKEN_CONSUMED` (a second presentation) and a `content_hash` mismatch are both `409` and both name the mismatch; neither offers "try again", because retrying the same token cannot succeed. |
| **Success** | Active-freeze banner across the ContextBar (1 px `--status-fault` top border) with scope, window, activator, role tier at activation, reason, and a live countdown to `ends_at`; the Journal tab gains a freeze-filter chip `freeze_id = FRZ-2026-04-09-001`. |

### 3.7 Accessibility for this scenario (the highest-stakes surface in the module)

| Check | Result |
|---|---|
| 1.4.10 Reflow | 320 CSS px, single column, no horizontal scroll |
| 2.5.5 / 2.5.8 Target size | All controls ≥ 44 × 44 px; the ACTIVATE button spans the full column width |
| 2.1.1 Keyboard only | Full activation path: scope → window → allowances → preview → reason → ACTIVATE. Verified with the pointer disconnected (`test/scenario/sa-6.test.ts`) |
| 2.4.7 Focus Visible | 2 px `--border-2` ring; the disabled ACTIVATE button still shows a focus ring, because it must stay focusable so a screen-reader user can discover *why* it is disabled |
| 3.3.4 Error Prevention (Legal, Financial, Data) | The WCAG criterion that actually applies to a destructive action: activation is **reversible only by a second destructive action**, so the preview gate and the mandatory reason are the conforming controls. This is the documented justification for §3.2 |
| 4.1.3 Status Messages | Freeze activation announced via `aria-live="assertive"`; the 37-denial consequence is read out as part of the announcement, not only shown visually |
| 1.4.1 Use of Colour | The consequence preview is a set of mono numbers; a hypothetical "0 of these survive" case would be legible in greyscale because the number is the message |
| 4.1.2 Name, Role, Value | The token's countdown is `aria-hidden` with a text equivalent, so a screen reader is not interrupted every second for 60 s; the expiry is announced once, on `aria-live="polite"` |

---

## 4. Edge conditions proven

| # | Condition | Expected | Proves |
|---|---|---|---|
| EC-4.1 | Freeze `[08:00, 14:00)`, request at `07:59:59.999` | not denied by `R-FRZ-01` | half-open left edge on a *lifecycle* boundary, not just a schedule one |
| EC-4.2 | Same request at `13:59:59.999` / `14:00:00.000` | denied / not denied | half-open right edge; `EXPIRED` is computed from the clock, never from a job |
| EC-4.3 | Freeze `scope = ALL`, request on `srv-48gb` (distributed training) | `DENY` / `R-FRZ-01` | the `in_scope` disjunction's first arm |
| EC-4.4 | Freeze `scope = SUBJECT{CS-340-CV}`, request for `CS-101-INTRO-ML` | not denied by `R-FRZ-01` | scope is matched, not applied globally — the arm that under **intersection** would deny, which is why the disjunction and the three `CHECK`s are specified |
| EC-4.5 | Freeze active, `exam_binding` = an id **not** in `allowances` | `DENY` / `R-FRZ-01` | the allowance list is exact-match, not prefix- or subject-level |
| EC-4.6 | Freeze active, allowance matches, actor **not** enrolled in the reservation's subject | `DENY(NOT_AUTHORIZED)` / `R-VALID-01` at −1, so `R-FRZ-01` matches | an allowance does **not** bypass authorisation — now guaranteed at −1 rather than by placement (**L-12**), because at precedence 2 the placement no longer could |
| EC-4.7 | Freeze active, allowance matches, actor **is** enrolled, but lacks the model entitlement | `CONSTRAIN → WINDOW_SCOPE` / `R-FRZ-02` at 2 | the consequence, stated rather than hidden: within an examination freeze the reservation is the authorisation. Accepted deliberately — the model is fixed by the reservation, and the alternative is an exam that cannot start |
| EC-4.8 | Freeze activated while 14 jobs are `RUNNING` | engine returns `DENY` on next evaluation; bridge preempts; journal records `preempted_by = FRZ-…` | **NP-2** — the engine mutates nothing |
| EC-4.9 | Freeze store unreachable during activation | activation blocked, `E-SYSTEM` | a freeze that cannot be recorded cannot be lifted |
| EC-4.10 | Freeze lifted, then re-activated with a different scope | two `freeze_id`s; the journal shows both, with `supersedes` | auditability of a corrected mistake |
| EC-4.11 | 8 simultaneous activations of one scope | exactly one `201`, seven `409` | the duplicate is stopped by a partial unique index, not by a prior read (**EDGE-17**) |
| EC-4.12 | Tier revoked between preview and activation | `403` | the token is freshness, not permission (**EDGE-7**) |
| EC-4.13 | Same token presented twice | `409 TOKEN_CONSUMED` | single-use via `consumed_at` in the activation transaction (**EDGE-31**) |
| EC-4.14 | Token issued for Dr. Reed, presented by another `LAB_OPERATOR` | `403` | the token is bound to `actor_id`, not only to the draft (**EDGE-7**, **EDGE-31**) |
| EC-4.15 | Draft created, then activation 25 h later | `409` / `400`, draft is expired | `expires_at = created_at + 24 h`; a loaded action left loaded (**EDGE-30**) |
| EC-4.16 | Draft with `ends_at` already in the past | `400 WINDOW_IN_PAST` | validated server-side, not only in the picker (**EDGE-30**) |
| EC-4.17 | `subject_ids: []` with `scope = SUBJECT` | `400` at draft creation | the `CHECK` that makes the disjunction unambiguous (**EDGE-11**) |
| EC-4.18 | `allowances: null` | `400` at draft creation | a corrupted exemption list is rejected at the door, not interpreted at request time (**EDGE-11**) |
| EC-4.19 | `reservations` port down at preview time | preview is a **lower bound** with a stamp; ACTIVATE requires `role_tier ≥ INSTRUCTOR` + a second reason; `degraded_preview: true` on the `FreezeState` | the emergency path exists and is *recorded* — an emergency that cannot proceed under uncertainty is an emergency that waits, and one that proceeds without saying so is the failure this module exists to prevent |
| EC-4.20 | Scope `SUBJECT{CS-480-VLM}` with a node class that a subject's fleet cannot use (`required_node_count` > 0) | the `next_protected_window` tile reads `none <14 h`; the **count** is unaffected | the sole named consumer of `required_node_count` (`prd.md` AG-10). A test asserts the field is removed from the fact bundle and the tile still renders — a display field with a live data dependency is a display field that can be wrong |
| EC-4.21 | Preview computed at 07:12:03, activation at 07:13:04 | `409 PREVIEW_EXPIRED`, one-tap recompute, and the **draft survives** (`FREEZE_DRAFT.expires_at` is 24 h) | the 60 s TTL governs the *activation right*, not the draft. Confusing the two is what makes a short TTL look unusable on a phone |
| EC-4.22 | Freeze active; request carries `exam_binding` for a **different** subject than the one it is scoped to | `DENY(NOT_AUTHORIZED)` / `R-VALID-01` at −1 | `R-VALID-01` asks the *actor*'s entitlement, `R-FRZ-02` asks the *reservation*'s. Conflating them would admit a 70B inference under a reservation made for a 7B one |

---

## 5. Failure-path walkthrough: `R-DEP-01`

The one path in this scenario where a *dependency* is down rather than a *decision* being made, included because the module must distinguish them — and revision 2's version of this card said `CANNOT EVALUATE`, which is not an outcome this module produces.

```
┌──────────────────────────────────────────────────────────────────────┐
│ ○ DENY                                     R-DEP-01   precedence 0    │
│ DEPENDENCY_UNAVAILABLE · retry in 2 s                               │
│                                                                      │
│ port      quota.v1.Quota — CheckBalance                              │
│ cause     connect timeout, aborted at the 40 ms fact cap            │
│ last good 08:14:02.118 CST (63 s ago)  — not used                    │
│ effect    no request is admitted without a verified balance          │
│           (POL-QUOTA §1). 37 requests that the freeze would have     │
│           denied are denied for this reason instead.                 │
│                                                                      │
│ [ Retry now ]   [ Copy diagnostics ]                                  │
│                                                                      │
│ Note: the freeze is still active. See the banner above.              │
└──────────────────────────────────────────────────────────────────────┘
```

Four properties of this card, and the last two are revision 3.

1. **It is a `DENY` with a `primary_rule_id` and a closed-set cause**, evaluated as a **row inside the walk** at precedence 0 — not as a branch around it. A branch around the walk would be a second decision path, which is the failure `M2-AD-1` exists to prevent. `test/arch/ad4-dedup.test.ts` fires a dependency failure and asserts exactly **one** decision is produced, not a branch result plus a walk result.
2. **`R-DEP-01` sits above `R-FRZ-01`.** So a request under an active freeze that also has a broken quota port is told to retry, not that the fleet is closed — see `ARCHITECTURE.md` §3.1 for why that inversion is deliberate and what it costs. The closing line on the card is the mitigation: the freeze state comes from the freeze console's own banner, which reads the same `FREEZE` table and is unaffected by a quota outage.
3. **The cached balance is named and refused.** `quota` is `FAIL_CLOSED` at a 0 s admission tolerance, so "the last snapshot supplied by the shell" is displayed for diagnosis and explicitly *not used for the decision*. Displaying it without that sentence would be an invitation to reason from a number the module refused to decide on.
4. **The port's classification is per port, and the class table is not the availability port.** If the *availability* port were down instead, the outcome is the same `DENY`, because the class table is `FAIL_CLOSED` at 0 s while availability is tolerated to 60 s. If only availability is stale past 60 s with no fresher copy, it escalates to this same denial rather than answering from a 5-minute-old counter — without that escalation the tolerance is decorative in the only branch that uses it. (`prd.md` FR-10; **EDGE-6**, **EDGE-27**.)

**Why a freeze scenario needs this card at all.** During an emergency the worst failure is a **fail-open** admission: a requester starting a 70 GB job on an exam machine 40 minutes before an exam because the engine quietly degraded is worse than a refused request. Every port that can change `outcome`, `admission`, or `valid_until` is `FAIL_CLOSED` or `ADMISSION_STALE_TOLERANT` with a bound, and the derivation of each rule's fail mode from its declared inputs is a test (NFR-13), not a judgement made at runtime.

---

## 6. Traceability

| Requirement | Evidence |
|---|---|
| FR-1 | §3.3, §3.4, §5 — every path reaches exactly one terminal outcome |
| FR-2 | §3.1, §3.3, §3.4, EC-4.1…4.7, EC-4.17, EC-4.18, EC-4.22 |
| FR-7 | EC-4.8 — a freeze started mid-run produces a bounded, not open-ended, consequence |
| FR-8 | §3.4 — the 3 surviving requests are `PROVISIONAL`; the quota cap is the one constraint a freeze cannot suspend, and the card says so |
| FR-9 | §3.3 — the denial names the freeze id, its scope, the window, the binding, and the published notice; EC-4.6 shows the case where the *allowance* is the thing that fails, and the card names it as such |
| FR-10 | §3.6 Error rows, §5, EC-4.19 — including the per-port bounds, the over-age escalation, and the degraded-preview path that records the gap rather than hiding it |
| FR-11 | §3.5, §3.6 Success — the journal is filterable by `freeze_id` and shows the lift with its reason |
| FR-12 | §3.3 point 2 — the freeze is published as policy version 42, readable afterwards via `GET /policy/rules?version=41` |
| FR-13 | §3.2 — the reason is mandatory, stored, and rendered in the journal; the lift requires `lift_reason` |
| FR-14 | §2 — the console is a client of the documented public API; preview and activation are two named calls with named failure codes. All **six** freeze routes are named, including `GET /policy/freezes/{id}`, which exists so a journal row's `freeze_id` resolves (**EDGE-32**) |
| FR-15 | No row in this file uses a term on the deny-list, and the named person is Dr. Rebecca Reed throughout — the reason §5's note above exists |
| FR-16 | §5 — the dependency failure is a `DENY` card; the string `CANNOT EVALUATE` appears nowhere in this file, and that is asserted by a grep in `test/arch/fr16-copy.test.ts` |
| NFR-1 | §3.3 — the walk stops at `R-FRZ-01`; the 3 surviving requests each walk to `R-FRZ-02` at 2. The preview's `required_node_count` fact is not on the request path |
| NFR-3 | §3.3 — the same draft previewed at 07:12:00.000 and 07:12:00.999 yields byte-identical `Decision`s for every request, because the preview pins `evaluated_at` |
| NFR-4 | EC-4.1, EC-4.2 — the freeze window's two edges swept at 1 ms granularity; the lifecycle edge behaves like a schedule edge, which is the point |
| NFR-8 | §3.5 — the 14 preemptions are in the journal before the lift, and queryable by `freeze_id` |
| NFR-9 | §3.2 — 10 ports fetched in parallel, `p99 ≤ 45 ms`; the preview is the only surface that fans out over all ten, and it is the only one with a 5 ms budget rather than 45 |
| NFR-5 | §3.3 — the card carries `u-rebecca-reed`, not a name; `FR-15`'s doc-lint forbids the reverse |
| NFR-6 | §3.3 — 2 citations, 3 next actions, explicit reason |
| NFR-7 | §3.3 — freeze effective for new decisions within 5 s of publication as v42, and `0` effect on the 14 in-flight decisions (EC-4.14: an in-flight `ALLOW` is not retroactively withdrawn; the next re-evaluation at its deadline is what changes its outcome) |
| NFR-10 | The freeze console ships in the standalone `docker compose` prototype with zero external services |
| NFR-13 | §5 point 4 — the fail mode is derived from the declared input port, and merging the two fleet ports back fails the test |
| AG-8 | `R-FRZ-01`, `R-FRZ-02`, `R-DEP-01`, and `R-VALID-01`'s fourth outcome each have a reachability test and a deletion test among the 38 in `planning/readiness-gate-report.md` |
| AG-11 | §3.4 and EC-4.6/4.7 — `NOT_AUTHORIZED` is produced by `R-VALID-01`, `R-TIER-02`, `R-AUTH-01`, `R-AUTH-02`, and `R-SYS-01`, and every one of those pairs is enumerated in `prd.md` §6.2 and tested |

### 6.1 What this scenario does not prove, stated plainly

Three limits, each of which is a place a reader could otherwise infer coverage that does not exist.

1. **It does not prove the freeze is *enforced* at the node.** M2 decides; the K8s bridge enforces. EC-4.8 asserts the engine returns a `DENY` on the next evaluation and that the journal records `preempted_by`, which is M2's whole responsibility. Whether `night-scheduler` then sends the `SIGTERM` is M9's contract, and this scenario tests only that M2 told it to. Claiming the kill works would be the module claiming a test it does not own.
2. **It does not prove the exam runs.** Three reservations survive and 24 machines return to the pool; whether the examination can actually complete on them is M1's and M5's concern. The scenario proves the freeze *protects the reservation without breaking it*, which is FR-2's scope and no more.
3. **It does not exercise the 32-node capacity limit.** A freeze covering `ALL` denies by scope, not by capacity, so `R-FLEET-01` and `R-CONTEND-01` are `NO_MATCH` throughout. Their reachability lives in the 38-test list, not on this screen.

A scenario file that lists only what it proves is a coverage claim. A scenario file that lists what it does not is a coverage claim with its edges drawn.
