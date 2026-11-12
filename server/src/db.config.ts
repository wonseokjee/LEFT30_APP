import { DataSourceOptions } from 'typeorm';
import { User } from './Entity/user.entity';
import { Slot } from './Entity/slot.entity';
import { Plan } from './Entity/plan.entity';
import { AppEvent } from './Entity/event.entity';
import { Block } from './Entity/block.entity';
import { Init1792540800000 } from './migrations/1792540800000-Init';
import { Block1794441600000 } from './migrations/1794441600000-Block';

// 앱과 마이그레이션 CLI가 함께 쓰는 설정. 스키마는 마이그레이션으로만 바꾼다.
export function dbOptions(env: NodeJS.ProcessEnv): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST ?? 'localhost',
    port: parseInt(env.DB_PORT ?? '5432', 10),
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    entities: [User, Slot, Plan, AppEvent, Block],
    migrations: [Init1792540800000, Block1794441600000],
    synchronize: false,
  };
}
