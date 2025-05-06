export type timeSlotType = {
  // userId: string;
  id: string;
  action: string;
  category: string | null;
  color: string;
  created_at: string;
  description: string;
  ended_at: string;
  started_at: string;
  tags: string | null;
};

//{"action": "자기개발", "category": null, "color": "#FFFFFF",
// "created_at": "2025-05-06T07:35:10.461Z", "description": "",
// "ended_at": "2025-05-06T07:00:10.263Z", "id": "793014be-5175-48ac-b60b-1fd71354596e",
// "started_at": "2025-05-06T06:30:10.263Z", "tags": null}

export type timeSlotTypes = timeSlotType[];
