# 00 — UX Scenarios Index & Coverage Matrix
## Module M2 — Academic GPU Policy Engine

**Artifact:** `ux/C-UX-Scenarios/00-ux-scenarios.md` · **Phase:** 2 · **Status:** FINAL · **Revision:** 3
**Method:** `wds-3-scenarios` (scenario outlining) → `wds-4-ux-design` (per-scenario [C] Conceptualise → [P] Specify → [V] Validate) → `bmad-review-edge-case-hunter` (35 findings, triaged in `reviews/review-ux-edge-cases.md`).
**Scope rule:** each scenario covers exactly one mandatory scenario from the Plan-2 Annex for Module 2, and only the surfaces that scenario needs. No scenario is invented to fill the quota; no surface is specified that no scenario reaches.
**Alignment:** every rule id, precedence, and constant below is taken from `planning/prd.md` revision 3. This index is a **pointer**, never a second source of truth — revision 2 drifted out of alignment with the catalogue and had to be rewritten, which is the reason the rule is stated rather than assumed.

---

## 1. Scenario register

| # | File | Annex scenario | Protagonist | Primary surface | Decision exercised | Edge condition proven |
|---|---|---|---|---|---|---|
| S-1 | [`scenario-1.md`](./scenario-1.md) | Scheduled Lab Protection | Elena Vargas | UX-1 Evaluator | `R-LAB-01` (prec. **10**) → `DENY` | Half-open window edges at 1 ms granularity, **plus** the 4 min 59.999 s `PROTECTION_GRACE` band where the past-bound guard replaces a `CONSTRAIN` with an `ALLOW` + `WINDOW_SCOPE` — NFR-4 |
| S-2 | [`scenario-2.md`](./scenario-2.md) | VRAM Tier Gate | Elena Vargas | UX-1 Evaluator | `R-TIER-02` (prec. 4) → `DENY`; `R-TIER-03` (prec. **3**) → `CONSTRAIN → MODEL_VARIANT` | The fleet **has** the hardware and the requester may not use it; plus the refused variant, a variant that lowers VRAM but raises the required role tier (A-7) |
| S-3 | [`scenario-3.md`](./scenario-3.md) | Overnight Grace Policy | Elena Vargas | UX-1 Evaluator | `R-NIGHT-01` (prec. 12), `R-BOUND-01` (prec. **13**) → `CONSTRAIN` | **Mandatory edge case (FR-7):** a job admitted under night policy whose runtime reaches a protected morning window. Four evaluations E-1…E-4, one `ALLOW` and three `CONSTRAIN`s, each with the boundary arithmetic shown |
| S-4 | [`scenario-4.md`](./scenario-4.md) | Emergency Freeze Rule | Dr. Rebecca Reed | UX-4 Freeze Console + UX-1 Evaluator + UX-3 Journal | `R-FRZ-01` (prec. 1) → `DENY`; `R-FRZ-02` (prec. **2**) → `CONSTRAIN → WINDOW_SCOPE`; `R-DEP-01` (prec. 0) → `DENY`; `R-VALID-01` (prec. −1) → `DENY(NOT_AUTHORIZED)` | Freeze activated while 14 jobs hold an open `ALLOW` (NP-2); plus 18 numbered edge conditions EC-4.1…4.18 |

### 1.1 What revision 3 changed in the register

Four things, and each of them is a correction of a defect rather than an addition of polish.

| # | Change | Why |
|---|---|---|
| 1 | **Three rules became one.** `R-GRACE-01` + `R-STRADDLE-01` + `R-THESIS-01` are now `R-BOUND-01` at precedence 13, and the bound is computed in `prd.md` §6.1 step 3 **before** the walk | Three rules computing three deadlines from three boundary lists is three chances to disagree, and two of them did — see finding `UX-S3-04`, where the card showed `08:55` as binding and struck `06:00` through as irrelevant, which is arithmetically false. A **bound table** in which the highlighted row *is* the minimum cannot disagree with itself. |
| 2 | **`priority_class` is gone from `Request`** | Revision 1 carried a `NORMAL\|THESIS\|EXAM` flag that **no rule read** — a field that made the document look as though it had made a decision it had not made. The Composer has no priority control, and the absence is now deliberate. `prd.md` AG-10 requires every declared field to have a named consumer. |
| 3 | **`R-FRZ-02` moved from precedence 14 to 2, and its consequence was followed rather than assumed** | Moving the allowance above `R-AUTH-01`/`R-AUTH-02` meant revision 2's guarantee that *an allowance does not bypass authorisation* had become false. It is restored at precedence −1: `R-VALID-01` requires an entitlement to the reservation's subject. S-4's EC-4.6/4.7 are the two halves of that consequence, one of them deliberately accepted. |
| 4 | **The dependency failure is no longer a fourth state** | `R-DEP-01` is a rule at precedence 0, so a port failure is a `DENY` with a cause and a `retry_after_ms`. Revision 2's `CANNOT EVALUATE` was a second decision path made visible, and `M2-AD-1` exists to guarantee there is exactly one. S-4 §5 renders the corrected card. |

