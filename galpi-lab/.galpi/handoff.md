# Handoff (최신이 맨 위)

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
