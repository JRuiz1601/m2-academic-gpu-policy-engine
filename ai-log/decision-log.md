# AI Decision Log — M2 Academic GPU Policy Engine
## Module M2 · Academic AI Compute Fabric · planning package

**Compiled:** 2026-09-28 · **Covers:** PRD revisions 1–3, architecture revisions 1–3, UX revisions 1–3
**Companion documents:** `planning/prd.md` · `planning/ARCHITECTURE.md` · `ux/EXPERIENCE.md` · `ux/DESIGN.md` · `ux/C-UX-Scenarios/` · `reviews/`

---

## 0. What this log is, and the one thing it is not

This is the record of every point where the AI that drafted this package proposed something, and a person — or a gate, or a later finding — declined it or changed it. It is not a changelog. A changelog records what happened; this records **what was considered and refused**, which is the only part a reviewer cannot reconstruct from the documents.

**The distribution this log has to justify, stated up front.** Across the whole package:

- **12** numbered decisions (`L-1`…`L-12`), of which **2 were later reversed** (`L-3`, `L-7`).
- **10 proposals rejected outright** (§4) and never reinstated.
- **3 adversarial passes** producing **93 findings** (28 + 30 + 35), every one of them triaged into `prd.md` §13, `ARCHITECTURE.md` §12, and §13.

So the shape of the work is not "an AI produced documents and a human approved them". It is: an AI proposed, and **four of its structural proposals were refused and two of its acceptances were later withdrawn on evidence the AI itself produced.** Those six are what §3.3, §3.7, §3.9, §3.12, §4 and §5 are about.

### 0.1 Entry format, and why it is this shape

Every entry carries six fields. Two of them exist because this log is read adversarially:

| Field | Purpose |
|---|---|
| **Proposal** | What was proposed, in the proposer's terms, not the outcome's terms. |
| **Status** | `ACCEPTED` / `REJECTED` / `REVERSED`. Never ambiguous. |
| **Rationale** | The argument, not the conclusion. If the rationale is a preference, it is not a decision. |
| **What was kept** | For rejections: the part of the proposal that survived, because almost nothing is refused whole. |
| **Falsifier** | The observation that would reopen it. An entry without a falsifier is a preference wearing a decision's clothes. |
| **Trace** | Where the decision now lives, so the log cannot drift from the documents. |

`prd.md` FR-15's deny-list is binding on this file. So is the reverse: **the log does not maintain a private list of its own banned terms.** It cites FR-15 by reference, the same way `ARCHITECTURE.md` does.

---

## 1. The register

| # | Proposal | Status | Where it lives |
|---|---|---|---|
| `L-1` | The engine core is a pure function with injected facts, clock, and policy version | **ACCEPTED** | `prd.md` §6.1 · `ARCHITECTURE.md` `M2-AD-1`, `M2-AD-2` |
| `L-2` | Constraints are advisory; enforcement is the K8s bridge's problem (OQ-2) | **REJECTED** → narrowed | `prd.md` OQ-2 resolution |
| `L-3` | `R-TIER-03` (variant narrowing) preempts `R-TIER-02` (clearance refusal) | **REJECTED** → **REVERSED** | `prd.md` §6.2, assumption A-7 |
| `L-4` | Three deadline rules become one `R-BOUND-01`; `GRACE_HORIZON` retires to a display constant | **ACCEPTED** | `prd.md` §6.2.1 item 4 |
| `L-5` | Freeze allowances are exact reservation ids, never subjects | **ACCEPTED** | `prd.md` OQ-1 · `scenario-4.md` EC-4.5 |
| `L-6` | `NOT_EVALUATED` and `NO_MATCH` are distinct trace states | **ACCEPTED** | `prd.md` FR-9 · `DESIGN.md` C-5 |
| `L-7` | `R-FRZ-02` sits at precedence 14, below the freeze-refusal rules | **REJECTED** → **REVERSED** to 2 | `prd.md` §6.2 |
| `L-8` | `ALLOW` needs a rule too, so the trace is never empty | **ACCEPTED** | `prd.md` §6.2 `R-ALLOW-01` at 17 |
| `L-9` | A `THESIS` priority class on the request, and a rule for it | **REJECTED** | field deleted; `scenario-2.md` §1.2 |
| `L-10` | `fleet` is one port with one staleness tolerance | **REJECTED** → split | `ARCHITECTURE.md` §3.2 register |
| `L-11` | `decision_id` is a UUIDv4 and durations are floats | **REJECTED** | `ARCHITECTURE.md` `M2-AD-8` |
| `L-12` | An allowance does not bypass authorisation | **ACCEPTED** (alternative refused) | `prd.md` `R-VALID-01` at −1 |

