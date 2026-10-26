# DESIGN.md — Visual Identity & Design Tokens
## Module M2 — Academic GPU Policy Engine

**Artifact:** `ux/DESIGN.md` · **Phase:** 2 · **Status:** FINAL
**Revision:** 3 · aligned to the 19-rule catalogue, the 13-route API, and the deletion of the `INDETERMINATE` outcome.
**Form factors (declared per Phase 2 instruction — engine module):** engine console (desktop-first, data-dense), interactive API explorer (OpenAPI/Swagger surface), CLI, plus **one surface for the freeze authority** — the freeze console, which Dr. Rebecca Reed drives from a 390 px phone.
**Design lineage:** the console is an *instrument panel*, not an app. Every pixel that is not a decision, a rule id, a time, or a number is decoration and is removed.

---

## 1. Brand & Style

| Property | Value | Why |
|---|---|---|
| Product name | **Aegis Policy Console** | A *policy* console. The name promises judgement, not compute. |
| Register | Institutional, terse, citable | The audience is a professor defending a denial to a dean. Every word on screen must survive being pasted into an email. |
| Density | High (32 px base row, 12-column grid) | Dr. Rebecca Reed compares 40 decisions at once when auditing a disputed refusal. Whitespace is a luxury this console cannot afford. |
| Voice | Second person, active, no hedging | "Denied: 70B VLM needs 48 GB. Your clearance is 24 GB." Not "Access could not be granted at this time." |
| Non-negotiable | **No outcome is communicated by colour alone** | WCAG 2.1 SC 1.4.1. Every outcome carries a glyph, a word, and a colour. |

---

## 2. Colour Tokens

### 2.1 Base surface (dark-default; the console lives next to terminals)

| Token | Hex | Use |
|---|---|---|
| `--surface-0` | `#0B0F14` | App background |
| `--surface-1` | `#111823` | Panel background |
| `--surface-2` | `#18212F` | Row hover, table zebra |
| `--surface-3` | `#212C3D` | Active row, input rest |
| `--border-1` | `#2A3646` | Default 1 px border |
| `--border-2` | `#3B4A5E` | Focused border |
| `--text-1` | `#E6EDF5` | Primary text |
| `--text-2` | `#9FB0C4` | Secondary text, metadata |
| `--text-3` | `#6B7C93` | Disabled, axis labels |

Contrast: `--text-1` on `--surface-0` = 14.8:1 (AAA). `--text-2` on `--surface-1` = 6.9:1 (AA). `--text-3` is used for non-essential decoration only, never for a value the reader must act on.

### 2.2 Semantic status tokens (mandated palette, from Phase 2 instruction)

| Token | Hex | Meaning in this module |
|---|---|---|
| `--status-available` | `#3FB950` | Request admitted with no constraint. Node class has free capacity. |
| `--status-reserved` | `#D29922` | Capacity held by a protected window / admission narrowed by a constraint. |
| `--status-active` | `#58A6FF` | Decision currently being evaluated; request in flight; a `CONSTRAIN` deadline ticking. |
| `--status-fault` | `#F85149` | Node failing/cordoned; a **surface** failure (a journal fetch, a trace fetch, a consequence preview — never the engine, which always decides). |

### 2.3 Decision-outcome tokens

**There are three outcomes, and revision 3 deleted the fourth.** The table below has no fourth row because the domain has no fourth outcome.

| Outcome | Token | Hex | Glyph | Label (always rendered) |
|---|---|---|---|---|
| `ALLOW` | `--decision-allow` | `#3FB950` | `●` | `ALLOW` |
| `CONSTRAIN` | `--decision-constrain` | `#D29922` | `◐` | `CONSTRAIN` |
| `DENY` | `--decision-deny` | `#F85149` | `○` | `DENY` |

Alongside them, one **non-outcome** token, which must never be mistaken for a fourth:

| Condition | Token | Hex | Glyph | Eyebrow | Chrome |
|---|---|---|---|---|---|
| A **surface** is unavailable — journal fetch, trace fetch, consequence preview | `--surface-fault` | `#8B5CF6` | `◆` | `SYSTEM` | Full-width `role="alert"` banner pinned above all content |

