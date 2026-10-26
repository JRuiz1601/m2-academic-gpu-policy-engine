# EXPERIENCE.md — Behavioural Spine & State Machine
## Module M2 — Academic GPU Policy Engine

**Artifact:** `ux/EXPERIENCE.md` · **Phase:** 2 · **Status:** FINAL
**Companion:** `DESIGN.md` (tokens, anatomy). This document specifies **behaviour**: what every surface does in Loading, Empty, Error, and Success; how a refusal is explained; what the requester does next.
**Revision:** 3 · aligned to the 19-rule catalogue, the 13-route public API, and the 10-row port register.

---

## 1. Foundation — seven behavioural laws

1. **A decision is never a surprise.** Every outcome is accompanied, in the same viewport, by the rule that produced it, the fact that made it true, and one executable alternative when one exists.
2. **A refusal is a result, not an error.** `DENY` renders in the decision card with its full explanation. The Error state is reserved for the engine being unable to decide at all. Conflating the two is the central UX failure this spine exists to prevent.
3. **The engine never guesses silently.** Where a fact was stale, the decision is still produced, but a `STALE FACTS` chip is pinned to the evidence header naming the port, its age, and its **own admission tolerance** — because "45 s old" is not a defect in itself; "45 s old against a 0 s tolerance" is. A decision made on 4-hour-old model data is a different decision, and the requester must know which one they are reading. **Revision 3:** the chip names the tolerance beside the age, because a single figure of "60 minutes" was what revision 1 imported from the cluster-state rule and applied to a class schedule.
4. **Every decision is reproducible.** Any decision on screen can be copied as a `curl` plus the frozen fact snapshot. Reproducibility is an experience feature, not just an audit feature — it is how a student reproduces a denial that "wasn't there yesterday."
5. **Time is a first-class control, and it is a controlled one.** A console about temporal policy ships a clock override, because the boundary at `10:00:00.000` cannot be demonstrated any other way: Dr. Reed reproducing finding `UX-S3-04` needs to set campus time to `2026-04-09T02:00:00-05:00` and watch the bound table reorder itself. **Revision 3 made this a law with a limit, where revision 2 had it as a wish.** The override exists **only on the preview route** (`POST /policy/decisions/preview?evaluated_at_override=…`), it requires `role_tier ≥ INSTRUCTOR` **and** the `ALLOW_CLOCK_OVERRIDE` deployment flag, and it returns a token that is actor-bound and valid for 60 s. The committing route has no such parameter and a test asserts it *ignores* one if sent — otherwise every `STUDENT` session carries a walk around `R-LAB-01` and `R-NIGHT-01` and can write a forged `evaluated_at` into the journal. (Edge-case finding **EDGE-10**; the route list is in `planning/ARCHITECTURE.md` §5.1.)

**Law 6 (added in revision 3) — a `DENY` and a system fault must never share a shape.** They are visually and semantically distinct at every level, and the test is greyscale: `DENY` is a card with a rule chip, a cause chip, and a `curl`; a system fault is a banner with a port name, a cause, and a retry. A requester who must ask "was that refused, or did the module break?" has been handed a system that cannot be trusted on the one axis it exists to be trusted on.

**Law 7 (added in revision 3) — no field is displayed that has no declared consumer.** The reverse of `prd.md` AG-10, applied to the UI. A port grid with 10 cells is a claim that 10 ports were consulted; showing an unused `queue` cell is honest, but showing a countdown driven by a constant no rule reads is a claim the module does not keep. `NEAR_BOUNDARY_DISPLAY_HORIZON = 8 h` exists **only** to colour a countdown, and a test asserts the same request at the same instant returns the same `Decision` with that horizon set to 1 h or 72 h.

---

## 2. Surfaces (information architecture)

| # | Surface | Primary reader | Entry | Purpose |
|---|---|---|---|---|
| UX-1 | **Evaluator** (Zones A–E, composer + decision + trace + terminal) | Elena Vargas | default route | Submit a GPU request, receive a `Decision`, understand it, act on it |
| UX-2 | **Rule Catalogue** | Dr. Rebecca Reed, Elena Vargas (by citation link) | Zone E tab | Read the **19** rules, their precedence, conditions, citations, and pending version diffs |
| UX-3 | **Journal** | Dr. Rebecca Reed, course auditors | Zone E tab | Query past decisions; open any row read-only with its frozen snapshot |
| UX-4 | **Freeze Console** | Dr. Rebecca Reed | dedicated route (mobile-capable, 390 px) | Draft, preview, activate, lift an emergency compute freeze |
| UX-5 | **API Explorer** (OpenAPI) | module maintainers, `grpc-gateway` consumers | `/api/docs` | Exercise the real 13-route contract; a first-class surface, not a debug appendix |
| UX-6 | **CLI** | module maintainers, lab technicians | terminal | `aegis eval --request r.json`, `aegis rules`, `aegis journal --since`, `aegis freeze --preview` |

UX-1..4 are one application. UX-5 and UX-6 are separate clients of the same public API and are specified by the same state table — a divergence between the three clients is a defect, not a platform difference.

**The surfaces are drawn from the routes, and a surface with no route is a design fiction.** UX-1's next-action buttons call `POST /policy/decisions/preview`; UX-2 calls `GET /policy/rules`, `GET /policy/rules?version=`, and `POST /policy/versions/publish`; UX-3 calls `GET /policy/journal`; UX-4 calls all six freeze routes including `GET /policy/freezes/{id}`, which exists so a journal row's `freeze_id` is resolvable to the scope, window, allowances, reason, and lift that produced it (edge-case finding **EDGE-32**).

