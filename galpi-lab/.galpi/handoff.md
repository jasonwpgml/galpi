# Handoff (최신이 맨 위)

> **패킷 규약 (2026-08-17~)**: 협업 이벤트(인계·검증·쟁점)는 서술과 함께 status/verify
> 패킷을 JSON 블록으로 병기한다. 스키마·ledger 바인딩: `/GALPI_SPEC_v0.2_draft.md` §5·§6.
> 패킷은 서술을 대체하지 않고 정형 필드를 보강한다 (스펙 §6). 단독 작업(L0~L2)에는
> 패킷을 만들지 않는다 (스펙 §0).

## 2026-08-17 claude (15) — Spec v0.2 rev 2: L3 협업 계층으로 재선언, 패킷 원장 규약 시작

- Human decisions recorded:
  - 스펙 초안(`/GALPI_SPEC_v0.2_draft.md`)의 정체를 "코드베이스 라우팅 스펙"에서
    **L3 협업 계층 프로토콜**(에이전트 간 통신 규약)로 재선언한다.
  - 장기 목표는 코딩 에이전트 협업 도메인 어휘의 외부 확산(A2A 확장 포지셔닝)이되,
    배포 순서는 **내부 실측 → 코어/프로필 분리 → 공개**. 사양 선공개는 하지 않는다
    (llms.txt 전철 방지).
- Done:
  - rev 2 재작성: §0 적용 범위(단독 경로 패킷 금지 — Stage B 왕복 비용 근거),
    §1.4 형식/전송 분리, §1.5 2계층 어휘(파일=숫자 코드, 패킷=영어 라벨, §4.2 1:1 대응표),
    §1.6 선언/강제 분리(Phase 2 훅 게이팅 근거), §5 패킷 3종(route/status/verify —
    verify는 본 원장의 검증 규약을 정형화), §6 바인딩 2종(direct/ledger, MCP·CLI는 연기).
    rev 1과의 충돌 3건(상시 라우터 왕복, BOOT 자연어화, EXP·STALE 생략)은 §8 기각표에
    사유와 함께 보존.
  - 본 파일 서두에 패킷 기록 규약 추가. 아래 패킷이 ledger 바인딩의 첫 실사용이다.
- 패킷:

  ```json
  {
    "galpi": "0.2",
    "type": "status",
    "state": "WIP",
    "priority": "P2",
    "change_type": "docs",
    "updated": "2026-08-17T01:13:00+09:00",
    "note": "스펙 rev 2 완료, 단 패킷 스키마는 실전 사용 0회라 draft 유지. 인계 3~5사이클 실측 후 코어/프로필 분리 판단"
  }
  ```

- 검증 원장:
  - target: `/GALPI_SPEC_v0.2_draft.md` rev 2 + 본 규약 | check: 문서 변경만 — 런타임
    `.gp` 문법·CLI·훅 미변경 (스펙 §0이 명시적으로 보장). pre-commit `galpi check`는
    handoff.md 스테이징으로 구동됨
  - not verified: 패킷 스키마 자체 — 실전 인계 0회. 검증 조건: 실전 사이클 3~5회 +
    `galpi check`에 패킷 검증(hash 불일치·기록 누락) 편입 (스펙 §8 연기 항목).
- Next:
  - (a) 다음 실제 협업 인계(Phase 4 등)부터 status·verify 패킷 병기 — verify는
    기존 검증 원장 형식과 병행하며 대체하지 않는다.
  - (b) 3~5사이클 후: 코어 스펙/갈피 프로필 분리, A2A 확장 메커니즘(Agent Card,
    extension 필드) 조사 — 사람 판단으로 착수.
  - (c) `galpi check`에 ledger 패킷 검증 편입 여부 — 사람 판단.
- 주의: 스펙 파일은 저장소 루트에 있어 `galpi check` 대상이 아니다. 코어/프로필 분리
  시점에 위치 재논의.

## 2026-07-30 claude (14) — mf1 프롬프트 결함 수정·재현 검증

- Done: Stage B에서 발견한 mf1 프롬프트 모호성을 예시 입출력으로 해소했다.
  "trim → 선행 `+` 유지 → 나머지 비숫자 제거", 예시 두 개를 프롬프트에 박았다.
