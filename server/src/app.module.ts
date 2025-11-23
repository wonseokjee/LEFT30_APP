import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { TimetableModule } from './timetable/timetable.module';
import { TodoModule } from './todo/todo.module';
import { PushModule } from './push/push.module';
import { AuthModule } from './auth/auth.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthJWTModule } from './auth/JWT/auth.jwt.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres', // or 'mysql', 'mariadb', 'sqlite', 'mssql'
      // host: process.env.DB_HOST,  // e.g. 'localhost'
      host: 'localhost',
      // port: parseInt(process.env.DB_PORT, 10) || 5432, // default PostgreSQL port 5432
      port: 5432,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD, // e.g. 'password'
      database: process.env.DB_NAME , // e.g. 'mydatabase'
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // set to false in production
    }),
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({isGlobal: true, envFilePath: '.env'}),
    UserModule,
    TimetableModule,
    TodoModule,
    PushModule,
    AuthModule,
    AuthJWTModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
