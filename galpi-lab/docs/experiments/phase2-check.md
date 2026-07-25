# Phase 2 — `galpi check`/`doctor` 오탐·미탐 기록

구현일: 2026-07-19. 이 문서는 check/doctor의 판정 품질을 추적한다.
새 오탐·미탐을 발견하면 여기에 사례와 조치를 추가한다.

## 검사 인벤토리

`galpi check` (오류, exit 1):
`parse`, `missing_header`, `unknown_opcode`, `dup_id`, `bad_state`, `bad_action`,
`missing_path`, `missing_ref`, `missing_file`, `view_state_desync`, `map_desync`,
`plan_has_code`, `dead_import`, `stale`(verified tree hash), `lock_modified`.

`galpi doctor` (진단 소견, 항상 exit 0):
`ambiguous_name`, `large_file`, `large_mixed_file`, `deep_import`,
`test_far_from_code`, `missing_anchor`.

훅: `tools/galpi/hooks/pretooluse.mjs` — Write/Edit/NotebookEdit 대상
DEAD(4)·LOCK(l) 도메인 경로와 파생물(MAP/manifest/v)을 exit 2로 거부.

## 오탐 기록

| 날짜 | 검사 | 사례 | 조치 |
|---|---|---|---|
| 2026-07-19 | `test_far_from_code` | 자기 도메인 코드 + `shared/index`를 함께 import하는 정상 테스트 3건을 과탐 | 휴리스틱 변경: 자기 디렉토리 import가 0건일 때만 보고 |
| 2026-07-19 | `missing_anchor` | 앵커가 쿼리 파일에 있는데 types/index 파일을 개별 과탐 | task 단위 판정으로 변경: 구현 파일 중 어디에도 앵커가 없을 때만 보고 |
| 2026-07-25 | `stale` | Galpi 루트가 저장소 루트의 하위 디렉토리일 때(`galpi-lab/`) `git rev-parse HEAD:<domain.path>`가 저장소 루트 기준으로 풀려 `verified=` 도메인을 전부 stale로 과탐. 현재 `verified=` 사용 도메인이 없어 잠복 상태였음 | `HEAD:./<path>`로 cwd 기준 해석. CI 연동 중 발견, 임시 `verified=` 주입으로 재현·확인 |

## 미탐 기록

| 날짜 | 검사 | 사례 | 조치 |
|---|---|---|---|
| 2026-07-25 | `plan_has_code` | PLAN 도메인 디렉토리 **바로 아래** 파일만 봐서 `src/<plan>/sub/x.ts`처럼 하위 디렉토리에 숨은 코드를 놓침 | 재귀 탐색(`containsFile`)으로 변경. 회귀 테스트 추가 (Codex 리뷰 지적 #2) |
| 2026-07-25 | 훅 `pretooluse.mjs` | Windows·macOS 등 대소문자 비구분 FS에서 `SRC/LEGACY/x.ts`가 DEAD/LOCK·파생물 비교를 우회 (같은 파일인데 exit 0) | 매칭 시 양쪽 case fold, DENY 패킷은 원문 유지. 회귀 테스트 추가 (Codex 리뷰 지적 #3) |

## 알려진 한계

- `dead_import`/`deep_import`는 정규식 import 스캔 기반 — 동적 import 문자열 조립은
  못 본다. Phase 3에서 ts-morph 기반 추출로 대체 예정.
- `stale`은 `verified=` 필드가 있는 도메인만 검사한다. 필드 도입은 선택이며,
  working tree가 dirty하면 `got=dirty`로 보고한다.
- 훅은 Write/Edit/NotebookEdit만 게이팅한다. Bash 경유 파일 수정은 pre-commit의
  `galpi check`가 2차로 잡는다 (lock_modified/dead_import).
- 변형 커맨드 롤백은 source·MAP·view·status 파일의 바이트 스냅샷 복원이다 (2026-07-25,
  Codex 리뷰 지적 #1). 검증 실패뿐 아니라 sync·check 도중 예외에도 복원한다.
- CI 연결은 저장소에 CI 인프라가 생길 때 수행.
