import { Entity, PrimaryColumn, Column, Index } from 'typeorm';
import type { Category } from './slot.entity';

// 하루 카테고리별 목표 시간. 삭제하지 않고 target_minutes=0으로 뺀다.
@Entity('plan')
@Index('idx_plan_user_updated', ['userId', 'updatedAt'])
export class Plan {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @PrimaryColumn({ name: 'local_date', type: 'date' })
  localDate: string;

  @PrimaryColumn({ type: 'varchar' })
  category: Category;

  @Column({ name: 'target_minutes', type: 'int' })
  targetMinutes: number;

  @Column({ name: 'client_updated_at', type: 'timestamptz' })
  clientUpdatedAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
