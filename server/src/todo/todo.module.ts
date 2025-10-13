import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Todo } from '../Entity/todo.entity';
import { TodoController } from './todo.controller';
import { TodoService } from './todo.service';
import { User } from 'src/Entity/user.entity';
import { AuthJWTModule } from 'src/auth/JWT/auth.jwt.module';

@Module({
  imports: [TypeOrmModule.forFeature([Todo, User]), AuthJWTModule],
  controllers: [TodoController],
  providers: [TodoService],
})
export class TodoModule {}