**`INDETERMINATE` is gone, and its removal is a design decision with a cause.** Revision 1 and 2 carried a violet `◆ CANNOT EVALUATE` outcome at `#8B5CF6`, and it was the most expensive mistake in the visual system: a violet chip on a decision card tells the reader that the engine had *formed no opinion*, which would license a retry and a shrug. But `R-DEP-01` at precedence **0** is a rule. A failed fact port is a `DENY` with a `primary_rule_id`, a closed-set cause, and a `retry_after_ms` — a considered answer with a rule attached, and the correct response to it *is* a retry, but a retry that changes nothing is offered only by the module, never by a colour. The engine is never uncertain; it is sometimes **refusing for a reason that is about the fleet rather than about the request**, and the two look different to a human even though they are both `DENY`. `#8B5CF6` therefore survives as `--surface-fault` for a broken *view*, and never appears inside a decision card. (`prd.md` FR-16, `M2-AD-1`; `ux/EXPERIENCE.md` §4.3; `C-UX-Scenarios/scenario-4.md` §5.)

**Colour rule that governs everything below:** `--decision-deny` (`#F85149`) and `--surface-fault` (`#8B5CF6`) are close enough in hue that a reader could confuse them at a glance, and the module therefore separates them on **three** axes at once — by glyph (`○` vs `◆`), by label (`DENY` vs `SYSTEM`), and above all by **placement**: a decision outcome is a chip inside a decision card; a surface fault is a full-width `role="alert"` banner pinned above all content. The greyscale check in `EXPERIENCE.md` §7 asserts that the two remain distinguishable with colour removed entirely, because a design whose safety net is a hue is a design with one string. A reader must never have to ask "is this a refusal or is this broken?" — and the two demand **opposite** actions, which is precisely why the `DENY` card offers no `Retry` and the `SYSTEM` banner always does.

**Accessibility:** each outcome's foreground is paired with a ≥ 4.5:1 contrast background variant (`--*-bg` tokens at 14% alpha over `--surface-1`) and is additionally encoded as a 2-character text badge, so a fully desaturated screenshot is still unambiguous.

### 2.4 Rule-severity accent (for the rule catalogue view)

Each rule id renders as `<precedence-badge> <RULE-ID>`, and the badge is **not** always two digits, because the 19-rule catalogue has two rules whose precedence is negative or zero and hiding that behind `00` would be a lie about the ordering. The badge has three visual classes:

| Class | Precedence | Badge | Rail | Rules |
|---|---|---|---|---|
| **Pre-flight** | `−1`, `0` | 2 chars, `--surface-3` fill, `--text-2` label `PRE-FLIGHT` | 2 px `--text-3` | `R-VALID-01` (−1), `R-DEP-01` (0) |
| **Governing** | 1 – 17 | 2-digit, monospace, `--text-1` | 1 px `--border-2` | the other 17 |

The rail and the `PRE-FLIGHT` label exist for one reason: `R-VALID-01` and `R-DEP-01` do not decide whether a request is *permitted*, they decide whether the catalogue can be **consulted at all**. Rendering them as peers of the 17 numbered rules invites the reading that all 19 are independent checks on the same question, and that reading is wrong in a way that surfaces later as a support ticket — *"my request was rejected for a missing field, is that a policy denial?"* It is not; it is a malformed request, and it is answered before any policy is read. (`prd.md` §6.2; `EXPERIENCE.md` §5.2 Loading.)

**The `−1` and `0` values are not renumbered to start at 1.** They are printed as they are, because `R-VALID-01` *precedes* the catalogue rather than joining it, and any numbering that makes it look like the nineteenth rule gives the reader an ordering to reason about that the engine does not use.

---

## 3. Typography

| Role | Family | Size / line-height | Weight | Notes |
|---|---|---|---|---|
| Display | `Inter` | 20 / 28 | 600 | Screen titles only. |
| Section | `Inter` | 15 / 22 | 600 | Panel headers. |
| Body | `Inter` | 13 / 20 | 400 | Rationale text. Rationale is the product; it gets body weight, not muted weight. |
| Label | `Inter` | 11 / 16 | 600, `0.06em` tracking, uppercase | Eyebrows, column heads. |
| **Mono** | `JetBrains Mono` | 12 / 18 | 400 | Every machine value: rule ids, timestamps, VRAM figures, JSON payloads, curl. **All numerics are mono** — this is a numeric instrument, and proportional digits make column alignment impossible. |
| Mono emphasis | `JetBrains Mono` | 12 / 18 | 700 | The decisive number in a decision (e.g. `48 GB`, `08:55`). |

**Rule:** if a number is on screen it is mono, and if it is mono it is right-aligned in its column. No exceptions, including inside prose sentences.

---

## 4. Layout & Spacing

