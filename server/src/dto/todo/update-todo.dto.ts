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
}
