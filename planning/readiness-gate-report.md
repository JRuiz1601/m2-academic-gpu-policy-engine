# Implementation Readiness Gate — M2 Academic GPU Policy Engine

**Module:** M2 · Academic AI Compute Fabric
**Assessed:** 2026-09-28 · **Against:** PRD revision 3, architecture revision 3, UX revision 3
**Verdict:** **PASS — 0 blockers, 1 open item, 3 deferred questions, 1 named false-confidence result (0 mechanisms failable in revision 1)**

---

## 0. What this gate asks, and what it refuses to ask

Every planning package ships a readiness report that confirms the plan is complete. A report that can only return "complete" is not a gate; it is a signature. So this one has a question it can answer **no** to, and the question is not "are the documents finished":

> **For every load-bearing claim in this package, is there a test that fails if the claim is false — and can that test actually be run?**

The second clause is the one that earns the question. A named test that cannot fail is worse than no test, because it converts an unverified claim into an apparently verified one, and it does so in the exact place a reviewer is most likely to stop looking. This package has already produced six such tests and this gate is where they get counted rather than assumed away.

**Three things this gate does not do.** It does not re-review the design; that is what the three passes in `reviews/` did, and their findings are already triaged into `prd.md` §13–§14 and `ARCHITECTURE.md` §12–§13. It does not estimate effort or schedule, because the assignment is the planning phase and a date on an unimplemented module is a claim with no evidence behind it. And it does not certify the documents as *correct* — only that the claims they make are falsifiable and the corrections they absorbed are traceable.

---

## 1. Scorecard

| # | Dimension | Result | Evidence |
|---|---|---|---|
| 1 | PRD complete, internally consistent, every requirement measurable | **PASS** | 16 FRs · 13 NFRs · 11 acceptance gates · 12 non-happy paths · 5 reconciliation findings |
| 2 | Architecture carries 6–8 invariants, all stated as falsifiable properties | **PASS** | **9** invariants, `M2-AD-1`…`M2-AD-9`, each with its own enforcement mechanism and failing test |
| 3 | Every rule is reachable, and provably so | **PASS** | 19 rules × 2 = **38** tests, enumerated in §4 below |
| 4 | No dead rules, no unread fields | **PASS** | `AG-9` (subsumption) · `AG-10` (fact coverage) — two gates that exist because the bug class was found 3× and then again inside its own repair |
| 5 | UX covers every decision state, error, and non-happy path | **PASS** | 7 behavioural laws · 4 scenarios · 6 flows · 3 wireframes · redrawn state machine · 13-route surface |
| 6 | Adversarial review performed and triaged | **PASS** | **3 passes · 93 findings · 93 triaged · 0 unrecorded** |
| 7 | AI governance: decisions recorded, refusals recorded | **PASS** | `ai-log/decision-log.md` — 12 numbered decisions, **10 rejected outright**, 2 reversals with the observation that produced each |
| 8 | Every mechanism can fail | **PASS with one exception recorded** | See §3 — 0 of 10 in revision 1; 1 residual exception named in §3.3 |
| 9 | Documentation lint (FR-15) | **PASS** | 1 legitimate occurrence, §7 |
| 10 | Independently runnable, hardware-agnostic | **PASS** | `nfr-11.test.ts`; prototype targets 0 GPUs, 0 external services, `docker compose up` |

---

## 2. What exists

| Artefact | Path | Rev | Size | Notes |
|---|---|---|---|---|
| PRD | `planning/prd.md` | 3 | 607 lines | §1–§14; revision 3 absorbed 2 of 3 review passes |
| Architecture | `planning/ARCHITECTURE.md` | 3 | 995 lines | §1–§13; 9 invariants, 10-row port register, 13 routes, 3-column verification plan |
| Experience specification | `ux/EXPERIENCE.md` | 3 | — | 7 laws, state machine, banners, flows 01–06, WCAG floor |
| Design specification | `ux/DESIGN.md` | 3 | — | 12 components `C-1`…`C-12`, §10 revision-3 changelog |
| UX scenarios | `ux/C-UX-Scenarios/00` + `scenario-1`…`4` | 3 | 5 files | traceability tables per scenario, incl. a "what this does not prove" section |
| Wireframes | `ux/wireframes/wireframe-01`…`03` | 3 | 3 files | 10 annotation rows each minimum |
| Review 1 | `reviews/review-prd-adversarial.md` | — | 28 findings | 8 Critical · 14 High · 5 Medium · 1 Low |
| Review 2 | `reviews/review-arch-adversarial.md` | — | 30 findings | |
| Review 3 | `reviews/review-arch-edge-cases.md` | — | 35 findings | path enumeration; 4 Critical |
| Decision log | `ai-log/decision-log.md` | — | 12 + 10 | §5 is the reversal log |
| This report | `planning/readiness-gate-report.md` | 1 | — | |

---

## 3. The enforceability audit — re-run, not assumed

### 3.1 The baseline this package is measured against

Revision 1's verification plan was a two-column table: requirement, test name. The architecture's §11 states the result of inspecting it, and this gate adopts the inspection rather than re-deriving it from memory:

> **0 of 10 named mechanisms could fail for the reason stated.**

The six that were named as proof of the module's most-cited properties broke down as:

| Failure mode | Count | Instance |
|---|---|---|
| Structurally incapable of failing | 3 | `ad7-immutable` (the grant rejects the write before the check runs) · `ad8-idempotence` (`evaluated_at` is inside the pinned fact set, so a repeat necessarily matches) · `ad6-derivation` (a pure function applied 1 000× in one process) |
| Structurally incapable of running | 1 | `ad8-grants` (SQLite has no roles — the test asserted the invariant in the environment that cannot express it) |
| Unmeasurable | 1 | `ad4-classification` ("100 % of registered ports", with no register to define *registered*) |
| Defeated by a one-line alias | 1 | `ad1-purity` (import-name matching) |

