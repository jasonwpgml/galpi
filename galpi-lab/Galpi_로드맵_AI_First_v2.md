# Galpi 프로젝트 로드맵 — AI-First Revision v2

> **Galpi (갈피)**: 코드베이스에 표식을 꽂고, 에이전트가 최소 탐색으로 작업 방향을 잡게 하는 프로젝트 라우팅 계층.
>
> **최상위 원칙**: Galpi의 런타임 파일은 사람에게 친절할 필요가 없다.  
> 사람의 가독성보다 **AI의 탐색 정확도, 규칙 해석 안정성, 토큰 효율, 점진적 로딩**을 우선한다.
>
> **목표**: 코드베이스를 작업·도메인·상태·심볼·의존성 기준으로 조회할 수 있는 AI 전용 파일 뷰와 상태/의도 기반 라우팅 프로토콜을 만든다.
>
> **실행 전략**: 작은 실험 프로젝트에서 측정하고, 효과가 확인된 기능만 다음 Phase로 올린다.
>
> **v2 변경점**: Codex 교차 검증 복원(에이전트 불문 검증), source.gp 변형 커맨드 추가(수기 opcode 편집 제거),
> BOOT 휘발 대비 안전장치, 축약 경로 실측 항목 추가.

---

## 0. AI-First 헌법

Galpi 구현과 스펙 변경은 아래 원칙을 우선한다.

1. **AI 해석 비용 > 사람 가독성**  
   사람이 보기 좋은 제목, 문장, 표, 장식은 런타임 인덱스에 넣지 않는다.

2. **고정 문법 > 자연어 설명**  
   필드 순서, 상태 코드, 레코드 종류, 구분자를 고정한다. 자유 서술은 `summary`처럼 꼭 필요한 곳에만 허용한다.

3. **짧지만 모호하지 않게**  
   무작정 축약하지 않는다. 한 번 정의된 opcode와 ID를 재사용해 반복 토큰을 줄인다.

4. **점진적 공개**  
   에이전트는 `BOOT → route → task view → 실제 코드` 순서로 읽는다. 처음부터 전체 manifest를 읽지 않는다.

5. **한 사실, 한 원본**  
   상태·규칙·의도는 한 파일에서만 선언한다. MAP, manifest, view는 모두 자동 생성한다.

6. **정확 경로 우선**  
   해시맵·ID·심볼·의존성으로 찾고, 텍스트 검색과 임베딩은 뒤로 미룬다.

7. **사람용 출력은 런타임과 분리**  
   사람이 확인할 때는 `galpi explain`이 AI 전용 레코드를 풀어 보여준다. 사람용 문서를 에이전트가 기본 컨텍스트로 읽지 않는다.

8. **기호는 장식이 아니라 명령**  
   기호·숫자·축약어는 모두 행동 규칙과 연결된다. 의미 없는 이모티콘은 사용하지 않는다.

9. **토큰 효율은 실측**  
   짧아 보이는 문자도 tokenizer에서 여러 토큰일 수 있다. opcode·구분자·경로 형식은 실제 모델별 토큰 수와 오류율을 측정해 결정한다.

10. **모델 불문이 아니면 프로토콜이 아니다**  
    한 모델에서만 통하는 최적화는 그 모델의 팁일 뿐이다. 주요 결정(opcode, 축약 수준, 파일 분할)은
    최소 2개 에이전트(Claude Code, Codex)에서 측정해 채택한다. 모델별 차이가 크면 profile로 분기한다.

---

## 1. 네이밍 규약

| 대상 | 이름 |
|---|---|
| 프로토콜 | `GALPI/1` |
| CLI | `galpi` |
| 설정 폴더 | `.galpi/` |
| AI 부트스트랩 | `.galpi/BOOT.gp` |
| 사람이 선언하는 원본 | `.galpi/source.gp` |
| 자동 생성 1차 라우터 | `.galpi/MAP.gp` |
| 자동 생성 전체 인덱스 | `.galpi/manifest.gp` |
| 자동 생성 AI 탐색 뷰 | `.galpi/v/` |
| 선택적 사람용 출력 | `.galpi/debug/` 또는 `galpi explain` |
| 실험 프로젝트 | `galpi-lab/` |
| Claude Code 스킬 | `galpi-navigator` |

`.gp`는 Galpi Protocol의 line-oriented text format이다.

---

## 2. 런타임 구조