- **Base unit:** 4 px. Scale: `4 8 12 16 24 32 48 64`.
- **Grid:** 12 columns, 16 px gutter, 24 px page margin, max content width 1600 px (the console is not a reading surface; it does not need to reflow to a column of prose).
- **Density:** table row 32 px, decision card 12 px padding / 8 px gap between evidence lines, panel header 40 px.
- **Console layout (3 zones, fixed):**

```
┌──────────────────────────────────────────────────────────────────────┐
│ ZONE A  Context bar (48px) — actor chip · campus clock · policy ver  │
├───────────────┬──────────────────────────────────────┬───────────────┤
│ ZONE B        │ ZONE C                               │ ZONE D        │
│ Request       │ Decision card (the hero)             │ Evidence /    │
│ composer      │  outcome · rule · rationale          │ trace tree    │
│ (360px,       │  constraints · next actions          │ (320px,       │
│  resizable)   │                                      │  resizable)   │
├───────────────┴──────────────────────────────────────┴───────────────┤
│ ZONE E  Journal / rule catalogue / freeze console (tabbed, fills)   │
└──────────────────────────────────────────────────────────────────────┘
```

- **Zone rule:** Zones A–D never scroll independently of each other on a 1440×900 viewport; only Zone D and Zone E scroll. A decision must always be readable without scrolling while its evidence is being read.
- **Responsive:** below 1280 px, Zone D collapses into a disclosure under the decision card. Below 900 px the console is not supported — it displays a one-line notice pointing at the CLI dashboard. The lab director's freeze console *is* supported down to 390 px, because it is used from a phone on the lab floor; that surface has its own reduced layout (see EXPERIENCE.md §8).

---

## 5. Elevation & Depth

Flat, with exactly two elevation levels, because depth in a decision tool is a lie about importance:

| Level | Treatment | Used by |
|---|---|---|
| 0 | `--surface-1`, 1 px `--border-1` | Panels, tables, cards |
| 1 | `--surface-3` + 1 px `--border-2` + 2 px top `--decision-*` rule (the outcome colour) | The active decision card, the alert banner |

No drop shadows anywhere. No rounded corners above 6 px. The only permitted radius values are `4` (inputs, buttons, badges) and `6` (cards).

---

## 6. Shapes

| Element | Radius |
|---|---|
| Card, panel | 6 px |
| Button, input, select, badge | 4 px |
| Glyph badges (`ALLOW`/`DENY`/`CONSTRAIN`) | 4 px, 2 px letter-spacing |
| Status dot (`--status-*`) | 50% circle, 8 px |

---

## 7. Components

