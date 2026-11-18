import { pingEventId, uuidv5, uuidv7 } from './uuid';

describe('uuidv7', () => {
  it('앞 48비트가 밀리초 시각이고 버전·변형 비트가 맞다', () => {
    const ms = Date.parse('2026-11-18T09:00:00.000Z');
    const id = uuidv7(ms);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(parseInt(id.replace(/-/g, '').slice(0, 12), 16)).toBe(ms);
  });

  it('시각 순서대로 글자 순서도 커진다', () => {
    const a = uuidv7(1_000);
    const b = uuidv7(2_000);
    expect(a < b).toBe(true);
    expect(uuidv7(1_000)).not.toBe(a);
  });
});

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
