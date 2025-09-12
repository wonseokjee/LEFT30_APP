// src/timetable/timetable-entry.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  // Delete,
  // Query,
} from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { CreateTimetableDto } from 'src/dto/timetable/createTimetable.dto';

@Controller('timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Post()
  create(@Body() body: CreateTimetableDto) {
    return this.timetableService.create(body);
  }

  @Get()
  findAll() {
    return this.timetableService.findAll();
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.timetableService.findByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.timetableService.findOne(id);
  }

  @Get('/today/:userId')
  getToday(@Param('userId') userId: string) {
    return this.timetableService.findTodayEntries(userId);
  }

  @Get('/yesterday/:userId')
  getYesterday(@Param('userId') userId: string) {
    return this.timetableService.findYesterdayEntries(userId);
  }

  @Post('/timeUpdate')
  timeUpdate(@Body() body: CreateTimetableDto) {
    return this.timetableService.timeUpdate(body);
  }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.timetableService.remove(id);
  // }
}
