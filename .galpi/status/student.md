# student 도메인 상태

- 공식 상태와 태그: `.galpi/source.yaml`을 참조한다.
- 기준일: 2026-07-16
- 완료: 학생 생성과 입력값 검증.
- 완료: 학생 단건 조회와 전체 목록 조회.
- 완료: 학생 이름·이메일 수정.
- 완료: 학생 삭제.
- 완료: 공개 `StudentModule` 경계를 사용하는 CRUD 회귀 테스트.
- 현재 작업: 목록 정렬 기능은 Phase 1 측정 시나리오를 위해 의도적으로 미구현 상태다.
- 다음 단계: 이름 기준 오름차순·내림차순 정렬 옵션 설계.
- 다음 단계: 등록일 기준 정렬 옵션 설계.
- 다음 단계: 정렬하지 않을 때 기존 삽입 순서가 유지되는지 테스트.
- 영향 범위: `student.query.students.ts`와 공개 `StudentModule.list` 시그니처.
- 주의: `lesson`은 `StudentModule.get`으로 학생 존재 여부를 확인한다.
- 제약: `StudentModule.get`의 호환성은 유지해야 한다.
- 테스트: `src/student/student.test.crud.ts`.
- 상태 원본: `.galpi/source.yaml`; 이 문서에는 진행 상황만 기록한다.
