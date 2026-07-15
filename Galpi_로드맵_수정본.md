# Galpi 프로젝트 로드맵

> **Galpi (갈피)**: ① 책갈피 — 코드베이스 곳곳에 꽂아둔 표식. ② 갈피를 잡다 — 길 잃은 에이전트가 방향을 찾게 한다.
> 한 단어가 이 기술의 두 축(표식 + 방향 감각)을 모두 담는다.
> 영문 소개 한 줄: *Galpi (갈피): a Korean word meaning both "bookmark" and "one's bearings".*
> 백로님(선택): **G**uided **A**gent **L**ayer for **P**roject **I**ntent
>
> **목표**: 기존 기술(AGENTS.md, tree-sitter, repo map, 시맨틱 검색 MCP 등)을 참고·활용하면서,
> 코드베이스를 에이전트가 **작업·도메인·상태·심볼·의존성 기준으로 탐색할 수 있는 파일 기반 프로젝트 뷰**와
> **상태/의도 기반 라우팅 프로토콜(Galpi Protocol)** 을 단계적으로 완성한다.
>
> **전략**: 한 번에 다 만들지 않는다. 바로 쓸 수 있는 것부터 적용한 실험 프로젝트를 만들고,
> 그 위에서 Phase를 하나씩 올리며 업그레이드한다. 각 Phase는 이전 Phase가 동작하는 상태에서 시작한다.
>
> **실행 주체**: Claude Code. 이 문서를 읽고 현재 Phase의 체크리스트를 순서대로 수행한다.

## 네이밍 규약

| 대상 | 이름 |
|------|------|
| 스펙/프로토콜 | Galpi Protocol (문서 헤더: `# GALPI/1`) |
| CLI 도구 | `galpi` (`galpi build`, `galpi check`, `galpi verify`, `galpi query`) |
| 설정 폴더 | `.galpi/` |
| 사람이 편집하는 원본 | `.galpi/source.yaml` |
| 자동 생성 탐색 뷰 | `.galpi/view/` |
| 자동 생성 기계 인덱스 | `.galpi/manifest.json` |
| 실험 프로젝트 폴더 | `galpi-lab/` |
| 코드 주석 태그 | `@galpi-task`, `@galpi-depends`, `@galpi-summary` |
| Claude Code 스킬 | `galpi-navigator` |

---

## 핵심 개념 (이 프로젝트가 만드는 것)

기존 코드 인텔리전스 도구들(Aider repo map, Serena, CodeGraph, claude-context 등)은
**구조(structure)** — 코드가 어디 있고 무엇을 export하며 누가 참조하는가 — 를 인덱싱한다.

Galpi는 구조 위에 다음 두 층을 추가한다.

### 1. 의도 레이어

- 이 코드가 완성인지(`DONE`), 작업 중인지(`WIP`), 계획뿐인지(`PLAN`), 폐기됐는지(`DEAD`)
- 어떤 조건에서 읽어야 하고(`read-if`), 어떤 조건에서 기본적으로 건너뛰어야 하는지(`skip-if`)
- 코드가 바뀌었는데 지도가 갱신되지 않았는지(`STALE`)
- 어떤 작업과 관련되며, 어떤 위험·제약·결정 사항이 있는지

이 정보는 자동 추출만으로 알기 어려운 "사람 머릿속 정보"이므로 사람이 선언한다.

### 2. 탐색 뷰 레이어

같은 코드베이스를 에이전트가 여러 관점의 파일 구조로 조회할 수 있게 한다.

```text
.galpi/view/
├── by-task/          # auth.login, student.create 등
├── by-domain/        # auth, student, lesson 등
├── by-status/        # DONE, WIP, PLAN, DEAD, STALE
├── by-symbol/        # LoginService, createStudent 등
└── by-dependency/    # redis, database, payment-provider 등
```

이 뷰에는 코드를 복사하지 않는다. 다음 정보만 둔다.

