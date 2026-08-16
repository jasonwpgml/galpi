# Galpi Lab

Galpi Protocol의 상태·의도 기반 라우팅을 실험하기 위한 작은 TypeScript 학습 관리 앱이다.

## 실행

```bash
npm install
npm run check
npm run demo
```

`npm run check`는 타입 검사, 테스트, 번들 빌드를 순서대로 실행한다. `npm run demo`는 인증, 학생 등록, 강의 생성, 수강 신청의 최소 흐름을 실행한다.

## Galpi AI runtime

에이전트 런타임은 `.galpi/BOOT.gp`에서 시작한다. 상태·route·의도의 원본은
`.galpi/source.gp`이며 `MAP.gp`와 `.galpi/v/`는 파생 탐색 자료다.

`.galpi`를 직접 편집하지 않는다. 상태·route 변경은 CLI로 한다.

```bash
npm run galpi -- check     # 런타임 계약 검증 (pre-commit·CI와 동일 게이트)
npm run galpi -- doctor    # 구조 진단 (읽기 전용, --root <path>로 외부 트리도 가능)
npm run galpi -- build     # 실제 코드의 file/symbol/import/test 그래프 생성
npm run galpi -- build --check
npm run galpi -- query 수강신청         # 최소 GP query packet
npm run galpi -- query 수강신청 --human # 경로와 symbol line span
```

## 문서

| 경로 | 내용 |
|---|---|
| `docs/roadmap.md` | 현행 로드맵 (AI-First Revision v3) — 헌법, Phase 계획, 성공 기준 |
| `docs/experiments/` | Phase별 측정 보고서와 실험 설계 |
| `docs/plans/` | 기능 계획서 |
| `docs/worklog/` | 에이전트별 작업 기록 (Codex 리뷰 등) |
| `docs/roadmap-history/` | 폐기된 로드맵 초안 (기록용) |
| `.galpi/handoff.md` | 세션 간 인계 — 완료·검증됨·다음 할 일 |