| # | Component | Anatomy | States | Rules |
|---|---|---|---|---|
| C-1 | **ContextBar** | actor chip · campus clock (mono, with TZ suffix **and stratum**) · policy version chip · freeze banner toggle · 10-cell fact-port grid | default / freeze-active (1 px `--status-fault` top border) | The campus clock always shows its offset (`CST −05:00`) *and* the NTP stratum the reading came with, because a clock of stratum 3 is a fact the reader is entitled to before they trust a deadline. The port grid renders **before** the fan-out resolves, so a 40 ms wait is legible rather than mysterious. |
| C-2 | **RequestComposer** | actor selector · workload kind · model ref · GPU count · VRAM/GPU · duration · exam binding | rest / invalid field / submitting | Numeric fields are steppers, not free text (`vram` is a 2-option segmented control: `24 GB` / `48 GB`). Invalid state is inline, per-field, and names the accepted range. **There is no `priority` control**, and the omission is deliberate: revision 1 carried a `priority_class` field that no rule read, and a visible control for a field the engine ignores is worse than no control at all (`prd.md` AG-10). |
| C-3 | **DecisionCard** *(hero)* | outcome badge · primary rule chip · **cause chip** · rationale (body) · constraint list · bound table · `suppressed[]` panel · next-action buttons · validity strip | allow / constrain / deny | The card is never collapsed. It is the only element permitted to use Display weight. The **rule chip and the cause chip are separate elements**: "refused" and "refused *because of this rule*" are different facts. |
| C-4 | **ConstraintRow** | glyph by kind · label · machine value · owning boundary · **enforcing component** · **policy owner** | default / satisfied / violated (live tick when a deadline is within 15 min) | `HARD_DEADLINE` rows show a live countdown in mono and print `must_checkpoint_by = valid_until = <instant>` on one line, because the equality is an invariant (`M2-AD-3`) and an invariant the reader can check is one they will report when it breaks. A ticking constraint is the single most important live element in the console. |
| C-5 | **EvidenceTrace** | collapsible tree: 19 rows, each `rule_id` → `MATCH` / `NO_MATCH` / `NOT_EVALUATED` → matched condition → fact path (`fleet.classes[ws-24gb].available_count`) | collapsed / expanded / copy-json | Every leaf is a real dotted fact path, not prose. `NOT_EVALUATED` is labelled and carries the reason (`preempted by R-FRZ-01 at precedence 1`) — a blank cell would read as "we checked and it was fine", which is the one thing it is not. This is what makes the trace auditable rather than decorative. |
| C-6 | **CitationChip** | doc id + § | default / unresolved (`⚠ unresolved`) | An unresolved citation is a defect and must be visually loud; PRD FR-9 requires every citation to resolve, and the boot-time check is what proves it rather than a human promise. |
| C-7 | **NextActionButton** | primary (single) / secondary (up to 3) | rest / hover / focus / executing / done / unavailable | Exactly one primary per decision. Actions are executable one-click against the composer (they rewrite the request and re-evaluate). Each button's label states the **outcome it produces**, not just the action — *"Extend to 8 h — would be cut off at 05:55"*, not *"Extend"*. |
| C-8 | **JournalTable** | time · actor · subject · model · outcome · rule · policy ver · `freeze_id` | loading / empty / populated / filtered-empty | Row click opens the same DecisionCard in read-only mode plus the frozen fact snapshot. A row carrying a `freeze_id` links to `GET /policy/freezes/{id}`, so "which freeze did this" is a click and not a guess (**EDGE-32**). |
| C-9 | **RuleCatalogue** | precedence badge · rule id · outcome chip · condition · citations · reachability dot | default / active-override (shows a pending change from the next version) | Rules are data, so the catalogue is the rule set rendered as a table. Editing a rule is out of V1 scope; the table is read-only and says so. The reachability dot is hollow where a deletion test is missing, so a rule nothing can falsify is visible as such. |
| C-10 | **FreezeConsole** (Dr. Rebecca Reed, 390 px) | scope builder · window picker · allowance chips · **consequence preview** · activate / lift | draft / previewing / active / expired / lifted / preview-expired | The consequence preview is mandatory before activation, shows the count of requests that would be refused and how many reservations survive, carries a **60 s single-use token** whose remaining lifetime is printed on the card, and blocks activation when it cannot be computed. Activating a freeze without an inspected preview is refused **by the server**, not by a disabled button. |
| C-11 | **SystemAlert** (`role="alert"`) | eyebrow `SYSTEM` · failing port or endpoint · cause · **tolerance exceeded** · **effect on what is displayed** · retry affordance | transient / persistent-with-retry | Reserved exclusively for a broken **surface** — a failed journal fetch, trace fetch, or consequence preview. **Never** used for a `DENY`, and never for a fact-port failure, because `R-DEP-01` at precedence 0 turns that into a `DENY` with a rule and a cause. A fault that names a port but not its consequence is a fact, and a fact does not justify blocking a person from pressing a button. |
| C-12 | **TerminalPane** | request (curl) · response (JSON) · latency | idle / streaming / complete | The console is a teaching instrument: every decision is copyable as a reproducible `curl` against the public API, with no privileged path the console uses and the CLI does not. |

---

## 8. Do's and Don'ts

| ✅ Do | ❌ Don't |
|---|---|
| Show the decisive number in mono, bold, on its own line. | Put the number inside a sentence of grey text. |
| Name the rule (`R-TIER-02`) in the decision card, not only in the trace tree. | Say "policy refused this" with no rule id. |
| Offer a one-click next action that produces a *different, lawful* request, and name the outcome it produces. | Offer "try again" on a `DENY` that will always refuse. |
| Separate a broken surface from a refusal by position, glyph, and eyebrow word. | Signal a fact-port outage with a red toast that looks like a refusal. |
| Show a live countdown on a `HARD_DEADLINE` constraint. | Show a deadline as a static timestamp. |
| Show the **bound table**, with the governing row marked and the superseded rows listed. | Show only the winning deadline, leaving the reader unable to check it. |
| Render the campus clock with its UTC offset **and** its stratum. | Render a bare local time. |
| Use colour, glyph, **and** text for every outcome. | Use red/green alone. |
| Keep the decision card fully visible while the trace is read. | Make the reader scroll to see why something was refused. |
| Say `DENY — VRAM tier 2 requires 48 GB; your clearance is 24 GB.` | Say `Access denied (403).` |
| Show the policy version on every decision. | Hide the version in a footer. |
| Print `must_checkpoint_by = valid_until = <instant>` on the card. | Print two different instants and hope the reader does not notice. |
| Label every `NOT_EVALUATED` trace row with the rule that preempted it. | Leave it blank, which reads as "checked and fine". |
| Keep a disabled `ACTIVATE` button focusable and announcing its unmet precondition. | Remove it from the tab order, which makes it invisible to a keyboard. |

