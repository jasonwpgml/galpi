# Phase 1 — AI-First Galpi 효과 측정

측정일: 2026-07-16

최종 판정: **통과 — C2(AI-first Galpi)를 다음 Phase의 기본 형식으로 채택한다.**

## 요약

동일한 애플리케이션에서 No Galpi(A), YAML/Markdown Galpi(B), compact `.gp` Galpi(C2)를 비교했다. 최종 v2는 5개 시나리오, 조건별 3회, 총 45개의 독립 실행으로 구성했다.

C2는 B와 같은 100% 작업 정확도를 유지하면서 다음 결과를 냈다.

- 실제 총 토큰 평균 141,911 → 118,360: **16.60% 감소**
- protocol component token proxy 평균 1,267.4 → 827.8: **34.69% 감소**
- 최초 관련 파일 도달 평균 3.53 → 3.47 calls: **1.89% 감소**
- 읽은 파일 평균 8.73 → 7.87: **9.92% 감소**
- 관련 없는 파일 평균 2.00 → 0.93: **53.33% 감소**
- 전체 저장소 검색률 20.0% → 0%: **완전 제거**
- route 선택률 80.0% → 100%: **20%p 증가**
- 상태 규칙 준수율 73.3% → 100%: **26.7%p 증가**
- 평균 실행 시간 54.57초 → 50.49초: **7.47% 감소**
- protocol parse 실패·재질문: B/C 모두 0회
- 숨은 평가, 관련 테스트 명령, 잘못된 파일 수정: B/C 모두 100% 통과

## 실험 고정 조건

| 조건 | fixture commit | 차이 |
|---|---|---|
| A — No Galpi | `2dc7e17579eae7ebe758752c31e6dcbce4f54a53` | `AGENTS.md`, `.galpi/` 없음 |
| B — Human-readable | `d88113f216b99fdc0026af4b21195b9b71a4c4a9` | 장문 AGENTS, YAML MAP/source, Markdown View |
| C2 — AI-first | `e55540a6330823969e0cf82589db181e77eb0752` | 2줄 AGENTS, compact BOOT/MAP/View `.gp` |

세 fixture의 `src/`, `docs/plans/`, package 파일, TypeScript 설정과 로그인 결함은 byte-identical이다. 로드맵과 실험 설명은 fixture에서 제거했다.

- Codex CLI: `0.144.4`
- 모델: `gpt-5.6-sol`
- reasoning effort: `low`
- 실행: ephemeral JSON session, disposable detached worktree
- 반복: 시나리오당 A/B/C 각 3회
- timeout: 실행당 300초
- 실제 timeout/비정상 CLI 종료: 0/45
- 코드 시나리오: 에이전트 종료 후에만 생성되는 숨은 실행 테스트로 판정
- 읽기 전용 시나리오: 최종 응답 semantic check와 clean worktree로 판정

상세 설계는 `docs/experiments/phase1-ai-first-protocol.md`, 실행기는 `scripts/phase1-ai-first-runner.mjs`에 있다.

## 최종 v2 집계

| 측정값 | A | B | C2 | C2 vs B |
|---|---:|---:|---:|---:|
| 작업 정확도 | 100% | 100% | 100% | 동일 |
| 최초 관련 파일 call | 2.47 | 3.53 | 3.47 | -1.89% |
| 읽은 파일 | 11.00 | 8.73 | 7.87 | -9.92% |
| 관련 없는 파일 | 6.07 | 2.00 | 0.93 | -53.33% |
| bootstrap/context proxy tokens | 0 | 1,073 | 682 | -36.44% |
| query-result proxy tokens | 0 | 194.4 | 145.8 | -25.00% |
| protocol component proxy tokens | 0 | 1,267.4 | 827.8 | -34.69% |
| 전체 저장소 검색률 | 100% | 20.0% | 0% | -20%p |
| route 선택률 | N/A | 80.0% | 100% | +20%p |
| 상태 규칙 준수율 | N/A | 73.3% | 100% | +26.7%p |
| parse 실패·재질문 | 0 | 0 | 0 | 동일 |
| 오수정률 | 0% | 0% | 0% | 동일 |
| 코드 작업의 관련 테스트 명령 성공률 | 100% | 100% | 100% | 동일 |
| 실제 총 토큰 평균 | 106,211 | 141,911 | 118,360 | -16.60% |
| 실제 총 토큰 합계 | 1,593,160 | 2,128,665 | 1,775,398 | -353,267 |
| 평균 실행 시간 | 45.91초 | 54.57초 | 50.49초 | -7.47% |

