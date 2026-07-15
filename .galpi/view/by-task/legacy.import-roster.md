# MANUAL PHASE 0 DERIVATIVE — DO NOT EDIT AS A SOURCE OF TRUTH.
# Source of truth: .galpi/source.yaml + actual code.
# Phase 3 will regenerate this file with galpi build.
task: legacy.import-roster
state: DEAD
summary: 폐기된 쉼표 전용 학생 명단 가져오기 기능이다.
entrypoints:
  - src/legacy/legacy.service.csv-import.ts#parseLegacyRoster
files:
  - src/legacy/legacy.service.csv-import.ts
dependencies: []
tests: []
rule: deny-reuse-modify
