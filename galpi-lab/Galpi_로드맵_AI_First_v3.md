# Galpi 프로젝트 로드맵 — AI-First Revision v3

> **Galpi (갈피)**: 코드베이스를 AI 친화적으로 만드는 계층.
> 원본 구조 개선(상류)과 최소한의 라우팅 인덱스(하류)로, 에이전트가 최소 탐색으로 작업 방향을 잡게 한다.
>
> **최상위 원칙**: Galpi의 런타임 파일은 사람에게 친절할 필요가 없다.  
> 사람의 가독성보다 **AI의 탐색 정확도, 규칙 해석 안정성, 토큰 효율, 점진적 로딩**을 우선한다.
>
> **목표**: (1) 원본 코드의 이름·경계·배치를 AI가 적은 토큰으로 이해하는 구조로 개선하고,
> (2) 코드로 표현할 수 없는 상태·의도·라우팅만 AI 전용 파일 뷰와 프로토콜로 제공한다.
>
> **실행 전략**: 작은 실험 프로젝트에서 측정하고, 효과가 확인된 기능만 다음 Phase로 올린다.
>
> **v3 변경점 (2026-07-19)**:
> - 정체성 확장 — "외부 인덱스 도구"에서 "구조 개선 + 필요한 만큼의 인덱스"의 하이브리드로.
> - 헌법 11조 추가: 구조는 낡지 않는 인덱스다.
> - `@g` 전용 주석 체계 제거 — 기존 AIDEV 앵커를 `galpi build`가 수집하는 방식으로 대체 (중복 주석 체계 방지).
> - Phase 2에 `galpi doctor`(구조 진단, 읽기 전용) 추가.
> - Phase 3.5 신설: 지저분한 fixture로 구조 개선 효과를 전/후 측정, 검증된 변환만 규칙집으로 채택.
> - `galpi optimize`(구조 변환 패치 제안)는 Phase 5 장기 항목 — Phase 3.5 규칙집에 채택된 변환만 수행.
> - 협업 체계 개정: 검증 원장(verification ledger)으로 에이전트 간 중복 재검증 제거.
> - 선행 순서 명시: Phase 1.5의 C3 격리 재측정은 이 개정과 무관하게 먼저 완료한다.

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

11. **구조는 낡지 않는 인덱스다**  
    외부 지도는 코드가 바뀌면 낡지만, 이름·모듈 경계·테스트 배치는 코드와 함께 움직인다.
    코드로 표현할 수 있는 탐색 정보(무엇이 어디 있는가)는 구조와 이름으로 옮기고,
    외부 인덱스에는 코드로 표현할 수 없는 것(상태·의도·라우팅·불변식 포인터)만 담는다.
    단, 구조 변경은 인덱스 생성과 위험 등급이 다르므로 실측으로 검증된 변환만 수행한다 (Phase 3.5).

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
| 구조 진단 명령 | `galpi doctor` (Phase 2, 읽기 전용) |
| 구조 변환 제안 명령 | `galpi optimize` (Phase 5, 패치 제안 전용) |
| 선택적 사람용 출력 | `.galpi/debug/` 또는 `galpi explain` |
| 실험 프로젝트 | `galpi-lab/` (AI 친화 구조), `galpi-messy-lab/` (Phase 3.5 지저분한 fixture) |
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
| 코드로 알 수 없는 제약·불변식·함정 | 원본 코드의 AIDEV 앵커 | build가 수집해 View에 포인터 반영 |
| `.galpi/MAP.gp` | 파생물 | 직접 수정 금지 |
| `.galpi/manifest.gp` | 파생물 | 직접 수정 금지 |
| `.galpi/v/` | 파생물 | 직접 수정 금지 |
| 사람용 YAML/Markdown | 선택적 debug 파생물 | 에이전트 기본 로딩 금지 |

