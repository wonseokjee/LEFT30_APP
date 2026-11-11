# 작업 계획: 집중 블록과 묶어서 답하기 (자동 채우기 대안)

/plan-ceo-review 2026-11-11, 브랜치 refactor/architecture. 정본 설계서는 `docs/designs/left30-relaunch.md`. 이 파일은 리뷰 작업본이고, 승인된 결정만 끝에 설계서와 TODO.md에 옮긴다.

## 요청
- 1번 집중 블록: 기록할 때 계속할 시간을 미리 정하고 그동안 알림을 생략한다. 끝에 확인 알림. D25 일시 중지 스케줄러 재사용. 새 source(예: `declared`)와 S1 집계 여부.
- 2번 묶어서 답하기: 알림을 무시한 뒤 앱을 열면 비어 있는 여러 칸을 한 번에 채운다. 60분 `late` 규칙과의 관계.
- 기준: 설계서, TODO.md 보류 항목(자동 채우기, 구현 순서 3 알림 액션 실험).

## 시스템 감사 (사전)
- 최근 커밋: 8b051d6 시간표 HH:00·세로줄, 31ccda4 설계서 D24·D25, 54c710b 알림 일시 중지, 6070524 시간표 줄, 5e903ad 시간표 새로 만들기.
- 진행 중 브랜치: `deploy/server`(문서 1커밋, 서버 배포 진행 중. 메모리상 Vercel+Neon으로 전환). push 없음. stash 없음.
- TODO.md 관련 항목
  - 보류 "자동 채우기(`inputPreviousAction`) 처리 방식"(TODO.md:78): 결정 조건이 알림 액션 실험. 이 계획이 그 결정을 대신할 수 있다.
  - 보류 "응답 연속 기록(스트릭)"(E4), "Android 홈 위젯"(E6): 직접 관련 없음.
- 지난 리뷰와 겹침: CEO 리뷰(2026-10-13·15)가 source 표와 S1 정의(`answered|continued`만)를 승인했다. 이 계획은 그 표를 바꾸므로 C1·S1 결정을 다시 연다.
- UI 범위: 있음(기록 시트, 확인 알림, 홈 또는 시간표 표시). Section 11 대상.

