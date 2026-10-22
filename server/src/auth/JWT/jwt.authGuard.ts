import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthJWTService } from './auth.jwt.service';

// JwtAuthGuard를 지난 요청. user.id는 JWT sub다.
export type AuthedRequest = Request & { user: { id: string } };

// access 토큰만 통과시키고 request.user.id에 JWT sub를 넣는다.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authJWTService: AuthJWTService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearer(request);
    if (!token) {
      throw new UnauthorizedException('No token found in request headers');
    }
    const userId = await this.authJWTService.verify(token, 'access');
    if (!(await this.authJWTService.userExists(userId))) {
      throw new UnauthorizedException('User not found');
    }
    (request as AuthedRequest).user = { id: userId };
    return true;
  }
}

export function extractBearer(request: Request): string | undefined {
  const [type, token] = request.headers['authorization']?.split(' ') ?? [];
  return type === 'Bearer' ? token : undefined;
}
