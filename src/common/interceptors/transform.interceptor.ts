import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { FastifyRequest } from 'fastify';

export interface Response<T> {
  success: boolean;
  requestId: string;
  timestamp: string;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const requestId = request.requestId || 'unknown';
    const path = request.url?.split('?')[0] || '';

    if (path === '/health' || path.startsWith('/health/')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => ({
        success: true,
        requestId,
        timestamp: new Date().toISOString(),
        message: data?.message || 'Success',
        data: data?.data ?? data,
      })),
    );
  }
}
