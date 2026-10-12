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

## 4. 앱 — `application/`
- [ ] `baseURL` 하드코딩 제거 → `EXPO_PUBLIC_API_URL` 환경변수 (api.tsx, Loginapi.tsx)
- [ ] 새 도메인으로 설정 후 배포 (JS 변경이면 EAS Update, 네이티브 변경 포함 시 재빌드)
- [ ] 3번 API 변경에 맞춰 호출부 수정 (user_id 전송 제거 등)
- [ ] 카카오 개발자 콘솔 플랫폼/도메인 설정 갱신 필요 여부 확인

## 5. 배포 자동화
- [ ] 루트 `.github/workflows/deploy.yml` 신규 작성 (`server/**` 변경 시에만 실행)
- [ ] GitHub Secrets: Oracle VM host / user / SSH key
- [ ] 배포 스크립트: pull → `cd server && npm ci && npm run build && npm run migration:run` → 재시작

## 6. 재가동 확인
- [ ] `https://<도메인>/health` 응답
- [ ] 카카오 로그인 → 토큰 발급/재발급
- [ ] FCM 토큰 등록 → :00/:30 푸시 수신, :05/:35 이전 행동 자동 입력
- [ ] 방해금지 시간 동안 푸시 미발송
