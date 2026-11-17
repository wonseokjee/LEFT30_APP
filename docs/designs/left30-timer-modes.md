# 작업 계획: 뽀모도로 타이머와 공부 시간 타이머(스톱워치)

/plan-ceo-review 2026-11-16, 브랜치 refactor/architecture. 정본 설계서는 `docs/designs/left30-relaunch.md`. 이 파일은 리뷰 작업본이고, 승인된 결정만 끝에 설계서와 TODO.md에 옮긴다.

## 요청
- 지금 앱에는 30분 타이머(다음 알림까지 남은 시간)만 있다. 뽀모도로 타이머와 공부 시간을 재는 타이머(스톱워치)도 있어야 할 것 같다.
- 어떤 방향으로 기획할지 자세히 계획한다. 질문은 화면과 사용 순간부터.

## 시스템 감사 (사전)
- 최근 커밋: 4614942 배포 기록, d711cd0 deploy/server 합침, 45b476d 알림 버튼 [그대로 계속], da6122a 아침 계획 제안, 96c0a51 홈 계획 대비 실제. stash 없음.
- 진행 중 브랜치: `design/cat`(고양이 개편 문서 2커밋, `docs/designs/left30-cat.md`), `design/cat-image`(이미지 생성). 테스터용 일상 APK는 아직 11-10 버전이고 2주 검증은 시작 전이다.
- 관련 설계
  - 집중 블록(`docs/designs/left30-focus-block.md`, 2026-11-11 CEO 리뷰): 홈 [집중] → 카테고리 → 길이(1시간, 2시간 …, 다음 30분 경계부터) → 그동안 알림 없음 → 끝 시트(A안). 사용자 인용 "공부중에 집중하고 싶으면 b에서 누를 수 있는 칸".
  - 홈 타이머(`application/components/focus/FocusStatus.tsx:16-21`): 큰 숫자는 다음 30분 경계까지 남은 시간. 블록 중에는 그 아래 "업무 · 15:30까지 · 1시간 49분 남음".
  - S1(설계서:316): 답한 행동이 있던 30분 시간대 하루 3곳 이상. 집중 블록 시작도 답한 행동으로 센다.
  - 고양이 문서: 상태별 모션에 "집중 블록 진행 중 → 식빵 자세"가 있다. 타이머 모드가 생기면 상태가 늘어난다.
- UI 범위: 있음(홈, 집중 시작 시트, 끝 시트, 알림). Section 11 대상.

## 시장 확인 (Landscape)
- 공부 타이머는 붐비는 시장이다. 열품타(과목별 공부 시간, 매일 05시 초기화), Todak Time(과목별 목표, 잠금 화면 조작, 주간·월간 기록), Retime(뽀모도로 + 카운트업 두 모드, 할 일 연결), Forest(나무 키우기 게임화), Study Kitty(고양이 + 뽀모도로)가 있다.
- Toggl Track은 뽀모도로 세션이 시간 기록 보고서에 그대로 들어간다. "타이머 = 기록 입력"으로 쓰는 쪽이 기록 앱에 가장 가깝다.
- Layer 1: 공부 타이머의 기본은 과목별 카운트업 + 뽀모도로 + 하루 합계.
- Layer 3: LEFT30은 이미 하루를 30분 칸으로 나눈다. 뽀모도로 25분 + 휴식 5분 = 30분, 즉 **칸 하나가 뽀모도로 한 바퀴**다. 홈의 30분 카운트다운은 이미 벽시계에 맞춘 뽀모도로 시계와 같다. 다른 타이머 앱은 "언제 시작해도 25분"이지만, LEFT30은 칸 경계에 맞추면 기록과 타이머가 따로 놀지 않는다.

## 0A. 전제 점검
- **진짜 문제(추정, 확인 필요):** 공부하거나 일할 때 "지금 집중하는 시간"을 눈으로 보고 싶다. 지금 집중 블록은 끝 시각을 미리 정해야 하고, 몇 분 했는지(카운트업)나 쉬는 리듬(뽀모도로)은 보여 주지 않는다.
- **아무것도 안 할 때 비용:** 공부할 때는 다른 타이머 앱을 따로 켜고, LEFT30은 30분마다 묻기만 한다. 같은 시간을 두 앱에 두 번 기록한다.
- **위험 1, 정체성:** 공부 타이머가 홈의 주인공이 되면 앱이 "30분마다 하루를 기록하는 앱"에서 "공부 타이머"로 바뀐다. 그쪽은 열품타·Forest와 정면으로 겨룬다.
- **위험 2, 검증:** 2주 테스트는 아직 시작 전이다. 타이머가 들어가면 S1·S2가 무엇의 효과인지 섞인다(스트릭 E4를 미룬 것과 같은 이유).
- **위험 3, 데이터 단위:** 스톱워치는 분 단위인데 기록은 30분 칸 단위다. 43분 공부를 칸으로 어떻게 남길지 정해야 한다.

## 0B. 기존 코드 활용
| 하위 문제 | 재사용할 코드 | 비고 |
|---|---|---|
| 타이머 동안 알림 생략 | 집중 블록 `block` 테이블, `activeBlock`·`extendBlock`·`endFocusNow` (`application/record/blockLogic.ts`), 스케줄러의 블록 건너뛰기 | 뽀모도로·스톱워치 모두 "블록의 한 종류"로 둘 수 있다 |
| 시작 화면 | `FocusStartSheet.tsx`(카테고리 → 길이 두 번 탭) | 길이 단계에 모드 선택을 넣을 수 있다 |
| 진행 표시 | `FocusStatus.tsx`, `components/timer/timer` | 30분 카운트다운 아래 블록 정보 |
| 끝 확인 | 블록 끝 시트(A안), 끝 알림 | 스톱워치는 끝이 사용자 행동이라 끝 시트가 필요 없을 수 있다 |
| 칸 채우기 | `saveSlots`(한 트랜잭션), source `declared` | |
| 휴식 알림 | 로컬 알림 예약(`expoNotifier`) | 뽀모도로 :25 휴식, :00 다시 시작 |

## 0C. 꿈의 상태
```
  지금                          이 계획                          12개월 이상
  30분마다 묻는다.              집중할 때는 타이머가 곧 기록.     앱을 켜면 지금 하는 일이
  집중은 끝 시각을 정해야       뽀모도로 한 바퀴 = 칸 하나.       타이머로 보이고, 끝나면
  하고, 몇 분 했는지 안 보임.   스톱워치를 멈추면 칸이 채워짐.    하루 칸이 저절로 채워짐.
                                고양이가 리듬을 보여 줌.           묻는 일은 빈 시간에만.
```

## 0E. 모드
SCOPE REDUCTION (2026-11-16, 사용자 선택, 권장안). 근거: 예상 변경 파일 약 35개(추정, 앱 record·db·scheduler·components + 서버 Entity·migration·sync). 결정 D1~D8은 유지하고 단계만 나눈다.

## 0G. 1단계(W1) 최소 범위 (제안)
1. 기록 단위를 시각 구간으로 바꾼다(앱 SQLite). 기존 30분 칸은 구간으로 옮긴다.
2. 30분 알림 답 = "지난 30분 중 아직 기록 안 된 부분" 구간. 알림 버튼 [그대로 계속]도 같은 규칙.
3. 홈 세 버튼 [스톱워치] [뽀모도로] [타이머] → 카테고리 → 시작. 큰 숫자는 지금 도는 타이머. 도는 동안 30분 알림 끔.
4. 뽀모도로 25+5, :25 휴식 알림, 다음 바퀴 시작 알림. 휴식은 구간 안에 표시(BREAK A).
5. 스톱워치 오래 진행 확인(FORGOT B).
6. "공부" 카테고리(7번째).
7. 시간표를 구간 타임라인으로 그린다. 계획 대비 실제를 분 단위로 계산한다.
8. 놓친 30분 알림 시간 묶어 채우기(GAP). 구간 데이터에 과목 칸만(SUBJ).

2단계(W2, 테스터 모집 전): 과목 고르기·만들기·합계 화면(SUBJ), 서버 마이그레이션과 구간 동기화(SYNC), 일상(release) 빌드.