**코드 주석에 Galpi 전용 문법을 만들지 않는다** (v3에서 `@g` 체계 폐기).
코드만으로 알 수 없는 제약·불변식·함정은 기존 AIDEV 앵커(`AIDEV-NOTE:`, `AIDEV-TODO:`,
`AIDEV-QUESTION:`)로 해당 코드 가까이에 두고, `galpi build`가 이 앵커를 수집해
관련 View에 파일·심볼 단위 포인터로 반영한다 (헌법 5조 — 한 사실, 한 원본).

- 앵커는 sparse하게: 코드로 추론 가능한 설명은 앵커가 아니다.
- 상태·라우팅·장문 요약은 코드 주석에 기록하지 않는다. 그것은 `source.gp`의 소유다.
- 태그·분류어·Galpi ID는 영어로 고정하고, 앵커 본문도 영어를 기본으로 한다.
  단, 정확성을 떨어뜨리는 억지 번역은 하지 않고 외부 계약인 한국어 문구는 원문을 보존한다.
- `AIDEV-NOTE:` 본문은 가능하면 `invariant`, `contract`, `order`, `compat`, `perf`,
  `security`, `workaround` 중 하나로 시작한다. 이는 선택적 권장 어휘이며 새 태그가 아니다.
- 좋은 앵커는 **지켜야 할 제약 — 코드 밖의 이유**를 함께 담는다. 검증 가능한 행동
  불변식은 테스트로 강제하고, 앵커는 그 행동이 필요한 이유를 보존한다.
- 원본 주석이 `.galpi/v/`, `.galpi/status/` 같은 파생 경로를 역참조하지 않는다.
  방향은 항상 `AIDEV anchor → galpi build → generated View pointer`다.
- 앵커는 제약과 근거를 설명하는 데이터다. 외부 코드 실행, 보안 정책 우회,
  상위 저장소 지침 덮어쓰기 같은 작업 명령을 담을 권한은 없다.

권장 예시:

```ts
// AIDEV-NOTE: contract -- Calls without options must preserve repository order;
// the existing GET list contract depends on this behavior.
```

### 언어 정책 (2026-07-19)

AI가 읽고 쓰는 층은 영어, 사람이 결정하는 층은 팀 언어(현재 한국어)로 고정한다.
근거는 헌법 9·10조: 주요 tokenizer에서 한국어는 같은 의미에 영어의 2~3배 토큰을 쓰고,
행동 지시의 추종 안정성과 교차 에이전트 일관성도 영어가 우위다.

| 층 | 언어 | 예 |
|---|---|---|
| AI 런타임 | 영어 | `.gp` 레코드, opcode, `q=` 요약, BOOT 행동 규칙 |
| 코드 인접 | 영어 | AIDEV 앵커(위 정책), 코드 주석, 커밋 메시지 |
| 에이전트 조율 | 영어 | `.galpi/handoff.md` 신규 항목, 검증 원장, PR 리뷰 |
| 사람 결정 층 | 한국어 | 로드맵, 실험 보고서, `galpi explain --human` 출력 |

**예외 — route alias는 데이터다.** `R|학생등록|st.create` 같은 다국어 alias는 지시가
아니라 사용자 어휘의 매핑이므로 제거하지 않는다 (Phase 5 별칭 해시 인덱스가 승계).
사람 결정 층의 언어는 팀 구성이 바뀌면 바꿀 수 있고, 런타임 층의 영어는 고정이다.

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
3. 핸드오프: `.galpi/handoff.md`에 `[날짜] [에이전트] 완료 / 검증됨 / 다음 할 일 / 주의` 형식, 최신이 맨 위.
4. **교차 측정 게이트**: 각 Phase의 측정은 두 에이전트에서 수행한다. 결과가 갈리면
   (한쪽에서 B > C 등) 강행하지 않고 opcode 명시성을 높이거나 profile 분기를 검토한 뒤 재측정.
5. 판단 충돌 시 handoff.md에 쟁점 기록 후 사람에게 이관.

