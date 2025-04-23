// src/timetable/timetable-entry.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  // Query,
} from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { TimetableEntry } from 'src/entity/timetableEntry.entity';

@Controller('timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Post()
  create(@Body() body: Partial<TimetableEntry>) {
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

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<TimetableEntry>) {
    return this.timetableService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.timetableService.remove(id);
  }
}