## 결정 장부
| ID·소유 | 계약과 근거 | 현재 | 제안 | 상태 | 승인과 범위 |
|---|---|---|---|---|---|
| DIR (방향) | 0A 위험 1·3 | 30분 핑이 중심, 집중 블록은 끝 시각 고정 | **B': 공부 타이머 쪽으로 정체성을 옮기되 30분 알림이 핵심 장치로 남는다.** 뽀모도로·스톱워치가 홈에서 눈에 띄는 기능이 되고, 타이머가 도는 동안 30분 알림은 쉬고, 타이머가 끝나면 다시 묻는다(끝난 뒤 다시 켜는 방식은 RESUME 행으로 바뀜) | approved | D1 답 "b 방향이지만 30분알림이 메인으로" (2026-11-16). 함의: 대상이 공부하는 사람 쪽으로 기울고, 테스터 모집과 검증 기준을 다시 봐야 한다(VAL 행에서 다룸) |
| POMO (뽀모도로 리듬) | DIR, Layer 3(25+5=30) | 없음 | **B 누른 순간부터 25분 집중 + 5분 휴식.** 뽀모도로·스톱워치가 도는 동안 30분 알림은 끈다(집중 블록과 같은 방식). **2026-11-17 디자인 리뷰 추가:** 구간은 계정 관리 "뽀모도로: 25/5 · 40/10 · 50/10 · 직접"에서 바꾼다(직접: 집중 5~90분 5분 단위, 휴식 1~30분 1분 단위, 기본 25/5, 바꾼 값은 다음 시작부터). 바퀴 수는 시작 때 카테고리 다음 같은 시트에서 +/-로 고르고(기본은 지난번 값, 처음 4), 마지막 바퀴가 끝나면 끝 알림 + 알림 재개 질문 | approved | D2 답 "b가 맞고, 뽀모도로, 타이머 들어가는 경우에는 30분 알람은 비활성화" (2026-11-16). Layer 3 칸 맞춤안(A)은 쓰지 않는다. 그래서 타이머 시간과 30분 칸이 어긋나며, 칸으로 바꾸는 규칙이 필요하다(SLOT 행) |
| SLOT → TIMELINE (기록 단위) | POMO, 0A 위험 3 | 하루 = 48개의 30분 칸. `slot` UNIQUE(user_id, slot_start)(설계서 접근법 B) | 칸을 채우는 규칙(A 15분 이상 / B 겹치면 / C 묻기)은 모두 버린다. **기록은 시각 구간(시작~끝, 분 단위)이다. 30분 길이는 30분 알림에 답했을 때만 생긴다.** 타이머는 실제 시작~끝 그대로 남는다. 시간표도 30분 칸 격자가 아니라 구간 타임라인으로 다시 설계한다 | approved | D3 답 "시간표 칸도 재설계해야해. 30분 단위는 이제 없어. 30분알람을 눌렀을때만 있는거야." (2026-11-16). 따라 나오는 기본 규칙(OVERLAP 행 D12로 확정): 30분 알림에 답하면 "지난 30분 중 아직 기록 안 된 부분"만 채운다. 예: 타이머가 15:47에 끝나고 16:00 알림에 답하면 15:47–16:00(13분). 겹치면 타이머 구간이 우선한다. **설계서 접근법 B(슬롯 중심 스키마)의 핵심을 뒤집는 결정**이다. 저장 방식(구간 테이블, 기존 `slot`·`block` 이전, 서버 마이그레이션, 동기화)은 /plan-eng-review 소유. 계획 대비 실제·S1 집계·놓친 칸 채우기·시간표가 모두 영향 받는다 |
| VAL (검증 시기) | 설계서:314-320 S1~S3, 테스터 5명 미모집, 일상 APK 11-10판 | 재출시 빌드로 2주 검증 | A 지금 빌드로 테스터 검증 먼저 / B 재설계 뒤 검증 / **C 창업자만 지금 빌드(일상 APK)를 매일 쓰며 S3 알림 신뢰성을 확인하고, 테스터 5명은 재설계 뒤 공부하는 사람 위주로 모집** | approved | D4 답 "C. 창업자 먼저, 테스터는 뒤 (recommended)" (2026-11-16). S1·S2 판정은 재설계 빌드로 미룬다 |
| HOME (홈 화면과 시작) | FocusStatus.tsx, FocusStartSheet.tsx(두 번 탭) | 큰 숫자 = 다음 알림까지. [집중] → 카테고리 → 길이 | **B 홈에 세 버튼 나란히: 큰 숫자 아래 [스톱워치] [뽀모도로] [타이머(시간 정하기, 기존 집중 블록)]. 누르면 카테고리만 고르고 시작.** 켜져 있는 동안 큰 숫자는 그 타이머(스톱워치 경과, 뽀모도로 남은 시간, 타이머 남은 시간)를 보여 주고 30분 알림은 꺼진다 | approved | D5 답 "B. 홈에 세 버튼 나란히" (2026-11-16). 권장 A(한 버튼)를 고르지 않음. 고양이 방 영역과 자리 배분은 /plan-design-review와 design/cat 1단계에서 |
| CAT (공부 카테고리) | `CATEGORY_LABEL` 6개(업무·휴식·관계·운동·자기개발·수면), 서버 CHECK | 공부 카테고리 없음 | **C "공부"를 7번째 카테고리로 추가 + 과목 태그.** 타이머 시작 때 과목을 고르거나 새로 만들고, 과목별 합계를 보여 준다 | approved | D6 답 "C. '공부' + 과목 태그" (2026-11-16). 권장 B를 고르지 않음. 과목을 공부에만 둘지 모든 카테고리의 하위 태그로 둘지, 과목 관리 화면은 SUBJ 행과 디자인 리뷰에서 |
| SUBJ (과목 단계) | CAT C, 0G | 없음 | **B 구간 데이터에 과목 칸(subject)만 1단계에 두고, 과목 고르기·만들기·합계 화면은 2단계(테스터 모집 전)** | approved | D9 답 "B. 데이터만 1단계, 화면은 2단계 (recommended)" (2026-11-16) |
| GAP (놓친 시간 채우기) | 기존 `batchLogic.ts`(칸 2~10개 묶음) | 칸 단위 묶어 채우기 | **1단계에 둔다. 단, 대상은 놓친 30분 알림의 시간뿐이다.** 타이머·뽀모도로는 실제 시작~끝이 기록되므로 빈 시간을 만들지 않는다. 시트("13:00–18:00 비어 있어요")는 그대로, 찾는 대상만 "답하지 않은 알림 구간"으로 바꾼다. 타이머 끝과 다음 알림 사이(예: 15:47–16:00)는 다음 알림 답이 채운다 | approved | D10 답 "이건 30분 알림 기능일때만, 타이머와 뽀모도로는 안해도 되는거 아닌가" (2026-11-16). 사용자 지적이 맞아 범위를 놓친 알림으로 좁혀 1단계에 둔다 |
| SYNC (서버 동기화 시기) | 서버 `slot`·`block` 엔티티와 `/sync/*`, Neon 운영 DB, 일상 APK(옛 판)는 계속 slot을 올림 | slot 동기화 | **B 1단계는 개발 앱 로컬만(구간 동기화 끔), 서버 마이그레이션·동기화는 2단계에 과목과 함께 한 번에** | approved | D11 답 "B. 1단계는 로컬, 서버는 2단계 (recommended)" (2026-11-16). 감수: 개발 앱을 지우면 1단계 기록이 사라진다. 일상 APK(옛 판)의 slot 동기화와 운영 서버는 그대로 둔다 |
| OVERLAP (알림 답과 타이머가 겹칠 때) | TIMELINE 행의 "확인 필요" 기본 규칙, Section 4 | 칸은 하나에 하나(UNIQUE) | **A 알림 답은 지난 30분 중 아직 기록 없는 부분만 채운다. 타이머 구간이 우선이다. 알림 문구도 빈 부분 기준("15:47 이후 뭐 했어?")** | approved | D12 답 "A. 빈 부분만 채움, 타이머 우선 (recommended)" (2026-11-16). TIMELINE 행의 "확인 필요" 기본 규칙을 확정한다. 빈 부분이 없으면(지난 30분이 모두 타이머) 그 알림은 예약하지 않는다(타이머 중 알림 끔과 같은 결과) |
| BREAK (뽀모도로 휴식 기록) | POMO, TIMELINE | 없음 | **A 시간표·계획 대비 실제에는 휴식 포함 한 덩어리, 과목 합계와 타이머 화면에는 집중한 분만** | approved(임시) | D7 답 "나중에 더 좋은 방식 생각하고 일단 a" (2026-11-16). 실사용 뒤 다시 본다. 구현은 휴식 구간을 데이터로 남겨(집중/휴식 분 구분) 나중에 표시만 바꿀 수 있게 한다 |
| FORGOT (스톱워치 끄는 걸 잊음) | POMO(타이머 중 알림 꺼짐) | 없음. 집중 블록은 끝 시각이 있어 끝 시트가 온다 | **B 제한 없이 계속. 앱을 열면 오래 진행 중일 때 "6시간째 진행 중, 끝난 시각을 고칠까요?"로 확인하고 끝 시각을 고칠 수 있다** | approved | D8 답 "B. 제한 없이, 앱 열 때 확인" (2026-11-16). 기준 3시간, [계속]을 누르면 그 세션에서는 다시 묻지 않음(디자인 리뷰 D11, 2026-11-17). 권장 A(2시간마다 확인)를 고르지 않음. 남는 위험: 켜 둔 채 잠들면 그동안 30분 알림이 꺼져 있다. "오래"의 기준(예: 3시간)과 확인 화면은 디자인 리뷰에서 |
| CONTROL (정지·일시정지) | HOME, Section 11([멈추기]만 있었음) | 홈 [멈추기] 하나. 일시정지 없음 | **스톱워치·뽀모도로·타이머 모두 [일시정지]와 [정지]를 필수 기능으로 1단계에 둔다.** 정지는 기존 [멈추기]와 같다(카테고리는 시작 때 골랐으므로 끝에 묻지 않음, [타이머]가 정한 끝 시각에 닿으면 기존 끝 시트 A안). 일시정지하면 큰 숫자가 멈추고 아래에 작게 "일시정지 중". 뽀모도로는 남은 집중/휴식 시간을 얼렸다가 이어서 센다(신호 예약을 다시 계산). **2026-11-17 디자인 리뷰:** 일시정지 중 숫자는 흐리게 멈추고 버튼은 [재개](강조색) [정지], 깜빡임 없음(D7). [정지]는 확인 창 없이 바로 정지하고 아래에 "공부 1시간 23분 기록함 · 정지 취소"를 5초 띄운다. 정지 취소는 세션을 이어 간다(D8, 사용자 "되돌리기라고 안하고 정지취소 같은 단어로"). 알림 재개 질문은 그 줄이 사라진 뒤 | approved | 사용자 "뽀모도로나 스톱워치에서 일시정지 및 정지는 필수기능일것같은데?" (2026-11-16). CEO 리뷰에서 빠졌던 항목 |
| PAUSE (일시정지 시간표 표시) | CONTROL, BREAK, TIMELINE | 없음 | **멈춘 길이로 나눈다. 1분 미만: 그리지 않음. 1~5분: 덩어리 안에 블록보다 약간 옅은 색으로 칠함(뽀모도로 휴식과 같은 표시, 빗금 아님, 2026-11-17 D13 답 "빗금 말고 블록보다 약간 옅은 색으로 색칠"). 5분 이상: 빈 틈으로 두고 앞뒤 조각을 얇은 점선으로 이어 한 세션임을 보인다. 뒤 조각에는 범주명을 반복하지 않는다.** 큰 숫자·과목 합계·계획 대비 실제의 공부 분은 멈춘 시간을 길이와 상관없이 모두 뺀다. 5분 이상 틈은 30분 알림 답이나 직접 기록으로 채울 수 있다 | approved | 사용자 "짧은 5분미만은 b안으로 5분 이상이면 a안으로" (2026-11-16), 1분 미만 생략은 제안 수용. 1분·5분은 첫 값, 실기기에서 조정. 저장: 세션 하나 = 조각 entry 여러 개(같은 `session_id`). 일시정지는 조각을 끝내고 재개는 새 조각을 만든다. 시간표가 5분 미만 사이를 한 덩어리로 그린다 |
| NOTIF (진행 중 고정 알림) | expo-notifications(숫자가 가는 시계 미지원) | 없음 | **타이머가 도는 동안 고정 알림 한 줄: 스톱워치는 지난 시간, 타이머·뽀모도로는 남은 시간("집중 · 12:34"). 시스템 크로노미터(`setUsesChronometer`, 남은 시간은 `setChronometerCountDown`)로 숫자를 넘겨 1초 갱신을 하지 않는다. 버튼은 [일시정지]/[재개] 하나만. 정지는 앱에서 한다(2026-11-17 디자인 리뷰 D12 답 "버튼은 일시정지만", 알림창에는 정지 취소가 없어서).** 문구: "공부 · 스톱워치 1:23:05", "공부 · 집중 2바퀴째 18:30 남음", 일시정지 중에는 멈춘 숫자 뽀모도로 단계 전환 때 알림을 바꾼다(앱이 꺼져 있으면 단계 신호 알림이 대신 알린다) | approved | 사용자 "알림창에 남은시간 or 지난시간 보여줬으면", "같이 적어줘" (2026-11-16). 구현: 의존성 없는 작은 Kotlin 네이티브 모듈 권장(대안 notifee는 유지 상태 확인 필요). 버튼은 앱이 꺼져 있어도 기록을 끝내야 하므로 알림 재개 질문(RESUME)은 앱을 열 때 보인다. 안드로이드 14부터 사용자가 밀어 지울 수 있음(타이머는 계속) |
| RESUME (타이머 뒤 30분 알림) | DIR("타이머가 끝나면 다시 묻는다"), 일시정지 15분 재개안 | 정지하면 바로 30분 알림 재예약 | **임시: 자동으로 다시 켜지 않는다. 타이머·뽀모도로를 정지하면 "30분 알림 다시 켤까요?" [예]/[아니오]를 묻는다. 일시정지 중에는 길이와 상관없이 알림을 쉰다(15분 뒤 다시 울림 안은 쓰지 않음)** | approved(임시, 숙제) | 사용자 "자동적으로 적용하는 것에 대해서는 좀 고민 해봐야할 것같아. 숙제로 남겨두고 일단 적용하지 않는 걸로", 질문 답 "일단 3번 하고 다시켤까요에 예, 아니오 선택" (2026-11-16). [아니오]의 뒤(언제 다시 켜지나)는 숙제: 개발 기본값은 계정 관리 "알림" 스위치(D25)를 "다시 켤 때까지"로 끈 것과 같은 상태. 답하지 않고 앱을 닫으면 꺼진 채로 둔다. **추가: 질문 아래 작은 체크 칸 "다시 묻지 않기".** 체크하고 [예]나 [아니오]를 누르면 그 답을 기억해 다음부터 묻지 않고 같은 답을 적용한다. 바꾸려면 계정 관리의 설정 한 줄 "타이머 뒤 30분 알림: 매번 묻기 / 항상 켜기 / 항상 끄기"에서 고친다(기본 매번 묻기). 사용자 "다시묻지 않기 체크하면 상태 유지. 해제하고 싶으면 설정에서 다시 조정" (2026-11-16). 설정은 로컬 저장(W1), 서버 동기화는 W2에서 판단 |