```text
.galpi/
├── BOOT.gp             # 최초 1회 읽는 문법·행동 규칙
├── source.gp           # 상태·의도·라우트의 단일 원본
├── MAP.gp              # 짧은 1차 인덱스
├── manifest.gp         # 전체 구조 인덱스, 필요 시에만 조회
├── status/             # WIP/HOT의 짧은 상태 패킷
└── v/
    ├── t/              # by-task
    ├── d/              # by-domain
    ├── s/              # by-state
    ├── y/              # by-symbol
    └── x/              # by-dependency
```

경로명도 AI용으로 짧게 유지한다. 단, 한 글자 디렉토리(`v/t` 등)는 잠정안이며
Phase 3에서 `v/task/` 형태 대비 토큰·오해율을 실측한 뒤 확정한다 (헌법 9조).

```text
v/t/a.login.gp
v/d/a.gp
v/s/1/student.gp
v/y/LoginService.gp
v/x/redis.gp
```

실제 코드는 복사하지 않는다. View에는 경로·심볼·상태·관계만 기록한다.

---

## 3. Galpi Compact Protocol 초안

### 3.1 BOOT 레코드

`BOOT.gp`는 에이전트가 처음 읽는 유일한 설명 파일이다. 목표 크기는 20~60줄이다.

```text
G|1
K|D=domain|T=task|F=file|Y=symbol|R=route|X=dep|P=test|E=entry|Q=summary
S|0=done|1=wip|2=plan|3=exp|4=dead|5=stale|h=hot|l=lock
A|0=skip_default|1=read_first|2=plan_only|3=verify|4=deny|5=code_check
O|R>V>F>X>G>M
B|route_hit:no_repo_scan
B|stale_or_test_conflict:expand_scope
B|dead:deny
B|lock:deny_without_explicit_request
```

- `O`: 탐색 순서
- `R`: 정확 route
- `V`: Galpi View
- `F`: 파일·심볼 이름
- `X`: 의존성
- `G`: 제한 grep
- `M`: semantic/embedding

### 3.2 source.gp 예시

```text
G|1
D|a|0|src/auth|x=db|a=0
D|st|1h|src/student|x=db|a=1|u=status/st.gp
D|b|2|-|g=docs/plans/billing.md|a=2
D|lg|4|src/legacy|a=4
T|a.login|0|q=email_password_to_session
T|st.create|1h|q=create_student
R|login|a.login
R|signin|a.login
R|학생등록|st.create
R|invoice|b.invoice
```

원칙:

- 상태의 공식 표현은 `0~5`와 보조 플래그 `h`, `l`이다.
- `DONE`, `WIP` 같은 단어는 사람용 문서와 `galpi explain`에서만 사용한다.
- 도메인·작업 ID는 짧고 안정적으로 유지한다.
- 자연어 요약이 필요하면 짧은 phrase 또는 별도 summary dictionary를 사용한다.
- **사람이 source.gp를 직접 타이핑하지 않는다.** 모든 편집은 `galpi set-state`, `galpi add-route` 등
  변형 커맨드를 경유한다 (Phase 2). 오타 하나가 조용한 오라우팅이 되는 것을 커맨드+검증으로 차단한다.

### 3.3 구조 레코드 예시

```text
F|f1|src/auth/auth.command.login.ts
F|f2|src/auth/auth.service.token.ts
F|f3|src/auth/auth.test.login.ts
Y|y1|login|f1
Y|y2|createToken|f2
T|a.login|0|e=y1|f=f1,f2|x=session.token,db|p=f3
```

### 3.4 Query 패킷

```text
Q|a.login|0|b=.galpi/BOOT.gp
E|y1|f1
F|f1,f2
X|session.token,db
P|f3
V|v/t/a.login.gp
```

`galpi query --ai`는 설명 없이 이 패킷만 출력한다.
첫 줄의 `b=` 필드는 BOOT 경로 상시 포함 — 긴 세션에서 컨텍스트 압축으로 opcode 정의가
휘발됐을 때 에이전트가 재부트할 수 있는 안전장치다. opcode를 해석할 수 없으면 추측하지 말고
`b=` 경로를 다시 읽는다.

---

## 4. 상태와 행동 규칙

| 코드 | 사람용 의미 | 기본 행동 |
|---|---|---|
| `0` | DONE | 직접 대상·영향 경로가 아니면 생략 |
| `1` | WIP | 상태 패킷과 최근 변경을 먼저 확인 |
| `2` | PLAN | 구현 코드 탐색 금지, 계획 참조만 허용 |
| `3` | EXP | 프로덕션 후보로 쓰기 전에 검증 |
| `4` | DEAD | 참조·재사용·수정 금지 |
| `5` | STALE | 지도 신뢰 금지, 코드 확인 후 재생성 |
| `h` | HOT | 최신 변경 확인 필수 |
| `l` | LOCK | 명시적 사용자 지시 없이는 수정 금지 |

