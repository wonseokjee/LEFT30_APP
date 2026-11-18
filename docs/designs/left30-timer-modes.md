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
3. 홈 [시작] → 시트에서 방식(스톱워치·뽀모도로·타이머, 지난번 값) + 카테고리 → 시작(2026-11-17 D38, 처음엔 세 버튼). 큰 숫자는 지금 도는 타이머. 도는 동안 30분 알림 끔.
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
| HOME (홈 화면과 시작) | FocusStatus.tsx, FocusStartSheet.tsx(두 번 탭) | 큰 숫자 = 다음 알림까지. [집중] → 카테고리 → 길이 | **B 홈에 세 버튼 나란히: 큰 숫자 아래 [스톱워치] [뽀모도로] [타이머(시간 정하기, 기존 집중 블록)]. 누르면 카테고리만 고르고 시작.** 켜져 있는 동안 큰 숫자는 그 타이머(스톱워치 경과, 뽀모도로 남은 시간, 타이머 남은 시간)를 보여 주고 30분 알림은 꺼진다 | approved | D5 답 "B. 홈에 세 버튼 나란히" (2026-11-16). 권장 A(한 버튼)를 고르지 않음. 고양이 방 영역과 자리 배분은 /plan-design-review와 design/cat 1단계에서. **2026-11-17 디자인 리뷰 D38로 바뀜:** 세 버튼 대신 [시작] 하나 + 시작 시트 맨 위 방식 세 칸(지난번 방식 미리 골라짐). 사용자가 세 버튼을 없애고 싶다며 사용성 재검토를 요청해 가안 선택 |
| CAT (공부 카테고리) | `CATEGORY_LABEL` 6개(업무·휴식·관계·운동·자기개발·수면), 서버 CHECK | 공부 카테고리 없음 | **C "공부"를 7번째 카테고리로 추가 + 과목 태그.** 타이머 시작 때 과목을 고르거나 새로 만들고, 과목별 합계를 보여 준다 | approved | D6 답 "C. '공부' + 과목 태그" (2026-11-16). 권장 B를 고르지 않음. 과목을 공부에만 둘지 모든 카테고리의 하위 태그로 둘지, 과목 관리 화면은 SUBJ 행과 디자인 리뷰에서 **2026-11-17 CEO 리뷰 2로 바뀜:** 고를 수 있는 카테고리는 집중·운동·기타 3개(공부·업무·자기개발을 집중으로 합침). 무엇에 집중했는지는 세부 항목(1단계로 당김)이 맡는다. 휴식·관계·수면은 새로 고를 수 없고 옛 기록은 그대로 표시. 타이머 시작 시트는 카테고리 없이 세부 항목만(아래 "CEO 리뷰 2") |
| SUBJ (과목 단계) | CAT C, 0G | 없음 | **B 구간 데이터에 과목 칸(subject)만 1단계에 두고, 과목 고르기·만들기·합계 화면은 2단계(테스터 모집 전)** | approved | D9 답 "B. 데이터만 1단계, 화면은 2단계 (recommended)" (2026-11-16) |
| GAP (놓친 시간 채우기) | 기존 `batchLogic.ts`(칸 2~10개 묶음) | 칸 단위 묶어 채우기 | **1단계에 둔다. 단, 대상은 놓친 30분 알림의 시간뿐이다.** 타이머·뽀모도로는 실제 시작~끝이 기록되므로 빈 시간을 만들지 않는다. 시트("13:00–18:00 비어 있어요")는 그대로, 찾는 대상만 "답하지 않은 알림 구간"으로 바꾼다. 타이머 끝과 다음 알림 사이(예: 15:47–16:00)는 다음 알림 답이 채운다 | approved | D10 답 "이건 30분 알림 기능일때만, 타이머와 뽀모도로는 안해도 되는거 아닌가" (2026-11-16). 사용자 지적이 맞아 범위를 놓친 알림으로 좁혀 1단계에 둔다 |
| SYNC (서버 동기화 시기) | 서버 `slot`·`block` 엔티티와 `/sync/*`, Neon 운영 DB, 일상 APK(옛 판)는 계속 slot을 올림 | slot 동기화 | **B 1단계는 개발 앱 로컬만(구간 동기화 끔), 서버 마이그레이션·동기화는 2단계에 과목과 함께 한 번에** | approved | D11 답 "B. 1단계는 로컬, 서버는 2단계 (recommended)" (2026-11-16). 감수: 개발 앱을 지우면 1단계 기록이 사라진다. 일상 APK(옛 판)의 slot 동기화와 운영 서버는 그대로 둔다 |
| OVERLAP (알림 답과 타이머가 겹칠 때) | TIMELINE 행의 "확인 필요" 기본 규칙, Section 4 | 칸은 하나에 하나(UNIQUE) | **A 알림 답은 지난 30분 중 아직 기록 없는 부분만 채운다. 타이머 구간이 우선이다. 알림 문구도 빈 부분 기준("15:47 이후 뭐 했어?")** | approved | D12 답 "A. 빈 부분만 채움, 타이머 우선 (recommended)" (2026-11-16). TIMELINE 행의 "확인 필요" 기본 규칙을 확정한다. 빈 부분이 없으면(지난 30분이 모두 타이머) 그 알림은 예약하지 않는다(타이머 중 알림 끔과 같은 결과) |
| BREAK (뽀모도로 휴식 기록) | POMO, TIMELINE | 없음 | **A 시간표·계획 대비 실제에는 휴식 포함 한 덩어리, 과목 합계와 타이머 화면에는 집중한 분만** | approved(임시) | D7 답 "나중에 더 좋은 방식 생각하고 일단 a" (2026-11-16). 실사용 뒤 다시 본다. 구현은 휴식 구간을 데이터로 남겨(집중/휴식 분 구분) 나중에 표시만 바꿀 수 있게 한다 |
| FORGOT (스톱워치 끄는 걸 잊음) | POMO(타이머 중 알림 꺼짐) | 없음. 집중 블록은 끝 시각이 있어 끝 시트가 온다 | **B 제한 없이 계속. 앱을 열면 오래 진행 중일 때 "6시간째 진행 중, 끝난 시각을 고칠까요?"로 확인하고 끝 시각을 고칠 수 있다** | approved | D8 답 "B. 제한 없이, 앱 열 때 확인" (2026-11-16). 기준 3시간, [계속]을 누르면 그 세션에서는 다시 묻지 않음(디자인 리뷰 D11, 2026-11-17). 권장 A(2시간마다 확인)를 고르지 않음. 남는 위험: 켜 둔 채 잠들면 그동안 30분 알림이 꺼져 있다. "오래"의 기준(예: 3시간)과 확인 화면은 디자인 리뷰에서 |
| CONTROL (정지·일시정지) | HOME, Section 11([멈추기]만 있었음) | 홈 [멈추기] 하나. 일시정지 없음 | **스톱워치·뽀모도로·타이머 모두 [일시정지]와 [정지]를 필수 기능으로 1단계에 둔다.** 정지는 기존 [멈추기]와 같다(카테고리는 시작 때 골랐으므로 끝에 묻지 않음, [타이머]가 정한 끝 시각에 닿으면 기존 끝 시트 A안). 일시정지하면 큰 숫자가 멈추고 아래에 작게 "일시정지 중". 뽀모도로는 남은 집중/휴식 시간을 얼렸다가 이어서 센다(신호 예약을 다시 계산). **2026-11-17 디자인 리뷰:** 일시정지 중 숫자는 흐리게 멈추고 버튼은 [재개](강조색) [정지], 깜빡임 없음(D7). [정지]는 확인 창 없이 바로 정지하고 아래에 "공부 1시간 23분 기록함 · 정지 취소"를 5초 띄운다. 정지 취소는 세션을 이어 간다(D8, 사용자 "되돌리기라고 안하고 정지취소 같은 단어로"). 알림 재개 질문은 그 줄이 사라진 뒤 | approved | 사용자 "뽀모도로나 스톱워치에서 일시정지 및 정지는 필수기능일것같은데?" (2026-11-16). CEO 리뷰에서 빠졌던 항목 |
| PAUSE (일시정지 시간표 표시) | CONTROL, BREAK, TIMELINE | 없음 | **멈춘 길이로 나눈다. 1분 미만: 그리지 않음. 1~5분: 덩어리 안에 블록보다 약간 옅은 색으로 칠함(뽀모도로 휴식과 같은 표시, 빗금 아님, 2026-11-17 D13 답 "빗금 말고 블록보다 약간 옅은 색으로 색칠"). 5분 이상: 빈 틈으로 두고 앞뒤 조각을 얇은 점선으로 이어 한 세션임을 보인다. 뒤 조각에는 범주명을 반복하지 않는다.** 큰 숫자·과목 합계·계획 대비 실제의 공부 분은 멈춘 시간을 길이와 상관없이 모두 뺀다. 5분 이상 틈은 30분 알림 답이나 직접 기록으로 채울 수 있다 | approved | 사용자 "짧은 5분미만은 b안으로 5분 이상이면 a안으로" (2026-11-16), 1분 미만 생략은 제안 수용. 1분·5분은 첫 값, 실기기에서 조정. 저장(eng 리뷰 2 R7로 바뀜): 세션 하나 = entry 한 줄, 멈춘 구간은 pause 표. 시간표가 5분 미만 사이를 한 덩어리로 그린다 |
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
| D6 | 진행 중 홈에 남길 것 | 숫자·라벨·버튼 2개만. [시작](처음엔 세 버튼)과 오늘 지금까지는 숨김 | visual 4.1 |
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
| D36 | 오늘 지금까지 위치 | 날짜 아래 벽 위쪽 → D37로 되돌림 | visual 4.3c |
| D37 | 오늘 지금까지 | 바닥(아래), 막대 최대 두 줄, 셋 이상이면 진행률 높은 두 개 | visual 4.1, 4.3c |
| D38 | 홈 시작 버튼 | 세 버튼 대신 [시작] 하나, 방식은 시트 맨 위 세 칸(지난번 값) | HOME, visual 4.3c |

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
- (추가, CONTROL·PAUSE, **eng 리뷰 2 R7로 대체: 세션 한 줄 + pause 표**) entry에 `session_id`를 둔다. 일시정지 = 진행 중 조각에 end_at, 재개 = 같은 session_id로 새 조각(부분 유일 인덱스 유지). 일시정지 중임은 세션 상태로 표시한다(진행 중 조각 없음 + 세션 미종료). 뽀모도로 단계는 조각들의 실제 진행 분을 더해 계산하고, 재개 때 신호를 다시 예약한다.
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
- [x] **T1 (P1, human: ~1.5일 / CC: ~1.5시간)** — db — entry 표(v3)·부분 유일 인덱스·slot/진행 중 집중 이전. 표 구성은 eng 리뷰 2 R7(item·entry·pause·plan_v3·block 다시 만들기, STRICT, 정수 시각, uuid v7). eng 리뷰 3: plan_v3에 `position INTEGER NOT NULL`(R8), entry how 값 목록 고침(R14)
  - Surfaced by: Scope Challenge B 구조(eng D1 Original)
  - Files: application/db/schema.ts, db/types.ts, db/records.ts
  - 완료(2026-11-18): v3 = item·entry·pause·plan_v3(STRICT, 밀리초, 외래 키 켬), 기본 항목 6개, slot → entry, 진행 중 집중 블록 → 진행 중 타이머 entry(그 블록 declared 칸은 옮기지 않음), uuid v7, `db/time.ts`. **block 다시 만들기는 T9로 옮김**(사용자 "1": block은 W1에서도 서버로 동기화되고 18개 파일이 써서, 할 일 화면을 고칠 때 item_id로 바꾼다).
  - Verify: `npx jest db` (이전 전후 분 합계, 실패 롤백)
- [ ] **T2 (P1, human: ~1일 / CC: ~1시간)** — record — `saveEntry` 단일 쓰기 입구(빈 부분만), slot 쓰기 6곳 이전
  - Surfaced by: Section 1 발견 2, CEO D12
  - Files: record/entries.ts(새), RecordSheet.tsx, RecordToast.tsx, batchLogic.ts, continueAction.ts, blockLogic.ts
  - Verify: `npx jest record`
- [ ] **T3 (P1, human: ~1.5일 / CC: ~1.5시간)** — record/scheduler — 타이머 3종, 진행 중 알림 끔, 뽀모도로 신호, 멈춤 재예약
  - Surfaced by: CEO POMO·HOME, Scope Challenge 발견 2
  - Files: record/timerLogic.ts(새), scheduler/plan.ts, scheduler/scheduler.ts
  - Verify: `npx jest scheduler record`
  - 추가(CONTROL·PAUSE·RESUME): 일시정지/재개(session_id 조각), 뽀모도로 얼림·이어 세기, 정지 뒤 [예]일 때만 재예약, "다시 묻지 않기"로 기억한 답 적용, 계정 관리 설정 한 줄, 쉬는 이유 목록. T1에 pause 표 포함(R7, 옛 안은 `session_id` 칸)
