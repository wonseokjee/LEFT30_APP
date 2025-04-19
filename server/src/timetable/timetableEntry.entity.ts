// src/timetable/timetable-entry.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from 'src/user/user.entity';

@Entity('timetable_entries')
export class TimetableEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.timetableEntries)
  user: User;

  @Column({ type: 'timestamp' })
  started_at: Date;

  @Column({ type: 'timestamp' })
  ended_at: Date;

  @Column({ type: 'text' })
  description: string;

  @CreateDateColumn()
  created_at: Date;
}