---

## 3. The Evaluation State Machine

```
                    ┌──────────┐
      composer  ───▶│ COMPOSED │  request is syntactically valid, not yet sent
                    └────┬─────┘
                         │ submit
                         ▼
                    ┌──────────┐
                    │ READ     │  campus.clock read FIRST, alone.
                    │ CLOCK    │  This instant is `evaluated_at`; the
                    │          │  fan-out below may not shift it.
                    └────┬─────┘
                         ▼
                    ┌──────────┐
                    │FETCHING  │  9 remaining ports in parallel;
                    │          │  FACT_TIMEOUT_MS = 40 ABORTS, does not wait
                    └────┬─────┘
             ┌───────────┼────────────┬─────────────┐
             │ all ok    │ some stale │ some failed │
             ▼           ▼            ▼             ▼
        ┌─────────┐ ┌──────────┐ ┌─────────┐   any port past its own
        │ BOUND   │ │  BOUND   │ │ BOUND   │   ADMISSION tolerance, any
        │ (§6.1   │ │ + STALE  │ │         │   `ok(malformed)`, any
        │ step 3) │ │          │ │         │   notFound, any bad clock
        └────┬────┘ └────┬─────┘ └────┬────┘   quality
             │           │            │
             ▼           ▼            ▼
        ┌──────────────────────┐
        │  WALK  (§6.2)        │  19 rules, strict precedence, stop at
        │                      │  the first terminal outcome (`M2-AD-1`)
        └──────┬───────┬───────┘
               │       │
               ▼       ▼
        ┌──────────────────────┐
        │  RENDERED            │  outcome ∈ {ALLOW, CONSTRAIN, DENY} —
        │  (exactly one)       │  no fourth outcome exists
        │                      │  + rationale + constraints + next actions
        │                      │  + suppressed[] + the bound table
        └──────┬───────┬───────┘
               │       │
       outcome=DENY  outcome=ALLOW/CONSTRAIN
               │       │
               ▼       ▼
        ┌───────────┐ ┌──────────────┐
        │ ARCHIVED  │ │ WATCHING     │  if valid_until or must_checkpoint_by
        │ (terminal)│ │ (live tick)  │  is set: countdown runs, then
        └───────────┘──────┬───────┘  re-evaluate at deadline
                             │ deadline reached
                             ▼
                      back to READ CLOCK  (re-evaluation, same request)
```

**Law 1 — exactly one outcome, always.** A request can never end in a state with no outcome, and the journal and the console never show a "pending" row for a completed request. This is FR-1's UX expression.

**Law 2, added in revision 3, and it deletes a state that did not exist in the domain.** The previous diagram had a `FAULT` box and asserted *exactly one of `RENDERED` or `FAULT` is reachable from `EVALUATE`* — which is false, because there is no `FAULT` outcome anywhere in the module. `R-DEP-01` at precedence **0** is a **rule**, so a dependency failure is decided *inside* the walk and rendered as an ordinary `DENY` card carrying a `primary_rule_id`, a closed-set cause, and `retry_after_ms = 2000`. `test/arch/ad4-dedup.test.ts` fires a port failure and asserts exactly **one** decision — not a branch result plus a walk result. A visible *cannot evaluate* state would be that second path made visible, and it is precisely the state that would let a reader believe the module is *uncertain* when in fact it is *refusing*: two different things with two opposite remedies, and the whole of law 2 rests on not conflating them. `C-UX-Scenarios/scenario-4.md` §5 renders the corrected card.

**Law 3 — the ordering inside `READ CLOCK`.** The clock is read before the fan-out and the fan-out's duration may not move `evaluated_at`. If it could, a request arriving at `08:59:59.900` against a 140 ms slowest port would be evaluated at `09:00:00.040` and denied by a rule it should have been admitted under: the same request with a different answer, decided by which part of the shell happened to be slowest. `NFR-4`'s property test injects `campus_now` directly and is structurally unable to see this, which is why the requirement is stated *and* tested in the shell rather than assumed. (Edge-case finding **EDGE-21**.)

**The `BOUND` box precedes the `WALK` box on purpose.** The bound is computed from the boundary set alone and written whether or not any rule fires, so `must_checkpoint_by` cannot be an artefact of which rule won. Revision 2 computed it inside `R-BOUND-01`'s aftermath, which left the exact-equality instant with no deadline at all — a clean, fully attributed `ALLOW` in the journal for a job that would run into the window the module exists to protect. (**EDGE-3**.)

---

## 4. Screen state matrix — every surface, all four states

The rubric requires Loading, Empty, Error, and Success to be specified for every core surface. They are specified once here, generically, and then instantiated per surface in §5.

### 4.1 Loading

