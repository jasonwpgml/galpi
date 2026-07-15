# MANUAL PHASE 0 DERIVATIVE — DO NOT EDIT AS A SOURCE OF TRUTH.
# Source of truth: .galpi/source.yaml + actual code.
# Phase 3 will regenerate this file with galpi build.
dependency: shared.database
state: DONE
summary: 기능 도메인에서 사용하는 메모리 데이터베이스다.
entrypoints:
  - src/shared/index.ts#MemoryDatabase
files:
  - src/shared/index.ts
  - src/shared/shared.repository.memory-database.ts
used-by-domains:
  - auth
  - student
  - lesson
used-by-tasks:
  - auth.login
  - auth.session
  - student.create
  - student.list
  - lesson.manage
  - lesson.enroll
tests:
  - src/auth/auth.test.login.ts
  - src/student/student.test.crud.ts
  - src/lesson/lesson.test.enrollment.ts
rule: read-when-dependency
