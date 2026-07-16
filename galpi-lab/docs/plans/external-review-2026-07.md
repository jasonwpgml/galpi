# 외부 리뷰 반영 정리 — 2026-07

외부 비교 분석 보고서(Google Docs, "Galpi AI-First 로드맵에 대한 아키텍처적 개선 방안 및 글로벌 유사 연구·프로젝트 비교 분석")를 검토하고,
인용된 출처를 직접 검증한 뒤 로드맵에 반영할 항목을 정리한다.

## 출처 검증 결과

보고서의 핵심 출처 6개를 직접 확인했고 전부 실재하며 수치도 대체로 정확하다.
단, 유효 토큰 공식은 보고서 표기가 아니라 GitHub 원문 기준으로
`ET = m × (1.0·I + 0.1·C + 4.0·O)`가 맞다 (m = 모델 단가 배수, I = 비캐시 입력, C = 캐시 읽기, O = 출력).

## 보고서 5개 제안의 판정

| 제안 | 판정 | 반영 |
|---|---|---|
| ① 드리프트 자동 감시 (`galpi watch`, sync-check) | 절반은 기존 로드맵에 있음 — Phase 2의 tree hash 비교→stale(5) 강등, pre-commit/CI 연결. 실시간 워처만 신규 | 보류. 세션 시작 훅 + pre-commit 검증으로 먼저 커버 (Codified Context의 드리프트 검사기도 상시 워처가 아니라 세션 훅 + git 커밋 파싱 방식) |
| ② tree-sitter/LSP로 F·Y·X 자동 생성 | 기존 Phase 3 `galpi build`와 동일. 하이브리드 LSP식 타입 해석만 신규 아이디어 | Phase 3 구현 시 참고 |
| ③ MCP 지양, CLI/파일 우선 | 갈피는 이미 파일 기반 — 개선점이 아니라 현 설계의 방어 근거 | 근거 자료로 보존 (MCP 도구 40개 서버가 회당 8–12KB 순수 오버헤드, CLI 대치로 최대 62% 절감) |
| ④ DEAD/LOCK 물리적 차단 (PreToolUse 훅) | **진짜 신규.** 현재 상태 규약은 프롬프트 추종에만 의존 | **Phase 2 체크리스트에 추가함** |
| ⑤ ET 지표 공식화 | **다음 단계(Phase 1.5)에 직결.** Phase 1은 input+output 원시 합계로 측정 — Claude Code는 캐싱 비중이 커서 왜곡 가능 | **Phase 1.5 체크리스트에 추가함** |

## 출처에서 직접 얻은 추가 인사이트 (보고서에 없음)

1. **multi-file 변경에서 구조 인덱스 효과가 최대** — supercoder-eval ablation:
   위치 특정 acc@5 44.3%→84.5%(+39.6pp), 특히 3개 파일 이상 변경에서 44.9%→91.3%.
   Phase 1의 열린 질문("저장소가 커지면 갈피가 No Galpi를 이기는가")에 대한 실험 설계 답:
   fixture 크기만 키우지 말고 multi-file 시나리오를 넣어야 한다. → Phase 2 체크리스트에 반영함.
2. **구조 인덱스 단독은 품질 하락 트레이드오프** — Codebase-Memory: 토큰 10배·도구 호출 2.1배
   절감했지만 답변 품질 0.92→0.83. 갈피의 "route로 찾고 실제 코드는 직접 읽는" 하이브리드가
   이 트레이드오프를 피하는 설계라는 논거.
3. **드리프트 감지의 가장 싼 선례** — Codified Context(108K LoC, 283세션 실측)의 검사기는
   세션 시작 훅에서 최근 git 커밋을 파싱해 "소스는 바뀌고 명세는 안 바뀐" 파일을 경고.
   로드맵 Phase 5의 세션 훅 항목과 같은 사상 — 실시간 워처보다 이쪽이 먼저다.
4. **AGENTS.md 진입점은 생태계 표준과 호환** — 2026년 중반 기준 6만+ 저장소 사용.
   진입점 AGENTS.md + 런타임 `.galpi/` 분리 구조는 유지.
5. **Phase 1.5 에이전트 정정** — Phase 1 본 측정이 Codex(gpt-5.6-sol)였으므로 교차 검증
   에이전트는 Claude Code다. → 로드맵 Phase 1.5에 정정 메모 추가함.

## 우선순위

1. Phase 1.5 착수 시: runner에 캐시/비캐시 토큰 분리 수집 + ET 병기 (반영 완료).
2. Phase 2: PreToolUse 훅 게이팅 (반영 완료).
3. Phase 2 실험 설계: multi-file 변경 시나리오 (반영 완료).
4. 실시간 워처·하이브리드 LSP는 Phase 3 이후 재평가.

## 출처

1. Aider repository map — https://aider.chat/docs/repomap.html
2. GitHub, Improving token efficiency in Agentic Workflows — https://github.blog/ai-and-ml/github-copilot/improving-token-efficiency-in-github-agentic-workflows/
3. Codified Context (arXiv 2602.20478) — https://arxiv.org/html/2602.20478v1
4. SWE-agent ACI — https://swe-agent.com/0.7/background/aci/
5. Code Isn't Memory / supercoder-eval (arXiv 2606.22417) — https://arxiv.org/html/2606.22417v1
6. Codebase-Memory MCP (arXiv 2603.27277) — https://arxiv.org/html/2603.27277v1
7. AGENTS.md 가이드 — https://www.augmentcode.com/guides/how-to-build-agents-md
8. AGENTS.md vs llms.txt — https://llms-txt.io/blog/what-is-agents-md
