import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, map } from 'rxjs';
import { FastifyReply } from 'fastify';

@Injectable()
export class CookieInterceptor implements NestInterceptor {
  constructor(private readonly config: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const res = context.switchToHttp().getResponse<FastifyReply>();
    const name = this.config.get<string>('cookie.refreshName') || 'refreshToken';
    const path = this.config.get<string>('cookie.path') || '/auth';
    const sameSite = (this.config.get<string>('cookie.sameSite') || 'lax') as 'lax' | 'strict' | 'none';
    const secure = this.config.get<boolean>('cookie.secure') === true;
    const signed = this.config.get<boolean>('cookie.signed') === true;
    const rememberDays = this.config.get<number>('session.rememberMeDays') || 30;
    const absoluteDays = this.config.get<number>('session.absoluteDays') || 1;

    return next.handle().pipe(
      map((data) => {
        if (data?.refreshToken) {
          const maxAge = (data.rememberMe ? rememberDays : absoluteDays) * 24 * 60 * 60;
          res.setCookie(name, data.refreshToken, {
            path,
            httpOnly: true,
            secure,
            sameSite,
            signed,
            maxAge,
          });
          const { refreshToken, rememberMe, ...rest } = data;
          return rest;
        }
        if (data?.clearRefreshCookie) {
          res.clearCookie(name, { path });
          const { clearRefreshCookie, ...rest } = data;
          return Object.keys(rest).length ? rest : { message: data.message || 'Logged out successfully.' };
        }
        return data;
      }),
    );
  }
}
