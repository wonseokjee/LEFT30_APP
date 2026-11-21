import { requireOptionalNativeModule } from 'expo-modules-core';
import type { OngoingContent } from '@/record/ongoing';

// 안드로이드 진행 중 고정 알림(T8). 네이티브 모듈이 없는 빌드(옛 개발 빌드, iOS, 테스트)에서는 아무것도 하지 않는다.
type Native = { show(c: OngoingContent): void; hide(): void };
const native = requireOptionalNativeModule<Native>('OngoingTimer');

export const ONGOING_TASK = 'Left30OngoingAction';

export function showOngoing(c: OngoingContent): void {
  native?.show(c);
}

export function hideOngoing(): void {
  native?.hide();
}