`0`은 절대 금지가 아니라 `skip_default`다.  
`4`와 `l`만 강한 deny 규칙이다.

---

## 5. 데이터 소유권

| 정보 | 원본 | 비고 |
|---|---|---|
| 상태·행동·route·의도 | `.galpi/source.gp` | 변형 커맨드 경유로만 수정 |
| 실제 파일·심볼·import·test | 코드 | build가 추출 |
| `.galpi/MAP.gp` | 파생물 | 직접 수정 금지 |
| `.galpi/manifest.gp` | 파생물 | 직접 수정 금지 |
| `.galpi/v/` | 파생물 | 직접 수정 금지 |
| 사람용 YAML/Markdown | 선택적 debug 파생물 | 에이전트 기본 로딩 금지 |

코드 주석은 연결 ID만 허용한다.

```ts
/** @g t=a.login x=session.token */
export async function login() {}
```

상태와 장문 요약은 코드 주석에 중복 기록하지 않는다.

---

## 6. 멀티 에이전트 협업 체계 (Claude Code × Codex)

**존재 이유**: compact opcode는 자연어보다 tokenizer·모델 성향에 민감하다.
"Claude에서 C가 이겼다"는 "Codex에서도 이긴다"를 보장하지 않는다.
교차 검증 없이는 Galpi는 "Claude 전용 최적화"이지 프로토콜이 아니다 (헌법 10조).

### 역할 분담

| | Claude Code (빌더) | Codex (검증자) |
|---|---|---|
| 주 임무 | Phase 실행, 코드·CLI 구현 | 코드 리뷰, 독립·교차 측정, 스펙 검증 |
| 로드맵 수정 권한 | 체크박스·메모 갱신 단독 소유 | 없음 (제안만) |
| 작업 기록 | 로드맵 내 `> 메모:` | `docs/worklog/codex.md` |
| 브랜치 | `claude/*` | `codex/*` |

### 운영 규칙

1. 두 에이전트가 같은 파일을 같은 시점에 만지지 않는다. 조정자는 Git, 최종 결정권자는 사람.
2. 워크플로: Claude Code 구현 → PR → Codex 리뷰(Galpi 규칙 위반 포함: `4` 참조, index 우회 import, source 미갱신) → 사람이 머지.
3. 핸드오프: `.galpi/handoff.md`에 `[날짜] [에이전트] 완료 / 다음 할 일 / 주의` 형식, 최신이 맨 위.
4. **교차 측정 게이트**: 각 Phase의 측정은 두 에이전트에서 수행한다. 결과가 갈리면
   (한쪽에서 B > C 등) 강행하지 않고 opcode 명시성을 높이거나 profile 분기를 검토한 뒤 재측정.
5. 판단 충돌 시 handoff.md에 쟁점 기록 후 사람에게 이관.

---

## Phase 0 — AI 전용 수동 프로토타입

**목적**: CLI 없이도 compact protocol과 파일 뷰가 탐색에 도움이 되는지 확인한다.

### 산출물

```text
AGENTS.md
.galpi/BOOT.gp
.galpi/source.gp
.galpi/MAP.gp
.galpi/v/
src/
```

### 체크리스트

- [x] `galpi-lab/` TypeScript + Node 프로젝트 생성.
- [x] `auth`, `student`, `lesson`, `billing(PLAN)`, `legacy(DEAD)`, `shared` 도메인 구현.
- [x] 기능별 vertical slice 구조 적용.
- [x] 파일명은 `domain.kind.feature.ts` 형식 사용.
- [x] 도메인 외부 import는 `index.ts` 경유.
- [x] 독립적으로 변경되는 단위만 분리하고 5줄짜리 초세분화 파일은 피한다.
- [x] `AGENTS.md`는 최대한 짧게 작성:

  ```text
  # GALPI
  Before code work, read `.galpi/BOOT.gp` and follow it.
  ```

