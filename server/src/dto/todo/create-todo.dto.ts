import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateTodoDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsDateString()
  due_time?: string;
}
