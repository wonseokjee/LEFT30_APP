import { singleFlight } from './singleFlight';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe('singleFlight', () => {
  it('실행 중에 들어온 호출 여러 개를 끝난 뒤 한 번으로 합친다', async () => {
    const gates = [deferred(), deferred()];
    let runs = 0;
    let active = 0;
    let maxActive = 0;
    const fn = singleFlight(async () => {
      const n = runs++;
      active++;
      maxActive = Math.max(maxActive, active);
      await gates[n].promise;
      active--;
      return n;
    });

    const first = fn();
    const queued = [fn(), fn(), fn()];
    gates[0].resolve();
    expect(await first).toBe(0);
    gates[1].resolve();
    expect(await Promise.all(queued)).toEqual([1, 1, 1]);
    expect(runs).toBe(2);
    expect(maxActive).toBe(1);
  });

  it('앞선 실행이 실패해도 대기 중인 호출은 다시 실행된다', async () => {
    let runs = 0;
    const gate = deferred();
    const fn = singleFlight(async () => {
      runs++;
      if (runs === 1) {
        await gate.promise;
        throw new Error('boom');
      }
      return 'ok';
    });
    const first = fn();
    const second = fn();
    gate.resolve();
    await expect(first).rejects.toThrow('boom');
    await expect(second).resolves.toBe('ok');
  });
});
