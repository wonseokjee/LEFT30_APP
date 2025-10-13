import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  // UseGuards,
  // Req,
  // Query,
} from '@nestjs/common';
import { TodoService } from './todo.service';
import { CreateTodoDto } from 'src/dto/todo/create-todo.dto';
import { UpdateTodoDto } from '../dto/todo/update-todo.dto';
import { JwtAuthGuard } from 'src/auth/JWT/jwt.authGuard';

@Controller('todo')
// @UseGuards(JwtAuthGuard) // 로그인 필요
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createDto: CreateTodoDto) {
    return this.todoService.create(createDto);
  }

  // @Get()
  // findAll() {
  //   return this.todoService.findAll();
  // }

  @UseGuards(JwtAuthGuard)
  @Get('/user/:user_id')
  findByUserId(@Param('user_id') user_id: string) {
    return this.todoService.findByUserId(user_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:id')
  findOne(@Param('id') id: string) {
    return this.todoService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateTodoDto) {
    return this.todoService.update(id, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.todoService.remove(id);
  }
}
