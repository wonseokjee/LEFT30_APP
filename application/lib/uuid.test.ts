import { pingEventId, uuidv5 } from './uuid';

describe('uuidv5', () => {
  it('RFC 4122 예시 값과 같다', () => {
    const DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    expect(uuidv5('www.example.com', DNS)).toBe('2ed6657d-e927-568b-95e1-2665a8aea6a2');
    expect(uuidv5('python.org', DNS)).toBe('886313e1-3b8a-5372-9b90-0c9aee199e5d');
  });

  it('핑 이벤트 id는 같은 칸·타입이면 같고 다르면 다르다', () => {
    const a = pingEventId('u1', 'ping_answered', '2026-11-12T03:00:00.000Z');
    expect(a).toBe(pingEventId('u1', 'ping_answered', '2026-11-12T03:00:00.000Z'));
    expect(a).not.toBe(pingEventId('u1', 'ping_displayed', '2026-11-12T03:00:00.000Z'));
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