- [ ] **T8 (P1, human: ~1일 / CC: ~1시간)** — native — 진행 중 고정 알림(크로노미터, [일시정지]/[재개]·[정지] 버튼)
  - Surfaced by: NOTIF
  - Files: application/modules/ongoing-timer(새, Kotlin), record/timerLogic.ts
  - Verify: 실기기(앱 꺼진 상태에서 버튼, 뽀모도로 단계 전환)
- [ ] **T4 (P1, human: ~2일 / CC: ~2시간)** — UI — 시간표 구간 타임라인, 계획 대비 실제 분 단위, 묶어 채우기 창 기준
  - Surfaced by: CEO TIMELINE·GAP
  - Files: record/timetable.ts, components/timetable/Timetable.tsx, record/planVsActual.ts, record/batchLogic.ts
  - Verify: jest + 실기기
- [ ] **T5 (P1, human: ~1일 / CC: ~1시간)** — UI — 홈 [시작] 버튼과 시작 시트(D38), 진행 중 큰 숫자, 스톱워치 오래 진행 확인
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
- [ ] **T9 (P1, human: ~2일 / CC: ~1.5시간)** — UI — 할 일 맨 위 목표 줄과 목표 추가 시트(디자인 리뷰 2, left30-visual.md 4.3d D2~D16). `PlanTargetSheet` 지움
  - Surfaced by: 디자인 리뷰 2 Pass 1~6. 목표 줄("한 시간 / 목표", 4줄 넘으면 접기), 시·분 두 칸 입력(휴대폰 숫자 키보드, 완료·다른 곳=저장, 뒤로=취소, 비우면 빠짐 + 되돌리기, 24시간 초과 알림), 추가 시트(열린 채, 항목 없는 집중·운동 칩, [항목 관리]), 길게 눌러 이름 바꾸기·숨기기, 이름 10자·같은 이름 고름, 목표 0개 안내 + [어제와 동일], 홈 막대 줄 단위 = 목표 줄("집중" 표기), 화면 읽기 라벨
  - Files: components/todo/TodoScreen.tsx, components/todo/PlanTargetSheet.tsx(삭제), 새 components/todo/GoalRows.tsx·GoalAddSheet.tsx·ItemManageSheet.tsx, record/todoLogic.ts, record/planVsActual.ts, components/home/PlanVsActual.tsx, 아침 계획 제안 진입
  - Depends on: T1(plan_v3·item)
  - T1에서 넘어온 일: block에 item_id를 더하고 옛 title을 같은 이름 항목으로 옮긴다(R7 block 부분). 서버 block 동기화 변경은 W2
  - Verify: `npx tsc --noEmit && npx jest`(시간 입력 해석·24시간 검사·항목 없는 집중 집계·같은 이름 고름 테스트), 에뮬레이터에서 키보드가 줄을 가리지 않는지, TalkBack 읽기
  - eng 리뷰 3: 파일 구성 B(새 파일 `record/items.ts`·`GoalSection.tsx`·`GoalAddSheet.tsx`, 목표 쓰기는 todoLogic 한 곳, `savePlan` 지움). 순서 position(R8), 지우기는 DELETE + 같은 자리 되돌리기(R9), 이름 바꾸기 같은 이름 막음(R10), 아침 제안 어제 실제는 항목 기준(R11), 자정에서 잘라 셈(R12), 24시간 검사는 모든 목표 쓰기(R13). 테스트 계획: `~/.gstack/projects/wonseokjee-LEFT30_APP/wsji9-refactor-architecture-eng-review-test-plan-20261118-161659.md`

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

## CEO 리뷰 2: 카테고리 정리 (/plan-ceo-review, 2026-11-17)

사용자: "휴식, 관계, 수면의 사용성이 의심되는데 솔직히 많이 안쓰이는 버튼이 될 것 같거든. 휴식은 일시정지를 하면 되니까. 관계는 너무 불분명한 선택지이고 수면은 어차피 빈칸으로 남는게 좋을듯". 모드: SCOPE REDUCTION(D1 답 "줄이기").

### 0A. 전제
- 카테고리는 두 곳에서 쓰인다. ① 30분 알림 답 "지난 30분 뭐 했어?"(지난 시간), ② 타이머 시작 시트 "무엇을 할까요"(앞으로 집중할 시간). 지적은 ②에서는 그대로 맞다. ①에서는 쉬었던 30분에 "일시정지"가 해당하지 않는다(돌던 타이머가 없음).
- 수면: 밤에는 방해금지라 알림이 오지 않아 밤잠은 이미 빈칸이다. 수면 버튼은 낮잠·방해금지 밖에만 쓰인다.
- 관계: 이름만으로 무엇을 고르는 칸인지 불분명하다.
- 모르는 것: 실제 카테고리별 사용 비율(운영 DB, 리뷰에서 보지 않음). 테스터 2주 뒤 기타 비율로 다시 본다.

### 결정
| ID | 질문 | 답 | 내용 |
|---|---|---|---|
| D1 | 리뷰 모드 | 줄이기 | SCOPE REDUCTION |
| D2 (CAT-START) | 타이머 시작 시트 카테고리 | 권장안 "공부·업무·자기개발·운동 4개" | 휴식·관계·수면을 시작 시트에서 뺀다. 한 줄 4칸 |
| D3 (CAT-ANSWER) | 30분 알림 답 카테고리 | "세 개 다 뺄 (제안 그대로)", 권장안(수면 빼고 관계를 휴식에 합침)을 고르지 않음 | 휴식·관계·수면을 알림 답·기록 시트·놓친 시간 채우기·계획 목표에서 뺀다 |
| D4 (CAT-BLANK) | 뺀 시간을 어떻게 남길지 | 사용자 제안 "기타 버튼을 하나 넣을까"(권장안 [비워 두기] 대신) | **"기타" 카테고리를 새로 둔다.** 알림 답·기록 시트·놓친 시간 채우기에서 고를 수 있다. 답한 것으로 저장되어 다시 묻지 않고 S1에서 응답으로 센다. 시간표에는 "기타" 블록 |

### 이어서: 집중으로 합침과 세부 항목 (같은 날)
사용자: "공부, 업무, 자기개발 도 뭔가 겹치는 것같은데", 권장(자기개발만 공부에 합침)을 듣고 "업무와 공부도 합쳐 집중으로 하면 좋겠다. 그렇다면 세부 항목을 적는 란의 중요성이 더 높아질 수밖에 없겠는데". 운동은 "타이머 시작에는 안쓰일만 하네".

| ID | 질문 | 답 | 내용 |
|---|---|---|---|
| D4b | 공부·업무·자기개발 | 사용자 지시 | **셋을 "집중" 하나로 합친다.** 무엇에 집중했는지는 세부 항목이 맡는다. 운동은 타이머 시작 시트에서 뺀다 |
| D5 | 세부 항목 시기 | 권장 "1단계로 당김" | 고르기·새로 만들기를 1단계에 넣는다(SUBJ B를 바꿈). 합계 화면은 2단계 그대로 |
| D6 | 시작 시트의 세부 항목 | 권장 "골라도 되고 비워도 됨" | 카테고리 칸 대신 세부 항목 칸. 최근 항목 칩(지난번 항목 미리 골라짐) + [+ 새 항목]. 비워 두고 시작 가능 |
| D7 | 알림 답의 세부 항목 | 권장 "앱 기록 시트에서만 선택으로" | 집중을 누르면 바로 저장되고, 기존 메모 자리에 최근 항목 칩이 잠깐 떠서 누르면 붙는다. 알림 버튼 답은 집중만 |
| D8 | 계획 단위 | "세부 항목별 계획도" (권장 "카테고리 단위 그대로"를 고르지 않음) | 아침 계획에서 세부 항목별 목표(예: 영어 1h, 보고서 2h)를 둔다. 홈 막대도 세부 항목별(최대 두 줄, 진행률 높은 순, D37). 계획 화면 설계는 /plan-design-review, 저장 구조는 /plan-eng-review로 넘긴다 |

### 결과 (고를 수 있는 카테고리)
| 화면 | 고르는 것 |
|---|---|
| 30분 알림 답, 기록 시트, 놓친 시간 채우기 | **집중 · 운동 · 기타** (3개, 한 줄). 기록 시트에서 집중 뒤 세부 항목 칩(선택) |
| 타이머 시작 시트 | 카테고리 없음(항상 집중). 방식 세 칸 + 세부 항목(선택) + [시작] |
| 아침 계획 | 할 일 맨 위 목표 줄: 세부 항목·항목 없는 집중·운동 (D8, 화면은 left30-visual.md 4.3d) |
| 홈 "오늘 지금까지" | 계획이 있는 세부 항목·운동 중 진행률 높은 두 줄 |

### 영향과 처리 (Sections 1~10 요약, 이 결정 범위만)
- **데이터**: 저장 키는 지우지 않는다. 새 키 `focus`(집중)·`other`(기타)를 더하고, 계획했던 `study`는 만들지 않는다. 옛 `work`·`self_dev` 기록은 표시와 합계에서 집중으로 본다(같은 뜻). 옛 `rest`·`relationship`·`sleep` 기록은 옛 이름 그대로 보인다. 서버 CHECK에는 W2 마이그레이션에서 `focus`·`other`를 추가한다(W1은 로컬만, SYNC D11). 서버가 모르는 값은 지금처럼 큐에 남는다(eng 발견 1).
- **세부 항목 저장(eng 리뷰 필요)**: 이름 바꾸기·최근 칩·항목별 계획(D8) 때문에 entry의 글자 칸 하나로는 모자란다. 항목 표(이름, 숨김)와 entry의 항목 id, 항목별 계획 표가 후보. `plan`의 UNIQUE(user, date, category)도 바뀐다. T1 전에 /plan-eng-review로 정한다.
- **목록 한 곳(eng R2)**: `Category` 타입은 옛 키를 포함한 전체로 두고, "고를 수 있는 목록" `ANSWER_CATEGORIES`(집중·운동·기타), 계획 목록을 `db/types.ts` 한 곳에서 만든다. 각 목록이 정해진 키를 정확히 담는지 테스트한다. 라벨·문구 표(`Record<Category, …>`)에는 `other`가 빠지면 타입 검사가 잡는다.
- **옛 계획**: 이미 저장된 카테고리 목표는 새 계획 구조(D8)로 옮기지 않고 무시한다. "어제와 동일"은 새 구조 계획만 복사한다.
- **알림 문구**: 직전 카테고리 맥락 문구(relaunch 128)는 기타·옛 키면 기본 문구 "지난 30분, 무엇을 하셨나요?". 알림 버튼 [그대로 계속 · 기타]는 그대로 동작한다.
- **저녁 회고 같을 때 순서**: 계획 항목 순서(기타 제외). 세부 문구는 계획 화면 설계 때 함께.
- **화면 읽기**: "기타로 기록".
- **실패 경로**: 새 오류 경로 없음. 저장 실패는 디자인 D31(2초 알림).
- **위험**: 기타가 쉼·약속·식사·이동을 다 받아 큰 덩어리가 된다. 사용자가 고른 대가다. 2주 뒤 기타 비율이 크면 다시 나눌지 본다(아래 TODO).
- **테스트**: 목록 내용, 옛 `work`·`self_dev`를 집중으로 집계, 옛 휴식·관계·수면 표시, 옛 계획 무시, `other` 저장·S1 응답 집계, 세부 항목 없이 시작·저장, 놓친 시간 채우기에서 기타 선택.

### NOT in scope
- 옛 기록의 휴식·관계·수면을 기타로 바꾸기(하지 않음, 옛 이름 그대로 표시).
- 카테고리 사용자 정의(나중).

### TODO
- 테스터 2주 뒤 기타 비율 확인. 크면 나눌지 다시 본다.
- ~~세부 항목별 계획 화면(D8)~~ → 디자인 리뷰 2(2026-11-18, left30-visual.md 4.3d). ~~저장 구조~~ → eng 리뷰 2 R7.

## Eng Review 2: 세부 항목·계획 저장 구조 (/plan-eng-review, 2026-11-17)

대상: 이 문서 "CEO 리뷰 2"의 D4b·D5~D8(집중으로 합침, 세부 항목 1단계, 항목별 계획). 범위: T1(로컬 v3) 전에 정할 저장 구조 하나. 구현 코드는 쓰지 않는다.

### Scope Challenge
- 이미 있는 것: eng 리뷰 1의 entry 설계에 `subject?`(글자) 칸이 있다(위 Section 1 다이어그램). `plan` 표는 `PRIMARY KEY (local_date, category)`(`application/db/schema.ts:25`, `CREATE TABLE plan (... PRIMARY KEY (local_date, category))`). Todo 계획 블록 `block`은 `category`와 `title`을 가진다(`application/db/schema.ts:72`, `title TEXT`; `application/record/todoLogic.ts:130` 제목 저장).
- 최소 변경: v3 마이그레이션(entry 만들기)에 함께 넣는다. 따로 v4를 만들지 않는다.
- 복잡도: 바뀌는 파일 약 6~8개[estimated](schema, entries, plan 저장·읽기, PlanTargetSheet, 시작 시트, 기록 시트), 새 표 1개. 8개 미만·새 서비스 0개라 구조 질문(B)은 건너뛴다.
- 결과: scope accepted as-is.

