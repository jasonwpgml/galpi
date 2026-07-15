# MANUAL PHASE 0 DERIVATIVE — DO NOT EDIT AS A SOURCE OF TRUTH.
# Source of truth: .galpi/source.yaml + actual code.
# Phase 3 will regenerate this file with galpi build.
task: lesson.enroll
state: DONE
summary: 학생 존재 여부와 정원을 확인해 강의에 등록한다.
entrypoints:
  - src/lesson/lesson.command.enroll.ts#enrollStudent
files:
  - src/lesson/lesson.command.enroll.ts
  - src/lesson/lesson.repository.lesson.ts
  - src/lesson/index.ts
dependencies:
  - student.lookup
  - shared.database
tests:
  - src/lesson/lesson.test.enrollment.ts
rule: skip-unless-touching-or-impact
