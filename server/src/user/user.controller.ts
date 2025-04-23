import { Controller, Get } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Get()
  findOne() {
    return this.userService.findOne(); // req.user 타입 확인 필요
  }
}