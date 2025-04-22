// src/push/push-token.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from 'src/entity/user.entity';

@Entity('push_token')
export class PushToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.pushTokens)
  user: User;

  @Column('text')
  fcm_token: string;

  @CreateDateColumn()
  created_at: Date;
}
