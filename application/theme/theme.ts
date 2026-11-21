import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { create } from 'zustand';

/*
 * 낮/밤 색(left30-visual.md 6절, D15·D24·G10·G11). 화면은 색 값을 직접 쓰지 않고 이 이름을 쓴다.
 *
 *  이름        낮         밤(임시, G10)   쓰는 곳
 *  wall       #F3E2D0    #3B3734        방 벽(배경 그림이 없는 화면의 바탕)
 *  floor      #D2BDAB    #5C524C        방 바닥
 *  text       #5A4030    #F3E8DC        본문, 큰 숫자
 *  sub        #765642    #B8A898        보조 글자(낮은 벽 위에서만, 바닥 위 작은 글자는 text)
 *  acc        #4E4842    #D6CEC6        강조(임시 중립): 켜진 버튼·고른 칸은 채움, 막대
 *  onAcc      #F3E2D0    #3B3734        강조 채움 위 글자(벽색)
 *  border     #8A705E    #8D7F74        벽·시트 위 테두리
 *  floorBorder #5A4030   #F3E8DC        바닥 위 테두리 버튼(G11)
 *
 * sheet·cell·line·overlay는 6절에 없던 값으로, 시트를 벽색 계열 종이로 보이게 하는 첫 값이다(폰에서 다시 본다).
 * 밤 값은 밤 방·밤 가구가 나온 뒤 밤 전용 표로 다시 정한다(G10).
 */

export type ThemeMode = 'system' | 'light' | 'dark';

export type Theme = {
  dark: boolean;
  wall: string;
  floor: string;
  text: string;
  sub: string;
  acc: string;
  onAcc: string;
  border: string;
  floorBorder: string;
  track: string;
  sheet: string;
  cell: string;
  line: string;
  overlay: string;
  tabBar: string;
};

export const LIGHT: Theme = {
  dark: false,
  wall: '#F3E2D0',
  floor: '#D2BDAB',
  text: '#5A4030',
  sub: '#765642',
  acc: '#4E4842',
  onAcc: '#F3E2D0',
  border: '#8A705E',
  floorBorder: '#5A4030',
  track: 'rgba(120,90,70,0.18)',
  sheet: '#FAF1E7',
  cell: '#EBDCCB',
  line: '#D8C5B2',
  overlay: 'rgba(40,28,20,0.35)',
  tabBar: '#F3E2D0',
};

export const DARK: Theme = {
  dark: true,
  wall: '#3B3734',
  floor: '#5C524C',
  text: '#F3E8DC',
  sub: '#B8A898',
  acc: '#D6CEC6',
  onAcc: '#3B3734',
  border: '#8D7F74',
  floorBorder: '#F3E8DC',
  track: 'rgba(230,215,200,0.16)',
  sheet: '#2E2B29',
  cell: '#45403C',
  line: '#57504A',
  overlay: 'rgba(0,0,0,0.5)',
  tabBar: '#2E2B29',
};

// 앱 안 선택(D15: 폰 설정 + 앱 안 선택). 값은 setting 'theme_mode'에 저장하고 부팅 때 읽는다.
export const THEME_KEY = 'theme_mode';
export const useThemeMode = create<{ mode: ThemeMode; setMode: (m: ThemeMode) => void }>((set) => ({
  mode: 'system',
  setMode: (mode) => set({ mode }),
}));

export function resolveTheme(mode: ThemeMode, system: 'light' | 'dark' | null | undefined): Theme {
  const dark = mode === 'dark' || (mode === 'system' && system === 'dark');
  return dark ? DARK : LIGHT;
}

export function useTheme(): Theme {
  const mode = useThemeMode((s) => s.mode);
  const system = useColorScheme();
  return resolveTheme(mode, system);
}

// 테마에 따라 바뀌는 스타일. 컴포넌트 안에서 `const styles = useStyles();`
export function makeStyles<T>(fn: (t: Theme) => T): () => T {
  const light = fn(LIGHT);
  const dark = fn(DARK);
  return function useStyles() {
    const t = useTheme();
    return useMemo(() => (t.dark ? dark : light), [t.dark]);
  };
}
