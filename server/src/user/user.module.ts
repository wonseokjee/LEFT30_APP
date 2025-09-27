import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entity/user.entity';
import { AuthJWTService } from 'src/auth/JWT/auth.jwt.service';
import { ConfigModule } from '@nestjs/config';
import { AuthJWTModule } from 'src/auth/JWT/auth.jwt.module';
import { TimetableEntry } from 'src/entity/timetableEntry.entity';
import { Todo } from 'src/entity/todo.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([User, TimetableEntry, Todo]),
    AuthJWTModule,
  ],
  controllers: [UserController],
  providers: [UserService, AuthJWTService],
  exports: [UserService, AuthJWTService],
})
export class UserModule {}