---

## 2. Coverage matrix — surfaces × states

Every cell is specified in `EXPERIENCE.md` §4–5 and instantiated in the named scenario file. `●` = specified in that scenario; `◐` = specified generically in `EXPERIENCE.md` and not reached by this scenario.

| Surface | S-1 | S-2 | S-3 | S-4 | Loading | Empty | Error | Success |
|---|---|---|---|---|---|---|---|---|
| UX-1 RequestComposer | ● | ● | ● | ◐ | ◐ | ◐ | ● | ● |
| UX-1 DecisionCard (`DENY`) | ● | ● | ◐ | ● | ◐ | ◐ | ◐ | ● |
| UX-1 DecisionCard (`CONSTRAIN`) | ◐ | ● | ● | ● | ◐ | ◐ | ◐ | ● |
| UX-1 DecisionCard (`ALLOW`) | ● | ● | ● | ● | ◐ | ◐ | ◐ | ● |
| UX-1 EvidenceTrace (19 rows, `NOT_EVALUATED` labelled) | ● | ● | ● | ● | ◐ | ◐ | ● | ● |
| UX-1 Bound table (`governing` / `superseded` / `outside_horizon`) | ● | ◐ | ● | ◐ | ◐ | ◐ | ◐ | ● |
| UX-1 `suppressed[]` panel | ◐ | ◐ | ● | ◐ | ◐ | ◐ | ◐ | ● |
| UX-1 NextActionButton | ● | ● | ● | ◐ | ◐ | ◐ | ● | ● |
| UX-1 ContextBar — 10-cell port grid with per-port tolerance | ● | ● | ● | ● | ● | ◐ | ● | ● |
| UX-1 ContextBar — clock reading with stratum | ● | ● | ● | ● | ◐ | ◐ | ● | ● |
| UX-1 TerminalPane (`curl` + JSON) | ● | ● | ● | ◐ | ● | ● | ◐ | ● |
| UX-2 RuleCatalogue (19 rows, 2 pre-flight) | ◐ | ● | ● | ◐ | ● | ◐ | ◐ | ● |
| UX-2 Version diff (`?version=`) | ◐ | ◐ | ◐ | ● | ◐ | ◐ | ◐ | ● |
| UX-3 JournalTable (filterable by `freeze_id`) | ◐ | ◐ | ◐ | ● | ● | ● | ● | ● |
| UX-4 FreezeConsole — scope, window, allowances | ◐ | ◐ | ◐ | ● | ● | ● | ● | ● |
| UX-4 Consequence preview + 60 s token | ◐ | ◐ | ◐ | ● | ● | ● | ● | ● |
| UX-4 Activation-blocked state (E-SYSTEM) | ◐ | ◐ | ◐ | ● | ● | ◐ | ● | ◐ |
| UX-4 Lift (modal, `lift_reason`) | ◐ | ◐ | ◐ | ● | ◐ | ◐ | ● | ● |
| UX-5 API Explorer (13 routes) | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ |
| UX-6 CLI | ● | ● | ● | ● | ◐ | ● | ● | ● |

**Two cells are deliberately `◐` in every column.** UX-5 and UX-6 are *clients* of the same 13 routes; the scenarios exercise the routes, not the clients, and specifying a client behaviour that no scenario reaches is how a surface acquires copy nobody verified. Their state tables live in `EXPERIENCE.md` §5 and their parity is a test, not a scenario.

---

## 3. Coverage matrix — requirements × scenarios

