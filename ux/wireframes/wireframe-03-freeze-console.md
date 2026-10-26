# WF-3 — Freeze Console at 390 px, with the consequence gate
## Module M2 — Academic GPU Policy Engine · 390 × 844 · mobile · dark surface

**Scenario:** S-4 — Dr. Rebecca Reed, Thursday 07:12, activating `FRZ-2026-04-09-001`.
**This wireframe exists to prove one thing: the irreversible action is unreachable without scrolling past its own consequences.**
**Design source:** `EXPERIENCE.md` §5 (UX-4), §2.

```
┌──────────────────────────────────────┐  390 px
│ ← Freeze console          policy v41│
├──────────────────────────────────────┤
│ ① SCOPE                              │
│ ┌──────────────────────────────────┐ │
│ │ ○ Subject   ● Node class         │ │  44 px targets
│ │ CS-340-CV          [×]          │ │
│ │ CS-480-VLM         [×]           │ │
│ │ CS-101-INTRO-ML     [×]           │ │
│ │ + add subject                    │ │
│ │ ws-24gb (24 units)               │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ② WINDOW                             │
│ ┌──────────────────────────────────┐ │
│ │ from  2026-04-09 08:00 CST      │ │
│ │ to    2026-04-09 14:00 CST      │ │
│ │ ⚠ 6 h 0 m · campus-local        │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ③ ALLOWANCES  (what survives)        │
│ ┌──────────────────────────────────┐ │
│ │ ✓ RESV-…-EXAM-01  ws-gpu-03…11 │ │ │
│ │ ✓ RESV-…-EXAM-02  ws-gpu-12…20 │ │ │
│ │ ✓ RESV-…-EXAM-03  ws-gpu-21…26 │ │ │
│ │ exact reservation ids only       │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ④ CONSEQUENCES         ● computed    │  ← the gate
│ ┌──────────────────────────────────┐ │
│ │   37   requests will be denied   │ │
│ │   14   of them are RUNNING now   │ │
│ │    3   exam reservations survive │ │
│ │    6   machines return to pool   │ │
│ │  8.5  GPU-hours reclaimed        │ │
│ ├──────────────────────────────────┤ │
│ │ by rule    R-FRZ-01 × 37        │ │
│ │ by subject CS-340-CV      21    │ │
│ │            CS-480-VLM      9    │ │
│ │            CS-101-INTRO-ML 7    │ │
│ │ surviving  EXAM-01  ws-gpu-03…11│ │
│ │            EXAM-02  ws-gpu-12…20│ │
│ │            EXAM-03  ws-gpu-21…26│ │
│ │ next protected window  none <14h│ │
│ └──────────────────────────────────┘ │
│                                      │
│ ⑤ REASON  (required)                │
│ ┌──────────────────────────────────┐ │
│ │ CS-480-VLM final examination —   │ │
│ │ 24 machines reserved for the exam│ │
│ │                          3 / 140 │ │
│ └──────────────────────────────────┘ │
│                                      │
├──────────────────────────────────────┤
│ ⑥  ┌────────────────────────────┐  │  ← sticky action bar
│    │      ACTIVATE FREEZE       │  │    disabled until ④ rendered
│    │   publishes policy v42     │  │    AND ⑤ non-empty
│    └────────────────────────────┘  │
│    ⓘ reversible only by lifting it │
└──────────────────────────────────────┘
```

### The active state (after activation, same viewport)

```
┌──────────────────────────────────────┐
│ ⛔ FREEZE ACTIVE              05:12:38│  ← countdown to 14:00, alarm-red
│ FRZ-2026-04-09-001                    │
│ SUBJECT {CS-340-CV, CS-480-VLM,       │
│          CS-101-INTRO-ML}             │
│ [08:00:00, 14:00:00) campus-local     │
│ by Dr. Rebecca Reed · 07:14:22        │
│ "CS-480-VLM final examination…"      │
├──────────────────────────────────────┤
│ denied so far        37               │
│ surviving            3               │
│ [ View denied requests ]              │
│ [ View in journal ]                   │
├──────────────────────────────────────┤
│  [  LIFT FREEZE  ]                    │  ← opens a modal that
│                                      │    requires lift_reason
└──────────────────────────────────────┘
```

### Annotation

| # | Decision | Why it matters |
|---|---|---|
| 1 | Single column, 44 px targets, no hover-only affordance | Used under time pressure, one-handed, possibly wearing gloves in a server room. |
| 2 | The action bar is **sticky but disabled** until ④ and ⑤ are complete | Dr. Rebecca Reed always sees where the button is and why it is unavailable, rather than discovering the gate after tapping. |
| 3 | The button's own subtitle states the consequence — `publishes policy v42` | She is about to change the rule set, not merely flip a switch. Naming that is the difference between a toggle and an act. |
| 4 | Surviving reservations are listed as **machine ranges** | A count of "3" would not let her verify the exam's own machines were excluded. `ws-gpu-03…11` does. |
| 5 | `exact reservation ids only` is stated inline | This is the OQ-1 resolution made visible. Dr. Reed who believes a whole subject is exempt will be corrected here, not after activation. |
| 6 | `by rule R-FRZ-01 × 37` | Even the preview is explainable. She can see the rule that will produce the denials before they happen. |
| 7 | `ⓘ reversible only by lifting it` under the button | SC 3.3.4 (Error Prevention) is satisfied by disclosure *and* by the preview gate, not disclosure alone. |
| 8 | The token's lifetime is on the card, not in a toast | `valid for 60 s` is rendered inside the preview region, because the failure it prevents is a person pressing ACTIVATE at 61 s and being refused with no explanation of why the button was there a moment ago. The refresh is one tap |
| 9 | `next protected window  none <14 h` sits **inside** the preview, on the same card as the count | It is the tile that consumes `required_node_count` (`prd.md` AG-10), and it is the number a person would otherwise ask for out loud — *"does anything need the lab after this?"* A consequence preview that answers the question she has but not the question she has asked is half a preview |

