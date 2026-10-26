// 앱 전역 런타임의 분기(eng review D7): 콜드 스타트 첫 재계산만 rearm, needs_login 표시, 실패 백오프.
// expo 모듈과 스케줄러·동기화 엔진은 가짜로 바꾸고, DB는 Node SQLite를 쓴다.

const mockScheduler = { rearm: jest.fn(), reschedule: jest.fn() };
const mockSync = { requestSync: jest.fn() };

jest.mock('expo-notifications', () => ({
  cancelAllScheduledNotificationsAsync: jest.fn(),
}));
jest.mock('@/db/expoDb', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  openAppDb: async () => require('@/test/nodeDb').openNodeDb(),
}));
jest.mock('@/scheduler/expoNotifier', () => ({ ensurePingChannel: jest.fn(), expoNotifier: {} }));
jest.mock('@/scheduler/scheduler', () => ({ createScheduler: () => mockScheduler }));
jest.mock('@/sync/http', () => ({ httpTransport: {}, secureStoreAuth: {} }));
jest.mock('@/sync/engine', () => ({
  ...jest.requireActual('@/sync/engine'),
  createSyncEngine: () => mockSync,
}));

type RuntimeModule = typeof import('./appRuntime');
type StoreModule = typeof import('@/store/appStore');

// 모듈 전역 상태(coldStart, 실패 횟수)를 테스트마다 새로 시작한다.
async function freshRuntime(): Promise<{ runtime: RuntimeModule; store: StoreModule }> {
  let runtime!: RuntimeModule;
  let store!: StoreModule;
  jest.isolateModules(() => {
    // 모듈을 새로 읽어야 해서 require를 쓴다.
    /* eslint-disable @typescript-eslint/no-require-imports */
    runtime = require('./appRuntime');
    store = require('@/store/appStore');
    /* eslint-enable @typescript-eslint/no-require-imports */
  });
  const boot = await runtime.bootRuntime();
  expect(boot.ok).toBe(true);
  return { runtime, store };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockScheduler.rearm.mockResolvedValue({ status: 'ok' });
  mockScheduler.reschedule.mockResolvedValue({ status: 'ok' });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('rescheduleNow (D4)', () => {
  it('프로세스 시작 후 첫 호출만 rearm하고, 그다음부터는 차이만 반영한다', async () => {
    const { runtime } = await freshRuntime();
    await runtime.rescheduleNow();
    await runtime.rescheduleNow();
    await runtime.rescheduleNow();
    expect(mockScheduler.rearm).toHaveBeenCalledTimes(1);
    expect(mockScheduler.reschedule).toHaveBeenCalledTimes(2);
  });

  it('재계산이 던져도 앱으로 퍼지지 않는다', async () => {
    const { runtime } = await freshRuntime();
    mockScheduler.rearm.mockRejectedValue(new Error('alarm api failed'));
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(runtime.rescheduleNow()).resolves.toBeUndefined();
  });
});

describe('syncNow', () => {
  it('needs_login이면 로그인 안내를 켜고, 성공하면 끈다', async () => {
    const { runtime, store } = await freshRuntime();
    mockSync.requestSync.mockResolvedValueOnce({ status: 'needs_login', sent: 0 });
    await runtime.syncNow();
    expect(store.useAppStore.getState().needsLogin).toBe(true);

    mockSync.requestSync.mockResolvedValueOnce({ status: 'done', sent: 1 });
    await runtime.syncNow();
    expect(store.useAppStore.getState().needsLogin).toBe(false);
  });

  it('실패하면 5초 뒤 다시 시도하고, 다시 실패하면 간격을 두 배로 늘린다', async () => {
    const { runtime } = await freshRuntime();
    jest.useFakeTimers();
    const timeout = jest.spyOn(global, 'setTimeout');
    mockSync.requestSync.mockResolvedValue({ status: 'retry', sent: 0 });

    await runtime.syncNow();
    expect(timeout).toHaveBeenLastCalledWith(expect.any(Function), 5_000);
    expect(mockSync.requestSync).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(5_000);
    expect(mockSync.requestSync).toHaveBeenCalledTimes(2);
    expect(timeout).toHaveBeenLastCalledWith(expect.any(Function), 10_000);
  });
});