- **재현 검증**: 같은 조합(Codex × mf1 × 4조건) 재실행 → **4/4 통과**
  (`p35-mf1-fixcheck`). 수정 전에는 M2 0/3, 나머지 2/3이었다.
  Stage B에서 "Codex M2 정확도 75%는 구조 효과가 아니라 프롬프트 결함"이라고 판단한 것이
  추측이 아니라 **재현으로 확인**됐다.
- Stage B 수치에 소급 적용하지 않는다. Codex 정확도 92%/75%는 당시 프롬프트로 측정된 값
  그대로 두고 각주로 해석만 제한했다 — 측정값을 사후에 고쳐 쓰면 기록이 아니게 된다.
- Verification ledger:
  - target: mf1 프롬프트 | check: 양 suite `--validate-only` 통과, Codex 4조건 재실행 4/4
    | evidence: `p35-mf1-fixcheck` 실행 출력
- Next (사람 판단 대기, 변동 없음):
  (a) 규모 가설을 큰 fixture로 직접 검증할지 — 제작 비용 발생.
  (b) Stage B 결과를 v3 정체성(하이브리드)에 반영할지 — 로드맵 서두·헌법은 손대지 않았다.
      §6 역할 분담상 빌더의 권한은 체크박스·메모 갱신까지이고, 정체성 개정은 사람 몫이다.
- 참고: Phase 3.5 체크리스트는 mf1 수정으로 Stage C 진입 차단 요소가 없어졌다. 다만 Stage C가
  무엇인지는 아직 정의되지 않았다 — 로드맵에는 Stage A/B만 있다.

## 2026-07-27 claude (13) — Phase 3.5 Stage B 완료: 하이브리드가 이 규모에서 정당화되지 않음

- Done: 2×2 전체 × 양 에이전트, 각 조건 n=12 (총 96런). fixture `phase35/fixture-m1`
  (`45485b8`), `phase35/fixture-m3` (`4a5fb9f`) 신규 제작 — 각각 M0/M2와 src byte-identical.
- **양 에이전트에서 방향이 일치한다** (헌법 10조 요건 충족):
  - 갈피는 읽은 내용을 크게 줄인다 — M3 기준 Claude -63.4%, Codex -77.8% (vs M0).
  - 그런데 **총 과금은 늘어난다** — Claude M1 +18.2%/M3 +16.3%, Codex M1 +7.0%/M3 +2.5%.
  - **최저 비용 조건은 양쪽 모두 M2(구조 개선만)**.
- 로드맵 판정 기준 대조:
  - **M2 ≥ M1 → 헌법 11조 "구조가 인덱스보다 상류" 실증** (총토큰 Claude -23.8%, Codex -10.7%).
  - **M3가 최고가 아니므로 하이브리드는 이 규모에서 정당화되지 않는다** (M3 vs M2:
    Claude +29.1%, Codex +7.2%). v3의 핵심 주장에 불리한 결과다.
  - 소규모에서 인덱스 생략(L0~L1) 근거가 오히려 강해졌다.
- 메커니즘: 최초 도달 커맨드 Claude 1.25→5.33, Codex 2.67→3.00. BOOT→MAP→view 부트스트랩이
  턴을 늘리고 턴마다 누적 컨텍스트가 재전송된다. 절약분(수천 토큰)보다 수행 비용(수만~십수만
  토큰)이 압도적으로 크다.
- 정확도·완전성은 양 에이전트·전 조건 사실상 동률.
- **오독 방지 기록**: Codex M2 정확도 75%를 처음에 "구조 개선이 정확도를 해쳤다"로 읽었으나
  틀렸다. mf1 실패 6건이 전부 동일 단언(선행 `+`를 떼어 `821012345678` 생성)이고
  **M0/M1/M2/M3에 무차별 발생**한다. 프롬프트의 "digit or a leading plus"가 모호한 탓이다.
  M2만 0/3인 건 n=3 노이즈(실패확률 ⅓ 가정 시 어느 한 조건이 0/3일 확률 ≈14%). Claude는 같은
  프롬프트를 다르게 해석해 100% 통과 — 에이전트 간 해석 차이지 구조 차이가 아니다.