## 0A. 전제 점검
- **진짜 문제:** 같은 일을 오래 하는 동안 30분 알림이 집중을 깬다. 옛 자동 채우기는 이걸 "답하지 않은 칸을 지어내는" 방식으로 풀었고, 그래서 지표가 부풀었다. 지금 코드는 자동 채우기가 없어서 사용자는 (a) 매 30분 답하거나 (b) 칸을 비워 두고 나중에 `late`로 채운다.
- **아무것도 안 할 때 비용:** 2시간 집중이면 알림 4번. 무시하면 앞 2칸은 60분이 지나 `late`가 되어 S1에서 빠진다(`application/record/recordLogic.ts:6-27`). 집중하는 날일수록 S1이 낮게 나오는 거꾸로 된 지표가 된다. 창업자 본인의 불편("내가 불편함")이 이 앱의 유일한 수요 증거이므로, 이 불편을 그대로 두면 창업자 사용부터 흔들린다.
- **직접 푸는가:** 1번은 미리 아는 집중을 직접 푼다. 2번은 미리 말하지 못한 집중을 사후에 푼다. 둘 다 "사용자가 말한 것만 기록" 원칙 안에 있다.
- **검증 안 된 전제:** 테스터도 같은 불편을 느끼는지는 모른다(n=1). 블록을 쓰면 하루 응답 횟수가 줄어 S1 정의와 충돌한다.
- **바깥 근거:** TagTime 사용자들은 수동 타이머를 켠 동안의 핑을 "무효"로 빼서 기록을 정직하게 유지한다([Beeminder 포럼](https://forum.beeminder.com/t/philosophical-setup-instructions-for-tagtime/4012)). 경험 샘플링 연구도 잦은 요청이 응답률을 떨어뜨린다고 본다([JMIR mHealth 2025](https://mhealth.jmir.org/2025/1/e57018/PDF)), 사용자 정의 알림 미루기는 장기 현장 연구가 있다([Snooze!, CHI 2018](https://unpaywall.org/10.1145%2F3404983.3410006)).
- **Layer 3 판단:** 집중 블록 안의 칸은 "핑에 대한 답"이 아니라 "사용자가 미리 한 진술"이다. 그래서 S3(핑 신뢰성) 분모에서는 일시 중지처럼 빼고, S1에서는 별도 규칙으로 센다. 1번과 2번은 같은 데이터("한 번의 진술로 여러 칸")를 만든다. 차이는 진술 시점(앞/뒤)뿐이다.

## 0B. 기존 코드 활용
| 하위 문제 | 재사용할 코드 | 비고 |
|---|---|---|
| 블록 동안 알림 생략 | `Pause`·`isPaused`·`desiredSchedule`의 `pause` 인자 (`application/scheduler/plan.ts:17-28,116`), `readPause` (`application/scheduler/scheduler.ts:38-42`) | 일시 중지와 블록이 동시에 있을 수 있으므로 "건너뛸 구간 목록"으로 일반화가 필요 |
| 블록 끝 확인 알림 | 만료 안내 알림 방식(`EXPIRY_CONTENT`, `plan.ts:166`) | 별도 kind 필요 |
| 묶어서 채울 빈 칸 찾기 | `emptySlotBefore` (`application/record/recordLogic.ts:44-66`) | 지금은 앞 두 칸·60분만 본다 |
| 직전 카테고리 | `continueCandidate` (`recordLogic.ts:30-42`) | 묶음 답의 기본 카테고리 |
| source 결정 | `sourceFor` (`recordLogic.ts:18-28`) | 새 규칙이 들어갈 곳 |
| source 허용값 | 앱 `SlotSource` (`application/db/types.ts:37`), 서버 CHECK (`server/src/migrations/1792540800000-Init.ts:27`, `server/src/Entity/slot.entity.ts:17`) | 새 source를 넣으면 서버 마이그레이션 필요. 앱 SQLite는 CHECK 없음 |
| 이벤트 | `pause_set` 추가 전례 (`server/src/Entity/event.entity.ts:16`) | `focus_set` 같은 새 타입도 같은 길 |
| 다음 칸 맥락 문구 | `plan.ts:134-144` | 블록 직후 첫 알림 문구에 활용 가능 |

## 0C. 꿈의 상태
```
  지금                          이 계획                         12개월 이상
  30분마다 묻고, 안 답하면      한 번 말하면 그 시간은          앱이 "지금 무엇을 하는지"를
  빈칸 또는 late.               조용하고, 놓친 시간은           알고 필요할 때만 묻는다.
  집중할수록 지표가 낮아짐.     앱을 열 때 한 번에 채운다.      묻는 횟수는 줄고 기록은
                                데이터는 여전히 사용자 진술.    더 정확하다. 코칭(F3)의 입력.
```
이 계획은 그 방향이다. "얼마나 자주 묻느냐"를 사용자 행동에 맞추는 첫 단계다.

## 결정 장부
| ID·소유 | 계약과 근거 | 현재 | 제안 | 상태 | 승인과 범위 |
|---|---|---|---|---|---|
| MODE | 0E 모드 | 없음 | SELECTIVE EXPANSION | approved | D1 답 "SELECTIVE EXPANSION (recommended)" |
| CORE-1 (데이터 source) | slot.source 값 | `answered/continued/late/inferred` | declared+batch / declared 하나 / continued 재사용 | deferred | D2 답: "ceo 리뷰가 아니라 engineer 리뷰 같다, ui를 따져서". 저장 방식은 UX가 정해진 뒤 /plan-eng-review에서 정한다 |
| UX-1 (블록 시작 지점) | 순간 ① | 없음 | 기록 직후 토스트 '계속' + 홈 '집중' 버튼, 둘이 같은 블록을 만든다 | approved | 사용자: "a,b 둘다 좋은 것 같은데 30분이 끝났을때 기록하고 싶으면 a에서 하고 공부중에 집중하고 싶으면 b에서 누를 수 있는 칸이 있는 것도 좋아보여. 물론 a,b가 잘 연계되어야 하겠지" |

| UX-2 (블록 끝) | 순간 ③ | 없음 | A: 끝 시트 "업무 13:30–15:30 끝" + [업무 30분 더](카테고리 색) / [여기서 끝] + "중간에 다른 걸 했어요 · 고치기" | approved | 실기기 시제품(A·B) 비교 뒤 사용자: "a안으로 하자" |
| EXP-1 (계획 블록 = Todo) | 할 일에 시간·카테고리 → 계획 반영, 그 시간 알림 없음, 끝에 A 시트 | 설계서: Todo 탭 제거(설계서:176,234), 계획은 시간대 없이 총량(설계서:155), Open Q3 미결(설계서:300) | Todo 탭 = 계획 블록 목록. 블록 시간엔 알림 없음. 끝 A 시트에서 답한 것만 실제 기록, 답 없으면 빈칸 | approved, 이번 범위 | D4 메모 "홈의 집중은 갑작스럽게… 미리 잡아둔 집중은 하루를 계획하는 거라 성격이 좀 달라", D5 메모 "todo로 빼면 plan에 차이를 줄 수 있을듯", D6 답 "A. 그렇게 정하고 이번 범위에 (recommended)". 설계서 Todo 탭 제거(176·234) 결정을 뒤집는다 |
| EXP-1a (시작 확인) | 계획→실제 전환 시점 | 없음 | 시작 확인 없음. 끝 A 시트가 확인 역할 | approved | D6 답으로 정해짐(D5는 선택 없이 메모로 답) |

| EXP-1b (총량 계획과 Todo 연결) | 저녁 계획 대비 실제의 기준 | 계획 = 카테고리 총량(E1) | 총량 계획과 Todo 계획 블록을 둘 다 만들고 실사용으로 고른다. 한 화면(plan)에 둘을 함께 보이는 디자인은 /plan-design-review에서 | approved(실사용 후 재결정) | D7 메모 "일단 두개 다 만들고 사용해보면서 뭐가 더 좋은지 판단해보자. 물론 plan에 두개 다 들어가려면 디자인 고민 필수" |

| UX-3 (놓친 칸 묶어서 채우기) | 순간 ④ | 직전 한 칸만 "비어 있어요 · 채우기" | 시트 제목 "13:00–18:00 비어 있어요 (10칸)". [그대로 계속 · 업무 (10칸 모두)] 또는 카테고리 하나로 전부 채움. 아래 한 줄 "중간에 바뀌었어요 · 따로 채울게요"는 시트를 닫고 끝(나중에 시간표에서 사람이 채움). 구간 나누기 UI는 두지 않음 | approved | 실기기 시제품 A·B·합친 안 비교 뒤 사용자: "너무 복잡해 10칸 모두 업무 였으면 그냥 진행하고 중간에 바뀐때 있으면 '중간에 바뀌어서 따로 저장할게요' 이렇게 하고 종료. 이후에 사람이 채우기" |

| S1 (리텐션 기준) | 설계서:306 "14일 중 12일, 하루 8칸 이상 직접 응답(answered·continued)" | 칸 수 | 14일 중 12일, 하루 답한 시간대 3곳 이상. 세는 법은 S1-COUNT 행이 정본 | approved | D9 답 "B. 답한 횟수만", D10 답 "A. 하루 3번", D16으로 세는 법 확정. 2026-10-13 CEO 리뷰의 S1 정의를 바꾼다 |

| DOC (0H 문서 승인) | 작업본 + CEO 요약 | — | 이 두 문서 버전 | approved | D17 답 "A. 승인하고 계속 (recommended)". 스펙 리뷰 3회, 최종 9/10 PASS |

Approval readiness: PASS — MODE(D1), UX-1(사용자 지시), UX-2(D3 메모 뒤 "a안으로 하자"), EXP-1·EXP-1a(D6), EXP-1b(D7 메모), UX-3(사용자 지시), S1(D9·D10), SPEC-1(D15), S1-COUNT(D16), CP-1(D11), CP-2 연기(D12), CP-3(D13), CP-4 뺌(D14), DOC(D17). CORE-1·DEF-1은 Eng 리뷰 소유 보류, 계획 블록과 총량 합치는 규칙은 디자인 리뷰 소유 보류. 승인 없이 본문에 들어간 변경 없음.

### 두 블록 정의 (확정)
| | 집중 블록 | 계획 블록 |
|---|---|---|
| 만드는 곳 | 홈 [집중], 기록 직후 토스트 [계속] | Todo 탭 |
| 뜻 | 실제로 지금 하는 일 | 하려고 한 일(계획) |
| 블록 시간 알림 | 없음 | 없음 |
| 끝 | A 시트 | A 시트. 여기서 답해야 실제 기록 |
| 답 없을 때 | 블록 칸은 실제로 남음(시작이 곧 진술) | 칸은 빈칸, 계획만 남음 |
| 계획 대비 실제 | 실제 쪽 | 계획 쪽. 총량 목표와 합치는 규칙(포함인지 별도인지, 이중 집계 방지)은 EXP-1b와 함께 /plan-design-review 소유 |

| SPEC-1 (블록 칸을 쓰는 시점) | 스펙 리뷰 완결성 1 | 미정 | 집중 블록은 칸을 미리 쓰지 않는다. 블록 중 끝난 칸만 블록 카테고리로 채운다(시간표는 항상 실제만). 일찍 끝내도 지울 것이 없다 | approved | D15 답 "A. 지난 칸만 채움 (recommended)" |
| S1-COUNT (답 세는 법) | 스펙 리뷰 명확성 1 | 행동마다 1번 | 하루 중 답한 행동(알림 답, 블록 시작, 블록 끝 답, 묶어서 채우기, Todo 계획 저장)이 있었던 **서로 다른 30분 시간대가 3곳 이상** | approved | D16 답 "A. 서로 다른 30분 시간대 3곳 (recommended)" |
| DEF-1 (기본값, Eng에서 재확인) | 스펙 리뷰 지적 모음 | 미정 | 블록 길이 1·2·3시간, 방해금지 시작을 넘으면 그 전까지로 자름 / "고치기"는 시간표의 그 구간으로 이동 / 블록 중 연장은 끝 시트와 홈에서만(토스트는 블록이 없을 때만 시작 버튼) / 토스트 버튼 이름은 "그대로 계속"과 겹치지 않게(예: "집중") / 집중 블록이 계획 블록 시간에 시작되면 그 계획 블록은 cancelled(끝 시트 없음) / 끝 알림을 잃은 집중 블록은 앱 열 때 지난 칸을 채우고 끝 시트를 늦게 띄움 | pending(Eng 리뷰 소유) | 사용자에게 묻지 않은 기본값. /plan-eng-review에서 확정 |

### UX-2 확정 내용
- 블록 끝 시각에 알림(앱 밖) 또는 시트 바로 열기(앱 안, D23과 같은 규칙). 끝 알림은 새 칸을 묻지 않는다. 그 칸은 블록이 이미 채웠다. 다음 칸은 다음 평소 알림이 묻는다.
- 알림을 넘기면 블록 기록은 그대로, 다음 평소 알림부터 다시 묻는다.
- 연장 버튼은 블록 카테고리 색("그대로 계속"과 같은 규칙).

### UX-1 확정 내용
- 진입점 둘: (A) 30분 기록 직후 토스트의 '계속' → 길이 선택. (B) 홈의 '집중' → 카테고리 → 길이 선택.
- 연계 원칙: 어느 쪽에서 시작해도 같은 블록 하나다. 홈은 어느 쪽에서 시작했든 블록 상태("업무 · 15:30까지", 남은 시간, 끝내기)를 보여 준다. 블록 중 연장은 끝 시트와 홈에서 한다(DEF-1, 스펙 리뷰 일관성 2로 수정).

### 선택 확장 (0G)
| ID | 후보 | 노력 | 결정 | 근거 |
|---|---|---|---|---|
| CP-1 | 놓친 칸 채우기에서 계획 블록이 있던 칸은 맨 위 버튼을 [계획대로 · 업무] | S | ACCEPTED | D11 답 "A. 이번 범위에 추가 (recommended)" |
| CP-2 | 시간표 오늘 열에 계획 블록을 옅은 색으로 | M | DEFERRED (디자인 리뷰와 함께) | D12 답 "일단 나중에 디자인까지 보고 고려해야할듯" |
| CP-3 | Todo에 "어제 계획 블록 그대로 가져오기" | S | ACCEPTED | D13 답 "A. 이번 범위에 추가 (recommended)" |
| CP-4 | 블록 끝 5분 전 소리 없는 예고 | S | SKIPPED | D14 답 "C. 빼기 (recommended)". 블록 동안 알림 0개가 목적 |

## 확정 범위 (작업 계획 본문)

### 사용자 흐름
```
            ┌────────────── 집중 블록 (지금부터) ──────────────┐
 30분 알림 → 기록 시트 → 토스트 [계속] ┐                       │
 홈 [집중] → 카테고리 → 길이 ──────────┴→ 블록 진행 중          │
                                          (알림 없음, 홈에       │
                                           "업무 · 15:30까지     │
                                            [끝내기]")           │
                                               │ 끝 시각         │
            ┌──────────── 계획 블록 (Todo) ────┼───────────┐     │
 Todo 탭 → 시각·카테고리·길이 → 계획 저장       │           │     │
 [어제 블록 가져오기](CP-3)   → 그 시간 알림 없음 ┘           │     │
                                               ▼                 │
                                 끝 시트(A): "업무 13:30–15:30 끝"
                                 [업무 30분 더] [여기서 끝]
                                 중간에 다른 걸 했어요 · 고치기
                                    │ 답함            │ 답 없음
                                    ▼                 ▼
                              실제 기록        집중: 블록 칸 유지
                                               계획: 빈칸(계획만 남음)
                                                      │ 다음에 앱 열 때
                                                      ▼
                     놓친 칸 채우기: "13:00–18:00 비어 있어요 (10칸)"
                     [계획대로 · 업무](CP-1, 계획 있던 칸) 또는 [그대로 계속 · X]
                     카테고리 6개(전부 같은 값) / 중간에 바뀌었어요 · 따로 채울게요
```

### 구현 단위 (Eng 리뷰에서 세부 결정)
1. 블록 저장과 스케줄러: 블록 구간의 30분 알림을 빼고 끝 알림 하나를 건다. D25 일시 중지의 "건너뛸 구간" 경로를 블록 목록까지 받도록 넓힌다.
2. 집중 블록: 토스트 [계속], 홈 [집중], 홈 진행 표시와 [끝내기], 끝 시트 A, 연장.
3. 계획 블록: Todo 탭 새로 만들기(옛 서버용 Todo 코드는 쓰지 않음), 어제 블록 가져오기(CP-3), 총량 계획과 함께 저장.
4. 놓친 칸 채우기: 연속 빈칸 묶음 시트, 계획대로 기본값(CP-1), "따로 채울게요" 뒤 같은 칸은 다시 묻지 않음.
5. S1 집계: S1-COUNT(답한 행동이 있던 서로 다른 30분 시간대 수) 계산용 이벤트 정의.
6. 설계서·TODO 갱신: 목록은 T6이 정본.

## 리뷰 섹션

### Section 1: 아키텍처
```
  [기록 시트]──[토스트 계속]──┐
  [홈 집중]───────────────────┼─▶ block 저장(로컬 SQLite) ─▶ 동기화 큐 ─▶ 서버
  [Todo 탭]───────────────────┘          │
                                         ▼
                     스케줄러 desiredSchedule(quiet, pause, blocks) ─▶ 로컬 알림
                                         │ 끝 알림 kind=block_end
                                         ▼
                     알림 핸들러(D23 규칙) ─▶ 끝 시트 A ─▶ slot 저장
  [앱 열기] ─▶ 연속 빈칸 찾기(emptySlotBefore 확장) ─▶ 놓친 칸 채우기 시트
```
- WARNING: 블록 정보는 slot과 별개다. 칸을 쓰는 시점이 두 블록에서 다르다(집중: 앱을 열 때와 끝 시트에서 블록 안의 끝난 칸을 채움, 미래·진행 중 칸은 쓰지 않음, SPEC-1 / 계획: 끝 시트에서 답할 때). 같은 저장 구조에 `kind(focus|plan)`와 상태(`planned → active → ended`)를 두는 쪽이 단순하다. 소유: Eng 리뷰.
- WARNING: 기기 두 대(동기화) 상황에서 블록 끝 알림은 블록을 만든 기기에만 걸린다. 지금 앱도 알림은 기기별이므로 같은 한계. 기록 필요.
- 상태 기계(블록):
```
  planned ──(시작 시각 도래)──▶ active ──(끝 시각)──▶ awaiting_answer ──(A 시트 답)──▶ ended
     │ 집중 블록은 planned 없이 바로 active        │ 답 없음 ─▶ ended(no_answer)
     └─(Todo에서 삭제)─▶ cancelled      active ─(끝내기/연장)─▶ ended / active(끝 시각 변경)
  금지: ended → active (연장은 active 중 홈 또는 끝 시트에서, 새 끝 시각으로 갱신. DEF-1)
```
- 롤백: 서버는 새 테이블·이벤트 타입만 추가(기존 계약 불변). 앱이 롤백되면 블록은 무시되고 30분 알림이 돌아온다.

### Section 2: 오류와 복구 지도 (기능 단위)
| 기능 | 실패 | 복구 | 사용자에게 |
|---|---|---|---|
| 블록 저장 | SQLite 쓰기 실패 | 저장 실패 문구(기존 SAVE_FAILED_TEXT 패턴), 알림 재예약 안 함 | "저장하지 못했어요. 다시 눌러 주세요" |
| 알림 재계산 | 예약 실패 | 다음 재계산 때 전부 다시 거는 기존 rearm 경로 | 없음(다음 앱 열기 때 복구) |
| 끝 알림 | 기기 재부팅·강제 종료로 사라짐 | 계획 블록: 앱 열 때 놓친 칸 채우기로 흡수(CP-1). 집중 블록: 앱 열 때 블록 안의 지난 칸을 채우고 끝 시트를 늦게 띄움(DEF-1) | 놓친 칸 채우기 시트 또는 늦은 끝 시트 |
| 끝 시트 저장 | 실패 | 시트 유지 + 실패 문구 | 실패 문구 |
| 놓친 칸 채우기 | 일부 칸 쓰기 실패 | 한 트랜잭션으로 묶어 전부 실패 처리 | 실패 문구, 칸은 빈 그대로 |
| 동기화 | 서버가 새 kind 거절(구버전 서버) | 항목별 rejected로 dead-letter(기존 R3) | 24시간 넘으면 배너 |
- CRITICAL GAP 없음. 단 "끝 알림 유실 → 놓친 칸 채우기로 흡수"는 Eng 리뷰에서 테스트로 증명해야 함.

### Section 3: 보안
- 새 서버 입력: 블록(시각, 길이, 카테고리, 할 일 이름). 할 일 이름은 자유 텍스트라 길이 상한·검증 필요(기존 ValidationPipe whitelist). 사용자 식별은 JWT `sub`만. 위협 낮음/영향 낮음. 소유: Eng 리뷰.
- 새 의존성 없음(알림 액션 실험을 취소하므로 `expo-task-manager`도 넣지 않음).

### Section 4: 데이터 흐름과 상호작용 경계
| 상호작용 | 경계 상황 | 처리 |
|---|---|---|
| 집중 시작 | 방해금지·일시 중지와 겹침 | 블록이 이기는지, 방해금지가 이기는지 미정. 소유: Eng(권장: 블록 끝 알림은 방해금지에도 보냄, 사용자가 직접 켠 것) |
| 집중 시작 | 이미 블록 진행 중 | 토스트에는 시작 버튼을 띄우지 않음. 연장은 홈·끝 시트(DEF-1) |
| 계획 블록 | 다른 계획 블록과 겹침 | Todo 입력에서 막기. 소유: Eng |
| 계획 블록 진행 중 | 사용자가 홈 [집중] 시작 | 집중 블록이 계획 블록을 대신함(실제가 계획보다 우선) |
| [끝내기] | 진행 중인 칸 처리 | 끝난 칸은 블록 카테고리로 채우고, 진행 중 칸은 쓰지 않음(SPEC-1). 평소 알림이 그 칸을 물음. 소유: Eng |
| 놓친 칸 채우기 | 방해금지·일시 중지·집중 블록 칸 포함 | 그 칸은 묶음에서 제외. 답 없던 계획 블록 칸은 포함하고 CP-1로 [계획대로]를 맨 위에(스펙 리뷰 일관성 1로 수정) |
| 놓친 칸 채우기 | 계획 블록 끝 시트 답 없음 | awaiting_answer는 다음 평소 알림 시각이나 앱 열기 중 먼저 오는 때 ended(no_answer)가 되고 놓친 칸 채우기로 넘어감. 소유: Eng |
| 놓친 칸 채우기 | "따로 채울게요" 표시 저장 | 기기 로컬 setting으로 충분(동기화 안 함). 소유: Eng |
| 놓친 칸 채우기 | 60분 late 규칙 | S1이 칸 source가 아니라 답한 시간대를 세므로(S1-COUNT) 지표와는 무관. 묶음 칸의 source 값은 CORE-1과 함께 Eng에서 |
| 놓친 칸 채우기 | "따로 채울게요" 뒤 앱 다시 열기 | 같은 칸은 다시 묻지 않음(위에서 확정) |
| 놓친 칸 채우기 | 범위가 날짜를 넘음(어제 밤~오늘) | 묶음 상한(예: 오늘 칸만 또는 최대 N시간) 필요. 소유: Eng |
| 끝 시트 | 두 번 탭 | 기존 saving 가드 재사용 |

### Section 5: 코드 품질
- `emptySlotBefore`(앞 두 칸)와 새 "연속 빈칸 찾기"는 같은 일을 하므로 하나로 합친다.
- 블록 구간 판정은 `isPaused`와 같은 모양이라 "건너뛸 구간" 함수 하나로 묶는다.
- 옛 Todo 코드(`application/components/todo/*`, `api/todoApi.tsx`)는 옛 서버 API용이라 재사용하지 않고 지운다.

### Section 6: 테스트
| 새 동작 | 종류 | 핵심 단언 |
|---|---|---|
| 블록 구간 알림 제외 + 끝 알림 1개 | 단위(scheduler, node:sqlite) | 13:30–15:30 블록이면 14:00·14:30·15:00 알림 없음, 15:30 block_end 1개 |
| 연장 | 단위 | 끝 알림이 16:00으로 옮겨지고 15:30 것은 취소 |
| 끝내기 | 단위 | 끝난 칸만 블록 카테고리, 진행 중·미래 칸은 쓰지 않음, 이후 평소 알림 복귀 |
| 계획 블록 답 없음 | 단위 | 칸 빈칸, 계획만 남음 |
| 놓친 칸 채우기 | 단위 | 방해금지·일시 중지·집중 블록 칸 제외, 답 없던 계획 블록 칸은 포함(CP-1 맨 위 버튼), 한 트랜잭션, "따로 채울게요" 뒤 다시 안 물음 |
| CP-1 | 단위 | 계획 블록 있던 칸이면 맨 위 버튼이 계획 카테고리 |
| CP-3 | 단위 | 어제 블록이 오늘 날짜로 복사, 겹침 없음 |
| S1-COUNT | 단위 | 같은 30분 시간대 안의 여러 행동은 1곳, 서로 다른 시간대 3곳이면 통과, Todo 저장 포함 |
| 실기기 | 수동 | 앱 종료 상태에서 끝 알림 → 시트, 앱 켠 상태에서 바로 시트(D23) |

### Section 7: 성능
- 블록 판정은 예약 계산(최대 398개) 안의 구간 비교라 비용 무시 가능. 연속 빈칸 찾기는 하루치 slot 조회 1번. 문제 없음.

### Section 8: 관측
- 새 이벤트 필요: `block_started{kind,source(toast|home|todo)}`, `block_ended{how(answer|extend|end_now|no_answer)}`, `batch_filled{count,deferred}`, `plan_block_set`. 기존 `ping_answered`(알림 답)와 함께 S1-COUNT(서로 다른 30분 시간대 수)를 계산한다. "블록이 실제로 쓰이는가"도 같은 이벤트로 본다. 소유: Eng.

### Section 9: 배포
- 서버 마이그레이션(블록 테이블, 이벤트 타입)이 앱보다 먼저. 구버전 앱은 새 항목을 보내지 않으므로 호환. 신버전 앱 + 구버전 서버는 rejected로 격리(기존 R3).
- 기능 플래그는 두지 않음(테스터 5명, 첫 배포 전).

### Section 10: 장기 방향
- 되돌리기 쉬움 4/5(서버는 추가만). Todo 탭 부활은 탭 구조를 바꾸므로 3/5.
- 다음 단계: 계획 블록과 실제 블록이 쌓이면 "계획한 시간에 실제로 했는가"가 F2 리포트·F3 코칭의 핵심 입력이 된다.
- 회고: 알림 액션 실험(구현 순서 3)은 이 계획으로 필요 없어졌다. 자동 채우기 보류도 닫힌다.

### Section 11: 디자인과 UX
| 기능 | 로딩 | 빈 상태 | 오류 | 성공 | 부분 |
|---|---|---|---|---|---|
| 홈 집중 표시 | 없음(로컬) | 블록 없으면 [집중] 버튼만 | 저장 실패 문구 | "업무 · 15:30까지" | — |
| 끝 시트 A | 없음 | — | 실패 문구 | 닫힘 + 토스트 | — |
| Todo 탭 | 없음 | "오늘 계획 블록 없음 · 어제 가져오기" | 실패 문구 | 목록 | 겹침 거절 |
| 놓친 칸 채우기 | 없음 | 빈칸 없으면 안 뜸 | 실패 문구 | 닫힘 | "따로 채울게요" |
- 정할 것(디자인 리뷰): 계획 화면에 총량과 Todo를 함께 보이는 방식(EXP-1b), 시간표 계획 표시(CP-2), 홈 [집중] 버튼 위치·크기(최소 표시 원칙).
- 권장: 구현 전에 /plan-design-review.

## NOT in scope
- CP-2 시간표 계획 표시: 디자인 리뷰 뒤로 연기(D12).
- CP-4 5분 전 예고: 뺌(D14).
- 알림 액션 버튼 실험(구현 순서 3)과 `expo-task-manager`: 이 계획으로 대체되어 하지 않음.
- 자동 채우기(`inferred`): 만들지 않음.

## What already exists
- D25 일시 중지 스케줄러 경로, `emptySlotBefore`, `continueCandidate`, 기록 시트·토스트, D23 앱 안 시트 열기, 동기화 큐와 R3 dead-letter. 모두 재사용.

## Dream state delta
- 이 계획 뒤: 앱이 사용자가 말한 시간에는 조용하고, 놓친 시간은 한 번에 채운다. 계획(Todo·총량)과 실제가 같은 날짜 안에서 갈라져 비교된다.
- 12개월 이상까지 남은 것: 사용자 패턴으로 묻는 시점을 앱이 먼저 제안하기, 계획 대비 실제를 시간 단위로 보여 주기(CP-2 이후).

## Implementation Tasks
- [ ] **T1 (P1, human: ~1d / CC: ~1h)** — app/scheduler — 블록 구간 알림 제외와 끝 알림
  - Surfaced by: Section 1·6
  - Files: application/scheduler/plan.ts, application/scheduler/scheduler.ts, 블록 저장 모듈(미정)
  - 주의: 끝 알림도 예약 상한(`MAX_PINGS = 398`, 400에서 고정 알림을 뺀 값)에 들어간다. 블록 끝 알림 수만큼 30분 알림 예약 기간을 줄이는 계산 필요(스펙 리뷰 완결성 4)
  - Verify: `cd application && npx jest scheduler`
- [ ] **T2 (P1, human: ~1d / CC: ~1h)** — app/UI — 집중 블록(토스트 계속, 홈 집중·끝내기, 끝 시트 A, 연장)
  - Surfaced by: UX-1, UX-2
  - Files: application/components/record/RecordSheet.tsx, 홈 화면, 새 끝 시트
  - Verify: 실기기 수동(앱 켬/끔 두 경우)
- [ ] **T3 (P1, human: ~2d / CC: ~2h)** — app/UI — Todo 탭을 계획 블록 목록으로 새로 만들기 + 어제 가져오기(CP-3)
  - Surfaced by: EXP-1, CP-3
  - Files: application/app/(tabs)/todo.tsx, application/components/todo/*(교체)
  - Verify: 단위 + 실기기
- [ ] **T4 (P1, human: ~1d / CC: ~1h)** — app — 놓친 칸 채우기 + 계획대로 기본값(CP-1)
  - Surfaced by: UX-3, CP-1
  - Files: application/record/recordLogic.ts, application/components/record/RecordSheet.tsx
  - Verify: `npx jest record`
- [ ] **T5 (P1, human: ~0.5d / CC: ~30min)** — server — 블록 저장·동기화와 이벤트 타입 마이그레이션 (저장 구조는 CORE-1, Eng 리뷰 결정 뒤 착수)
  - Surfaced by: Section 1·8·9
  - Files: server/src/migrations/(새 파일), server/src/Entity/(새 엔티티), server/src/Entity/event.entity.ts
  - Verify: `cd server && npm run test:e2e`
- [ ] **T6 (P2, human: ~1h / CC: ~10min)** — docs — 설계서·TODO 갱신: Todo 탭 제거 철회(설계서:176 "탭은 두 개", 234), 계획 "시간대 지정 안 함"(설계서:155)에 Todo 계획 블록 추가, Open Q1(자동 채우기)·Q3(계획에 할 일) 해소, 자동 채우기 보류 닫기, 구현 순서 3 알림 액션 실험 취소, S1을 S1-COUNT로 교체, S3 분모에서 블록 칸 제외(일시 중지와 같은 방식), EXP-1b 선택 기준(2주 뒤 `plan_set`과 `plan_block_set` 사용량으로 하나를 고름)
  - Surfaced by: 결정 장부 전체
  - Files: docs/designs/left30-relaunch.md, TODO.md
  - Verify: 문서 리뷰

## 0I. 시간 순서 점검
- 1시간째(기초): 블록 저장 구조(CORE-1)와 상태 기계를 먼저 정해야 T1·T5가 시작된다. Eng 리뷰 첫 안건.
- 2~3시간째(핵심): 스케줄러에서 "건너뛸 구간"(방해금지, 일시 중지, 블록)과 예약 상한 재계산. 방해금지와 블록이 겹칠 때 규칙(DEF-1)이 여기서 필요하다.
- 4~5시간째(통합): 앱이 꺼진 동안 끝난 블록을 앱 열 때 정리하는 경로(늦은 끝 시트, 놓친 칸 채우기). D23 앱 안 시트 열기와 겹치는 순서.
- 6시간째 이후(마무리): Todo 탭 교체로 탭 구조와 옛 Todo 코드 삭제, 설계서 갱신(T6), 실기기 확인.
- 노력: 사람 약 1~1.5주 / CC+gstack 약 6~8시간(T1~T6 합).

## Reality rows
- REALITY: premise-table pass 전제 5개(0A), 검증 안 됨 1개(테스터도 같은 불편을 느끼는지, n=1) docs/designs/left30-relaunch.md:12
- REALITY: already-done pass 알림 일시 중지 경로 재사용 확인 application/scheduler/plan.ts:17
- REALITY: surface-check pass 서버 source CHECK 제약 확인 server/src/migrations/1792540800000-Init.ts:27
- REALITY: binding-decisions finding Todo 탭 제거(설계서:176)와 S1 정의(설계서:306)를 이번 결정이 바꿈 docs/designs/left30-relaunch.md:176
- REALITY: numbers finding 예약 상한 398에 블록 끝 알림이 들어감 application/scheduler/plan.ts:36
- REALITY: deferred-asks pass 자동 채우기 보류 항목이 이 계획으로 닫힘 TODO.md:78
- REALITY: pr-count n/a 브랜치 push 없음, PR 없음
- PLAN_REALITY: 수동 작성(gstack-plan-reality가 Bun 충돌로 실행되지 않음), 7행, 검증 안 됨 1

## Completion Summary
```
  +====================================================================+
  |            MEGA PLAN REVIEW — COMPLETION SUMMARY                   |
  +====================================================================+
  | Mode selected        | SELECTIVE EXPANSION                         |
  | System Audit         | 자동 채우기 보류, 알림 액션 실험 미진행, 서버 source CHECK |
  | Step 0               | UX 4순간 확정, Todo=계획 블록, S1 재정의    |
  | Section 1  (Arch)    | 3 issues found                              |
  | Section 2  (Errors)  | 6 error paths mapped, 0 GAPS                |
  | Section 3  (Security)| 1 issues found, 0 High severity             |
  | Section 4  (Data/UX) | 13 edge cases mapped, 4 unhandled(Eng 소유) |
  | Section 5  (Quality) | 3 issues found                              |
  | Section 6  (Tests)   | Diagram produced, 0 gaps                    |
  | Section 7  (Perf)    | 0 issues found                              |
  | Section 8  (Observ)  | 1 gaps found                                |
  | Section 9  (Deploy)  | 1 risks flagged                             |
  | Section 10 (Future)  | Reversibility: 4/5, debt items: 1           |
  | Section 11 (Design)  | 3 issues(디자인 리뷰로)                     |
  +--------------------------------------------------------------------+
  | NOT in scope         | written (4 items)                           |
  | What already exists  | written                                     |
  | Dream state delta    | written                                     |
  | Error/rescue registry| 6 rows, 0 CRITICAL GAPS                     |
  | Failure modes        | 6 total, 0 CRITICAL GAPS                    |
  | TODOS.md updates     | 1 items proposed (CP-2)                     |
  | Scope proposals      | 4 proposed, 2 accepted (EXP + SEL)          |
  | CEO plan             | written                                     |
  | Outside voice        | codex: unavailable (Bun 충돌), 네이티브 대체 도구 없음 |
  | Lake Score           | N/A (10/10 선택지를 낸 질문 없음)            |
  | Diagrams produced    | 4 (흐름, 아키텍처, 상태 기계, 사용자 흐름)  |
  | Stale diagrams found | 0                                           |
  | Unresolved decisions | 3 (CORE-1, DEF-1, 계획과 총량 합치는 규칙)  |
  | Reality rows         | 7/7 rows, 1 unverified                      |
  +====================================================================+
```

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 (이 기능) | ISSUES OPEN | 4 proposals, 2 accepted, 1 deferred |
| Outside Review | codex (`/plan-ceo-review` outside voice) | Independent 2nd opinion | 1 | unavailable | Bun 1.3.11 충돌로 codex 확인 실패, 대체 도구 없음, no completed external review |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 (이 기능) | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 (이 기능) | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **OUTSIDE COVERAGE:** codex, plan-review, unavailable(probe가 Bun 충돌로 실패). 네이티브 대체(Plan 하위 에이전트)는 TaskOutput 도구가 없어 실행하지 않음. 별도로 스펙 리뷰 하위 에이전트 3회(최종 9/10 PASS)는 완료했으나 외부 리뷰로 치지 않음.
- **VERDICT:** CEO 범위 결정 완료(남은 결정은 Eng·디자인 소유). eng review required.

**UNRESOLVED DECISIONS:**
- CORE-1: 블록·묶음 칸 저장 구조와 source 값 (소유: /plan-eng-review)
- DEF-1: 블록 길이, 방해금지 겹침, 토스트 버튼 이름, 날짜를 넘는 묶음 상한 등 기본값 (소유: /plan-eng-review)
- 계획 블록 시간과 총량 목표를 합치는 규칙, 계획 화면 디자인(EXP-1b), CP-2 (소유: /plan-design-review)

