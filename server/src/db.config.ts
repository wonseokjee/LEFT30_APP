import { DataSourceOptions } from 'typeorm';
import { User } from './Entity/user.entity';
import { Slot } from './Entity/slot.entity';
import { Plan } from './Entity/plan.entity';
import { AppEvent } from './Entity/event.entity';
import { Init1792540800000 } from './migrations/1792540800000-Init';

// 앱과 마이그레이션 CLI가 함께 쓰는 설정. 스키마는 마이그레이션으로만 바꾼다.
// DATABASE_URL이 있으면(배포: Neon) 그 주소로 SSL 접속하고, 없으면 DB_* 값(로컬·e2e)을 쓴다.
export function dbOptions(env: NodeJS.ProcessEnv): DataSourceOptions {
  const common = {
    type: 'postgres' as const,
    entities: [User, Slot, Plan, AppEvent],
    migrations: [Init1792540800000],
    synchronize: false,
  };
  if (env.DATABASE_URL) {
    return {
      ...common,
      url: env.DATABASE_URL,
      ssl: true,
      // 서버리스 함수 인스턴스가 여러 개 떠도 연결이 몰리지 않게 작게 둔다. 실제 풀링은 Neon pooler가 한다.
      extra: { max: 3 },
    };
  }
  return {
    ...common,
    host: env.DB_HOST ?? 'localhost',
    port: parseInt(env.DB_PORT ?? '5432', 10),
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  };
}
