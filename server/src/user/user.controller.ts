import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/JWT/jwt.authGuard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

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

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Get('quietTime/:id')
  async findQuietTimeById(@Param('id') id: string) {
    return this.userService.findQuietTimeById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('withdraw')
  async withdraw(
    @Body('user_id') userId: string,
  ): Promise<{ message: string }> {
    await this.userService.deleteUser(userId);
    return { message: '회원탈퇴가 완료되었습니다.' };
  }
}
