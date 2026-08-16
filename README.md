# Galpi (갈피)

**AI 하이브리드 네비게이션** — 코딩 에이전트가 코드베이스에서 길을 잃지 않게 하는 계층.
상류에서 원본 구조를 개선하고, 하류에서 코드로 표현할 수 없는 것(상태·의도·라우팅)만
기계 판독 인덱스로 제공한다.

**인덱스의 깊이는 프로젝트 규모에 따라 조절한다** (L0~L3). 구조 개선은 규모와 무관하게
적용하지만, 인덱스는 부트스트랩 비용을 치르므로 그 비용을 상환할 만큼 큰 프로젝트에만 얹는다.
작은 프로젝트에서 `.galpi`를 생략하는 것은 예외가 아니라 **규정된 적용**이다 — Stage B 실측.

> 방금 들어온 신입이 팀장처럼 일한다.

이 저장소는 **제품이 아니라 실험**이다. 모든 설계 결정은 두 에이전트(Claude Code, Codex)에서
실측한 뒤 채택하며, 측정으로 부정된 주장은 문서에 그대로 남긴다.

---

## 에이전트가 이 저장소에서 코드 작업을 한다면

**이 README를 컨텍스트로 삼지 마라.** 이 파일은 사람용이며, 저장소를 처음 만난 시점의
안내판이다. 코드 작업의 진입점은 다음이다.

```
galpi-lab/.galpi/BOOT.gp   ← 여기서 시작. 문법과 행동 규칙이 전부 여기 있다.
galpi-lab/.galpi/MAP.gp    ← BOOT와 같은 호출에서 함께 읽는다. alias → task 라우팅.
galpi-lab/AGENTS.md        ← 위 두 파일을 가리키는 3줄짜리 부트스트랩.
```

규약상 사람용 문서(`README.md`, `docs/**`)는 에이전트의 기본 컨텍스트가 아니다
(`N|runtime_ext=gp|human_docs=not_default_context`, 헌법 7조).

---

## 이 저장소에서 무엇을 찾는가

| 찾는 것 | 경로 |
|---|---|
| 프로토콜 문법·행동 규칙 | `galpi-lab/.galpi/BOOT.gp` |
| 상태·라우팅·의도의 **단일 원본** | `galpi-lab/.galpi/source.gp` |
| 파생 인덱스 (직접 편집 금지) | `galpi-lab/.galpi/MAP.gp`, `galpi-lab/.galpi/v/` |
| CLI 구현 | `galpi-lab/tools/galpi/` |
| PreToolUse 훅 (DEAD/LOCK 물리 강제) | `galpi-lab/tools/galpi/hooks/pretooluse.mjs` |
| 측정 하네스 (에이전트 A/B 실행기) | `galpi-lab/scripts/phase1-ai-first-runner.mjs` |
| 로드맵 (헌법·Phase 계획·성공 기준) | `galpi-lab/docs/roadmap.md` |
| 측정 보고서 | `galpi-lab/docs/experiments/` |
| 세션 간 인계 기록 | `galpi-lab/.galpi/handoff.md` |
| 실험 대상 샘플 앱 | `galpi-lab/src/` |

---

## 핵심 개념

### 상태 코드 (`S|` 레코드)

| 코드 | 의미 | 에이전트 행동 |
|---|---|---|
| `0` | done | 기본 처리 |
| `1` | wip | 작업 중 — 연결된 status 파일을 코드보다 먼저 읽는다 |
| `2` | plan | 계획만 존재 — 코드를 작성하지 않는다 |
| `3` | exp | 실험 |
| `4` | **dead** | 열지도, 재사용하지도, 수정하지도 않는다 |
| `5` | stale | 코드와 인덱스 불일치 — 범위를 넓힌다 |
| `h` | hot | 변경 빈발 |
| `l` | **lock** | 명시적 요청 없이 수정 금지 |

`4`(DEAD)와 `l`(LOCK)은 프롬프트 준수에 의존하지 않는다. PreToolUse 훅이 셸 단에서
Write/Edit를 exit 2로 거부하고, pre-commit과 CI가 2차로 잡는다.

### 탐색 순서

```
BOOT + MAP → route(alias) → task view (.galpi/v/t/<task>.gp) → view가 나열한 파일만
```

route가 맞으면 저장소 전역 검색을 하지 않는다. view의 파일 목록은 완전한 것으로 신뢰하며,
검증하려고 grep하지 않는다.