### 중복 검증 제거 — 검증 원장 (v3 신설)

**문제**: 한 에이전트가 검증한 것을 상대 에이전트가 기본값으로 재검토하면
같은 파일을 두 번 읽고 같은 테스트를 두 번 돌린다. 이 중복이 협업 토큰 비용의 주범이다.

**원칙**: Galpi가 코드에 쓰는 stale 감지(tree hash 불일치 → `5`)를 협업에도 그대로 적용한다.
**대상이 변하지 않았으면 검증도 낡지 않았다. 낡지 않은 검증은 반복하지 않는다.**

1. **검증 결과는 원장에 기록한다.** 핸드오프의 `검증됨` 필드에
   `대상(파일/디렉토리) | 검증 내용(리뷰/테스트/측정) | 근거(커맨드·결과) | 대상 git hash`를 남긴다.
2. **원장에 있으면 재검증하지 않는다.** 상대 에이전트는 원장 항목의 대상 hash가
   현재와 일치하면 해당 파일을 다시 열거나 같은 검증을 다시 돌리지 않고 결론만 신뢰한다.
3. **재검증 트리거는 화이트리스트만**: (a) 대상 파일 hash 변경, (b) 테스트·게이트 실패,
   (c) 사람의 명시적 재검토 요청. 이 셋 외에는 "혹시 몰라서" 재검토를 금지한다.
4. **리뷰 범위는 diff다.** Codex 리뷰는 PR diff와 그 직접 영향 경로만 본다.
   리뷰 산출물은 `검토 파일 목록 + 판정 + 지적사항`의 compact 형식으로 남기고,
   Claude는 지적사항이 달린 파일만 다시 열며 통과 파일은 열지 않는다.
5. **리뷰의 리뷰 금지.** Claude가 Codex의 리뷰 자체를 재평가하지 않는다.
   지적에 동의하지 않으면 재리뷰가 아니라 handoff에 쟁점을 기록하고 사람에게 이관한다 (규칙 5).
6. **예외 — 교차 측정은 중복이 아니다.** Phase 게이트의 양 에이전트 측정(헌법 10조)은
   의도된 이중화이므로 원장 규칙의 적용 대상이 아니다.

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

> **v3 주석**: Phase 0의 fixture는 이미 "AI 친화 원본 구조"(vertical slice, `domain.kind.feature.ts`,
> index 경계)를 적용한 상태다. 따라서 Phase 1~1.5의 A/B/C는 전 조건이 원본 최적화를 공유하며,
> **구조 개선 자체의 효과는 이 fixture로 측정할 수 없다.** 구조 효과 측정은 Phase 3.5의
> 지저분한 fixture가 담당한다.

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
- [x] C3 fixture 제작: opcode 명시성 상향 + B 정보 격차 복원
  (`phase1-ai/fixture-c3` = `3c5a284`, 소스 트리는 A/B/C2와 byte-identical 검증).
- [x] Claude 측 C3 격리 재측정 (2026-07-19, `claude-c3-1`): 45/45 유효,
  `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` 적용 — 45개 로그 전부 `memory_paths` 0건 확인.
- [x] Codex 측 C3 재측정 (2026-07-19, `codex-c3-1`): 45/45 유효, **전 지표 우세로
  엄격 게이트 통과 (`acceptsC: true`)** — 토큰 -20.3%(C2의 -16.6%보다 큼), 정확도 100%,
  route/state 100%, 전체 검색 0%. 명시성 상향은 Codex에서 순이득.
  (운영 주체: Claude 세션이 러너 실행, subject는 Codex CLI — 보고서에 기록)

