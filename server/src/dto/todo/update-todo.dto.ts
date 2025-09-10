import { IsBoolean, IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateTodoDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  is_done?: boolean;

  @IsOptional()
  @IsDateString()
  due_time?: string;

  @IsOptional()
  @IsString()
  notes?: string; // 메모 (예: 오늘의 운동 내용, 공부한 내용 등)
}
