# Scenario 2 — VRAM Tier Gate
## Module M2 — Academic GPU Policy Engine

**Annex scenario:** *"Student requests access to a 70B model requiring 48 GB VRAM; policy engine intercepts and rejects with an explanation of model tier restrictions."*
**Protagonist:** Elena Vargas — Undergraduate, Computer Vision (`CS-340-CV`, `CS-480-VLM`)
**Rules under demonstration:** `R-TIER-03` (precedence 3) → `NO_MATCH`, the variant *found and refused*; `R-TIER-02` (precedence 4) → `DENY`; `R-ALLOW-01` (precedence 19) on the follow-on evaluation
**Surfaces:** UX-1 Evaluator, UX-2 RuleCatalogue

---

## 1. Scenario outline

| | |
|---|---|
| **When** | Wednesday, campus-local 11:04:12.008 CST — 64 minutes after S-1, same lab session, same policy version |
| **What she wants** | Run `Llama-3-70B-Instruct-Q4` for her `CS-480-VLM` final project. She has read that the 70B Q4 build "needs about 40 GB" and the lab machines have 24 GB cards. She believes the dual-48GB server can take it. |
| **What she does not know** | That (a) the fleet *physically has* two 48 GB GPUs and still must refuse her, and (b) that a 9.5 GB model was the answer all along. |
| **Internal tension** | The most dangerous kind of refusal: the hardware exists, the reason is invisible, and "ask the admin" is the default advice. The experience must make a *permission* boundary as legible as a *capability* boundary — a cap Elena can see is one she can reason about and quote; a cap she cannot see is obeyed in exactly the same way and argued with in exactly the same absence of evidence. |
| **Resolution** | `DENY` with `R-TIER-02` naming her clearance, plus a primary next action that **submits a compliant alternative for her**. |
| **Residue** | A stacked `ALLOW` beneath the `DENY`, connected by a visible "proposed by this denial" line — the causal chain stays on screen. |

### 1.1 Why this scenario carries the explainability argument

S-1's refusal is temporally contingent (come back at 22:00). S-2's refusal is a **structural privilege boundary**. If the console can only say "48 GB required, 24 GB available", the institution looks like it is rationing scarce hardware. If it can say "the fleet has exactly one 48 GB class, `srv-48gb` with 2 GPUs, and your role tier cannot reach it — Dr. Reed is the approver", the same refusal reads as an *access policy* with a named owner. That distinction is the module's product.

---

## 2. [C] Conceptualise

**Layout.** Same four-zone Evaluator as S-1. One addition: the **stacked-decision connector** — when a next action auto-submits and produces a new decision, the new card renders directly beneath the old one with a 1 px dotted vertical rail and the label `proposed by the denial above`. Without the connector, the two cards read as two unrelated results and the student learns nothing.

**Key elements**

| Zone | Element | Purpose |
|---|---|---|
| A | ContextBar — actor chip now expands on hover to show the clearance line: `max_vram_gb 24 · max_gpu_count 1 · tier STUDENT` | The refusal reason must be visible *before* the request is made, not only after |
| B | RequestComposer — VRAM segmented control on `48 GB`, model ref `Llama-3-70B-Instruct-Q4` | The two facts that collide |
| C | `○ DENY` card, `R-TIER-02`, then stacked `● ALLOW` card below | The refusal and the path forward, in one viewport |
| D | EvidenceTrace, expanded, focused on the clearance fact path | Proves the hardware exists and is still refused |
| E | RuleCatalogue opened at rule 3 with a cross-reference to `ROLE-TIERS §2` | Lets her see the *class* of rule, not just this instance |

---

## 3. [P] Specifications

### 3.1 Request (fixture)

```json
{
  "request_id": "c1d90f7e-33ab-4e28-9a10-5b2f7c1e4408",
  "actor_ref": "u-elena-vargas",
  "workload_kind": "INTERACTIVE_INFERENCE",
  "subject_id": "CS-480-VLM",
  "model_ref": "Llama-3-70B-Instruct-Q4",
  "requested_gpu_count": 1,
  "requested_vram_gb_per_gpu": 48,
  "expected_duration_min": 45,
  "exam_binding": null
}
```