| Aspect | Commitment |
|---|---|
| Trigger | Any request to Zones B–D, Zone E tables, or the freeze preview. |
| Appearance | **Skeleton matching final geometry** (a decision card skeleton has the rationale and constraint blocks at their real line-heights). No spinner alone. No layout shift when content arrives (CLS = 0). |
| Latency budget | 120 ms floor before the skeleton paints — below that, show nothing (avoids flash). |
| Partial-load rule | Zones are **independent**. Zone D may still be streaming its evidence tree while Zone C is already readable. A slow trace must never block a decision. |
| Fact-port visibility | While `FETCHING`, the ContextBar shows a **10-cell** port grid — `clock`, `identity`, `access`, `timetable`, `reservations`, `class table`, `availability`, `quota`, `catalog`, `queue` — and each cell fills as its port returns. A cell goes amber with an **age against its own tolerance** (`9 s / 60 s`), hollow if the port is display-only and unused, and `--status-fault` if the value is past its admission tolerance and the decision is being denied for it. Two properties are load-bearing: the grid is rendered **before** the fan-out resolves so the wait is legible, and a cell that the engine does not need is still shown, because an invisible port and a fast one are indistinguishable from outside. (`prd.md` FR-10; **EDGE-6**.) |
| Progress semantics | No percentage. There is no knowable total; a fake progress bar is a lie. Port cells and elapsed-ms in mono are the honest signal. |
| > 3 s | The skeleton gains a `slow` treatment (amber 1 px border) and the elapsed timer keeps running. Nothing is cancelled. |
| Accessibility | `aria-busy="true"` on the region; `aria-live="polite"` announcement `Evaluating request against 9 institutional facts and 19 policy rules` on entry only — **not** a number that changes, because an announcement whose wording varies with a count is an announcement that cannot be tested. |

### 4.2 Empty

Three *different* empties, distinguished by copy, because "no data" and "nothing permitted" and "nothing matches" are three different situations and collapsing them into one empty state is how a person ends up re-typing something that already exists:

| Empty kind | When | Copy (exact) | Available action |
|---|---|---|---|
| **E-COLD** | No request composed yet | "Compose a request. The engine reads nine institutional facts, applies 19 policy rules in precedence order, and returns exactly one of ALLOW, CONSTRAIN, or DENY — with the rule that produced it and the fact that made it true." + a preloaded example per scenario | `Load S-1 example` … `Load S-4 example` |
| **E-FILTERED** | Query returned nothing | "0 decisions match `outcome=DENY ∧ subject=CS-340-CV ∧ since=2026-04-08`." + the filter chips, each individually removable | `Clear filter` · `Widen to 7 days` |
| **E-PERMISSION** | Actor has no standing to see this surface | "Your role `STUDENT` can view your own decisions only. Requesting the `CS-480-VLM` journal requires `INSTRUCTOR`." + who to ask | `Request elevation` (a pre-filled message to Dr. Reed) |
| **E-NOT-YET** | Freeze console, nothing active | "No freeze is active. The fleet is governed by the standing rule set, version 41." + the next scheduled protected window | `Draft a freeze` |

**Law:** no empty state is a bare icon, and no empty state says "no data." It always states *which query*, *which filter*, or *which permission* produced the absence.

### 4.3 Error

| Kind | Presentation | Required content | Recovery |
|---|---|---|---|
| **E-SYSTEM** (a *surface* is unavailable — the journal store, the trace fetch, the preview endpoint) | Full-width `role="alert"` banner pinned above all content, `SYSTEM` eyebrow, violet `#8B5CF6` (never the refusal red) | Fault cause, failing **port or endpoint**, `retry_after_ms` in mono, correlation id, policy version, and **the effect on what the reader is looking at** | `Retry now` + auto-retry with a visible countdown. Auto-retry stops after 3 attempts and the banner persists with a `Copy diagnostics` action. |
| **E-VALIDATION** (bad request shape) | Inline, per-field, red 1 px border + `⚠` glyph + message | The accepted range and the nearest legal value ("`requested_vram_gb_per_gpu` must be 24 or 48; got 32") | Field-level; submit stays enabled once fixed. Never a modal. |
| **E-UPSTREAM-SIDE** (journal/trace fetch failed while a decision is rendered) | Inline strip under the affected region; the decision itself stays fully usable | What failed, and that the decision is unaffected | `Retry` for that region only |
| **E-UNEXPECTED** | Same banner as E-SYSTEM with a correlation id | Correlation id only — no stack trace in the UI (it goes in the diagnostics copy) | `Copy diagnostics` |

**There is no *engine-cannot-decide* error state, and its absence is the point.** Revision 2 had one, labelled `E-SYSTEM (engine cannot decide)`, and it was unimplementable: `R-DEP-01` is a rule at precedence **0**, so a failed dependency is a `DENY` with a `primary_rule_id`, a cause of `DEPENDENCY_UNAVAILABLE`, and `retry_after_ms` — rendered as a decision card by §4.4, with a **Retry** action, and rendered *nowhere else*. A second error state meaning *the engine was unable to decide* would mean a second decision path, and `M2-AD-1` exists to guarantee there is exactly one. The distinction this table actually draws is **a broken surface versus a broken engine**, and the second of those is not a state — it is a bug. (`C-UX-Scenarios/scenario-4.md` §5 shows the card that replaced it.)

**Law (severity separation):** an `E-SYSTEM` banner is visually distinct from a `DENY` card by position, glyph, hue, and the word `SYSTEM`, and the distinction survives a greyscale screenshot. A reader must never have to disambiguate "refused" from "broken" by colour — and the two demand opposite responses, which is why the error state offers **Retry** and a `DENY` never does. A retry button on a `DENY` card is the clearest possible statement that the module believes the request is at fault.

### 4.4 Success