Approval readiness: PASS — DIR(D1), POMO(D2), TIMELINE(D3), VAL(D4), HOME(D5), CAT(D6), BREAK(D7 임시), FORGOT(D8), SUBJ(D9), GAP(D10, 사용자 지적으로 범위 좁힘), SYNC(D11), OVERLAP(D12). eng 리뷰 뒤 추가(2026-11-16 사용자 대화): CONTROL, PAUSE, NOTIF, RESUME(임시). 모드는 0E 사용자 선택(SCOPE REDUCTION). 승인 없이 본문에 들어간 변경 없음. 저장 방식·마이그레이션 세부는 /plan-eng-review, 화면 세부는 /plan-design-review 소유로 남긴다.

## 리뷰 깊이
strategy-only(능력 단위). 기록 단위가 바뀌는 큰 결정이라, 테이블·메서드 계약은 /plan-eng-review에서 정한다. 아래 표의 "구현 담당이 증명할 것"이 그 입력이다.

## Section 1: 아키텍처
```
  지금                                         1단계(W1, 개발 앱 로컬)
  [30분 알림] --답--> [slot 48칸/일]           [30분 알림] --답(빈 부분만)--> [구간 기록]
  [집중] --> [block] --칸으로 펼침--> slot        ^ 쉼/재개                     start~end(분), category,
                                                [타이머 3종] --시작·끝-------->  kind(ping/stopwatch/
  시간표: 칸 격자                                스톱워치·뽀모도로·타이머        pomodoro/timer),
  계획 대비 실제: 칸 x 30분                                                      subject(빈칸), 집중/휴식 분
  서버: slot·block 동기화                       시간표: 타임라인 / 계획 대비 실제: 분 / 놓친 알림 묶음 / S1
                                                서버: 변경 없음, 개발 앱은 구간 동기화 끔(W2에서 연결)
```
- 상태(타이머는 동시에 하나): `없음 -> 진행 -> (뽀모도로: 집중 <-> 휴식) -> 끝`. 진행 중에는 다른 타이머 버튼을 막는다. 끝난 타이머는 다시 진행으로 가지 않는다.
- 결합: 스케줄러가 "타이머 진행 중"을 알아야 알림을 쉰다. 지금 블록 건너뛰기(`application/record/blockLogic.ts:24`)와 같은 자리다.
- 되돌리기: 1단계는 개발 앱 로컬이라 운영 영향이 없다. 로컬 이전은 한 방향이므로 기존 `slot` 테이블은 2단계 서버 이전 전까지 지우지 않는다.
- **WARNING** 설계서 접근법 B(`docs/designs/left30-relaunch.md:62`, `UNIQUE(user_id, slot_start)`)를 뒤집는다. 사용자 결정(D3)이므로 진행하되 설계서 본문을 2단계 전에 고친다(Section 10).

## Section 2: 오류와 복구 (능력 단위)
| 능력 | 무엇이 잘못될 수 있나 | 사용자가 보는 것 | 지금 안전장치 | 구현 담당이 증명할 것 |
|---|---|---|---|---|
| 타이머 진행 | 앱이 꺼지거나 폰 재시작 | 다시 열면 타이머가 사라짐 **GAP** | 없음 | 시작 시각을 DB에 먼저 쓰고, 화면은 DB에서 다시 계산 |
| 뽀모도로 휴식·재개 알림 | 정확한 알람 권한 없음, OS가 미룸 | 휴식 알림이 늦게 옴 | 30분 알림과 같은 예약 경로 | 권한 없을 때 홈 한 줄 안내(S3 기준과 같게) |
| 알림 쉬기·재개 | 타이머가 끝났는데 재예약 실패 | 그 뒤로 30분 알림이 안 옴 **CRITICAL** | 기존 reschedule | 타이머 끝·앱 열기·부팅 때마다 재예약, 실패 로그 |
| 알림 답(빈 부분만) | 빈 부분 계산 중 타이머 기록과 겹침 | 기록이 사라짐 | OVERLAP 규칙 | 한 트랜잭션에서 겹침 확인 후 저장 |
| 로컬 이전(slot -> 구간) | 중간 실패 | 시간표가 비거나 중복 | 없음 | 한 트랜잭션, 이전 전후 합계 비교, 실패 시 옛 테이블로 계속 |
| 스톱워치 오래 진행 | 잊고 잠듦 | 공부 9시간, 밤새 알림 없음 | FORGOT B(앱 열 때 확인) | 끝 시각 고치기, 고친 뒤 알림 재예약 |

