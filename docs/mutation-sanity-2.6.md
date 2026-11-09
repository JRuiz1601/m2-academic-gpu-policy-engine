# Mutation sanity audit — story 2.6 (Blindly-Green check)

Method: one temporary production mutation at a time (single combined mutation in row 5), run `npm test` (unit + integration) and
`E2E_CHANNEL=chrome npx playwright test`, record which layer fails, restore the file. The runner was a throw-away script, not committed.

| # | Mutation | unit/integration | e2e |
|---|---|---|---|
| 1 | banner text shortened to "FLEET FROZEN" | killed (1 failed) | killed (2 failed) |
| 2 | banner always hidden (`hidden=true`) | not caught | killed (2 failed) |
| 3 | banner polls `scope=SUBJECT` instead of `scope=ALL` | killed (1 failed) | killed (2 failed) |
| 4 | banner always shown (`hidden=false`) | not caught | killed (2 failed) |
| 5 | no polling and no refresh after lift (banner would stay) | killed (1 failed) | killed (1 failed) |
| 6 | rationale text "Emergency freeze active" to "Freeze" | killed (3 failed) | killed (2 failed) |
| 7 | rationale drops the freeze reason | killed (2 failed) | killed (2 failed) |
| 8 | `unpackFreeze` stops carrying `reason` | **not caught** | killed (2 failed) |
| 9 | `/admin/policy-console` alias path changed | killed (2 failed) | killed (3 failed) |
| 10 | freeze ignores exam allowances | killed (1 failed) | **not caught** |

## Findings and corrections

* Rows 2 and 4 are DOM behaviour, so only the browser layer can see them: this is the intended job of the E2E layer.
* Row 8 exposed a gap: the integration layer never checked that the stored freeze reason reaches the DENY rationale; only the E2E did. Added
  `Freeze reason reaches the DENY rationale over HTTP` in `test/implementation/http.test.ts`; re-running mutation 8 now fails that test (1 failed, 19 passed).
* Row 10: the E2E cannot cover exam allowances because the simulator has no reservation source (the `reservation` port returns nothing, so an exam-bound request is rejected as invalid). That behaviour is covered at domain level in `test/unit/freeze-rationale.test.ts` (allowed and not-allowed exam-bound requests).