- [x] `.galpi/BOOT.gp`에 문법·상태·탐색 순서·deny 규칙만 기록.
- [x] `.galpi/source.gp`에 도메인·task·route를 compact record로 선언.
- [x] `.galpi/MAP.gp`를 수동 생성하되 1차 route 정보만 포함.
- [x] `.galpi/v/t`, `v/d`, `v/s`, `v/y`, `v/x`에 최소 View 생성.
- [x] View 확장자는 `.gp`만 사용하고 Markdown 제목·표·설명문을 넣지 않는다.
- [x] 각 View는 가능하면 5~30줄 안에서 끝낸다.
- [x] WIP/HOT 상태는 `.galpi/status/<id>.gp`에 짧은 구조 레코드로 기록.
- [x] 사람 확인용 설명이 필요하면 별도 `docs/`에 두되, AGENTS에서 읽도록 지시하지 않는다.

> 메모 (2026-07-16): 기존 YAML/Markdown Galpi 런타임을 AI-first compact protocol로 전환했다.
> `AGENTS.md`는 BOOT 위치만 알리는 2줄로 축소했고, `BOOT.gp` 28줄에 opcode·상태·행동·탐색 순서와
> 고정 레코드 문법을 정의했다. `source.gp`에는 6개 도메인, 8개 task, 21개 route를 선언하고
> `MAP.gp`에는 동일 route만 복제했다. task 8개 전체와 domain/state/symbol/dependency 관점을 포함해
> `.galpi/v/`에 25개 View를 만들었으며 모두 `.gp`, 5~30줄 규칙을 만족한다. 파일 ID 26개의 경로,
> route/task/View 연결, opcode, 상태 코드, status/guide 참조를 기계 검증했고 strict 타입 검사,
> 테스트 4건, ESM 빌드, 공개 index 경계 검사도 통과했다. 이전 Phase 1 측정은 방향 변경으로 폐기했으며
> AI-first Phase 1에서는 No Galpi / human-readable Galpi / compact Galpi의 새 A/B/C로 다시 측정한다.

---

## Phase 1 — AI 친화성 효과 측정

**목적**: 구조가 짧아졌는지가 아니라 실제 AI 탐색이 빨라지고 정확해졌는지 검증한다.

### 조건

- **A — No Galpi**: Galpi 파일 없음.
- **B — Human-readable Galpi**: YAML·Markdown MAP/View 사용.
- **C — AI-first Galpi**: `.gp` compact protocol 사용.

### 시나리오

- [x] DONE 로그인 버그 수정.
- [x] WIP/HOT 학생 정렬 기능 추가.
- [x] PLAN 청구 기능 질문.
- [x] DEAD legacy와 유사한 신규 기능 구현.
- [x] route 표현과 사용자 표현이 다른 작업 1개.

### 측정값

- [x] 최초 관련 파일 도달까지의 tool call 수.
- [x] 읽은 파일 수와 관련 없는 파일 수.
- [x] bootstrap/context 토큰 수.
- [x] query 결과 토큰 수.
- [x] 전체 저장소 검색 여부.
- [x] route 선택 정확도.
- [x] 상태 규칙 준수율.
- [x] protocol parse 실패·재질문 횟수.
- [x] 잘못된 파일 수정 여부.
- [x] 테스트 성공률.
- [x] 총 비용과 총 토큰.

### 판정

- [x] C가 B보다 토큰·탐색 비용을 줄이면서 정확도를 유지하거나 높여야 한다.
- [x] 축약 때문에 parse 오류가 증가하면 opcode를 덜 줄이고 명시성을 높인다.
- [x] 사람 눈에 더 복잡해졌는지는 실패 기준이 아니다.
- [x] 결과를 `docs/experiments/phase1-ai-first.md`에 기록.

> **Phase 1 완료 메모 (2026-07-16)**
>
> 최종 C2 fixture로 A/B/C 각 15회, 총 45회를 재실행했다. C2는 B와 동일한 정확도 100%를 유지하면서
> 실제 총 토큰 16.60%, protocol component token proxy 34.69%, 관련 없는 파일 읽기 53.33%,
> 평균 실행 시간 7.47%를 줄였다. 최초 관련 파일 도달은 3.53 → 3.47 calls, 전체 저장소 검색은
> 20% → 0%, route/state 준수는 80/73.3% → 100/100%였다. parse 실패·재질문은 0회였다.
> 초기 C1은 BOOT/MAP 분리 호출 때문에 최초 도달 판정에 실패했고, C2에서 결합 읽기와 명시적
> View/DEAD replacement 링크를 추가한 뒤 통과했다. 상세 결과와 한계는
> `docs/experiments/phase1-ai-first.md`에 기록했다. USD 단가는 CLI event에 없어 토큰 합계와 wall time을
> 비용 대리값으로 사용했다.

