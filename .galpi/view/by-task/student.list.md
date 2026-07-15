# MANUAL PHASE 0 DERIVATIVE — DO NOT EDIT AS A SOURCE OF TRUTH.
# Source of truth: .galpi/source.yaml + actual code.
# Phase 3 will regenerate this file with galpi build.
task: student.list
state: WIP
summary: 학생 목록을 반환하며 정렬 옵션은 아직 구현되지 않았다.
entrypoints:
  - src/student/student.query.students.ts#listStudents
files:
  - src/student/student.query.students.ts
  - src/student/student.types.student.ts
  - src/student/index.ts
dependencies:
  - shared.database
tests:
  - src/student/student.test.crud.ts
status: .galpi/status/student.md
rule: read-status-first