- 규모 가설(미확정): 현 fixture는 코드 읽기가 총 토큰의 1.3%뿐이다(Claude 6k/470k). 선형
  외삽 시 갈피가 이득이 되려면 읽기량 약 37배(4~5만 줄) 필요. 규모 적응형 L0~L3의 첫 실측
  근거이지만 **선형 가정이므로 손익분기 수치를 주장하지 않는다.**
- Verification ledger:
  - target: `phase35/fixture-m1`(`45485b8`), `phase35/fixture-m3`(`4a5fb9f`) | check:
    `galpi check` 0 errors, src/package/tsconfig가 짝과 byte-identical (러너 parityPairs가 강제)
  - target: Claude 2×2 | check: 24+24런 전부 유효, excluded 0
  - target: Codex 2×2 | check: 6배치 × 8런 = 48런 전부 유효, excluded 0
  - **무효 처리**: 두 배치를 한 폴더로 병합한 재집계(`p35-claude-2x2`)는 폐기했다.
    `relativeToRun`이 worktree 경로 접두사로 상대경로를 만들어 병합본에서 파일 판정이
    뒤틀린다(M0 route/읽은토큰이 원본과 불일치). **배치별 자체 집계만 사용했다.**
- 운영 메모: 백그라운드 실행이 두 번 조기 종료됐다(48런·16런 모두). 포그라운드 + 8런 청크는
  안정적이었다. Codex 배치는 8런씩 6회로 나눠 돌렸다.
- Next: (a) mf1 프롬프트를 예시 입출력으로 명시 — Stage C 전 필수. (b) 규모 가설을 큰
  fixture에서 직접 검증할지 사람 판단. (c) 이 결과가 v3 정체성(하이브리드)에 미치는 영향을
  로드맵에 반영할지 사람 판단 — 현재는 Phase 3.5 절에만 기록했고 헌법·서두는 손대지 않았다.

## 2026-07-27 claude (12) — Stage A 계측 수정 후 재집계: M2 우위 하나가 사라짐

- Done: 직전 항목이 남긴 계측 결함 3건을 고치고 `--reanalyze`로 재집계 (재실행·추가 비용 0).
  수정 전 판정은 `results.before-instrument-fix.json`에 보존.
  - `allowedPrefixes` 대칭 재선언 — 각 조건에 "자기 구조가 코드를 두는 곳 + 유틸 위치 +
    공개 진입점 + 테스트", 양쪽 모두 `extra/`·`legacy/`·`operations/` 제외.
  - `spreadPrefixes`를 정답 패치에서 역산 — mf1의 M0 목록에서 `app/manager.ts` 제거, 양
    조건에 테스트 대칭 추가.
  - `readTokens`·`unrelatedReadTokens` 신설 — 읽은 파일 **개수** 대신 **내용 토큰**. fixture
    커밋에서 내용을 읽으므로 worktree가 지워진 뒤에도 재집계 가능.
- **재집계가 판정을 바꿨다. 수정 전 M2 우위 2개가 계측 결함이었다.**
  - 완전성: M0 83%/전량커버 50% vs M2 100%/100% → **양쪽 100% 동률.** 전부 내 과선언 탓.
    MF 설계 문서의 파급 누락 가설은 이 배치에서 **지지되지 않는다.**
  - 오수정률: M2 33.3% → 8.3%, 남은 1건은 `package.json`으로 구조 무관. 사실상 동률.
- 확정 수치: 읽은 내용 토큰 **-19.2%**, 최초 도달 **-34.8%**, 총 토큰 -9.9%, 비용 -15.4%.
  정확도·완전성·오수정률 전부 동률. **구조 개선은 찾는 비용을 줄이고 정확성은 안 건드린다.**
  `m-sorting`은 M2가 +14.7% 열세라 집계 이득은 탐색 과제 단독 스윙에 의존한다.
- `readTokens`가 세분도 문제를 수치로 확정했다: **M2는 파일을 2.1배 많이 읽지만 내용은
  19% 적게 읽는다.** 개수 지표는 판정 축에서 폐기.