---

## Phase 1.5 — Codex 교차 검증 게이트 (Phase 2 진입 조건)

**목적**: Phase 1의 결론(C ≥ B)이 단일 에이전트 전용 현상이 아님을 확인한다.
이 게이트를 통과해야 compact protocol을 기반으로 CLI를 구축하는 Phase 2가 정당화된다.

> **정정 메모 (2026-07-17)**: Phase 1 본 측정이 Codex CLI(gpt-5.6-sol)로 수행되었으므로
> 이 게이트의 교차 검증 에이전트는 **Claude Code**다. 아래 체크리스트의 "Codex"는
> "교차 에이전트(Claude Code)"로 읽는다.

### 체크리스트

- [x] 교차 에이전트(Claude Code) 환경 준비: 동일 fixture(A/B/C), 동일 시나리오 5종.
- [x] 교차 에이전트에서 A/B/C 각 15회 실행 (Phase 1과 동일 프로토콜).
  (`claude-full-1`, 45/45 유효 — r3 사용량 한도 실패 12회는 `--retry-excluded`로 재실행)
- [x] 측정값 동일 항목 기록, 에이전트별 컬럼 분리 → `docs/experiments/phase1-claude.md`.
- [x] 측정기에서 캐시/비캐시 입력 토큰을 분리 수집하고, 원시 합계와 함께 유효 토큰
  `ET = m × (1.0·I_fresh + 0.1·I_cached + 4.0·O)` (GitHub Agentic Workflows 공식)를 병기.
  Claude Code는 프롬프트 캐싱 비중이 커서 원시 합계만으로는 B/C 비교가 왜곡될 수 있다.
- [x] **판정**:
  - Codex에서도 C ≥ B (정확도 유지 + 비용 감소) → Phase 2 진행.
  - Codex에서 B > C → opcode 명시성 상향(C3) 후 양쪽 재측정. 그래도 갈리면
    모델별 profile 분기(Phase 5 항목)를 Phase 2 설계에 앞당겨 반영.
  - Codex에서 parse 실패 발생 → 실패 지점의 opcode/구분자를 기록하고 BOOT 문법 보강.
- [x] 두 에이전트 결과 비교 요약 1페이지 작성 (공개 시 "agent-agnostic" 증빙의 초석).
  (`docs/experiments/phase1-claude.md`의 "두 에이전트 비교" 섹션)

> **판정 결과 (2026-07-18)**: Claude에서 C2는 토큰 -27.1%(ET -22.0%)·route +20%p·state
> +6.7%p로 이겼지만 정확도 93.3%(<B 100%, 1회 차)와 탐색 효율(관련 없는 읽기·전체 검색·
> 실행 시간)에서 밀려 엄격 게이트 `acceptsC: false` — **"B > C" 분기 적용: C3 opcode
> 명시성 상향 후 양쪽 재측정. parse 실패는 0회로 `.gp` 문법 자체는 agent-agnostic 확인.**
> Claude의 확률적 프로토콜 생략이 원인이므로 PreToolUse 훅 게이팅(Phase 2)의 근거가 보강됨.

---

## Phase 2 — `galpi check` + 변형 커맨드: 스테일·스키마·수기 편집 차단

**목적**: compact protocol이 낡거나 깨진 상태를 자동 감지하고,
사람 손이 opcode를 직접 만지는 경로를 제거한다.

### 체크리스트

- [ ] `tools/galpi/` CLI 생성.
- [ ] `.gp` parser와 schema validator 구현.
- [ ] 중복 ID, 미정의 opcode, 잘못된 상태 코드, 끊어진 참조를 오류 처리.
- [ ] **변형 커맨드 구현** (source.gp 수기 편집 대체):
  - `galpi set-state <id> <code>` — 상태 변경 (유효 코드 검증 포함)
  - `galpi add-route <alias> <task-id>` / `galpi rm-route <alias>`
  - `galpi add-task <id> <state> [q=...]` / `galpi add-domain <id> <state> <path>`
  - 모든 변형 커맨드는 쓰기 전 schema 검증, 쓴 후 참조 무결성 검증을 통과해야 커밋.
