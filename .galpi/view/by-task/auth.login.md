# MANUAL PHASE 0 DERIVATIVE — DO NOT EDIT AS A SOURCE OF TRUTH.
# Source of truth: .galpi/source.yaml + actual code.
# Phase 3 will regenerate this file with galpi build.
task: auth.login
state: DONE
summary: 이메일과 비밀번호를 검증하고 세션을 생성한다.
entrypoints:
  - src/auth/auth.command.login.ts#login
files:
  - src/auth/auth.command.login.ts
  - src/auth/auth.repository.user.ts
  - src/auth/auth.service.password.ts
  - src/auth/auth.service.token.ts
dependencies:
  - shared.database
  - session.token
tests:
  - src/auth/auth.test.login.ts
rule: skip-unless-touching-or-impact