- 폐기 확정: `unrelatedReads`·`unrelatedReadTokens`는 선언을 고쳐도 못 살린다. 관련성 판정이
  파일 단위인데 M0의 `app/manager.ts`(333줄, 세 도메인 혼재)는 통째로 "관련"으로 계상된다.
  혼재 파일은 관련 부분만 읽을 수 없으므로 구조적으로 M0에 유리하다.
- Verification ledger:
  - target: `p35-stageA-1` 재집계 | check: 24/24 유지, 양 suite `--validate-only` 통과,
    `galpi check` OK|errors=0 | evidence: 실행 출력
  - not verified: 재집계는 기존 로그를 다시 채점한 것이라 **새 런 근거는 없다.** 시나리오
    정의 변경이 다음 배치에서 의도대로 동작하는지는 Stage B 첫 런에서 확인해야 한다.
- Next (사람 결정 대기): 정확도 천장 — 전 조건 100%라 구분력 0. 더 어려운 시나리오를 넣을지,
  정확도를 "회귀 없음" 확인용으로만 쓸지.
- Next (Stage B): 질문이 좁아졌다 — **M1(지저분+갈피)이 M2(구조만)에 얼마나 근접하는가.**
  구조 이득이 탐색 축에 몰려 있고 인덱스도 같은 축을 노리므로 두 조건이 겹칠 수 있고,
  겹치면 헌법 11조("구조가 상류")의 근거가 약해진다.

## 2026-07-27 claude (11) — Phase 3.5 Stage A 측정 완료

- Done: `p35-stageA-1` 배치 24/24 유효 (초회 20건 usage_limit → `--retry-excluded`로 재실행).
  Claude 단독, M0 vs M2, 비용 $7.33 (추정 $8과 일치). 보고서
  `docs/experiments/phase35-structure.md`.
- 측정값: 총 토큰 -9.9%, 유효 토큰 -13.1%, 비용 -15.4%, 최초 도달 1.92→1.25.
  정확도는 전 조건 100% 동률.
  **단, 집계는 session-flow 단독 스윙(-67%)이 끌어올린 값이다.** 시나리오별로 보면
  탐색 과제만 크게 이기고(-67%), 편집 과제는 작거나(-6~7%) 역전된다(m-sorting +14.7%,
  M2 열세). "구조 개선은 탐색 비용을 줄이지 편집 비용을 줄이지 않는다"는 해석이 데이터와
  맞지만 4시나리오·3반복으로는 여기까지가 한계.
- **판정: Stage B 진행 가치 있음. 단 계측 결함 3건 수정 후.**
- **Stage A의 더 중요한 산출물은 수치가 아니라 계측 결함 발견이다.** 셋 다 조건 차이가
  아니라 내가 만든 시나리오 정의의 결함이고, 고치지 않으면 Stage B가 같은 편향을
  4조건으로 확대 재생산한다:
  1. `allowedPrefixes` 비대칭 → `wrongChangeRate` 무효. M2가 3배 나빠 보였으나 실체는
     전화번호 정규화 헬퍼를 `src/shared/shared.service.text.ts`에 넣은 것 — M2 구조에선
     타당한 배치다. M0는 `src/app/`·`src/core/`를 통째로 허용해뒀고 M2는 `src/student/`만
     좁게 허용해서, 같은 행동이 M0에서만 통과했다.
  2. `spreadPrefixes` 과선언 → 완전성 지표 무효. M0가 "빠뜨린" `src/app/manager.ts`는
     애초에 고칠 필요가 없는 파일이었다 (M0는 3런 모두 core+data만 고치고 평가자 통과).
     파급 목록은 추측이 아니라 정답 패치에서 역산해야 한다.
  3. 개수 기반 지표가 파일 세분도에 오염. M2는 파일을 2배 이상 읽지만(7.75→16.58)
     같은 배치에서 토큰은 더 적다. M0 12파일 vs M2 31파일이라 같은 내용이 잘게 나뉜
     것뿐이다. 소스 트리가 byte-identical이던 Phase 1엔 없던 문제 — 여기선 구조 변경이
     실험 목적이라 구조적 편향이다. **토큰만 정직한 척도.**
  4. (추가) 정확도 천장 — 전 조건·전 시나리오 100%라 이 시나리오 집합으로는 정확도 축에서
     아무것도 구분 못 한다.