**There is no `priority_class`, and its absence is a revision 3 correction.** Revision 1 carried a `NORMAL|THESIS|EXAM` flag here that **no rule read** — a field on the request that made the document look as though it had made a decision it had not made. `prd.md` AG-10 now requires every declared field to have a named consumer, so the Composer has no priority control and the fixture has no priority field. An unranked request is also the honest starting point for this scenario: the whole question is whether capability and permission suffice, and a `priority` field would have invited the reader to ask whether `THESIS` would have changed the answer, which no rule would have honoured.

### 3.2 The collision, in one line

| Fact | Value | Source |
|---|---|---|
| `catalog[Llama-3-70B-Instruct-Q4].min_vram_gb` | **48.0** | Model Catalog (M5) |
| `fleet[srv-48gb]` | `gpu_count=2, vram_gb_per_gpu=48, available=1, cordoned=0, failing=0` | Fleet (M3) — **the hardware exists and one is free** |
| `actor[u-elena-vargas].role_tier` | **`STUDENT`** → `max_vram_gb = 24` | Access Manager (M1) |
| `role_tiers` | `STUDENT` → `max_vram_gb = 24`; `RESEARCHER` → `48`; `LAB_OPERATOR` → `96` | `ROLE-TIERS §2` |
| `catalog[Llama-3-70B-Instruct-BF16-3bit]` | `min_vram_gb = 24.1`, **`required_min_role_tier = RESEARCHER`** | Model Catalog (M5) |

The engine therefore has physical feasibility (`R-TIER-01` = NO_MATCH) but no authorised feasibility (`R-TIER-02` = MATCH). This is the exact distinction the scenario exists to test, and it is why `R-TIER-01` and `R-TIER-02` are two rules and not one.

**Why a 24.1 GB variant of the same model does not save her.** A 3-bit 70B build does fit inside 24 GB. If `R-TIER-03` compared only VRAM, Elena could reach a 70B model by asking for a nominally smaller build, and the authorisation boundary would become a naming convention. Assumption **A-7** requires a variant to satisfy the cap on **both** VRAM **and** role tier, so the refusal rests on the permission rather than on a technicality she could argue down. The engine *found* the variant, *evaluated* it, and *refused* it on a named ground — and the card says so, because a refusal that hides the option it considered reads as an oversight.

### 3.3 Rule evaluation

| P | Rule | Result | Note |
|---|---|---|---|
| −1 | `R-VALID-01` | NO_MATCH | request shape is valid; `exam_binding` is null, so there is nothing to resolve |
| 0 | `R-DEP-01` | NO_MATCH | all 8 ports answered within `FACT_TIMEOUT_MS = 40`; the `catalog` snapshot is 6 h old, inside its 6 h **admission** tolerance though past its 24 h **display** tolerance, so `Catalog` appears in `stale_facts[]` |
| 1 | `R-FRZ-01` | NO_MATCH | no freeze |
| 2 | `R-FRZ-02` | NO_MATCH | no freeze |
| **3** | **`R-TIER-03`** | **NO_MATCH — the interesting one** | a variant *does* exist (`…-BF16-3bit`, 24.1 GB) but its `required_min_role_tier = RESEARCHER` exceeds Elena's `STUDENT`, so it does **not** qualify (A-7) |
| **4** | **`R-TIER-02`** | **MATCH → `DENY(NOT_AUTHORIZED)`** | exceeds the actor's clearance **and no qualifying variant exists** — the strict complement of `R-TIER-03` |
| 5–19 | — | NOT_EVALUATED | preempted by precedence |

