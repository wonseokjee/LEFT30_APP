# 서버 배포 체크리스트 (TODO 11)

목표: Play 스토어 없이 APK로 일상 테스트를 한다. 서버는 로그인과 동기화만 맡는다. 기록과 30분 알림은 폰 안에서 돈다.

- 도메인: `left30.app` (2026-11-08 구매). `.app`은 HTTPS 전용이다.
- 서버 주소: `api.left30.app`
- 서버: **Vercel**(Hobby, 무료). NestJS 앱 전체가 Vercel 함수 하나로 돈다. HTTPS는 Vercel이 붙인다.
- DB: **Neon**(Free, Postgres). 앱은 pooled 주소, 마이그레이션은 direct 주소로 붙는다.
- 개인정보처리방침 같은 웹 페이지는 나중에 루트 도메인에 둔다(TODO 12).

표시: 👤 직접 할 일(가입, 콘솔, 비밀값 입력), 🤖 Claude가 할 일.

## 왜 Vercel + Neon인가 (2026-11-10)

- Oracle Always Free는 가입 마지막 단계에서 자동 심사에 두 번 거절됐다.
- Vercel Hobby와 Neon Free는 카드 없이 가입되고, 서버가 잠들어 30초씩 기다리는 일이 없다.
- 서버에 정해진 시각에 도는 작업(cron, 타이머)이 없다. 요청이 올 때만 일하는 로그인·동기화라 서버리스로 충분하다.
- 제약
  - Vercel Hobby는 개인·비상업 용도다. 돈을 받거나 정식 서비스로 키우면 Pro나 VM으로 옮긴다. 코드는 그대로 쓴다.
  - Neon Free는 프로젝트당 1GB, 월 100 CU-시간이다. DB는 5분 동안 요청이 없으면 멈추고 다음 요청에 깨어난다.
  - 그래서 바깥 가동 감시(R6)를 붙일 때 5분마다 `/health`(DB까지 확인)를 부르면 DB가 계속 깨어 있어 한도를 넘는다. 감시 간격을 15분 이상으로 두거나 DB를 보지 않는 주소를 쓴다.

## 코드 준비 🤖 (deploy/server 브랜치)
- [x] `DATABASE_URL`이 있으면 그 주소로 SSL 접속(`server/src/db.config.ts`). 없으면 지금처럼 `DB_*`(로컬·e2e).
- [x] `npm run migration:run:neon`: `server/.env.neon`(git 제외)의 `DATABASE_URL`로 마이그레이션
- [x] `server/vercel.json`: 함수 지역 `sin1`(싱가포르). Neon 지역과 맞춘다.
- [x] e2e 21건 통과(로컬 Postgres)

## 1. 도메인 👤
- [x] `left30.app` 구매
- [ ] 도메인을 산 곳의 DNS 관리 화면에 들어갈 수 있는지 확인

## 2. Neon (DB) 👤
- [ ] https://neon.com 가입(GitHub 계정)
- [ ] 프로젝트 만들기: 이름 `left30`, Postgres 최신 버전, 지역 **AWS Asia Pacific (Singapore)**
  - 다른 아시아 지역을 고르면 `server/vercel.json`의 지역도 맞춰 바꾼다.
- [ ] Connect 화면에서 연결 주소 두 개를 복사해 둔다. **채팅에 붙이지 않는다.**
  - pooled(호스트에 `-pooler`가 붙은 것): Vercel `DATABASE_URL`용
  - direct(`-pooler` 없는 것): 마이그레이션용
- [ ] `server/.env.neon` 파일을 만들고 `DATABASE_URL=<direct 주소>` 한 줄을 넣는다.
- [ ] `cd server && npm run migration:run:neon` → 테이블 4개(user, slot, plan, event)가 생겼는지 Neon 화면 Tables에서 확인

## 3. Vercel (서버) 👤
- [ ] `deploy/server` 브랜치를 GitHub에 push (Vercel이 저장소에서 가져간다)
- [ ] https://vercel.com 가입(GitHub 계정) → Add New → Project → 이 저장소 Import
  - Root Directory: `server`
  - Framework Preset: NestJS(자동으로 잡힌다)
- [ ] Environment Variables (Production)
  - `DATABASE_URL`: Neon **pooled** 주소
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: 로컬과 다른 새 값. PC에서 만들어 바로 붙여 넣는다.
    `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` 를 두 번 실행해 서로 다른 값을 쓴다.
  - `KAKAO_APP_ID`: 카카오 콘솔의 앱 ID(숫자)
- [ ] Settings → Git → Production Branch를 `deploy/server`로 바꾸고 다시 배포
- [ ] `https://<프로젝트>.vercel.app/health`가 `{"status":"ok"}`인지 확인

## 4. 도메인 연결 👤🤖
- [ ] Vercel 프로젝트 → Settings → Domains → `api.left30.app` 추가
- [ ] Vercel이 알려 주는 레코드를 DNS에 넣는다(보통 `CNAME api → cname.vercel-dns.com` 같은 값. 화면에 나온 값을 그대로 쓴다).
  - Cloudflare라면 프록시를 끄고(회색 구름) 둔다.
- [ ] `curl https://api.left30.app/health` 🤖

## 5. 백업
- [ ] Neon은 짧은 기간 안의 시점으로 되돌리기(restore)를 지원한다. Free 플랜 보관 기간을 확인한다.
- [ ] 테스터를 받기 전까지 PC에서 `pg_dump`로 주기적인 사본을 남기는 방법을 정한다.

## 6. 앱 빌드와 설치 🤖👤
- [ ] EAS 환경 변수 🤖: `EXPO_PUBLIC_API_URL=https://api.left30.app`, `EXPO_PUBLIC_KAKAO_APP_KEY`
- [ ] EAS `preview` 프로필로 APK 빌드 🤖 (`eas.json`에 apk, internal로 있다)
- [ ] 카카오 콘솔에 배포 빌드 키 해시 등록 👤. 빠뜨리면 로그인이 안 된다.
- [ ] 폰에 설치 → 카카오 로그인 → 온보딩

## 7. 일상 테스트 시작 확인
- [ ] 기록 몇 칸 → Neon의 `slot` 테이블에 행이 들어왔는지
- [ ] 다음 날 알림이 제때 오는지
- [ ] PC가 꺼져 있어도 앱이 도는지

## 기록
- 2026-11-09: Oracle(오사카) 가입이 마지막 단계에서 자동 심사에 거절됐다.
- 2026-11-10: 다시 시도했지만 또 막혔다. Vercel + Neon으로 바꿨다. SSH 키(`C:\Users\wsji9\.ssh\left30_oracle`)는 이제 쓰지 않는다.