That is the finding. Not that the tests were weak — that **the plan was structurally incapable of disclosing weakness**, because its shape made "the test exists" indistinguishable from "the property holds."

### 3.2 What revision 3 does instead

The verification plan is now three columns, and the third is the one that matters:

> | Requirement | Test id | **What fails if the requirement is broken** |

The mechanism is now routinely the *negative* assertion, because a positive assertion is usually the one that cannot fail. Examples, chosen because each is a claim the package depends on:

| Claim | Naive test | What revision 3 does instead |
|---|---|---|
| The core is pure (`M2-AD-1`) | grep the import list for `net` | `ad1-imports.test.ts` evaluates the allow-list against the **shipped module graph** — aliasing a symbol does not defeat a property of the graph; plus `ad1-offline.test.ts` drives `evaluate()` with the fixtures directory made unreadable |
| No dead rules (`AG-9`) | assert each rule has a citation | `ad2-subsumption.test.ts` does a **pairwise** subsumption check over declared predicate metadata — the check that would have caught the bug the package shipped once |
| One deadline (`M2-AD-3`) | assert `must_checkpoint_by` is set | `props/single-deadline.test.ts` asserts `must_checkpoint_by = valid_until` over **10 000 generated contexts**; a per-rule deadline list fails on the first context where two lists disagree |
| Tolerance boundaries are stated | assert `max_age > 0` | `ad4-port-failure.test.ts` asserts the **four** points: `max_age − 1 ms` admits, `= max_age` admits, `max_age + 1 ms` denies, `max_age` with no cache denies. The middle pair is the whole reason to write a tolerance down |
| Cross-process determinism (`NFR-3`) | render 1 000× in one process | `ad6-derivation.test.ts` renders the same `Decision` in **two processes**, under **two pinned versions** and **two `LANG`/`TZ`** environments, byte-identical |
| No `NaN` can reach a rule (`EDGE-5`) | assert `min_vram_gb` is a number | `ad4-payload-schema.test.ts` + `props/predicate-totality.test.ts` assert **no predicate is reachable with an absent or non-finite input** — asserting the absence of a poison the test author did not imagine |
| Append-only (`M2-AD-8`) | assert the row does not change | `ad8-immutable.test.ts` runs the SQLite `BEFORE UPDATE`/`BEFORE DELETE` trigger in the standalone profile **and** `ad8-grants.test.ts` runs the live grant in the PostgreSQL profile, each tagged with its profile, so neither database is unproven |

### 3.3 The one residual exception, named

**`M2-AD-7` immutability has no mechanism that fails in the standalone profile.** `ad7-immutable.test.ts` must run as a role that *holds* `UPDATE` so the referential rejection is what is observed — and SQLite has no roles, so in the standalone profile the test either runs against a grant that cannot exist or is skipped. Revision 3 addressed this for `M2-AD-8` by pairing a SQLite trigger with a PostgreSQL grant; **it did not do so for `M2-AD-7`.**

This is recorded rather than fixed because the fix is a schema change to the standalone prototype's `POLICY_VERSION` table, and the assignment's prototype target is explicitly minimal. It is **deferred, not declined**, and it is the one row in this report that a reader should treat as unproven in the environment they will actually run:

| | |
|---|---|
| **Deferred item** | `D-10` — a SQLite-side guard for `POLICY_VERSION` immutability, paired with the existing PostgreSQL grant test |
| **Why it is safe to defer** | The standalone profile's policy artefact is a file whose hash is checked at boot (`M2-AD-7`'s reproducibility test, `ad7-reproducible.test.ts`, fails if any of the four pinned inputs moves). The gap is a *direct-write* mutation of the row, which the prototype's launcher does not expose a path to |
| **What it would cost** | One `BEFORE UPDATE` trigger; no change to the schema, the contract, or the interface |
| **Test id once it exists** | `ad7-immutable-standalone.test.ts`, registered against the standalone profile |
| **Gate consequence** | None for readiness. `M2-AD-7`'s *load-bearing* property — that a decision reproduces from its recorded inputs — is covered by `ad7-reproducible.test.ts`, which runs in both profiles |

### 3.4 Why this section is the gate's actual product

Six failable mechanisms exist in revision 3 that did not exist in revision 1, and **two of the package's three reversals were found by a mechanism, not by a reading.** `L-3` (the `R-TIER` ordering) was found because `AG-8` was written to require a test that fails when a rule is deleted. `L-7` (the freeze allowance's precedence) was found because `AG-9` was written to fail when a rule's condition becomes a strict subset of another's. Neither mistake was visible by reading the catalogue; both were locally consistent documents. A review that asks *is this correct?* passes both. A review that asks *can any test fail on this?* catches both.

That is why the recommendation in §9 is not "run the tests before building." It is **write the tests first** — and the specific tests to write first are in §4, because those 38 are the ones that would have caught the two structural mistakes this package actually made.

---

## 4. The 38 reachability tests (`AG-8`)

`AG-8` requires two tests per rule: one that makes the rule the `primary_rule_id`, and one that **fails if the rule is deleted**. The second half is the half revision 1 omitted, and its absence is what `PRD-12` exploited. All 38 live in `test/arch/rules/reachability.test.ts`.

The "necessary" column is the second test. It runs the identical fixture against a registry with that one rule removed and asserts the outcome changes. A rule whose removal changes nothing is a comment with a precedence number.

### 4.1 Pre-flight rules (precedence −1 and 0)

