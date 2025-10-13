import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '../Entity/todo.entity';
import { CreateTodoDto } from '../dto/todo/create-todo.dto';
import { UpdateTodoDto } from '../dto/todo/update-todo.dto';
import { User } from 'src/Entity/user.entity';

@Injectable()
export class TodoService {
  constructor(
    @InjectRepository(Todo)
    private readonly todoRepository: Repository<Todo>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createDto: CreateTodoDto): Promise<Todo> {
    const user = await this.userRepository.findOne({
      where: { id: createDto.user_id },
    });
    if (!user) throw new NotFoundException('User not found');

    const todo = this.todoRepository.create({
      title: createDto.title,
      due_time: createDto.due_time,
      user: user,
      notes: createDto.notes,
    });

    return this.todoRepository.save(todo);
  }

  async findByUserId(id: string): Promise<Todo[]> {
    const todo = await this.todoRepository.find({
      where: { user: { id: id } },
      order: { created_at: 'ASC' },
    });
    if (!todo) throw new NotFoundException('Todo not found');
    return todo;
  }

  async findOne(id: string): Promise<Todo> {
    const todo = await this.todoRepository.findOneBy({
      id: id,
    });
    if (!todo) throw new NotFoundException('Todo not found');
    return todo;
  }

  async update(id: string, updateDto: UpdateTodoDto): Promise<Todo> {
    const todo = await this.findOne(id);
    Object.assign(todo, updateDto);
    return this.todoRepository.save(todo);
  }

  async remove(id: string): Promise<void> {
    const todo = await this.findOne(id);
    await this.todoRepository.remove(todo);
  }
}
