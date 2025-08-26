import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { TimetableModule } from './timetable/timetable.module';
import { TodoModule } from './todo/todo.module';
import { PushModule } from './push/push.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres', // or 'mysql', 'mariadb', 'sqlite', 'mssql'
      // host: process.env.DB_HOST,  // e.g. 'localhost'
      host: 'localhost',
      // port: parseInt(process.env.DB_PORT, 10) || 5432, // default PostgreSQL port 5432
      port: 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres', // e.g. 'password'
      database: process.env.DB_NAME || 'postgres', // e.g. 'mydatabase'
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // set to false in production
    }),
    UserModule,
    TimetableModule,
    TodoModule,
    PushModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