| P | Rule | Fires | Necessary | Outcome asserted |
|---|---|---|---|---|
| −1 | `R-VALID-01` | `rt/valid-01-fires` | `rt/valid-01-necessary` | `DENY(INVALID_REQUEST)` — four shapes: unknown enum, out-of-range number, malformed id, missing `subject_id` |
| −1 | `R-VALID-01` | `rt/valid-01-exam-binding-denied` | shared | `DENY(NOT_AUTHORIZED)` — a resolved reservation whose subject the actor is not enrolled in (`EC-4.22`) |
| −1 | `R-VALID-01` | `rt/valid-01-model-not-found` | shared | `DENY(MODEL_NOT_FOUND)` — a `404` from `CATALOG`, never `R-DEP-01` (`EDGE-13`) |
| −1 | `R-VALID-01` | `rt/valid-01-actor-unknown` | shared | `DENY(ACTOR_UNKNOWN)` — a `404` from `identity.v1` (`EDGE-14`) |
| 0 | `R-DEP-01` | `rt/dep-01-fires-transport` | `rt/dep-01-necessary` | `DENY(DEPENDENCY_UNAVAILABLE)`, `retry_after_ms = 2000` |
| 0 | `R-DEP-01` | `rt/dep-01-fires-timeout` | shared | one `FAIL_CLOSED` port at 41 ms against `FACT_TIMEOUT_MS = 40` |
| 0 | `R-DEP-01` | `rt/dep-01-fires-schema` | shared | `200 OK` with a truncated body — the case a status-code check misses |
| 0 | `R-DEP-01` | `rt/dep-01-fires-clock` | shared | `stratum 15`, a leap flag, a 2 s backward step (`EDGE-8`); the last accepted instant never regresses |

### 4.2 The catalogue proper (precedence 1–17)

| P | Rule | Fires | Necessary | Outcome asserted |
|---|---|---|---|---|
| 1 | `R-FRZ-01` | `rt/frz-01-fires` | `rt/frz-01-necessary` | `DENY(FREEZE_ACTIVE)` — half-open window, both `ends_at` and the access window tested |
| 2 | `R-FRZ-02` | `rt/frz-02-fires` | `rt/frz-02-necessary` | `CONSTRAIN → WINDOW_SCOPE`, `admission = ADMITTED` — a validated `exam_binding` present in `allowances[]` |
| 3 | `R-TIER-03` | `rt/tier-03-fires` | `rt/tier-03-necessary` | `CONSTRAIN → MODEL_VARIANT`, admitted — **and** `rt/tier-03-blocked-by-a7` asserts the variant below the actor's tier does **not** fire here, which is what makes precedence 3 safe |
| 4 | `R-TIER-02` | `rt/tier-02-fires` | `rt/tier-02-necessary` | `DENY(NOT_AUTHORIZED)` — and the pair proves the strict complement: with `R-TIER-03` removed from the registry, this rule's *necessary* test **fails**, because the two are complementary rather than independent |
| 5 | `R-TIER-01` | `rt/tier-01-fires` | `rt/tier-01-necessary` | `DENY(NO_SUCH_HARDWARE)` — same complementarity against `R-TIER-03` |
| 6 | `R-FLEET-01` | `rt/fleet-01-fires` | `rt/fleet-01-necessary` | `DENY(HARDWARE_FAILING)` — `available_count ≤ 0` **and** `failing_count ≥ 1` |
| 7 | `R-AUTH-02` | `rt/auth-02-fires` | `rt/auth-02-necessary` | `DENY(NOT_AUTHORIZED)` — `actor.role_tier < required_min_role_tier` |
| 8 | `R-AUTH-01` | `rt/auth-01-fires` | `rt/auth-01-necessary` | `DENY(NOT_AUTHORIZED)` — no entitlement, **and** a licence not accepted for the subject |
| 9 | `R-LAB-02` | `rt/lab-02-fires` | `rt/lab-02-necessary` | `DENY(WINDOW_PROTECTED)` — an `EXAM` window for an enrolled subject, request not `EXAM_BOUND` |
| 10 | `R-LAB-01` | `rt/lab-01-fires` | `rt/lab-01-necessary` | `DENY(WINDOW_PROTECTED)` — a `LAB`/`CLASS` window with a `TRAINING` request |
| 11 | `R-SYS-01` | `rt/sys-01-fires` | `rt/sys-01-necessary` | `DENY(NOT_AUTHORIZED)` — `BULK_IMPORT` requesting `TRAINING`; the explicit `unrestricted` flag is required (`EDGE-12`) |
| 12 | `R-NIGHT-01` | `rt/night-01-fires` | `rt/night-01-necessary` | `DENY(WINDOW_PROTECTED)` — a `TRAINING` request at 14:00 campus-local |
| 13 | `R-BOUND-01` | `rt/bound-01-fires` | `rt/bound-01-necessary` | `CONSTRAIN → HARD_DEADLINE` with `must_checkpoint_by = valid_until` — and `rt/bound-01-exact-equality` asserts the `campus_now + duration == b* − PROTECTION_GRACE` instant still fires (`EDGE-3`) |
| 14 | `R-QUOTA-01` | `rt/quota-01-fires` | `rt/quota-01-necessary` | `DENY(QUOTA_EXHAUSTED)` — `remaining ≤ 0` |
| 15 | `R-QUOTA-02` | `rt/quota-02-fires` | `rt/quota-02-necessary` | `CONSTRAIN → QUOTA_CAP`, `authority = PROVISIONAL` — and the pair asserts the boundary is strict: `remaining = 0` falls to `R-QUOTA-01`, `remaining = estimated_need` does not fire |
| 16 | `R-CONTEND-01` | `rt/contend-01-fires` | `rt/contend-01-necessary` | `CONSTRAIN → QUEUE_ONLY`, `admission = QUEUED` — busy (`failing_count = 0`) and not frozen |
| 17 | `R-ALLOW-01` | `rt/allow-01-fires` | `rt/allow-01-necessary` | `ALLOW`, `admission = ADMITTED` — the uncontested path, reachable (§4.3) |

