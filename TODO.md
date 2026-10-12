# TODO — 서버 재가동 (Oracle Cloud + 새 도메인)

> 기존 운영 서버(`left30m.com`)는 중단됨. 도메인도 만료되어 새로 등록 필요.
> 순서: 1 → 2 → 3 → 4 → 5 (3번 코드 작업은 1·2와 병행 가능)

## 1. 도메인
- [ ] `left30m.com` 재등록 가능 여부 확인 (만료 후 유예/복구 기간이면 기존 등록업체에서 복구, 아니면 새로 구매)
- [ ] 불가 시 새 도메인 구매 → 이 문서와 앱 설정의 도메인 표기 갱신
- [ ] DNS A 레코드 → Oracle VM 예약 공인 IP (2번 완료 후)
- [ ] HTTPS 인증서 발급 (Caddy 자동 발급 또는 nginx + certbot)

## 2. Oracle Cloud 인프라
- [ ] Oracle Cloud 가입 (카드 인증), 홈 리전: 서울 또는 춘천 (가입 후 변경 불가)
- [ ] Always Free 한도 확인 (Ampere A1 2 OCPU/12GB vs 4/24GB — 공식 문서 기준)
- [ ] VM 생성: Ubuntu, Ampere A1 (재고 없으면 AMD E2.1.Micro로 대체)
- [ ] 공인 IP를 **예약(Reserved) IP**로 전환 — 재시작 시 IP 변경 방지
- [ ] 방화벽 두 군데 모두 열기: VCN Security List ingress 80/443 + VM 내부 iptables (Oracle Ubuntu 이미지 기본 차단)
- [ ] SSH 키 전용 로그인, 비밀번호 로그인 비활성화
- [ ] 서버 시간대 결정 (`Asia/Seoul` 또는 UTC 유지 — 3번 시간대 작업과 맞출 것)
- [ ] Node.js 22 LTS, PostgreSQL 설치, 앱 전용 DB 계정 생성
- [ ] 프로세스 매니저 (pm2 + startup 또는 systemd)
- [ ] 리버스 프록시 (Caddy 또는 nginx) → localhost:3030
- [ ] 메모리 작으면 swap 추가 (AMD Micro 사용 시 필수)
- [ ] DB 백업: `pg_dump` 일일 cron + 외부(Object Storage 등) 보관
- [ ] Always Free 유휴 인스턴스 회수 정책 확인 및 대응

## 3. 서버 코드 (배포 전 필수) — `server/`
- [ ] **보안**: `@CurrentUser()` 도입, userId를 path/body 대신 JWT `sub`에서 사용 (IDOR 제거)
- [ ] **버그**: `updateTimeSlot`이 `user_id` undefined로 타 유저 기록 덮어쓰는 문제 수정
- [ ] 전역 `ValidationPipe({ whitelist: true })` + timetable DTO `user`/`user_id` 필드 통일 (앱과 동시 수정)
- [ ] access/refresh 토큰 구분 (refresh가 access로 통과하지 않게)
- [ ] `GET /timetable` 전체 조회 제거 또는 관리자 전용
- [ ] 회원탈퇴 트랜잭션 처리
- [ ] `TypeOrmModule.forRootAsync` + ConfigService, DB host 환경변수화
- [ ] `synchronize: false` + 마이그레이션 도입 (초기 마이그레이션 생성)
- [ ] Firebase 서비스 계정 키를 빌드 import 대신 런타임 경로/환경변수로 로드
- [ ] 시간대 처리 KST 유틸로 통일 (크론, today/yesterday, 슬롯 조회)
- [ ] `.env.example` 작성 (DB_*, JWT_SECRET, PORT, FIREBASE 키 경로)
- [ ] 헬스체크 엔드포인트 (`GET /health`)
- [ ] 기존 운영 DB 데이터 보존 여부 확인 → 이전할 데이터 없으면 새 스키마로 시작
- [ ] 초기 마이그레이션 전에 스키마 정리 (새 DB면 지금이 비용 0): 테이블명 `timetable_entrie` → `timetable_entry`, Todo `due_time` `timestamp` → `timestamptz`
- [ ] 로그아웃 시 DB의 refreshToken 무효화 (현재 카카오 로그아웃만 호출)
- [ ] 회원탈퇴 응답 형식 통일 (서버 `{ message }` vs 앱 `status === 'success'` 체크 불일치)
- [ ] 만료된 FCM 토큰 정리 연결 (`handleFcmTokenError` 미사용, `removeToken`은 userId를 받는데 token 전달하는 구조)
- [ ] `app.controller.spec.ts` 깨진 테스트 수정 (없는 "Hello World" 기대)

