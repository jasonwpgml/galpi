# Phase 1.5 — Claude Code 교차 검증

측정일: 2026-07-17 (r3 인프라 실패분은 2026-07-18 재실행)

최종 판정: **엄격 게이트 미통과 (`acceptsC: false`) — 로드맵 분기에 따라 C3 opcode 명시성 상향 후 양쪽 재측정 대상.**

## 요약

Phase 1 본 측정(Codex CLI, gpt-5.6-sol)과 동일한 fixture(A/B/C2)·시나리오 5종·조건별 15회
프로토콜을 Claude Code로 반복했다. 총 45회 유효 실행.

C2는 B 대비 토큰·비용에서 크게 이겼지만, 정확도와 탐색 효율에서 열세를 보였다.

- 실제 총 토큰 평균 567,777 → 413,689: **27.14% 감소**
- 유효 토큰(ET) 평균 99,901 → 77,930: **21.99% 감소**
- protocol component token proxy 평균 1,302.4 → 862.8: **33.75% 감소**
- 평균 비용 $0.387 → $0.329: **15.0% 감소**
- route 선택률 66.7% → 86.7%: **+20%p**
- 상태 규칙 준수율 60.0% → 66.7%: **+6.7%p**
- 작업 정확도 100% → 93.3%: **-6.7%p (1회 실패, r1-c-sorting 숨은 테스트)**
- 최초 관련 파일 도달 5.13 → 5.86 calls: **악화**
- 관련 없는 읽기 평균 1.33 → 3.20: **악화**
- 전체 저장소 검색률 13.3% → 26.7%: **악화**
- 평균 실행 시간 70.3초 → 99.8초: **악화**

Codex에서는 C2가 정확도 동률 + 전 지표 우세로 통과했으나, Claude에서는
"토큰은 아끼지만 탐색 규율이 흐트러지는" 비대칭 결과가 나왔다.

## 실행 조건

- Claude Code CLI `2.1.211`, 모델 `claude-sonnet-5`
- timeout 600초, ephemeral session, disposable detached worktree
- Claude Code 2.1.x는 `AGENTS.md`를 자동으로 읽지 않으므로 B/C worktree에
  비추적 `CLAUDE.md` 브리지("AGENTS.md를 따르라" 2줄)를 주입. 브리지는 protocol
  context로 집계하고 변경 감지에서 제외.
- 토큰 정규화: `input_tokens`는 캐시 읽기 포함(OpenAI 관행과 통일),
  `cached_input_tokens`는 캐시 읽기 몫. 유효 토큰
  `ET = 1.0·I_fresh + 0.1·I_cached + 4.0·O` (GitHub Agentic Workflows 공식) 병기.
  Claude는 입력의 94% 이상이 캐시 읽기라 원시 합계만으로는 B/C 비교가 왜곡된다.
- 인프라 실패: 1차 실행에서 r3의 12회가 Claude 세션 사용량 한도로 실패 →
  `--retry-excluded`로 해당 짝 그룹(A/B/C 트리플 전체)을 재실행해 45/45 완성.
  교체 전 원본 행은 `results.before-retry.json`에 보존.

## 집계

| 측정값 | A | B | C2 | C2 vs B |
|---|---:|---:|---:|---:|
| 작업 정확도 | 86.7% | 100% | 93.3% | -6.7%p |
| route 선택률 | N/A | 66.7% | 86.7% | +20%p |
| 상태 규칙 준수율 | N/A | 60.0% | 66.7% | +6.7%p |
| 최초 관련 파일 call | 3.21 | 5.13 | 5.86 | +14.1% |
| 읽은 파일 | 7.53 | 9.27 | 14.07 | +51.8% |
| 관련 없는 파일 | 3.27 | 1.33 | 3.20 | +140% |
| 전체 저장소 검색률 | 20.0% | 13.3% | 26.7% | +13.3%p |
| protocol component proxy tokens | 0 | 1,302.4 | 862.8 | -33.75% |
| 실제 총 토큰 평균 | 349,109 | 567,777 | 413,689 | -27.14% |
| 유효 토큰(ET) 평균 | 69,091 | 99,901 | 77,930 | -21.99% |
| 평균 비용 (USD) | $0.277 | $0.387 | $0.329 | -15.0% |
| 오수정률 | 0% | 0% | 0% | 동일 |
| 평균 실행 시간 | 54.9초 | 70.3초 | 99.8초 | +42.0% |

총계: A $4.15 / 5.24M tok, B $5.81 / 8.52M tok, C2 $4.61 / 6.21M tok.

## 시나리오별 결과

| 시나리오 | 정확도 A/B/C2 | B 총 tokens | C2 총 tokens | C2 절감 | C2 route/state |
|---|---:|---:|---:|---:|---:|
| DONE login | 100/100/100% | 441,357 | 427,534 | 3.1% | 100/100% |
| WIP+HOT sorting | 67/100/67% | 1,094,076 | 621,106 | 43.2% | 67/33% |
| PLAN billing | 67/100/100% | 196,359 | 190,517 | 3.0% | 100/100% |
| DEAD-like roster | 100/100/100% | 969,775 | 705,949 | 27.2% | 100/33% |
| non-exact route | 100/100/100% | 137,316 | 123,342 | 10.2% | 67/67% |