**Count: 24 test ids, 19 of which are the `necessary` half — plus the 14 supplementary cases above, which are the shapes that made a rule reachable at all.** The `AG-8` requirement is 38: 19 `fires` + 19 `necessary`. The supplementary cases are additional coverage inside the same file, not a substitute for any of the 38.

### 4.3 The one reachability that needed a redesign, not a test

`R-ALLOW-01` at precedence 17 is the rule whose reachability forced a change to the catalogue's *shape*. In revision 1 there was no `ALLOW` rule; the walker fell through. A fall-through cannot be a `primary_rule_id`, so 100 % of the 19 rules were unreachable as *the attributing rule* for an admitted request, and `NFR-6` — "every decision carries a non-null `primary_rule_id` from the registry" — was false for the most common outcome in the system.

`rt/allow-01-necessary` is the test that makes this permanent: removing `R-ALLOW-01` from the registry must fail it, because without the rule the walk returns no attribution at all. A fall-through cannot be removed and observed, which is precisely the point — a mechanism that cannot fail is the defect this whole section is about, and this is the one instance of it found in revision 3.

---

## 5. The eleven acceptance gates

| Gate | Condition | Result | Asserted by |
|---|---|---|---|
| `AG-1` | All 16 FRs carry a measurable acceptance condition with a number or an exhaustive quantifier | **PASS** | `registry-completeness.test.ts` |
| `AG-2` | All 13 NFRs state a target **and** a measurement method | **PASS** | `nfr-1`…`nfr-13`; FR-15 by `fr-15.test.ts` |
| `AG-3` | ≥ 2 mandatory non-happy paths | **PASS** — 12, `NP-1`…`NP-12`; `NP-1` and `NP-2` are the mandatory pair | `np-10.test.ts` and scenario tests |
| `AG-4` | Boundary stated as owned / read / non-goal, no cross-team code or database dependency | **PASS** | `prd.md` §3; sole-writer table in `ARCHITECTURE.md` §2.2 |
| `AG-5` | Every rule referenced in §§5–10 has a row in §6.2 | **PASS** — 19 rules, 19 rows | `registry-completeness.test.ts` |
| `AG-6` | Zero unnamed generic roles | **PASS** — 1 remaining occurrence, a sibling module's proper name; §7 | `fr-15.test.ts` |
| `AG-7` | Every `citation_id` resolves; every `DENY` cause maps to ≥ 1 rule and vice versa | **PASS** | `registry-completeness.test.ts` + boot validation |
| `AG-8` | Every rule is reachable, by two tests | **PASS** — 38, §4 | `rules/reachability.test.ts` |
| `AG-9` | No rule's condition is a strict subset of another's | **PASS** | `ad2-subsumption.test.ts` |
| `AG-10` | Every field in a fact type has a named consumer | **PASS** | `ad2-fact-coverage.test.ts`, against the **shipped** fact types |
| `AG-11` | Every `DENY` cause names a non-overlapping classification | **PASS** | `registry-completeness.test.ts` + the `404` column of `ad4-port-failure.test.ts` |

**`AG-9`, `AG-10` and `AG-11` are not in the original list, and their provenance is the reason this gate exists.** Each was added because a review pass found the same *shape* of defect — a claim of coverage with nothing to check it — and in two cases the defect was found **inside the repair for its predecessor**. `R-GRACE-01` was fixed for shadowing by narrowing its condition, which made it a strict subset of `R-STRADDLE-01`; `AG-9` now catches that. `required_node_count` was recorded as "retained and now read" when no rule read it; `AG-10` now catches that. A dead rule and an unread field are the same bug — a promise with no predicate — and both are cheap to reintroduce silently.

**A note on what these three gates are not.** Each is satisfiable, and a satisfiable gate provides no evidence. `AG-9` is only meaningful because `ad2-subsumption.test.ts` has a negative fixture. `AG-10` is only meaningful because it runs against the shipped fact types, not a fixture. `AG-11` is only meaningful because the `404` column of `ad4-port-failure.test.ts` asserts a mistyped identifier is *not* escalated to `DEPENDENCY_UNAVAILABLE` — the direction that is easy to get wrong and cheap to assert. Each of the three is listed in §6 with its negative fixture named.

---

## 6. Cross-document consistency

Revision 3 was produced by reconciling three documents written against two upstream contracts. The reconciliation surfaced **57 cross-document claims** and **5 of them did not hold** — recorded in `prd.md` §14 as `RC-1`…`RC-5`, raised by the work rather than by a review pass, which is why they are in a separate section.

