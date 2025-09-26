// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
// import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entity/user.entity';
import { KakaoApiService } from './kakao/kakaoapi.service';
import { UserModule } from 'src/user/user.module';
import { AuthJWTService } from './JWT/auth.jwt.service';
import { AuthJWTModule } from './JWT/auth.jwt.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), UserModule, AuthJWTModule],
  controllers: [AuthController],
  providers: [AuthService, KakaoApiService, AuthJWTService],
})
export class AuthModule {}
