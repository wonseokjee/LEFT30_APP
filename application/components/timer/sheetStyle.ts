import { StyleSheet } from 'react-native';
import { GRAY_0, GRAY_5, GRAY_7, GRAY_8, GRAY_9 } from '@/assets/palette';
import { ITEM_COLOR } from '@/record/categoryStyle';

// 타이머 시트 공통 모양(기록 시트와 같은 어두운 아래 시트). 색·글꼴은 디자인 개편(T10·T11)에서 바꾼다.
export const MAX_SCALE = 1.3;
export const ACCENT = ITEM_COLOR.focus; // 임시 강조색(강조색 최종값은 visual 11절)

export const sheet = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  body: {
    backgroundColor: GRAY_9,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: GRAY_7 },
  header: { color: GRAY_0, fontSize: 16 },
  sub: { color: GRAY_5, fontSize: 14 },
  error: { color: GRAY_5, fontSize: 13 },
  primary: { minHeight: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT },
  secondary: {
    minHeight: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GRAY_8,
  },
  text: { color: GRAY_0, fontSize: 16 },
});
