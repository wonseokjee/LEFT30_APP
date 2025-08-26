import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable, catchError, switchMap, throwError, of } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { User } from 'src/entity/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class RefreshTokenInterceptor implements NestInterceptor {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const accessToken = this.extractToken(req.headers.authorization);
    const refreshToken = req.headers['x-refresh-token'] as string;

    if (!accessToken || !refreshToken) return next.handle(); // 토큰 없으면 그대로 진행

    try {
      this.jwtService.verify(accessToken); // access token 유효하면 그대로 진행
      return next.handle();
    } catch (error) {
      if (error.name !== 'TokenExpiredError') return throwError(() => new UnauthorizedException());

      // access token이 만료된 경우 → refresh token 검사
      return of(this.jwtService.verify(refreshToken)).pipe(
        switchMap(async (payload: any) => {
          const user = await this.userRepo.findOne({ where: { id: payload.sub } });
          if (!user || user.refreshToken !== refreshToken) {
            throw new UnauthorizedException('Invalid refresh token');
          }

          const newAccessToken = this.jwtService.sign(
            { sub: user.id, email: user.email },
            { expiresIn: '15m' },
          );

          req.newAccessToken = newAccessToken; // 응답에서 사용하게 request에 붙임
          return next.handle();
        }),
        catchError(() => throwError(() => new UnauthorizedException())),
      );
    }
  }

  private extractToken(authHeader: string): string | null {
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    return parts.length === 2 ? parts[1] : null;
  }
}
