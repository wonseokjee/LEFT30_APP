import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimetableController } from './timetable.controller';
import { TimetableService } from './timetable.service';
import { TimetableEntry } from 'src/Entity/timetableEntry.entity';
import { AuthJWTModule } from 'src/auth/JWT/auth.jwt.module';

@Module({
  imports: [TypeOrmModule.forFeature([TimetableEntry]), AuthJWTModule],
  controllers: [TimetableController],
  providers: [TimetableService],
})
export class TimetableModule {}
