/*
 * 홈 고양이 방 배치(left30-visual.md 4.1·4.3c, 시안 design/cat-image room/home-desk.html).
 * 모든 값은 dp. 기준 폰 393dp 폭에서 시안과 같은 값이 나오고, 다른 폭은 폭에 비례한다(G7).
 *
 *   ┌──────────────────────┐  날짜(위 왼쪽)
 *   │ 다음 30분 기록 알림까지│  라벨: 오른쪽 끝 = 숫자 고정선
 *   │ 12:41          🐈     │  숫자 칸 아래 끝 = 책상 윗면(G5), 고양이는 윗면 오른쪽
 *   │ ▔▔▔▔▔ 책상 ▔▔▔▔▔▔▔   │  뒷다리 끝 = 바닥선 바로 아래
 *   ├─────── 바닥선(63%) ──┤
 *   │      (가구 자리)       │
 *   │       [시작]          │  묶음 아래 끝 = 탭 위 20
 *   │   오늘 지금까지 2줄    │
 *   └──────────────────────┘
 */

// 방 그림 1024×1536, 벽·바닥 경계는 높이의 63%.
export const ROOM_W = 1024;
export const ROOM_H = 1536;
export const FLOOR_RATIO = 0.63;

// 책상 그림(원본 1774×887 기준 좌표): 윗면 y183, 윗면 안쪽 y212, 뒷다리 끝 y628, 책상 가로 166~1607(1441).
const DESK_SRC_W = 1774;
const DESK_SRC_H = 887;
const DESK_TOP_Y = 183;
const DESK_SEAT_Y = 212;
const DESK_BACK_LEG_Y = 628;
const DESK_BODY_W = 1441;
const DESK_BOX_393 = 370;

// 주아 숫자 글자 폭(1000 기준). 칸 폭은 가장 넓은 4(628)보다 조금 넓은 0.63em(G4).
export const JUA_ADV: Record<string, number> = { 0: 612, 1: 411, 2: 585, 3: 550, 4: 628, 5: 577, 6: 618, 7: 605, 8: 581, 9: 589 };
export const DIGIT_EM = 0.63;
export const COLON_EM = 0.3;

export const NUM_393 = 80;
export const NUM_MAX = 96;
export const SIDE = 26; // 숫자 왼쪽 여백
export const TAB_GAP = 20; // 바닥 묶음 아래 끝 ~ 탭 위
export const BUTTON_H = 48;
export const BARS_H = 72; // "오늘 지금까지" 두 줄 묶음
export const BUTTON_BARS_GAP = 22;

export type RoomLayout = {
  k: number; // 393 대비 비율
  room: { left: number; top: number; width: number; height: number };
  floorY: number;
  desk: { left: number; top: number; width: number; height: number };
  surfaceY: number; // 숫자 칸 아래 끝·고양이 발
  num: number; // 큰 숫자 글자 크기
  numLeft: number;
  cat: { right: number; height: number; sleepHeight: number };
  buttonTop: number;
  barsTop: number;
};

export function roomLayout(width: number, height: number): RoomLayout {
  const k = width / 393;
  // 방 그림은 cover로 깐다.
  const scale = Math.max(width / ROOM_W, height / ROOM_H);
  const rw = ROOM_W * scale;
  const rh = ROOM_H * scale;
  const room = { left: (width - rw) / 2, top: (height - rh) / 2, width: rw, height: rh };
  const floorY = room.top + rh * FLOOR_RATIO;

  const ds = (DESK_BOX_393 * k) / DESK_BODY_W;
  const deskTop = floorY + 4 * k - (DESK_BACK_LEG_Y - DESK_TOP_Y) * ds; // 뒷다리 끝이 바닥선 바로 아래
  const desk = {
    left: (width - DESK_SRC_W * ds) / 2,
    top: deskTop - DESK_TOP_Y * ds,
    width: DESK_SRC_W * ds,
    height: DESK_SRC_H * ds,
  };
  const surfaceY = Math.round(deskTop + (DESK_SEAT_Y - DESK_TOP_Y) * ds); // 윗면 안쪽

  const num = Math.min(NUM_MAX, Math.round(NUM_393 * k));
  const buttonTop = height - TAB_GAP - BARS_H - BUTTON_BARS_GAP - BUTTON_H;
  return {
    k,
    room,
    floorY,
    desk,
    surfaceY,
    num,
    numLeft: SIDE * k - (num * (DIGIT_EM - 0.56)) / 2, // 칸 안 여백만큼 당겨 첫 글자가 여백 선에서 시작
    cat: { right: 10 * k, height: 70 * k, sleepHeight: 52 * k },
    buttonTop,
    barsTop: buttonTop + BUTTON_H + BUTTON_BARS_GAP,
  };
}

// 끝 숫자는 칸 가운데에서 오른쪽으로 (칸 폭 − 글자 폭) ÷ 4만큼만 옮긴다(2026-11-21 사용자 선택).
export function lastDigitShift(digit: string, num: number): number {
  const adv = JUA_ADV[digit];
  if (adv === undefined) return 0;
  return ((DIGIT_EM * 1000 - adv) / 1000) * num / 4;
}

// 라벨 고정선(숫자 상자 왼쪽에서): 마지막 칸 오른쪽 끝 − 4.1(80 기준).
export function labelLine(text: string, num: number): number {
  let w = 0;
  for (const ch of text) w += (ch === ':' ? COLON_EM : DIGIT_EM) * num;
  return w - (4.1 * num) / 80;
}
