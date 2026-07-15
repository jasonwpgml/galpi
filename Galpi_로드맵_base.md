# Galpi 프로젝트 로드맵

> **Galpi (갈피)**: ① 책갈피 — 코드베이스 곳곳에 꽂아둔 표식. ② 갈피를 잡다 — 길 잃은 에이전트가 방향을 찾게 한다.
> 한 단어가 이 기술의 두 축(표식 + 방향 감각)을 모두 담는다.
> 영문 소개 한 줄: *Galpi (갈피): a Korean word meaning both "bookmark" and "one's bearings".*
> 백로님(선택): **G**uided **A**gent **L**ayer for **P**roject **I**ntent
>
> **목표**: 기존 기술(AGENTS.md, tree-sitter, repo map, 시맨틱 검색 MCP 등)을 참고·활용하면서,
> 에이전트용 **상태/의도 기반 라우팅 프로토콜(Galpi Protocol)** 이라는 나만의 기술을 단계적으로 완성한다.
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
| 실험 프로젝트 폴더 | `galpi-lab/` |
| 코드 주석 태그 | `@galpi-task`, `@galpi-status`, `@galpi-depends` |
| Claude Code 스킬 | `galpi-navigator` |

---

## 핵심 개념 (이 프로젝트가 만드는 것)

기존 코드 인텔리전스 도구들(Aider repo map, Serena, CodeGraph, claude-context 등)은
**구조(structure)** — 코드가 어디 있고 무엇을 export하고 누가 참조하는가 — 를 인덱싱한다.

Galpi는 그 위에 얹히는 **의도(intent) 레이어**다:

- 이 코드가 완성인지(`DONE`), 작업 중인지(`WIP`), 계획뿐인지(`PLAN`), 폐기됐는지(`DEAD`)
- 어떤 조건에서 읽어야 하고(`read-if`), 어떤 조건에서 건너뛰어야 하는지(`skip-if`)
- 코드가 바뀌었는데 지도가 안 바뀌면 자동으로 `STALE` 처리

이 정보는 자동 추출이 불가능한 "사람 머릿속 정보"라서 기존 도구들이 다루지 않는 빈 틈이다.

### 상태 태그 공식 문법 (v1)

ASCII 태그가 공식, 기호는 사람용 별칭이다.

| 태그 | 별칭 | 의미 | 에이전트 규칙 |
|------|-----|------|--------------|
| `[DONE]` | ● | 안정적으로 구현됨 | 수정 대상이 아니면 내부 탐색 금지 |
| `[WIP]` | ◐ | 작업 중 | 수정 전 status와 최근 변경 반드시 확인 |
| `[PLAN]` | ○ | 계획만 존재 | 코드 검색 금지, 계획 문서만 확인 |
| `[EXP]` | △ | 실험적 | 프로덕션 코드로 간주하지 않음, 검증 필요 |
| `[DEAD]` | × | 폐기됨 | 참조·재사용·수정 금지, 해결책 후보에서 제외 |
| `[HOT]` | ! | 변경 잦음 (보조 태그) | 항상 최신 상태 확인 |
| `[LOCK]` | = | 수정 금지 (보조 태그) | 명시적 지시 없이 수정 금지 |
| `[STALE]` | ? | 지도와 코드 불일치 | 지도를 신뢰하지 말고 코드 직접 확인 후 지도 갱신 |

### 탐색 우선순위 (모든 Phase에서 유지)

```text
1. MAP 해시맵(routes)에서 정확한 경로 조회
2. 파일·심볼 이름 검색 (파일명 컨벤션 활용)
3. 의존성 그래프 (deps 필드)
4. 텍스트 검색 (grep)
5. 임베딩/시맨틱 검색 (최후 수단, Phase 5 이후)
```

정확한 route가 존재하면 저장소 전체 검색을 하지 않는다.

---

## Phase 0 — 실험 프로젝트 부트스트랩 (지금 바로)

**목적**: Galpi를 적용하고 측정할 실험장 만들기. 도구 구현 없음, 컨벤션만.

**산출물**: 동작하는 소규모 앱 + Galpi 수동 적용 완료 상태.

### 체크리스트

