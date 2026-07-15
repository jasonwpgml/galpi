# Galpi 프로젝트 로드맵 — AI-First Revision

> **Galpi (갈피)**: 코드베이스에 표식을 꽂고, 에이전트가 최소 탐색으로 작업 방향을 잡게 하는 프로젝트 라우팅 계층.
>
> **최상위 원칙**: Galpi의 런타임 파일은 사람에게 친절할 필요가 없다.  
> 사람의 가독성보다 **AI의 탐색 정확도, 규칙 해석 안정성, 토큰 효율, 점진적 로딩**을 우선한다.
>
> **목표**: 코드베이스를 작업·도메인·상태·심볼·의존성 기준으로 조회할 수 있는 AI 전용 파일 뷰와 상태/의도 기반 라우팅 프로토콜을 만든다.
>
> **실행 전략**: 작은 실험 프로젝트에서 측정하고, 효과가 확인된 기능만 다음 Phase로 올린다.

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

경로명도 AI용으로 짧게 유지한다.

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
Q|a.login|0
E|y1|f1
F|f1,f2
X|session.token,db
P|f3
V|v/t/a.login.gp
```

`galpi query --ai`는 설명 없이 이 패킷만 출력한다.

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
| 상태·행동·route·의도 | `.galpi/source.gp` | 사람 또는 AI가 명시적으로 수정 |
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

## Phase 2 — `galpi check`: 스테일과 스키마 검증

**목적**: compact protocol이 낡거나 깨진 상태를 자동 감지한다.

### 체크리스트

- [ ] `tools/galpi/` CLI 생성.
- [ ] `.gp` parser와 schema validator 구현.
- [ ] 중복 ID, 미정의 opcode, 잘못된 상태 코드, 끊어진 참조를 오류 처리.
- [ ] 각 도메인 git tree hash와 `verified` 값 비교.
- [ ] 불일치 시 상태를 런타임에서 `5`로 취급.
- [ ] `PLAN`에 코드가 발견되면 오류.
- [ ] `DEAD`가 외부 import되면 오류.
- [ ] `LOCK` 파일 수정 감지.
- [ ] `galpi check --ai`는 compact 오류 패킷 출력.
- [ ] `galpi check --human` 또는 `galpi explain errors`는 사람용 설명 출력.
- [ ] pre-commit과 CI에 `galpi check` 연결.
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
- [ ] 생성물에 장문 헤더를 넣지 않고 한 줄 버전 표시만 사용: `G|1|gen`.
- [ ] 순환 의존, 고립 task, 없는 entrypoint, 테스트 없는 HOT/WIP를 경고.
- [ ] `galpi build --check`로 생성물 최신 상태 검증.
- [ ] `galpi build --debug`에서만 YAML/Markdown 설명 생성.
- [ ] Phase 1의 A/B/C 실험 재실행.
- [ ] View 크기, 생성 시간, query packet 토큰 수까지 기록.

---

## Phase 4 — Claude Code 통합

**목적**: Claude가 자연어 문서를 읽는 대신 Galpi query 패킷으로 작업 대상을 고르게 한다.

### 체크리스트

- [ ] `.claude/skills/galpi-navigator/SKILL.md` 작성.
- [ ] 스킬 본문은 BOOT 위치와 query 명령만 안내하고 중복 설명을 피함.
- [ ] 작업 시작 절차:

  ```text
  read BOOT.gp
  galpi query --ai "<task>"
  read returned V path
  read returned F/E targets
  ```

- [ ] route가 있으면 repo-wide search 금지.
- [ ] 상태 `5`, 테스트 충돌, 미정의 참조에서만 범위 확장.
- [ ] 세션 시작 훅에서 `galpi check --ai` 실행.
- [ ] 작업 완료 훅에서 `galpi build --check`와 관련 테스트 실행.
- [ ] `galpi query --ai`와 `--json` 제공.
- [ ] `galpi explain <id>`로 사람용 설명 제공.
- [ ] 전체 검색·규칙 위반을 로그로 남김.
- [ ] 스킬 적용 전후 정확도·토큰·툴 호출 수 비교.

---

## Phase 5 — 고도화

- [ ] **별칭 해시 인덱스**: 같은 task를 가리키는 다국어·동의어 route를 compact dictionary로 관리.
- [ ] **시맨틱 후보 탐색**: 정확 route 실패 시 task summary만 임베딩해 후보 ID를 반환.
- [ ] **벡터 역할 제한**: 임베딩은 task 후보만 찾고, 실제 파일 결정은 Galpi View가 수행.
- [ ] **역의존 영향 분석**: 수정 symbol에서 영향 task·테스트를 자동 제안.
- [ ] **지연 View 생성**: 대형 저장소에서는 요청된 domain/task View만 생성.
- [ ] **모델별 protocol profile**: Claude, Codex 등 모델별 tokenizer·오류율에 따라 opcode profile 선택.
- [ ] **binary cache**: 프로그램용 캐시는 binary/DB로 저장하되 LLM 입력은 compact text packet으로 변환.
- [ ] **다국어·monorepo 지원**.
- [ ] **기존 구조 인덱서 연동**: Serena, CodeGraph 등은 구조 사실을 제공하고 Galpi는 의도와 라우팅을 담당.
- [ ] 공개용 스펙·레퍼런스 구현·벤치마크 작성.

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
```

사람이 파일을 쉽게 읽을 수 있는지는 핵심 KPI가 아니다.

---

## Claude Code 실행 지침

1. 현재 Phase의 체크리스트를 순서대로 수행한다.
2. Phase를 건너뛰지 않는다.
3. 상태·route·의도는 `.galpi/source.gp`에서만 변경한다.
4. `MAP.gp`, `manifest.gp`, `.galpi/v/`를 직접 수정하지 않는다.
5. 생성 결과와 코드가 충돌하면 추측하지 말고 `ERR` 또는 상태 `5`로 보고한다.
6. AI 런타임 산출물에 사람용 장문 설명을 추가하지 않는다.
7. 새 문법을 추가할 때는 BOOT 크기, tokenizer 비용, parse 오류율을 함께 측정한다.
8. 토큰 절감만으로 성공을 선언하지 않는다. 정확도·테스트·잘못된 수정 방지도 함께 평가한다.
9. 사람이 이해하기 어려운 표현이라도 AI 정확도와 효율이 높으면 유지한다.
10. 로드맵 변경이 필요하면 사용자에게 변경 이유와 수정안을 먼저 제시한다.