**Why `R-TIER-03` sits at 3 and `R-TIER-02` at 4.** In PRD revision 1 they were the other way round, which made `R-TIER-03` dead code: its condition ("exceeds the actor's clearance") is a strict *subset* of `R-TIER-02`'s, and the first matching rule wins. The adversarial review falsified the original ordering — finding **PRD-2** in `reviews/review-prd-adversarial.md` — and §5 below records the reversal of both this scenario's earlier triage and decision-log entry **L-3**.

### 3.4 DecisionCard copy (verbatim)

```
○ DENY                                       R-TIER-02    POL-TIER · ROLE-TIERS
admission: REJECTED · authority: FINAL

You asked for Llama-3-70B-Instruct-Q4 on 1 × 48 GB GPU.

Your role (STUDENT) caps you at 1 × 24 GB. This is a permission boundary,
not a hardware shortage: the fleet has one 48 GB class (srv-48gb, 2 GPUs)
and one of them is free right now — your role cannot reach it.

Why:   the request exceeds your clearance, and no variant of this model
       is available at your tier
       fact:  actor[u-elena-vargas].role_tier = STUDENT       (ROLE-TIERS §2)
       fact:  actor[u-elena-vargas].max_vram_gb = 24
       fact:  catalog[Llama-3-70B-Instruct-Q4].min_vram_gb = 48.0
       fact:  catalog[Llama-3-70B-Instruct-BF16-3bit].min_vram_gb = 24.1
              → refused as a workaround: it requires RESEARCHER, you are STUDENT
       note:  srv-48gb is physically free — this refusal is by policy.

What you can do:
  [ Run Qwen2.5-32B-Instruct-AWQ (19.4 GB) instead ]  ← runs now   (primary)
  [ Ask Dr. Rebecca Reed about a RESEARCHER grant — ROLE-TIERS §2 ]
  [ See every model you can run today (14) ]

No narrower request on Llama-3-70B-Instruct-Q4 is available to you: the one
catalog variant below 48 GB needs a role tier you do not hold.

Evaluated 2026-04-08 11:04:12.008 CST · policy v41 · request c1d90f7e
```

The `→ refused as a workaround` line is the most important sentence in this card. Without it the engine looks like it failed to notice an available option; with it, the requester can see the option was found, evaluated, and refused on a named ground — so she can argue with the *ground* rather than with the engine. The closing paragraph satisfies FR-9's "≥ 1 next action" **and** the stronger promise in EXPERIENCE.md §4.4 that when no alternative exists the card says so explicitly.

### 3.5 The stacked follow-on decision

Action 1 is not a `R-TIER-03` substitution — it names a **different model**, which is a rewritten request, not a variant. The engine therefore re-evaluates it from scratch, and the new decision is stacked beneath the old one so the causal chain stays on screen:

```
⋮ proposed by the denial above

● ALLOW                                     R-ALLOW-01    POL-TIER · POL-ENTITLE
admission: ADMITTED · authority: FINAL
Admitted. 1 × 24 GB class (ws-24gb), 6 units free, allocated at launch.
  ◑ MODEL_VARIANT         none — this is a different model, not a variant
  ◑ WINDOW_SCOPE          none — unaffected by WIN-4417 (interactive inference)
valid until  2026-04-08 19:00:00 CST  (cs-480 session end)
  = MIN(11:04:12 + 45 min = 11:49:12, cs-480 session end 19:00)
```

`R-ALLOW-01` is the standing default admission at precedence 19, added in PRD revision 2 after the adversarial review established that revision 1 contained **no `ALLOW` rule and no default at all** (finding **PRD-1**) — meaning the module's most common outcome was unproducible and FR-1's "exactly one terminal outcome" was unfalsifiable. The card naming it is load-bearing: it tells Elena that this outcome came from the default, not from a rule that examined and approved *her* request in particular. The `valid_until = 19:00` line also shows that an interactive, session-scoped request is bounded by §6.1 step 4 like every other admission — bounding is not a batch-only concern.

### 3.6 Validation of every state (V)

