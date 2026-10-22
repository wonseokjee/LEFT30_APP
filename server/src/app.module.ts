import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { SyncModule } from './sync/sync.module';
import { HealthModule } from './health/health.module';
import { dbOptions } from './db.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => dbOptions(process.env),
    }),
    AuthModule,
    SyncModule,
    HealthModule,
  ],
})
export class AppModule {}
