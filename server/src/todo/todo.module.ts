import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Todo } from '../entity/todo.entity';
import { TodoController } from './todo.controller';
import { TodoService } from './todo.service';
import { User } from 'src/entity/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Todo, User])], // Add your entities here
  controllers: [TodoController],
  providers: [TodoService],
})
export class TodoModule {}
