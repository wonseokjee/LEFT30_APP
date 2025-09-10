import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthJWTService } from './auth.jwt.service';

// interface JWTpayload {
//   sub: string; // 사용자 ID
//   iat?: number; // 발행 시간 (optional)
//   exp?: number; // 만료 시간 (optional)
// }

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authJWTService: AuthJWTService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const token = this.extractTokenFromHeader(request);
    if (!token) {
      console.error('No token found in request headers');
      throw new UnauthorizedException('No token found in request headers');
    }

    try {
      const payload = await this.authJWTService.validateAccessToken(token);
      // console.log('Token payload:', payload);
      if (!payload) {
        throw new UnauthorizedException('Invalid token payload');
      }

      // 필요하다면 request.user에 payload 저장
      request['user'] = payload;
      console.log('JWT payload:', payload);
    } catch (error) {
      console.error('Token validation failed:', error);
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers['authorization'];
    // console.log('request headers:', request.headers);
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ') ?? [];
    // console.log('Extracted token:', token);
    return type === 'Bearer' ? token : undefined;
  }
}
