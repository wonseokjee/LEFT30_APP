# 서버 배포 체크리스트 (TODO 11)

목표: Play 스토어 없이 APK로 일상 테스트를 한다. 서버는 로그인과 동기화만 맡는다. 기록과 30분 알림은 폰 안에서 돈다.

- 도메인: `left30.app` (2026-11-08 구매). `.app`은 HTTPS 전용이다.
- 서버 주소: `api.left30.app` → Caddy(HTTPS) → `localhost:3030`
- 개인정보처리방침 같은 웹 페이지는 나중에 루트 도메인에 둔다(TODO 12).

표시: 👤 직접 할 일(가입, 결제, 콘솔), 🤝 VM에서 같이 할 일, 🤖 Claude가 할 일.

## 진행 상황 (2026-11-09)

- Oracle 가입: 홈 리전 오사카로 진행했으나 마지막 단계에서 자동 심사에 거절됐다("계정을 생성하는 중 오류가 발생했습니다").
- 다음: 하루 쉬고 한 번만 다시 시도한다(VPN 없이, 카드 영문 정보 그대로, 신용카드). 또 막히면 Vultr 서울이나 AWS Lightsail 서울(월 5~7달러)로 간다.
- 어느 VM이든 4단계부터는 같다. Oracle에만 있는 단계는 (Oracle)로 표시했다.

## 0. 먼저 정할 것
- [x] 도메인: `left30.app`
- [x] 서버 주소: `api.left30.app`
- [ ] VM 업체와 리전: Oracle 오사카(무료) 또는 Vultr·Lightsail 서울(유료)
- [ ] 서버 시간대: UTC 권장. 앱이 시간대를 직접 다루고 DB는 `timestamptz`다.

## 1. 도메인 👤
- [x] `left30.app` 구매
- [ ] 도메인을 산 곳의 DNS 관리 화면에 들어갈 수 있는지 확인

## 2. VM 만들기 👤
- [x] SSH 키 만들기: `C:\Users\wsji9\.ssh\left30_oracle`(암호 있음). VM에는 `.pub`만 올린다.
- [ ] 가입(카드 인증)
- [ ] VM 만들기: Ubuntu 24.04
  - (Oracle) Ampere A1.Flex 2 OCPU / 12GB. "Out of capacity"면 다시 시도하거나 E2.1.Micro.
  - (유료) 가장 작은 요금제(메모리 1GB)면 4단계에서 swap을 잡는다.
- [ ] 공인 IP 고정
  - (Oracle) VNIC → IPv4 Addresses → No public IP로 바꿨다가 Reserved public IP 새로 만들기
  - (Vultr·Lightsail) 기본 IP가 고정이거나 Static IP를 붙인다.
- [ ] (Oracle) VCN Security List에 TCP 80, 443 들어오는 규칙 추가
- [ ] (Oracle) VM을 만든 뒤 계정을 Pay As You Go로 업그레이드. 사용량이 낮은 무료 VM 회수를 막는다. 무료 한도 안이면 0원이다.

## 3. DNS 👤
- [ ] A 레코드: 이름 `api`, 값은 고정 IP. Cloudflare라면 프록시는 끄고(회색 구름) 둔다.
- [ ] `nslookup api.left30.app`으로 확인 🤝. 이게 돼야 5단계 인증서가 발급된다.

## 4. VM 기본 설정 🤝
- [ ] SSH 접속: `ssh -i C:\Users\wsji9\.ssh\left30_oracle ubuntu@<IP>`
- [ ] `apt update && apt upgrade`
- [ ] 방화벽에서 80, 443 열기. (Oracle) Ubuntu 이미지는 iptables가 기본으로 막고 있다.
- [ ] SSH 비밀번호 로그인 끄기(키로만)
- [ ] 시간대 UTC, `unattended-upgrades`
- [ ] 메모리 1GB VM이면 swap 2GB

## 5. 서버 설치와 실행 🤝
- [ ] Node.js 22 LTS
- [ ] PostgreSQL 18, localhost에서만 접속
- [ ] 앱 전용 DB 계정과 `left30` DB. 비밀번호는 VM에서 직접 만들고 채팅에 붙이지 않는다.
- [ ] 저장소 받기. 비공개면 읽기 전용 deploy key.
- [ ] VM에서 `server/.env` 만들기: `PORT=3030`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `KAKAO_APP_ID`. JWT 값은 로컬과 다른 값으로 새로 만든다.
- [ ] `npm ci && npm run build && npm run migration:run`
- [ ] systemd 서비스 등록(재부팅 시 자동 시작, 죽으면 재시작)
- [ ] Caddy: `api.left30.app` → `localhost:3030`, 인증서 자동 발급·갱신
- [ ] `curl https://api.left30.app/health`

## 6. 백업 🤝
- [ ] `pg_dump` 매일, 최근 7개 보관
- [ ] 외부 보관은 테스터를 받기 전까지

## 7. 앱 빌드와 설치 🤖👤
- [ ] EAS 환경 변수 🤖: `EXPO_PUBLIC_API_URL=https://api.left30.app`, `EXPO_PUBLIC_KAKAO_APP_KEY`
- [ ] EAS `preview` 프로필로 APK 빌드 🤖 (`eas.json`에 apk, internal로 있다)
- [ ] 카카오 콘솔에 배포 빌드 키 해시 등록 👤. 빠뜨리면 로그인이 안 된다.
- [ ] 폰에 설치 → 카카오 로그인 → 온보딩

## 8. 일상 테스트 시작 확인 🤝
- [ ] 기록 몇 칸 → 서버 DB에 `slot` 행이 들어왔는지
- [ ] 다음 날 알림이 제때 오는지
- [ ] PC가 꺼져 있어도 앱이 도는지

## 나중에
- GitHub Actions 자동 배포(TODO 5). 처음에는 VM에서 `git pull`, 빌드, 마이그레이션, 재시작을 하는 스크립트 하나로 충분하다.