---

## 9. Accessibility Floor (WCAG 2.1 AA — binding, verified in EXPERIENCE.md §7)

| Criterion | Commitment |
|---|---|
| 1.4.1 Use of Colour | Every outcome and status carries a glyph and a text label; colour is the third channel, never the first. |
| 1.4.3 Contrast (Minimum) | All body text ≥ 4.5:1; all large text and UI borders ≥ 3:1. Verified in the token table above. |
| 1.4.11 Non-text Contrast | Decision-card top rules, focus rings, and input borders ≥ 3:1 against their adjacent surface. |
| 1.4.4 Resize Text | Layout holds at 200 % zoom; the console drops Zone D before it truncates rationale text. |
| 1.3.1 Info and Relationships | Decision outcomes use `<ul>`/`<li>` semantics with an accessible name; the trace tree is a real nested list, not indented divs. |
| 2.1.1 / 2.4.7 Keyboard | Every action, including freeze activation, is reachable and operable by keyboard. Freeze activation additionally requires an explicit `Enter` on a focused confirm button — never a hover-only affordance. The **disabled** `ACTIVATE` button stays in the tab order and announces the precondition it is waiting on; a control that vanishes for keyboard readers converts *"not yet"* into *"there is no such button"*. |
| 2.2.1 Timing Adjustable | The `HARD_DEADLINE` countdown never auto-dismisses and never resets; a session that idles past a deadline is re-evaluated, not silently closed. The 60-second preview token counts down visually but its **expiry** is announced once on `aria-live="polite"`, and a per-second live region is a screen reader being interrupted sixty times a minute. |
| 3.3.1 / 3.3.3 Error Identification and Suggestion | Invalid composer fields name the accepted range and, where one exists, the nearest legal value. |
| 4.1.3 Status Messages | `SystemAlert` uses `role="alert"`; the outcome change uses `aria-live="polite"`; neither is colour-only. |
| 1.3.5 Identify Input Purpose | Actor, subject, and model fields carry `autocomplete` tokens appropriate to their academic identifiers. |

---

## 10. Revision 3 — what changed in this document, and why it was not cosmetic

Four changes. Each one is a correction of a claim the previous revision could not defend, and each is traceable to a finding rather than to a preference.

| # | Change | Finding | Consequence if left |
|---|---|---|---|
| 1 | **The `INDETERMINATE` outcome and the `--decision-fault` chip were deleted**; `#8B5CF6` survives as `--surface-fault` for a broken view and never appears inside a decision card | `UX-ORD-1` (raised during the revision-2 PRD reconciliation) | A fourth outcome tells Elena the engine had no opinion, which invites a shrug where the module in fact holds a rule and a cause. FR-16 already forbade generic outcomes; the design system was quietly reinstating one. |
| 2 | **The precedence badge is no longer two digits**; `−1` and `0` render in a separate `PRE-FLIGHT` class above a hairline divider | `AG-10` / `SA-9` | Padding `−1` to `−1`/`00` hides the only structural fact about those two rules: they decide whether the catalogue can be consulted, not whether the request is permitted. |
| 3 | **C-2 lost its `priority` control** and **C-4 gained the owner and enforcing component** | `AG-10`; `SA-3` | A control for a field no rule reads teaches Elena that `THESIS` might have mattered. A deadline with no named owner is a deadline she can only obey, not one she can appeal to or ask about. |
| 4 | **C-5 requires `NOT_EVALUATED` rows to name the preempting rule**, and **C-8 requires a `freeze_id` to link to `GET /policy/freezes/{id}`** | `FR-9`; `EDGE-32` | A blank trace cell reads as *"we checked and it was fine"*, which is the one thing it is not — it is *"a higher-precedence rule answered first"*. A journal row whose `freeze_id` is a bare string makes "which freeze did this" a guessing game. |

The colour table's own closing sentence is the test this document now has to pass: **a design whose safety net is a hue is a design with one string.** Every separation in §2 is carried by at least two channels, and `EXPERIENCE.md` §7 asserts it in greyscale.