실제 총 토큰은 Codex JSON event의 `input_tokens + output_tokens`다. 입력·출력 평균도 B 140,085/1,826에서 C2 116,713/1,647로 각각 16.68%, 9.82% 감소했다.

`bootstrap/context`, `query-result`는 exact model tokenizer가 공개되지 않아 `o200k_base`로 계산한 재현 가능한 component proxy다. 이 값은 실제 총 토큰과 섞지 않았다.

CLI event에는 적용 단가나 청구 금액이 없으므로 USD 비용은 산출하지 않았다. 비용 대리값으로 실제 총 토큰 합계와 wall time을 함께 기록했다.

## 시나리오별 결과

| 시나리오 | A/B/C2 정확도 | 최초 관련 call A/B/C2 | B 총 tokens | C2 총 tokens | C2 절감 | C2 route/state |
|---|---:|---:|---:|---:|---:|---:|
| DONE login | 100/100/100% | 2.33 / 3.00 / 3.00 | 140,004 | 122,244 | 12.69% | 100/100% |
| WIP+HOT sorting | 100/100/100% | 2.00 / 3.33 / 4.00 | 216,804 | 173,587 | 19.93% | 100/100% |
| PLAN billing | 100/100/100% | 2.00 / 4.00 / 3.00 | 101,114 | 74,032 | 26.78% | 100/100% |
| DEAD-like roster | 100/100/100% | 3.00 / 3.33 / 4.33 | 175,744 | 158,703 | 9.70% | 100/100% |
| non-exact route | 100/100/100% | 3.00 / 4.00 / 3.00 | 75,889 | 63,234 | 16.68% | 100/100% |

세부 관찰:

- C2는 15/15 실행에서 첫 명령으로 BOOT와 MAP을 함께 읽었다.
- exact alias가 하나도 없는 credential-exchange 표현에서도 C2는 3/3 모두 `a.login` View를 선택했다.
- WIP+HOT은 C2 3/3 모두 status를 코드보다 먼저 읽었다.
- PLAN은 C2 3/3 모두 guide만 읽고 `src/`를 검색하지 않았다.
- DEAD-like 작업은 B/C2 모두 폐기된 `src/legacy/` 코드를 읽거나 수정하지 않았다. A는 3/3에서 legacy 코드를 읽었다.
- C2는 sorting과 roster에서 상태 문서를 더 읽어 최초 code 도달이 B보다 각각 0.67, 1.00 call 늦었다. 대신 두 시나리오 모두 총 토큰·관련 없는 읽기·전체 검색을 줄이고 상태 준수 100%를 유지했다.

## C1 실패와 C2 조정

초기 C1 fixture `1469da75f7b46e0499f3faa792cead19973c3629`도 별도의 45회 v1 실행에서 정확도 100%, route/state 100%, B 대비 총 토큰 13.35% 감소를 기록했다. 그러나 최초 관련 파일 도달이 B 3.47 calls, C1 5.00 calls였다. BOOT, MAP, task View를 매번 별도 호출하는 구조적 비용 때문에 엄격 판정은 실패했다.

C2에서는 의미를 덜어내지 않고 다음만 바꿨다.

