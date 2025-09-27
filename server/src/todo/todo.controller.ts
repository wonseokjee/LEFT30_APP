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

  // @Post()
  // create(@Body() createTodoDto: CreateTodoDto, @Req() req: Request) {
  //   return this.todoService.create(createTodoDto, req.user); // req.user 타입 확인 필요
  // }

  // @Get()
  // findAll(@Req() req: Request) {
  //   return this.todoService.findAll(req.user); // req.user 타입 확인 필요
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string, @Req() req: Request) {
  //   return this.todoService.findOne(id, req.user); // req.user 타입 확인 필요
  // }

  // @Patch(':id')
  // update(
  //   @Param('id') id: string,
  //   @Body() updateDto: UpdateTodoDto,
  //   @Req() req: Request,
  // ) {
  //   return this.todoService.update(id, updateDto, req.user); // req.user 타입 확인 필요
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string, @Req() req: Request) {
  //   return this.todoService.remove(id, req.user); // req.user 타입 확인 필요
  // }

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