> **판정 결과 (2026-07-18)**: Claude에서 C2는 토큰 -27.1%(ET -22.0%)·route +20%p·state
> +6.7%p로 이겼지만 정확도 93.3%(<B 100%, 1회 차)와 탐색 효율(관련 없는 읽기·전체 검색·
> 실행 시간)에서 밀려 엄격 게이트 `acceptsC: false` — **"B > C" 분기 적용: C3 opcode
> 명시성 상향 후 양쪽 재측정. parse 실패는 0회로 `.gp` 문법 자체는 agent-agnostic 확인.**
> Claude의 확률적 프로토콜 생략이 원인이므로 PreToolUse 훅 게이팅(Phase 2)의 근거가 보강됨.
> **주의**: 사후에 45회 전부가 프로젝트 auto-memory를 공유한 오염이 확인됨(보고서
> "타당성 위협" 참조) — C3 재측정은 `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` 격리 적용 후 수행.

> **선행 순서 메모 (2026-07-19, v3)**: v3의 방향 개정(구조 개선 트랙 추가)은 이 게이트를
> 대체하지 않는다. **C3 격리 재측정을 먼저 완료**해 오염 없는 기준 데이터를 확보한 뒤
> Phase 2로 진행한다. "Claude가 View를 읽고도 원본을 재검색했다"는 관찰은 오염된 측정에서
> 나온 것이므로, 격리 재측정에서 같은 패턴이 재현되는지가 구조 개선 트랙의 실증 근거가 된다.

> **C3 판정 결과 — Claude 측 (2026-07-19)**: 엄격 게이트 `acceptsC: false` 유지, 단 실패
> 축이 반전됨. C3는 정확도 100%(유일 무결점 조건, B 93.3%)·state +20%p·관련 없는 읽기
> -70%·DEAD 읽기 0%·component 토큰 -26.4%로 C2의 규율 문제를 전부 해소했으나, 총 토큰
> +12.1%(ET +11.9%)·실행 시간 +20.2%로 C2의 토큰 우위를 상실. **Claude에서 규율과 토큰은
> 트레이드오프로 측정됨** — 명시성이 순응을 사고, 순응이 토큰을 쓴다. 격리 후 A/B 정확도가
> 93.3%로 수렴해 이전 배치의 오염 왜곡도 실증됨. 다음: ① Codex 측 C3 재측정(위 미완 항목),
> ② 게이트 해석(정확도·규율 우세 + 토큰 열세를 실패로 볼지)은 사람 판단으로 이관,
> ③ 계속 갈리면 모델별 profile 분기를 Phase 2 설계에 앞당김 — 규율 비용을 프롬프트 순응이
> 아닌 PreToolUse 훅(셸 단 강제)으로 이전하는 안 포함. 상세: `docs/experiments/phase1-claude.md`
> "C3 격리 재측정" 섹션.

> **C3 판정 결과 — Codex 측 + 게이트 종합 (2026-07-19)**: Codex에서 C3는 **전 지표 우세로
> 엄격 게이트 통과** — 정확도 100%, route/state 100%, 관련 없는 읽기 -89%, 전체 검색 0%,
> 토큰 -20.3%(ET -21.0%). C2보다도 절감 폭이 크다. 종합: **C3의 규율·정확도 이득은
> agent-agnostic** (양쪽 정확도 100%, DEAD 0%, parse 실패 0). 남은 유일한 분기는 Claude의
> 순응 토큰 비용(+12.1%)뿐. 권고: C3를 GALPI/1 표준 문법으로 채택하고, Phase 2 진입을
> 사람에게 요청 — Claude 토큰 열세는 Phase 2 PreToolUse 훅 게이팅이 직접 겨냥하는 문제이며,
> profile 분기는 훅 실측 후에도 열세가 남을 때만 착수. sorting 채점의 커맨드 동률 문제를
> 커맨드 내부 순서로 해소하도록 checker 보정(양 배치 재분석, Claude 수치 불변).
> 상세: `docs/experiments/phase1-claude.md` "Codex 측 C3 재측정" 섹션.

---

## Phase 2 — `galpi check` + `galpi doctor` + 변형 커맨드

