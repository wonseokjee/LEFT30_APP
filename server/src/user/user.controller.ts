import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/JWT/jwt.authGuard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  // @Get()
  // findOne() {
  //   return this.userService.findOne(); // req.user 타입 확인 필요
  // }

  @UseGuards(JwtAuthGuard)
  @Get('findOneById/:id')
  async findOneById(@Param('id') id: string) {
    // console.log('User found:', id);
    const user = await this.userService.findOneById(id);

    // if (!user) {
    //   throw new NotFoundException(`User with ID ${id} not found`);
    // }
    return user;
  }

  // @UseGuards(JwtAuthGuard)
  @Post('quietTime/:id')
  async updateQuietTime(
    @Param('id') id: string,
    @Body('quietStartHour') quietStartHour: number,
    @Body('quietStartMinute') quietStartMinute: number,
    @Body('quietEndHour') quietEndHour: number,
    @Body('quietEndMinute') quietEndMinute: number,
  ) {
    const user = await this.userService.updateQuietTime(
      id,
      quietStartHour,
      quietStartMinute,
      quietEndHour,
      quietEndMinute,
    );
    return user;
  }

  @Get('quietTime/:id')
  async findQuietTimeById(@Param('id') id: string) {
    return this.userService.findQuietTimeById(id);
  }
}
