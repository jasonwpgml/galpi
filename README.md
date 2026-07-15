# Galpi Lab

Galpi Protocol의 상태·의도 기반 라우팅을 실험하기 위한 작은 TypeScript 학습 관리 앱이다.

## 실행

```bash
npm install
npm run check
npm run demo
```

`npm run check`는 타입 검사, 테스트, 번들 빌드를 순서대로 실행한다. `npm run demo`는 인증, 학생 등록, 강의 생성, 수강 신청의 최소 흐름을 실행한다.

## Galpi 데이터

상태와 행동 규칙의 유일한 원본은 `.galpi/source.yaml`이다. `.galpi/MAP.yaml`과
`.galpi/view/`는 Phase 0에서 수동으로 만든 탐색용 파생물이며 Phase 3부터 자동 생성한다.

작업 탐색은 코드 검색보다 먼저 `.galpi/MAP.yaml`의 route와 해당 View를 따라야 한다.