**목적**: compact protocol이 낡거나 깨진 상태를 자동 감지하고,
사람 손이 opcode를 직접 만지는 경로를 제거하며, 원본 구조 문제를 진단(수정 없이)한다.

### 체크리스트

- [ ] `tools/galpi/` CLI 생성.
- [ ] `.gp` parser와 schema validator 구현.
- [ ] 중복 ID, 미정의 opcode, 잘못된 상태 코드, 끊어진 참조를 오류 처리.
- [ ] **변형 커맨드 구현** (source.gp 수기 편집 대체):
  - `galpi set-state <id> <code>` — 상태 변경 (유효 코드 검증 포함)
  - `galpi add-route <alias> <task-id>` / `galpi rm-route <alias>`
  - `galpi add-task <id> <state> [q=...]` / `galpi add-domain <id> <state> <path>`
  - 모든 변형 커맨드는 쓰기 전 schema 검증, 쓴 후 참조 무결성 검증을 통과해야 커밋.
- [ ] **`galpi doctor` — 구조 진단 (읽기 전용, 코드 수정 없음)**:
  - 모호한 파일·심볼 이름 (도메인·역할을 이름에서 추론할 수 없는 경우)
  - 책임이 섞인 대형 파일 (여러 도메인/task가 한 파일에 공존)
  - 구현과 떨어진 테스트 배치 (test → 구현 파일 매핑 불가)
  - index 우회 deep import
  - 앵커 없는 숨은 불변식 후보 (테스트가 단언하지만 코드·주석 어디에도 명시되지 않은 제약)
  - 출력: `--ai` compact 진단 패킷 / `--human` 설명. 진단 항목은 Phase 3.5 규칙집의 입력이 된다.
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

- [ ] **AIDEV 앵커 수집** (`@g` 체계 대체): `AIDEV-NOTE:`/`AIDEV-TODO:`/`AIDEV-QUESTION:` 위치를
  스캔해 파일·심볼 단위 앵커 포인터 레코드 생성 (앵커 본문은 복사하지 않고 위치·종류만 기록,
  레코드 문법은 BOOT에 정의). 관련 task View에 포인터를 연결한다.
- [ ] **AIDEV 앵커 lint**: 잘못된 태그, 고아 앵커, 생성물 경로 역참조, 동일 심볼의
  중복·충돌, 과도한 밀도, 잠재적 비밀값을 `WARN`/`ERR`로 보고하고 자동 수정하지 않는다.
- [ ] **AIDEV 수명주기 검증**: 해소된 `TODO`, 오래 방치된 `QUESTION`, 테스트와 충돌하는
  `NOTE`를 검출하되, 날짜·작업자를 주석 본문에 복제하지 않고 git 이력을 근거로 사용한다.
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

## Phase 3.5 — 구조 개선 효과 측정 (지저분한 fixture)

**목적**: "AI 친화적 원본 구조"가 실제로 토큰·정확도를 개선하는지 검증하고,
**효과가 실측된 변환만** 규칙집으로 확정한다. 이 규칙집이 Phase 5 `galpi optimize`의
유일한 변환 소스다 — 검증 안 된 변환으로 남의 코드를 고치는 도구는 만들지 않는다.

**왜 별도 fixture인가**: galpi-lab은 Phase 0에서 이미 AI 친화 구조로 만들어져
A/B/C 전 조건이 원본 최적화를 공유한다. 구조 효과를 보려면 일부러 지저분한
fixture에서 전/후를 비교해야 한다.

### 체크리스트

- [ ] `galpi-messy-lab/` fixture 제작: galpi-lab과 동일 기능·동일 테스트를
  일부러 나쁜 구조로 구현 — 긴 혼합 책임 파일, 모호한 이름(`utils.ts`, `helper.ts`,
  `manager2.ts` 류), 흩어진 테스트, index 우회 deep import, 숨은 불변식 무표기.