- Verification ledger:
  - target: `p35-stageA-1` | check: 24/24 유효, excluded 0 | evidence: aggregate.json validity
  - target: 러너 phase35 suite | check: 양 suite `--validate-only` 통과, phase1 회귀 없음
  - **not verified / 무효 처리**: `wrongChangeRate`, `averageSpreadCompleteness`,
    `fullSpreadRate`, `averageReadFiles`, `averageUnrelatedReads` — 위 결함으로 이번 배치에서
    사용 불가. 보고서에 명시했다.
- Next: 계측 결함 4건 수정 → Stage A `--reanalyze` 재집계(재실행 불요, 채점 규칙만 변경)
  → 그 결과로 Stage B 착수 여부 최종 확인.
- 부수 관찰: doctor 소견 30건만 고쳐 만든 M2가 Phase 0에서 사람이 손으로 잡은 clean fixture
  구조와 사실상 일치했다. 휴리스틱이 임의의 제3안을 만들지 않았다는 약한 방증이자, 동시에
  M2가 이미 사람이 최적화한 구조에 가깝다는 뜻이라 효과 크기는 낙관 쪽으로 치우쳤을 수 있다.

## 2026-07-27 claude (10) — Phase 6 신설 (사용 기반 자기 개선)

- Human decision: 갈피에 자가학습을 도입하되, 학습 결과를 예외 가능성을 포함한
  **결정론적 레코드**로 코드화하고 주기적·사용자 선택으로 적용한다.
- Done — `docs/roadmap.md`에 **Phase 6 — 사용 기반 자기 개선 (피드백 루프)** 추가.
  현재 갈피는 사람이 쓰고 도구가 검증하는 단방향인데, 사용 결과가 인덱스를 다시 고치는
  닫힌 루프를 만든다.
  - **ML 불필요**로 못박음: 학습 재료가 전부 빈도 집계·git 이력 통계다. 모델을 넣으면
    의존성 0·재현성·근거 추적을 한꺼번에 잃는다.
  - **행동 신호 vs 결과 신호 등급 분리**가 이 Phase의 핵심 안전장치. route miss·훅 거부
    같은 행동 신호는 후보 발굴에만 쓰고, 채택 판정은 테스트 통과·오수정·재작업 같은
    결과 신호로만 한다. 이유는 자기 강화 루프 — view가 파일을 빠뜨림 → 에이전트가 안 읽음
    → "불필요"로 학습 → 더 깊이 묻힘. 초기 실수가 증폭되어 굳는다.
  - **예외 포함 결정론은 기존 2단 구조에 얹는다**: 학습 규칙은 `doctor` 소견(exit 0)으로
    태어나 `src=learned|n=<표본수>`로 근거를 달고, 결과 신호가 쌓이면 `check`(exit 1)로
    승격, 반증이 쌓이면 강등·폐기. 반증 기록은 기존 오탐·미탐 표를 그대로 쓴다.
    새 개념을 만들지 않았다.
  - **하드 제약 — 측정 배치 중 학습 동결.** 스스로 변하는 시스템은 배치 간 비교
    가능성을 깨뜨린다. `claude-full-1`이 auto-memory 오염으로 폐기된 것, LangGraph를
    하네스에서 제외한 것과 같은 위험이다. 러너가 강제하도록 체크리스트에 넣음.
  - **자동 적용은 보류함 유지.** 주기적으로 하는 것은 제안 생성이지 적용이 아니다.
  - 파일럿을 **route 별칭 학습**으로 지정: 코드를 안 건드려 안전하고(되돌리기 한 줄),
    별칭이 100% 수기라 누락이 반드시 생기며, 누락 시 repo 전체 검색이 터져 측정상
    최대 낭비 항목이다. 이 하나로 "학습 → 결정론적 코드화 → 사람 승인" 루프 전체가 검증된다.
  - 성공 기준에 2개 추가: `learned_rule_false_positive <= human_rule_false_positive`,
    `frozen_ab_reproducibility = 100%`.