```text
실제 파일 경로 / 심볼 / 상태 / 진입점 / 의존성 / 테스트 / 짧은 요약 / 읽기·수정 규칙
```

즉 Galpi는 단순한 문서 모음이 아니라 다음 흐름을 만드는 프로젝트 탐색 인터페이스다.

```text
사용자 작업
  → 정확한 route 조회
  → Galpi View에서 관련 작업·파일 확인
  → 필요한 실제 코드만 읽기
  → 수정·테스트
  → 지도 검증 및 갱신
```

---

## 데이터 소유권 원칙 (Single Source of Truth)

상태와 행동 규칙의 원본은 **오직 `.galpi/source.yaml` 하나**다.

| 정보 | 원본 | 처리 방식 |
|------|------|----------|
| 상태(`DONE`, `WIP` 등) | `.galpi/source.yaml` | 사람이 편집 |
| `read-if`, `skip-if`, `LOCK` 등 | `.galpi/source.yaml` | 사람이 편집 |
| 작업 요약·계획 문서 경로 | `.galpi/source.yaml` | 사람이 편집 |
| 파일·심볼·import·테스트 관계 | 실제 코드 | `galpi build`가 추출 |
| `MAP.yaml` | 파생 결과 | 자동 생성, 직접 수정 금지 |
| `manifest.json` | 파생 결과 | 자동 생성, 직접 수정 금지 |
| `.galpi/view/` | 파생 결과 | 자동 생성, 직접 수정 금지 |

코드 주석에는 상태를 중복 기록하지 않는다.

```ts
/**
 * @galpi-task auth.login
 * @galpi-depends session.token
 * @galpi-summary 이메일 인증 후 세션을 생성한다.
 */
export async function login() {}
```

`@galpi-status`는 사용하지 않는다. 상태는 `.galpi/source.yaml`에서만 변경한다.

---

## 상태 태그 공식 문법 (v1)

ASCII 태그가 공식이고, 기호는 사람용 별칭이다.

| 태그 | 별칭 | 의미 | 에이전트 규칙 |
|------|-----|------|--------------|
| `[DONE]` | ● | 안정적으로 구현됨 | 기본적으로 내부 탐색 생략. 단, 직접 수정 대상·의존성 경로·영향 범위·실패 테스트와 관련되면 확인 가능 |
| `[WIP]` | ◐ | 작업 중 | 수정 전 status와 최근 변경 반드시 확인 |
| `[PLAN]` | ○ | 계획만 존재 | 구현 코드가 없으면 코드 검색 금지, 계획 문서만 확인 |
| `[EXP]` | △ | 실험적 | 프로덕션 코드로 간주하지 않으며 사용 전 검증 필요 |
| `[DEAD]` | × | 폐기됨 | 참조·재사용·수정 금지, 해결책 후보에서 제외 |
| `[HOT]` | ! | 변경 잦음 (보조 태그) | 항상 최신 상태와 최근 변경 확인 |
| `[LOCK]` | = | 수정 금지 (보조 태그) | 명시적 지시 없이 수정 금지 |
| `[STALE]` | ? | 지도와 코드 불일치 | 지도 내용을 사실로 단정하지 말고 코드 확인 후 지도 갱신 |

`skip`은 **기본 동작을 생략하는 것**이지, 필요한 조사까지 영구적으로 금지하는 의미가 아니다.
`DEAD`와 `LOCK`만 강한 금지 규칙으로 취급한다.

---

## 탐색 우선순위 (모든 Phase에서 유지)

```text
1. MAP의 routes에서 정확한 작업·도메인 조회
2. .galpi/view/에서 작업·도메인·상태별 후보 확인
3. 파일·심볼 이름 검색 (파일명 복합키 컨벤션 활용)
4. 의존성 그래프와 영향 범위 확인
5. 제한된 범위에서 텍스트 검색 (grep)
6. 임베딩/시맨틱 검색 (route가 없거나 표현이 다른 경우의 최후 수단)
```

