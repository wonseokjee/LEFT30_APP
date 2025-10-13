import { Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';
import { User } from '../Entity/user.entity';
import { TimetableEntry } from 'src/Entity/timetableEntry.entity';
import { AuthJWTModule } from 'src/auth/JWT/auth.jwt.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, TimetableEntry]), AuthJWTModule],
  controllers: [PushController],
  providers: [PushService],
})
export class PushModule {}