REALITY: premise-table pass unverified=0, 세 사실 모두 위 file:line application/db/schema.ts:25
REALITY: already-done pass entry·item 코드 없음(T1 전) application/db/schema.ts:10
REALITY: surface-check pass 새 CLI·HTTP 없음(W1 로컬) application/db/schema.ts:10
REALITY: binding-decisions pass CEO 리뷰 2 D4b·D5~D8, eng D1(entry Original)을 따름 docs/designs/left30-timer-modes.md:75
REALITY: numbers finding 파일 수는 [estimated] application/db/schema.ts:1
REALITY: deferred-asks pass 연결된 이슈 없음 TODO.md:1
REALITY: pr-count pass 한 PR(W1) application/db/schema.ts:10
REALITY: transaction-semantics pass v3 한 트랜잭션 안(기존 v1·v2와 같음) application/db/migrate.ts:29

### Findings
1. [CRITICAL] (confidence: 8/10) entry `subject?` 글자 칸만으로는 D8(항목별 계획)과 이름 바꾸기를 못 받친다. 계획이 이름 글자에 묶이면 이름을 고칠 때 계획·기록이 갈라진다. → R3
2. [CRITICAL] (confidence: 9/10) `application/db/schema.ts:25` `PRIMARY KEY (local_date, category)`라 같은 날 집중 계획을 항목별로 여러 줄 둘 수 없다. → R4
3. [INFORMATIONAL] (confidence: 7/10) `application/db/schema.ts:72` Todo 계획 블록은 `title` 글자를 쓴다. 세부 항목과 같은 뜻이라 따로 두면 계획 대비 실제에서 블록 제목과 항목이 이어지지 않는다. → R5
4. [INFORMATIONAL] (confidence: 8/10) CEO 리뷰 2는 옛 `work`·`self_dev`를 "표시와 합계에서 집중으로 본다"고 했다. entry는 v3에서 새로 만드는 표라, 옮길 때 `focus`로 바꿔 넣으면 읽는 곳마다 바꿀 필요가 없다. 동작이 같은 사실 정리라 질문하지 않는다(옛 slot 표와 서버는 그대로). Disposition: accepted(CEO 리뷰 2 데이터 항목의 구현).

## Decision ledger (eng 2)

### R3 (R6으로 대체): 세부 항목 저장
Finding: 1, CRITICAL, 8/10, entry 설계 `subject?`, reviewer: Claude
Plan baseline: eng D1 entry에 `subject?` 글자 칸(승인), CEO 리뷰 2 D5·D8
Runtime evidence: 코드 없음(T1 전)
Comparison grid:
| 선택 | 현재 | A 항목 표 | B 글자 칸 |
|---|---|---|---|
| 저장 | entry.subject 글자 | `item(id, category, name, hidden, last_used_at, client_updated_at)` + entry.item_id | entry.subject 글자 그대로 |
| 이름 바꾸기 | 없음 | item 한 줄만 고침 | 모든 entry·계획 글자를 고침 |
| 최근 칩 | 없음 | item.last_used_at 순 | entry에서 GROUP BY |
| 숨기기 | 없음 | hidden=1 | 불가 |
| W2 동기화 | 없음 | item 종류 하나 추가 | 이름 바꿀 때 많은 줄 전송 |
Question D1: 세부 항목을 따로 표(item)로 둘까요?
State: superseded
Actual answer: 사용자 "좀 더 db 최적화 가능할 것 같은데 다시 고민해봐"(첫 질문 "좀 더 디테일 하게 설명 해줘" 뒤 예시 item-storage.html)
Accepted scope: none

### R4 (R6으로 대체): 계획 표
Finding: 2, CRITICAL, 9/10, `application/db/schema.ts:25`
Plan baseline: plan(local_date, category, target_minutes), CEO 리뷰 2 D8
Comparison grid:
| 선택 | 현재 | A plan 표를 다시 만듦 | B 항목 계획 표를 따로 |
|---|---|---|---|
| 구조 | PK(local_date, category) | plan(local_date, category, item_id NULL, target_minutes), UNIQUE(local_date, category, IFNULL(item_id,'')) | plan 그대로 + plan_item(local_date, item_id, target_minutes) |
| 읽는 곳 | 1곳 | 1곳 | 2곳을 합쳐 읽음 |
| 옛 계획 | 그대로 | v3에서 옮기지 않음(CEO 리뷰 2: 무시) | 그대로 남음 |
Question D2: 계획 표를 항목 칸을 넣어 다시 만들까요?
State: superseded
Actual answer: 사용자 "d1부터 다시 설계"
Accepted scope: none

### R5 (R6으로 대체): Todo 계획 블록과 세부 항목
Finding: 3, INFORMATIONAL, 7/10, `application/db/schema.ts:72`
Plan baseline: block.title 글자(승인된 Todo 블록)
Comparison grid:
| 선택 | 현재 | A block.item_id 추가 | B title 그대로 |
|---|---|---|---|
| 블록 제목 | 글자 | 집중 블록이면 항목을 고름(item_id), 그 밖은 title | 글자 |
| 계획 대비 실제 | 카테고리 | 항목 단위로 이어짐 | 블록과 항목이 따로 |
Question D3: Todo 계획 블록도 세부 항목을 쓰게 할까요?
State: superseded
Actual answer: 사용자 "d1 부터 다시 설계"
Accepted scope: none

### R6: 모든 기록은 항목 하나를 가리킨다 (R3·R4·R5를 합침)
Finding: 1·2·3을 합침. 카테고리가 집중·운동·기타 셋이 되어 카테고리를 기본 항목으로 볼 수 있다. reviewer: Claude
Plan baseline: R3·R4·R5 A안들(답 없이 대체됨)
Runtime evidence: `application/db/schema.ts:25` plan PK, `:72` block title. 옛 slot.category 값 6개
Comparison grid:
| 선택 | 앞 설계(R3·R4·R5 A) | A 항목 하나 | B 앞 설계 |
|---|---|---|---|
| item | id, category, name, hidden, last_used_at | id(기본 항목은 고정 글자 focus·exercise·other·rest·relationship·sleep, 사용자 항목은 uuid), kind, name, hidden | 앞 설계 |
| entry | category + item_id(빈칸 가능) | item_id만, NOT NULL(세부 없으면 focus) | 앞 설계 |
| plan | (날짜, 카테고리, IFNULL(item_id,'')) | PK(local_date, item_id) | 앞 설계 |
| block | category + item_id + title | item_id만(옛 제목은 v3에서 같은 이름 항목으로) | 앞 설계 |
| 최근 칩 | last_used_at | entry에서 MAX(start_at) GROUP BY item_id | 앞 설계 |
| 인덱스 | entry(start_at) + 진행 중 부분 유일 | 같음 | 같음 |
| 옛 값 이전 | 카테고리 매핑 | slot.category를 그대로 item_id로(work·self_dev → focus) | 앞 설계 |
| 시기 | v3 | v3 | v3 |
Question D4: 기록·계획·할 일 블록이 모두 항목 하나만 가리키게 할까요? (예시 item-storage-v2.html)
State: superseded(R7에 그대로 포함)
Actual answer: 질문 거절 뒤 사용자 "db에 저장하는 방식은 중요한데, 좀 더 최적화 고민하고 정규화 통해서 낭비없는 백엔드 구축이 되었으면 좋겠는데. 인터넷도 찾아보고 해봐"
Accepted scope: R7 참고

### R7: 3차 정규화 (R6 + 남은 중복 7개 제거)
Finding: R6 설계에 남은 중복. reviewer: Claude. 예시 item-storage-v3.html
Evidence: uuid v4 키는 SQLite B-tree 끼워 넣기가 느려지고 v7은 일정함(andersmurphy.com 2026-06-05 측정, 1천만 줄), Immich 모바일 동기화 uuid v7, SQLite STRICT 표(3.37+), 계산이 잦으면 정수 시각(sqlite-users), Toggl 기록 → 프로젝트 → 세부 작업 구조. 규모: 하루 수십 줄, 1년 약 1만 줄[estimated]
Questions: D9 정규화 묶음, D10 일시정지 저장, D11 시각 형식
State: accepted
Actual answer: D9 "가. 다섯 가지 모두", D10 "가. 세션 한 줄 + 멈춤 표", D11 "가. 새 표는 정수 밀리초" (2026-11-18)
Accepted scope (로컬 v3, 한 트랜잭션, 새 표는 모두 STRICT):
```sql
item(id TEXT PK, parent_id TEXT NULL REFERENCES item(id), name TEXT NOT NULL,
     hidden INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL) STRICT, WITHOUT ROWID
  UNIQUE INDEX (IFNULL(parent_id,''), name)
  -- 기본 항목: focus·exercise·other(parent NULL), rest·relationship·sleep(parent NULL, hidden=1)
  -- 사용자 항목: id uuid v7, parent_id = 카테고리 id. 2단을 넘지 않게 저장 함수 한 곳에서 막는다
entry(id TEXT PK uuid v7, item_id TEXT NOT NULL REFERENCES item(id),
      how TEXT NOT NULL,  -- answered|continued|late|declared|batch|inferred(옛 자료)|stopwatch|pomodoro|timer (source와 타이머 방식을 합침, eng 3 R14로 고침)
      start_at INTEGER NOT NULL, end_at INTEGER NULL, planned_end_at INTEGER NULL,  -- 밀리초
      tz TEXT NOT NULL, note TEXT NULL, deleted INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL) STRICT
  INDEX (start_at); UNIQUE INDEX ((1)) WHERE end_at IS NULL AND deleted = 0
pause(entry_id TEXT REFERENCES entry(id) ON DELETE CASCADE, start_at INTEGER NOT NULL,
      end_at INTEGER NULL, PRIMARY KEY (entry_id, start_at)) STRICT, WITHOUT ROWID
plan_v3(local_date TEXT, item_id TEXT REFERENCES item(id), target_minutes INTEGER NOT NULL,
        updated_at INTEGER NOT NULL, PRIMARY KEY (local_date, item_id)) STRICT, WITHOUT ROWID
block: 다시 만든다. id, item_id, start_at, end_at(정수), tz, state, ended_how, deleted, updated_at.
       category·title·kind 칸을 뺀다. 옛 title은 같은 이름 항목으로 만들어 잇는다
```
- 저장하지 않고 계산: 카테고리 = `COALESCE(parent_id, id)`(항목은 메모리), 기록 분 = end − start − 멈춤 합, 뽀모도로 단계·집중 분(`focus_min` 칸 없앰), 멈춤 중 = 끝 없는 pause 줄, 최근 칩 = entry MAX(start_at) GROUP BY item_id(30일).
- 바뀌는 앞 결정: eng 리뷰 1 Section 1의 entry 칸 목록(category·subject·source·focus_min·client_updated_at → item_id·how·updated_at), "(추가, CONTROL·PAUSE) session_id 조각" 방식, 결정 장부 PAUSE의 "저장:" 부분. 화면 표시(1분·5분 기준)는 그대로이고, 시간표는 세션 구간에서 멈춘 구간을 빼서 그린다. 5분 이상 멈춘 틈의 알림 답은 겹침 계산에서 멈춘 구간을 빈 곳으로 본다.
- uuid v7: `lib/uuid.ts`에 생성 함수 추가(약 10줄). 형식은 36자 글자 그대로라 서버·동기화는 바뀌지 않는다.
- 시각 변환: 옛 slot·plan의 ISO 글자 ↔ 밀리초 변환은 `db/` 한 곳에 둔다. 이전은 `unixepoch(x) * 1000`.
- 지운 줄: W1에서는 동기화하지 않는 표라 바로 지운다. W2에서 서버가 받았다고 답한 지운 줄을 로컬에서 실제로 지운다.
- 하지 않는 것: uuid를 16바이트 BLOB로(서버·JSON·디버깅이 글자, 1년 약 200KB[estimated]), tz를 tz_change로 빼기(기록 한 줄만으로 날짜를 알아야 동기화가 단순), sync_queue 방식 바꾸기(W2 리뷰).
- 테스트: 기본 항목 id 상수와 DB 줄 일치, 2단 막기, 멈춤 두 번 세션의 분 합계, 진행 중·멈춤 중 판정, 옛 slot 이전 분 합계 같음(work·self_dev → focus), 할 일 블록 title → 항목, STRICT 지원 확인(`sqlite_version()` 3.37 이상).

## 디자인 리뷰 2 완료 요약 (세부 항목별 목표, 2026-11-18)

```
  +====================================================================+
  |         DESIGN PLAN REVIEW — COMPLETION SUMMARY                    |
  +====================================================================+
  | System Audit         | DESIGN.md 없음(D20, left30-visual.md가 대신), UI 범위 있음 |
  | Step 0               | 2/10, 일곱 관점 모두                         |
  | Pass 1  (Info Arch)  | 2/10 → 9/10 (D2 D4 D5 D6 D8)                 |
  | Pass 2  (States)     | 3/10 → 8/10 (D7 D9, 로딩·오류는 D30~D32)      |
  | Pass 3  (Journey)    | 3/10 → 8/10 (D10 D11 D12)                    |
  | Pass 4  (AI Slop)    | 7/10 → 7/10 (글꼴 미정, 11절 6a)              |
  | Pass 5  (Design Sys) | 6/10 → 8/10 (기존 시트·칩·알림 재사용)        |
  | Pass 6  (Responsive) | 2/10 → 8/10 (D3 D7 D13 D15)                  |
  | Pass 7  (Decisions)  | 15 resolved, 0 deferred                     |
  +--------------------------------------------------------------------+
  | NOT in scope         | written (3 items)                           |
  | What already exists  | written                                     |
  | TODOS.md updates     | 0 items proposed                            |
  | Approved Mockups     | 이미지 0(디자이너 키 없음), HTML 예시 1      |
  | Decisions made       | 15 added to plan                            |
  | Decisions deferred   | 0                                           |
  | Overall design score | 2/10 → 7/10                                 |
  +====================================================================+
```

