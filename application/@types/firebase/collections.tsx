export type setCollection_Test = {
  userId: string;
  date: string;
  event: {
    action: string | null;
    detail: string;
    newDate: number;
    startTime: string;
    endTime: string;
  };
};

export type setCollection_Tests = setCollection_Test[];

export type firebase_type = {
  [x: string]: any;
};