---

## 2. Decisions that were accepted, with their falsifiers

### `L-1` — The engine core is a pure function

| | |
|---|---|
| **Proposal** | `evaluate(request, facts, policy_version) → Decision`, with no I/O, no model call, and no wall clock read inside the function. |
| **Raised by** | Pass 1, synthesis. |
| **Status** | **ACCEPTED**, unchanged through three revisions. |
| **Rationale** | The requirement that a decision be explainable is unsatisfiable unless the decision is a function of its inputs. A wall clock read inside `evaluate()` makes the function of *(request, facts, version, when)*, and "when" is the one input nobody can reproduce from a journal row. The `CampusClock` port is therefore read **once, by the caller, before the fan-out**, and that instant is `evaluated_at` — the fact-fetch duration must not shift it (**EDGE-21**). |
| **What it bought** | `M2-AD-1` (exactly one terminal outcome per input) becomes provable by construction rather than by review, and the same snapshot re-evaluated a year later returns a byte-identical `Decision` (NFR-3). |
| **Falsifier** | A requirement that a decision depend on something the journal does not record. None was found; the one candidate, "what time is it now", is exactly the one this design makes an input. |
| **Trace** | `prd.md` §6.1 steps 1–3; `ARCHITECTURE.md` §3. |

### `L-2` — Where a constraint is enforced (OQ-2)

| | |
|---|---|
| **Proposal** | A `CONSTRAIN` decision carries constraints the engine has **not** enforced. The port records *what the decision was*; the K8s bridge is responsible for *making it true*. `requires_acknowledgement` is an advisory flag. |
| **Raised by** | Pass 1, raised as open question OQ-2 by the AI itself. |
| **Status** | **REJECTED as stated; the underlying model ACCEPTED with one narrowing.** |
| **Rationale for the rejection** | "Advisory" is a claim about the world that M2 cannot make true and must therefore not make. If M2 emits `HARD_DEADLINE = 05:55` and a client ignores it, M2's journal says the run was bounded and nothing bounded it. The engine has exactly one lever over what a client does with a `Decision`, and claiming that lever by name is worth more than claiming a capability it does not have. |
| **The narrowing** | M2 **does not** enforce, and does not pretend to. `requires_acknowledgement` is renamed to carry the fact rather than the hope: each constraint names its **enforcing delegate** (`night-scheduler`, the bridge, the queue) and its **owner** (a person in `ROLE-TIERS`). The card therefore says *"enforced by night-scheduler"* rather than *"enforced"*, and the phrase *"a deadline nobody enforces is a lie"* (`EXPERIENCE.md` §6.2 law b) is the design's statement of the same fact. |
| **Falsifier** | Evidence that a component downstream of M2 will enforce every constraint unconditionally. There is no such component in the fabric, and building one is M9's scope, not M2's. |
| **Trace** | `prd.md` OQ-2; `EXPERIENCE.md` §6.2; `DESIGN.md` C-4. |

### `L-4` — One deadline rule instead of three

| | |
|---|---|
| **Proposal** | Keep `R-GRACE-01`, `R-STRADDLE-01`, and `R-THESIS-01` as three rules, each computing its own deadline from its own boundary list. |
| **Raised by** | Pass 1, original catalogue. |
| **Status** | **REJECTED**; replaced by `R-BOUND-01` at precedence 13. |
| **Rationale** | Three rules reading three lists cannot agree at the boundary, and the failure is invisible until it happens. A request whose declared duration *equals* the remaining time to a boundary satisfies one rule's condition and fails another's, so the outcome depends on ordering. Reconciliation surfaced the exact case: the merged rule could emit `must_checkpoint_by` **later** than `valid_until` (finding **RC-3**). Two fields meant to name the same instant disagreed, and nothing in the type system said they had to agree. |
| **Resolution** | One bound, computed in `prd.md` §6.1 step 3 **before the walk**, from one named boundary set `B` whose members are `{night-window end, lab window end, freeze end, reservation end, `campus_now + expected_duration_min`}`. `must_checkpoint_by = valid_until = bound` is now `M2-AD-3`, asserted over 10 000 generated contexts in `test/arch/ad3-deadline-attribution.test.ts`. Attribution to a rule is **reporting**, not arithmetic — which is what `ad3-deadline-attribution` is named for. |
| **The second half of the proposal, also rejected** | `GRACE_HORIZON` was a **rule input**. It is retired in favour of `NEAR_BOUNDARY_DISPLAY_HORIZON = 8 h`, consumed only by the renderer. A display constant inside a rule condition is a policy change disguised as a styling decision, and a test now asserts the same request at the same instant returns the same `Decision` with the horizon set to 1 h or to 72 h. |
| **Falsifier** | A boundary set whose members are **not** totally ordered by instant. `B` is a set of instants, so it is; and `B = ∅` has a stated sentinel rather than a `null` bound. |
| **Trace** | `prd.md` §6.2.1 item 4, §6.3; `ARCHITECTURE.md` `M2-AD-3`; `wireframe-02`. |