정확한 route와 파일 목록이 존재하면 저장소 전체 검색을 하지 않는다.
단, 해당 route가 `[STALE]`이거나 테스트 결과가 route와 충돌하면 필요한 범위까지 탐색을 확장한다.

---

## Phase 0 — 실험 프로젝트 부트스트랩 (지금 바로)

**목적**: Galpi의 두 축인 `의도 라우팅`과 `파일 기반 탐색 뷰`를 수동으로 적용해 볼 실험장을 만든다.
아직 CLI 도구는 구현하지 않는다.

**산출물**: 동작하는 소규모 앱 + 수동 `source.yaml` + 최소 Galpi View.

### 체크리스트

- [x] 새 프로젝트 폴더 생성: `galpi-lab/`. TypeScript + Node 기반 추천 (파싱 도구 생태계가 풍부함).
- [x] 실험용 샘플 앱 구현: 도메인이 3~5개 이상 나오는 규모여야 측정이 의미 있음.
      추천: 간단한 학습 관리 앱 — `auth`(로그인/세션), `student`(CRUD), `lesson`(CRUD),
      `billing`(계획만 두고 미구현 → PLAN 실험용), `legacy`(일부러 폐기 코드 → DEAD 실험용), `shared`.
- [x] **기능별 수직 분할(vertical slice)** 구조로 작성:
  ```text
  src/
  ├── auth/
  │   ├── index.ts          ← 공개 인터페이스 (다른 도메인은 이것만 import)
  │   ├── auth.command.login.ts
  │   ├── auth.query.current-user.ts
  │   ├── auth.service.token.ts
  │   ├── auth.repository.user.ts
  │   └── auth.test.login.ts
  ├── student/ ...
  ├── lesson/ ...
  ├── legacy/ ...           ← [DEAD] 실험용
  └── shared/
  ```
- [x] 파일명 복합키 컨벤션 적용: `도메인.작업유형.세부기능.ts`
      (작업유형: `command` / `query` / `service` / `repository` / `schema` / `types` / `test`)
- [x] 도메인 간 import는 반드시 `@/도메인`의 `index.ts`를 경유. 순환 의존 금지 (공유 코드는 `shared/`로).
- [x] "독립적으로 변경되는 단위만 분리" 원칙 준수. 한 곳에서만 쓰는 타입은 같은 파일에 두고 과도하게 쪼개지 않는다.
- [x] 루트에 `AGENTS.md` 작성 (30~80줄): 상태 태그 정의 + 탐색 우선순위 + 아래 행동 규칙만 둔다.
  ```text
  # Galpi Protocol v1
  [DONE] 기본적으로 내부 탐색을 생략하되 직접 대상·의존성·영향 범위면 확인한다.
  [WIP]  수정 전 status와 최근 변경사항을 확인한다.
  [PLAN] 구현 코드가 없으면 계획 문서만 확인한다.
  [DEAD] 참조·재사용·수정하지 않는다.
  [EXP]  프로덕션 코드로 간주하지 않는다.
  [STALE] 지도를 신뢰하지 말고 코드 확인 후 갱신한다.

  탐색 순서:
  1. .galpi/MAP.yaml의 route 조회
  2. .galpi/view/에서 관련 작업과 파일 확인
  3. 해당 범위의 실제 코드만 탐색
  4. route가 없을 때만 제한적 텍스트 검색
  Task와 관련 없는 도메인의 문서·코드는 기본적으로 읽지 않는다.
  ```
