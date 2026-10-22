// 한 번에 하나만 실행한다(R4 동기화, R5 알림 재계산).
// 실행 중에 들어온 호출은 모두 "끝난 뒤 한 번 더"로 합친다. 그 호출들은 재실행 결과를 받는다.
export function singleFlight<T>(fn: () => Promise<T>): () => Promise<T> {
  let running: Promise<T> | null = null;
  let queued: Promise<T> | null = null;

  const call = (): Promise<T> => {
    if (!running) {
      running = fn().finally(() => {
        running = null;
      });
      return running;
    }
    if (!queued) {
      queued = running
        .catch(() => undefined)
        .then(() => {
          queued = null;
          return call();
        });
    }
    return queued;
  };

  return call;
}
