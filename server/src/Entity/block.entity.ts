import { Entity, PrimaryColumn, Column, Index } from 'typeorm';
import type { Category } from './slot.entity';

// 집중 블록(focus, 지금부터)과 계획 블록(plan, Todo). 설계: docs/designs/left30-focus-block.md
export const BLOCK_KINDS = ['focus', 'plan'] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];

/*
 *  planned ──(시작 시각)──▶ active ──(끝 시각)──▶ awaiting ──(끝 시트 답)──▶ ended
 *     │ 집중 블록은 planned 없이 active로 만든다      │ 답 없음 ─▶ ended(no_answer)
 *     └─(집중 블록이 대신함)─▶ cancelled      active ─(끝내기)─▶ ended / (연장) active
 *  ended → active는 없다. 지운 블록은 deleted=true로 남겨 동기화한다(복원에 삭제가 없으므로).
 */
export const BLOCK_STATES = [
  'planned',
  'active',
  'awaiting',
  'ended',
  'cancelled',
] as const;
export type BlockState = (typeof BLOCK_STATES)[number];

export const BLOCK_END_HOWS = [
  'answer',
  'extend',
  'end_now',
  'no_answer',
  'checked',
] as const;
export type BlockEndHow = (typeof BLOCK_END_HOWS)[number];

export const BLOCK_TITLE_MAX = 100;

@Entity('block')
@Index('idx_block_user_updated', ['userId', 'updatedAt'])
export class Block {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  // 앱이 만든 uuid
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'varchar' })
  kind: BlockKind;

  @Column({ type: 'varchar' })
  category: Category;

  @Column({ type: 'varchar', nullable: true })
  title: string | null;

  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt: Date;

  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt: Date;

  @Column({ type: 'varchar' })
  tz: string;

  @Column({ type: 'varchar' })
  state: BlockState;

  @Column({ name: 'ended_how', type: 'varchar', nullable: true })
  endedHow: BlockEndHow | null;

  @Column({ type: 'boolean', default: false })
  deleted: boolean;

  @Column({ name: 'client_updated_at', type: 'timestamptz' })
  clientUpdatedAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