### `L-5` — Freeze allowances name reservations, not subjects

| | |
|---|---|
| **Proposal** | A freeze's exemption list should accept `subject_id`s, so "the examination is exempt" is expressible in one token. |
| **Raised by** | Pass 2, OQ-1. |
| **Status** | **REJECTED.** |
| **Rationale** | A subject-level exemption is a claim about *everything* in a subject, and the fabric contains work in that subject that has nothing to do with the examination — a grader's own inference job, a rehearsal on the same 24 machines. Exempting by subject would silently protect it, and the consequence preview would report a number Dr. Rebecca Reed cannot verify. The examination is a **reservation over named machines**, and that is the granularity the exemption needs. |
| **What was kept** | The human-facing phrasing survives: the console prints `exact reservation ids only` inline, and the preview lists the surviving reservations as machine ranges (`ws-gpu-03…11`) so a count of 3 can be checked by eye. The correction is made **on the card, before activation**, not after. |
| **Falsifier** | Evidence that every workload in a reserved subject is covered by the reservation. The reservation table is per machine range, so it is not, and a mismatch is a normal Friday. |
| **Trace** | `prd.md` OQ-1; `scenario-4.md` EC-4.5; `wireframe-03` annotation 5. |

### `L-6` — `NOT_EVALUATED` is not `NO_MATCH`

| | |
|---|---|
| **Proposal** | The evidence trace carries a boolean per rule: matched, or did not. |
| **Raised by** | Pass 1. |
| **Status** | **REJECTED.** |
| **Rationale** | Under a first-match-wins walk, a rule that never ran and a rule that ran and did not fire are different facts, and the boolean destroys the difference. Elena reading *"checked, fine"* for `R-THIRD-01` has been told the fleet holds a third GPU class, which is a claim the engine never made. |
| **Resolution** | Three states — `MATCH`, `NO_MATCH`, `NOT_EVALUATED` — and a `NOT_EVALUATED` row **must name the rule that preempted it**. This turned out to be load-bearing during UX review: a blank cell is the single most misleading thing a trace can render, because it reads as a pass. |
| **Falsifier** | A rule order in which a preempted rule and a failed rule are indistinguishable in consequence. There is none — a preempted rule contributed nothing, and the outcome is the same, but the *explanation* is not, and FR-9 is about the explanation. |
| **Trace** | `prd.md` FR-9; `DESIGN.md` C-5; `wireframe-01` annotation 4. |

### `L-8` — `ALLOW` names a rule

| | |
|---|---|
| **Proposal** | A rule only fires when it *changes* the outcome. An admission that no rule objects to needs no `primary_rule_id`. |
| **Raised by** | Pass 1. |
| **Status** | **REJECTED.** |
| **Rationale** | That proposal makes the trace length correlate with the *difficulty* of the request rather than with the catalogue, so an easy `ALLOW` carries a two-row trace and a contested one carries a nineteen-row trace. A reader cannot tell a short trace from a truncated one. NFR-6 also requires 100 % of decisions to carry a non-null `primary_rule_id` from the registry, which this proposal makes false. |
| **Resolution** | `R-ALLOW-01` at precedence **17** is the terminal rule for the uncontested case, and it is the reason the catalogue has 19 rows rather than 18. Its condition is `no rule with precedence < 17 produced MATCH`, which is a predicate over the walk's own results and not a sentinel value. |
| **Falsifier** | Evidence that a reader needs to distinguish "nothing objected" from "the rules did not run". The trace already distinguishes them — the other 18 rows read `NO_MATCH`, which says the rules ran. |
| **Trace** | `prd.md` §6.2 `R-ALLOW-01`; `ARCHITECTURE.md` §11 enforceability audit. |