- [x] `CLAUDE.md`에서 `AGENTS.md`를 참조하도록 연결.
- [x] 상태·라우팅의 단일 원본 `.galpi/source.yaml` 수동 작성:
  ```yaml
  # GALPI/1
  routes:
    login: auth.login
    session: auth.session
    "학생 등록": student.create
    "수강 신청": lesson.enroll
    invoice: billing.invoice

  domains:
    auth:
      state: DONE
      path: src/auth/
      deps: [shared.database]
      skip: unless-touching-or-impact

    student:
      state: WIP
      tags: [HOT]
      path: src/student/
      read: always
      status: .galpi/status/student.md

    billing:
      state: PLAN
      code: none
      guide: docs/plans/billing.md

    legacy:
      state: DEAD
      path: src/legacy/
      use: false

  tasks:
    auth.login:
      state: DONE
      summary: 이메일과 비밀번호를 검증하고 세션을 생성한다.
      entrypoints: [src/auth/auth.command.login.ts#login]
      tests: [src/auth/auth.test.login.ts]
  ```
- [x] `.galpi/status/`에 WIP 도메인의 현재 작업 상황을 10~30줄 이내로 기록.
- [x] 자동 생성기를 만들기 전 실험용 최소 `.galpi/MAP.yaml` 작성. 내용은 `source.yaml`의 route와 도메인 요약만 복사한다.
- [x] 자동 생성기를 만들기 전 실험용 최소 `.galpi/view/` 수동 작성:
  ```text
  .galpi/view/
  ├── by-task/auth.login.md
  ├── by-domain/auth.md
  ├── by-status/WIP/student.md
  └── by-dependency/shared.database.md
  ```
- [x] View 파일은 다음 형식만 사용하며 코드를 복사하지 않는다.
  ```yaml
  task: auth.login
  state: DONE
  summary: 이메일과 비밀번호를 검증하고 세션을 생성한다.
  entrypoints:
    - src/auth/auth.command.login.ts#login
  files:
    - src/auth/auth.command.login.ts
    - src/auth/auth.service.token.ts
  dependencies:
    - shared.database
  tests:
    - src/auth/auth.test.login.ts
  rule: skip-unless-touching-or-impact
  ```
- [x] Phase 0의 `MAP.yaml`과 `view/`는 실험을 위한 수동 파생물임을 파일 헤더에 명시한다. Phase 3부터는 직접 수정하지 않는다.

> 메모 (2026-07-16): 기존 TypeScript 학습 관리 앱을 유지하면서 수정본의 데이터 소유권 원칙에 맞게
> 상태·의도·라우팅을 `.galpi/source.yaml` 하나로 이관했다. 이전 로드맵에서 사용한 도메인별 `_map.yaml`은
> 상태 중복 원본이 되므로 제거했다. `source.yaml`에는 6개 도메인, 8개 task, 14개 route를 선언했고,
> `MAP.yaml`은 route와 도메인 요약만 가진 수동 파생물로 축소했다. Phase 1의 네 시나리오를 지원하도록
> `by-task`, `by-domain`, `by-status`, `by-dependency`에 총 8개 수동 View를 만들었으며 모든 파일에
> Phase 0 수동 파생물 헤더를 넣었다. `yaml` 개발 의존성을 추가해 source/MAP/View를 실제 파싱하고,
> route 동기화·참조 경로·View 10~50줄·status 10~30줄을 검증했다. strict 타입 검사, 테스트 4건,
> ESM 빌드, 공개 index 우회 import 검사도 모두 통과했다.

---

## Phase 1 — 효과 측정 (베이스라인 확보)

**목적**: 무엇이 실제로 탐색 비용을 줄이는지 분리해서 측정한다.

### 체크리스트

- [ ] 측정용 작업 시나리오 4개 이상 정의:
  - 로그인 실패 버그 수정 (`DONE`이지만 직접 수정 대상)
  - 학생 목록에 정렬 추가 (`WIP`, `HOT`)
  - 청구서 기능 관련 질문 (`PLAN`, 코드 탐색을 하지 않아야 정답)
  - 폐기된 legacy 코드와 유사한 신규 기능 구현 (`DEAD` 재사용 방지)