세부 관찰:

- 유일한 C2 정확도 실패는 r1-c-sorting: 숨은 테스트에서 정렬 결과 순서 불일치
  (삽입 순서 보존 의미를 어김). 같은 시나리오에서 A도 2/3만 통과(r2-a-sorting 동일
  유형 실패)했고, B는 3/3이지만 평균 1.09M 토큰을 소모해 힘으로 뚫었다.
  정확도 격차 -6.7%p는 이 1회 차이다.
- sorting과 roster가 격차의 진원지다. C2의 토큰 절감도 이 두 시나리오에서 최대
  (43.2%, 27.2%)지만, state 준수(33%)와 실행 시간 악화도 여기서 발생했다.
- Codex와 달리 Claude는 B/C 모두 프로토콜을 건너뛰는 실행이 있었다
  (B route 66.7%, C2 86.7%; Codex는 80%/100%). grep으로 바로 풀 수 있으면
  브리지-AGENTS-BOOT 경로를 생략하는 경향은 Momento 복사본 스모크에서 관찰된
  패턴과 일치한다. 정답률과 프로토콜 준수는 별개 축으로 봐야 한다.
- C2의 "읽은 파일 +51.8%"는 상당 부분 protocol View 읽기 자체다. 다만 관련 없는
  읽기(3.20)와 전체 검색률(26.7%)이 B보다 높다는 것은 View를 읽고도 라우팅을
  신뢰하지 않고 재검색했다는 뜻으로, opcode 명시성이 Claude에겐 부족하다는 신호다.

## 채점 보정

Codex 측정의 재분석 규칙에 더해, 조건 C의 `.galpi/` 상태 동기화 변경을 B와
동일하게 작업 범위 내로 분류하도록 checker를 수정했다(기존에는 B만 허용해 C의
오수정률이 13.3%로 과대 계상됐다). 보정 전 판정은 `results.before-reanalysis.json`
및 `results.before-retry.json`에 보존되어 있다.

## 두 에이전트 비교 (1페이지 요약)

| 항목 | Codex (gpt-5.6-sol) | Claude Code (claude-sonnet-5) |
|---|---:|---:|
| 정확도 B → C2 | 100% → 100% | 100% → 93.3% |
| 총 토큰 C2 vs B | -16.6% | -27.1% (ET -22.0%) |
| route 선택률 B → C2 | 80% → 100% | 66.7% → 86.7% |
| 상태 준수율 B → C2 | 73.3% → 100% | 60.0% → 66.7% |
| 최초 관련 도달 C2 vs B | -1.9% (빨라짐) | +14.1% (느려짐) |
| 관련 없는 읽기 C2 vs B | -53.3% | +140% |
| 실행 시간 C2 vs B | -7.5% | +42.0% |
| 엄격 게이트 | **통과** | **미통과** |

공통점: C2의 compact protocol은 두 에이전트 모두에서 토큰·비용을 유의미하게
줄이고 route/state 준수를 B보다 끌어올린다. parse 실패는 양쪽 0회 — `.gp` 문법
자체는 agent-agnostic하게 읽힌다.

차이점: Codex는 opcode 지시를 기계적으로 따르지만, Claude는 프로토콜 참조를
확률적으로 생략하고 자체 검색으로 대체한다. 그 결과 Codex에서는 C2가 탐색
효율까지 이기고, Claude에서는 토큰만 이기고 탐색 규율에서 진다.

## 판정과 다음 단계

로드맵 Phase 1.5 판정 기준에서 "교차 에이전트에서 B > C" 분기에 해당한다.

1. **opcode 명시성 상향(C3)**: BOOT에 "View 신뢰, 재검색 금지", 상태 동기화
   시점, 정렬·불변식 같은 행동 규칙을 Claude가 생략하지 못하게 명시 강화 후
   양쪽 에이전트 재측정.
2. 재측정에서도 갈리면 **모델별 profile 분기**(Phase 5 항목)를 Phase 2 설계에
   앞당겨 반영.
3. 프롬프트 추종에 의존하지 않는 **PreToolUse 훅 게이팅**(Phase 2 항목)이
   Claude의 확률적 생략에 대한 구조적 해법이라는 점이 이번 데이터로 보강됐다.

## 데이터와 재실행

- 결과: `.experiments/phase1-ai-first-runs/claude-full-1/`
  (`metadata.json`, `results.json`, `aggregate.json`, JSONL 로그, stderr, patch)
- 재실행: `node scripts/phase1-ai-first-runner.mjs --agent=claude --repeats=3 --run-id=<new-run-id>`
- 재분석: `node scripts/phase1-ai-first-runner.mjs --agent=claude --reanalyze=.experiments/phase1-ai-first-runs/<run-id>`
- 인프라 실패 짝 그룹 재실행: `node scripts/phase1-ai-first-runner.mjs --retry-excluded=.experiments/phase1-ai-first-runs/<run-id>`