| Aspect | Commitment |
|---|---|
| `ALLOW` | Green top rule + `● ALLOW`. Rationale, validity strip (`valid until <mono time>`), and 1–3 next actions. If a freeze is active and the request was admitted under an allowance, the allowance id is named in the card. |
| `CONSTRAIN` | Amber top rule + `◐ CONSTRAIN`. The constraint list is the card's main body, not a footnote. Every constraint shows kind, the machine value, the **boundary that produced it**, and the component that **enforces** it. A `HARD_DEADLINE` constraint shows a live countdown and the single line `must_checkpoint_by = valid_until = <instant>` — the equality is printed because it is an invariant (`M2-AD-3`), and an invariant the reader can check is an invariant they will tell you about when it breaks. Non-governing boundaries are **listed and labelled** `superseded` rather than deleted. |
| `DENY` | Red top rule + `○ DENY`. Rationale names one cause in the first sentence, and the **cause chip and rule chip are separate** — "refused" and "by this rule" are different facts and a card carrying only one of them is making a claim it cannot support. Next actions are the alternatives that *would* be admitted, each with the outcome and deadline it produces; if none exist, the card says so explicitly: "No narrower request is available to you for this model." Silence is not an acceptable substitute. A `DENY` **never** offers Retry: retrying an unchanged request against an unchanged rule set returns the same `DENY`, and an action that cannot work is a lie about the module's own determinism. |
| Journal write | Every decision appends a row with a `•` placeholder that resolves to the journal id within 30 s (NFR-8). The placeholder is `queued`, not a fake id. |
| Confirmation | Success is communicated by the rendered card, not by a toast. Toasts are reserved for background actions (freeze activated, retry succeeded). |

---

## 5. Per-surface instantiation

### UX-1 Evaluator

| State | Instantiation |
|---|---|
| Loading | Port grid in ContextBar; skeleton decision card (rationale 3 lines, constraints 2 rows); skeleton trace tree 8 rows. Trace skeleton outlives the card by design. |
| Empty | E-COLD with the four scenario example loaders, each labelled by scenario and protagonist. |
| Error | E-VALIDATION inline per field; E-SYSTEM banner; E-UPSTREAM-SIDE only under Zone D if the trace endpoint fails after a decision rendered. |
| Success | §4.4. Decision card is the hero; Zone D expands by default on `DENY` (the moment the trace matters most) and stays collapsed on `ALLOW`. |

### UX-2 Rule Catalogue

| State | Instantiation |
|---|---|
| Loading | 19 skeleton rows, precedence badges already visible (layout does not reflow). The two *pre-flight* rows (`R-VALID-01` at `−1`, `R-DEP-01` at `0`) are skeletoned above a **hairline divider**, because they are not peers of the catalogue — they decide whether the catalogue can be consulted, and rendering them in the same visual class invites the reading that all 19 are independent checks. |
| Empty | Not reachable in V1 — the catalogue is code-defined. The empty state exists in the component and renders `Rule set unavailable` with a retry, for the case where the console is pointed at a policy version that failed to load. |
| Error | E-SYSTEM banner: `Policy version 42 failed to load; showing frozen version 41. Decisions evaluated now use version 41.` — the banner states the *consequence*, not just the fault. |
| Success | Table of **19** rules in precedence order: precedence badge (including the two negative values `−1` and `0`, which sort above the numbered catalogue and are labelled *pre-flight*), rule id, outcome chip, condition (mono), citation chips, and a **reachability** dot per row — filled where both tests in `test/rules/reachability.test.ts` pass, hollow where a deletion test is missing. A footer strip shows `Version 41 · published 2026-04-07 18:12 · next change pending: 0`, a `Compare versions` action, and an explicit **"every citation resolves"** stamp, because a catalogue that renders an unresolved citation as a plain chip is a catalogue that looks complete while being unauditable (`prd.md` AG-5, AG-7). The `Compare versions` action calls `GET /policy/rules?version=`, which is why revision 3 kept the version route: a freeze published as v42 must be readable as the v41 that preceded it, or the diff is a claim with no evidence. |

### UX-3 Journal

| State | Instantiation |
|---|---|
| Loading | 20 skeleton rows; the filter chip row renders immediately, because it is the reader's own input and not fetched data — a filter that appears *after* the results it filters is a filter that arrives too late to be used. |
| Empty | E-FILTERED (with removable chips) or E-PERMISSION (Elena opening the `CS-480-VLM` journal). |
| Error | E-SYSTEM if the journal store is unreachable; E-UPSTREAM-SIDE if only the snapshot fetch fails (the row still opens, without the snapshot, with a `snapshot unavailable` chip). |
| Success | Virtualised table (10 000-row target, 32 px rows). Row click → read-only DecisionCard + frozen fact snapshot + `Copy as curl`. Export to CSV respects the current filter. |

### UX-4 Freeze Console (mobile-capable)