- [x] 새 프로젝트 폴더 생성: `galpi-lab/`. TypeScript + Node 기반 추천 (파싱 도구 생태계가 가장 풍부).
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
  │   ├── auth.test.login.ts
  │   └── _map.yaml
  ├── student/ ...
  ├── lesson/ ...
  ├── legacy/ ...           ← [DEAD] 실험용
  └── shared/
  ```
- [x] 파일명 복합키 컨벤션 적용: `도메인.작업유형.세부기능.ts`
      (작업유형: `command` / `query` / `service` / `repository` / `schema` / `types` / `test`)
- [x] 도메인 간 import는 반드시 `@/도메인` (index.ts) 경유. 순환 의존 금지 (공유는 `shared/`로).
- [x] "독립적으로 변경되는 단위만 분리" 원칙 준수 — 한 곳에서만 쓰는 타입은 같은 파일에 둔다. 과도 분할 금지.
- [x] 루트에 `AGENTS.md` 작성 (30~80줄): 상태 태그 정의 + 탐색 우선순위 + 아래 행동 규칙만.
  ```text
  # Galpi Protocol v1
  [DONE] 구현 완료. 관련 수정이 아니면 내부 탐색 금지.
  [WIP]  수정 전 status와 최근 변경사항 확인.
  [PLAN] 코드 탐색 금지. 계획 문서만 확인.
  [DEAD] 참조 및 재사용 금지.
  [EXP]  프로덕션 코드로 간주하지 않음.

  탐색 순서:
  1. .galpi/MAP.yaml에서 작업 키워드 조회
  2. 정확한 경로가 있으면 해당 경로만 탐색
  3. 없을 때만 텍스트 검색 사용
  Task와 관련 없는 도메인의 문서·코드는 읽지 않는다.
  ```
- [x] `CLAUDE.md`에서 `AGENTS.md`를 참조하도록 연결.
- [x] 루트 `.galpi/MAP.yaml` 수동 작성:
  ```yaml
  # GALPI/1
  routes:            # 작업 키워드 → 도메인 (해시맵)
    login: auth
    session: auth
    "학생 등록": student
    "수강 신청": lesson
    invoice: billing
  domains:
    auth:
      state: DONE
      path: src/auth/
      deps: [shared/database]
      skip: unless-touching
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
  ```
- [x] 각 도메인 폴더에 `_map.yaml` 작성 (entrypoints / features별 state / deps / public·private).
- [x] `.galpi/status/` 폴더에 WIP 도메인의 현재 작업 상황 짧게 기록.

> 메모 (2026-07-16): Node.js + TypeScript 기반 학습 관리 실험 앱을 구성했다. `auth`·`lesson`·`shared`는
> `[DONE]`, `student`는 목록 정렬을 다음 측정 작업으로 남긴 `[WIP] [HOT]`, `billing`은 계획 문서만 있는
> `[PLAN]`, `legacy`는 실행 경로에서 격리한 `[DEAD]` fixture로 두었다. 도메인 간 의존성은
> `auth → shared`, `student → shared`, `lesson → student/shared`이며 모두 각 도메인의 `index.ts`를 거친다.
> `main.ts`는 도메인이 아닌 composition root이므로 파일명 복합키 규칙의 유일한 예외로 기록했다.
> `npm run check`에서 strict 타입 검사, Node 테스트 4건, ESM 번들 빌드가 통과했고 빌드 결과 실행도 확인했다.

---

## Phase 1 — 효과 측정 (베이스라인 확보)

**목적**: Galpi가 실제로 탐색 비용을 줄이는지 수치로 확인. 이 수치가 이후 모든 판단 근거.

### 체크리스트

- [ ] 측정용 작업 시나리오 3개 이상 정의 (예: "로그인 실패 버그 수정", "학생 목록에 정렬 추가",
      "청구서 기능 관련 질문" ← PLAN 도메인이라 코드 탐색을 안 해야 정답).
- [ ] **A조건**: `AGENTS.md`/`MAP.yaml`을 제거(또는 무시 지시)한 상태에서 각 시나리오 실행.
- [ ] **B조건**: Galpi 적용 상태에서 동일 시나리오 실행.
- [ ] 각 실행에서 기록: 읽은 파일 수 / 관련 없는 파일을 연 횟수 / 총 토큰 사용량 / 툴 호출 횟수 /
      잘못된 파일 수정 여부. (Claude Code 세션 로그 및 `/cost` 활용)
- [ ] 결과를 `docs/experiments/phase1-baseline.md`에 표로 정리.
- [ ] **판정 기준**: B조건에서 탐색 비용이 유의미하게 감소하면 Phase 2 진행.
      감소가 없으면 MAP 형식·규칙 문구를 조정하고 재측정 (규칙이 안 지켜지면 AGENTS.md 문구를 더 강제적으로).

---

## Phase 2 — `galpi` CLI: 검증기 우선 (스테일 방지)

**목적**: 이 시스템 최대 리스크인 "지도는 그대로인데 코드는 바뀐 상태"를 자동 감지.
생성기보다 **검증기**가 먼저다.

### 체크리스트

- [ ] `tools/galpi/` 에 CLI 프로젝트 생성 (Node/TS 추천 — 실험 앱과 스택 통일).
- [ ] `galpi check` 구현:
  - 각 도메인 경로의 git tree hash(`git rev-parse HEAD:src/auth` 방식)를 계산
  - `MAP.yaml`의 `verified:` 필드와 비교
  - 불일치하면 해당 도메인을 `[STALE]`로 보고 (exit code 1)
- [ ] `galpi verify <domain>` 구현: 사람이 확인 후 현재 해시를 `verified:`에 기록.
- [ ] pre-commit hook 연결: 도메인 코드 변경 커밋 시 MAP 미갱신이면 경고.
- [ ] CI 워크플로 추가 (GitHub Actions): `galpi check` 실패 시 빌드 경고.
- [ ] `AGENTS.md`에 규칙 추가: "`[STALE]` 도메인은 지도를 신뢰하지 말고, 작업 후 `galpi verify` 실행."

---

## Phase 3 — `galpi build`: 구조 자동 생성 (상태는 사람이 선언)

**목적**: 지도의 "구조" 부분(파일, 심볼, 의존성)은 자동 생성, "의도" 부분(state)은 사람 선언 유지.

**원칙**: AST 파싱을 직접 구현하지 않는다. 기존 도구를 사용한다
(TS라면 `ts-morph`, 다국어 확장 시 `tree-sitter` 바인딩).

### 체크리스트

- [ ] 코드 주석 메타데이터 문법 정의 및 샘플 앱에 적용:
  ```ts
  /**
   * @galpi-task auth.login
   * @galpi-status done
   * @galpi-depends session.token
   */
  export async function login() {}
  ```
- [ ] `galpi build` 구현 — 스캔 대상:
  - 폴더 목록 → 도메인
  - export 심볼 → entrypoints (ts-morph로 추출)
  - import 문 → deps (도메인 단위로 집계)
  - `*.test.*` → 테스트 연결
  - `@galpi-*` 주석 → task/state 매핑
  - git 최근 변경 → `[HOT]` 자동 부여 후보 제안
- [ ] 출력 이원화: 사람/LLM용 `MAP.yaml` + `_map.yaml`, 기계용 `.galpi/manifest.json`
  ```json
  {
    "task": "auth.login",
    "status": "DONE",
    "entrypoints": ["src/auth/auth.command.login.ts#login"],
    "files": ["..."],
    "dependencies": ["session.token"],
    "tests": ["src/auth/auth.test.login.ts"],
    "hash": "8f21ad3"
  }
  ```
- [ ] **불변 원칙 코드화**: build는 `state:` 값을 절대 덮어쓰지 않는다.
      상태 변경은 사람(또는 명시적 커맨드 `galpi set-state`)만 가능.
- [ ] 순환 의존 감지 추가: `auth → payment → auth` 발견 시 경고.
- [ ] Phase 1 시나리오 재측정 → `docs/experiments/phase3.md` 기록.

---

## Phase 4 — Claude Code 통합 (스킬 + 훅)

**목적**: 프로토콜을 "문서 속 부탁"에서 "에이전트 행동 규칙"으로 격상.
MCP 서버까지 갈 필요 없이 스킬과 훅으로 가볍게 시작.

### 체크리스트

- [ ] `.claude/skills/galpi-navigator/SKILL.md` 작성:
  - 작업 시작 시 `manifest.json`(또는 MAP.yaml) 조회 절차
  - 상태별 행동 규칙 (skip-if / read-if / deny-if)
  - route 존재 시 전체 검색 금지 규칙
- [ ] Claude Code 훅 설정:
  - 세션 시작 훅: `galpi check` 실행해 STALE 목록을 컨텍스트에 주입
  - 작업 완료(파일 수정) 훅: 수정된 도메인에 대해 `galpi verify` 유도 또는 자동 실행
- [ ] `galpi query <keyword>` 서브커맨드 추가: 에이전트가 bash로 호출해
      routes 해시맵 → 도메인 → 파일 목록을 한 번에 받는 조회 인터페이스.
- [ ] 재측정: 스킬/훅 적용 전후 비교 → `docs/experiments/phase4.md`.

---

## Phase 5 — 고도화 (검증 통과 후 선택 진행)

각 항목은 독립적. 측정 결과와 필요에 따라 순서 선택.

- [ ] **시맨틱 검색 결합**: 직접 임베딩 구현 대신 기존 MCP(claude-context 등) 연결.
      역할 분리 유지 — *임베딩 = 관련 작업 후보 찾기, Galpi = 정확한 파일로 이동*.
      각 task의 `summary:` 필드를 임베딩 대상으로 제공.
- [ ] **가상 뷰(Galpi View)**: `manifest.json`에서 `.galpi/view/` 읽기 전용 뷰 생성
      (`by-task/`, `by-domain/`, `by-status/`, `by-symbol/`, `by-dependency/`).
      규칙: 코드 복사 절대 금지, 경로·심볼·상태·관계·요약만. `.gitignore` 처리, 항상 build로 재생성.
- [ ] **기존 구조 인덱서 연동 실험**: Serena / CodeGraph 등과 병행 사용해보고,
      Galpi(의도)와 구조 그래프(사실)의 결합 지점 설계.
- [ ] **범용화**: 다른 실제 프로젝트(기존 코드베이스)에 도입해보고 마이그레이션 가이드 작성.
- [ ] **스펙 공개 준비**: "Galpi Protocol" 스펙 문서 + 레퍼런스 구현 + 측정 데이터로
      GitHub 공개. 포지셔닝: 기존 도구들과 경쟁이 아니라 그 위에 얹히는 의도 레이어.
      공개 직전 GitHub/npm에서 `galpi` 이름 최종 중복 확인 (충돌 시 `galpi-protocol`, `galpi-map` 등 변형).

---

## 보류함 (버리지 않음 — Phase 5 이후 재검토)

당장은 진행하지 않지만 폐기하지 않고 보관하는 아이디어들. 재검토 시점과 조건을 명시한다.

| 아이디어 | 보류 이유 | 재검토 조건 |
|---------|----------|------------|
| AST 인덱서 직접 구축 | tree-sitter 기반 기존 도구가 성숙 (Aider repo map, Serena, Codebase-Memory 등) | 기존 도구가 Galpi의 상태 레이어와 결합 불가능한 구조적 한계를 보일 때 |
| 임베딩 파이프라인 자체 구현 | 시맨틱 검색 MCP가 이미 존재, 우선순위상 최후 수단 | Phase 5에서 기존 MCP 연동으로 부족함이 확인될 때 (예: task summary 단위 인덱싱이 필요한데 지원 안 됨) |
| 심볼릭 링크 기반 물리적 가상 FS | Windows/Git 호환성 문제 | 크로스플랫폼 요구가 사라지거나, 링크 없이 뷰 생성(Phase 5 Galpi View)이 부족할 때 |
| 이모티콘(●◐○△×)을 공식 문법으로 | 모델/터미널 환경에 따라 해석 흔들림 | 멀티모달·렌더링 환경이 안정되면 사람용 UI 레이어로 승격 검토 |
| 파일 초세분화 (기능당 5줄 파일) | 탐색 비용 오히려 증가 | 심볼 단위 로딩이 파일 단위 로딩을 완전히 대체하는 시점 |

### 네이밍 결정 기록 (2026-07-16)

- **확정**: Galpi (Galpi Protocol / `galpi` CLI / `.galpi/`)
  - 이중 은유: 책갈피(표식) + 갈피를 잡다(방향 감각). 5글자 2음절, CLI·발음 용이.
  - 충돌 검사: npm 무주공산. GitHub에 동명의 개인 독서 기록 앱(heejongahn/galpi) 1건 존재하나 분야 상이·활동 중단 상태로 무시 가능.
- **탈락 이력 및 사유**:
  - AgentFS — Turso가 동명 제품 운영(npm `agentfs-sdk` 선점)
  - A-MAP — 알리바바 지도 서비스 AMap과 검색 충돌
  - Cairn — 사용자 확인 결과 기존 프로젝트 존재
  - jaison — npm `jaison` 선점(AI용 JSON 복구 파서, 활발히 유지보수 중), Project J.A.I.son 존재, JSON/jayson과 발음 동일
  - SAGE(SageMath/SageMaker 충돌), AIR·CXM(일반 명사, 검색성 없음), Signpost(Apple os_signpost와 검색 겹침), Waypost(동명 feature flag 도구 존재)
- **예비 후보** (galpi 충돌 발견 시): Doltap(돌탑), Bongsu(봉수), Sotdae(솟대), galpi-protocol, galpi-map

---

## Claude Code 실행 지침

1. 이 문서의 **현재 진행 중인 Phase**의 체크리스트를 위에서부터 순서대로 수행한다.
2. 완료한 항목은 `- [x]`로 체크하고, 결정 사항·변경 사항은 해당 Phase 하단에 `> 메모:`로 기록한다.
3. Phase를 건너뛰지 않는다. 단, Phase 내부 항목 순서는 합리적 이유가 있으면 조정 가능하다.
4. 이 로드맵 자체를 수정할 필요가 생기면 먼저 사용자에게 제안하고 승인 후 수정한다.
5. 측정(Phase 1, 3, 4의 재측정)은 생략하지 않는다 — 이 프로젝트의 목적은 기능 구현이 아니라 **검증된 프로토콜**을 만드는 것이다.