## Section 3: 보안
1단계는 서버 변경이 없어 새 공격 면이 없다. 과목 이름은 사용자 입력이므로 2단계 서버에서 길이·빈 문자열 검증을 동기화 항목 검증(R3)과 같은 방식으로 넣는다. W1은 No issues found.

## Section 4: 데이터 흐름과 경계 사례
```
  타이머 시작 -> DB (kind, category, start) -> 알림 쉼
  타이머 끝   -> DB end, (뽀모도로) 집중/휴식 분 -> 알림 재예약 -> 시간표·합계
  알림 답     -> 지난 30분 - 이미 기록된 구간 = 빈 부분 -> 저장(빈 부분 없으면 저장 없음)
```
| 상황 | 처리 | 상태 |
|---|---|---|
| 타이머 버튼 두 번 탭 | 진행 중이면 두 번째는 무시 | 구현 담당 증명 |
| 1분 미만에 멈춤 | 기록하지 않음 | 제안, 디자인 리뷰 확인 |
| 자정을 넘는 스톱워치 | 구간 하나, 날짜별 합계는 자정에서 나눠 셈 | 구현 담당 증명 |
| 타이머 중 방해금지 시작 | 타이머 계속, 알림은 원래 쉼 | OK |
| 알림 일시 중지(D25)와 타이머가 겹침 | 먼저 끝난 쪽이 알림을 다시 켜면 안 됨 | 구현 담당 증명(쉬는 이유 목록) |
| 뽀모도로 휴식 중 멈춤 | 그 시각에 끝, 휴식 분까지 기록 | OK(BREAK A) |
| 시간대 이동 | 구간은 UTC 저장, 표시만 현지 | 기존 원칙 유지 |

## Section 5: 코드 품질
- 재사용: 블록 건너뛰기, `saveSlots` 트랜잭션 패턴, 끝 시트(A안), 알림 버튼 작업(`continueTask`). 기존 "집중"은 [타이머]가 된다. 블록을 "구간 기록의 한 종류"로 합치는 안을 eng 리뷰 1순위 안으로 둔다.
- 과한 설계 경계: 1단계에서 과목 관리 코드는 만들지 않는다(데이터 칸만).

## Section 6: 테스트
기존 방식대로 `node:sqlite` 실제 DB 로직 테스트. 1단계 필수:
| 동작 | 확인할 것 | 거부하는 틀린 결과 |
|---|---|---|
| 빈 부분 계산 | 15:00-15:47 타이머 뒤 16:00 답 -> 15:47-16:00만 | 15:30-16:00 전체 저장 |
| 알림 쉼·재개 | 타이머 중 예약 0, 끝나면 다음 :00/:30 예약 | 끝난 뒤 예약 없음 |
| 뽀모도로 분 | 4바퀴 -> 시간표 120분, 집중 100분 | 휴식이 과목 합계에 섞임 |
| 이전 | 이전 전후 카테고리별 분 합계 같음 | 칸 누락·중복 |
| 놓친 알림 묶음 | 타이머 구간은 빈 시간으로 안 잡힘 | 타이머 시간을 비었다고 물음 |
| 앱 재시작 | 진행 중 타이머 복원 | 타이머 사라짐 |
실기기: 정확한 알람 꺼진 상태에서 뽀모도로 알림 지연 확인.

## Section 7: 성능
하루 구간 수는 수십 개라 문제 없다. 시간표·합계는 시작 시각 범위 조회 하나. No issues found.

## Section 8: 관측
- 이벤트(로컬, 2단계에 서버로): `timer_started {kind, category}`, `timer_ended {kind, minutes, focus_minutes}`, `stopwatch_long_confirmed {hours, edited}`, `ping_answered`에 `minutes` 추가.
- S1-COUNT: 타이머 시작·끝도 "답한 행동"으로 센다(집중 블록 시작과 같은 취급). S3 분모에서 타이머 시간은 일시 중지처럼 뺀다.

## Section 9: 배포
1단계: 개발 빌드만, 서버 무변경, 새 네이티브 모듈 없음(예정). 2단계: 서버에 새 구간 테이블을 추가하고 옛 slot은 유지해 옛 일상 APK와 같이 돌게 한 뒤 release 빌드. 옛 테이블 삭제는 테스터 전원이 새 빌드로 옮긴 뒤.

## Section 10: 장기 방향
- 되돌리기 어려움 2/5(2단계 서버 이전 뒤에는 한 방향).
- 문서 부채: 설계서(접근법 B, 칸 기준 S1·계획 대비 실제·시간표 문구)와 `left30-visual.md` 3절(고양이 상태 "집중 블록 진행 중")을 2단계 전에 고친다.
- 위험: 공부하는 사람이 대상이면 열품타·Forest·Study Kitty와 겹친다. LEFT30만의 것은 "공부 밖 시간까지 30분 알림으로 하루 전체가 보인다"이다. 테스터 모집 문구에 이걸 쓴다.

## Section 11: 디자인과 UX
```
  홈(평소)                        홈(타이머 중)                  다시 열기(오래 진행)
   12:41  다음 알림까지             1:23:05  공부 · 스톱워치        "6시간째 진행 중"
  [스톱워치][뽀모도로][타이머]     [멈추기]  (알림 쉼)              [지금 끝] [끝난 시각 고치기]
       | 탭                              | 멈추기
       v                                 v
  카테고리(7개) 고르면 시작         시간표에 구간, 합계 갱신, 알림 재개
```
| 기능 | 빈 상태 | 진행 | 오류 | 완료 |
|---|---|---|---|---|
| 홈 타이머 | 세 버튼 | 큰 숫자 = 타이머 | 알림 권한 없음 한 줄 | 조용히 시간표 반영 |
| 시간표 타임라인 | 오늘 첫 기록 기다림 | 진행 중 구간은 지금까지 | 이전 실패 시 옛 칸 표시 | 구간 블록 |
| 뽀모도로 | - | 집중/휴식, 바퀴 수 | 알림 지연 | 멈추면 끝 |
- (추가, CONTROL·RESUME) 위 그림의 "홈(타이머 중)"은 [멈추기] 대신 [일시정지] [정지]. 정지 뒤 "알림 재개"는 자동이 아니라 "30분 알림 다시 켤까요?" [예]/[아니오] + 작은 체크 칸 "다시 묻지 않기". 계정 관리에 "타이머 뒤 30분 알림" 설정 한 줄.
- 정할 것(디자인 리뷰): 일시정지·정지 버튼 배치와 "일시정지 중" 표시, 고정 알림 문구, 알림 재개 질문의 모양(시트/한 줄), 뽀모도로 끝내기(멈추기만 / N바퀴 뒤 자동), 스톱워치 "오래"의 기준, 7색, 세 버튼과 고양이 방 배치, 접근성(버튼 44pt 이상, 큰 숫자 글자 크기 상한).
- 권장: 구현 전에 /plan-design-review로 홈과 시간표 타임라인을 본다.

### 디자인 리뷰 진행 상태 (2026-11-16, 멈춤: 배경 그림 대기)
화면 디자인의 원칙·결정·정할 것은 `left30-visual.md`(고양이·수채화 문서를 합친 것)가 정본이다. 이 절은 리뷰 경과와 배경 요청 조건만 둔다.
/plan-design-review를 범위 "시간표·홈 타이머"(D1)로 시작했다. 시작 점수 4/10. Pass 1 첫 질문에서 사용자가 방향을 바꿔 시안 비교로 넘어갔다. 이미지 생성 키가 없어 브라우저 HTML 시안으로 비교했다(`~/.gstack/projects/wonseokjee-LEFT30_APP/designs/home-timer-20261116/`의 `mockup.html`, `home-room.html` A~C, `home-room-2.html` D~G).

정한 방향(사용자 답):
- **기존 화면을 완전히 새로 만든다.** 검은 바탕을 버리고 밝은 바탕 + 다크 모드를 넣는다(D2 답 "기존을 완전히 갈아 엎을거야. 검은 배경도 아니고, 다크모드 도입할거야").
- **수채화 질감은 고양이만이 아니라 앱 전체에 쓴다.** 화면 디자인 문서(`left30-visual.md`, 옛 `left30-watercolor.md`) P4 "수채화는 그림이 맡는다"를 뒤집는다(D4 답 "이전에 적은 고양이만 수채화질감은 아니야"). 그 문서의 P1 품종 중립, P2 색 축약, P3 카테고리는 이름으로 구분은 바뀌었다는 말이 없어 유지로 본다.
- **홈 배경은 고양이 방이다.** 타이머 숫자는 방 안의 구조물이 되고, 나중에 고양이가 그 위로 올라가는 등의 모션을 넣는다(모션은 나중).
- 시안 방향 평가: "지금 디자인 아주 좋고 내가 원하는 방향"(D4 답, home-room.html A~C).

정하지 않은 것(멈춤):
- 홈 배치 A~G(숫자 블록, 벽 선반, 창가, 공부 책상, 계단 숫자, 상자, 숫자 쿠션). 사용자: "딱 정하지 말고, 일단 고양이 제외하고 배경부터 만들어보자"(D5 답).
- 배경 그림: HTML 수채화가 고양이 그림과 이질감이 있어 사용자가 직접 만들어 온다. 받으면 그 배경 위에서 배치·숫자 구조물·버튼·"오늘 지금까지" 자리를 다시 비교한다.
- 시간표 타임라인, 일시정지·정지 버튼 모양, 고정 알림 문구, 색 값: 배경이 정해진 뒤.