- 결정: D2~D16(D1은 범위 선택). 내용은 left30-visual.md 4.3d. 사용자가 권장안과 다르게 고른 것: D3(바퀴 대신 휴대폰 숫자 키보드), D4(사용자 제안: 시트 대신 할 일 화면), D8(접기), D9(안내 한 줄), D12(두 길 모두).
- 외부 검토: Claude 에이전트 완료. Codex는 답을 냈지만 끝 표시 검사에 걸려 기록상 "검토 미완료"(내용은 질문에 참고). 공통 지적 다섯 개(항목 없는 집중, 입력 확정·취소·24시간, "정함", 첫 사용, 관리·순서·접근성)는 모두 질문으로 정함.
- 시안: 디자이너 이미지 도구는 키가 없어 쓰지 못함(`$D setup`). 브라우저 예시 `~/.gstack/projects/wonseokjee-LEFT30_APP/designs/item-plan-20261118/item-plan.html`.
- 전체 점수 7은 글꼴(11절 6a, 방 스타일 뒤) 때문이다. 이 리뷰 범위의 결정은 모두 정했다.

**NOT in scope**
- 운동 세부 항목(D14, 테스터 요청 시).
- 목표와 할 일 블록을 자동으로 맞추기(목표를 바꿔도 블록은 그대로, 반대도 그대로).
- 지난 날짜 목표 고치기(오늘만).

**What already exists**
- 할 일 화면 맨 위 줄·하루 막대·블록 목록(`TodoScreen.tsx`), [되돌리기] 알림, 2초 저장 실패 알림(D31), 불러오기·오류(D30·D32), 최근 칩(R7 쿼리), 시작 시트의 [+ 새 항목], 아침 계획 제안(E1).

## Eng Review 3: 할 일 목표(T9) 구현 구조 (/plan-eng-review, 2026-11-18)

대상: `docs/designs/left30-visual.md` 4.3d(디자인 리뷰 2 D2~D16)와 이 문서의 T9. 범위: 목표 줄·추가 시트·항목 관리의 구현 구조, R7 저장 구조와의 연결, 테스트. 구현 코드는 쓰지 않는다.

### Scope Challenge
- 이미 있는 것:
  - 목표 읽기 `planRowsOn`(`application/record/todoLogic.ts:282`), 하루 전체 쓰기 `savePlan`(`application/db/records.ts:48`, "계획에서 뺀 카테고리는 0으로 저장한다(삭제 없음)").
  - 할 일 맨 위 한 줄 `totalsLine`(`todoLogic.ts:264`), 아침 제안 `takeMorningOffer`·`acceptSame`(`application/record/morningPlan.ts:24,52`).
  - 홈 계획 대비 실제 `buildPva`(`application/record/planVsActual.ts:27`).
  - `PlanTargetSheet`를 여는 곳 세 군데: `TodoScreen.tsx:291`, `components/home/PlanVsActual.tsx:113`, `components/record/RecordSheet.tsx:74`.
- 복잡도: 고치는 파일 약 8개[estimated], 새 모듈 3개 → 구조 질문(B).
- Scope record: feature answers: 없음(기능 삭감 제안 없음); structure: **B Smaller arrangement** (eng 3 D1 답 "B) Smaller arrangement (recommended)", 2026-11-18); accepted scope: 새 파일 3개.
  - `record/items.ts`: 항목 만들기·이름 바꾸기·숨기기·같은 이름 고르기.
  - `components/todo/GoalSection.tsx`: 목표 줄·시·분 입력·접기.
  - `components/todo/GoalAddSheet.tsx`: 추가 시트, 두 번째 화면이 [항목 관리].
  - 목표 읽기·쓰기·24시간 검사는 `record/todoLogic.ts` 한 곳에 둔다. `PlanTargetSheet`와 하루 전체 쓰기 `savePlan`은 지운다.
  - pending remedies: R8(목표 순서), R9(목표 지우기), R10(이름 바꿀 때 같은 이름), R11(아침 제안의 어제 실제).
- 결과: scope accepted as-is.

REALITY: premise-table pass unverified=0, 위 "이미 있는 것" 다섯 줄 모두 file:line 확인 application/db/records.ts:47
REALITY: already-done pass T9 코드 없음(목표 줄·items.ts 없음, 마지막 todo 변경은 45b476d) application/components/todo/TodoScreen.tsx:43
REALITY: surface-check pass 새 CLI·HTTP 없음, 숫자 키보드 `keyboardType="number-pad"`는 React Native TextInput 문서의 공통 값 application/components/todo/PlanTargetSheet.tsx:1
REALITY: binding-decisions pass eng D1 Original(entry), R7 저장 구조, 디자인 리뷰 2 D2~D16을 따름 docs/designs/left30-visual.md:132
REALITY: numbers finding 파일 수·줄 수는 [estimated], TodoScreen 449줄·todoLogic 294줄은 [measured: wc -l] application/record/todoLogic.ts:294
REALITY: deferred-asks pass 연결된 이슈 없음 TODO.md:1
REALITY: pr-count pass 한 PR(W1, T1 뒤) application/db/schema.ts:10
REALITY: transaction-semantics pass 목표 쓰기와 24시간 검사는 한 트랜잭션(기존 savePlan과 같은 db.transaction) application/db/records.ts:54

### Findings (Scope Challenge·Section 1 아키텍처)
1. [CRITICAL] (confidence: 9/10) R7 `plan_v3(... PRIMARY KEY (local_date, item_id)) STRICT, WITHOUT ROWID`(이 문서 R7 Accepted scope)에는 순서 칸이 없다. 디자인 D8 "추가한 순서대로 고정, 어제와 동일은 어제 순서"를 지킬 값이 없다. WITHOUT ROWID라 rowid 순서도 없고, updated_at은 고칠 때마다 바뀐다. → R8
2. [CRITICAL] (confidence: 8/10) `application/db/records.ts:47` "계획에서 뺀 카테고리는 0으로 저장한다(삭제 없음)". 디자인 D7 "비우면 그 목표가 빠진다 + [되돌리기]"를 항목 줄 하나 단위로 할 때 줄을 지울지 0으로 둘지 정해지지 않았다. → R9
3. [INFORMATIONAL] (confidence: 7/10) 디자인 D12·D13은 새로 만들 때 같은 이름만 정했다. 이름 바꾸기로 이미 있는 이름("영어" → "보고서")을 고르면 R7 `UNIQUE INDEX item_name ON item (IFNULL(parent_id,''), name)`에 걸려 저장이 실패한다. → R10
4. [INFORMATIONAL] (confidence: 8/10) `application/record/morningPlan.ts:42` `SELECT slot_start, tz, category FROM slot ...`와 `:48` `targets[s.category] = (targets[s.category] ?? 0) + 30`: 어제 계획이 없을 때 어제 실제로 목표를 만드는 규칙(E1)이 카테고리·30분 칸 기준이다. 항목 기준으로 바꿀 때 기타·옛 카테고리와 분 단위를 정해야 한다. → R11
5. [INFORMATIONAL] (confidence: 9/10) 같은 일을 하는 두 길(레드 플래그 6): 하루 전체 쓰기 `savePlan`(`records.ts:48`)과 새 줄 단위 목표 쓰기가 함께 남으면 안 된다. `PlanTargetSheet.tsx`, `morningPlan.ts:53` `await savePlan(...)`, `RecordSheet.tsx:74`를 새 쓰기로 옮기고 `savePlan`은 지운다. Disposition: accepted(D1 구조의 필수 구현, 질문 없음).

## Decision ledger (eng 3)

### R8: 목표 순서 저장
Finding: 1, CRITICAL, 9/10, R7 plan_v3 정의(이 문서 "### R7" Accepted scope), reviewer: Claude
Plan baseline: R7 plan_v3(local_date, item_id, target_minutes, updated_at), 디자인 D8 "추가한 순서 고정, 어제와 동일은 어제 순서" (사용자 "나. 4줄 넘으면 접기")
Runtime evidence: 코드 없음(T1 전)
Comparison grid:
| 선택 | 현재 | A position 칸 | B 항목 처음 쓴 순서 |
|---|---|---|---|
| 저장 | 순서 없음 | plan_v3에 `position INTEGER NOT NULL` | 칸 없음, item을 처음 쓴 시각(entry MIN start_at) 순 |
| 추가 | - | 그날 MAX(position)+1 | - |
| 어제와 동일 | - | 어제 position 그대로 복사 | 같은 규칙이라 저절로 비슷 |
| D8 지킴 | 못 지킴 | 지킴 | 못 지킴(추가 순서가 아님, 기록하면 바뀜) |
| 그 밖 R7 | 그대로 | 그대로 | 그대로 |
Question D2:
D2 — 목표 줄의 순서를 어떻게 저장할까요?
Project/branch/task: refactor/architecture, T9 목표 줄(디자인 D8).
ELI10: 디자인에서 목표 줄은 '추가한 순서'로 고정하고, 어제와 동일은 어제 순서를 따르기로 했습니다. 그런데 앞서 정한 목표 표(plan_v3)에는 순서를 적을 칸이 없습니다. 이 표는 줄 번호도 없는 형식(WITHOUT ROWID)이고, 고친 시각은 고칠 때마다 바뀌어 순서로 쓸 수 없습니다.
Stakes if we pick wrong: 목표를 고칠 때마다 줄 순서가 바뀌어, 디자인에서 막으려던 '줄이 뛰는' 일이 생깁니다.
Recommendation: A because 순서는 그날 그 목표 줄의 사실이라 같은 줄에 정수 하나로 두는 것이 정규화에도 맞고, 다른 방법으로는 D8을 지킬 수 없습니다.
Completeness: A=10/10, B=4/10
Pros / cons:
A) position 칸 하나 추가 (recommended)
  ✅ 추가할 때 그날 가장 큰 번호 + 1, 어제와 동일은 어제 번호 그대로 복사해 D8을 정확히 지킵니다.
  ✅ 정수 한 칸(1~2바이트)이라 낭비가 거의 없고, 고쳐도 순서는 그대로입니다.
  ❌ 목표를 쓰는 함수가 번호를 매겨야 하고, 그 규칙을 테스트로 묶어야 합니다. (사람: ~1시간 / CC: ~5분)
B) 칸 없이 계산
  ✅ 표에 칸이 늘지 않습니다.
  ✅ 항목을 처음 쓴 순서처럼 계산할 수는 있습니다.
  ❌ 추가한 순서가 아니고, 기록을 하면 순서가 바뀌어 D8을 지키지 못합니다.
Net: 정수 한 칸으로 디자인 결정을 지키느냐, 칸을 아끼고 순서가 흔들리게 두느냐.
Header: 목표 순서
Options:
A) position 칸 추가 (recommended)
plan_v3에 position INTEGER NOT NULL. 추가 = 그날 최대 + 1, 어제와 동일 = 어제 번호 복사. 고쳐도 순서 그대로. (사람: ~1시간 / CC: ~5분)
B) 칸 없이 계산
칸을 늘리지 않고 항목을 처음 쓴 순서로 계산. 추가 순서가 아니고 기록하면 바뀌어 D8을 지키지 못함.

State: approved
Actual answer: "A) position 칸 추가 (recommended)" (eng 3 D2, 2026-11-18)
Accepted scope: plan_v3에 `position INTEGER NOT NULL`을 더한다(R7 표 정의에 반영, T1). 목표 추가는 그날 MAX(position)+1, 어제와 동일은 어제 position을 그대로 복사한다. 시간을 고쳐도 position은 바뀌지 않는다. 읽기는 `ORDER BY (item_id IN ('focus','exercise')), position`(항목 없는 집중·운동은 맨 아래, D8, Codex 지적 4 사실 정정). 테스트: 추가 순서, 고친 뒤 순서 유지, 어제와 동일 순서 복사, 운동을 먼저 넣어도 맨 아래.
History: none