### `L-10` — `fleet` is not one port

| | |
|---|---|
| **Proposal** | Read node classes and node availability from a single `fleet.v1` port with a single staleness tolerance. |
| **Raised by** | Pass 1. |
| **Status** | **REJECTED**; split into two ports (**EDGE-6**). |
| **Rationale** | One port, one tolerance, and the tolerance has to be the stricter of the two, because the *denying* reads must be current. A node class table that changes when a machine is decommissioned is exactly as policy-relevant as a free-capacity count, and a 60-second tolerance applied to the class table would admit a request against hardware that no longer exists. Conversely a 0-second tolerance on availability would make every evaluation fail on a busy fleet, which is the module's most common state. |
| **Resolution** | `fleet.v1.NodeClassTable` — `FAIL_CLOSED`, **0 s**. `fleet.v1.Availability` — `STALE_TOLERANT`, **60 s**. The register is the sole authority, and `NFR-13` derives each rule's fail mode **from its declared inputs** rather than from a hand-written family name, so a future rule cannot inherit a fail mode by looking related. |
| **Falsifier** | A class table that changes on a timescale slower than a decision. `FLEET-INV-2026-Q3` is the inventory notice and it changes on an administrative schedule, but "administrative" is not a bound an engine can rely on at 3 a.m. |
| **Trace** | `ARCHITECTURE.md` §3.2 register; `prd.md` §7, NFR-13. |

### `L-11` — `decision_id` is `uuid7`, and no double crosses the boundary

| | |
|---|---|
| **Proposal** | `decision_id` = UUIDv4. Durations and VRAM figures serialised as IEEE-754 doubles. |
| **Raised by** | Pass 1. |
| **Status** | **REJECTED on both halves.** |
| **Rationale for the id** | A journal sorted by `decided_at` and tie-broken by `decision_id` needs the id to sort in the same order as the time, or the two orderings disagree and pagination returns rows out of order. UUIDv4 has no time component. `uuid7` does, and the sort is then total. |
| **Rationale for the numbers** | A double's shortest round-trip representation is not its decimal form. `9.5` written as `9.5` in the spec can be read back as `9.499999999999999`, and a boundary comparison against `9.5` flips. For a module whose entire value is a boundary comparison, that is not a rounding nuisance — it is a wrong answer. **No IEEE-754 double crosses the journal boundary**; VRAM is an integer count of gigabytes, durations are integer minutes, and monetary-ish quota figures are integer minor units (`M2-AD-8`, `test/arch/ad8-numeric-roundtrip.test.ts`). |
| **Falsifier** | A genuine need for a fractional gigabyte or a sub-minute duration in this domain. The catalogue's smallest `min_vram_gb` is 8.2 GB, which is a catalogue fact, not a request field; requests are whole GB against whole classes. |
| **Trace** | `ARCHITECTURE.md` `M2-AD-8`; `prd.md` §5.1. |

---

## 3. Decisions the AI got wrong

These four are the reason this log exists. Each one is a proposal the AI made with a plausible argument, which a gate or a later pass then refused. Two were accepted at the time and **withdrawn on evidence the AI itself produced**; two were refused outright.

### 3.1 `L-3` — variant narrowing before clearance refusal — **REJECTED, then REVERSED**

| | |
|---|---|
| **Proposal** | Let `R-TIER-03` (a compliant variant of a model exists → narrow to it) sit **above** `R-TIER-02` (clearance cap says no → refuse). The narrowing is automatic, so a student is never refused while a smaller build they may run exists. |
| **Raised by** | Pass 1 synthesis, and again as `UX-ORD-1` during the UX phase. |
| **Status** | **REJECTED at revision 1. REVERSED at revision 2. Now in force at precedence 3.** |

**The original rejection.** The variant rule is keyed to the **model family**. Letting it preempt the clearance rule would let any student reach a 48 GB model by naming a nominally smaller build of it — which converts an authorisation boundary into a naming convention. A 3-bit quantised 70B build has the same reasoning capacity as the 48 GB build; what changed is the number in the label. That is the kind of reasoning the module exists to refuse.

