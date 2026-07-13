import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { FastifyReply } from 'fastify';

@Injectable()
export class CookieInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const res = context.switchToHttp().getResponse<FastifyReply>();
    return next.handle().pipe(
      map((data) => {
        if (data?.refreshToken) {
          const maxAge = data.rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
          res.setCookie('refreshToken', data.refreshToken, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge,
          });
          const { refreshToken, rememberMe, ...rest } = data;
          return rest;
        }
        if (data?.clearRefreshCookie) {
          res.clearCookie('refreshToken', { path: '/' });
          const { clearRefreshCookie, ...rest } = data;
          return Object.keys(rest).length ? rest : { message: data.message || 'Logged out successfully.' };
        }
        return data;
      }),
    );
  }
}
