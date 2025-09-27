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

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // async create(createTodoDto: CreateTodoDto, user: User): Promise<Todo> {
  //   const todo = this.todoRepository.create({ ...createTodoDto, user });
  //   return this.todoRepository.save(todo);
  // }

  // async findAll(user: User): Promise<Todo[]> {
  //   return this.todoRepository.find({ where: { user } });
  // }

  // async findOne(id: string, user: User): Promise<Todo> {
  //   const todo = await this.todoRepository.findOne({ where: { id, user } });
  //   if (!todo) throw new NotFoundException('Todo not found');
  //   return todo;
  // }

  // async update(
  //   id: string,
  //   updateDto: UpdateTodoDto,
  //   user: User,
  // ): Promise<Todo> {
  //   const todo = await this.findOne(id, user);
  //   Object.assign(todo, updateDto);
  //   return this.todoRepository.save(todo);
  // }

  // async remove(id: string, user: User): Promise<void> {
  //   const todo = await this.findOne(id, user);
  //   await this.todoRepository.remove(todo);
  // }

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

  // async findAll(): Promise<Todo[]> {
  //   return this.todoRepository.find({
  //     where: { user: { id: this.user_id } },
  //   });
  // }

  async findByUserId(id: string): Promise<Todo[]> {
    const todo = await this.todoRepository.find({
      where: { user: { id: id } },
      // where: { id, user: { id: this.user_id } },
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