#### 배경 그림 요청 조건 (사용자가 Codex로 제작)
숫자·버튼·고양이를 그 위에 얹을 수 있도록 맞출 조건이다.

| 항목 | 조건 |
|---|---|
| 화풍 | 고양이 그림(`docs/designs/cat/calico_cat_*.png`, design/cat-image)과 같은 동화책 수채화. 끊어지는 따뜻한 갈색 윤곽, 고운 종이결, 겹친 반투명 물감. 고양이보다 채도·대비를 낮춰 고양이가 앞에 보이게 한다 |
| 고양이 | 넣지 않는다 |
| 크기 | 세로 9:19 안팎(예: 1080×2280). 위 약 8%(날짜·메뉴)와 아래 약 10%(탭)는 조용하게 둔다 |
| 구도 | 벽과 바닥이 있는 방. 바닥선은 높이의 55~60%. 가운데는 숫자 구조물 자리로 비운다 |
| 낮/밤 | 구도가 같은 두 장. 밤 그림이 다크 모드 |
| 가구 | 가능하면 상자·책상·계단 받침 등을 투명 배경 PNG로 따로 만든다. 고양이를 가구 앞·뒤에 끼우는 레이어 구조(`left30-visual.md` 9.2 Item의 back/front)를 위해서다 |

받은 뒤 할 일: 배경 위에 홈 배치 A~G를 다시 얹어 비교 → 배치 확정 → 시간표·버튼·색 값 → 디자인 리뷰 Pass 1~7 이어서.

**받음(2026-11-16):** 단색 벽·바닥 + 종이결, 1024×1536, 바닥선 약 63%. 위 조건 중 "수채화", "9:19", "바닥선 55~60%"는 받은 그림으로 대신한다. 남은 그림은 `left30-visual.md` 5.1 에셋 주문서.

### 디자인 리뷰 재개 (2026-11-17)
그림과 상관없는 것부터 정하고(회색 뼈대 시안 `wireframe-states.html`), 배경을 받은 뒤 그 위에서 홈 배치를 정했다(`home-real-bg.html`). 모두 같은 폴더(`~/.gstack/projects/wonseokjee-LEFT30_APP/designs/home-timer-20261116/`).

| # | 질문 | 답 | 반영 |
|---|---|---|---|
| D6 | 진행 중 홈에 남길 것 | 숫자·라벨·버튼 2개만. 세 버튼과 오늘 지금까지는 숨김 | visual 4.1 |
| D7 | 일시정지 표시 | 숫자 흐리게 멈춤 + "일시정지 중", [재개] [정지] | CONTROL |
| D8 | 정지 실수 | 바로 정지 + 5초 "정지 취소" | CONTROL |
| D9 | 알림 재개 질문 모양 | 작은 아래 시트, "켜면 16:00부터 다시 물어요" 한 줄 | RESUME |
| D10·D14 | 뽀모도로 끝 | 시작 때 바퀴 수를 +/-로 고름 | POMO |
| D11 | 오래 진행 기준 | 3시간 | FORGOT |
| D12 | 고정 알림 | 버튼은 일시정지/재개만 | NOTIF |
| D13 | 시간표 짧은 멈춤 | 빗금 대신 약간 옅은 색 | PAUSE |
| D15 | 다크 모드 | 폰 설정 + 앱 안 선택 | visual 2.4 |
| D16·D24 | 그림 위 글자 | 종이 판 없이 계산한 색 규칙 | visual 6절 |
| D17 | 글꼴 | 미정(그림 받고 정함 → 이제 정할 수 있음) | visual 11절 6a |
| D18 | 뽀모도로 구간 설정 | 25/5 · 40/10 · 50/10 · 직접(집중 5~90, 휴식 1~30) | POMO |
| D19 | 접근성 | 48dp, 큰 숫자 1.3배 상한, 화면 읽기 "1시간 23분 지남", 움직임 줄이기는 폰 설정 따름(앱 설정 없음) | visual 2.3 |
| D20 | DESIGN.md | 만들지 않고 left30-visual.md에 | visual 7절 |
| D21·D25 | 에셋 주문서 | 받은 그림을 보고 고친 안 그대로 | visual 5.1 |
| D22 | 홈 배치 | 벽 선반 | visual 4.1 |
| D23 | 질감 | 바탕·UI 단색 + 종이결, 고양이·가구만 수채 | visual P4 |
| D26 | 시간표 열 | 어제·오늘 두 열 유지, 블록 안에는 이름만 | visual 4.3a |
| D27 | 계획 표시 | 기록 없는 곳에만 점선 상자 | visual 4.3a |
| D28 | 짧은 블록 | 15분 미만은 이름 없음 | visual 4.3a |
| D29 | 빈 곳 누름 | 시작·끝을 먼저 고름(처음 값 = 빈 구간 전체) | visual 4.3a, TIMELINE |
| D30 | 읽기 실패 | 그 자리에 한 줄 + [다시 시도] | visual 4.3b |
| D31 | 버튼 실패 | 화면 그대로 + 아래 짧은 알림 2초 | visual 4.3b |
| D32 | 불러오는 중 | 그리지 않음, 1초 넘으면 뼈대 | visual 4.3b |
| D33 | 기록 없는 시간표 | 아무 문구 없음 | visual 4.3b |
| D34 | 작은 화면 | 오늘 지금까지가 다 안 들어가면 통째로 뺌 → D36으로 바뀜 | visual 4.3c |
| D35 | 외 n개 | 쓰지 않음 | visual 4.3c |
| D36 | 오늘 지금까지 위치 | 날짜 아래 벽 위쪽, 막대 최대 두 줄(덜 한 시간이 큰 순서) | visual 4.1, 4.3c |

남은 것: 글꼴(D17), 강조색 최종값. 둘 다 방 스타일(수채 가구)을 받은 뒤 함께 정한다.

## Outside Voice
실행하지 않음. 사용자가 2026-11-16 Codex를 대신 돌리는 것을 거절한 적이 있고, 하위 에이전트 생성을 요청받지 않았다. 외부 검토 범위 없음(clean 아님).

## TODO 처리
새 TODO 없음. 2단계 항목(과목 화면, 서버 동기화)은 이 계획 범위로 남는다(미룸 아님). eng·디자인 리뷰 소유 항목은 보고서의 미해결 목록에 둔다.

## NOT in scope
- 칸 맞춤 뽀모도로(D2에서 B 선택), 15분 규칙 등 칸 채우기 규칙(D3에서 폐기), 2시간마다 확인(D8에서 B 선택).
- 고양이 연동(상태별 모션, 사료): design/cat 브랜치 소관. 사료·가구는 2주 검증 뒤(기존 결정).
- 잠금 화면 타이머 조작·진행 알림: 이번 범위 아님.

## What already exists
집중 블록(`application/record/blockLogic.ts`, `components/focus/*`), 알림 쉬기(블록 건너뛰기, D25 일시 중지), 묶어 채우기(`record/batchLogic.ts`), 알림 버튼 작업(`notifications/continueTask.ts`), 계획 대비 실제(`record/planVsActual.ts`), S1 집계(`record/s1.ts`). 모두 재사용하거나 구간 기준으로 고친다.

## Dream state delta
이 계획 뒤: 공부할 때는 타이머가 곧 기록이고, 나머지 시간은 30분 알림이 채운다. 남는 거리: 묻는 횟수를 사용자 행동에 맞추기(12개월), 과목·주간 리포트·코칭(F3).

## Reality rows
| premise | claim | receipt | verdict |
|---|---|---|---|
| 지금 기록은 30분 칸 | UNIQUE(user_id, slot_start) | docs/designs/left30-relaunch.md:73 | verified |
| 집중 블록이 알림을 건너뜀 | nextBoundary·blockSlots | application/record/blockLogic.ts:24 | verified |
| S1은 답한 행동 시간대 3곳 | 설계서 성공 기준 | docs/designs/left30-relaunch.md:316 | verified |
| 스트릭은 검증 때문에 연기 | TODO 항목 | TODO.md:85 | verified |
| 변경 파일 약 35개 | [estimated] 디렉터리 목록 기준 | application/record/blockLogic.ts:1 | unverified |

REALITY: premise-table pass 5 claims, unverified=1 (file count estimate) docs/designs/left30-relaunch.md:73
REALITY: already-done pass no timer/pomodoro/stopwatch code or docs before this plan 46149427aa3456e87b2c87a62b2f83bc43b136b7
REALITY: surface-check pass no new CLI or HTTP route in W1; named routes limited to existing /sync, W2 changes owned by eng review server/src/sync/sync.controller.ts:1
REALITY: binding-decisions finding D3 reverses approach B slot-centric schema; user-approved, design doc must be amended before W2 docs/designs/left30-relaunch.md:62
REALITY: numbers finding file count ~35 is [estimated]; S1 threshold 3 periods cited [re-measure before gate] docs/designs/left30-relaunch.md:316
REALITY: deferred-asks pass no linked issue; streak/feed deferrals unchanged TODO.md:85
REALITY: pr-count pass no .gstack/ship-policy.json, default one PR per wave (W1, W2) 46149427aa3456e87b2c87a62b2f83bc43b136b7
REALITY: transaction-semantics pass no driver/pool change in W1; local slot-to-range migration must run in one SQLite transaction (eng review) application/record/blockLogic.ts:1

