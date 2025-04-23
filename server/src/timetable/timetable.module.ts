import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimetableController } from './timetable.controller';
import { TimetableService } from './timetable.service';
import { TimetableEntry } from 'src/entity/timetableEntry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TimetableEntry])],
  controllers: [TimetableController],
  providers: [TimetableService],
})
export class TimetableModule {}