| State | Specification |
|---|---|
| **Loading** | Identical to S-1, except that the `catalog` cell is **amber** at 6 h snapshot age with a `6h` badge, and `Catalog` appears in the evidence header's `stale_facts[]` list. This is the first scenario in which staleness is visible, and it is visible *before* the answer rather than hidden inside it (EXPERIENCE.md law 3). 6 h is the **admission** tolerance: the decision proceeds, but only just — a 7 h-old catalogue would fail closed under `R-DEP-01`. |
| **Empty** | Action 3 ("See every model you can run today") opens a filtered catalogue list whose plain empty state never triggers (14 models). Its **filtered-empty** state is specified and is reachable: filtering to `weight_class = 70B` yields `E-FILTERED` — "0 of 14 models match `weight_class=70B ∧ fits_clearance≤24 GB`" — with both filter chips removable. |
| **Error** | E-VALIDATION is reachable without touching the engine: `requested_gpu_count = 2` with the 48 GB control produces a composer error — *"2 × 48 GB requires the srv-48gb class, which is reserved for distributed training jobs (POL-TIER §4)"* — a **composer-level** guard, distinct from the engine's `R-TIER-01`. The console prevents an obviously illegal combination; the engine still judges it if the request arrives by API. Both layers are specified; neither is assumed to cover for the other. |
| **Success** | The `ALLOW` card above. Validity strip present because a session-scoped inference request still carries `valid_until = 19:00`; no `must_checkpoint_by`, because a 45-minute interactive inference started at 11:04 ends at 11:49 and `R-BOUND-01` finds no boundary in `B` before that — there is no protected window open, and 11:49 is not in `NIGHT_WINDOW`, so the only applicable bound is the request's own duration. |

### 3.7 Accessibility for this scenario

| Check | Result |
|---|---|
| Not colour-only | `○ DENY` vs `● ALLOW` differ by glyph and word; stacked cards are also ordered by DOM and by an `aria-describedby` link from the lower card to the upper |
| Cognitive load | The "permission not hardware" sentence is plain-language and is the **second** sentence, where the denial is still in working memory |
| Screen reader | The stacked connector is `aria-hidden` (decorative) but the relationship is preserved in the lower card's accessible name: `Decision: ALLOW, proposed by the denial above` |
| Keyboard | Both cards' next-actions are in DOM order; Enter on the lower card's primary action does **not** re-trigger the upper card's action (focus is not reset upward) |

---

## 4. Boundary and edge conditions proven

| # | Condition | Expected | Proves |
|---|---|---|---|
| EC-2.1 | `requested_vram = 48`, actor `STUDENT` (cap 24), `srv-48gb.available = 1` | `DENY` / `R-TIER-02`, with `R-TIER-03` recorded `NO_MATCH` and the refused variant named in the evidence | The availability of the hardware does not weaken the refusal, and a variant was found and refused on a named ground |
| EC-2.2 | `requested_vram = 48`, actor `RESEARCHER` (cap 48), `srv-48gb.available = 1` | `ALLOW` / `R-ALLOW-01` | The same request under a higher tier is admitted — proves the rule reads the actor, not the fleet |
| EC-2.3 | `requested_vram = 48`, actor `STUDENT`, `srv-48gb.cordoned = 1` | `DENY` / `R-TIER-02`; trace additionally shows `R-TIER-01` NO_MATCH and `R-CONTEND-01` NOT_EVALUATED | Cordon changes contention, never authorisation |
| EC-2.4 | `requested_vram = 72` (not a class in the fleet) | `DENY` / **`R-TIER-01`** | The physical-infeasibility rule and the clearance rule are distinct in effect **and** distinct in id — one rule producing both causes would make the two errors indistinguishable in the journal, which is the property that makes the two-rule split worth its cost | |
| EC-2.5 | `requested_gpu_count = 2`, `vram = 48`, both `srv-48gb` GPUs free, actor `RESEARCHER` | `ALLOW` on the `srv-48gb` class | GPU count is checked against class capacity, not against "one card per node" |
| EC-2.6 | `model.min_vram = 48` but request declares `vram = 24` (client bug) | `DENY` / `R-TIER-01`, trace cites both the request and the model floor | NP-5: self-contradictory requests are refused, never silently corrected |
| **EC-2.7** | `requested_vram = 48`, actor `STUDENT` (cap 24), and a catalog variant of the 70B family exists with `min_vram_gb ≤ 24` **and** `required_min_role_tier = STUDENT` | **`CONSTRAIN` / `R-TIER-03`**, `MODEL_VARIANT` + `RESOURCE_SUBSTITUTION`, `admission = ADMITTED` | **`R-TIER-03` is reachable.** It is dead code in every other row of this table, and AG-8 requires a passing test in which it is the primary rule and a second test that fails if it is deleted. This is that test pair. |
| **EC-2.8** | `requested_vram = 24`, actor `STUDENT`, `ws-24gb.available = 0` **and** `ws-24gb.failing ≥ 1` | `DENY(HARDWARE_FAILING)` / `R-FLEET-01`; `R-CONTEND-01` NOT_EVALUATED | A failing node must never be converted into a `QUEUE_ONLY`. CAP-3's fourth cause (hardware in a failing state) keeps its own rule at precedence 6, and CAP-7's "distinguishable from queued in 100 % of cases" is what forces it. Note this case is *not* reachable from the 70B fixture, which is the point: the two tier rules short-circuit before contention is ever considered. |

