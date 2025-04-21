import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  // UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express'; // Request 타입 추가
import { TodoService } from './todo.service';
import { CreateTodoDto } from 'src/dto/todo/create-todo.dto';
import { UpdateTodoDto } from '../dto/todo/update-todo.dto';
// import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('todo')
// @UseGuards(JwtAuthGuard) // 로그인 필요
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Post()
  create(@Body() createTodoDto: CreateTodoDto, @Req() req: Request) {
    return this.todoService.create(createTodoDto, req.user); // req.user 타입 확인 필요
  }

  @Get()
  findAll(@Req() req: Request) {
    return this.todoService.findAll(req.user); // req.user 타입 확인 필요
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.todoService.findOne(id, req.user); // req.user 타입 확인 필요
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTodoDto,
    @Req() req: Request,
  ) {
    return this.todoService.update(id, updateDto, req.user); // req.user 타입 확인 필요
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.todoService.remove(id, req.user); // req.user 타입 확인 필요
  }
}
