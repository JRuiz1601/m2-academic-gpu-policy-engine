# Assignment source evidence

PDF SHA-256: b403c0705fef5f80d437d0625e92daa81fc8cc76614b92f6ffa114a727f4bf90
Tool: pdftotext (local PDF; no external source).
Line numbers below belong to this extraction; pagination/line wrapping differs from the task estimates.

```text
600: 
601: Artifact you
602: produced
603: 
604: Defect it caught in your
605: package
606: 
607: 
608: 7. Phase 4 — epics.md and Sprint Planning (40 min)
609: Goal: Produce a vertical-slice backlog whose every story is bound to contracts, schemas, ADn invariants and ATDD tests, then pass the readiness gate and generate sprint-status.yaml.
610: Step 4.1 — Epic & Story Creation
611: /bmad-create-epics-and-stories
612: 
613: # John (PM) + Amelia (Dev) review for implementability
614: 
615: Write planning/epics.md following these rules.
616: Structure rules * 3–4 epics, each a vertical slice that delivers user-visible value for a named
617: protagonist (not “Database layer”, not “API layer”). * 3–5 stories per epic (9–16 total). Each
618: story is independently completable; no forward dependencies (a story may only depend on
619: earlier stories). * Epic 1 is a walking skeleton: seed fixtures + one end-to-end happy path
620: through all layers + the simulated adapters. * The Mandatory Edge Case and ≥ 2 failure
621: states of your module each have a dedicated story.
622: Story template (copy for every story)
623: 
624: Step 4.2 — Sprint Readiness Audit
625: /bmad-sprint-planning
626: 
627: The skill (a) judges whether a developer could implement your epics without inventing
628: decisions nothing records, then (b) on a passing gate parse epics.md and generates sprintstatus.yaml.
629: Gate verdict
630: 
631: Meaning
632: 
633: What you must do
634: 
635: PASS (≡ IRPASS)
636: 
637: Plan is
638: implementable as
639: recorded
640: 
641: Sprint tracking generated; copy terminal output into
642: 
643: CONCERNS
644: 
645: Non-blocking gaps
646: 
647: Record each with mitigation + the architect’s (your)
648: sign-off; proceed only if documented
649: 
650: FAIL (≡ IRFAIL)
651: 
652: Not implementable
653: as recorded
654: 
655: Fix with the named skill (bmad-architecture, bmad-createepics-and-stories, bmad-correct-course), re-run until
656: PASS. A FAIL is a compiler error — “close enough”
657: is not accepted.
658: 
659: readiness-gate-report.md
660: 
661: What the audit checks (verify these yourself before you run it):
662: 1.
663: 2.
664: 3.
665: 4.
666: 
667: Every PRD FR/NFR trace forward to ≥ 1 story; every story traces back to a requirement
668: (no orphans in either direction).
669: Every UX screen state (Loading / Empty / Error / Success / Denied) has a backing
670: contract + DTO.
671: Every AD-n appears in ≥ 1 story’s Binding invariants and has a red test.
672: No epic depends on a later epic; no story depends on a later story.
673: 
674: 
675: 5.
676: 6.
677: 
678: Artifacts do not contradict each other (e.g., PRD NFR says 50 ms, epic AC says 200
679: ms).
680: Every previous review finding (Plan-2 Phases 1–3 + this unit) is triaged and, if Accepted,
681: visibly fixed.
682: 
683: Step 4.3 — Gate Drill (5 min, mandatory)
684: Deliberately break one link (e.g., delete the Binding invariants line of one story, or rename a
685: DTO in a story but not in dto.*), re-run /bmad-sprint-planning, and record: what the gate reported,
686: which skill fixed it, how long it took. Restore the link and re-run until PASS. This proves the gate
687: is a real control and not a rubber stamp.
688: 
689: 8. Phase 5 — Wrap-up (10 min)
690: 1.
691: 2.
692: 3.
693: 4.
694: 5.
695: 
696: Update ARCHITECTURE.md to v2 (link to contracts.md, ports-and-adapters.md, schemas/).
697: Complete ai-log/decision-log-solu2.md (see requirements below).
698: Final run: /bmad-testarch-trace → test/traceability-matrix.md shows 100% of P0
699: requirements linked to a story and a red test.
700: Run /bmad-walkthrough (optional) to rehearse the 3-minute explanation each partner must
701: be able to give.
702: Tag the repository: git tag solu2-ready.
703: 
704: 9. Suggested submission Package
705: ├── planning/
706: │ ├── prd.md
707: # from Plan-2 (updated only via triaged findings)
708: │ ├── ARCHITECTURE.md
709: # v2: gap fixes + links to the detailed design
710: │ ├── detailed-design/
711: │ │ ├── contracts.md
712: # P/Q/I x3 operations, error catalog, binding table
713: │ │ ├── ports-and-adapters.md
714: # layer map + Mermaid component diagram
715: │ │ └── schemas/
716: │ │
717: ├── 001_<module>_schema.sql
718: │ │
719: ├── dto.(py|ts)
720: │ │
```

Source distinction: the assignment says PASS ≡ IRPASS, CONCERNS, FAIL ≡ IRFAIL. READY / NEEDS WORK / NOT READY is the readiness workflow vocabulary; equating those terms to PASS / CONCERNS / FAIL is the handover convention, not a quotation from this PDF.