- Verification ledger:
  - target: `docs/roadmap.md` | check: 문서 변경만, `galpi check` OK|errors=0
  - not verified: Phase 6은 설계만 기록됐고 구현·측정 없음.
- Next: 변동 없음 — Phase 3.5 Stage A 러너 배선 → 24런. fixture 설계 3가지 확인 대기 중.
- 보류 중인 문서 작업: "갈피는 무엇인가" 절(정체성·명명). 카테고리는 **AI 코드베이스
  내비게이션**으로 수렴했고, 훅 문구만 미확정 — 사용자 안 "신입이 팀장처럼 일한다" vs
  제안 "첫날 출근한 신입이, 팀장이 아는 걸 안다"(측정된 범위에 맞춰 축소).

## 2026-07-26 claude (9) — Phase 4.5 신설, 효율화 수단 우선순위 결정, 문서 정리

- Human decisions recorded:
  - 지시문 계층(프롬프트·규칙)의 토큰 최적화를 프로젝트 범위에 포함한다.
  - 효율화 수단(훅·스킬·프롬프트 엔지니어링·LangChain/LangGraph)을 최대한 활용하되,
    아래 우선순위대로 **하나씩** 도입한다.
- Done:
  - **Phase 4.5 신설** (`docs/roadmap.md`): 헌법 4조(점진적 공개)가 코드·인덱스에만
    적용돼 있고 지시문 계층은 매 세션 전량 상주한다는 공백을 다룬다. 핵심 제약은
    "본문은 미뤄도 트리거는 못 미룬다" — 파일을 안 읽은 에이전트는 정보 부재를 알지만,
    규칙을 안 읽은 에이전트는 그 규칙의 존재를 몰라 자신 있게 위반한다. 커널에는
    규칙당 트리거 한 줄이 상주해야 한다.
  - 규칙 3분기 확정: 기계 강제 가능 → 훅으로 옮기고 프롬프트에서 삭제(C4 실증) /
    강제 불가+항상 필요 → 커널 상주 / 강제 불가+조건부 → 블록화. 블록화는 셋 중 하나일 뿐.
  - 현 `BOOT.gp`는 블록화 대상에서 명시적으로 제외 — 33줄에 `B|` 규칙이 이미 한 줄이라
    미룰 본문이 없고, 왕복 호출만 늘어난다.
  - 메커니즘 우선순위 표 기록: (1) 훅 확장 (2) Claude 스킬을 규칙 블록 로더로 바인딩
    (3) 프롬프트 변형 C5 (4) LangGraph 레퍼런스 소비자.
  - **LangChain/LangGraph는 측정 하네스에 넣지 않기로 결정.** 러너가 `claude.exe`/
    `codex.exe`를 실제 CLI 그대로 구동하는 것이 측정의 전제이고, 프레임워크로 감싸면
    측정 대상이 바뀌어 누적 배치(C2/C3/C4, codex-c3)와 비교 가능성이 끊긴다. Phase 5의
    3rd-agent 레퍼런스 소비자로만 쓴다.
  - 문서 정리: 루트에 홀로 있던 `Galpi_로드맵_AI_First_v3.md` → **`docs/roadmap.md`**
    (버전 중립 경로 — v4는 같은 파일을 개정하고 링크는 유지된다). README에 문서 지도와
    galpi CLI 사용법 추가. `docs/roadmap-history/README.md` 포인터 갱신.
- Verification ledger:
  - target: 문서 이동 후 런타임 | check: `galpi check` OK|errors=0, `galpi doctor`
    findings=0 | evidence: 실행 출력
  - not verified: Phase 4.5는 설계만 기록됐고 아무것도 구현·측정되지 않았다.
    첫 체크리스트 항목이 "상주 비용 실측 먼저"이고, 비용이 작으면 이 Phase를 기각한다.
- 주의: `handoff.md`의 2026-07-19 항목에 남은 `Galpi_로드맵_AI_First_v3.md` 경로는
  당시 사실의 로그이므로 고치지 않는다. 현행 경로는 `docs/roadmap.md`.