| State | Instantiation |
|---|---|
| Loading | **Consequence preview** skeleton: 5 mono stat tiles (`requests denied`, `of which RUNNING`, `reservations surviving`, `GPU-hours reclaimed`, `next protected window`) plus a `valid for 60 s` line and a **disabled** ACTIVATE button. The preview is never shown before it is computed, and the button is disabled for the whole loading window — a slow preview is a good preview, and a person pressing ACTIVATE into a 900 ms skeleton is the accident this console exists to prevent. The token's lifetime is on the card, not in a toast, because the failure it prevents is a person pressing at 61 s and being refused with no explanation of why the button was there a moment ago. |
| Empty | E-NOT-YET. |
| Error | **E-VALIDATION**, four cases, each with a named remedy: (a) `ends_at` must be after `starts_at`, with the nearest legal value offered inline; (b) scope must name ≥ 1 subject or node class, with a one-tap *select all current subjects*; (c) `ends_at` already past ⇒ `400 WINDOW_IN_PAST`, with the current campus time shown beside the picker so the mistake is *visible* and not merely rejected — the picker alone is a client-side courtesy and a stale phone can submit a window that closed while it was open (**EDGE-30**); (d) `starts_at` earlier than `campus_now` ⇒ `400 WINDOW_STARTED`, which is a *different* refusal from (c) and needs a different remedy, because a freeze that has already begun is a legal and occasionally necessary thing (an examination that started early) while one that has already ended is not. Both are single-sentence errors and the copy must not merge them. |
| Error (preview) | **E-SYSTEM** if the consequence preview cannot be computed — **activation is hard-blocked**, because a freeze activated without knowing what it would deny is the one irreversible action in this module. The banner names the port, the cause, the **tolerance exceeded**, and the effect on the number: *"a 61-second-old timetable may miss a class that started 9 minutes ago, so 37 is not a lower bound."* A fault without an effect is a fact, and a fact does not justify blocking a person from pressing a button. |
| Error (degraded) | The **degraded preview** path is a third state, not a variant of the two above, and it is the only one in this module where the console offers the unsafe action. `reservations` down ⇒ a stamped **lower bound** (≥ 37) rather than a blank, plus `ACTIVATE WITHOUT VERIFIED RESERVATIONS`, offered only to `role_tier ≥ INSTRUCTOR` (re-read server-side), requiring a **second** reason field, and recording `degraded_preview: true` on the `FreezeState`. The active banner then reads `FREEZE ACTIVE · degraded preview · 3 reservations unverified at activation` **permanently** — the person who has to explain it at 09:00 is not the person who pressed the button. (`wireframes/wireframe-03-freeze-console.md`; EC-4.19.) |
| Success | Active-freeze banner across the ContextBar (1 px `--status-fault` top border) with scope, window, **the three surviving reservation ids as machine ranges**, the activating person (`u-rebecca-reed`, never a display name — `prd.md` FR-15's doc-lint forbids the reverse), the role tier **held at activation**, the reason, and a live countdown to `ends_at`. The banner is rendered from the same `FREEZE` table the rules read, so it is unaffected by a port outage — which matters, because during an emergency the freeze state is the one thing that must always be legible. |
| Success (lift) | `Lift freeze` requires a non-empty `lift_reason` (modal, keyboard-operable, focus-trapped, focus restored to its trigger on close) and shows the affected-request count **at that instant** before confirming. The count is recomputed, never cached from the preview: a freeze lifted 20 minutes after activation affects a different number of requests, and showing the activation-time figure would be a stale number presented as a current one. |
| Success (expired) | When `campus_now ≥ ends_at`, the freeze's computed state becomes `EXPIRED` — **derived from the clock, never from a job** — and the banner becomes a read-only record: `FREEZE EXPIRED 2026-04-09 14:00:00 · lifted? no · FRZ-…`. It links to `GET /policy/freezes/{id}` so the scope, allowances, activating reason, and any `degraded_preview` flag are all resolvable from the journal row's `freeze_id` (**EDGE-32**). `EXPIRED` is a fourth freeze state alongside `DRAFT`/`ACTIVE`/`LIFTED`, and the console never renders `LIFTED` for one that merely ran out. |
| Success (superseded) | A freeze that was lifted and replaced by a new one shows `superseded by FRZ-…` with a link to the successor. Two `freeze_id`s exist and the journal shows both (EC-4.10) — a corrected mistake must leave both records, because the record of the correction is the part an auditor needs. |

### UX-5 API Explorer / UX-6 CLI

| State | Instantiation |
|---|---|
| Loading | Swagger: standard. CLI: progress lines to stderr, nothing on stdout. |
| Empty | CLI: `aegis journal` with no matches prints `0 decisions matched. Filters: …` and exits 0 — never empty stdout. The API Explorer shows the same condition as a 200 with `items: []` and a `count: 0`, **not** a 404, because an empty result set is a successful query and a client that treats it as an error will retry forever. |
| Error | CLI: errors go to stderr as a single-line `E-<CODE> <cause> <retry_after_ms>`, exit code 2, and `--json` emits the same structured error the API returns. GUI and CLI error shapes are identical because they are the same payload. |
| Success | CLI: `aegis eval` prints a 12-line human summary by default and the full `Decision` with `--json`; `--curl` prints the reproducible request. |
| **Parity** | `test/ux/console-parity.test.ts` drives all **13** routes from both clients and asserts the rendered outcome, `primary_rule_id`, `admission`, and constraint list are byte-identical. A divergence is a defect, not a platform difference — and the test is what makes that sentence true rather than aspirational, because the CLI and the console are two implementations of one reader and a reader who gets a different answer from each has no way to know which one is the module |

---

## 6. Explainability Banners (denied / narrowed / deferred)

Every automatic decision carries a banner. One structure, three variants, and a hard rule: **the first sentence is the cause, and the cause names a rule.**

### 6.1 `DENY` banner

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ○ DENY                                            R-TIER-02   POL-TIER     │
│                                                                            │
│ You asked for Llama-3-70B-Instruct-Q4 on 1 × 48 GB GPU.                    │
│ Your clearance caps you at 1 × 24 GB (ROLE-TIERS §2).                      │
│                                                                            │
│ Why:  no node class available to you satisfies vram_gb_per_gpu ≥ 48.       │
│      The fleet has 1 such class (server-gpu-01, 2 × 48 GB) and your role   │
│      cannot access it.                                                     │
│                                                                            │
│ What you can do:                                                           │
│   [ Use Qwen2.5-14B-Instruct-AWQ (8.2 GB) on 24 GB ]  ← runs now           │
│   [ Ask Dr. Rebecca Reed about a RESEARCHER grant — ROLE-TIERS §2 ]        │
│   [ See all models you can run today ]                                     │
│                                                                            │
│ No narrower request on this model is available to you.                     │
│ Evaluated 2026-04-08 11:04:22.331 CST · policy v41 · request 8f21c         │
└────────────────────────────────────────────────────────────────────────────┘
```

**Copy rules:** first sentence = what was asked and what blocked it, in the requester's terms; second block = mechanism with a dotted fact path; third = executable alternatives; the closing sentence handles the empty-alternatives case explicitly.

### 6.2 `CONSTRAIN` banner (narrowed admission)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ◐ CONSTRAIN                                     R-BOUND-01  precedence 13  │
│                                                 POL-NIGHT · POL-LAB        │
│                                                                            │
│ Admitted — with a hard deadline.                                           │
│                                                                            │
│  ⏱ HARD_DEADLINE        must_checkpoint_by  2026-04-09 05:55:00 CST        │
│    governing boundary    NIGHT_WINDOW closes 06:00 campus-local            │
│    reason                POL-NIGHT §1 · owner: Dr. Rebecca Reed            │
│    grace                 300 s (PROTECTION_GRACE)                          │
│    remaining             03:55:00                                          │
│    enforced by           night-scheduler (SIGTERM at the deadline)         │
│  ○ WINDOW_SCOPE          08:55:00  lab opens 09:00 — superseded, not used  │
│  ○ WINDOW_SCOPE          12:00:00  your requested end — superseded         │
│                                                                            │
│  must_checkpoint_by = valid_until = 05:55:00.  One deadline, not three.    │
│  [Accept constrained run]   [Split into 2 shorter runs]   [Cancel]         │
└────────────────────────────────────────────────────────────────────────────┘
```

**Laws:** (a) a `CONSTRAIN` is an **admission**, so the banner never uses the word "denied"; (b) every constraint names its *enforcing component*, because a deadline nobody enforces is a lie; (c) every constraint names its **owner** — a deadline Elena can name and appeal to is worth one she can only obey; (d) the countdown is live and never auto-dismisses; (e) the binding deadline is a property of the **boundary set**, not of the winning rule, and the superseded rows are **listed and labelled** rather than deleted.

**Law (e) is revision 3, and it corrects a real error rather than a preference.** `R-GRACE-01`, `R-STRADDLE-01`, and `R-THESIS-01` were three rules computing three deadlines from three boundary lists. They are now one rule, `R-BOUND-01` at precedence 13, and one bound computed in `prd.md` §6.1 step 3 **before the walk runs**. The card previously drew a binding `08:55` with the overnight `06:00` struck through as "earlier, not binding" — which is false, because 06:00 precedes 09:00 and the night policy is the constraint that binds. The bound table cannot disagree with itself: the highlighted row *is* the minimum of the set the card displays, so a reader who disagrees with `05:55` can recompute it from the card. Finding `UX-S3-04`; the arithmetic is verified in `C-UX-Scenarios/scenario-3.md` §3.4 and the case where the lab bound is the governing one is that file's E-4.

### 6.3 Deferred / queued banner

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ◐ CONSTRAIN                                         R-CONTEND-01 FLEET-INV │
│ Queued — 24 GB class fully committed.                                      │
│  ⧗ QUEUE_ONLY           earliest estimated wait  00:41 (9c4a ends 11:45)   │
│  [ Join queue and hold this request ]   [ Re-evaluate in 15 min ]          │
└────────────────────────────────────────────────────────────────────────────┘
```

`R-CONTEND-01` is the only fail-open rule, so its banner must be honest that the wait is an *estimate* from a stale-tolerant fleet read, and must show the age of that read: `from availability read 14:02:11 (34 s old, tolerance 60 s)`.

**Three things this banner must not say, and each one is a specific lie.**

1. **Not a reservation.** `QUEUE_ONLY` does not hold a machine. A reader who leaves the page and returns to find the job refused has been told a falsehood, and the fix is one word: the copy says *queued*, the queue itself is best-effort, and the card offers `Re-evaluate in 15 min` so the reader's next information arrives on a schedule rather than by luck. `QUEUE_ESTIMATE_TTL = 60 s` bounds how stale the estimate may be before the surface must re-derive it, and the countdown to that re-derivation is shown.
2. **Not a deadline.** There is no `must_checkpoint_by` here, and rendering one would put a `HARD_DEADLINE` frame on a card whose engine never emitted a deadline — the empty-frame defect `wireframe-02` §"four states" names. The row is a `QUEUE_ONLY` kind with a *duration* estimate, not a deadline, and the two must not share a glyph.
3. **Not a guarantee of admission.** Even if the queue drains, the request must be re-evaluated, and a `STUDENT` whose quota expired in the meantime is refused. The card says so: *when your turn comes this request is evaluated again; a change in quota, reservations, or the rule set applies at that point.* A queued request that is presented as an admission with extra steps is a promise the module has no mechanism to keep.

### 6.4 Banner copy prohibitions

| Prohibited | Why |
|---|---|
| "Access denied" / "Request rejected" with no cause | PRD FR-9 / NFR-6 forbid generic denials. |
| "You are not authorized." | Names no rule and no fact. |
| Any word implying the requester did something wrong — "violation", "unauthorised attempt", "misuse" | The engine evaluates institutional rules against a request, not conduct. A refusal is a fact about a request at an instant, and `scenario-4.md`'s violated-deadline copy says so explicitly: *"a policy violation attributable to job b7e4419a, not to your request"* — the one place the word belongs, because there a delegate did fail. |
| "Error", "Failed", "403", or "CANNOT EVALUATE" as the banner's first line | Reserves the word error for a broken **surface**, per §1 law 1 and §4.3. `CANNOT EVALUATE` in particular is now a prohibited string, not merely an unused one: the state it named was never in the domain, and copy that names a state a reader has never seen teaches them that the module has modes it does not have. |
| "Request rejected" with a retry offer | Nothing about the request would change. An action that cannot work is a lie about the module's determinism. |
| Emoji-only severity | Fails 1.4.1. |

---

## 7. Accessibility Verification (WCAG 2.1 AA — checks, not aspirations)

| Check | Method | Pass condition |
|---|---|---|
| 1.4.1 Use of Colour | Desaturate every screen state to greyscale | All **three** outcomes identifiable by glyph + word (`● ALLOW`, `◐ CONSTRAIN`, `○ DENY`); a `DENY` card and an `E-SYSTEM` banner still distinguishable by **position and glyph** alone; the `governing` / `superseded` bound rows distinguishable by glyph + word; the port grid's three states (fresh / stale / fault) distinguishable by cell fill and badge text |
| 1.4.3 / 1.4.11 Contrast | Token pairings measured against the surfaces they sit on | Body ≥ 4.5:1; borders/rules ≥ 3:1; no token pair below threshold (values recorded in DESIGN.md §2) |
| 1.4.4 Resize | Zoom to 200 % at 1440×900 and 1280×800 | No truncation of rationale text; Zone D collapses before any text is clipped |
| 1.4.10 Reflow | 320 CSS px (mobile freeze console) | No horizontal scroll; scope builder reflows to one column |
| 2.1.1 / 2.4.7 Keyboard | Traverse the full S-4 freeze activation path with no pointer | Focus order: scope → window → preview → confirm → modal → reason field → confirm. Visible 2 px `--border-2` focus ring at every stop; no focus trap except the lift-reason modal, which traps intentionally and restores focus to its trigger |
| 2.2.1 Timing | Idle a session through a `must_checkpoint_by` deadline | The countdown does not auto-dismiss and does not reset; at the deadline the surface re-evaluates and announces the outcome via `aria-live="polite"` |
| 3.3.1 / 3.3.3 | Submit each of 6 invalid composer payloads | Each field names its accepted range and the nearest legal value; the error is programmatically associated with its input |
| 4.1.3 | Trigger an `E-SYSTEM` fault with a screen reader | Banner announced once, immediately, with port name and `retry_after_ms` in the announcement text |
| 1.3.1 | Inspect the trace tree | Nested list semantics; each leaf exposes the full dotted fact path as its accessible name |
| 2.5.3 Label in Name | Click a labelled NextActionButton | The visible label ("Use Qwen2.5-14B-AWQ") is contained in the accessible name |
| 2.4.11 Focus Not Obscured | Scroll the journal with a sticky ContextBar | The focused row is never hidden beneath the 48 px bar |
| 2.4.7 Focus Visible, on a **disabled** control | Tab to the ACTIVATE button while the preview is still loading or has failed | The disabled button **remains focusable** and shows a focus ring, and its accessible description names the unmet precondition. A disabled control that cannot be focused is invisible to a keyboard or screen-reader reader, which converts "you cannot press this yet" into "there is no such button" |
| 4.1.3 without harassment | Let the 60-second preview token countdown run to expiry | The countdown is `aria-hidden` with a text equivalent, so a screen reader is not interrupted every second for a minute; the **expiry** is announced once, on `aria-live="polite"`, and the one-tap recompute is inside the announced text |
| 1.4.4 at the extreme | Zoom to 400 % on the freeze console at 390 px | The `REQUESTS AFFECTED` figure remains visible — it is the reason the person is on that screen, and a layout that hides the number is a layout that hides the justification |

---

## 8. Responsive & Platform

| Viewport | UX-1 Evaluator | UX-4 Freeze Console |
|---|---|---|
| ≥ 1600 px | 4-zone layout, evidence panel 320 px | 2-column: builder + preview |
| 1280–1599 px | 4-zone layout, panels shrink | 2-column, narrower |
| 900–1279 px | Zone D collapses into a disclosure under the decision card | 1 column, preview below builder |
| 390–899 px | **Not supported.** One-line notice pointing to UX-6 CLI, with the current request pre-rendered as a copyable `curl` so mobile is a *degraded but useful* surface, never a broken one | Full support, 1 column, 44 px minimum touch targets, `HARD_DEADLINE` countdown pinned to the top |
| < 390 px | Same notice | Same as above, single column, no horizontal scroll│

---

## 9. Key Flows

### Flow 01 — Elena's 10:04 lab request (S-1, Scheduled Lab Protection)
Elena submits a background batch job at 10:04 on a Wednesday, inside the `CS-340-CV` lab window. Composer → submitting → port grid fills → `○ DENY` card expands Zone D by default. Rule chip `R-LAB-01`, rationale names the window and the fact path, three next actions, one of which ("Request a 22:00 slot") rewrites the composer to a request that returns `ALLOW`. She never sees a spinner she cannot interpret, and she never has to email anyone to find out why.

### Flow 02 — Elena's 70B request (S-2, VRAM Tier Gate)
Elena asks for `Llama-3-70B-Instruct-Q4` on 48 GB. `○ DENY`, `R-TIER-02`. The first sentence restates her request and the cap in her terms. One primary next action proposes a compliant variant and *submits it* on her behalf; the resulting `ALLOW` appears stacked beneath with a visible "proposed by the denial" connector line, so the causal relationship between the two decisions stays visible.

### Flow 03 — Elena's overnight batch (S-3, Overnight Grace Policy)
**E-1, the submission itself.** Tuesday 22:10, a 6-hour `TRAINING` request, a 09:00 lab tomorrow. `● ALLOW` via `R-ALLOW-01` (precedence 17), `valid_until = 04:10`, and — this is the part that matters — the two protections that are *not* binding are shown anyway: `WIN-4418 → 08:55 (not binding)` and `POL-NIGHT §1 → 05:55 (not binding)`. She learns that extending the run by two hours would cut it off, before she clicks. One primary action says so in its own label: *Extend to 8 h — would be cut off at 05:55*.

**E-2, the mandatory edge case.** Her actual 10-hour `EVALUATION` run. `◐ CONSTRAIN` via `R-BOUND-01` (precedence 13), `must_checkpoint_by = valid_until = 05:55:00` — the same instant, which is `M2-AD-3` and is stated on the card in one line. The card then answers *why 05:55 and not 08:55* with the three-row bound table, the governing row marked, and the sentence **"The overnight window is the one that stops you. The lab is the backstop, and it would have stopped you two hours later."**

That sentence is the flow. It is the difference between a number and a comprehension, and it was the sentence revision 1 did not have: the earlier card drew `08:55` as binding and struck `06:00` through as irrelevant, which is arithmetically false, and no amount of good typography survives false arithmetic (finding `UX-S3-04`).

On accept, the constraint row is **pinned in Zone A for the whole session** and ticks; at 05:55 the surface re-evaluates and announces the outcome change. If the deadline passes with no signal from `night-scheduler` within 60 s, the row switches to `--status-fault` and the copy distinguishes *no signal from the delegate* from *bridge confirms the job is still running* — two faults with two different owners, which must not be merged.

### Flow 04 — Dr. Reed's exam freeze (S-4, Emergency Freeze Rule)
From her phone during office hours: build scope → pick window → **the consequence preview shows 37 requests refused, 14 of them `RUNNING` right now, and 3 exam reservations surviving** → confirm with a named reason → the active banner appears with a countdown → 40 minutes later she lifts it, and must supply a reason. She never activates a freeze she has not first seen the consequences of, and she can later prove from the journal exactly who did what, because the activating `actor_id`, the **role tier she held at activation**, and the `freeze_id` are all on the banner and all in the journal row.

**Two flows that revision 3 added, because the four required ones left gaps that a reader would fall into.**

### Flow 05 — the dependency failure (S-4 §5, the `R-DEP-01` card)
`reservations` is down. The consequence preview **cannot be computed**, so `ACTIVATE` is blocked and the banner states: `reservations.v1` unavailable, cause `DEPENDENCY_UNAVAILABLE`, tolerance 0 s (this port is `FAIL_CLOSED`), and the effect — *"without reservation bindings I cannot tell which of these 37 are exam requests. The count below is a lower bound, not an estimate."* The preview shows 37 and a `LOWER BOUND` stamp rather than nothing, because a partial count with a stated limit is usable and a blank is not. Dr. Reed's options are `Retry`, or `Activate with reservations unavailable`, which is available **only** to `role_tier ≥ INSTRUCTOR`, requires a second explicit reason, and records `degraded_preview: true` on the `FreezeState` so the journal shows the freeze was activated against a fleet state nobody could fully enumerate.

**This flow is the module's clearest statement of what it is.** It refuses, names the rule, names the port, quantifies what is missing, and — because the law of an emergency justifies proceeding under uncertainty — offers the unsafe path *explicitly*, to a named person, with the gap recorded. A module that simply blocked would be safer and less useful; a module that proceeded silently would be the failure this design exists to prevent.

### Flow 06 — the allowance that outlived its entitlement (S-4 EC-4.6/4.7)
Elena submits a request carrying `exam_binding = EXAM-01` at 07:20, inside the freeze, as a 3-hour `EVALUATION`. The intuition says `R-FRZ-02` at precedence 2 admits it. It does not: `R-VALID-01` at precedence **−1** runs first and asks whether the actor holds an entitlement to the reservation's `subject_id` — Elena's was withdrawn at 07:15 when the course cancelled the sitting. The result is `DENY(NOT_AUTHORIZED)` with a cause of `NOT_AUTHORIZED` and a trace row saying *"the binding is not a binding: EXAM-01 is bound to CS-480-VLM and you hold no entitlement to CS-480-VLM."*

This is the visible consequence of decision-log **L-12**, and it is in the UX package because a reader who cannot see *why* an allowance failed has no way to learn that an allowance is not a promise. The card names the alternative: `[ See what you may run right now ]`, which returns `R-FRZ-01` at 07:20 and a `DENY` that is true for a different reason.