**What falsified it.** The rejection reasoned about `R-TIER-03`'s *consequence* and never checked its *reachability*. Under a strict total order where the first match wins, **a rule whose condition is a strict subset of an earlier rule's is not risky — it is unreachable.** `R-TIER-03` could not fire in any reachable input, because `R-TIER-02` had already answered. So:

- FR-3's two acceptance clauses could not both hold. The "narrowing" the three-outcome vocabulary promises was unavailable exactly where it was most valuable.
- `AG-8` (every rule is reachable, with a passing test that makes it the `primary_rule_id`) was false for a rule in the shipped catalogue.
- A rule that cannot fire is not a control. It is a comment with a precedence number.

**The resolution, which keeps the security concern and discards the ordering that caused it.** `R-TIER-03` moves to precedence **3**, above `R-TIER-02` at **4**. And the protection the original rejection was arguing for moves into the rule's **condition** as assumption **A-7**: a variant qualifies only if it satisfies the cap on VRAM **and** on role tier. A 3-bit 70B build requires `RESEARCHER`, so Elena Vargas is still refused — but now she is refused by a rule that *ran, considered the variant, and rejected it on a named clause*, and the card can show her the option that was weighed (`scenario-2.md` §3.4).

The property the module actually needs is not "students may not reach 48 GB models". It is **"every refusal is auditable, and the auditor can see the option that was considered."** The original ordering bought a security property that was already held and paid for it with an explainability property that was not.

**Falsifier for the current ordering.** Evidence that a variant satisfying A-7's role-tier clause can nonetheless exceed the actor's *reasoning* clearance — e.g. a 70B family whose 3-bit build is listed at `RESEARCHER` but whose task requirement is `THESIS`. Then the ordering is right and the condition is incomplete, and the condition is where the fix belongs.

**Trace** | `prd.md` §6.2, assumption A-7 · `scenario-2.md` §3.3–3.4, EC-2.3 · `AG-8`, `AG-9`

### 3.2 `L-7` — placing the freeze allowance below the freeze refusal — **REJECTED, then REVERSED**

| | |
|---|---|
| **Proposal** | Put `R-FLZ-REFUSE` (`R-FRZ-01`) at 1 and `R-FRZ-02` (allowance → `CONSTRAIN → WINDOW_SCOPE`) at **14**, so the refusal is the loudest thing in the catalogue and the allowance is a late refinement. |
| **Raised by** | Pass 2. |
| **Status** | **REJECTED at revision 1. REVERSED to precedence 2. Now in force.** |

**The original reasoning.** Precedence 1 for the freeze refusal is right and was never in question. Precedence 14 for the allowance was argued on grounds of tidiness — "the interesting exceptions belong together, further down" — which is a sentence about reading order dressed as a sentence about semantics.

**What falsified it.** The placement made `L-12`'s invariant **false as a statement about the system**. At 14, the allowance ran *after* the refusal, so an actor with no entitlement to the reservation's subject could be admitted by the allowance, and the sentence *"an allowance does not bypass authorisation"* was a property of the ordering rather than of the rules. `AG-9` forbids the fix that would have restored it: a `R-FRZ-03` placed above the allowance to re-check authorisation is a rule whose condition is a strict subset of `R-VALID-01`'s, i.e. a dead rule (see §3.4).

**The resolution, and it is a change of principle rather than a change of number.** `R-FRZ-02` moves to precedence **2** — immediately above the refusal, because the walk that reaches it is the walk that *matched* the freeze. The authorisation check moves to where it belongs, at the front: `R-VALID-01` at precedence **−1** now requires the actor to hold an entitlement to the reservation's `subject_id`, and answers `DENY(NOT_AUTHORIZED)`. A binding that fails is **not a binding at all** — it is absent, so `R-FRZ-02` never sees it and `R-FRZ-01` denies.

**Falsifier for the current ordering.** A catalogue in which two independent freezes could both match one request, where the higher-numbered allowance would silently swallow the lower-numbered refusal. The scope model has a **partial unique index** on the normalised scope key `WHERE state = 'ACTIVE'`, so at most one freeze is active per scope; two matching freezes would have to differ in scope and then both `in_scope` arms are false, and the request is not frozen at all. The ordering has no case where it misreports.

**Trace** | `prd.md` §6.2, `L-12` · `scenario-4.md` EC-4.6, EC-4.7, EC-4.22 · `EXPERIENCE.md` Flow 06