- Next: Phase 3.5 Stage A 잔여 — 러너 배선(M0/M2 조건, 시나리오 4개, 완전성 지표) →
  스모크 → 24런 → `docs/experiments/phase35-structure.md`. fixture 설계 3가지
  (고정 진입점 / 무관 코드 390줄 / `roster` 제외)에 대한 사람 확인은 아직 대기 중.

## 2026-07-26 claude (8) — Phase 3.5 Stage A: both fixtures built, batch not yet run

Human decision recorded: staged Phase 3.5 approved — Stage A (M0 vs M2, Claude only,
4 scenarios x 3 reps = 24 runs, ~$8) acts as a funding gate for the full 2x2 Stage B.
Stage A is explicitly NOT an adoption decision (constitution art. 10 bars single-agent
adoption); it only decides whether Stage B is worth paying for.

- Done:
  - `phase35/fixture-m0` (`4d468a5`) — messy fixture, 12 files / 1251 lines, derived
    mechanically from `origin/phase1-ai/fixture-a` so behaviour is identical by
    construction. Ambiguous basenames (core, utils, manager, data, helpers, stuff), a
    334-line god object holding three domains, all repositories in one file, no domain
    barrels, every test in one far-away file. `extra/` adds ~390 lines of plausible but
    scenario-irrelevant code (attendance, notifications, reporting) because a 712-line
    repo is cheap enough to read wholesale, which would mask the irrelevant-reads and
    context-token differences this phase exists to measure.
  - `galpi doctor --root` added to the CLI (`526eee0`) — ROOT was pinned to the CLI's own
    checkout, so galpi could not diagnose any tree but its own. Regression test included.
  - M0 diagnosis recorded as `docs/experiments/phase35-m0-doctor.md`: **30 findings**
    (6 ambiguous_name, 1 large_mixed_file, 22 deep_import, 1 test_far_from_code). This
    file is the transform spec for M2 — the roadmap bans arbitrary improvement.
  - `phase35/fixture-m2` (`18dc66f`) — M0 with those 30 findings fixed and nothing else.
    Doctor now reports **0 findings**. Same four test assertions pass; demo output matches.
  - Control constraint: both trees expose an identical public entry `src/index.ts`
    (7 runtime exports, 15 types, verified by a type-level probe in each tree), so one
    hidden evaluator can grade both conditions. Without it the trees would differ in
    import paths and the comparison would be uncontrolled.
- Observation worth keeping: applying doctor's rules mechanically reproduces the
  hand-designed layout of the clean Phase 1 fixture rather than inventing a third
  arrangement. Weak evidence that the heuristics encode something real, but it also
  means M2 is close to a structure a human already optimised — read the eventual effect
  size with that in mind.
- Verification ledger:
  - target: `phase35/fixture-m0` (`4d468a5`) | check: typecheck clean, 4/4 tests pass,
    demo runs | evidence: run output
  - target: `phase35/fixture-m2` (`18dc66f`) | check: typecheck clean, same 4/4 tests,
    demo output matches, `galpi doctor --root` = 0 findings (was 30) | evidence: run output
  - target: M0/M2 public surface parity | check: runtime export list identical; 15-type
    probe compiles in both trees | evidence: run output
  - target: `tools/galpi/cli.ts --root` | check: `npm run check` green, 16/16 tests
- Next (this stage, not started): wire the runner — add M0/M2 conditions (both
  bootstrapFiles: [], since neither carries Galpi), add 4 scenarios (2 carried from
  Phase 1 + MF1 + MF3 from `docs/experiments/phase2-multifile-design.md`) with
  evaluators importing only from `src/index.ts`, add the completeness metric the MF
  design doc calls for, then run 24 runs and write `docs/experiments/phase35-structure.md`.
- 주의: scenario picks for the carried pair are `sorting` (largest Phase 1 token spread,
  43%) and `session-flow` (pure navigation, cheapest). `roster` was dropped for Stage A —
  its prompt leans on Galpi state rules that do not exist in a Galpi-free condition.

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
