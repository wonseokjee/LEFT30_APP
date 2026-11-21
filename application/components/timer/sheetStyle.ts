import { StyleSheet } from 'react-native';
import { makeStyles } from '@/theme/theme';

// 타이머 시트 공통 모양(아래 시트). 고른 칸·주 버튼은 강조색 채움 + 벽색 글자(G6).
export const MAX_SCALE = 1.3;

export const useSheet = makeStyles((t) =>
  StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: t.overlay },
    body: {
      backgroundColor: t.sheet,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 24,
      gap: 12,
    },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: t.line },
    header: { color: t.text, fontSize: 17 },
    sub: { color: t.sub, fontSize: 14 },
    error: { color: t.sub, fontSize: 14 },
    primary: { minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: t.acc },
    primaryText: { color: t.onAcc, fontSize: 17 },
    secondary: {
      minHeight: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: t.border,
    },
    text: { color: t.text, fontSize: 17 },
  }),
);