## Implementation Tasks (단계 순서, 세부는 eng 리뷰 뒤)
| # | 단계 | 작업 | 사람 팀 / CC |
|---|---|---|---|
| 1 | W1 | /plan-eng-review: 구간 테이블, slot·block 이전, 빈 부분 계산, 알림 쉬는 이유 목록 | 1일 / 1시간 |
| 2 | W1 | /plan-design-review: 홈 세 버튼, 타임라인 시간표, 뽀모도로 끝내기, 오래 진행 확인, 7색 | 1일 / 1시간 |
| 3 | W1 | 로컬 구간 기록 + 이전 + 테스트 | 3일 / 3시간 |
| 4 | W1 | 타이머 3종 + 알림 쉼·재개 + 뽀모도로 알림 | 3일 / 3시간 |
| 5 | W1 | 시간표 타임라인, 계획 대비 실제(분), 놓친 알림 묶음, S1 | 3일 / 3시간 |
| 6 | W1 | 창업자 실기기 사용(개발 앱) | 며칠 |
| 7 | W2 | 과목 화면, 서버 마이그레이션·동기화, 설계서 개정, release 빌드 | 1주 / 1일 |
| 8 | W2 뒤 | 공부하는 테스터 5명 모집, 2주 검증 | 2주 |
병행: 일상 APK(옛 판) 빌드로 창업자 S3 확인(VAL C).

## Completion Summary
- 모드: SCOPE REDUCTION. 결정 12개 승인(BREAK는 임시). 뒤집힌 기존 결정 1개(접근법 B 칸 중심).
- CRITICAL GAP 1: 타이머가 끝난 뒤 알림 재예약이 실패하면 알림이 다시 오지 않는다. eng 리뷰에서 재예약 경로와 테스트로 막는다.
- 외부 검토: 실행 안 함.
- Reality: 8행, unverified=1.

## Eng Review (/plan-eng-review, 2026-11-16)
대상: 이 문서(타이머 개편 W1). 보고서 파일: 이 문서.

### Scope Challenge A. 이미 있는 것
- 스케줄러는 선언형이다. `desiredSchedule`(`application/scheduler/plan.ts`)이 매번 DB 상태로 "울려야 할 알림 전체"를 다시 계산하고, 블록 안 알림은 `inBlock`으로 뺀다(`if (inBlock(t, blocks)) continue;`). 그래서 타이머를 `block` 행으로 두면 **진행 중 알림 끔과 끝난 뒤 재개가 따로 코드 없이 된다**. 끝난 뒤 재예약은 `afterBlockChange()`(`application/runtime/appRuntime.ts:169`)와 앱 열 때의 `rescheduleNow()`가 맡는다.
- 진행 중 블록 복원: `activeBlock`(`application/record/blockLogic.ts:198`)이 DB에서 읽는다. 앱이 꺼져도 시작 시각이 DB에 있으면 복원된다.
- 동기화: `block`은 이미 서버와 동기화된다(`application/db/records.ts:101` `enqueue(tx, 'block', block)`). 서버는 kind·category 값을 검증한다(`server/src/Entity/block.entity.ts:45-48`).
- 복잡도: 변경 파일 약 16~22개(추정), 새 모듈 2개 이상 → 구조 질문 대상.

### Scope Challenge 발견
1. [CRITICAL] (confidence: 8/10) `application/db/records.ts:101` — W1에서 "공부" 카테고리나 새 타이머 종류를 그대로 큐에 넣으면 서버가 거절해 dead letter로 빠지고, W2에서 서버를 고쳐도 다시 올라가지 않는다. 처리: SYNC B(D11 승인) 구현의 일부로, 서버가 모르는 값의 큐 항목은 보내지 않고 큐에 남겨 W2 뒤에 올라가게 한다(추가 승인 불필요, 승인된 "1단계는 로컬"의 구현).
2. [INFORMATIONAL] (confidence: 9/10) CEO 리뷰의 CRITICAL(타이머 끝 뒤 재예약 실패)은 선언형 스케줄러로 대부분 이미 막혀 있다. 남는 일은 "멈추기 경로가 `afterBlockChange()`를 부른다"를 테스트로 고정하는 것.
3. [INFORMATIONAL] (confidence: 8/10) 타이머 시작 전 자투리(예: 14:00 기록 뒤 14:12 시작이면 14:00–14:12)는 D2(타이머 중 알림 끔) 때문에 아무도 묻지 않는다. R1에서 정한다.

### Scope Challenge B. 구조 (진행 중)
| | Original arrangement(작업본의 암묵안) | Smaller arrangement(제안) |
|---|---|---|
| 기록 저장 | 새 `entry` 표(시작~끝 구간) + 기존 slot·집중 블록을 옮김 | `slot`은 그대로 "30분 알림 답"으로, 타이머는 `block` 행(kind 추가, 진행 중 end_at 비움, 과목·집중 분 칸) |
| 겹침 처리(D12) | 저장할 때 빈 부분만 잘라 저장 | 읽을 때 `timeline.ts` 한 곳에서 타이머 우선으로 slot을 잘라 보여 줌 |
| 데이터 이전 | 필요(한 방향, 실패 위험) | 없음 |
| W2 서버 | 새 표 + 동기화 경로 | block에 칸 추가·kind/category 값 추가 |
| 파일·모듈 | 약 22개, 새 모듈 3(entry 저장, 이전, timeline) | 약 16개, 새 모듈 2(timeline, timerLogic) |

Scope record: feature answers: 없음(기능 삭감 제안 없음); structure: **Original arrangement** (eng D1 답 "Original arrangement", 2026-11-16, 권장 Smaller를 고르지 않음); accepted scope: 새 `entry` 표(시작~끝 구간, 카테고리, 과목, 출처, 집중/휴식 분)에 모든 기록을 둔다. 기존 slot과 집중 블록 기록을 entry로 옮긴다. 진행 중 타이머는 entry(end_at 비움)로 두고 스케줄러가 이를 읽어 알림을 쉰다. 계획 블록(Todo)은 block 표에 남는다. W2에 서버 entry 표·동기화. pending remedies: R1(타이머 시작 전 자투리).
Scope Challenge 결과: scope accepted as-is (MODE: FULL_REVIEW).

## Decision ledger (eng)

### R1: 타이머 시작 전 자투리
Finding: 3, INFORMATIONAL, confidence 8/10, `application/scheduler/plan.ts` `if (inBlock(t, blocks)) continue;` (진행 중 타이머 안의 알림을 뺌), reviewer: Claude
Plan baseline: D2 "타이머 들어가는 경우에는 30분 알람은 비활성화", D10 묶어 채우기는 "놓친 30분 알림 시간"만, D12 알림 답은 빈 부분만
Runtime evidence: 14:00 기록 뒤 14:12 타이머 시작 → 14:30 알림은 타이머 중이라 빠짐 → 14:00–14:12는 묻는 곳이 없음(코드 경로로 확인, 실기기 미확인)
Comparison grid:
| 선택 | 현재 | A | B | C |
|---|---|---|---|---|
| 자투리 처리 | 정해지지 않음, 빈칸으로 남음 | 타이머 끝난 뒤 첫 알림이 "지난 30분 + 자투리"를 함께 묻지 않고, 묶어 채우기 시트가 자투리도 빈 시간으로 보여 줌 | 그냥 빈칸으로 둠(시간표에 빈 틈) | 타이머 시작 때 "14:00 이후 뭐 했어?"를 한 번 물음 |
| D2 알림 끔 | 승인 | 유지 | 유지 | 유지 |
| D10 묶음 대상 | 놓친 알림 | 놓친 알림 + 타이머 앞 자투리 | 놓친 알림 | 놓친 알림 |
Question D2: 타이머 시작 전 자투리 시간을 어떻게 할까요? (A 묶어 채우기에 포함 / C 시작할 때 물음 / B 빈 틈으로 둠)
State: approved
Actual answer: B. 빈 틈으로 둠 (eng D2, 2026-11-16, 권장 A를 고르지 않음)
Accepted scope: 아무것도 만들지 않는다. 타이머 앞 자투리는 시간표의 빈 틈으로 남고, 시간표에서 직접 채울 수 있다. D10 묶어 채우기 대상은 "놓친 30분 알림"만 그대로.

### R2: 카테고리 순서 목록이 여러 곳에 손으로 적혀 있음
Finding: Section 2, INFORMATIONAL, confidence 9/10, `application/record/planVsActual.ts:19` `export const ROW_ORDER: Category[] = ['work', 'rest', 'relationship', 'exercise', 'self_dev', 'sleep']`, 같은 목록이 `application/components/todo/PlanTargetSheet.tsx:14`, `planVsActual.ts:21`(TIE_ORDER)에도 있음. reviewer: Claude
Plan baseline: CAT C(D6) "공부" 7번째 카테고리 추가
Runtime evidence: `Record<Category, …>` 표(라벨·색·알림 문구)는 타입 검사가 빠뜨림을 잡지만, `Category[]` 순서 목록 3곳은 "공부"를 빠뜨려도 컴파일된다 → 계획 대비 실제와 목표 시트에서 공부 줄이 조용히 사라짐
Comparison grid:
| 선택 | 현재 | A | B |
|---|---|---|---|
| 순서 목록 | 3곳 손으로 | `db/types.ts`에 `CATEGORY_ORDER` 하나, 나머지는 여기서 가져오고 모든 카테고리를 포함하는지 테스트 | 3곳에 "study"를 손으로 추가 |
| 공부 추가(D6) | 승인 | 유지 | 유지 |
Question D3: 카테고리 순서 목록을 한 곳으로 모을까요? (A 한 곳으로 / B 세 곳에 직접 추가)
State: approved
Actual answer: A. 한 곳으로 모음 (eng D3, 2026-11-16)
Accepted scope: `db/types.ts`에 `CATEGORY_ORDER`(표시 순서) 하나를 두고 `ROW_ORDER`·`PlanTargetSheet ORDER`는 이를 가져다 쓴다. `TIE_ORDER`는 뜻이 달라 따로 두되, 모든 카테고리를 정확히 한 번씩 담는지 두 목록 모두 테스트로 확인한다.

