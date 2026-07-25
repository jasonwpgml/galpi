# Handoff (최신이 맨 위)

## 2026-07-25 claude (7) — CI wired; latent stale false-positive fixed

- Done:
  - `.github/workflows/check.yml` (repo root, since the git root is the monorepo parent):
    push to main + PR → `npm ci && npm run check` (typecheck, 15 tests, `galpi check`,
    build) with `working-directory: galpi-lab`, npm cache keyed on
    `galpi-lab/package-lock.json`, plus a non-blocking `galpi doctor` step. This closes
    the last open Phase 2 checkbox — the roadmap had deferred it "until CI infra exists".
  - Fixed a latent false positive found while wiring it: `checkGitState` ran
    `git rev-parse HEAD:<domain.path>`, which git resolves from the **repo root**, while
    domain paths are relative to the Galpi root (`galpi-lab/`). Any domain carrying a
    `verified=` field would have reported `stale|got=?` forever. Now `HEAD:./<path>`.
    Dormant until now only because no domain uses `verified=` yet.
- Verification ledger:
  - target: `.github/workflows/check.yml` | check: YAML parses (5 steps, keys as
    expected); `npm ci --dry-run` confirms the lockfile is in sync | evidence: run output
  - target: `check.ts` git-path fix | check: injected
    `verified=515ffd4c...` on domain `a` in a scratch copy of source.gp → `OK|errors=0`
    (pre-fix this path yields `stale|got=?`); source.gp restored, `git status` clean
  - target: full gate | check: `npm run check` green — typecheck + 15/15 + build
  - target: the workflow end-to-end | check: pushed main to origin (17 commits,
    `92fdcaf..f30a862`) and the run executed | evidence: run `30147431597` SUCCESS in 22s,
    every step green including `npm ci`, `npm run check`, advisory doctor. No Node 20 vs 24
    drift appeared. Follow-up run `30147472298` green after bumping checkout/setup-node to
    v7 (the v4 pins raised a deprecated-action-runtime warning); annotations now clean.
- Next: Phase 2 is fully closed. Phase 3.5 (messy fixture M0-M3 + the MF1-MF4 multi-file
  scenarios) is the next substantial phase; note its measurement batches are a cross-agent
  gate, so the ledger's no-re-verify rule does not apply to them (§6 rule 6).

## 2026-07-25 claude (6) — Phase 2 closed: Codex CLI review landed, 3 findings fixed

- Done:
  - Delegated the open Phase 2 item "Codex 환경에서 CLI 동작 확인" to a Codex session
    (`codex exec`, diff-scoped per §6 rule 4, ledger items marked no-re-verify in the
    prompt). Codex report: `docs/worklog/codex.md`, verdict `ACCEPT WITH FINDINGS`,
    ~62k tokens for the whole review+smoke pass.
  - Codex runtime smoke in a Codex environment: 10/10 PASS — check, check --human,
    doctor, set-state/add-route/rm-route round-trip leaving `git status` empty, DEAD
    hook probe `DENY|dead|d=lg` exit 2. This is the cross-environment proof the item
    was asking for; the CLI is not Claude-session-dependent.
  - Fixed all 3 med findings (I opened only the 3 flagged files, per §6 rules 4-5; the
    review itself was not re-evaluated):
    1. `mutate.ts` — rollback only restored `source.gp`, so a throw inside syncMap /
       syncViewStates / runCheck could strand a mutated source with unsynced MAP/views.
       Now snapshots source+MAP+views+status files before the first write and restores
       on both validation failure and exception.
    2. `check.ts` — `plan_has_code` scanned only the PLAN directory's immediate files;
       code under `src/<plan>/sub/` was invisible. Now recursive (`containsFile`).
    3. `hooks/pretooluse.mjs` — on case-insensitive filesystems `SRC/LEGACY/x.ts`
       bypassed the DEAD/LOCK and derived-artifact compares. Now folds case on
       win32/darwin for matching only; DENY packets keep the original spelling.
  - Logged findings 2-3 as the first 미탐 entries in `docs/experiments/phase2-check.md`;
    finding 1 recorded under 알려진 한계. Both Phase 2 checkboxes ticked.
- Verification ledger:
  - target: `tools/galpi/**` @ Codex review | check: diff-scoped code review + 10-command
    runtime smoke in a Codex session | evidence: `docs/worklog/codex.md` (2026-07-25)
    | hash: `b5edc97`
  - target: `tools/galpi/{mutate,check}.ts`, `hooks/pretooluse.mjs` (post-fix) | check:
    `npm run check` — typecheck + 15/15 tests + `galpi check` OK|errors=0 + build green
    | evidence: run output. 2 new regression tests: nested `plan_has_code`, case-variant
    DEAD hook denial.
  - not verified: mutation rollback-on-throw has no test (needs fault injection); the
    fix is by inspection only.
- Next: Phase 2 checklist is fully ticked except CI wiring, which the roadmap defers
  until CI infra exists (repo has an origin remote but no workflows). Phase 3.5 (messy
  fixture, M0-M3 + the MF1-MF4 multi-file scenarios in
  `docs/experiments/phase2-multifile-design.md`) is the next substantial phase.