### 적용 깊이 (L0~L3)

| 레벨 | 조건 | 형태 |
|---|---|---|
| `L0` 구조만 | 소규모 단일 작업 | AI 친화 구조 규칙 + `AGENTS.md` 몇 줄. **`.galpi` 없음** |
| `L1` 얕은 라우팅 | 도메인이 나뉘기 시작 | L0 + BOOT + source + route. view 없음 |
| `L2` 전체 구조화 | 크고 무거운 프로젝트 | 현행 compact protocol 전체 |
| `L3` 협업 계층 | 다중 에이전트·다인 팀 | L2 + 사람용 렌더링·대시보드 |

레벨 판정 자동화(`galpi init`이 신호를 보고 권장 레벨 제안)와 레벨별 손익분기점 실측은
**미구현**이다. 이 저장소 자체는 L2로 운용 중이다.
→ `galpi-lab/docs/roadmap.md` §규모 적응형 갈피

---

## CLI

```bash
cd galpi-lab
npm install

npm run galpi -- check      # 런타임 계약 검증 (exit 1 = 위반). pre-commit·CI와 동일 게이트
npm run galpi -- doctor     # 구조 진단 (항상 exit 0, 소견만)
npm run galpi -- doctor --root <path>   # 외부 저장소 진단
npm run galpi -- build      # 실제 코드에서 manifest.gp 구조 그래프 생성
npm run galpi -- build --check          # manifest 최신성 검사 (쓰기 없음)
npm run galpi -- query 수강신청         # task + 최소 파일·심볼·의존 관계 반환
npm run galpi -- query 수강신청 --human # 사람이 읽기 쉬운 출력
npm run galpi -- set-state <id> <code>  # 상태 변경
npm run galpi -- add-route <alias> <task-id>
npm run galpi -- rm-route <alias>
npm run galpi -- add-task <id> <state> [k=v...]
npm run galpi -- add-domain <id> <state> <path> [k=v...]

npm run check               # typecheck + 19 tests + galpi/check/build freshness + app build
```

`.galpi/`를 손으로 편집하지 않는다. 모든 변형은 CLI를 거치며, CLI는 쓰기 전 스키마 검증과
쓴 후 참조 무결성 검증을 통과해야 커밋하고 실패 시 파생물까지 바이트 단위로 롤백한다.

**`galpi check` 검출 항목**: `parse`, `missing_header`, `unknown_opcode`, `dup_id`,
`bad_state`, `bad_action`, `missing_path`, `missing_ref`, `missing_file`,
`view_state_desync`, `map_desync`, `plan_has_code`, `dead_import`, `stale`, `lock_modified`

**`galpi doctor` 진단 항목**: `ambiguous_name`, `large_file`, `large_mixed_file`,
`deep_import`, `test_far_from_code`, `missing_anchor`

---

## 측정된 것 / 측정되지 않은 것

이 프로젝트의 신뢰는 실측에서 나온다. 아래는 **측정된 값**이며, 반증된 주장도 함께 남긴다.

### 훅 게이팅이 프롬프트 준수를 이긴다 (Phase 2, C4)

규칙 집행을 프롬프트에서 셸(PreToolUse 훅)로 옮긴 결과, Claude 기준 토큰 열세가
**+12.1% → +1.9%** 로 줄고 route/state 준수는 **+26.7%p** 올랐다.
→ `galpi-lab/docs/experiments/phase1-claude.md`

### 구조가 인덱스보다 상류다 (Phase 3.5 Stage B) — 실증됨

지저분한 fixture(M0) vs 구조 개선 fixture(M2), 양 에이전트 각 조건 n=12, 총 96런.
구조 개선만 한 M2가 인덱스만 붙인 M1보다 총 토큰이 적다 (Claude −23.8%, Codex −10.7%).
→ 헌법 11조 "구조는 낡지 않는 인덱스다" 실증.

### 하이브리드는 이 규모에서 정당화되지 않는다 — **무조건 하이브리드 주장이 철회됨**

| 조건 | Claude 총토큰 | Codex 총토큰 | Claude 읽은토큰 |
|---|---:|---:|---:|
| M0 지저분 / 갈피 없음 | 468,394 | 162,971 | 7,414 |
| M1 지저분 / 갈피 | 553,543 | 174,452 | 5,565 |
| **M2 구조개선 / 갈피 없음** | **421,919** | **155,827** | 5,992 |
| M3 구조개선 / 갈피 | 544,598 | 167,069 | **2,714** |

