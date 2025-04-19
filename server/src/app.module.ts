import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