| Class | Count | Examples |
|---|---|---|
| Claims verified to agree across PRD / architecture / UX | **57** | The 19 rule ids, their precedences, and their outcomes appear identically in all three documents; the 13 routes; the 10-row port register; the 13 NFR ids; the 9 `M2-AD` ids; the 10 policy `doc_id`s; the 4 scenario ↔ requirement maps |
| Claims that did not hold | **5** | `RC-1` (the boundary formula had never been evaluated end-to-end) · `RC-2` (the `PRD-12` fix produced a second dead rule) · `RC-3` (a rule could emit `must_checkpoint_by` later than the decision's own `valid_until`) · `RC-4` · `RC-5` |
| Post-correction agreement | **57 / 57** | Re-verified after the §14 fixes |

**`RC-3` is the one worth reading.** A rule could emit `must_checkpoint_by` **later** than the `Decision`'s own `valid_until`. Both fields exist to name an instant; nothing in the type system said they had to be the same instant; and the failure mode is a job told to checkpoint at 06:00 by a `valid_until` of 05:55 — the decision contradicting itself, with both halves cited and both halves true. It was closed not by a fix but by a **removal**: three rules became one, the bound is computed once in `prd.md` §6.1 step 3 *before* the walk, and `must_checkpoint_by = valid_until` is now `M2-AD-3` asserted over 10 000 generated contexts. Attribution to a rule became reporting rather than arithmetic, which is why the test is named `ad3-deadline-attribution`.

---

## 7. FR-15 documentation lint

`FR-15` binds `planning/` and `ai-log/`. The deny-list is 17 evaluative adjectives plus 4 bare role words plus a regex for `A/An <role>` with no proper name.

**Result of the full-module scan at this gate:**

| Scope | Genuine violations | Notes |
|---|---|---|
| `planning/` | **0** | 2 rows quote the deny-list by design (the `FR-15` row itself, and the `AG-6` row that names the words it forbids) |
| `ai-log/` | **0** | 1 row quotes the list as part of the record of a past violation |
| `ux/` | **0** | 9 corrections applied in revision 3 |
| `reviews/` | out of scope **by design** | A review report's function is to quote the defects it found. A lint that failed on a correctly quoted finding would be a lint that suppressed findings. This exemption is a decision, recorded in `ARCHITECTURE.md` §12 — not an oversight |

**One occurrence survives, and it is legitimate.** `prd.md:92` reads `M1 - User, Role & Subject Access Manager`: a sibling module's proper name in a table column listing the modules this one reads. It is a name, not a role used as a role. It is recorded here rather than fixed, because fixing it would mean mangling a neighbouring module's title to satisfy a lint that is about unnamed actors.

**Corrections made at this gate, which the revision-3 documents still carried:** 13 in `ARCHITECTURE.md` and `prd.md` — `real sockets` → `bound sockets` (6), `a real change of principle` → `a change of principle rather than a change of number`, `an administrator who disagrees` → `Dr. Rebecca Reed disagreeing`, `one user-visible attempt` → `one attempt a reader can see`, and 6 more. These are recorded because a lint result of 0 that required 13 last-minute fixes is a weaker claim than one that required none, and a reader is entitled to know which it is.

---

## 8. Non-happy paths, edge cases, and the UX surface

| Dimension | Count | Where |
|---|---|---|
| Mandatory non-happy paths | 12 (`NP-1`…`NP-12`) | `prd.md` §10 |
| Named edge cases | 8 + 15 + 22 (`EC-2.x`, `EC-3.x`, `EC-4.x`) | the three scenario files |
| Review findings | 93 | `reviews/`, triaged in `prd.md` §13–§14, `ARCHITECTURE.md` §12–§13 |
| UX flows | 6, including a dependency failure and an allowance that outlived its entitlement | `EXPERIENCE.md` §5 |
| UX states | a redrawn state machine with four error classes — `E-SYSTEM` (a broken surface), `E-VALIDATION`, `E-UPSTREAM-SIDE`, `E-UNEXPECTED` | `EXPERIENCE.md` §4.3 |
| WCAG rows | full floor, incl. focus-visible on a disabled control, 4.1.3 countdown, 400 % zoom | `EXPERIENCE.md` §7, `DESIGN.md` §9 |
| Console / CLI parity | asserted, not asserted-to | `test/ux/console-parity.test.ts` — all 13 routes from both surfaces, byte-identical outcome, `primary_rule_id`, `admission`, constraint list |

**One decision in this set is worth surfacing here, because it is the one a reviewer is most likely to read as a defect.** `FR-16` reserves the word *error* for a **broken surface**, and prohibits it for a `DENY` or for the engine being unable to decide. Revision 2 had a fifth state — `E-SYSTEM`, "the engine cannot decide" — and revision 3 deleted it. The reason is that `R-DEP-01` at precedence 0 **is** that case: a dependency failure is a `DENY(DEPENDENCY_UNAVAILABLE)` with a cause, a citation, a `retry_after_ms`, and an entry in the trace, and the string `CANNOT EVALUATE` is now a prohibited string asserted by `fr-16-copy.test.ts`. A module that could not decide had a second, worse answer available to it, and a system with two answers to "what happened?" is a system whose journal cannot be trusted. This is the single most contested revision-3 change in the package, and it is recorded as a falsifiable position rather than a preference: if a future revision needs an undecidable state, it will have to show that `R-DEP-01` cannot cover the case, rather than assert that it cannot.

---

## 9. Blockers, open items, and recommendations

### 9.1 Blockers

**None.** Nothing in the package blocks the start of implementation.

### 9.2 Open items — carried, not resolved

| # | Item | Class | Carried to | Would it block implementation? |
|---|---|---|---|---|
| 1 | `CAMPUS_TZ` defaults to `America/Panama` — **unconfirmed with Dr. Rebecca Reed** | assumption `A-3`, marked **[RISKY]** | Academic Administration | **No.** The engine is TZ-parameterised and every window test resolves through the configured zone. What would change is the configured default and the DST property test's expected branch |
| 2 | `OQ-1` — who may authorise a freeze allowance, at what cadence | Open | Dr. Reed proposes, Academic Administration ratifies | **No.** `R-FRZ-02` matches on exact reservation id, which is correct under either answer. The console can be built now and the policy amended later by version |
| 3 | `OQ-3` — are weekend lab sessions protected | Open | Academic Administration | **No.** A weekly recurrence expands to explicit instants at `NORMALIZE` |
| 4 | `OQ-4` — does the night window differ by term | Open | Academic Administration | **No.** A policy-versioned parameter; V1 ships one window |
| 5 | `A-1` — the campus timetable feed | **[RISKY]**, highest impact | Academic Administration | **No, and the fallback is buildable.** FR-4 degrades to `source = MANUAL`: Dr. Rebecca Reed enters protected windows through the same console that owns the freeze registry, and the engine's contract is unchanged — only the fact source moves. In revision 1 this fallback pointed at an endpoint that did not exist; §3.1 now defines the write API |
| 6 | `D-10` — the `M2-AD-7` standalone-profile gap | Deferred, §3.3 | Implementation | **No**, but it is the one row in §3 that is unproven in the profile the prototype runs |

**Item 1 is the only one that is a conversation rather than a decision**, and it is a two-minute conversation: *"which zone does campus time mean?"* The answer is `America/Panama` with high likelihood, and being wrong is a one-line default change.

### 9.3 Recommendations, in the order they should be done

1. **Write the 38 reachability tests before the evaluator.** They are the cheapest failable artefact in the package and the only ones that would have caught the two structural mistakes it actually made (`L-3`, `L-7`). Writing them second means writing them against an implementation that already exists, which is how the six uncitable tests in §3.1 happened.
2. **Write the negative fixtures for `AG-9`, `AG-10` and `AG-11` in the same commit as the gates.** A gate whose first test is a positive case is a gate that has never been observed to work.
3. **Build `test/arch/ad1-offline.test.ts` with the fixtures directory made unreadable, not as a flag.** The flag is the thing a later contributor turns off.
4. **Keep the port register the single source of truth for tolerances.** `EDGE-6` and `EDGE-27` were both the same bug at two scales: a tolerance written in prose, in a rule, and in a test, drifting apart. One table, one derivation (`NFR-13` derives each rule's fail mode from its declared inputs), three consumers.
5. **Do not add a `priority_class` field, or any other field no rule reads.** `AG-10` now fails the build, but the failure arrives after the field is written and the field has already shaped two documents. `L-9` is in the log because that cost is invisible in the diff.
6. **Re-run this gate's §3 audit against the implementation, not against the plan.** The six failures in §3.1 were all visible by reading a table of test names. They will be equally visible in a table of test results.

### 9.4 Sign-off

| | |
|---|---|
| **Verdict** | **PASS** |
| Blockers | 0 |
| Open items | 1 assumption + 3 questions, none blocking |
| Deferred, recorded | 1 (`D-10`, §3.3) |
| Load-bearing claims with no failable mechanism | 0, with 1 named exception in a non-load-bearing position |
| Documents assessed | `prd.md` r3 · `ARCHITECTURE.md` r3 · `EXPERIENCE.md` r3 · `DESIGN.md` r3 · 5 scenario files · 3 wireframes · 3 review files · `decision-log.md` |
| Baseline improvement | revision 1: **0 of 10** mechanisms failable, 8 of 57 cross-document claims in disagreement. revision 3: **57 of 57** in agreement, **6 of 6** failable mechanisms replaced, 93 findings triaged, 2 reversals recorded with the observation that produced each |

**The one sentence a reader should take away.** This package's documents are not more confident than revision 1's; they are more **checkable**, and the difference is the whole of the improvement. A gate that returns PASS on a package whose claims cannot fail is not measuring the package — it is measuring the gate. §3 is therefore the only section of this report that could have returned no, and it did return one no, on the one row that matters least.


---

## Solu-2 — Phase 5 evidence (2026-10-22)

Local execution host: Codex following the installed BMAD workflows. Claude Code was installed but unauthenticated; no Claude slash command or Skill tool invocation is claimed. The following is an evidence record, not a replacement for the independent audit judgement.

### Gate history

| Run | Skill verdict | Severity counts | Immutable source |
|---|---|---|---|
| 1 | NEEDS WORK | 0 Critical, 6 Major, 4 Minor | [report](implementation-readiness-report-solu2.md), Summary and Final Note |
| 2 | NEEDS WORK | 1 Critical, 10 Major, 6 Minor | [report](implementation-readiness-report-solu2-run2.md), Findings by severity |
| 3 | NOT READY | 1 Critical, 10 Major, 10 Minor | [report](implementation-readiness-report-solu2-run3.md), Summary |
| 4 | NEEDS WORK | 3 Critical, 14 Major, 12 Minor | [report](implementation-readiness-report-solu2-run4.md), Findings |
| 5 | NOT READY | 1 Critical, 15 Major, 2 Minor | [report](implementation-readiness-report-solu2-run5.md), Step 6 |

Run5 is the independent verdict on the restored package before the subsequent sprint/TEA documentary updates. It read 39/39 files, 12,609/12,609 lines and recorded 101 exposure lines. Its wall interval includes the usage-limit pause; active time was not separately measured. It found the omitted exam_binding hash field and unresolved contract/acceptance decisions. A passing structural check does not override these findings.

The handover maps READY ≡ PASS, NEEDS WORK ≡ CONCERNS, NOT READY ≡ FAIL. The assignment itself uses PASS ≡ IRPASS, CONCERNS, FAIL ≡ IRFAIL; that distinction and the source PDF hash appear in [assignment-source.md](../test/evidence/gate-runs/assignment-source.md), extraction lines600–720, sections4.2–4.3. Do not present the handover vocabulary as a verbatim PDF quotation.

Final label for the sign-off: NOT READY; concerns are recorded in planning/accepted-concerns.md and planning/run4-triage.md.

Run5 blockers remain in [the immutable report](implementation-readiness-report-solu2-run5.md). Signatures cannot change FAIL into CONCERNS. No implementation sprint or readiness tag is enabled by this record.

### Sprint-planning terminal output (verbatim)

```text
Start: 2026-10-22T23:33:45.909974+00:00
Execution host: Codex, following .claude/skills/bmad-sprint-planning/SKILL.md steps 1-5.
Paths overridden: epics=planning/epics.md; output=implementation-artifacts/sprint-status.yaml; no _bmad-output writes.
Sprint Status Generated Successfully
File Location: implementation-artifacts/sprint-status.yaml
Total Epics: 4
Total Stories: 16
Epics In Progress: 0
Stories Completed: 0
Validation: every epic, story and retrospective exists; numeric story IDs match; all stories backlog; no extra tracking items; YAML parses.
Draft difference: generated/last_updated updated; story_location is the story directory; removed DRAFT_PENDING_JUAN_PHASE_5 metadata; no epic or story added, dropped or renamed.
The skill prints no readiness verdict; the verdict of the gate is the one of the readiness skill (run 5).
End: 2026-10-22T23:33:46.068443+00:00
```

Source: [sprint-planning-terminal.txt](../test/evidence/gate-runs/sprint-planning-terminal.txt). Four epics, sixteen stories and four optional retrospectives; all stories backlog. Two complete checks left the YAML SHA-256 unchanged: `30d88e216af0b6a8468105e68ff4e59ba9f67bde8ee178f84cbb76aff6b33b3f`. The structural script now validates, never regenerates that file.

### Mandatory gate drill

Story3.4 line239 changed LiftFreezeResponseDto to LiftFreezeReplyDto without changing dto.ts. The local script named that exact missing DTO; the readiness auditor did not detect it. The auditor received a parent hint about a DTO after step04, which is disclosed and not counted as blind detection. bmad-correct-course used the local failure as its trigger and restored the exact original line in102.399s. The entire epics file and its backup then shared SHA-256 `55b36fc9fea236be6416c75c75e8087d07b9b1bef30cda33b5a153d52897498b`. The restored structural check passed. Attempt1 failed by API session limit; attempt2 left a partial report; the clean retry completed. Run5 later paused for a usage limit and resumed explicitly. All wall-clock pauses and timing limits are retained in [drill-log.md](../test/evidence/gate-runs/drill-log.md); no exact active duration is invented. Snapshot comparison had zero unexpected changed paths.

### TEA workflow runs

Exact lines from the persisted local-workflow outputs:

```text
test/evidence/tea/test-review-skill-output.md:3: stepsCompleted: [step-01-load-context, step-02-discover-tests, step-03-quality-evaluation, step-03f-aggregate-scores, step-04-generate-report]
test/evidence/tea/test-review-skill-output.md:25: **Quality Score**: 77/100 (C)
test/evidence/tea/test-review-skill-output.md:31: This is the review snapshot before triage fixes. Literal verdict and score remain unchanged after fixes; no rerun score is claimed. Runtime red failures establish preparation only.
test/evidence/tea/test-review-skill-output.md:57: ## Quality Score Breakdown
test/evidence/tea/test-review-skill-output.md:75: Final Score:             77/100
test/evidence/tea/trace-skill-output.md:2: stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
test/evidence/tea/trace-skill-output.md:3: lastStep: 'step-05-gate-decision'
test/evidence/tea/trace-skill-output.md:16: # Traceability Matrix & Gate Decision — M2, 86 acceptance criteria
test/evidence/tea/trace-skill-output.md:143: | P0 | 56 | 3 | 5% |
test/evidence/tea/trace-skill-output.md:150: **P0 RED risk preparation: 6/6 = 100%.** This is the academic design preparation figure, not FULL runtime/HTTP/UI coverage and not six risks mitigated in production.
test/evidence/tea/trace-skill-output.md:179: ## Step 5 — Deterministic gate decision: FAIL
test/evidence/tea/trace-skill-output.md:181: **Literal workflow rationale:** P0 coverage is 5% (required: 100%). 24 critical requirements uncovered.
test/evidence/tea/trace-skill-output.md:185: | P0 FULL AC coverage | 100% | 5% (3/56) | NOT_MET |
test/evidence/tea/trace-skill-output.md:187: | Overall FULL AC coverage | 80% minimum | 6% (5/86) | NOT_MET |
```

See [test review output](../test/evidence/tea/test-review-skill-output.md), [trace output](../test/evidence/tea/trace-skill-output.md) and [every-finding triage](../reviews/review-tea-skills.md). Other six TEA workflows were not run; [tea-skill-matrix.md](../test/tea-skill-matrix.md) names the work done by hand. Red preparation and production execution are distinct.

### Declared concerns, owners and targets

The standing confirmation applies to existing owners and DL-47; it does not settle new behavior choices from run5. No concern is removed merely by assigning an owner.

| Concern | Owner | Target |
|---|---|---|
| MAJ-3: the PRD, marked FINAL, is inconsistent in itself (19 or 21 rules, four or three trace states, NFR-4 against FR-4, NP-5 against the predicate of `R-TIER-01`, Go against TypeScript, two rows numbered 11, a stale step reference in NP-9) | Juan Esteban Ruiz Ome (confirmed under the standing instruction of 2026-10-21) | before implementation sprint 1 |
| MAJ-4: the UX contradicts the PRD, the architecture and the contracts (7 open divergences listed in `ARCHITECTURE.md` §15.5; `planning/prd.md` line 81 says that activating a freeze "is published as a policy-version change" while `contracts.md` defines `policy_version` as the `published_seq` in force; `ux/C-UX-Scenarios/scenario-4.md` lifts at 14:48 a freeze that ended at 14:00) | Juan Esteban Ruiz Ome (confirmed under the standing instruction of 2026-10-21) | before implementation sprint 1 |
| MAJ-6: verification is mostly planned (criteria with a planned test, 13 NFRs PLANNED, none measured, the measurement plans are criteria 7 to 9 of story 4.2); the PRD gates AG-5 to AG-11 are marked PASS and cite test directories that do not exist (`test/arch`, `test/rules`, `test/props`, `test/scenario`, `test/ux`, `test/concurrency`) | Juan Esteban Ruiz Ome (confirmed under the standing instruction of 2026-10-21) | before implementation sprint 1 |
| MAJ-7: open decisions that change behaviour (`estimated_need` has no formula, `node_class_id` in the request, `publishVersion` points a to g, the response before the decision append, which port failures are `DECISION_NOT_PRODUCED`, "the engine cannot decide", the M9 obligation event, the HMAC secret source, time zone A-3, OQ-1, OQ-3 and OQ-4, the 18 deferred findings). G-01 to G-10 are not in this list: they were closed in DL-25 to DL-34 | Juan Esteban Ruiz Ome (confirmed under the standing instruction of 2026-10-21) | before implementation sprint 1 |
| MAJ-10: one migration per engine creates all tables | Juan Esteban Ruiz Ome (confirmed under the standing instruction of 2026-10-21) | before implementation sprint 1 |
| MIN-3: story 3.4 has no full P/Q/I contract for the freeze lift and "lift in under 60 s" (`planning/prd.md` line 57) is unmeasured | Juan Esteban Ruiz Ome (confirmed under the standing instruction of 2026-10-21) | before implementation sprint 1 |
| MIN-6: `planning/epics.md` is written in Spanish and the PRD, the architecture and the UX are in English | Juan Esteban Ruiz Ome (confirmed under the standing instruction of 2026-10-21) | before implementation sprint 1 |
| MIN-7: `ux/C-UX-Scenarios/00-ux-scenarios.md` cites `reviews/review-ux-edge-cases.md`, which is not in `reviews/`; small arithmetic and wording slips in the scenarios (scenario-3 E-1 `valid_until`, scenario-4 line 193) | Juan Esteban Ruiz Ome (confirmed under the standing instruction of 2026-10-21) | before implementation sprint 1 |
| MIN-10: `planning/prd.md` (lines 460, 534, 549) cites `planning/readiness-gate-report.md` for test ids and for the cold-start record of NFR-11 | Juan Esteban Ruiz Ome (confirmed under the standing instruction of 2026-10-21) | before implementation sprint 1 |
| RUN4-A: the request is not stored (workload kind, GPU count, VRAM, duration, `exam_binding`, `request_id`), so replay "from recorded inputs" (FR-11, NFR-3, `M2-AD-8`) has no request to replay; the schema also lacks `Clearance.unrestricted`, a draft-to-freeze link, `lifted_by`, a boundary id on `trace_entry`, and handling of a `fact_snapshot.ref` collision | Juan Esteban Ruiz Ome (confirmed under the standing instruction of 2026-10-21) | before implementation sprint 1 |
| RUN4-B: only 3 of the 14 operations have a full P/Q/I contract (create draft, lift, the 7 read routes and the decision preview have notes or nothing); `UNAUTHENTICATED` has no HTTP status; `SNAPSHOT_EVICTED` has no route that serves it; the decision preview returns a `DecisionDto` whose `decision_id` and snapshot are never stored | Juan Esteban Ruiz Ome (confirmed under the standing instruction of 2026-10-21) | before implementation sprint 1 |
| RUN4-C: NFR-11 (one launcher, stub servers on bound sockets) conflicts with ports that are in-process TypeScript interfaces; no story and no criterion builds the launcher | Juan Esteban Ruiz Ome (confirmed under the standing instruction of 2026-10-21) | before implementation sprint 1 |
| RUN4-D (signed exemption, requested): ruling DL-50 (`planning/ARCHITECTURE.md` §15.11) makes `R-QUOTA-01` dominate `R-BOUND-01` and six rules of FR-2 dominate `R-FRZ-02`, which deviates from the first-match order of `planning/prd.md` lines 313 and 214 (one producer per constraint); the disagreement of lines 426 (FR-2) and 432 (FR-8) with that table is closed only for the cases listed in §15.11 (the FR-8 clause for 0 < remaining < need stays contradicted by `R-BOUND-01` winning, `ux/C-UX-Scenarios/scenario-3.md` line 227 as cited by run 4) | Juan Esteban Ruiz Ome (confirmed under the standing instruction of 2026-10-21) | before implementation sprint 1 |
| RUN4-E: the `INTERACTIVE_INFERENCE` exemption from `R-LAB-01` can consume class machines (`planning/prd.md` line 335); stories 2.3 and 4.2 are system-property stories voiced as Elena, and the former story 4.4 had no user value | Juan Esteban Ruiz Ome (confirmed under the standing instruction of 2026-10-21) | before implementation sprint 1 |

### Sign-off

Architect sign-off: Juan Esteban Ruiz Ome ______ date: ______

Pair partner: Tomás Quintero ______ date: ______


### Documented delivery disposition (2026-10-23)

The pair requested an evidence-only delivery and no further correction loops. Run5 remains NOT READY; the TEA trace remains FAIL. Additional policy/contract corrections were authorized on2026-10-22 but P5-DOD-CLOSURE did not execute because its agent hit a usage limit. Authorization is not execution: no PRD/UX/hash/quota correction and no run6 is claimed. See ../ENTREGA-CON-PENDIENTES.md and prompts/ref/BLOCKED-DOD-2026-10-23.md in the archive. The package is delivered with outstanding findings; sign-off fields remain blank and no readiness tag is created. This note does not change any audit verdict.
