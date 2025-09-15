// src/users/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TimetableEntry } from 'src/entity/timetableEntry.entity';
import { Todo } from 'src/entity/todo.entity';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true, unique: true })
  kakaoId: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  password: string;

  @Column({ type: 'enum', enum: ['student', 'worker'], default: 'student' })
  role: 'student' | 'worker';

  @Column({ nullable: true })
  refreshToken: string;

  @Column({ nullable: true })
  pushToken: string;

  // 방해금지 시작/종료 시간 (시, 분)
  @Column({ type: 'int', default: 18, nullable: true })
  quietStartHour: number;

  @Column({ type: 'int', default: 0, nullable: true })
  quietStartMinute: number;

  @Column({ type: 'int', default: 9, nullable: true })
  quietEndHour: number;

  @Column({ type: 'int', default: 0, nullable: true })
  quietEndMinute: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => TimetableEntry, entry => entry.user)
  timetableEntries: TimetableEntry[];

  @OneToMany(() => Todo, todo => todo.user)
  todos: Todo[];
}