### R9: 목표 지우기
Finding: 2, CRITICAL, 8/10, `application/db/records.ts:47`, reviewer: Claude
Plan baseline: 디자인 D7 "두 칸을 비우거나 0으로 저장하면 그 날짜의 목표만 빠진다, [되돌리기]". 지금 코드는 "계획에서 뺀 카테고리는 0으로 저장한다(삭제 없음)". R8 position 승인됨. R7 "지운 줄: W1에서는 동기화하지 않는 표라 바로 지운다. W2에서 서버가 받았다고 답한 지운 줄을 로컬에서 실제로 지운다".
Runtime evidence: `records.ts:56` `target_minutes: targets[category] ?? 0`, 동기화 큐에는 지우기 종류가 없다(`records.ts:4` `QueueKind = 'slot' | 'plan' | 'event' | 'block'`, plan은 덮어쓰기만)
Comparison grid:
| 선택 | 현재 | A 0으로 둠 | B 줄을 지움 | C 0으로 표시 후 정리 |
|---|---|---|---|---|
| 사용자 화면 | - | 줄이 빠지고 [되돌리기] | 같음 | 같음 |
| 지우기 | 0으로 덮어씀(하루 전체) | 그 줄 target_minutes=0, 계속 남김 | DELETE | 그 줄 target_minutes=0, 큐에 덮어쓰기로 보냄 |
| 정리 | - | 없음 | - | W1: 큐에 넣은 뒤 로컬 줄 바로 지움. W2: 서버가 받았다고 답하면 로컬에서 지움, 서버는 0을 받으면 서버 줄을 지움 |
| 되돌리기 | - | 원래 분 다시 씀 | 같은 position으로 다시 INSERT | 같은 position으로 다시 씀(줄이 지워졌으면 다시 넣음) |
| 동기화 | 덮어쓰기 | 덮어쓰기 그대로 | 지우기 종류 새로 필요 | 덮어쓰기 그대로(0 = 지움 표시) |
| 남는 줄 | 하루 6줄 | 지운 목표 0줄이 영구히 | 없음 | 서버 응답 뒤 없음 |
| R8 position | 승인 | 그대로 | 그대로 | 그대로 |
Question D3:
D3 — 목표를 지울 때 줄을 남길까요, 지울까요? (다시 묻기)
Project/branch/task: refactor/architecture, T9 목표 줄(디자인 D7).
ELI10: 사용자 화면은 세 안 모두 같습니다(줄이 빠지고 [되돌리기]). 다른 것은 저장과 동기화입니다. A는 0인 줄을 영원히 남기고, B는 바로 지우는 대신 서버에 '지우기'를 따로 알려야 합니다. C는 R7에서 기록에 정한 규칙과 같습니다. 일단 0으로 표시해 덮어쓰기로 보내고, 서버가 받은 뒤 휴대폰과 서버 양쪽에서 실제로 지웁니다.
Stakes if we pick wrong: 지운 목표가 쌓이거나(A), 다른 기기에서 지운 목표가 되살아납니다(B에서 지우기 전송을 빠뜨릴 때).
Recommendation: C because 결국 목표가 있는 줄만 남아 낭비가 없고, 동기화는 덮어쓰기 하나로 끝나며, 기록(entry)의 지운 줄 규칙과 같아 규칙이 하나입니다.
Completeness: A=7/10, B=8/10, C=10/10
Pros / cons:
A) 0으로 둠
  ✅ 동기화는 덮어쓰기 하나로 끝나, 지운 목표가 되살아날 일이 없습니다.
  ✅ 되돌리기가 가장 단순합니다(같은 줄에 원래 분).
  ❌ 지운 목표 줄이 휴대폰과 서버에 영원히 남습니다.
B) 줄을 지움
  ✅ 표에 목표가 있는 줄만 남습니다.
  ✅ 읽을 때 0을 걸러낼 필요가 없습니다.
  ❌ W2에서 '지우기' 동기화 종류를 새로 만들어야 하고, 빠뜨리면 다른 기기에서 되살아납니다.
C) 0으로 표시 후 정리 (recommended)
  ✅ 서버가 받은 뒤 양쪽에서 실제로 지워 결국 목표가 있는 줄만 남습니다.
  ✅ 동기화는 덮어쓰기 그대로이고, 기록의 지운 줄 규칙(R7)과 같아 규칙이 하나입니다.
  ❌ 큐 응답 뒤 정리하는 코드가 한 군데 늘고, 서버는 0을 받으면 지우는 규칙을 W2에 넣어야 합니다. (사람: ~2시간 / CC: ~10분)
Net: 단순함(A), 즉시 깔끔함(B), 결국 깔끔함 + 단순한 동기화(C).
Header: 목표 지우기
Options:
C) 0으로 표시 후 정리 (recommended)
지우면 0으로 덮어써 큐에 보냄. W1은 바로 로컬 줄 지움, W2는 서버가 받은 뒤 지움. 서버는 0을 받으면 서버 줄 지움. 기록의 지운 줄 규칙(R7)과 같음. (사람: ~2시간 / CC: ~10분)
A) 0으로 둠
그 줄만 target_minutes=0으로 영구히 남김. 읽기 함수 한 곳에서 0을 거름. 동기화는 덮어쓰기 그대로. (사람: ~1시간 / CC: ~5분)
B) 줄을 지움
DELETE로 바로 없앰. 되돌리기 = 같은 position으로 다시 넣음. W2에 서버 '지우기' 동기화가 새로 필요.

State: approved
Actual answer: "B) 줄을 지움" (eng 3 D3 다시 묻기, 2026-11-18, 권장 C를 고르지 않음)
Accepted scope: 목표를 비우거나 0으로 저장하면 그 plan_v3 줄을 DELETE한다. [되돌리기]는 지운 줄의 분과 position을 그대로 다시 넣는다. 그 position이 차 있으면 그 이상 줄의 position을 1씩 민다(Codex 지적 4 사실 정정). 테이블에는 목표가 있는 줄만 있으므로 읽기에서 0을 거르지 않는다(0은 저장하지 않음). W2 요구: 서버 동기화에 목표 지우기를 전할 방법(지우기 종류 또는 지운 줄 표시)을 새로 만든다. 빠뜨리면 다른 기기에서 되살아나므로 W2 eng 리뷰 항목으로 둔다. W1에서는 plan_v3를 서버로 보내지 않는다(서버가 모르는 표). 테스트: 지우기 뒤 줄 없음, 되돌리기 뒤 같은 분·같은 position, 같은 날 다시 추가하면 맨 아래.
History: 첫 질문(A 0으로 둠 / B 줄을 지움, 권장 A)에 사용자 "유저가 보기에는 둘다 상관 없는 건가?? 서버상으로는 b가 좋은거고/". 화면은 같다고 답하고, R7 지운 줄 규칙과 같은 C를 더해 다시 물었다.

### R10: 이름을 이미 있는 이름으로 바꿀 때
Finding: 3, INFORMATIONAL, 7/10, R7 `CREATE UNIQUE INDEX item_name ON item (IFNULL(parent_id,''), name)`, reviewer: Claude
Plan baseline: 디자인 D12(길게 눌러·[항목 관리]에서 이름 바꾸기), D13(새로 만들 때 같은 이름이면 그 항목을 고름, 10자). 이름 바꾸기의 같은 이름은 정해지지 않음.
Runtime evidence: 코드 없음(T1 전). 유일 인덱스가 있어 그대로 두면 저장이 오류로 끝난다.
Comparison grid:
| 선택 | 현재 | A 막고 알림 | B 두 항목 합치기 |
|---|---|---|---|
| "영어"를 "보고서"로(보고서 있음) | 정해지지 않음(DB 오류) | 저장하지 않고 입력 칸 아래 "이미 있는 이름이에요" | 영어의 기록·목표·블록을 보고서로 옮기고 영어 항목을 지움 |
| 숨긴 항목과 같은 이름 | - | 같게 막음("숨긴 항목에 있어요") | 숨긴 항목과 합침 |
| 같은 날 두 항목 모두 목표 | - | 해당 없음 | 두 목표를 더해야 함(24시간 검사 다시) |
| 되돌리기 | - | 필요 없음 | 합치기 되돌리기가 어려움 |
| R8·R9 | 승인 | 그대로 | 그대로 |
Question D4:
D4 — 항목 이름을 이미 있는 이름으로 바꾸려 하면?
Project/branch/task: refactor/architecture, T9 항목 관리(디자인 D12·D13).
ELI10: 새 항목을 만들 때 같은 이름이면 그 항목을 고르기로 했습니다. 그런데 '이름 바꾸기'에서 '영어'를 이미 있는 '보고서'로 바꾸려 하면 어떻게 할지는 정하지 않았습니다. 같은 이름 두 개는 저장 구조가 막습니다.
Stakes if we pick wrong: 정하지 않으면 저장 오류(D31 2초 알림)만 뜨고 왜 안 되는지 알 수 없습니다. 합치기를 고르면 기록을 옮기는 일이 되돌리기 어렵습니다.
Recommendation: A because 이름 바꾸기에서 같은 이름은 대부분 실수이고, 합치기는 기록을 옮기는 되돌리기 어려운 일이라 이번 단계에 넣을 만큼 자주 일어나지 않습니다.
Note: options differ in kind, not coverage — no completeness score.
Pros / cons:
A) 막고 알림 (recommended)
  ✅ 입력 칸 아래 '이미 있는 이름이에요'로 이유를 바로 알고 다른 이름을 고칩니다.
  ✅ 기록을 옮기지 않아 되돌릴 일이 없고, 코드는 유일 검사 하나입니다.
  ❌ 실제로 두 항목을 하나로 합치고 싶은 사람은 할 수 없습니다(나중 기능). (사람: ~30분 / CC: ~5분)
B) 두 항목 합치기
  ✅ '영어'와 '영어공부'처럼 실수로 둘이 된 항목을 하나로 모을 수 있습니다.
  ✅ 옛 기록 합계가 한 항목으로 이어집니다.
  ❌ 기록·목표·블록을 옮기고 같은 날 목표를 더하는 일이라 되돌리기 어렵고, 확인 창과 테스트가 많이 늘어납니다. (사람: ~1일 / CC: ~45분)
Net: 실수를 막는 작은 규칙이냐, 합치기라는 새 기능이냐.
Header: 같은 이름 바꾸기
Options:
A) 막고 알림 (recommended)
저장하지 않고 입력 칸 아래 "이미 있는 이름이에요"(숨긴 항목이면 "숨긴 항목에 있어요"). 기록은 그대로. (사람: ~30분 / CC: ~5분)
B) 두 항목 합치기
확인 뒤 기록·목표·블록을 기존 항목으로 옮기고 바꾸던 항목을 지움. 같은 날 목표는 더함. (사람: ~1일 / CC: ~45분)

State: approved
Actual answer: "A) 막고 알림 (recommended)" (eng 3 D4, 2026-11-18)
Accepted scope: `record/items.ts`의 이름 바꾸기는 앞뒤 빈칸을 지운 이름이 같은 카테고리의 다른 항목(숨긴 것 포함)과 같으면 저장하지 않고 이유를 돌려준다. 화면은 입력 칸 아래 "이미 있는 이름이에요"(숨긴 항목이면 "숨긴 항목에 있어요")를 보인다. 자기 이름 그대로면 아무 일도 하지 않는다. 합치기는 하지 않는다(NOT in scope). 테스트: 같은 이름·숨긴 항목 이름·자기 이름·10자 초과.
History: none

### R11: 아침 제안에서 어제 계획이 없을 때 어제 실제로 목표 만들기
Finding: 4, INFORMATIONAL, 8/10, `application/record/morningPlan.ts:42`, `:48`, reviewer: Claude
Plan baseline: 재출시 설계 E1(승인) "[어제와 동일]: 어제 plan 복사. 어제 plan이 없으면 어제 실제 기록으로 카테고리별 시간을 만든다(inferred 제외)", "어제 기록이 8칸 미만이면 제안 없이 바로 새로 짜기"(`morningPlan.ts:8~11`). 디자인 D11(할 일 화면 [어제와 동일]은 어제 목표가 있을 때만).
Runtime evidence: `morningPlan.ts:42` `SELECT slot_start, tz, category FROM slot WHERE source != 'inferred' ...`, `:48` `targets[s.category] = (targets[s.category] ?? 0) + 30`, `MIN_ACTUAL_SLOTS = 8`
Comparison grid:
| 선택 | 현재 | A 항목 기준으로 이어 감 | B 어제 실제는 쓰지 않음 |
|---|---|---|---|
| 어제 목표 있음 | 복사 | 어제 목표 줄 복사(R8 position 그대로) | 같음 |
| 어제 목표 없음 | 어제 slot 카테고리 × 30분 | 어제 entry를 항목별로 합침. 기타·옛 휴식·관계·수면은 뺌. 분은 5분 단위로 반올림, 5분 미만 항목은 뺌. 순서는 많이 한 순 | 제안 없이 [새로 짜기]만 |
| 제안 기준 | 어제 8칸(4시간) 이상 | 위 규칙으로 남은 합 4시간 이상 | - |
| 할 일 화면 [어제와 동일](D11) | - | 어제 목표가 있을 때만(그대로) | 같음 |
| R8·R9·R10 | 승인 | 그대로 | 그대로 |
Question D5:
D5 — 어제 목표가 없을 때 아침 제안이 어제 실제 기록으로 목표를 만들까요?
Project/branch/task: refactor/architecture, T9 아침 계획 제안(E1) 옮기기.
ELI10: 지금 아침 제안은 어제 계획이 없으면 어제 실제 기록(30분 칸의 카테고리)으로 목표를 만들어 [어제와 동일]로 보여 줍니다. 이제 기록은 분 단위이고 목표는 세부 항목 단위라 이 규칙을 옮겨야 합니다. 옮기려면 기타·옛 카테고리를 빼고 분을 정리하는 규칙이 필요합니다.
Stakes if we pick wrong: 기타 2시간 13분 같은 이상한 목표가 제안되거나(규칙 없이 옮길 때), 어제 계획 없이 쓰던 사람이 매일 아침 목표를 처음부터 넣어야 합니다(없앨 때).
Recommendation: A because 승인된 E1의 동작(계획 없는 사람도 [어제와 동일] 한 번으로 시작)을 그대로 지키고, 바꾸는 것은 항목 단위로 옮기는 규칙뿐입니다.
Completeness: A=9/10, B=6/10
Pros / cons:
A) 항목 기준으로 이어 감 (recommended)
  ✅ 어제 계획 없이 기록만 한 사람도 아침에 [어제와 동일] 한 번으로 목표가 생깁니다(E1 그대로).
  ✅ 기타·옛 카테고리를 빼고 5분 단위로 반올림해 '영어 1h 15m'처럼 고치기 쉬운 값이 됩니다.
  ❌ 규칙 다섯 개(뺄 것, 반올림, 5분 미만, 4시간 기준, 순서)를 테스트로 묶어야 합니다. (사람: ~2시간 / CC: ~10분)
