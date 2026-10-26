import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import type { Router } from 'expo-router';
import { openNodeDb } from '@/test/nodeDb';
import { migrate } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import { ACCOUNT_KEY, setSetting } from '@/db/records';
import { afterLogin, NOTIF_ONBOARDED_KEY } from './afterLogin';

// 로그인 직후 분기(eng review D7, D10): 계정 전환 정리와 알림 설명 화면 여부.

const mockRuntime: { db: ReturnType<typeof openNodeDb> | null } = { db: null };

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
}));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn() }));
jest.mock('@/runtime/appRuntime', () => ({
  getRuntime: () => mockRuntime,
  onForeground: jest.fn(),
}));

const permissions = Notifications.getPermissionsAsync as jest.Mock;
const cancelAll = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock;
const secureGet = SecureStore.getItemAsync as jest.Mock;

function fakeRouter() {
  const replace = jest.fn();
  return { router: { replace } as unknown as Router, replace };
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockRuntime.db = openNodeDb();
  await migrate(mockRuntime.db, MIGRATIONS);
  secureGet.mockResolvedValue('user-a');
});

describe('afterLogin 온보딩 분기', () => {
  it.each([
    // granted, canAskAgain, onboarded, 이동
    [false, true, false, '/(onboarding)'],
    [false, true, true, '/(tabs)'],
    [false, false, false, '/(tabs)'],
    [true, true, false, '/(tabs)'],
  ])('권한 %s · 다시 물을 수 있음 %s · 설명 봄 %s → %s', async (granted, canAskAgain, onboarded, route) => {
    permissions.mockResolvedValue({ granted, canAskAgain });
    if (onboarded) await setSetting(mockRuntime.db!, NOTIF_ONBOARDED_KEY, true);
    const { router, replace } = fakeRouter();
    await afterLogin(router);
    expect(replace).toHaveBeenCalledWith(route);
  });
});

describe('afterLogin 계정 전환 (D10)', () => {
  beforeEach(() => permissions.mockResolvedValue({ granted: true, canAskAgain: true }));

  it('다른 계정으로 로그인하면 예약 알림을 모두 취소한다', async () => {
    await setSetting(mockRuntime.db!, ACCOUNT_KEY, 'user-old');
    await afterLogin(fakeRouter().router);
    expect(cancelAll).toHaveBeenCalledTimes(1);
  });

  it('같은 계정이거나 user_id가 없으면(개발용 시작) 알림을 건드리지 않는다', async () => {
    await setSetting(mockRuntime.db!, ACCOUNT_KEY, 'user-a');
    await afterLogin(fakeRouter().router);
    secureGet.mockResolvedValue(null);
    await afterLogin(fakeRouter().router);
    expect(cancelAll).not.toHaveBeenCalled();
  });
});
