export type timeSlotType = {
  // userId: string;
  id: string;
  action: string; // 일정 종류 (공부, 운동, 휴식 등)
  category: string | null; 
  color: string | null;
  created_at: string;
  description: string; // 내용
  ended_at: string;
  started_at: string;
  tags: string | null;
  range?: number | null; // 추가된 range 속성
};


export type timeSlotTypes = timeSlotType[];
