# MANUAL PHASE 0 DERIVATIVE — DO NOT EDIT AS A SOURCE OF TRUTH.
# Source of truth: .galpi/source.yaml + actual code.
# Phase 3 will regenerate this file with galpi build.
domain: auth
state: DONE
summary: 이메일 로그인과 메모리 기반 세션을 제공한다.
entrypoints:
  - src/auth/index.ts#createAuthModule
files:
  - src/auth/index.ts
  - src/auth/auth.command.login.ts
  - src/auth/auth.query.current-user.ts
dependencies:
  - shared.database
tests:
  - src/auth/auth.test.login.ts
tasks:
  - auth.login
  - auth.session
rule: skip-unless-touching-or-impact
