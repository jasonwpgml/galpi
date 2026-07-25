## 2026-07-25 codex — Phase 2 CLI review + runtime smoke
### Files reviewed
tools/galpi/check.ts — FINDING
tools/galpi/cli.ts — PASS
tools/galpi/doctor.ts — PASS
tools/galpi/galpi.test.ts — PASS
tools/galpi/gp.ts — PASS
tools/galpi/hooks/pretooluse.mjs — FINDING
tools/galpi/imports.ts — PASS
tools/galpi/model.ts — PASS
tools/galpi/mutate.ts — FINDING
.githooks/pre-commit — PASS
### Runtime smoke
npm run galpi -- check (initial) — PASS, exit 0, `OK|errors=0`
npm run galpi -- check --human — PASS, exit 0, `문제 없음 (errors=0)`
npm run galpi -- doctor — PASS, exit 0, `OK|findings=0`
npm run galpi -- set-state st 1 — PASS, exit 0, `OK|set-state_st_1`
npm run galpi -- check (after set-state) — PASS, exit 0, `OK|errors=0`
npm run galpi -- add-route codextest st.list — PASS, exit 0, `OK|add-route_codextest_st.list`
npm run galpi -- rm-route codextest — PASS, exit 0, `OK|rm-route_codextest`
npm run galpi -- set-state st 0 — PASS, exit 0, `OK|set-state_st_0`
git status --porcelain — PASS, exit 0, empty output; no restore needed
DEAD hook probe — PASS, exit 2, `DENY|dead|d=lg|path=src/legacy/importer.ts`
### Findings
1. tools/galpi/mutate.ts:31 | severity med | An exception during source/MAP/view writes or validation escapes without rollback and can leave a partially mutated runtime. | Wrap the full mutation in try/finally and restore byte snapshots of every touched file on any failure.
2. tools/galpi/check.ts:227 | severity med | `plan_has_code` checks only immediate files, so code nested below a PLAN domain directory is not detected. | Walk the PLAN directory recursively and report when any source file exists.
3. tools/galpi/hooks/pretooluse.mjs:38 | severity med | On Windows, case-variant paths such as `SRC/LEGACY/importer.ts` bypass the case-sensitive DEAD/LOCK and derived-path comparisons. | Compare canonical containment paths with Windows-aware case folding.
### Verdict
ACCEPT WITH FINDINGS — The CLI and DEAD-path hook operate correctly in Codex, but the three enforcement and rollback defects should be fixed.
