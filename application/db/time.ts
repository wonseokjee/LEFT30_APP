// 옛 표(slot·plan·block·event)는 UTC ISO 글자, v3 표(item·entry·pause·plan_v3)는 UTC 밀리초 정수다.
// 둘 사이 변환은 여기서만 한다(eng 리뷰 2 R7).

export function isoToMs(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error(`invalid ISO time: ${iso}`);
  return ms;
}

export function msToIso(ms: number): string {
  return new Date(ms).toISOString();
}
