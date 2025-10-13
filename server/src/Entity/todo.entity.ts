// src/todos/todo.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from 'src/Entity/user.entity';

@Entity('todo')
export class Todo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.todos)
  user: User;

  @Column()
  title: string;

  @Column({ default: false })
  is_done: boolean;

  @Column({ type: 'timestamp', nullable: true })
  due_time: Date;

  @Column({ type: 'text', nullable: true })
  notes: string; // 메모 (예: 오늘의 운동 내용, 공부한 내용 등)

  @Column({ type: 'text', nullable: true })
  status: string; // 상태 (예: 완료, 진행 중 등)

  @Column({ type: 'text', nullable: true })
  priority: string; // 우선순위 (예: 높음, 중간, 낮음 등)

  @Column({ type: 'text', nullable: true })
  reminder: string; // 알림 (예: 10분 전, 1시간 전 등)

  @Column({ type: 'text', nullable: true })
  recurrence: string; // 반복 설정 (예: 매일, 매주 등)

  @Column({ type: 'text', nullable: true })
  duration: string; // 소요 시간 (예: 1시간, 30분 등)

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