### 3.3 `L-9` — a thesis priority class — **REJECTED**

| | |
|---|---|
| **Proposal** | Add `priority_class ∈ {NORMAL, THESIS, EXAM}` to `Request`, and add `R-THESIS-01` giving thesis work a longer maximum duration and exemption from the night window. |
| **Raised by** | Pass 1, as an accommodation of the domain ("graduate students have deadlines"). |
| **Status** | **REJECTED.** Both the field and the rule are gone. |

**Rationale.** Three independent failures, any one of which would be enough.

1. **It was not checkable.** "Is this a thesis?" is a claim about a person's academic status that no port in the fabric can answer. The engine would have to accept it on the request's word, which means the field is a request for a privilege with no verification behind it — and it is the field a student is most likely to set.
2. **It duplicated a fact the fabric already holds.** Thesis commitments are **commitments**, and commitments are already scheduled. A thesis defence is a `ProtectedWindow` with `kind = THESIS`; examinations are `Reservation`s reached through `exam_binding`. The module already had the concept and the AI proposed a second, weaker copy of it. The Request field is now gone and the *Composer* has no priority control at all — a visible control for a field no rule reads is worse than no control, because it teaches Elena that `THESIS` might have mattered.
3. **`AG-10` did not exist yet, and adding the field would have failed it.** Every field declared in a fact type must have a named consumer. `priority_class` had none.

**What was kept.** The intent — a long-running academic commitment should not be killed by the night window — is honoured, by the mechanism that can answer for it. A `ProtectedWindow{kind: THESIS}` is a member of the boundary set `B`, so a thesis commitment produces a `bound` from `R-BOUND-01` like any other boundary, and the constraint names the thesis supervisor as its owner. The accommodation is a **scheduled fact with an owner**, not a flag on a form.

**Falsifier.** A commitment the fabric cannot schedule — a student who needs 72 hours and has no defensible window in which to take them. Then the module has a gap, and the gap is in the *calendar*, not in the rule set; the fix is a `ProtectedWindow`, not a priority flag.

**Trace** | `prd.md` §5.1 `ProtectedWindow.kind` · `AG-10` · `scenario-1.md` §1.2 item 2 · `DESIGN.md` C-2, §10 change 3

### 3.4 `L-12`'s alternative — a re-check rule above the allowance — **REJECTED**

| | |
|---|---|
| **Proposal** | To keep the "allowance does not bypass authorisation" property while `R-FRZ-02` sits at precedence 2, add `R-FRZ-03` above it: *"an allowance whose reservation's subject the actor is not enrolled in does not apply."* |
| **Raised by** | Pass 3, as the repair for `L-7`'s reversal. |
| **Status** | **REJECTED.** |
| **Rationale** | `R-FRZ-03`'s condition is a strict subset of `R-VALID-01`'s — "the actor must be entitled to the `subject_id` the request names" — restricted to the one case where the request also carries an `exam_binding`. Under first-match-wins that is a dead rule, and `AG-9` exists precisely to catch that class of rule before it ships. It would also have produced a fourth rule id for one fact, and `prd.md`'s pair-enumeration gate (**AG-11**) would have had a new overlapping pair to explain. |
| **Resolution** | The check moves **into the pre-flight rule**. `R-VALID-01` at −1 asks, of any request that names a subject: does the actor hold an entitlement to it? A failed `exam_binding` fails the same question the rule was already asking about the request's own `subject_id`, so the answer is the same answer, produced by the same rule, at the front of the walk. |
| **Why this is the better shape** | A pre-flight rule is a rule about **whether the request is well-formed**, and an entitlement to the subject you are asking about is part of well-formedness. A mid-catalogue rule about exam bindings is a rule about a feature. Moving the check changes which *category* it belongs to, and that is why the fix is a simplification rather than an addition. |
| **Falsifier** | Two request shapes needing the same entitlement check against **different** subjects — the request's own, and the reservation's. This case exists (**EC-4.22**: a request scoped to `CS-480-VLM` carrying an `exam_binding` for another subject) and the rule handles it, because `R-FRZ-02` compares the **reservation's** subject while `R-VALID-01` compares the **actor's** entitlement to the request's subject; the two comparisons are on different pairs and a single pre-flight rule is the right home for the actor's side. |
| **Trace** | `prd.md` `R-VALID-01` at −1, `AG-9`, `AG-11` · `scenario-4.md` EC-4.6/4.7/4.22 · `EXPERIENCE.md` Flow 06 |