1. 2줄 `AGENTS.md`에서 BOOT와 MAP을 한 tool call로 함께 읽도록 지시.
2. BOOT의 task View 경로를 `.galpi/v/t/<task>.gp`로 명시.
3. route miss 시 View 목록 전체를 열거하지 않고 task를 추론하도록 명시.
4. DEAD 신규 작업은 폐기 파일 금지를 유지하면서 replacement student domain View로 직접 연결.

최종 v2에서 C2의 최초 관련 파일 도달은 3.47 calls로 줄어 B 3.53보다 소폭 빨라졌고 나머지 통과 기준도 모두 만족했다. C1과 C2의 절대 토큰 차이는 서로 다른 stochastic batch이므로 직접적인 개선량으로 단정하지 않는다. 판정에는 동일 v2 batch의 B/C2만 사용했다.

## 해석과 한계

### B보다 C2가 나았던 이유

- 짧은 파일 자체보다 `BOOT+MAP` 동시 읽기와 정확한 View 경로가 tool call을 줄였다.
- PLAN/DEAD/WIP 행동이 고정 opcode와 직접 링크로 연결돼 장문 규칙보다 일관되게 적용됐다.
- B는 새 작업에서 route/View를 건너뛰거나 계획 질문에서 코드로 확장하는 실행이 있었지만 C2는 없었다.
- query packet이 짧아진 것뿐 아니라 후속 도구 호출이 줄어 실제 총 토큰도 감소했다.

### A가 여전히 가장 싼 이유

이 fixture는 파일 수가 매우 적다. A는 전체 검색을 매번 수행해도 평균 총 토큰 106,211, 시간 45.91초로 C2보다 각각 11.44%, 9.99% 낮았다. 따라서 이 실험은 “작은 저장소에서도 Galpi가 무조건 No Galpi보다 싸다”를 입증하지 않는다.

대신 C2는 A 대비 읽은 파일 28.5%, 관련 없는 파일 84.6%를 줄였고 전체 검색을 100%에서 0%로 만들었으며 상태 규칙을 기계적으로 지켰다. 저장소가 커질수록 이 차이가 비용으로 전환되는지는 더 큰 fixture에서 다시 측정해야 한다.

### 측정기 보정

원시 agent 출력은 수정하지 않았다. 사후 checker에서 다음 false negative만 재분석했다.

- `WIP`, `work-in-progress`, `in-progress`, 한국어 `작업 중`을 동등하게 처리.
- Billing 답변의 영어/한국어 의미 동의어를 동등하게 처리.
- Windows 이중 경로 구분자를 정규화.
- 새 roster 테스트를 test script에 등록한 `package.json` 변경과 B 지침이 요구한 `.galpi` 동기화를 작업 범위로 분류.

각 결과 디렉터리의 `results.before-reanalysis.json`이 보정 전 판정을 보존한다.

## 데이터와 재실행

- 최종 v2: `.experiments/phase1-ai-first-runs/full-v2/`
- 초기 C1 v1: `.experiments/phase1-ai-first-runs/full-v1/`
- 각 디렉터리: `metadata.json`, `results.json`, `aggregate.json`, JSONL 로그, stderr, patch

재실행:

```powershell
node scripts/phase1-ai-first-runner.mjs --repeats=3 --run-id=<new-run-id>
```

기존 로그 재분석:

```powershell
node scripts/phase1-ai-first-runner.mjs --reanalyze=.experiments/phase1-ai-first-runs/<run-id>
```

## 결정

C2는 B 대비 정확도를 유지하면서 protocol 토큰, 실제 총 토큰, 평균 최초 도달, 파일 읽기, 관련 없는 읽기, 전체 검색과 실행 시간을 모두 줄였다. parse 오류는 증가하지 않았고 route/state 준수는 상승했다.

따라서 **Phase 1을 통과하고 AI-first compact `.gp`를 Phase 2 이후의 기준 런타임으로 유지한다.** 다음 단계는 이 포맷을 전제로 `galpi check`의 schema/stale 검증을 구현하는 것이다.