- 주의: the C4 login-scenario route/state regression (67%→33%, n=3) is still
  uninvestigated by design — revisit only if it repeats in Phase 3.5.

## 2026-07-19 claude (5) — C4 hook-gating re-measurement; multi-file scenario design landed

- Done:
  - Committed prior session's leftover work: `docs/experiments/phase2-multifile-design.md`
    (MF1-MF4 scenarios) + roadmap tick (commit `2360c8b`).
  - Full Claude C4 batch completed: retried the 18 usage-limit-excluded runs from
    `claude-c4-1` via `--retry-excluded`; batch now 45/45 valid.
  - Analysis written: `docs/experiments/phase1-claude.md` "C4 훅 게이팅 재측정" section.
    Headline: C3's only remaining deficit (Claude total tokens +12.1% vs B) shrank to
    +1.9%, with ET and cost flipping to a net win (-1.3%/-2.8%) and route/state
    compliance improving further (+26.7pp vs B, up from C3's +20pp). Strict gate still
    `acceptsC: false` (3 near-miss axes: total tokens, first-relevant-command,
    unrelated-reads), but the deficit shrank ~6x — no impact on the already-approved
    Phase 2 entry decision.
  - Anomaly logged (not yet investigated): login scenario route/state regressed
    67%→33% in C4 vs C3, single scenario, n=3 — flagged in report as low priority,
    revisit if the pattern repeats in Phase 3.5 messy-fixture runs.
  - Roadmap v3 and this handoff updated with the result.
- Verification ledger:
  - target: `phase1-ai/fixture-c4` (`b6b8c20`) | check: `git ls-tree -r` on
    src/docs/plans/package/tsconfig against fixture-c3 — byte-identical | evidence: no
    diff output | hash: `b6b8c201f51fa24a7809caeebab91b3314249555`
  - target: `scripts/phase1-ai-first-runner.mjs` (C label bump to C4) | check:
    `--validate-only --agent=claude` → VALID | evidence: stdout
  - target: `claude-c4-1` batch | check: 45/45 valid, 0 excluded after retry | evidence:
    `aggregate.json` validity block
- Next: no blocking follow-up from this measurement. Remaining Phase 2 items unchanged
  from prior handoff: Codex-side CLI review/run, ongoing false-positive/negative
  logging in `docs/experiments/phase2-check.md`. Phase 3.5 (messy fixture) is the next
  substantial phase and will fold in the MF1-MF4 multi-file scenarios per
  `docs/experiments/phase2-multifile-design.md`.

## 2026-07-19 claude (4) — Phase 2 core landed (check/doctor/mutations/hook gating)

- Human decisions recorded: C3 adopted as the GALPI/1 standard grammar; Phase 2 entry
  approved. Phase 1.5 closed (see roadmap gate memo).
- Done:
  - Live `.galpi` runtime migrated to C3 grammar (BOOT behaviors, lg.import view).
  - `tools/galpi/` CLI (`npm run galpi -- <cmd>`): `check` (schema, dup ids, states,
    refs, view/MAP desync, plan_has_code, dead_import, verified-hash stale,
    lock_modified; `--ai` default / `--human`), `doctor` (ambiguous names, large/mixed
    files, deep imports, far tests, missing_anchor via view constraint links),
    mutations `set-state|add-route|rm-route|add-task|add-domain` (validate, write,
    re-check, rollback on failure; MAP + view states resynced).
  - PreToolUse hook `tools/galpi/hooks/pretooluse.mjs` + `.claude/settings.json`:
    denies Write/Edit on DEAD/LOCK domain paths and derived artifacts (exit 2).
  - Pre-commit: `.githooks/pre-commit` runs `galpi check` when galpi-lab is staged;
    `core.hooksPath=.githooks` set locally.
  - False-positive log started: `docs/experiments/phase2-check.md` (2 doctor
    heuristics tightened during bring-up).
- Verification ledger:
  - target: `tools/galpi/**` | check: `tsx --test tools/galpi/galpi.test.ts` 8/8 pass,
    `npm run check` (typecheck + 12 app tests + galpi check + build) green
  - target: hook | check: manual stdin probes — dead path exit 2, derived exit 2,
    normal path exit 0
  - target: live runtime | check: `galpi check` OK|errors=0, `galpi doctor` findings=0
- Next (Codex): review `tools/galpi/**` (diff-scoped per ledger rules) and run the CLI
  in a Codex session (roadmap item "Codex 환경에서 CLI 동작 확인").
- Remaining Phase 2 items: multi-file fixture scenario design; CI wiring (no CI infra
  in repo yet); ongoing false-positive/negative logging.

## 2026-07-19 claude (3) — Codex-side C3 re-measurement complete; gate synthesis ready

(English per the v3 §5 language policy adopted today.)

- Done: full A/B/C3 Codex batch (`codex-c3-1`, gpt-5.6-sol, 45/45 valid).
  **Strict gate PASS (`acceptsC: true`), all axes**: accuracy 100%, route/state 100%,
  unrelated reads -89%, repo-wide search 0%, tokens -20.3% (better than C2's -16.6%).
  Report: `docs/experiments/phase1-claude.md`, "Codex 측 C3 재측정" section.
- Runner changes: (a) codex.exe launch fallback (`CODEX_EXE` / default install path)
  because `CODEX_MANAGED_PACKAGE_ROOT` only exists inside Codex sessions — identical
  exec flags, smoke-verified; (b) sorting status-first grader now resolves same-command
  ties by intra-command text order (upgrade-only). Both batches reanalyzed; Claude
  numbers unchanged, Codex C3 state 80%→100% (3 ties were compliant), Codex B stays 66.7%.
- Operator note: this Codex batch was *operated* by a Claude session (measurement
  subject is the Codex CLI). Deviation from the role split is recorded here and in the
  report; Codex may re-verify via the ledger below.
- Verification ledger:
  - target: `codex-c3-1` batch | check: 45/45 valid, 0 excluded | evidence: aggregate.json
    validity block | fixture hash: `3c5a284`
  - target: runner codex.exe fallback | check: `--validate-only` + 1 smoke run
    (`codex-c3-smoke-1`, PASS, flags compatible) | evidence: smoke output
  - target: tie-resolution grading | check: reanalysis of both batches; before-states
    preserved in `results.before-reanalysis.json`
- Next (human decision): adopt C3 as GALPI/1 standard grammar; approve Phase 2 entry.
  The only remaining deficit is Claude's compliance token cost (+12.1% vs B), which
  Phase 2's PreToolUse hook gating directly targets. Defer per-model profiles until
  hook gating is measured.
- Next (Codex, optional): independent re-verification of `codex-c3-1` under the ledger
  rules (hash unchanged → no re-run needed unless disputed).

## 2026-07-19 claude (2) — C3 격리 재측정 완료

- 완료: C3 fixture 제작(`phase1-ai/fixture-c3` = `3c5a284`), 러너 CONDITIONS.C를 C3로 갱신,
  격리 스모크(`c3-smoke-1`), 본 측정 45회(`claude-c3-1`, r3 usage_limit 15회는
  `--retry-excluded`로 재실행해 45/45), 보고서·로드맵 갱신.
- 검증됨 (검증 원장):
  - 대상: `phase1-ai/fixture-c3`(`3c5a284`) | 검증: 소스 트리 A/B/C2와 byte-identical
    (`git ls-tree -r` src/docs/plans/package/tsconfig 대조) | 근거: diff 출력 없음 | hash: `3c5a284`
  - 대상: `scripts/phase1-ai-first-runner.mjs` | 검증: `--validate-only` 통과
    (fixture parity + condition structure) | 근거: "VALID" 출력
  - 대상: `claude-c3-1` 배치 | 검증: auto-memory 격리 — 45/45 로그에서 init-event
    `memory_paths` 0건 | 근거: `grep -c memory_paths logs/*.jsonl` 전부 0
  - 대상: `claude-c3-1` 집계 | 검증: 45/45 유효, excluded 0 | 근거: `aggregate.json` validity 블록
- 판정: Claude 측 `acceptsC: false` 유지, 실패 축 반전(규율·정확도 승, 토큰 패).
  상세는 `docs/experiments/phase1-claude.md` "C3 격리 재측정" 섹션.
- 다음 할 일 (Codex): **Codex 측 C3 재측정** — 동일 fixture(`3c5a284`), A/B/C 각 15회.
  Codex는 auto-memory 메커니즘이 없어 격리 조치 불요. 관건: C2에서 규율 100%였던
  Codex에서 C3 명시성이 토큰만 늘리는지(순손해) 중립인지.
- 다음 할 일 (사람): 게이트 해석 판단 — "정확도 100% + 규율 우세 + 토큰 +12.1%"를
  실패로 볼지. 재작업 비용(오수정·DEAD 접근 0) 포함 시 우위일 수 있음.
- 주의: 이전 배치(`claude-full-1`)는 오염 확인됨 — 격리 배치와 수치 직접 비교 금지.

## 2026-07-19 claude

- 완료: 로드맵 v3 작성 (`Galpi_로드맵_AI_First_v3.md`), v2에 구버전 표시.
  변경 핵심: 하이브리드 정체성(구조 개선 + 인덱스), 헌법 11조, `@g` 폐기→AIDEV 앵커 수집,
  Phase 2 `galpi doctor`, Phase 3.5 신설(messy fixture, M0~M3), Phase 5 `galpi optimize`,
  협업 검증 원장(6절) 신설.
- 검증됨: (없음 — 문서 변경만, 코드·테스트 미변경)
- 다음 할 일: Phase 1.5 잔여 항목 — C3 opcode 명시성 상향 fixture 제작 후
  `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` 격리 적용, 양 에이전트 재측정.
- 주의: v3부터 상대 에이전트가 검증 원장에 기록한 항목은 대상 hash 일치 시 재검증 금지
  (재검증 트리거: hash 변경 / 테스트·게이트 실패 / 사람 요청). 리뷰의 리뷰 금지.