Approval readiness: PASS — structure(eng D1 Original), R1(eng D2 B), R2(eng D3 A). Scope Challenge 발견 1(서버가 모르는 값은 큐에 남김)은 CEO SYNC B(D11)의 구현이라 추가 승인 없음. 발견 2(멈추기 경로 재예약 테스트)는 CEO CRITICAL의 필수 증명이라 추가 승인 없음.

### Section 1: 아키텍처
```
                        ┌───────────────────────────────┐
  30분 알림 답 ────────▶│ record/entries.ts  saveEntry  │  한 트랜잭션: 창 [fire-30, fire]에서
  알림 버튼 [그대로]───▶│  (유일한 쓰기 입구)            │  기존 entry와 겹치는 부분을 빼고
  묶어 채우기 ─────────▶│                               │  남은 조각만 저장(D12)
  시간표 직접 채우기 ──▶│                               │
  타이머 시작/멈춤 ────▶│ record/timerLogic.ts          │  end_at NULL = 진행 중(동시에 1개)
                        └──────────────┬────────────────┘
                                       ▼
                         entry(id, start_at, end_at?, planned_end_at?, tz, category,
                               subject?, source, focus_min?, note, deleted, client_updated_at)
                         UNIQUE INDEX ... WHERE end_at IS NULL AND deleted = 0
                                       │
     ┌───────────────┬─────────────────┼──────────────────┬─────────────────┐
     ▼               ▼                 ▼                  ▼                 ▼
  시간표(timeline) 계획 대비 실제   놓친 알림 묶음      스케줄러          S1·이벤트
  구간 그리기      분 합계           (빈 알림 창)        진행 중 entry     (로컬, W2에 서버)
                                                       있으면 알림 쉼,
                                                       뽀모도로 신호 예약
  block 표: Todo 계획 블록만 남음(집중 kind는 이전 뒤 새로 만들지 않음)
```
- 이전(로컬 v3, 한 트랜잭션, 실패 시 기존 오류 화면 `initDb`): `slot` 한 줄 → entry(start=slot_start, end=+30분, source 유지). 진행 중 집중 블록 → 진행 중 [타이머] entry(planned_end_at=end_at). 끝난 집중 블록은 이미 declared 칸으로 slot에 있으므로 따로 옮기지 않는다(중복 방지). `slot`·`block`(집중) 행은 W2까지 지우지 않는다.
- 타이머 종류: 스톱워치(planned_end_at 없음), 뽀모도로(planned_end_at 없음, 집중/휴식은 start_at에서 25/5로 계산), 타이머(planned_end_at 있음, 끝나면 기존 끝 시트 A안: [30분 더]/[여기서 끝]).
- 스케줄러: 진행 중 entry가 있으면 그 시각 이후 30분 알림을 모두 뺀다(D2). 뽀모도로 신호(휴식·재개)는 시작 시각에서 계산해 최대 12시간 또는 방해금지 시작까지 예약하고 알림 예약 몫(398)에서 뺀다. 멈추면 `afterBlockChange()`와 같은 재예약 경로를 탄다. (추가, RESUME 임시) 정지 뒤 30분 알림은 [예]를 고를 때만 다시 예약하고, [아니오]·미응답은 D25 "다시 켤 때까지" 꺼짐 상태로 둔다. 쉬는 이유(타이머 진행 중, 일시정지, D25 끔)는 목록으로 따로 들고 모두 풀릴 때만 알림을 건다.
- (추가, CONTROL·PAUSE) entry에 `session_id`를 둔다. 일시정지 = 진행 중 조각에 end_at, 재개 = 같은 session_id로 새 조각(부분 유일 인덱스 유지). 일시정지 중임은 세션 상태로 표시한다(진행 중 조각 없음 + 세션 미종료). 뽀모도로 단계는 조각들의 실제 진행 분을 더해 계산하고, 재개 때 신호를 다시 예약한다.
- (추가, NOTIF) 고정 알림은 작은 네이티브 모듈(Kotlin, NotificationCompat 크로노미터 + 버튼 브로드캐스트). 버튼 처리는 SQLite에 조각을 끝내거나 만들고, 다음 앱 열기 때 선언형 스케줄러가 맞춘다.
- W1 동기화: entry는 큐에 넣지 않는다. 서버가 모르는 이벤트 종류·카테고리 값의 큐 항목은 보내지 않고 남긴다(W2 뒤 전송).
- 실패 시나리오: 이전 도중 앱 종료 → SQLite 트랜잭션 롤백, 다음 실행에 다시 시도. 같은 순간 두 타이머 시작(두 번 탭) → 부분 유일 인덱스가 두 번째를 거절, 화면은 진행 중 타이머를 보여 줌.
- Design-twice: Smaller(slot 유지 + block 타이머)를 대안으로 비교했고 사용자가 Original을 골랐다(eng D1). 레드 플래그 점검: (6) 두 가지 쓰기 방법 → `saveSlot`/`saveSlots` 호출 6곳(`RecordSheet.tsx:392`, `RecordToast.tsx:58`, `records.ts:140`, `batchLogic.ts:105`, `blockLogic.ts:60`, `continueAction.ts:28`)을 모두 `saveEntry`로 옮기고 slot 쓰기 함수는 지운다. (8) 손으로 맞춘 목록 → R2로 처리. (5) 분할 소유 → entry 쓰기는 `entries.ts` 하나만.

Findings:
1. [CRITICAL] (confidence: 8/10) `application/db/records.ts:101` — 서버가 모르는 값이 dead letter로 사라짐. Disposition: accepted(SYNC B 구현).
2. [INFORMATIONAL] (confidence: 9/10) slot 쓰기 6곳이 남으면 두 저장소에 나뉘어 기록됨. Disposition: accepted(구조 D1의 필수 구현).

### Section 2: 코드 품질
1. [INFORMATIONAL] (confidence: 9/10) `application/record/planVsActual.ts:19` — 순서 목록 3곳. Disposition: accepted(R2, D3 A).
2. [INFORMATIONAL] (confidence: 8/10) `application/record/blockLogic.ts:31` `blockSlots`·`fillSlots`는 30분 칸 전제다. 집중 kind가 entry로 옮겨가면 Todo 계획 블록의 [여기서 끝]/체크만 남는다. 이 둘은 `saveEntry`로 블록 구간 하나를 저장하도록 바꾸고 칸 펼침 코드는 지운다. Disposition: accepted(구조 D1의 필수 구현).
3. [INFORMATIONAL] (confidence: 7/10) `application/record/blockLogic.ts:24` `nextBoundary`: 기존 [집중]은 다음 30분 경계부터 길이를 셌다. 새 [타이머]는 누른 순간부터 센다(D2와 같은 원칙). Disposition: accepted(CEO D2 적용).

### Section 3: 테스트
프레임워크: jest + `node:sqlite` 실제 DB(`application/test/nodeDb.ts`, CLAUDE.md).
```
CODE PATHS                                           USER FLOWS
[+] record/entries.ts saveEntry                      [+] 타이머
  ├── [GAP] 빈 창 → 30분 한 조각                        ├── [GAP] 시작 → 앱 종료 → 다시 열기 = 복원
  ├── [GAP] 창 안에 타이머 → 앞뒤 두 조각              ├── [GAP] 두 번 탭 → 하나만
  ├── [GAP] 창 전부 덮임 → 저장 없음                    └── [GAP] 멈추기 → 다음 :00/:30 알림 예약
  └── [GAP] 진행 중 타이머와 겹침 → 그 시각까지만      [+] 스톱워치 오래 진행
[+] db/schema.ts v3 이전                                 └── [GAP] 6시간째 확인 → 끝 시각 고치기
  ├── [GAP] slot N개 → entry N개, 분 합계 같음        [+] 알림 답(빈 부분 문구)
  ├── [GAP] 진행 중 집중 블록 → 진행 중 타이머          └── [GAP] 15:47 이후 뭐 했어?
  └── [GAP] 실패 → 롤백, 데이터 그대로
[+] scheduler desiredSchedule
  ├── [★★★ TESTED] 블록 안 알림 빼기 — scheduler.test.ts
  ├── [GAP] 진행 중 entry(end 없음) → 이후 알림 0
  └── [GAP] 뽀모도로 신호 25/5, 예약 몫 차감
[+] timeline / 계획 대비 실제 / 묶어 채우기
  ├── [GAP] 뽀모도로 4바퀴 → 시간표 120분, 집중 100분
  ├── [GAP] 묶음: 타이머 구간은 빈 시간 아님
  └── [GAP] 자정을 넘는 구간 → 날짜별로 나눠 셈
[+] 카테고리 순서
  └── [GAP] CATEGORY_ORDER·TIE_ORDER가 모든 카테고리를 한 번씩
[+] 동기화
  └── [GAP] 서버가 모르는 값은 큐에 남고 보내지 않음
COVERAGE: 1/19 paths tested | GAPS: 18 (모두 단위/통합, E2E 없음)
```
대체되는 테스트: `record/blockLogic.test.ts`의 칸 펼침(blockSlots·fillSlots) 사례, `record/timetable.test.ts`의 칸 격자 사례는 entry 기준으로 다시 쓴다.

