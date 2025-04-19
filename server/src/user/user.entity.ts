// src/users/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TimetableEntry } from 'src/timetable/timetableEntry.entity';
import { Todo } from 'src/todo/todo.entity';
import { PushToken } from 'src/push/pushToken.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ['student', 'worker'], default: 'student' })
  role: 'student' | 'worker';

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => TimetableEntry, (entry) => entry.user)
  timetableEntries: TimetableEntry[];

  @OneToMany(() => Todo, (todo) => todo.user)
  todos: Todo[];

  @OneToMany(() => PushToken, (token) => token.user)
  pushTokens: PushToken[];
}