EC-2.1 vs EC-2.2 is the pair that proves the engine is a *policy* engine and not a capacity check. EC-2.7 is the pair that proves the variant rule is a real rule and not dead code.

---

## 5. Triage of UX-design findings from the Phase 2 review

This table is retained verbatim in substance, including the reversal. A triage log that only ever shows the reviewer being right teaches nothing; the row below records **this reviewer being overruled by this reviewer** four documents later, which is the more useful lesson.

| Finding | Raised against | Decision | Reason |
|---|---|---|---|
| `UX-ORD-1` — "`R-TIER-02` (deny) shadows `R-TIER-03` (constrain to a variant), so a student with a compliant variant in the same family still gets a hard `DENY` with no automatic narrowing" | `scenario-2.md` §3.3 | **REJECTED at the time → REVERSED at PRD triage** | **Original rejection (now withdrawn).** The reasoning was: the variant rule is keyed to the *model family*; letting it preempt the clearance rule would let any student reach a 48 GB model by requesting a nominally smaller variant, converting an authorisation boundary into a naming convention. Recorded as decision-log entry **L-3**. **What falsified it.** The rejection reasoned about `R-TIER-03`'s *consequence* and never checked its *reachability* — and under a strict total order where the first match wins, a rule whose condition is a strict subset of an earlier rule's is not merely risky, it is **unreachable**. A rule that cannot fire is not a security control; it is a comment. `R-TIER-03` was dead code in every reachable input, so FR-3's two acceptance clauses could not both hold and the "narrowing" the three-outcome vocabulary promises was unavailable exactly where it was most valuable. **The resolution keeps the security concern and discards the ordering that caused it.** `R-TIER-03` now sits at precedence 3 (before `R-TIER-02` at 4), and assumption **A-7** carries the protection the rejection was actually arguing for: a variant qualifies only if it satisfies the cap on VRAM **and** on role tier. A 3-bit 70B build needs `RESEARCHER`, so Elena is still refused — but now she is refused by a rule that *ran and considered the variant*, and the card can prove it (§3.4). The security property is strengthened, not traded: a refusal is only auditable if the auditor can see the option that was considered. **Recorded as L-3 (REVERSED) in `ai-log/decision-log.md`; PRD finding PRD-2.** |
| `UX-CMP-1` — "The VRAM segmented control prevents `72`, so `R-TIER-01`'s physical-infeasibility branch is unreachable from the console" | §3.6 Error | **ACCEPTED (documentation)** | Correct and already handled: EC-2.4 and EC-2.6 prove the branch via the API path, and §3.6 states explicitly that the console guard does not stand in for the engine. Recorded so a future reviewer does not re-raise it. |
| `UX-STK-1` — "Two decision cards for one interaction doubles the audit surface and could be read as two separate submissions" | §3.5 | **ACCEPTED (partial)** | The lower card is rendered inside the same decision id with a `derived_from` pointer, and only the **first** card is written to the journal. The follow-on `ALLOW` is not separately journaled. Documented in the FR-11 addendum in the PRD. |
| `UX-STK-2` — *raised during the post-rewrite reconciliation, not by the Phase 2 review:* "the stacked card claimed `R-TIER-03` and a `MODEL_VARIANT` constraint, but a different model is a rewritten request, not a variant — the card misdescribed its own primary rule" | §3.5 | **ACCEPTED** | The card was wrong in a way that would have been caught in an audit: it cited a rule that had not fired and a constraint kind the engine did not emit. Corrected to `R-ALLOW-01` with no `MODEL_VARIANT` constraint (§3.5). The general rule this establishes: **a decision card may only name a `primary_rule_id` and a `constraint.kind` that the engine actually returned.** A display layer that paraphrases a decision is a second, undocumented policy engine. |
| `UX-STK-3` — *raised during the post-rewrite reconciliation:* "the `Success` state showed a validity strip with no explanation of where 19:00 came from" | §3.6 | **ACCEPTED** | The card now prints the arithmetic — `= MIN(11:04:12 + 45 min = 11:49:12, cs-480 session end 19:00)`. A bound with no derivation is indistinguishable from an arbitrary number, and an arbitrary expiry is the kind of detail a requester cannot argue with. |

