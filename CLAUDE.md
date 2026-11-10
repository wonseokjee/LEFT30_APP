# LEFT30

30분마다 "지난 30분 뭐 했어?"를 묻고 하루를 칸으로 기록하는 앱. 재출시 작업 중.

## 언어

모든 대화, 질문, 커밋 메시지, 문서는 한국어로 쓴다. gstack 스킬 출력도 한국어로 쓴다.

## 구조

```
LEFT30_APP/
├── server/        NestJS 11 + TypeORM 0.3 + Postgres (API, 동기화)
├── application/   Expo 53 + React Native 0.79 + expo-router + zustand (앱)
├── docs/designs/left30-relaunch.md   재출시 설계서 (결정 R·D·ENG·E 번호의 정본)
└── TODO.md        구현 작업 목록 (T 번호)
```

결정이나 범위가 궁금하면 설계서부터 읽는다. 설계서와 코드가 다르면 묻는다.

## 서버 (`server/`)

- 스키마는 마이그레이션으로만 바꾼다(`synchronize: false`). 새 변경은 `src/migrations/`에 새 파일로 추가한다.
- 엔티티 4개: `user`, `slot`, `plan`, `event` (`src/Entity/`).
- 인증: access와 refresh는 secret과 `type` claim이 다르다. 사용자 식별은 JWT `sub`만 믿는다. refresh는 60일 고정이고 회전하지 않는다. 카카오 토큰은 `KAKAO_APP_ID`와 app_id가 같을 때만 받는다(없으면 서버가 시작하지 않는다).
- 동기화 API는 항목별로 검증하고 항상 200으로 `{accepted, rejected}`를 돌려준다(R3). 500건이나 1MB를 넘으면 413.
- 비밀값은 환경 변수로만 둔다. `.env`, `.env.test`는 커밋하지 않는다. 템플릿은 `.env.example`.

### 테스트

e2e는 실제 Postgres에 붙는다. Kakao만 목킹한다(`kakao-<숫자>` 토큰).

1. Postgres 18 켜기(수동 시작 서비스, 관리자 권한): `Start-Service postgresql-x64-18`
2. `server/.env.test` 확인: `localhost:5432`, `DB_NAME=left30_test`. 비밀번호는 사용자가 직접 넣는다.
3. `cd server && npm run test:e2e` (`--runInBand`, 약 35초)

`left30_test` DB가 없으면 `.env.test` 값으로 만든다. 비밀번호를 출력하지 않는다.

### 기타 명령

- 타입 검사: `cd server && npx tsc --noEmit`
- 마이그레이션 실행: `npm run migration:run` (`.env` 사용)

## 앱 (`application/`)

- 실행: `npm start`, 안드로이드 빌드: `npm run android`, 린트: `npm run lint`
- `application/.env`에 `EXPO_PUBLIC_KAKAO_APP_KEY`와 `EXPO_PUBLIC_API_URL`(서버 주소, 에뮬레이터는 `http://10.0.2.2:3030`)이 있어야 한다. 서버 주소가 없으면 `app.config.ts`가 시작을 막는다. 템플릿은 `.env.example`.
- 테스트: `cd application && npx jest` (`npm test`는 watch 모드). 로직(`db`, `sync`, `scheduler`, `record`)은 Node 내장 `node:sqlite`로 실제 SQLite에 붙여 테스트한다(`test/nodeDb.ts`).
- 타입 검사: `npx tsc --noEmit`
- 에뮬레이터 확인: `npx expo run:android --device Pixel_5`(AVD 이름). 개발 빌드에서만 로그인 화면의 "로그인 없이 시작"과 계정 관리의 개발용 도구(테스트 알림, 예약 개수)가 보인다. `/android`는 prebuild 산출물이라 커밋하지 않는다.
- 앱 ID(D28): 로컬·개발 빌드는 `com.left30m.app.dev`("LEFT30 개발", scheme `myapp`), EAS preview·production은 `APP_VARIANT=release`로 `com.left30m.app`("LEFT30", 서버 `https://api.left30.app`)이다. 폰에 나란히 깔린다. 개발 빌드 DB는 `adb exec-out run-as com.left30m.app.dev ...`로 본다.
- `api/`의 todo·user API는 옛 서버용이다. 서버에서는 이미 지웠다. (timetable API는 앱에서도 지웠다.)

## 작업 규칙

- 브랜치: 기본은 `main`. 재출시 작업은 `refactor/architecture`. 커밋 전에 현재 브랜치를 확인한다.
- 커밋 메시지: `[Docs]`, `[Refactor]`, `[Chore]`, `[Feat]`, `[Fix]` 접두어 + 한국어 요약.
- push, 배포, DB 삭제처럼 되돌리기 어려운 일은 먼저 묻는다.
- 의존성은 신중하게 추가한다. 추가할 때는 무의존성 대안도 함께 제시한다.
- UI 제안은 표시가 가장 적은 안을 권장안으로 둔다.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. Route only to skills in the session's available-skills list; answer directly for quick questions or small scoped edits.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
