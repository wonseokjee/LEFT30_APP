import React, { forwardRef } from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';

/*
 * 공통 글자 부품(left30-visual.md 6.1 G2·G6·G8). 앱이 그리는 글자는 모두 이것을 쓴다.
 * - 글꼴은 주아 하나. React Native는 글꼴이 아래로 상속되지 않아 여기서 붙인다.
 * - 굵기는 쓰지 않는다(주아는 굵기 하나라 안드로이드가 가짜 굵기나 시스템 글꼴로 바꾼다). 강조는 색·크기로.
 * - 글꼴 불러오기에 실패하면 시스템 글꼴로 그린다(fontReady = false).
 * - 크기 단계: TYPE.title 22 · body 17 · sub 14 · small 13(줄 높이 1.4, small 1.3).
 */

export const FONT = 'Jua';
let fontReady = false;
export function setFontReady(ok: boolean) {
  fontReady = ok;
}

export const TYPE = StyleSheet.create({
  title: { fontSize: 22, lineHeight: 31 },
  body: { fontSize: 17, lineHeight: 24 },
  sub: { fontSize: 14, lineHeight: 20 },
  small: { fontSize: 13, lineHeight: 17 },
});

const NO_WEIGHT: TextStyle = { fontWeight: undefined };
// 기본은 본문 크기만(줄 높이를 붙이면 큰 숫자처럼 크기만 바꾼 글자가 잘린다).
const BASE: TextStyle = { fontSize: 17 };

function fontStyle(): TextStyle | null {
  return fontReady ? { fontFamily: FONT } : null;
}

export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...rest }, ref) {
  return <RNText ref={ref} {...rest} style={[BASE, fontStyle(), style, NO_WEIGHT]} />;
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  return <RNTextInput ref={ref} {...rest} style={[BASE, fontStyle(), style, NO_WEIGHT]} />;
});
