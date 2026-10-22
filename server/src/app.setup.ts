import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

export const BODY_LIMIT = '1mb';

// main.ts와 e2e 테스트가 같은 설정을 쓰도록 한곳에 둔다.
export function configureApp(app: NestExpressApplication): void {
  // R3: 본문 1MB 초과는 413
  app.useBodyParser('json', { limit: BODY_LIMIT });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
}
