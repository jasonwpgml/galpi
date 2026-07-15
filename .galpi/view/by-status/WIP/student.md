# MANUAL PHASE 0 DERIVATIVE — DO NOT EDIT AS A SOURCE OF TRUTH.
# Source of truth: .galpi/source.yaml + actual code.
# Phase 3 will regenerate this file with galpi build.
domain: student
state: WIP
tags:
  - HOT
summary: 학생 CRUD를 제공하며 목록 정렬 기능을 다음 작업으로 남겨 두었다.
entrypoints:
  - src/student/index.ts#createStudentModule
files:
  - src/student/index.ts
  - src/student/student.command.manage.ts
  - src/student/student.query.students.ts
dependencies:
  - shared.database
tests:
  - src/student/student.test.crud.ts
status: .galpi/status/student.md
tasks:
  - student.create
  - student.list
rule: read-status-first