## 4. 앱 — `application/`
- [ ] `baseURL` 하드코딩 제거 → `EXPO_PUBLIC_API_URL` 환경변수 (api.tsx, Loginapi.tsx)
- [ ] 새 도메인으로 설정 후 배포 (JS 변경이면 EAS Update, 네이티브 변경 포함 시 재빌드)
- [ ] 3번 API 변경에 맞춰 호출부 수정 (user_id 전송 제거 등)
- [ ] 카카오 개발자 콘솔 플랫폼/도메인 설정 갱신 필요 여부 확인
- [ ] 토큰 재발급 interceptor 수정 (`Loginapi.tsx`): `_retry` 플래그로 무한 재시도 방지, 동시 401 시 재발급 1회만(single-flight), 요청 interceptor 에러에서 "로그인 만료" 모달 띄우지 않기
- [ ] 자동 로그인 일원화: `_layout.tsx`(카카오 `isLogined` + 매번 재로그인)와 `(login)/index.tsx`(SecureStore 토큰 체크)가 동시에 `router.replace` 경쟁
- [ ] 로그아웃 시 서버 로그아웃 호출 + `user_id`까지 삭제, `logoutModal`/`loginExpiredModal` 중복 로직 공통화
- [ ] `app.config.ts` 카카오 네이티브 앱 키 하드코딩 → `EXPO_PUBLIC_KAKAO_APP_KEY` 사용 (현재 읽기만 하고 미사용)

## 5. 배포 자동화
- [ ] 루트 `.github/workflows/deploy.yml` 신규 작성 (`server/**` 변경 시에만 실행)
- [ ] GitHub Secrets: Oracle VM host / user / SSH key
- [ ] 배포 스크립트: pull → `cd server && npm ci && npm run build && npm run migration:run` → 재시작

## 6. 재가동 확인
- [ ] `https://<도메인>/health` 응답
- [ ] 카카오 로그인 → 토큰 발급/재발급
- [ ] FCM 토큰 등록 → :00/:30 푸시 수신, :05/:35 이전 행동 자동 입력
- [ ] 방해금지 시간 동안 푸시 미발송

---

# 재가동 이후 — 리팩터 백로그

## 7. 서버 구조 정리 — `server/`
- [ ] DI 중복 제거: `AuthJWTService`를 `AuthModule`/`UserModule` providers에서 빼고 `AuthJWTModule` import만 사용, `ConfigModule.forRoot` 중복 호출 제거
- [ ] 크론(`inputPreviousAction`, `inputPresentAction`)을 `PushService`에서 별도 모듈(scheduler/action)로 분리, 유저별 N+1 쿼리 → 일괄 조회
- [ ] 죽은 코드 제거: `KakaoApiService.findOrCreateByKakao`, 빈 `AppController`/`AppService`, `todo.findByUserId`의 `if (!todo)`, 주석 처리된 디버그 코드
- [ ] 에러 처리 통일: `throw new Error` → `NotFoundException` 등 HttpException (현재 500 반환)
- [ ] 응답 방식 통일: `@Res()` 직접 응답(auth) vs 값 반환 혼재
- [ ] 타입 정리: `@Types/user/userType.ts`의 `User`와 엔티티 이름 충돌, `types/express.d.ts`의 미정의 `User` → JWT payload 타입
- [ ] `console.log` → Nest `Logger`
- [ ] 엔티티/DTO를 기능 모듈 안으로 이동할지 결정
- [ ] 핵심 로직 테스트: 방해금지 쿼리, `splitInto30MinEndTimes`, 크론, 권한(타 유저 접근 차단)
- [ ] action 값 서버 검증 (enum: 수면/휴식/운동/관계/자기개발/업무)

## 8. 앱 구조 정리 — `application/`
- [ ] 서버 상태 관리 정리: `togle`/`remove`/`isUpdated` boolean 토글로 refetch 트리거하는 패턴 → TanStack Query 등
- [ ] 버그: `mergeSlots`가 시간 간격 무시하고 같은 action/description 병합 + 서버 `range` 무시(3 고정)
- [ ] 버그: 어제 날짜 `getDate() - 1` → 매월 1일에 "0(어제)"
- [ ] 버그: `AddTaskModal`이 `addTodoItemFromDB`를 await하지 않아 목록 갱신이 저장보다 먼저 일어날 수 있음
- [ ] 앱 내 타이머 모달(기기 시각)과 서버 푸시(:00/:30) 이중 트리거 정리
- [ ] action 목록(`['수면', ...]`) 5곳 중복 → 상수 하나로 (`ACTION_KEYS`, `CheckboxLabel`, 모달 2곳 등)
- [ ] 죽은 코드/의존성 제거: `components/firebase/getTimeTable.tsx`, `checkLogin.ts`, `useTimeSlotStore_today/_yesterday`, `@react-native-firebase/*`·`firebase` 패키지, `createStackNavigator`
- [ ] `quietTimeModal`이 `BasicModal` 재구현 → 공통 모달 사용
- [ ] 폴더 정리: `hooks/actionModal`(실제론 컴포넌트) → `components/`, `@types/firebase/common/actionColorType`(런타임 값) → `constants/`, JSX 없는 `.tsx` → `.ts`
- [ ] `api`/`Loginapi` → `publicClient`/`authClient` 등 의미 있는 이름
- [ ] `any` 제거 (`tasks`, store 타입), 서버와 API 타입 공유 방안

## 9. 저장소 정리
- [ ] `refactor/architecture` 푸시 → `main` PR
- [ ] 병합 후 구 브랜치 정리: `feature/fe`, `develop/fe`, `develop/be`, `feature/be`, `master`, `release`
- [ ] `application/android_backup/` 삭제 (네이티브 폴더는 EAS prebuild로 생성)
- [ ] 루트 `package-lock.json` 잔여 파일 삭제
- [ ] 루트 README: 모노레포 구조, 로컬 실행 방법