---

## 6. Traceability

| Requirement | Evidence |
|---|---|
| FR-1 | §3.3 — one terminal outcome, one `admission`, one non-null `primary_rule_id` |
| FR-3 | §3.2, §3.3, §3.4, EC-2.1…2.8 — all three FR-3 clauses, with disjoint inputs so the variant branch and the clearance branch both hold at once |
| FR-9 | §3.4 (cause in sentence 1, mechanism with 4 fact paths, the refused variant named, explicit no-alternative statement) |
| FR-11 | §5 `UX-STK-1` — the derived decision is not separately journaled |
| NFR-3 | §3.5 — the follow-on decision pins the same `policy_version` and is a pure re-evaluation, not a mutation of the parent |
| NFR-5 | The card prints role tier and clearance, never a name in a token, never a credential; the scrubbing test covers this exact fixture |
| NFR-6 | `DENY` carries `R-TIER-02` + 2 citations + 3 next actions + the explicit empty-alternatives statement |
| FR-1 | The `R-TIER-03` branch (§3.3, EC-2.3) is a `CONSTRAIN` with `admission = ADMITTED` — a third outcome, not a variant of the first two. FR-1's acceptance is the 3-outcome × 19-rule matrix and this scenario is the only one that puts all three on one screen |
| FR-15 | The two actors are named (Elena Vargas, Dr. Rebecca Reed); the request carries `u-elena-vargas` and no display name |
| FR-16 | §3.4's card contains none of `error`, `failed`, `403`, `CANNOT EVALUATE`. The specific temptation here is to render "insufficient permissions" — banned, because it names no rule and no fact (a permission is a clearance number in `ROLE-TIERS §2`) |
| NFR-1 | `R-TIER-03` at precedence 3 fires before `R-TIER-02` at 4 in the variant case and the walk stops; in the refusal case `R-TIER-03` is `NO_MATCH` (A-7's role-tier clause) and the walk runs to 4. Both paths are asserted |
| NFR-12 | Exactly one rule matched; the two rules the scenario places in tension (`R-TIER-02`, `R-TIER-03`) never both contribute, and the trace says which one ran and why the other did not |
| NFR-13 | The rule that matched reads a `FAIL_CLOSED` port: `R-TIER-02` reads `access.v1.Access`, tolerance 0 s, so no cached copy of Elena's clearance may support the refusal |
