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
