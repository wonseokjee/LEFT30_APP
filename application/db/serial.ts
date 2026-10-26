import type { Db } from './types';

export type RawQueries = Omit<Db, 'transaction'>;

/*
 * 한 연결 위의 모든 호출을 순서대로 하나씩 실행한다(eng review D2).
 * expo-sqlite의 배타 트랜잭션은 별도 연결이라, 그동안 다른 쓰기가 `database is locked`로 실패했다.
 * 여기서는 트랜잭션도 같은 연결에서 BEGIN/COMMIT으로 돌리고, 끝날 때까지 다른 호출을 줄 세운다.
 *
 * 트랜잭션 안에서는 반드시 tx를 쓴다. 바깥 db를 부르면 그 호출이 트랜잭션이 끝나기를 기다려 멈춘다.
 */
export function serialDb(raw: RawQueries): Db {
  let lock: Promise<void> = Promise.resolve();

  const withLock = <T,>(fn: () => Promise<T>): Promise<T> => {
    const run = lock.then(fn);
    lock = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  const tx: Db = {
    ...raw,
    transaction: () => Promise.reject(new Error('nested transaction')),
  };

  return {
    exec: (sql) => withLock(() => raw.exec(sql)),
    run: (sql, params) => withLock(() => raw.run(sql, params)),
    all: (sql, params) => withLock(() => raw.all(sql, params)),
    first: (sql, params) => withLock(() => raw.first(sql, params)),
    transaction: (fn) =>
      withLock(async () => {
        await raw.exec('BEGIN');
        try {
          const result = await fn(tx);
          await raw.exec('COMMIT');
          return result;
        } catch (e) {
          await raw.exec('ROLLBACK');
          throw e;
        }
      }),
  };
}