### Section 4: 성능
시간표·합계는 `entry(start_at)` 인덱스 범위 조회 하나. 하루 수십 줄. 이전은 slot 행 수(창업자 기기 수천 줄 이하)만큼 한 트랜잭션. No issues found.

### Outside Voice
실행하지 않음(skipped): 사용자가 Codex 대리 실행을 거절한 적이 있고 하위 에이전트를 요청하지 않았다. 외부 검토 범위 없음.

### Failure modes
| 경로 | 실패 | 테스트 | 사용자가 보는 것 |
|---|---|---|---|
| 이전 v3 | 중간 실패 | 계획됨 | 기존 "업데이트 중 문제" 화면, 데이터 유지 |
| 타이머 멈춤 뒤 재예약 | 재예약 예외 | 계획됨 | 다음 앱 열기 때 재예약(조용함, 로그 남음) |
| 동기화 | 서버가 값 거절 | 계획됨 | 없음(큐에 남음) |
| 스톱워치 잊음 | 밤새 진행 | 계획됨 | 앱 열 때 확인 화면 |
critical gap: 0 (모두 테스트 계획 또는 처리 경로 있음)

### NOT in scope
- 타이머 앞 자투리 채우기(eng D2 B: 빈 틈으로 둠).
- 서버 entry 표·동기화(W2), 과목 화면(W2).

### What already exists
선언형 스케줄러(`desiredSchedule`), 로컬 이전 틀(`db/migrate.ts`, 버전별 트랜잭션·오류 화면), 끝 시트 A안, 묶어 채우기 시트, 알림 버튼 작업. 저장소만 entry로 바꾸고 나머지는 재사용한다.

### Worktree parallelization strategy
| Step | Modules touched | Depends on |
|---|---|---|
| 1 entry 표·이전·saveEntry | db/, record/ | — |
| 2 타이머 로직·스케줄러 | record/, scheduler/ | 1 |
| 3 시간표·계획 대비 실제·묶음 | record/, components/timetable, components/home | 1 |
| 4 홈 세 버튼·확인 화면 | components/focus, app/(tabs) | 2 |
Lane A: 1 → 2 → 4. Lane B: 3(1 뒤). 1 끝나고 A·B 병행, record/ 공유라 같은 브랜치에서 순서대로 합치는 편이 안전하다.

### Implementation Tasks
- [ ] **T1 (P1, human: ~1.5일 / CC: ~1.5시간)** — db — entry 표(v3)·부분 유일 인덱스·slot/진행 중 집중 이전
  - Surfaced by: Scope Challenge B 구조(eng D1 Original)
  - Files: application/db/schema.ts, db/types.ts, db/records.ts
  - Verify: `npx jest db` (이전 전후 분 합계, 실패 롤백)
- [ ] **T2 (P1, human: ~1일 / CC: ~1시간)** — record — `saveEntry` 단일 쓰기 입구(빈 부분만), slot 쓰기 6곳 이전
  - Surfaced by: Section 1 발견 2, CEO D12
  - Files: record/entries.ts(새), RecordSheet.tsx, RecordToast.tsx, batchLogic.ts, continueAction.ts, blockLogic.ts
  - Verify: `npx jest record`
- [ ] **T3 (P1, human: ~1.5일 / CC: ~1.5시간)** — record/scheduler — 타이머 3종, 진행 중 알림 끔, 뽀모도로 신호, 멈춤 재예약
  - Surfaced by: CEO POMO·HOME, Scope Challenge 발견 2
  - Files: record/timerLogic.ts(새), scheduler/plan.ts, scheduler/scheduler.ts
  - Verify: `npx jest scheduler record`
  - 추가(CONTROL·PAUSE·RESUME): 일시정지/재개(session_id 조각), 뽀모도로 얼림·이어 세기, 정지 뒤 [예]일 때만 재예약, "다시 묻지 않기"로 기억한 답 적용, 계정 관리 설정 한 줄, 쉬는 이유 목록. T1에 `session_id` 칸 포함
- [ ] **T8 (P1, human: ~1일 / CC: ~1시간)** — native — 진행 중 고정 알림(크로노미터, [일시정지]/[재개]·[정지] 버튼)
  - Surfaced by: NOTIF
  - Files: application/modules/ongoing-timer(새, Kotlin), record/timerLogic.ts
  - Verify: 실기기(앱 꺼진 상태에서 버튼, 뽀모도로 단계 전환)
- [ ] **T4 (P1, human: ~2일 / CC: ~2시간)** — UI — 시간표 구간 타임라인, 계획 대비 실제 분 단위, 묶어 채우기 창 기준
  - Surfaced by: CEO TIMELINE·GAP
  - Files: record/timetable.ts, components/timetable/Timetable.tsx, record/planVsActual.ts, record/batchLogic.ts
  - Verify: jest + 실기기
- [ ] **T5 (P1, human: ~1일 / CC: ~1시간)** — UI — 홈 세 버튼, 진행 중 큰 숫자, 스톱워치 오래 진행 확인
  - Surfaced by: CEO HOME·FORGOT
  - Files: components/focus/*, app/(tabs)/index.tsx
  - Verify: 실기기
- [ ] **T6 (P1, human: ~1시간 / CC: ~10분)** — sync — 서버가 모르는 값은 큐에 남기기
  - Surfaced by: Section 1 발견 1
  - Files: sync/engine.ts
  - Verify: `npx jest sync`
- [ ] **T7 (P2, human: ~1시간 / CC: ~5분)** — types — CATEGORY_ORDER 한 곳 + "공부" 추가 + 포함 테스트
  - Surfaced by: R2(eng D3 A), CEO CAT
  - Files: db/types.ts, record/planVsActual.ts, components/todo/PlanTargetSheet.tsx, record/categoryStyle.ts
  - Verify: `npx tsc --noEmit && npx jest`

### Completion summary (eng)
- Step 0: Scope Challenge — scope accepted as-is (구조 Original 선택)
- Reality rows: 아래 PLAN_REALITY 참고
- Architecture Review: 2 issues found
- Code Quality Review: 3 issues found
- Test Review: diagram produced, 18 gaps identified
- Performance Review: 0 issues found
- NOT in scope: written / What already exists: written
- TODOS.md updates: 0 items proposed
- Failure modes: 0 critical gaps flagged
- Unresolved decisions: 0 in this review
- Outside voice: skipped (사용자 이전 거절, 에이전트 미요청)
- Parallelization: 2 lanes, 1 parallel / 1 sequential
- Lake Score: 1/3 (R2만 10/10 선택)

REALITY: premise-table pass scheduler suppresses in-block pings, migration runs per-version transaction; unverified=0 application/db/migrate.ts:29
REALITY: already-done pass no entry table or timer code on base 91f782c application/db/schema.ts:10
REALITY: surface-check pass no new CLI/HTTP in W1; jest and tsc commands from CLAUDE.md application/db/schema.ts:10
REALITY: binding-decisions pass follows CEO D1-D12 and eng D1-D3; approach B reversal recorded docs/designs/left30-relaunch.md:62
REALITY: numbers finding file counts ~16/~22 and effort are [estimated] application/record/blockLogic.ts:1
REALITY: deferred-asks pass no linked issue TODO.md:85
REALITY: pr-count pass default one PR per wave application/db/schema.ts:10
REALITY: transaction-semantics pass v3 migration runs inside db.transaction like v1-v2 application/db/migrate.ts:29

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | ISSUES OPEN | mode: SCOPE_REDUCTION, 1 critical gaps(eng 리뷰에서 처리) |
| Outside Review | codex (plan-review) | Independent 2nd opinion | 0 | skipped | 실행 안 함(사용자 이전 거절) |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | ISSUES OPEN | 5 issues, 0 critical gaps (모두 accepted, 작업 T1~T7로 연결) |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | 이 계획은 아직 없음(이전 10-21 리뷰는 재출시 범위) |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **OUTSIDE COVERAGE:** codex, plan-review, CEO·Eng 모두 skipped(실행 안 함), findings 없음.
- **VERDICT:** Eng 결정 완료, 미해결 없음. 이슈는 모두 승인된 작업으로 연결됨(issues_open = 할 일 있음). UI 범위가 커서 구현 전 /plan-design-review 권장.

**UNRESOLVED DECISIONS:**
- 뽀모도로 끝내기 방식, 스톱워치 "오래"의 기준, 7색, 세 버튼과 고양이 방 배치, 1분 미만 기록 처리(소유: /plan-design-review, CEO 리뷰에서 넘어옴)
- 일시정지·정지 버튼 배치, 고정 알림 문구, 알림 재개 질문 모양(소유: /plan-design-review, 2026-11-16 추가)
- **숙제(사용자):** 타이머·뽀모도로가 끝난 뒤 30분 알림을 자동으로 다시 켤지, [아니오] 뒤 언제 다시 켜질지. 그때까지 RESUME 임시안으로 개발