B) 어제 실제는 쓰지 않음
  ✅ 아침 제안이 '어제 목표 복사'만 남아 가장 단순합니다.
  ✅ 테스트할 규칙이 줄어듭니다.
  ❌ 승인된 E1 동작이 줄어, 어제 목표가 없는 날에는 [새로 짜기]만 나옵니다.
Net: 승인된 아침 제안을 항목 단위로 옮기느냐, 이참에 줄이느냐.
Header: 어제 실제로 목표
Options:
A) 항목 기준으로 이어 감 (recommended)
어제 entry를 항목별로 합침. 기타·옛 휴식·관계·수면 빼고, 5분 단위 반올림, 5분 미만 뺌, 합 4시간 이상일 때 제안, 많이 한 순. (사람: ~2시간 / CC: ~10분)
B) 어제 실제는 쓰지 않음
어제 목표가 있을 때만 [어제와 동일] 제안. 없으면 [새로 짜기]만. E1 동작이 줄어듦.

State: approved
Actual answer: "A) 항목 기준으로 이어 감 (recommended)" (eng 3 D5, 2026-11-18)
Accepted scope: `takeMorningOffer`는 어제 목표 줄이 있으면 그대로 복사(position 포함). 없으면 어제 entry(local_date 기준, 지운 것 제외)를 항목별로 합친다. 기타(`other`)와 숨긴 옛 카테고리(rest·relationship·sleep)는 빼고, 분은 5분 단위로 반올림, 5분 미만 항목은 뺀다. 남은 합이 240분(옛 8칸) 이상이면 제안하고, position은 많이 한 순(같으면 item id 순)이다. 아니면 [새로 짜기]. 테스트: 다섯 규칙과 경계(239/240분, 2분/3분 반올림).
History: none

### Section 1: 아키텍처
```
  할 일 탭                         추가 시트                 시작·기록 시트(T5, T2)
  GoalSection.tsx ─────────┐      GoalAddSheet.tsx ──┐      칩 [+ 새 항목]·길게 누르기
   목표 줄·시분 입력·접기    │       추가 / [항목 관리]  │              │
                            ▼                         ▼              ▼
              record/todoLogic.ts (목표의 주인)     record/items.ts (항목의 주인)
               goalsOn(date)  ORDER BY position     createOrPick(name)  같은 이름 고름·숨김 풂
               setGoal(date,item,min) 24시간 검사    rename(id,name)     같은 이름 막음(R10)
               removeGoal → DELETE(R9), undo       hide/unhide(id)
               copyGoals(어제) / fromActual(R11)    recentItems() (R7 쿼리)
               actualByItem(date)  ← 목표 줄·홈 막대·아침 제안이 함께 씀
                            │                         │
                            ▼                         ▼
                 plan_v3(local_date,item_id,     item(id,parent_id,name,hidden)
                  target_minutes,position,updated_at)   entry(item_id,...) pause
  홈 PlanVsActual(buildPva) ── goalsOn + actualByItem, 진행률 높은 두 줄(D37), 항목 없는 집중은 "집중"(D16)
  아침 제안(RecordSheet) ── [어제와 동일] = copyGoals/fromActual, [새로 짜기] = 할 일 탭 + 추가 시트
```
- 두 모양: (가) 항목 쓰기를 todoLogic에 함께 둠 (나) items.ts로 따로 둠. 항목은 시작 시트·기록 시트·추가 시트 세 곳이 쓰고, 목표와 수명이 달라(숨겨도 목표·기록은 남음) (나)를 고른다(D1 B).
- 레드 플래그:
  - (6) 두 길: 하루 전체 쓰기 `savePlan`은 지우고, 부르던 세 곳을 `setGoal`·`copyGoals`로 옮긴다(발견 5, accepted).
  - (8) 손으로 맞춘 목록: 기본 항목 id 상수와 DB 줄은 R7 테스트로 묶었다.
  - (2) 정보 새어 나감: "실제 분" 계산을 목표 줄·홈 막대·아침 제안이 따로 하지 않게 `actualByItem` 하나로 둔다(같은 동작의 구현, 질문 없음).
- 실패 하나: 목표를 고치는 중 같은 날 다른 줄도 고치는 일은 한 화면이라 없다. 24시간 검사는 `setGoal` 트랜잭션 안에서 다른 줄 합 + 새 값으로 한다.

### Section 2: 코드 품질
No issues found. 발견 5(두 길 정리)와 `actualByItem` 하나로 두기는 위에 적었다. 새 공용 함수는 만들지 않는다. 시·분 입력은 GoalSection 안에서만 쓴다.

### Section 3: 테스트
```
CODE PATHS                                              USER FLOWS
[+] record/todoLogic.ts                                 [+] 할 일 목표
  ├── goalsOn            [GAP] position 순, 0 없음          ├── [GAP] 목표 누름 → 시·분 → 완료 = 저장
  ├── setGoal            [GAP] 새 줄 = 최대+1, 고쳐도 자리    ├── [GAP] 뒤로가기 = 취소
  │                      [GAP] 24시간 초과 거절(남은 분)      ├── [GAP] 비움 → 줄 빠짐 → [되돌리기] 같은 자리
  ├── removeGoal/undo    [GAP] DELETE 뒤 되돌리기 같은 분·자리 ├── [GAP] 4줄 넘으면 접기·추가한 줄 보이게 펼침
  ├── copyGoals          [GAP] 어제 순서 그대로              ├── [GAP] 목표 0개: 안내 + [어제와 동일](어제 목표 있을 때만)
  ├── fromActual(R11)    [GAP] 기타·옛 빼기, 5분 반올림,      └── [GAP] 추가 시트 연달아 추가, 넣은 칩 빠짐
  │                             5분 미만 빼기, 240분 경계    [+] 항목
  └── actualByItem       [GAP] 항목 없는 집중은 focus만,      ├── [GAP] 같은 이름 새로 만들기 = 고름 + 숨김 풂
                                멈춘 시간 빼기, 진행 중 포함  ├── [GAP] 이름 바꾸기 같은 이름 막음(R10)
[+] record/items.ts                                       └── [GAP] 숨기면 최근 칩에서만 빠짐
  ├── createOrPick       [GAP] 빈칸 지우기, 10자, 같은 이름   [+] 홈
  ├── rename             [GAP] 같은 이름·숨긴 이름·자기 이름   └── [GAP] 진행률 높은 두 줄, "집중" 표기
  └── hide/unhide        [GAP]
[+] record/planVsActual.ts buildPva  [★★ 있음, 카테고리 기준] → 항목 기준으로 다시 씀
[+] record/morningPlan.ts            [★★ 있음, slot 기준] → R11로 다시 씀
COVERAGE: 0/22 새 경로(T9 전)  |  기존 planVsActual.test.ts·morningPlan.test.ts는 다시 씀
```
- 테스트 파일: `record/todoLogic.test.ts`(goals 부분 새로), `record/items.test.ts`(새), `record/planVsActual.test.ts`·`record/morningPlan.test.ts`(다시 씀). 모두 `test/nodeDb.ts`로 실제 SQLite.
- 화면 흐름(입력·접기·되돌리기)은 에뮬레이터에서 손으로 확인한다(이 앱에 화면 자동 테스트 틀이 없음).
- 없어지는 테스트: `PlanTargetSheet` 관련 없음(테스트 파일 없음). `morningPlan.test.ts`의 slot 기준 사례, `planVsActual.test.ts`의 카테고리 6개 순서 사례는 항목 기준으로 바꾼다.
- 회귀 계약: 아침 제안 E1(15시 전 첫 진입 한 번, 오늘 목표가 있으면 띄우지 않음)과 S2용 `plan_vs_actual_viewed` 하루 한 번은 그대로 지킨다. 기존 테스트 사례를 옮겨 유지한다.

### Section 4: 성능
No issues found(Codex 지적 1은 R12로 처리). 하루 목표 줄 몇 개, entry는 그날과 겹치는 줄(하루 수십 줄)을 읽는다(R12). 진행 중 타이머가 있으면 목표 줄의 실제 분은 화면이 보이는 동안 1분마다 다시 계산한다(새 조회 없이 진행 중 줄만 더함).


### Outside Voice (Codex, 2026-11-18, completed)
Codex는 저장소 읽기 명령이 정책에 막혀 코드 원문 대신 계획만 보고 답했다. 지적 5개:
1. [High] 날짜별 실제 집계가 자정을 넘는 세션을 놓친다(`entry(start_at)` 당일 범위만 읽으면 어제 시작한 세션이 빠짐). → R12
2. [High] 24시간 제한이 `setGoal`에만 있다. 되돌리기·어제 복사·어제 실제(반올림 483+483+474 → 485+485+475=1445)로 넘을 수 있다. → R13
3. [High] E1의 "inferred 제외"를 새 구조에서 지킬 수 없다. R7 `how` 값(answered|filled|stopwatch|pomodoro|timer)에 inferred가 없다. 확인 결과 옛 `SlotSource = 'answered' | 'continued' | 'late' | 'inferred' | 'declared' | 'batch'`(`application/db/types.ts:38`)인데 R7 이전은 `source`를 그대로 `how`에 넣는다. R7의 how 목록이 옛 값 다섯 개를 빠뜨렸다. → R14
4. [Medium] `ORDER BY position`만으로는 D8 "항목 없는 집중·운동은 맨 아래"가 안 된다. 되돌리기는 position이 겹칠 수 있다. → 사실 정정(질문 없음): 읽기는 `ORDER BY (item_id IN ('focus','exercise')), position`. 되돌리기는 지운 position으로 다시 넣되, 그 자리가 차 있으면 그 이상 줄의 position을 1씩 민다(D7 "같은 자리" 유지). R8·R9 Accepted scope에 덧붙인다.
5. [Medium] 최근 칩은 30일 안에 기록한 항목만 보여, 기록 없이 만든 항목이나 오래된 항목은 추가 시트에서 고를 수 없다(이름을 다시 쳐야 함). → R15

### R12: 자정을 넘는 세션의 하루 몫
Finding: Codex 1, High, Section 4 "`entry(start_at)` 범위로 읽는다", reviewer: Codex
Plan baseline: Section 4(이 리뷰) "하루 목표 줄 몇 개, entry 하루 수십 줄을 `entry(start_at)` 범위로 읽는다". 시간표는 어제·오늘 두 열(4.3a D26).
Runtime evidence: 코드 없음(T1 전). 지금 `loadPva`는 `slot_start >= ?`(36시간 전)로 읽고 칸의 local_date로 거른다(`application/record/planVsActual.ts:65~69`). 칸은 30분이라 날을 넘지 않았다.
Comparison grid:
| 선택 | 현재 | A 자정에서 잘라 나눔 | B 시작한 날에 모두 |
|---|---|---|---|
| 23:00~01:00 세션 | 해당 없음(칸) | 어제 1h, 오늘 1h | 어제 2h |
| 조회 | start_at 범위 | start_at < 오늘 끝 AND (end_at IS NULL OR end_at > 오늘 시작) | start_at 범위 |
| 멈춘 구간 | - | 같은 경계로 잘라 뺌 | 세션 전체에서 뺌 |
| 시간표와 맞음 | - | 맞음(두 열에 나뉘어 그려짐) | 안 맞음 |
| 쓰는 곳 | - | actualByItem 한 곳(목표 줄·홈·아침 제안) | 같음 |
Question D6:
D6 — 자정을 넘긴 세션은 어느 날의 실제 시간으로 셀까요?
Project/branch/task: refactor/architecture, T9 목표 줄의 실제 분(actualByItem).
ELI10: 밤 11시에 켠 스톱워치를 새벽 1시에 끄면, 그 2시간이 어제 것인지 오늘 것인지 정해야 합니다. 시작 시각으로만 하루를 고르면 오늘 화면에서 이 세션이 통째로 빠집니다. Codex가 짚었습니다. 시간표는 이미 어제·오늘 두 열로 그립니다.
Stakes if we pick wrong: 오늘 목표 줄과 홈 막대가 새벽에 한 시간을 빼고 보여 주거나, 시간표와 합계가 서로 다릅니다.
Recommendation: A because 시간표가 같은 세션을 두 날에 나눠 그리므로 합계도 같은 경계로 나눠야 화면끼리 맞습니다.
Completeness: A=10/10, B=6/10
Pros / cons:
A) Apply: 자정에서 잘라 나눔 (recommended)
  ✅ 23:00~01:00은 어제 1h, 오늘 1h로 시간표 두 열과 합계가 정확히 맞습니다.
  ✅ 어제 시작해 아직 돌고 있는 세션도 오늘 몫이 오늘 목표 줄에 잡힙니다.
  ❌ 조회 조건과 멈춘 구간 자르기가 조금 늘고, 경계 테스트가 필요합니다. (사람: ~2시간 / CC: ~10분)