---

## 4. Proposals refused without a second hearing

Ten, each with the one sentence that closed it. They are listed separately from §3 because §3's reversals cost three revisions; these cost one line each, and that difference is the point — the log is more useful when it shows which refusals were obvious.

| # | Proposal | Refused because |
|---|---|---|
| `R-01` | The client supplies `exam_binding` and the engine trusts it | The reservation is a fact on `reservations.v1`, not a claim on a form. A trusted client-supplied binding converts a machine reservation into a self-declared one, and it is the single most valuable forgery in this module (**EC-4.22**). |
| `R-02` | The rationale is generated by a language model from the matched rule | NFR-2 requires `0` model calls in the decision path, and NFR-3 requires byte-identical output for identical input. A generated sentence satisfies neither, and a refusal whose wording varies between two readers of the same `decision_id` is not auditable. Rationale is templated from the rule, the cause, and the fact paths. |
| `R-03` | Cache facts locally in each engine node, keyed by TTL | It collapses the port register's per-port tolerance into one TTL, and `L-10` already established that the correct tolerances differ by two orders of magnitude. It also makes the decision a function of *which node* answered, which is the same defect as `L-1` reached by a different route. |
| `R-04` | The policy registry is mutable at runtime through a write route | `policy_version` is an input to `evaluate()` and appears on every decision. A registry that changes under a running walk means the same `(request, facts)` returns different `Decision`s on either side of the write, and the journal records a version that was not the one used. M2 is sole writer of `PolicyVersion`, and writes are append-only with a published notice (**`CAMPUS-NOTICE-2026-04`**). |
| `R-05` | Keep a per-rule deadline list, and let the first rule with a deadline win | This is the design `L-4` removed. Listed separately because it reappeared: it is the intuitive repair for any deadline bug, and it is the repair that reintroduces `RC-3`. `test/arch/props/single-deadline.test.ts` exists to stop it returning. |
| `R-06` | `NEAR_BOUNDARY_DISPLAY_HORIZON` also suppresses new submissions inside 8 h of a boundary | A rendering constant that changes an outcome is a rule wearing a costume. The constant is display-only, and a test asserts the outcome is invariant to it at 1 h and at 72 h. |
| `R-07` | Show the reason for a `DENY` only in the expandable trace, to keep the card compact | A card whose first sentence is the cause is the module's explainability claim; hiding the cause and showing the mechanism inverts it. `EXPERIENCE.md` §6's hard rule is *the first sentence is the cause, and the cause names a rule*. |
| `R-08` | The freeze console shows a single confirm button, and the consequence preview is a modal the activating person may skip | An irreversible action gated by a dismissible dialog is not gated. The preview is **not** a modal: it is rendered inline above the sticky action bar, so the button is always visible *and* the consequences are always above it, and the server refuses an activation whose `preview_token` is absent, unconsumed, actor-bound, or past `issued_at + 60 s`. |
| `R-09` | The console and the CLI may present the same decision differently, since they are different surfaces | A reader who gets a different answer from the two readers of one API has no way to know which one is the module. `test/ux/console-parity.test.ts` drives all 13 routes from both and asserts the outcome, `primary_rule_id`, `admission`, and constraint list are byte-identical. |
| `R-10` | `422` for a semantically valid request that the policy refuses, `200` only for `ALLOW` | All three outcomes are **results**, and a result with a `200` is a result a client can cache, retry, and log. `200` for `ALLOW`, `CONSTRAIN`, and `DENY` alike; `4xx` is reserved for a request the engine could not read (`prd.md` FR-16). The AI proposed this twice; the second time it came with an argument about HTTP semantics being "more correct", which is the tell. |

---

## 5. The reversal log

Two entries in §3 are reversals, and they are recorded here together because a reversal is a different kind of event from a decision. A decision is made once and defended. A reversal is a **withdrawal of a defence**, and the log's job is to make the withdrawal findable.

