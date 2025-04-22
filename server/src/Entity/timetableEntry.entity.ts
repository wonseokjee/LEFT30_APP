// src/timetable/timetable-entry.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from 'src/entity/user.entity';

@Entity('timetable_entrie')
export class TimetableEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.timetableEntries)
  user: User;

  @Column({ type: 'timestamp' })
  started_at: Date;

  @Column({ type: 'timestamp' })
  ended_at: Date;

  @Column({ type: 'text' })
  description: string;

  @CreateDateColumn()
  created_at: Date;

  //action 컬럼 추가할때 카테고리: 수면,휴식,운동,업무,공부,식사, 자기개발.
  //color와 연동해서 카테고리별 색상 지정
  @Column({ type: 'text' })
  action: string; // 수면, 휴식, 운동, 업무, 공부, 식사, 자기개발 등

  @Column({ type: 'varchar', length: 7, default: '#FFFFFF' }) // 색상 정보 추가
  color: string;

  @Column({ type: 'text' })
  category: string; // 카테고리 (예: 운동, 공부 등)

  @Column({ type: 'text' })
  tags: string; // 태그 (예: #운동, #공부 등)

}
