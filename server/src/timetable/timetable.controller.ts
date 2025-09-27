// src/timetable/timetable-entry.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  // Delete,
  // Query,
} from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { CreateTimetableDto } from 'src/dto/timetable/createTimetable.dto';
import { JwtAuthGuard } from 'src/auth/JWT/jwt.authGuard';

@Controller('timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: CreateTimetableDto) {
    return this.timetableService.createOne(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.timetableService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.timetableService.findByUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.timetableService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/today/:userId')
  getToday(@Param('userId') userId: string) {
    return this.timetableService.findTodayEntries(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/yesterday/:userId')
  getYesterday(@Param('userId') userId: string) {
    return this.timetableService.findYesterdayEntries(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/timeUpdate')
  timeUpdate(@Body() body: CreateTimetableDto) {
    return this.timetableService.updateTimeSlot(body);
  }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.timetableService.remove(id);
  // }
}