- [ ] **A조건 — 기본 구조만**: `AGENTS.md`, `.galpi/`를 제거하거나 무시하고 실행.
- [ ] **B조건 — 라우팅만**: `AGENTS.md`, `MAP.yaml`은 사용하지만 `.galpi/view/`는 사용하지 않음.
- [ ] **C조건 — 라우팅 + Galpi View**: `AGENTS.md`, `MAP.yaml`, `.galpi/view/`를 모두 사용.
- [ ] 동일 모델·동일 작업 지시·가능하면 동일 초기 커밋에서 반복 실행.
- [ ] 각 실행에서 기록:
  - 읽은 파일 수
  - 관련 없는 파일을 연 횟수
  - 최초 관련 파일 도달까지의 툴 호출 수
  - 총 토큰 사용량
  - 전체 검색 실행 여부
  - 잘못된 파일 수정 여부
  - 작업 성공 및 테스트 통과 여부
- [ ] 각 조건을 가능하면 3회 이상 반복하고 평균·중앙값을 함께 기록.
- [ ] 결과를 `docs/experiments/phase1-baseline.md`에 표로 정리.
- [ ] **판정 기준**:
  - B가 A보다 좋으면 의도 라우팅의 효과가 있음.
  - C가 B보다 좋으면 파일 기반 Galpi View의 추가 효과가 있음.
  - 성공률이나 정확도가 하락하면 단순 토큰 절감만으로 성공 판정하지 않음.
- [ ] 감소가 없으면 route 단위, View 형식, `[DONE]` 규칙을 조정하고 재측정.

---

## Phase 2 — `galpi` CLI: 검증기 우선 (스테일 방지)

**목적**: 이 시스템의 최대 리스크인 "지도는 그대로인데 코드는 바뀐 상태"를 자동 감지한다.
생성기보다 **검증기**를 먼저 만든다.

### 체크리스트

- [ ] `tools/galpi/`에 CLI 프로젝트 생성 (Node/TS 추천 — 실험 앱과 스택 통일).
- [ ] `galpi check` 구현:
  - `.galpi/source.yaml` 스키마 검증
  - 각 도메인 경로의 git tree hash 계산
  - `source.yaml`의 `verified:` 값과 비교
  - 경로가 없거나 해시가 다르면 해당 도메인을 `[STALE]`로 보고
  - `PLAN code:none`인데 코드가 발견되거나 `DEAD` 코드가 외부에서 import되면 별도 오류 보고
- [ ] `galpi verify <domain>` 구현: 사람이 코드와 상태를 확인한 후 현재 해시를 `source.yaml`의 `verified:`에 기록.
- [ ] `galpi check --json` 구현: 훅과 CI가 읽을 수 있는 기계 형식 제공.
- [ ] pre-commit hook 연결: 변경된 도메인의 `verified`가 갱신되지 않았으면 경고 또는 실패.
- [ ] CI 워크플로 추가: `galpi check` 실패 시 빌드 실패 또는 초기에는 경고 처리.
- [ ] `AGENTS.md`에 규칙 추가:
  ```text
  [STALE] 도메인은 MAP/View를 사실로 단정하지 않는다.
  관련 코드를 직접 확인하고 작업 후 galpi verify 또는 galpi build를 실행한다.
  ```
- [ ] 검증기의 오탐·미탐 사례를 `docs/experiments/phase2-check.md`에 기록.

---

## Phase 3 — `galpi build`: 구조 인덱스와 Galpi View 자동 생성

**목적**: 파일·심볼·의존성·테스트 관계를 코드에서 자동 추출하고,
에이전트가 직접 탐색할 수 있는 파일 기반 Galpi View를 필수 산출물로 생성한다.

**원칙**:

1. 상태와 행동 규칙은 `.galpi/source.yaml`에서만 읽는다.
2. 구조 정보는 실제 코드에서 추출한다.
3. `MAP.yaml`, `manifest.json`, `.galpi/view/`는 항상 같은 빌드에서 생성한다.
4. 생성물은 직접 수정하지 않는다.
5. AST 파서를 직접 만들지 않고 기존 도구를 사용한다 (`ts-morph`, 필요 시 `tree-sitter`).

### 체크리스트

- [ ] 코드 주석 메타데이터 문법 정의 및 샘플 앱에 적용:
  ```ts
  /**
   * @galpi-task auth.login
   * @galpi-depends session.token
   * @galpi-summary 이메일 인증 후 세션을 생성한다.
   */
  export async function login() {}
  ```
- [ ] `@galpi-status`는 지원하지 않거나 발견 시 경고한다. 상태 중복 원본을 만들지 않는다.
- [ ] `galpi build` 구현 — 코드에서 추출할 정보:
  - 폴더·파일 목록 → 도메인 후보
  - export 심볼 → entrypoints
  - import 문 → 도메인·심볼 의존성
  - `*.test.*` → 테스트 연결
  - `@galpi-task` → 작업과 심볼 연결
  - `@galpi-depends` → 명시적 의미 의존성
  - `@galpi-summary` → 짧은 작업 요약
  - git 최근 변경 → `[HOT]` 후보 제안만 수행 (자동 상태 변경 금지)
- [ ] `.galpi/source.yaml`과 추출 결과를 병합하되, 충돌 시 자동 추측하지 않고 경고한다.
- [ ] 다음 세 가지를 한 번에 생성:
  ```text
  .galpi/MAP.yaml
  .galpi/manifest.json
  .galpi/view/
  ```
- [ ] `MAP.yaml`은 에이전트가 처음 읽을 수 있는 1차 라우팅 인덱스로 제한:
  - routes
  - domain/task 상태
  - path
  - 짧은 summary
  - deps
  - View 경로
- [ ] `manifest.json`은 전체 기계 인덱스를 보관:
  ```json
  {
    "task": "auth.login",
    "status": "DONE",
    "summary": "이메일 인증 후 세션을 생성한다.",
    "entrypoints": ["src/auth/auth.command.login.ts#login"],
    "files": ["src/auth/auth.command.login.ts"],
    "dependencies": ["session.token"],
    "tests": ["src/auth/auth.test.login.ts"],
    "hash": "8f21ad3"
  }
  ```
- [ ] `.galpi/view/` 필수 생성:
  ```text
  .galpi/view/
  ├── by-task/<task>.md
  ├── by-domain/<domain>.md
  ├── by-status/<state>/<task-or-domain>.md
  ├── by-symbol/<symbol>.md
  └── by-dependency/<dependency>.md
  ```
- [ ] View 파일은 필요한 정보만 담고 1개 파일을 가능한 10~50줄 안으로 유지.
- [ ] 동일 코드가 여러 뷰에 나타나더라도 실제 코드는 복사하지 않고 경로만 중복 기록.
- [ ] 생성 파일 상단에 다음 헤더 추가:
  ```text
  GENERATED BY galpi build — DO NOT EDIT
  Source of truth: .galpi/source.yaml + actual code
  ```
- [ ] 생성물의 커밋 여부를 설정 가능하게 하되, 어떤 방식이든 CI에서 `galpi build --check`로 최신 상태 검증.
- [ ] 순환 의존 감지 추가: `auth → payment → auth` 발견 시 경고.
- [ ] 고립된 task, 존재하지 않는 entrypoint, 테스트 없는 WIP/HOT 영역을 경고.
- [ ] Phase 1의 A/B/C 시나리오 재측정 → `docs/experiments/phase3.md` 기록.
- [ ] 수동 View와 자동 View의 탐색 효과 차이, 생성 시간, 인덱스 크기도 함께 기록.

---

## Phase 4 — Claude Code 통합 (스킬 + 훅)

