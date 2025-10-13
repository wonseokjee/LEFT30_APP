import { Module } from '@nestjs/common';
import { AuthJWTService } from './auth.jwt.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { User } from 'src/Entity/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // UserRepository 주입
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  providers: [AuthJWTService],
  exports: [AuthJWTService, JwtModule],
})
export class AuthJWTModule {}
