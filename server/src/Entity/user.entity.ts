import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'kakao_id', type: 'varchar', unique: true })
  kakaoId: string;

  // 방해금지 시작/종료(분 단위, 그때그때의 기기 로컬 시간 기준)
  @Column({ name: 'quiet_start_min', type: 'int', nullable: true })
  quietStartMin: number | null;

  @Column({ name: 'quiet_end_min', type: 'int', nullable: true })
  quietEndMin: number | null;

  @Column({ name: 'refresh_token_hash', type: 'varchar', nullable: true })
  refreshTokenHash: string | null;

  // 동기화할 때마다 갱신되는 참고값. 계산에는 쓰지 않는다.
  @Column({ name: 'last_tz', type: 'varchar', nullable: true })
  lastTz: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
