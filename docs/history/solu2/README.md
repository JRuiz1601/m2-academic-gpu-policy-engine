# Solu-2 historical evidence

This folder keeps the evidence of the previous phase (Solu-2): reviews, AI logs, TEA reports, the red-phase ATDD results and the sprint pointer.
It is historical only: it is not the current gate and nothing in `npm run check` reads it.
The scripts moved here (`test/ci/readiness.mjs`, `verify-red.mjs`, `quality-gate.yml`) are retired and no longer run:
they checked the red-phase stubs and an all-backlog sprint file that Impl-1 deliberately replaced, and they already failed before this move.
The current control is `npm run check`; see the root README.
