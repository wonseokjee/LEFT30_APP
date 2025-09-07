export type timeSlotType = {
  // userId: string;
  id: string;
  action: string;
  category: string | null;
  color: string | null;
  created_at: string;
  description: string;
  ended_at: string;
  started_at: string;
  tags: string | null;
  range?: number | null; // 추가된 range 속성
};


export type timeSlotTypes = timeSlotType[];