- [ ] `galpi doctor`(Phase 2)를 messy fixture에 실행해 진단 항목 확정.
  구조 개선본은 doctor 지적 사항만 고친다 (자의적 개선 금지 — 변환 추적 가능성 확보).
- [ ] 조건 정의 (2×2):
  - **M0** — 지저분한 원본, Galpi 없음 (베이스라인)
  - **M1** — 지저분한 원본 + compact Galpi (`갈피로 나쁜 구조를 얼마나 구제하는가`)
  - **M2** — 구조 개선 원본, Galpi 없음 (`구조만으로 얼마나 가는가`)
  - **M3** — 구조 개선 원본 + compact Galpi (하이브리드 = v3가 주장하는 최종형)
- [ ] 동일 시나리오·동일 횟수, **두 에이전트**, auto-memory 격리, byte-identical 검증은
  조건 내 소스 고정으로 유지 (M0=M1 소스 동일, M2=M3 소스 동일).
- [ ] 측정 항목은 Phase 1과 동일 + 가능하면 변환 항목별 기여도 분해
  (이름 개선만 적용 / 파일 분리만 적용 등 ablation은 여력에 따라 축소 가능).
- [ ] **판정**:
  - M2 ≥ M1이면 구조 개선이 외부 인덱스보다 상류라는 헌법 11조가 실증된다.
  - M3가 최고여야 하이브리드가 정당화된다. M3 ≈ M2면 소규모에서 인덱스 생략(L0~L1) 근거.
  - 효과가 측정된 변환만 "AI 친화 구조 규칙집"에 채택, 나머지는 기각 기록.
- [ ] 레벨별 손익분기점 데이터를 규모 적응형(L0~L3) 판정 신호에 반영.
- [ ] 결과 → `docs/experiments/phase35-structure.md`.

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

- [ ] **`galpi optimize` — 구조 변환 패치 제안**: Phase 3.5 규칙집에 채택된 변환만 수행.
  ts-morph 등 시맨틱 안전 도구로 리네임·파일 분리·테스트 재배치를 **패치로 제안**하고,
  테스트 통과를 적용 전제로 한다. **자동 적용 금지** — 사람이 리뷰·머지한다.
  숨은 불변식 후보에는 코드 변경 대신 AIDEV 앵커 추가를 제안한다.
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

> 2026-07-17 방향 결정, 2026-07-19 v3에서 구조 개선 트랙과 통합. 지금 구현하지 않는다.
> 다만 Phase 2 이후의 설계 결정이 이 방향과 충돌하지 않도록 참조한다.

갈피의 정체성은 "외부 인덱스 도구"가 아니라 **"코드베이스를 AI 친화적으로 만드는 계층"**이다.
구조 개선(상류)이 먼저고, 인덱스(하류)는 구조로 해결되지 않는 만큼만 얹는다 (헌법 11조).
갈피는 프로젝트의 규모·복잡도·참여자 수를 파악해 스스로 깊이를 조절한다.
근거는 Phase 1 실측이다: 작은 fixture에서는 No Galpi(A)의 총 토큰이 가장 쌌다.
갈피 구조에는 손익분기점이 있고, 그 아래에서는 구조 자체가 낭비다.

| 레벨 | 조건(예시) | 형태 |
|---|---|---|
| L0 — 구조만 | 소규모 단일 작업 프로젝트 | AI 친화 구조 규칙 + AGENTS.md 몇 줄, `.galpi` 없음 |
| L1 — 얕은 라우팅 | 도메인이 나뉘기 시작 | L0 + BOOT + source + route만, view 없음 |
| L2 — 전체 구조화 | 크고 무거운 프로젝트 | 현행 compact protocol 전체 (BOOT/MAP/source/views/status) |
| L3 — 협업 계층 | 다중 에이전트·다인 팀 | L2 + 사람용 렌더링(`galpi explain`, 대시보드, 외부 도구 연동)으로 인간 접근성 보강 |

