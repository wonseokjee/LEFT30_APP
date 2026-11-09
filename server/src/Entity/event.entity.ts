import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

export const EVENT_TYPES = [
  'ping_scheduled',
  'ping_displayed',
  'ping_answered',
  'perm_state',
  'plan_set',
  'plan_vs_actual_viewed',
  'evening_summary_tapped',
  'feedback',
  'schedule_extended',
  'schedule_coverage',
  'sync_rejected',
  'local_migration_failed',
  'pause_set',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// id는 클라이언트가 만든다. 같은 id는 한 번만 들어간다.
@Entity('event')
@Index('idx_event_user_type_ts', ['userId', 'type', 'ts'])
export class AppEvent {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar' })
  type: EventType;

  @Column({ type: 'timestamptz' })
  ts: Date;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  props: Record<string, unknown>;
}