**목적**: 프로토콜을 "문서 속 부탁"에서 실제 에이전트 작업 절차로 격상한다.
MCP 서버까지 가지 않고 스킬과 훅으로 가볍게 시작한다.

### 체크리스트

- [ ] `.claude/skills/galpi-navigator/SKILL.md` 작성:
  - 작업 시작 시 `MAP.yaml` 먼저 조회
  - route가 있으면 대응되는 `.galpi/view/by-task/` 또는 `by-domain/` 파일 확인
  - View가 가리키는 실제 코드만 우선 로드
  - 상태별 행동 규칙 (`skip-default`, `read-if`, `deny-if`)
  - route 존재 시 저장소 전체 검색 금지
  - `[STALE]`, 테스트 실패, 의존성 충돌 시 탐색 확장 조건
- [ ] Claude Code 훅 설정:
  - 세션 시작 훅: `galpi check --json` 실행, STALE·LOCK·HOT 목록을 짧게 주입
  - 작업 전 훅 또는 스킬: `galpi query <task>` 결과를 우선 컨텍스트로 사용
  - 작업 완료 훅: 수정된 도메인에 대해 `galpi build --check` 및 테스트 실행
  - 사람이 상태를 확인해야 하는 경우에만 `galpi verify` 요청
- [ ] `galpi query <keyword>` 구현:
  - 1차: routes 정확 일치
  - 2차: task/domain/symbol 별칭 일치
  - 3차: 제한적 텍스트 후보
  - 결과는 상태·summary·entrypoints·files·deps·tests·View 경로만 간결하게 출력
- [ ] `galpi query --json` 제공.
- [ ] 에이전트가 규칙을 무시하고 전체 검색했는지 로그로 측정 가능하게 함.
- [ ] 재측정: 스킬/훅 적용 전후 비교 → `docs/experiments/phase4.md`.

---

## Phase 5 — 고도화 (검증 통과 후 선택 진행)

각 항목은 독립적이다. 측정 결과와 실제 필요에 따라 순서를 선택한다.

- [ ] **시맨틱 검색 결합**: 직접 임베딩 구현 대신 기존 MCP(claude-context 등) 연결.
      역할 분리 유지 — *임베딩 = 관련 task 후보 찾기, Galpi = 정확한 파일과 상태로 이동*.
      `task.summary`, 별칭, 의도 설명만 우선 임베딩하고 전체 코드는 기존 코드 인덱서에 맡긴다.
- [ ] **기존 구조 인덱서 연동 실험**: Serena / CodeGraph 등과 병행 사용해,
      Galpi의 의도 정보와 구조 그래프의 사실 정보를 결합한다.
- [ ] **변경 영향 분석**: 수정한 심볼에서 역의존 task·도메인을 찾아 추가 테스트와 검토 대상을 제안.
- [ ] **점진적 View 로딩**: 대형 저장소에서 상위 View만 먼저 만들고 요청된 도메인 View를 지연 생성.
- [ ] **다국어·다중 저장소 지원**: tree-sitter 기반 언어 어댑터와 monorepo/workspace 라우팅 추가.
- [ ] **범용화**: 다른 실제 프로젝트에 도입하고 마이그레이션 가이드 작성.
- [ ] **스펙 공개 준비**: Galpi Protocol 스펙 + 레퍼런스 구현 + 측정 데이터로 GitHub 공개.
      포지셔닝은 기존 도구와 경쟁하는 전체 코드 인덱서가 아니라,
      **기존 구조 인덱스 위에 작업 의도와 탐색 가능한 파일 뷰를 추가하는 레이어**로 정의한다.
- [ ] 공개 직전 GitHub/npm에서 `galpi` 이름 최종 중복 확인.
      충돌 시 `galpi-protocol`, `galpi-map` 등으로 변경.

---

## 보류함 (버리지 않음 — Phase 5 이후 재검토)

당장은 진행하지 않지만 폐기하지 않고 보관하는 아이디어들이다.

