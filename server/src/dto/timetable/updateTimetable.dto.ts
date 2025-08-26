import { PartialType } from '@nestjs/mapped-types';
import { CreateTimetableDto } from './createTimetable.dto';

export class UpdateTimetableEntryDto extends PartialType(CreateTimetableDto) {}
