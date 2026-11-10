import { Module } from '@nestjs/common';
import { AuthJWTModule } from '../auth/JWT/auth.jwt.module';
import { EventsController, SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [AuthJWTModule],
  controllers: [SyncController, EventsController],
  providers: [SyncService],
})
export class SyncModule {}
