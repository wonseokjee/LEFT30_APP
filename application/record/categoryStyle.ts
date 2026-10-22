import { calm_summer, GRAY_0, GRAY_9 } from '@/assets/palette';
import type { Category } from '@/db/types';

// 디자인 토큰(D13): calm_summer 6색, 순서는 업무·휴식·관계·운동·자기개발·수면. 색 지정 자체는 연기(D14).
export const CATEGORY_COLOR: Record<Category, string> = {
  work: calm_summer[0],
  rest: calm_summer[1],
  relationship: calm_summer[2],
  exercise: calm_summer[3],
  self_dev: calm_summer[4],
  sleep: calm_summer[5],
};

// 기록 시트 3x2 그리드 순서
export const GRID_ORDER: Category[] = [
  'sleep',
  'rest',
  'exercise',
  'relationship',
  'self_dev',
  'work',
];

// 배경색 위 글자색. 밝은 배경이면 어두운 글자.
export function textOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? GRAY_9 : GRAY_0;
}