- [ ] 각 도메인 git tree hash와 `verified` 값 비교.
- [ ] 불일치 시 상태를 런타임에서 `5`로 취급.
- [ ] `PLAN`에 코드가 발견되면 오류.
- [ ] `DEAD`가 외부 import되면 오류.
- [ ] `LOCK` 파일 수정 감지.
- [ ] **PreToolUse 훅 게이팅**: 에이전트 래퍼(Claude Code hooks 등)에서 `.galpi` 상태 파서를
  재사용해 DEAD(4)·LOCK(l) 경로에 대한 write/edit 도구 호출을 셸 단에서 거부.
  상태 규약을 프롬프트 추종이 아니라 물리적으로 강제한다 (SWE-agent ACI의 린터 게이트 준용).
- [ ] (실험 설계) 더 큰 fixture 재측정에 3개 파일 이상을 고치는 multi-file 변경 시나리오 포함.
  구조 인덱스의 정확도 이득이 multi-file 변경에서 최대라는 외부 실증 반영
  (`docs/plans/external-review-2026-07.md` 참조).
- [ ] `galpi check --ai`는 compact 오류 패킷 출력.
- [ ] `galpi check --human` 또는 `galpi explain errors`는 사람용 설명 출력.
- [ ] pre-commit과 CI에 `galpi check` 연결.
- [ ] Codex 환경에서 CLI 동작 확인 (리뷰 + 실행 테스트).
- [ ] 오탐·미탐을 `docs/experiments/phase2-check.md`에 기록.

오류 패킷 예시:

```text
ERR|stale|d=a|want=h91|got=h27
ERR|dead_import|from=st|to=lg
ERR|missing_ref|t=a.login|f=f9
```

---

## Phase 3 — `galpi build`: AI View 자동 생성

**목적**: 코드 구조를 자동 추출해 compact MAP, manifest, View를 동시에 만든다.

### 원칙

1. 상태와 의도는 `source.gp`에서만 읽는다.
2. 구조는 실제 코드에서 추출한다.
3. 모든 AI 런타임 산출물은 `.gp`로 생성한다.
4. 사람용 YAML/Markdown은 debug 옵션일 뿐이다.
5. 직접 AST를 만들지 않고 `ts-morph`, 필요 시 `tree-sitter`를 사용한다.

### 체크리스트

- [ ] `@g t=<task-id> x=<dep-id>` 주석 파싱.
- [ ] export symbol → `Y` 레코드 생성.
- [ ] 파일 → `F` 레코드 생성.
- [ ] import → `X` 관계 생성.
- [ ] test → `P` 관계 생성.
- [ ] source의 상태·route와 코드 구조 병합.
- [ ] 충돌 시 추측하지 않고 `ERR` 또는 상태 `5` 출력.
- [ ] 한 번의 build에서 생성:

  ```text
  .galpi/MAP.gp
  .galpi/manifest.gp
  .galpi/v/t/*.gp
  .galpi/v/d/*.gp
  .galpi/v/s/**/*.gp
  .galpi/v/y/*.gp
  .galpi/v/x/*.gp
  ```

- [ ] `MAP.gp`에는 route와 상위 상태만 저장.
- [ ] `manifest.gp`는 전체 레코드를 저장하되 기본 컨텍스트에서 읽지 않음.
- [ ] 개별 View에는 해당 task 수행에 필요한 최소 레코드만 저장.
- [ ] ID dictionary를 사용해 긴 경로 반복을 줄임.
- [ ] **축약 경로 실측** (헌법 9조): `v/t/` vs `v/task/` 형태로 동일 시나리오를 양 에이전트에서
      실행해 토큰 차이와 오해·parse 오류율 비교. 차이가 미미하면 가독형(`v/task/`) 채택.
- [ ] 생성물에 장문 헤더를 넣지 않고 한 줄 버전 표시만 사용: `G|1|gen`.
- [ ] 순환 의존, 고립 task, 없는 entrypoint, 테스트 없는 HOT/WIP를 경고.
- [ ] `galpi build --check`로 생성물 최신 상태 검증.
- [ ] `galpi build --debug`에서만 YAML/Markdown 설명 생성.
- [ ] Phase 1의 A/B/C 실험 재실행 — **Claude Code와 Codex 양쪽에서**.
- [ ] View 크기, 생성 시간, query packet 토큰 수까지 기록.

---

## Phase 4 — 에이전트 통합 (Claude Code 스킬·훅 + Codex AGENTS.md)

**목적**: 에이전트가 자연어 문서를 읽는 대신 Galpi query 패킷으로 작업 대상을 고르게 한다.
두 에이전트에서 같은 프로토콜이 작동함을 보이는 것이 "agent-agnostic" 주장의 최종 검증.

### 체크리스트