B) Keep: 시작한 날에 모두
  ✅ 조회가 start_at 범위 하나로 가장 단순합니다.
  ✅ '세션 하나 = 한 날'이라 설명이 쉽습니다.
  ❌ 새벽에 오늘 목표 줄이 0으로 보이고, 시간표 두 열과 합계가 어긋납니다.
C) Investigate
  ✅ 실제로 자정을 넘기는 기록이 얼마나 되는지 테스터 2주 데이터를 본 뒤 정합니다.
  ✅ 지금 구현을 늦추지 않습니다(그동안 A나 B 중 무엇을 쓸지는 정해야 함).
  ❌ 그 사이 한쪽으로 구현해야 해서 결국 다시 고칠 수 있습니다.
D) Defer
  ✅ 이번 T9에서 빼고 나중에 정합니다.
  ✅ 지금 질문이 하나 줍니다.
  ❌ 구현하는 사람이 아무 규칙이나 고르게 됩니다.
Net: 시간표와 맞는 정확한 합계냐, 단순한 조회냐.
Header: 자정 넘는 세션
Options:
A) Apply: 자정에서 잘라 나눔 (recommended)
날짜 구간과 겹치는 세션을 읽고 세션·멈춘 구간을 그날 경계로 잘라 더함. actualByItem 한 곳. (사람: ~2시간 / CC: ~10분)
B) Keep: 시작한 날에 모두
start_at 범위로 읽고 세션 전체를 시작한 날로 셈. 시간표와 합계가 어긋날 수 있음.
C) Investigate
테스터 2주 데이터에서 자정 넘는 세션 비율을 본 뒤 정함. 그동안은 구현 보류.
D) Defer
이번 T9에서 정하지 않고 남김.

State: approved
Actual answer: "A) Apply: 자정에서 잘라 나눔 (recommended)" (eng 3 D6, 2026-11-18)
Accepted scope: `actualByItem(date)`는 그날 [시작, 끝)과 겹치는 entry(`start_at < 끝 AND (end_at IS NULL OR end_at > 시작)`, 지운 것 제외)를 읽고, 세션과 pause를 그날 경계로 잘라 더한다. 진행 중은 지금까지. 목표 줄·홈 막대·아침 제안(R11 어제 실제)이 이 함수 하나를 쓴다. Section 4 조회 문장을 이것으로 바꾼다. 테스트: 23:00~01:00 → 어제 60·오늘 60, 자정에 걸친 pause, 어제 시작해 진행 중.
History: none

### R13: 하루 24시간 제한을 모든 목표 쓰기에
Finding: Codex 2, High, Section 1 "24시간 검사는 `setGoal` 트랜잭션 안에서", reviewer: Codex
Plan baseline: 디자인 D7 "하루 합계가 24시간을 넘으면 저장하지 않고, 친 값을 그대로 두고 2초 알림". R9(되돌리기 = 지운 분·자리로 다시 넣음), R11(5분 단위 반올림), D11(어제와 동일 복사).
Runtime evidence: 코드 없음. 예: 1시간 목표 지움 → 남은 시간을 다른 목표로 채움 → 되돌리기 = 25시간. R11 반올림 483+483+474=1440 → 485+485+475=1445.
Comparison grid:
| 선택 | 현재 | A 모든 쓰기에 같은 검사 | B setGoal에만 |
|---|---|---|---|
| 시간 고치기·추가 | 저장 안 함 + 알림(D7) | 같음 | 같음 |
| 되돌리기가 넘음 | 정하지 않음 | 되돌리지 않고 같은 24시간 알림 | 그대로 넣음(넘음) |
| 어제와 동일 복사 | 정하지 않음 | 어제 합이 넘으면(옛 자료) 넘는 만큼 마지막 줄부터 줄임 | 그대로 복사 |
| 어제 실제(R11) 반올림 | 정하지 않음 | 반올림 뒤 넘으면 가장 큰 줄에서 넘친 분을 뺌 | 그대로(넘을 수 있음) |
| 검사 위치 | - | todoLogic의 목표 쓰기 한 곳(모든 경로가 지남) | setGoal 안 |
| R9·R11 | 승인 | 그대로(넘칠 때만 위 처리) | 그대로 |
Question D7:
D7 — 하루 24시간 제한을 되돌리기·어제 복사·어제 실제에도 걸까요?
Project/branch/task: refactor/architecture, T9 목표 쓰기.
ELI10: 하루 목표 합이 24시간을 넘지 않게 하는 검사는 지금 계획에서 '시간 고치기'에만 있습니다. 그런데 목표를 지우고 다른 목표를 늘린 뒤 [되돌리기]를 누르거나, 어제 실제로 목표를 만들며 5분 단위로 반올림하면 24시간을 넘을 수 있습니다. Codex가 짚었습니다.
Stakes if we pick wrong: 하루 목표가 25시간이 되어 홈 막대와 합계가 말이 안 되는 숫자를 보입니다.
Recommendation: A because 규칙은 '하루 목표 합은 24시간 이하' 하나이고, 모든 쓰기가 한 함수를 지나게 하면 어디서 넣어도 깨지지 않습니다.
Completeness: A=10/10, B=6/10
Pros / cons:
A) Apply: 모든 쓰기에 같은 검사 (recommended)
  ✅ 되돌리기가 넘으면 되돌리지 않고 같은 24시간 알림을 띄워, 사용자가 다른 목표를 줄인 뒤 다시 할 수 있습니다.
  ✅ 어제 실제 반올림으로 넘친 몇 분은 가장 큰 줄에서 빼서 늘 24시간 이하가 됩니다.
  ❌ 넘칠 때의 처리 세 가지를 테스트로 묶어야 합니다. (사람: ~1시간 / CC: ~10분)
B) Keep: setGoal에만
  ✅ 검사가 한 경로에만 있어 코드가 가장 짧습니다.
  ✅ 넘치는 경우가 드물어 대부분의 날에는 차이가 없습니다.
  ❌ 드물게 25시간 같은 목표가 저장되고, 그 뒤 시간 고치기가 계속 거절됩니다.
C) Investigate
  ✅ 넘치는 경우가 실제로 생기는지 테스터 기간에 본 뒤 정합니다.
  ✅ 지금은 B처럼 두고 지켜봅니다.
  ❌ 넘친 목표가 생기면 사용자가 직접 줄여야 합니다.
D) Defer
  ✅ 이번 T9에서 정하지 않습니다.
  ✅ 질문이 줄어듭니다.
  ❌ 구현하는 사람이 경로마다 다르게 처리할 수 있습니다.
Net: 한 규칙을 모든 길에 거느냐, 드문 경우를 두고 단순하게 가느냐.
Header: 24시간 제한
Options:
A) Apply: 모든 쓰기에 같은 검사 (recommended)
목표 쓰기 한 함수에서 검사. 되돌리기가 넘으면 되돌리지 않고 24시간 알림. 어제 복사·어제 실제는 넘친 분을 큰 줄(복사는 마지막 줄)부터 뺌. (사람: ~1시간 / CC: ~10분)
B) Keep: setGoal에만
시간 고치기·추가에만 검사. 되돌리기·복사·어제 실제는 넘을 수 있음.
C) Investigate
테스터 기간에 넘치는 경우를 본 뒤 정함. 그동안은 B.
D) Defer
이번 T9에서 정하지 않고 남김.

State: approved
Actual answer: "A) Apply: 모든 쓰기에 같은 검사 (recommended)" (eng 3 D7, 2026-11-18)
Accepted scope: todoLogic의 목표 쓰기 한 함수를 시간 고치기·추가·되돌리기·어제 복사·어제 실제가 모두 지난다. 그 함수는 한 트랜잭션에서 하루 합 ≤ 1440분을 검사한다. 고치기·추가·되돌리기가 넘으면 저장하지 않고 D7 24시간 알림(남은 분). 어제 복사가 넘으면(옛 자료) 마지막 줄부터 넘친 분을 줄인다. 어제 실제(R11)가 반올림으로 넘으면 가장 큰 줄에서 넘친 분을 뺀다. 테스트: 되돌리기 거절, 1445 → 1440, 복사 넘침 줄이기.
History: none

### R14: 기록 방식(how) 값 목록 (R7 다시 열기)
Finding: Codex 3, High, R7 Accepted scope `how TEXT NOT NULL, -- answered|filled|stopwatch|pomodoro|timer`, reviewer: Codex(확인: Claude)
Plan baseline: R7 승인(eng 2 D9 "가. 다섯 가지 모두": source와 타이머 방식을 how 하나로 합침). R7 이전 SQL은 `source`를 그대로 how에 넣는다.
Runtime evidence: `application/db/types.ts:38` `export type SlotSource = 'answered' | 'continued' | 'late' | 'inferred' | 'declared' | 'batch';`. 재출시 설계 `left30-relaunch.md:90` "'그대로 계속' 버튼은 직전 60분 안에 `answered`·`continued` 칸이 있을 때만 보인다", `:83` inferred는 "만들지 않는다"(옛 자료에만), `:163` 어제 실제는 `answered`·`continued`·`late`만.
다시 여는 이유: R7 목록에 옛 값 다섯 개(continued·late·inferred·declared·batch)가 빠졌고, 내가 만든 `filled`는 옛 값과 겹친다. 이전 SQL과 목록이 서로 어긋나고, '그대로 계속' 버튼과 E1 규칙이 이 구분을 쓴다.
Comparison grid:
| 선택 | R7(승인) | A 옛 값 + 타이머 방식 | B source·방식 두 칸으로 되돌림 |
|---|---|---|---|
| 칸 | how 하나 | how 하나 | source + mode 두 칸 |
| 값 | answered·filled·stopwatch·pomodoro·timer | answered·continued·late·declared·batch·inferred(옛 자료만)·stopwatch·pomodoro·timer | source 6개 + mode 3개 |
| filled | 있음 | 없앰(묶어 채우기 = batch, 지난 칸 채우기 = late) | 없음 |
| 이전 | source 그대로 | source 그대로(목록과 맞음) | source 그대로 + mode NULL |
| '그대로 계속'·E1 | 깨짐 | 지킴 | 지킴 |
| R11 어제 실제 | inferred 못 거름 | how IN ('inferred') 제외 | source로 제외 |
| eng 2 D9(합치기) | 승인 | 그대로(값만 고침) | 되돌림 |
Question D8:
D8 — 기록 방식(how) 칸의 값 목록을 고칠까요? (R7 다시 열기)
Project/branch/task: refactor/architecture, R7 entry 표(T1)와 T9 아침 제안.
ELI10: eng 리뷰 2에서 기록 출처와 타이머 방식을 'how' 칸 하나로 합쳤습니다. 그때 적은 값 목록에 지금 쓰는 출처 다섯 개(그대로 계속, 늦게 답함, 자동 채움, 블록 확인, 묶어 채우기)가 빠졌습니다. 옛 기록을 옮길 때는 출처를 그대로 넣기로 해서 목록과 실제 값이 어긋납니다. '그대로 계속' 버튼과 아침 제안 규칙이 이 구분을 씁니다. Codex가 찾았고 코드로 확인했습니다.
Stakes if we pick wrong: '그대로 계속' 버튼이 언제 보일지 판단을 못 하고, 옛 자동 채움 기록이 아침 제안 목표에 섞입니다.
Recommendation: A because 합치기 결정(eng 2 D9)은 그대로 두고 빠진 값만 채우면 이전 SQL·버튼·제안 규칙이 모두 맞습니다.
Completeness: A=10/10, B=9/10
Pros / cons:
A) Apply: 옛 값 + 타이머 방식 (recommended)
  ✅ how 한 칸에 answered·continued·late·declared·batch·inferred(옛 자료)·stopwatch·pomodoro·timer를 두어, 옛 기록을 그대로 옮기고 버튼·제안 규칙을 지킵니다.
  ✅ 근거 없이 만든 'filled'를 없애 같은 뜻의 값이 둘이 되지 않습니다.
  ❌ R7 문서의 값 목록과 이전 테스트를 고쳐야 합니다. (사람: ~30분 / CC: ~5분)
B) Keep 대신 되돌림: source·mode 두 칸
  ✅ 출처와 방식이 따로라 각각 읽기 쉽습니다.
  ✅ 옛 값은 손대지 않습니다.
  ❌ 승인된 합치기(eng 2 D9)를 되돌리고, 타이머 기록은 source가 늘 같아 같은 사실을 두 번 적게 됩니다.
