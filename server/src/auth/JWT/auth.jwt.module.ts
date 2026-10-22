import { Module } from '@nestjs/common';
import { AuthJWTService } from './auth.jwt.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { User } from 'src/Entity/user.entity';
import { JwtAuthGuard } from './jwt.authGuard';

// secret은 토큰 종류마다 AuthJWTService가 넘긴다.
@Module({
  imports: [TypeOrmModule.forFeature([User]), JwtModule.register({})],
  providers: [AuthJWTService, JwtAuthGuard],
  exports: [AuthJWTService, JwtAuthGuard],
})
export class AuthJWTModule {}