- [ ] `galpi query --ai`와 `--json` 제공. 패킷 첫 줄에 `b=BOOT경로` 상시 포함 (BOOT 휘발 대비 재부트 앵커).
- [ ] **Claude Code 통합**:
  - `.claude/skills/galpi-navigator/SKILL.md` 작성. 본문은 BOOT 위치와 query 명령만 안내하고 중복 설명을 피함.
  - 작업 시작 절차:

    ```text
    read BOOT.gp
    galpi query --ai "<task>"
    read returned V path
    read returned F/E targets
    ```

  - 세션 시작 훅에서 `galpi check --ai` 실행.
  - 작업 완료 훅에서 `galpi build --check`와 관련 테스트 실행.
- [ ] **Codex 통합**:
  - `AGENTS.md`에 동일 시작 절차를 Codex용으로 명시 (BOOT 읽기 → query → V/F 읽기).
  - Codex는 훅이 없으므로 지침+CLI 조합으로 유도하고, 지침 준수율을 Claude Code(훅 강제)와 비교 기록.
- [ ] route가 있으면 repo-wide search 금지.
- [ ] 상태 `5`, 테스트 충돌, 미정의 참조에서만 범위 확장.
- [ ] opcode 해석 불가 시 추측 금지, `b=` 경로 재읽기 규칙을 스킬·AGENTS 양쪽에 명시.
- [ ] `galpi explain <id>`로 사람용 설명 제공.
- [ ] 전체 검색·규칙 위반을 로그로 남김.
- [ ] **장기 세션 측정 추가**: 컨텍스트 압축이 발생할 만큼 긴 세션(대화 30+턴 또는 대형 파일 다수 로딩 후)에서
      protocol parse 오류율·재부트 발동 횟수·규칙 준수율을 별도 측정. 단발 시나리오에서 안 잡히는 BOOT 휘발 리스크 검증.
- [ ] 통합 전후 정확도·토큰·툴 호출 수 비교 — 두 에이전트 모두 → `docs/experiments/phase4.md`.

---

## Phase 5 — 고도화

- [ ] **별칭 해시 인덱스**: 같은 task를 가리키는 다국어·동의어 route를 compact dictionary로 관리.
- [ ] **시맨틱 후보 탐색**: 정확 route 실패 시 task summary만 임베딩해 후보 ID를 반환.
- [ ] **벡터 역할 제한**: 임베딩은 task 후보만 찾고, 실제 파일 결정은 Galpi View가 수행.
- [ ] **역의존 영향 분석**: 수정 symbol에서 영향 task·테스트를 자동 제안.
- [ ] **지연 View 생성**: 대형 저장소에서는 요청된 domain/task View만 생성.
- [ ] **모델별 protocol profile**: Phase 1.5·3·4의 교차 측정 데이터를 기반으로 tokenizer·오류율에 따라 opcode profile 선택.
- [ ] **binary cache**: 프로그램용 캐시는 binary/DB로 저장하되 LLM 입력은 compact text packet으로 변환.
- [ ] **다국어·monorepo 지원**.
- [ ] **기존 구조 인덱서 연동**: Serena, CodeGraph 등은 구조 사실을 제공하고 Galpi는 의도와 라우팅을 담당.
- [ ] 공개용 스펙·레퍼런스 구현·벤치마크 작성. "works with Claude Code & Codex" 교차 측정 데이터를 핵심 증빙으로 포함.

---

## 장기 방향 — 규모 적응형 갈피 (Adaptive Depth)

> 2026-07-17 방향 결정. 지금 구현하지 않는다. 다만 Phase 2 이후의 설계 결정이
> 이 방향과 충돌하지 않도록 참조한다.

갈피는 고정된 무게의 프로토콜이 아니라, 프로젝트의 규모·복잡도·참여자 수를 파악해
스스로 깊이를 조절하는 계층으로 나아간다. 근거는 Phase 1 실측이다: 작은 fixture에서는
No Galpi(A)의 총 토큰이 가장 쌌다. 갈피 구조에는 손익분기점이 있고, 그 아래에서는
구조 자체가 낭비다.

| 레벨 | 조건(예시) | 형태 |
|---|---|---|
| L0 — 없음 | 소규모 단일 작업 프로젝트 | AGENTS.md 몇 줄 수준, `.galpi` 없음 |
| L1 — 얕은 라우팅 | 도메인이 나뉘기 시작 | BOOT + source + route만, view 없음 |
| L2 — 전체 구조화 | 크고 무거운 프로젝트 | 현행 compact protocol 전체 (BOOT/MAP/source/views/status) |
| L3 — 협업 계층 | 다중 에이전트·다인 팀 | L2 + 사람용 렌더링(`galpi explain`, 대시보드, 외부 도구 연동)으로 인간 접근성 보강 |