C) Investigate
  ✅ 옛 기록에 실제로 어떤 출처가 얼마나 있는지 본 뒤 정합니다.
  ✅ 값 목록을 데이터로 확인합니다.
  ❌ T1 전에 정해야 하는 표 정의라 오래 미룰 수 없습니다.
D) Defer
  ✅ 이번에는 정하지 않습니다.
  ✅ 질문이 줄어듭니다.
  ❌ T1을 구현하는 사람이 목록과 이전 SQL 중 하나를 골라야 하고, 틀리면 버튼이 깨집니다.
Net: 빠진 값만 채우느냐, 합치기를 되돌리느냐.
Header: how 값 목록
Options:
A) Apply: 옛 값 + 타이머 방식 (recommended)
how 값 = answered·continued·late·declared·batch·inferred(옛 자료만)·stopwatch·pomodoro·timer. filled 없앰. 이전은 source 그대로. 어제 실제는 inferred 제외. (사람: ~30분 / CC: ~5분)
B) Keep 대신 되돌림: source·mode 두 칸
how를 source(옛 6개)와 mode(타이머 3개, 아니면 NULL) 두 칸으로 나눔. eng 2 D9 합치기를 되돌림.
C) Investigate
옛 기록의 출처 분포를 확인한 뒤 정함. T1 전까지.
D) Defer
정하지 않고 남김. T1 구현 때 다시 봄.

State: approved
Actual answer: "A) Apply: 옛 값 + 타이머 방식 (recommended)" (eng 3 D8, 2026-11-18)
Accepted scope: R7 entry의 how 값은 answered·continued·late·declared·batch·inferred(옛 자료만, 새로 만들지 않음)·stopwatch·pomodoro·timer. `filled`는 없앤다. 이전 SQL은 source를 그대로 넣는다(목록과 맞음). R11 어제 실제는 inferred를 뺀다(E1 `answered`·`continued`·`late`만 넣는 규칙은 how 기준으로: answered·continued·late·declared·batch·타이머 3종을 넣고 inferred만 뺀다. declared·batch·타이머는 E1 뒤에 생긴 실제 기록이라 넣는다). R7 Accepted scope의 how 주석을 고친다. 테스트: 이전 뒤 how 값 보존, '그대로 계속' 조건(answered·continued), 어제 실제 inferred 제외.
History: none

### R15: 추가 시트에서 고를 수 있는 항목
Finding: Codex 5, Medium, 디자인 D10 "칩: 오늘 목표가 없는 최근 항목 칩(최근 사용순, R7 최근 칩)", R7 최근 칩 쿼리 `WHERE start_at >= :30일전 ... LIMIT 6`, reviewer: Codex
Plan baseline: D10(추가 시트 칩 = 최근 항목 + 항목 없는 집중 + 운동 + [+ 새 항목]), D12([항목 관리]는 이름 바꾸기·숨기기·꺼내기), D13(같은 이름을 치면 그 항목을 고름)
Runtime evidence: 코드 없음. 최근 칩은 30일 안에 기록한 항목 6개까지.
Comparison grid:
| 선택 | 현재(D10) | A 숨기지 않은 모든 항목 칩 | B Keep |
|---|---|---|---|
| 추가 시트 칩 | 최근 30일 기록 항목 최대 6개 | 숨기지 않은 모든 세부 항목(오늘 목표 없는 것), 최근 사용순, 기록 없으면 만든 순 | 그대로 |
| 기록 없이 만든 항목·오래된 항목 | 이름을 다시 쳐야 고름 | 칩으로 바로 | 이름을 다시 쳐야 |
| 시작·기록 시트 칩 | R7 최근 칩 | 그대로(최근 칩) | 그대로 |
| 항목이 많을 때 | 6개 | 칩이 여러 줄(숨기기로 정리) | 6개 |
Question D9:
D9 — 목표 추가 시트에 어떤 항목 칩을 보일까요?
Project/branch/task: refactor/architecture, T9 추가 시트(디자인 D10).
ELI10: 추가 시트의 칩은 '최근 30일 안에 기록한 항목 6개'로 정해 두었습니다. 그러면 만들어 놓고 아직 기록하지 않은 항목이나 한 달 넘게 쓰지 않은 항목은 칩에 없어서, 이름을 다시 쳐야 고를 수 있습니다. Codex가 짚었습니다. 목표는 '앞으로 할 일'이라 기록이 없는 항목을 고를 일이 많습니다.
Stakes if we pick wrong: 새 시험 과목처럼 아직 기록이 없는 항목에 목표를 세우려면 매번 이름을 쳐야 합니다.
Recommendation: A because 목표는 앞으로 할 일을 정하는 곳이라 기록 이력이 아닌 '있는 항목 전체'에서 고르는 것이 맞고, 항목이 쌓이면 이미 정한 숨기기로 정리됩니다.
Completeness: A=9/10, B=7/10
Pros / cons:
A) Apply: 숨기지 않은 모든 항목 칩 (recommended)
  ✅ 만들어 놓은 항목은 기록이 없어도 칩으로 바로 고릅니다.
  ✅ 최근 쓴 것이 앞에 와서 평소에는 지금과 거의 같아 보입니다.
  ❌ 항목이 20개를 넘으면 칩이 여러 줄이 됩니다(안 쓰는 항목은 숨겨야 함). (사람: ~30분 / CC: ~5분)
B) Keep: 최근 30일 6개
  ✅ 칩이 한두 줄로 늘 짧습니다.
  ✅ 시작 시트·기록 시트의 최근 칩과 같은 규칙입니다.
  ❌ 기록이 없거나 오래된 항목은 이름을 다시 쳐야 고를 수 있습니다.
C) Investigate
  ✅ 테스터가 항목을 몇 개나 만드는지 본 뒤 정합니다.
  ✅ 지금은 B로 둡니다.
  ❌ 그동안 기록 없는 항목에 목표를 세우기 불편합니다.
D) Defer
  ✅ 이번 T9에서 정하지 않습니다.
  ✅ 질문이 줄어듭니다.
  ❌ 구현하는 사람이 아무 규칙이나 고릅니다.
Net: 목표용 칩을 '있는 항목 전체'로 넓히느냐, 짧은 최근 칩을 지키느냐.
Header: 추가 시트 칩
Options:
A) Apply: 숨기지 않은 모든 항목 칩 (recommended)
추가 시트 칩 = 숨기지 않은 세부 항목 전체(오늘 목표 없는 것), 최근 사용순, 기록 없으면 만든 순. 시작·기록 시트는 최근 칩 그대로. (사람: ~30분 / CC: ~5분)
B) Keep: 최근 30일 6개
D10 그대로. 기록 없거나 오래된 항목은 이름을 다시 쳐서 고름.
C) Investigate
테스터의 항목 수를 본 뒤 정함. 그동안 B.
D) Defer
이번 T9에서 정하지 않고 남김.

State: pending (조사)
Actual answer: "C) Investigate" (eng 3 D9, 2026-11-18)
Accepted scope: 구현 변경 없음. 추가 시트 칩은 D10 그대로(최근 30일 항목 최대 6개 + 항목 없는 집중 + 운동 + [+ 새 항목]). 조사: 테스터 2주 동안 사람마다 만든 항목 수와, 기록 없는 항목에 목표를 세우려 이름을 다시 친 횟수(같은 이름 고르기 발생 수)를 본 뒤 A(모든 항목 칩)를 다시 묻는다.
History: none

Approval readiness: PASS — structure(eng 3 D1 B), R8(D2 A), R9(D3 다시 묻기 B), R10(D4 A), R11(D5 A), R12(D6 A), R13(D7 A), R14(D8 A), R15(D9 C 조사, 구현 변경 없음), TODO(D10 A). 발견 5(savePlan 정리)와 Codex 지적 4(정렬·되돌리기 자리)는 승인된 동작의 구현이라 질문 없음.

### NOT in scope (eng 3)
- 두 항목 합치기(R10에서 막기만 함).
- 추가 시트 칩을 모든 항목으로 넓히기(R15 조사, TODO.md).
- 서버의 목표 지우기 동기화(R9, W2 eng 리뷰에서).
- 지난 날짜 목표 고치기(디자인 리뷰 2 NOT in scope).

### What already exists (eng 3)
- `planRowsOn`·`totalsLine`·`hours`(todoLogic), `buildPva`·`gapLine`(planVsActual), `takeMorningOffer`·`acceptSame`(morningPlan), 할 일 화면 [되돌리기] 알림, `test/nodeDb.ts` 실제 SQLite 테스트 틀. 목표 쓰기는 todoLogic으로 모으고 나머지는 항목 기준으로 고쳐 다시 쓴다.

### Failure modes (eng 3)
| 경로 | 실패 | 처리 | 사용자에게 |
|---|---|---|---|
| 목표 저장 | DB 오류 | 원래 값으로 되돌림 | D31 2초 알림 |
| 24시간 초과(모든 쓰기) | 합 > 1440 | 저장 안 함 또는 넘친 분 줄임(R13) | 24시간 알림 |
| 이름 바꾸기 같은 이름 | 유일 인덱스 | 미리 검사해 막음(R10) | 입력 칸 아래 문구 |
| 되돌리기 자리 겹침 | position 같음 | 그 이상 줄을 1씩 밂 | 같은 자리로 보임 |
| 자정 넘는 세션 | 하루 경계 | 잘라 나눔(R12) | 시간표와 합계 같음 |
조용히 틀리는 실패 없음: critical gaps 0.

### Worktree parallelization (eng 3)
Sequential implementation, no parallelization opportunity. T9는 T1(plan_v3·item·entry)에 기대고, 같은 record/ 모듈을 고친다.

### 완료 요약 (eng 3)
- Step 0: Scope Challenge — scope accepted as-is (구조 B)
- Reality rows: 8/8 emitted (`PLAN_REALITY: phase=eng rows=7/7 missing=none unverified=1 verdict=complete`), 1 unverified premise(파일·줄 수 [estimated])
- Architecture Review: 3 issues found (발견 1·2·3) + Codex 4
- Code Quality Review: 1 issue found (발견 5, accepted)
- Test Review: diagram produced, 22 gaps identified(새 경로, T9 구현 때 채움)
- Performance Review: 0 issues found (Codex 지적 1은 R12)
- NOT in scope: written
- What already exists: written
- TODOS.md updates: 1 item proposed (accepted)
- Failure modes: 0 critical gaps flagged
- Unresolved decisions: 1 in this review (R15 조사)
- Outside voice: codex, completed (지적 5개, 4개 질문 + 1개 사실 정정)
- Parallelization: 1 lane, 0 parallel / 1 sequential
- Lake Score: 4/7 (Completeness를 매긴 답 7개 중 10/10 안을 고른 것: D2·D6·D7·D8. D3 B 8/10, D5 A 9/10, D9 C 조사)

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 2 | CLEAR | 2회(11-17 카테고리): mode: SCOPE_REDUCTION, 0 critical gaps |
| Outside Review | codex (plan-review, eng 3) | Independent 2nd opinion | 2 | completed | eng 3: 지적 5개(High 3, Medium 2) → R12·R13·R14 적용, R15 조사, 지적 4 사실 정정. 디자인 리뷰 2 단계는 unavailable(끝 표시 없음) |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 3 | ISSUES OPEN | 3회(11-18 T9): 4 issues, 0 critical gaps. R8~R14 accepted, R15 조사 1개 남음. 1회 5 issues, 2회 R7 |
| Design Review | `/plan-design-review` | UI/UX gaps | 2 | ISSUES OPEN | 2회(11-18): score: 2/10 → 7/10, 15 decisions(글꼴만 남음) |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **OUTSIDE COVERAGE:** codex, plan-review(eng 3), completed, 지적 5개 모두 처리(4개 질문 + 1개 사실 정정). codex, design phase(디자인 리뷰 2), unavailable. CEO 단계는 외부 검토 실행 안 함.
- **CROSS-MODEL:** eng 3에서 Claude 리뷰가 찾은 것(순서 칸, 지우기, 이름 바꾸기, 아침 제안)과 Codex가 찾은 것(자정, 24시간 모든 경로, how 값, 칩 범위)은 겹치지 않았다. Codex의 how 값 지적은 Claude가 코드(`application/db/types.ts:38`)로 확인했다.
- **VERDICT:** CEO CLEARED. Eng는 결정을 모두 내렸고 남은 것은 R15 조사(구현 변경 없음, TODO.md)뿐이라 T1 → T9 구현을 시작할 수 있다. eng review required(상태가 issues_open이라 대시보드 기준 CLEAR는 아님).

**UNRESOLVED DECISIONS:**
- R15 목표 추가 시트 칩 범위(조사, 테스터 2주 뒤, TODO.md)
- (이전 리뷰에서 문서에 남긴 것) 1분 미만 기록 처리(소유: /plan-design-review)
- (이전 리뷰에서 문서에 남긴 것) 글꼴·강조색 최종값(방 스타일 받은 뒤)
- (이전 리뷰에서 문서에 남긴 것) **숙제(사용자):** 타이머·뽀모도로가 끝난 뒤 30분 알림을 자동으로 다시 켤지, [아니오] 뒤 언제 다시 켜질지. 그때까지 RESUME 임시안으로 개발