| Requirement | S-1 | S-2 | S-3 | S-4 | Where proven beyond the screen |
|---|---|---|---|---|---|
| FR-1 single terminal outcome | ● | ● | ● | ● | `test/contract/single-outcome.test.ts` over the 3-outcome × 19-rule matrix |
| FR-2 freeze override **and** the examination it protects | ◐ | ◐ | ◐ | ● | EC-4.1…4.7, 4.17, 4.18 |
| FR-3 VRAM / GPU-count tier gate | ◐ | ● | ◐ | ◐ | fleet-infeasibility table test; A-7 refusal case |
| FR-4 lab protection | ● | ◐ | ◐ | ◐ | 1 ms boundary sweep, `sa-1.test.ts` |
| FR-5 night window | ◐ | ◐ | ● | ◐ | midnight-crossing sweep at 4 instants |
| FR-6 bound by the earliest boundary | ◐ | ◐ | ● | ◐ | `props/single-deadline.test.ts` over 10 000 contexts |
| FR-7 straddle (the mandatory edge case) | ◐ | ◐ | ● | ● | E-2/E-3/E-4 with the arithmetic printed |
| FR-8 quota cap (`R-QUOTA-01`, `R-QUOTA-02`) | ◐ | ◐ | ◐ | ◐ | integer-arithmetic test + `concurrency/quota-commit.test.ts` |
| FR-9 explained decision, **including what did not apply** | ● | ● | ● | ● | `suppressed[]` clause; citation-resolution boot check |
| FR-10 dependency degradation | ◐ | ◐ | ◐ | ● | per-port failure matrix over the 10-row register; `ad4-port-failure.test.ts` |
| FR-11 decision journal | ◐ | ◐ | ◐ | ● | `GET /policy/journal` idempotence over a closed window |
| FR-12 policy versioning | ◐ | ◐ | ◐ | ● | the freeze publishes as v42; v41 remains readable |
| FR-13 engine purity | ◐ | ◐ | ◐ | ◐ | import allow-list gate + 10 000-replay byte-identity |
| FR-14 interactive evaluator | ● | ● | ● | ● | console-client black-box test against the 13 routes only |
| FR-15 falsifiable language | — | — | — | — | CI doc-lint over `planning/` and `ai-log/`; **0 violations in `planning/` at revision 3** |
| FR-16 the word "error" is reserved | ● | ● | ● | ● | grep over the rendered-copy table: 0 `error` / `failed` / `403` / `CANNOT EVALUATE` |
| NFR-1 evaluation latency | ● | ● | ● | ● | load test, `p99 ≤ 5 ms` for `evaluate()` alone |
| NFR-4 boundary correctness | ● | ◐ | ● | ◐ | property test, 1 000 instants per window type |
| NFR-5 no PII or credential leakage | ● | ● | ● | ● | field-set equality against the allow-list |
| NFR-6 explanation completeness | ● | ● | ● | ● | schema assertion over all four `DENY` shapes |
| NFR-10 independent runnability | ● | ◐ | ◐ | ◐ | cold-start `docker compose up` record |
| NFR-13 per-rule fail mode | ◐ | ◐ | ◐ | ● | the two fleet ports may not merge back into one |

---

## 4. Protagonist continuity

| | S-1 | S-2 | S-3 | S-4 |
|---|---|---|---|---|
| **Elena Vargas** — Undergraduate, Computer Vision (`CS-340-CV`, `CS-480-VLM`) | Wed 2026-04-08 10:04 — a 4-hour background batch inside a live lab window | Wed 11:04 — a 70B request that the fleet can satisfy and her clearance cannot | Tue 22:10 and Wed 02:00 — a 6-hour run that fits, then a 10-hour run that does not | not present; **her S-3 job is one of the 14 `RUNNING` jobs the freeze preempts** |
| **Dr. Rebecca Reed** — Lab Director (`role_tier = INSTRUCTOR`, `LAB_OPERATOR` scope) | owns the `CS-340-CV` protected window the console cannot see | owns the `ROLE-TIERS` clearance table that produced the refusal | owns `POL-NIGHT §1`, the policy that ends Elena's run two hours *earlier* than her own lab would | activates and lifts the freeze from her phone, 40 minutes before the exam room opens |
| An unnamed generic role | **never** | **never** | **never** | **never** |

The continuity is deliberate and it is the module's strongest claim: **Dr. Reed appears in S-3 as the owner of the policy that constrains Elena, and in S-4 as the person who closes the fleet for an exam in `CS-480-VLM`.** A reader who follows all four scenarios learns that the same person who could lift a constraint is the one who imposes one, and that the constraint in S-3 was the *gentler* of the two. The rubric's *named academic protagonists throughout* is satisfied by construction rather than by disclaimer, and `prd.md` FR-15's lint makes it checkable: the deny-list includes a regex for `A/An <role>` with no proper name, and the string `the user` fails the build.

---

## 5. Wireframes

| Wireframe | File | Shows |
|---|---|---|
| WF-1 | [`../wireframes/wireframe-01-evaluator-deny.md`](../wireframes/wireframe-01-evaluator-deny.md) | UX-1 Evaluator at the moment of a `DENY` (S-1 / S-2 layout, Zone D expanded) |
| WF-2 | [`../wireframes/wireframe-02-constrain-deadline.md`](../wireframes/wireframe-02-constrain-deadline.md) | UX-1 Evaluator with a `CONSTRAIN` + live `HARD_DEADLINE` countdown and the **bound table** (S-3 E-2) |
| WF-3 | [`../wireframes/wireframe-03-freeze-console.md`](../wireframes/wireframe-03-freeze-console.md) | UX-4 Freeze Console at 390 px with the **consequence preview** (S-4) |