| 아이디어 | 보류 이유 | 재검토 조건 |
|---------|----------|------------|
| AST 인덱서 직접 구축 | tree-sitter, ts-morph 및 기존 구조 인덱서가 성숙 | 기존 도구가 Galpi의 task/state/View 생성에 필요한 정보를 제공하지 못할 때 |
| 임베딩 파이프라인 자체 구현 | 시맨틱 검색 도구가 이미 존재하며 정확 route보다 우선순위가 낮음 | 기존 도구가 task summary 단위 인덱싱을 지원하지 않아 실제 측정에서 병목이 확인될 때 |
| 심볼릭 링크 기반 물리적 가상 FS | Windows/Git 호환성과 링크 권한 문제 | 경로 참조형 `.galpi/view/`가 성능·사용성 측정에서 부족할 때 |
| FUSE/커스텀 가상 파일 시스템 | 구현·배포 복잡도가 큼 | 일반 파일 기반 View로 표현할 수 없는 동적 질의가 핵심 요구로 확인될 때 |
| 이모티콘(●◐○△×)을 공식 문법으로 | 모델·터미널 환경에 따라 해석이 흔들림 | 멀티모달·렌더링 환경이 안정되면 사람용 UI 레이어로 승격 검토 |
| 파일 초세분화 (기능당 5줄 파일) | 파일 개수와 로딩 호출이 늘어 탐색 비용이 오히려 증가 | 심볼 단위 부분 로딩이 파일 단위 로딩을 안정적으로 대체할 때 |

### 네이밍 결정 기록 (2026-07-16)

- **확정**: Galpi (Galpi Protocol / `galpi` CLI / `.galpi/`)
  - 이중 은유: 책갈피(표식) + 갈피를 잡다(방향 감각). 5글자 2음절, CLI·발음 용이.
  - 기존 충돌 검사는 공개 직전에 다시 수행한다. 이름·패키지 사용 가능성은 시간이 지나면 바뀔 수 있다.
- **탈락 이력 및 사유**:
  - AgentFS — 동명 제품·패키지와 충돌 가능성
  - A-MAP — 지도 서비스 AMap과 검색 충돌
  - Cairn — 기존 프로젝트 존재
  - jaison — 기존 패키지 및 JSON/jayson과 발음 충돌
  - SAGE, AIR, CXM, Signpost, Waypost — 기존 용례가 많거나 검색성이 낮음
- **예비 후보**: Doltap(돌탑), Bongsu(봉수), Sotdae(솟대), galpi-protocol, galpi-map

---

## Claude Code 실행 지침

1. 이 문서의 **현재 진행 중인 Phase** 체크리스트를 위에서부터 순서대로 수행한다.
2. 완료한 항목은 `- [x]`로 체크하고, 결정 사항·변경 사항은 해당 Phase 하단에 `> 메모:`로 기록한다.
3. Phase를 건너뛰지 않는다. 단, Phase 내부 항목 순서는 합리적 이유가 있으면 조정 가능하다.
4. 로드맵 자체를 수정할 필요가 생기면 먼저 사용자에게 변경 이유와 수정안을 제안하고 승인 후 수정한다.
5. Phase 1·3·4의 측정은 생략하지 않는다. 이 프로젝트의 목적은 기능 구현 자체가 아니라 **검증된 프로토콜과 탐색 구조**를 만드는 것이다.
6. 상태의 단일 원본은 `.galpi/source.yaml`이다. 생성된 `MAP.yaml`, `manifest.json`, `.galpi/view/`를 직접 편집하지 않는다.
7. 생성 결과와 실제 코드가 충돌하면 추측으로 덮어쓰지 말고 `[STALE]` 또는 명시적 오류로 보고한다.
8. 토큰 감소만으로 성공을 선언하지 않는다. 작업 정확도, 테스트 통과, 잘못된 수정 방지까지 함께 평가한다.
