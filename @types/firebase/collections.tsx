export type setCollection_Test = {
  userId: string;
  date: string;
  event: {
    action: string | null;
    detail: string;
    startTime: string;
    endTime: string;
  };
};

export type setCollection_Tests = setCollection_Test[];