WF-1 and WF-2 satisfy the *at least two key-screen wireframes* requirement. WF-3 is included because the freeze console is the highest-consequence irreversible surface in the module, and a wireframe is the cheapest place to prove its guard is **visible** rather than merely specified.

**WF-2 was corrected in revision 3, and the correction is the point of including it here.** Its previous version drew a binding `08:55` with the overnight `06:00` struck through as *earlier, not binding* — false, because `06:00 < 09:00`. The wireframe now draws a **bound table** whose first row is the governing minimum, with the superseded rows listed and labelled. This is the visual form of `prd.md` §6.1 step 3: the deadline is a property of the boundary *set*, computed before any rule runs, and a card that can show its own minimisation cannot present a number it cannot defend.

---

## 6. Scenario-level acceptance checks

| # | Check | Passes when | Where it runs |
|---|---|---|---|
| SA-1 | No scenario reaches a decision without its rationale visible in the same viewport. | Manual, 1440 × 900, no scrolling. | recorded in `planning/readiness-gate-report.md` |
| SA-2 | Every `DENY` in S-1…S-4 offers at least one next action that returns a non-`DENY` outcome when re-evaluated, **and shows the outcome and deadline that action produces**. | Executed in the prototype; S-1's three actions are verified arithmetically in that file's §3.5 table. | prototype; results pasted into the readiness gate |
| SA-3 | Every `CONSTRAIN` names its **enforcing component** *and* the **owner** of the policy that produced it. | Manual read of the four constraint cards. `R-BOUND-01` cards name `night-scheduler` and Dr. Rebecca Reed. | manual |
| SA-4 | S-3's `must_checkpoint_by` is the earliest boundary minus `PROTECTION_GRACE`, in campus-local time, at three boundary offsets (±1 ms) — **and equals `valid_until`**. | Automated. Note this is *not* "5 minutes before the protected window start" as revision 2 asserted: at 02:00 the governing boundary is the overnight window, not the class. Finding `UX-S3-04`. | `test/scenario/sa-3.test.ts` + `props/single-deadline.test.ts` |
| SA-5 | S-4 cannot be completed without a computed **consequence preview** having been rendered for the current draft hash. | Attempt activation with the preview call stubbed to fail; activation is blocked and the banner names the port, the tolerance, and the effect on the count. | `test/scenario/sa-5.test.ts` |
| SA-6 | Every screen in S-1…S-4 remains operable by keyboard only, **including the disabled ACTIVATE button**, which must stay focusable and announce its unmet precondition. | Manual keyboard traversal with the pointer disconnected. | recorded in the readiness gate |
| SA-7 | No screen in S-1…S-4 uses the words `error`, `failed`, `403`, or `CANNOT EVALUATE` to describe a `DENY`. | Grep of the rendered-copy table in each scenario file. | `test/arch/fr16-copy.test.ts` |
| **SA-8** | **The `DENY`/`E-SYSTEM` distinction survives a greyscale screenshot**, and the two offer **opposite** actions. | Desaturate S-4's dependency-failure screen: the banner is still identifiable by position, `SYSTEM` eyebrow, and glyph. | manual + `test/arch/a11y-greyscale.test.ts` |
| **SA-9** | **No field appears in a fact, an acceptance criterion, and a review finding as "read" unless a rule predicate or a named non-decision surface reads it.** | `test/arch/ad2-fact-coverage.test.ts` over the shipped fact types. `required_node_count` has exactly one named consumer: the freeze preview's `next_protected_window` tile. | CI (`prd.md` AG-10) |
| **SA-10** | **Every rule in the catalogue appears in at least one scenario's evaluation trace**, so no rule is documented only in a table. | 19 rules × 2 tests = 38 ids, listed in `planning/readiness-gate-report.md`. | CI (`prd.md` AG-8) |

---

## 7. What this index deliberately does not claim

Three omissions, each with a reason, because a coverage matrix that claims coverage it does not have is the same defect as a rule catalogue with an unread field.

1. **No scenario covers `R-SYS-01`** (the Night Training Daemon's permitted workload set). It is reachable, tested, and documented in the catalogue, and it belongs to no annex scenario: the four mandatory scenarios are all about human actors. It is in SA-10's 38-test list, and the honest statement is that it is covered by a test rather than by a screen.
2. **No scenario covers the journal's own query surface**, because `prd.md` NG-10 gives the journal and its query to the Audit Ledger. S-4 shows the journal because the freeze's *effect* must be provable, not because M2 owns querying it.
3. **No wireframe for UX-5 or UX-6.** They render the same `Decision` payload as UX-1 and a wireframe would add nothing that `EXPERIENCE.md` §5 does not already state. Parity is a test (`sa-console-parity.test.ts`).
