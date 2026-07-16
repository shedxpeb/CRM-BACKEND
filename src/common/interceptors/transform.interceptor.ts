import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { FastifyRequest } from 'fastify';

export interface Response<T> {
  success: boolean;
  requestId: string;
  timestamp: string;
  message: string;
  data: T | null;
  meta?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const requestId = request.requestId || 'unknown';
    const path = request.url?.split('?')[0] || '';

    if (path === '/health' || path.startsWith('/health/') || path === '/live' || path === '/ready' || path === '/') {
      return next.handle();
    }

    return next.handle().pipe(
      map((responseData: any) => {
        if (responseData && typeof responseData === 'object') {
          const { message, data, meta, success, clearRefreshCookie, ...rest } = responseData;
          const payload =
            data !== undefined
              ? data
              : Object.keys(rest).length
                ? { ...rest, ...(clearRefreshCookie ? { clearRefreshCookie } : {}) }
                : null;

          return {
            success: success !== false,
            requestId,
            timestamp: new Date().toISOString(),
            message: message || 'Success',
            data: payload as T,
            ...(meta ? { meta } : {}),
          };
        }

        return {
          success: true,
          requestId,
          timestamp: new Date().toISOString(),
          message: 'Success',
          data: (responseData ?? null) as T,
        };
      }),
    );
  }
}
