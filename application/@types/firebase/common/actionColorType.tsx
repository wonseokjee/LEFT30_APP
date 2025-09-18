import { calm_summer, welcome_spring, candy_shade } from '@/assets/palette';

export type ACTION_TYPE = {
  수면: string;
  휴식: string;
  운동: string;
  관계: string;
  자기개발: string;
  업무: string;
};

// 액션 타입 키 배열
const ACTION_KEYS = [
  '자기개발',
  '휴식',
  '운동',
  '관계',
  '수면',
  '업무',
] as const;

// calm_summer 팔레트 기반으로 동적으로 색상 매핑
export const ACTION_TYPE_COLOR: ACTION_TYPE = ACTION_KEYS.reduce(
  //user 색상 theme 설정에 따라 바뀌도록. ver2.0에...
  (acc, key, idx) => {
    acc[key] = welcome_spring[idx % welcome_spring.length];
    return acc;
  },
  {} as ACTION_TYPE
);
