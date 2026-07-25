# Phase 3.5 — M0 doctor baseline (M2 변환 명세)

생성일: 2026-07-26. M0 fixture `phase35/fixture-m0` @ `4d468a5`.
M2는 **이 목록에 있는 것만** 고쳐서 도출한다 (자의적 개선 금지, 로드맵 Phase 3.5).

```text
DOC|ambiguous_name|file=src/app/data.ts|name=data
DOC|ambiguous_name|file=src/app/helpers.ts|name=helpers
DOC|ambiguous_name|file=src/app/manager.ts|name=manager
DOC|large_mixed_file|file=src/app/manager.ts|lines=334|imports=core,legacy
DOC|ambiguous_name|file=src/core/core.ts|name=core
DOC|ambiguous_name|file=src/core/utils.ts|name=utils
DOC|ambiguous_name|file=src/legacy/stuff.ts|name=stuff
DOC|deep_import|file=src/app/data.ts|to=src/core/core.ts|line=1
DOC|deep_import|file=src/app/data.ts|to=src/core/core.ts|line=2
DOC|deep_import|file=src/app/data.ts|to=src/core/utils.ts|line=13
DOC|deep_import|file=src/app/helpers.ts|to=src/core/core.ts|line=1
DOC|deep_import|file=src/app/manager.ts|to=src/core/core.ts|line=1
DOC|deep_import|file=src/app/manager.ts|to=src/core/core.ts|line=2
DOC|deep_import|file=src/app/manager.ts|to=src/core/utils.ts|line=15
DOC|deep_import|file=src/app/manager.ts|to=src/legacy/stuff.ts|line=17
DOC|deep_import|file=src/extra/attendance.ts|to=src/core/core.ts|line=1
DOC|deep_import|file=src/extra/attendance.ts|to=src/core/core.ts|line=2
DOC|deep_import|file=src/extra/attendance.ts|to=src/core/core.ts|line=3
DOC|deep_import|file=src/extra/attendance.ts|to=src/app/helpers.ts|line=4
DOC|deep_import|file=src/extra/notifications.ts|to=src/core/core.ts|line=1
DOC|deep_import|file=src/extra/notifications.ts|to=src/core/core.ts|line=2
DOC|deep_import|file=src/extra/notifications.ts|to=src/core/core.ts|line=3
DOC|deep_import|file=src/extra/notifications.ts|to=src/app/helpers.ts|line=4
DOC|deep_import|file=src/extra/reporting.ts|to=src/core/core.ts|line=1
DOC|deep_import|file=src/extra/reporting.ts|to=src/app/data.ts|line=2
DOC|deep_import|file=src/extra/reporting.ts|to=src/app/helpers.ts|line=3
DOC|deep_import|file=src/test/all.test.ts|to=src/core/core.ts|line=4
DOC|deep_import|file=src/test/all.test.ts|to=src/core/core.ts|line=5
DOC|deep_import|file=src/test/all.test.ts|to=src/app/manager.ts|line=6
DOC|test_far_from_code|file=src/test/all.test.ts|imports=src/core/core.ts,src/core/core.ts,src/app/manager.ts
```