- **레벨 판정은 자동**: 파일 수, 도메인 수, 활성 task 수, 참여 에이전트/사람 수 같은
  신호로 `galpi init`/`galpi check`가 권장 레벨을 제안하고 승급·강등을 안내한다.
- **손익분기점은 실측으로**: Phase 2 이후 fixture 재측정(multi-file 포함)에서
  레벨별 break-even을 수치로 잡는다.
- **L3도 분리 원칙 유지**: 사람용 계층은 렌더링과 외부 도구로 제공하고(헌법 7),
  에이전트 런타임은 계속 compact `.gp`다.

---

## 보류함

| 아이디어 | 보류 이유 | 재검토 조건 |
|---|---|---|
| 이모티콘 공식 문법 | tokenizer 비용과 모델별 해석 차이가 큼 | 실측에서 ASCII 코드보다 효율·정확도가 높을 때 |
| 장문 YAML을 런타임 원본으로 사용 | 반복 키와 공백이 많고 점진적 로딩에 불리 | compact parser 안정성이 확보되지 않을 때 임시 fallback |
| Markdown View | 제목·표·설명이 런타임 토큰을 소비 | 특정 모델이 compact protocol을 반복적으로 오해할 때 |
| 파일 심볼릭 링크 | Windows/Git 호환성 문제 | 경로 레코드보다 도구 호출 수가 실제로 적어질 때 |
| FUSE 가상 파일시스템 | 복잡도와 배포 비용이 큼 | 일반 `.gp` View가 동적 질의를 감당하지 못할 때 |
| AST 인덱서 직접 구축 | 기존 파서가 충분함 | 필요한 구조 정보를 기존 도구에서 얻지 못할 때 |
| 전체 코드 임베딩 자체 구현 | 정확 route보다 느리고 오탐 가능 | task 후보 검색만으로 부족함이 측정될 때 |
| 파일 초세분화 | 파일 open 호출과 경로 토큰 증가 | 안정적인 symbol slice 로딩이 가능할 때 |

---

## 성공 기준

Galpi는 아래를 만족해야 성공이다.

```text
route_accuracy ↑
first_target_latency ↓
irrelevant_reads ↓
context_tokens ↓
wrong_edits ↓
test_success >= baseline
protocol_parse_errors ≈ 0
stale_detection ↑
cross_agent_consistency ↑   # Claude와 Codex의 지표 방향 일치
```

사람이 파일을 쉽게 읽을 수 있는지는 핵심 KPI가 아니다.
단, 한 에이전트에서만 성립하는 지표 개선은 성공으로 인정하지 않는다.

---

## 에이전트 실행 지침

**공통**

1. 현재 Phase의 체크리스트에서 자기 역할에 해당하는 작업을 순서대로 수행한다.
2. Phase를 건너뛰지 않는다. Phase 1.5 게이트는 통과 전 Phase 2 착수 금지.
3. 상태·route·의도는 변형 커맨드(Phase 2 이후) 또는 `.galpi/source.gp`에서만 변경한다.
4. `MAP.gp`, `manifest.gp`, `.galpi/v/`를 직접 수정하지 않는다.
5. 생성 결과와 코드가 충돌하면 추측하지 말고 `ERR` 또는 상태 `5`로 보고한다.
6. AI 런타임 산출물에 사람용 장문 설명을 추가하지 않는다.
7. 새 문법을 추가할 때는 BOOT 크기, tokenizer 비용, parse 오류율을 **두 에이전트에서** 측정한다.
8. 토큰 절감만으로 성공을 선언하지 않는다. 정확도·테스트·잘못된 수정 방지·교차 일관성도 함께 평가한다.
9. 사람이 이해하기 어려운 표현이라도 AI 정확도와 효율이 높으면 유지한다.
10. 로드맵 변경이 필요하면 사용자에게 변경 이유와 수정안을 먼저 제시한다.
11. 작업 종료 시 `.galpi/handoff.md`에 핸드오프를 남긴다.

**Claude Code (빌더)**: 구현 담당. 로드맵 체크박스·메모 갱신 권한 단독 소유.

**Codex (검증자)**: 리뷰·교차 측정 담당. 로드맵을 수정하지 않고 `docs/worklog/codex.md`와 PR 리뷰로 기록.