| Reversed | Original position | Reversed to | What produced the reversal | Cost of being wrong for two revisions |
|---|---|---|---|---|
| `L-3` | `R-TIER-03` below `R-TIER-02`; narrowing never automatic | `R-TIER-03` at 3, above `R-TIER-02` at 4, with A-7 bounding the variant | A reachability check the AI did not run when it made the proposal, exposed by the `AG-8` gate | One dead rule in the shipped catalogue, and FR-3's two acceptance clauses silently incompatible. Caught only because AG-8 was written to be failable. |
| `L-7` | `R-FRZ-02` at 14, below the freeze refusal | `R-FRZ-02` at 2, with the authorisation check moved to `R-VALID-01` at −1 | The observation that at 14 the invariant "an allowance does not bypass authorisation" was a property of ordering, not of rules | A path on which an actor with no entitlement to a reservation's subject is admitted by the allowance. Reachable, and no test would have failed until the allowance was exercised by someone not enrolled. |

**The pattern worth naming.** Both reversals have the same shape: the AI made a decision about **placement**, and placement in a strict total order is not a stylistic choice. A position in a total order is a *claim about what can be reached before what*, and getting it wrong does not produce a wrong-looking document — it produces a document whose claims are locally consistent and globally false. Neither mistake was visible by reading the catalogue. Both became visible only when a **gate was written to be failable**: AG-8 for `L-3`, and the `AG-9` subsumption test for `L-7`.

That is the single most transferable thing in this log. A review that only asks "is this correct?" passes both of these. A review that asks "**can any test fail on this?**" catches both.

---

## 6. Triage of the three adversarial passes

Every finding from every pass, and where it went. The per-finding arguments live in `reviews/`; this is the index, so a reader can move from a count to a decision without reading 93 arguments.

| Pass | File | Findings | Accepted and applied | Closed by a rewrite | Stale premise, substance kept | Declined |
|---|---|---|---|---|---|---|
| PRD adversarial | `reviews/review-prd-adversarial.md` | 28 | 22 | 4 | 2 | 0 |
| Architecture adversarial | `reviews/review-arch-adversarial.md` | 30 | 24 | 3 | 3 | 0 |
| Architecture edge cases | `reviews/review-arch-edge-cases.md` | 35 | 26 | 7 | 2 | 0 |
| **Total** | | **93** | **72** | **14** | **7** | **0** |

Per-finding triage tables: `prd.md` §13 (28 rows, plus a §14 of 5 cross-document reconciliation findings **RC-1**…**RC-5**), `ARCHITECTURE.md` §12 (30 rows) and §13 (35 rows).

**Zero declines is itself a finding, and it is a weak one.** A pass whose every finding is accepted has usually been run by the same process that wrote the document. The defence against that is not restraint; it is the shape of the request. These three passes were run as **path enumeration** (walk every branch, report only what lacks a guard) and as **cynical review** (argue that the document is wrong), not as "find issues" — and a path enumeration reports a missing guard whether or not anyone wants it to. Seven findings were closed by a rewrite rather than fixed, which is the number that would otherwise be hidden: those seven were symptoms of a decision the pass had identified the *shape* of, and fixing the decision dissolved them. `INDETERMINATE` is the largest — it produced a fourth outcome token, a fourth trace state, an `E-SYSTEM` branch in the UX state machine, and four wording rules, and revision 3 deleted all of it because `R-DEP-01` at precedence 0 is a rule and a rule is a `DENY` with a cause.

---

## 7. What this log does not claim

1. **It does not claim the package is correct.** It claims that the places where the AI was wrong are written down, and that each wrong answer names the observation that produced it. A log with no reversals in it is a log of a process that did not look.
2. **It does not claim the two reversals were the only reversals available.** They were the two a failable gate produced. A third may exist behind a gate that has not been written yet; the readiness report names the tests that do not yet exist, and that list is where a third reversal would appear.
3. **It does not claim the rejected proposals were unreasonable.** `R-10` was proposed twice, and the second time with an argument that held up on inspection and still lost. The entry is not recorded because the proposal was silly; it is recorded because it was plausible and still wrong, which is the case that costs the most to catch.
4. **It does not claim the roles were always named.** They were not, and the corrections are in the record: `DESIGN.md` and the wireframes used *operator*, *developer console*, *blast radius*, and the scenario-4 annex quoted the assignment's own "lab admin". `prd.md` FR-15 put sixteen terms and four bare role words on a deny-list, and the first scan of `ux/` found 29 hits. FR-15's list is now zero-violation across `planning/` and `ai-log/`, and this file is inside that scope — including this sentence, which is why it says *lab director* nowhere and *Dr. Rebecca Reed* everywhere.