### The degraded path, which a wireframe for the happy state will not show

The banner above is one of two ways the gate can fail closed. The other is the case EC-4.19 records, and drawing only the first would misrepresent the design as *refuses when uncertain* when it is in fact **refuses unless a named person chooses otherwise, in writing**.

```
┌──────────────────────────────────────┐
│ ◆ SYSTEM                             │
│ PARTIAL CONSEQUENCE PREVIEW            │
│ reservations.v1 — CheckBindings       │
│   connect timeout (40 ms cap)        │
│ effect 3 exam reservations could not │
│   be confirmed. 37 is a LOWER BOUND. │
│                                      │
│  requests refused      37  ≥         │
│  of which RUNNING      14             │
│  reservations verified  ?  (2–5)     │
│  next protected w/n  none <14 h       │
├──────────────────────────────────────┤
│ [ Recompute ] [ RETRY ]              │
│ ┌──────────────────────────────────┐ │
│ │ ACTIVATE WITHOUT VERIFIED        │ │
│ │ RESERVATIONS            role: INSTR│ │
│ │ requires a second reason:       │ │
│ │ [ CS-480-VLM final — timetable  │ │
│ │   port down, 3 unverified      ] │ │
│ │             [ Confirm ]         │ │
│ └──────────────────────────────────┘ │
│ recorded as degraded_preview: true   │
└──────────────────────────────────────┘
```

Three properties, and the third is the one that matters.

1. **A lower bound is still shown, stamped as one.** A blank count during an emergency is worse than a partial count with a stated limit, because a blank tells the reader the module knows nothing and a stamped lower bound tells her the module knows *at least* this much. `STALE FACTS` in the ContextBar is already amber; the tile carries its own `≥` so the stamp survives being read alone on a phone.
2. **The unsafe path is visible, named, and re-gated.** It is offered only to `role_tier ≥ INSTRUCTOR`, it re-reads the role server-side, it requires a **second, separate** reason field, and it records `degraded_preview: true` on the `FreezeState` so the journal shows the freeze was activated against a fleet state nobody could fully enumerate. A module that only refused would be safer and less useful during an examination; a module that proceeded silently would be the failure this console exists to prevent.
3. **The degraded state is visible to everyone, not only to the person who pressed the button.** The active banner afterwards reads `FREEZE ACTIVE · degraded preview · 3 reservations unverified at activation`, permanently, with a link to the activating reason. An emergency that closed the fleet on partial information is a fact the lab needs on the record — and the person who has to explain it at 09:00 is not the person who pressed the button.

### The blocked-activation state (verified by `test/scenario/sa-5.test.ts`)

```
┌──────────────────────────────────────┐
│ ◆ SYSTEM                             │
│ CANNOT COMPUTE THE AFFECTED SET      │
│ port  timetable.v1.Timetable         │
│       GetProtectedWindows            │
│ cause connect timeout, aborted at    │
│       the 40 ms fact cap             │
│ effect a 61-second-old timetable may │
│        miss a class that started      │
│        9 minutes ago, so 37 is NOT a  │
│        lower bound. Pressing ACTIVATE  │
│        on this count could close the   │
│        fleet on a reservation the      │
│        preview never saw.              │
│ retry 00:41        [ Retry now ]     │
├──────────────────────────────────────┤
│  [  ACTIVATE FREEZE  ]   ← disabled  │
│  ⓘ blocked: affected set not computed│
└──────────────────────────────────────┘
```

**The banner names the *effect*, not just the fault.** "The timetable port is down" is a fact. "A 61-second-old timetable may miss a class that started 9 minutes ago, so 37 is not a lower bound, and pressing ACTIVATE on it could close the fleet on a reservation this preview never saw" is a reason. The second sentence is the one that changes what the reader does, and a fault message that does not change what the reader does is a log line with a background colour. A freeze pressed on facts that may under-count the affected set, during an examination, is the one accident this console exists to prevent.

**The tolerance named is per port, and that is a revision 3 correction.** The earlier version of this banner said "a 60-minute-old schedule", which was wrong twice: the timetable's admission tolerance is **60 seconds**, not 60 minutes (revision 1 imported spine rule 2's cluster-state bound and applied it to a schedule), and there is no longer a single number, because the fleet is two ports with two different classes. A banner that quotes a tolerance the module does not enforce is worse than one that quotes none, because it invites a decision the reader is not entitled to make. (Edge-case findings **EDGE-6**, **EDGE-27**.)

### Greyscale + keyboard check

- The active state is identifiable without colour: `⛔` glyph, the word `FREEZE ACTIVE`, and the mono countdown. The alarm-red top border is the third channel, not the first.
- Keyboard traversal: ① scope (checkbox group) → ② window (2 date inputs) → ③ allowances (checkbox group) → ④ preview (renders on `blur` of ③) → ⑤ reason (`textarea`) → ⑥ ACTIVATE. Focus ring is 2 px `--border-2` and is **present on the disabled button** so a screen-reader user can discover the gate and its reason.
- The degraded path's second reason field is a **separate focus stop** after the unsafe button, not a field inside it. A confirmation that collects its own justification inline is a confirmation whose justification is one mis-tap from being skipped, and this is the one place in the module where a mis-tap has consequences a person cannot undo.
- At 400 % zoom on a 390 px viewport, the `≥ 37` stamp and the `role: INSTRUCTOR` label both remain visible. A degraded emergency path that is only reachable at 100 % is not a path, it is a privilege of the equipment.
- 320 CSS px: reflows to the same single column with 16 px margins; no horizontal scroll.
