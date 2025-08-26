import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsHexColor,
  IsUUID,
} from 'class-validator';

export class CreateTimetableDto {
  // @IsDateString()
  // started_at!: string;

  @IsDateString()
  @IsNotEmpty()
  ended_at!: string;

  @IsUUID()
  user_id!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  action!: string; // 수면, 휴식, 운동, 업무 등

  @IsHexColor()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  tags?: string;
}