- **레벨 판정은 자동**: 파일 수, 도메인 수, 활성 task 수, 참여 에이전트/사람 수 같은
  신호로 `galpi init`/`galpi check`가 권장 레벨을 제안하고 승급·강등을 안내한다.
- **손익분기점은 실측으로**: Phase 3.5의 M0~M3 측정과 Phase 2 이후 fixture 재측정
  (multi-file 포함)에서 레벨별 break-even을 수치로 잡는다.
- **L3도 분리 원칙 유지**: 사람용 계층은 렌더링과 외부 도구로 제공하고(헌법 7),
  에이전트 런타임은 계속 compact `.gp`다.

---

## 보류함

| 아이디어 | 보류 이유 | 재검토 조건 |
|---|---|---|
| `galpi optimize` 자동 적용 (사람 리뷰 생략) | 원본 파괴 위험, 검증 안 된 변환의 신뢰 불가 | 규칙집 성숙 + 패치 제안 모드에서 장기간 오탐 0에 수렴할 때 |
| `@g` 전용 코드 주석 문법 | AIDEV 앵커와 중복 주석 체계, 원본 토큰 오염 | AIDEV 앵커 수집만으로 task↔코드 연결이 불충분함이 측정될 때 |
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
cross_agent_consistency ↑    # Claude와 Codex의 지표 방향 일치
structure_rule_evidence = 100% # optimize의 모든 변환은 Phase 3.5 실측 근거 보유
duplicate_verification ≈ 0   # 검증 원장 적중 시 에이전트 간 재검증 없음
```

사람이 파일을 쉽게 읽을 수 있는지는 핵심 KPI가 아니다.
단, 한 에이전트에서만 성립하는 지표 개선은 성공으로 인정하지 않는다.

---

## 에이전트 실행 지침

**공통**

1. 현재 Phase의 체크리스트에서 자기 역할에 해당하는 작업을 순서대로 수행한다.
2. Phase를 건너뛰지 않는다. Phase 1.5 게이트(C3 격리 재측정 포함)는 통과 전 Phase 2 착수 금지.
3. 상태·route·의도는 변형 커맨드(Phase 2 이후) 또는 `.galpi/source.gp`에서만 변경한다.
4. `MAP.gp`, `manifest.gp`, `.galpi/v/`를 직접 수정하지 않는다.
5. 생성 결과와 코드가 충돌하면 추측하지 말고 `ERR` 또는 상태 `5`로 보고한다.
6. AI 런타임 산출물에 사람용 장문 설명을 추가하지 않는다.
7. 새 문법을 추가할 때는 BOOT 크기, tokenizer 비용, parse 오류율을 **두 에이전트에서** 측정한다.
8. 토큰 절감만으로 성공을 선언하지 않는다. 정확도·테스트·잘못된 수정 방지·교차 일관성도 함께 평가한다.
9. 사람이 이해하기 어려운 표현이라도 AI 정확도와 효율이 높으면 유지한다.
10. 로드맵 변경이 필요하면 사용자에게 변경 이유와 수정안을 먼저 제시한다.
11. 작업 종료 시 `.galpi/handoff.md`에 핸드오프를 남기고, 검증한 것은 검증 원장 형식(6절)으로 기록한다.
12. 상대 에이전트의 원장 항목은 대상 hash가 일치하면 재검증하지 않는다 (6절 재검증 트리거만 예외).
13. 원본 코드 구조 변경은 Phase 3.5 규칙집 채택 이전에는 수행하지 않는다. fixture 제작은 예외.

**Claude Code (빌더)**: 구현 담당. 로드맵 체크박스·메모 갱신 권한 단독 소유.

**Codex (검증자)**: 리뷰·교차 측정 담당. 로드맵을 수정하지 않고 `docs/worklog/codex.md`와 PR 리뷰로 기록.
