import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

export const CATEGORIES = [
  'sleep',
  'rest',
  'exercise',
  'relationship',
  'self_dev',
  'work',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SLOT_SOURCES = ['answered', 'continued', 'late', 'inferred'] as const;
export type SlotSource = (typeof SLOT_SOURCES)[number];

// 30분 칸 하나에 행 하나. (user_id, slot_start)가 키다.
@Entity('slot')
@Index('idx_slot_user_updated', ['userId', 'updatedAt'])
export class Slot {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @PrimaryColumn({ name: 'slot_start', type: 'timestamptz' })
  slotStart: Date;

  // 칸 시각 당시 기기의 IANA 시간대
  @Column({ type: 'varchar' })
  tz: string;

  @Column({ type: 'varchar' })
  category: Category;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'varchar' })
  source: SlotSource;

  @Column({ name: 'answered_at', type: 'timestamptz', nullable: true })
  answeredAt: Date | null;

  @Column({ name: 'client_updated_at', type: 'timestamptz' })
  clientUpdatedAt: Date;

  // 서버가 부여하는 동기화 커서
  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