갈피는 **의도한 일을 해낸다** — 읽는 코드량이 M3 기준 Claude −63.4%, Codex −77.8%.
그런데 **총 과금은 늘어난다.** 최저 비용 조건은 양 에이전트 모두 M2(갈피 없음)였다.

원인은 부트스트랩 왕복이다. 코드에 처음 닿기까지의 커맨드 수가 Claude 기준 1.25 → 5.33으로
늘고, 턴마다 누적 컨텍스트가 재전송되어 절약분(수천 토큰)을 수행 비용(수만~십수만 토큰)이
압도한다.

**규모 가설(미확정)**: 현 fixture는 1,300줄이라 코드 읽기가 총 토큰의 1.3%에 불과하다.
선형 외삽 시 손익분기는 읽기량 약 37배(4~5만 줄)이나, 선형 가정이므로 **주장하지 않는다.**

→ `galpi-lab/docs/experiments/phase35-structure.md`

### 계측 결함으로 폐기된 지표

- `averageReadFiles`, `averageUnrelatedReads` — 파일 세분도에 오염. M2는 파일을 2.1배 많이
  읽지만 내용은 19% 적게 읽는다. 개수가 아니라 **내용 토큰**이 정직한 척도다.
- 완전성 우위 주장 — `spreadPrefixes` 과선언 탓이었고, 정답 패치에서 역산하니 전 조건 동률.
- Codex mf1 정확도 차이 — 프롬프트 모호성. 수정 후 재실행 4/4 통과로 확인.

---

## Phase 진행 상황

| Phase | 내용 | 상태 |
|---|---|---|
| 0 | AI 전용 수동 프로토타입 | 완료 |
| 1 / 1.5 | 효과 측정 + Codex 교차 검증 게이트 | 완료 |
| 2 | `galpi check`/`doctor`, 변형 커맨드, 훅, pre-commit, CI | 완료 |
| **3.5** | 구조 개선 효과 측정 (M0~M3, 96런) | **완료** |
| 3 | `galpi build/query` — 코드 그래프와 최소 질의 | MVP 구현, View 자동 생성 미완 |
| 4 | 에이전트 통합 (스킬·훅 / AGENTS.md) | 미착수 |
| 4.5 | 지시문 계층 토큰 최적화 (규칙 블록화) | 설계만 |
| 5 | 고도화 (`galpi optimize` 등) | 설계만 |
| 6 | 사용 기반 자기 개선 (피드백 루프) | 설계만 |

상세·판정 기준은 `galpi-lab/docs/roadmap.md`.

---

## 저장소 구조

```
galpi/
├─ .github/workflows/check.yml   CI — galpi-lab에서 npm run check + doctor
├─ .githooks/pre-commit          galpi-lab 스테이징 시 galpi check
└─ galpi-lab/                    실험 대상 + 프로토콜 구현
   ├─ .galpi/                    AI 런타임 (BOOT, source, 파생 MAP·view, handoff)
   ├─ tools/galpi/               CLI + PreToolUse 훅
   ├─ scripts/                   측정 하네스
   ├─ docs/                      로드맵·측정 보고서·계획
   └─ src/                       샘플 학습관리 앱 (측정용 fixture)
```

fixture 브랜치: `phase1-ai/fixture-{a,b,c,c2,c3,c4}`, `phase35/fixture-m{0,1,2,3}`

---

## 협업 규약 (다중 에이전트)

- **역할**: Claude Code = 빌더(구현·Phase 실행), Codex = 검증자(리뷰·독립 측정)
- **검증 원장**: 검증 결과를 `.galpi/handoff.md`에 대상 hash와 함께 기록한다.
  대상 hash가 그대로면 **재검증하지 않는다.** 재검증 트리거는 hash 변경, 테스트·게이트 실패,
  사람의 명시적 요청 셋뿐이다.
- **리뷰의 리뷰 금지**: 상대의 리뷰를 재평가하지 않는다. 이견은 handoff에 쟁점으로 기록하고
  사람에게 이관한다.
- **교차 측정은 예외**: Phase 게이트의 양 에이전트 측정은 의도된 이중화다.

전문은 `galpi-lab/docs/roadmap.md` §6.

---

## 이름

**갈피**: ① 책갈피 — 코드베이스에 꽂아둔 표식. ② 갈피를 잡다 — 방향을 찾다.
영문 한 줄: *Galpi: a Korean word meaning both "bookmark" and "one's bearings".*
