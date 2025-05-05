import { IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreateTodoDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsDateString()
  due_time?: string;

  //JWT가 없는 경우 아래
  @IsUUID()
  user_id: string;

  @IsString()
  @IsOptional()
  notes?: string; // 메모 (예: 오늘의 운동 내용, 공부한 내용 등)
}
