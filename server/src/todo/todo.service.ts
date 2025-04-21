import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '../entity/todo.entity';
import { CreateTodoDto } from '../dto/todo/create-todo.dto';
import { UpdateTodoDto } from '../dto/todo/update-todo.dto';
import { User } from 'src/entity/user.entity';

@Injectable()
export class TodoService {
  constructor(
    @InjectRepository(Todo)
    private readonly todoRepository: Repository<Todo>,
  ) {}

  async create(createTodoDto: CreateTodoDto, user: User): Promise<Todo> {
    const todo = this.todoRepository.create({ ...createTodoDto, user });
    return this.todoRepository.save(todo);
  }

  async findAll(user: User): Promise<Todo[]> {
    return this.todoRepository.find({ where: { user } });
  }

  async findOne(id: string, user: User): Promise<Todo> {
    const todo = await this.todoRepository.findOne({ where: { id, user } });
    if (!todo) throw new NotFoundException('Todo not found');
    return todo;
  }

  async update(
    id: string,
    updateDto: UpdateTodoDto,
    user: User,
  ): Promise<Todo> {
    const todo = await this.findOne(id, user);
    Object.assign(todo, updateDto);
    return this.todoRepository.save(todo);
  }

  async remove(id: string, user: User): Promise<void> {
    const todo = await this.findOne(id, user);
    await this.todoRepository.remove(todo);
  }
}
