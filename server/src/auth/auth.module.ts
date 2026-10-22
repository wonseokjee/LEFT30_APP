import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/Entity/user.entity';
import { AuthController, MeController } from './auth.controller';
import { AuthService } from './auth.service';
import { KakaoApiService } from './kakao/kakaoapi.service';
import { AuthJWTModule } from './JWT/auth.jwt.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), AuthJWTModule],
  controllers: [AuthController, MeController],
  providers: [AuthService, KakaoApiService],
})
export class AuthModule {}
