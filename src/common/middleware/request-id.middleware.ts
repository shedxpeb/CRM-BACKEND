import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

declare module 'fastify' {
  interface FastifyRequest {
    requestId?: string;
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestIdMiddleware.name);

  use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    req.requestId = requestId;

    res.header('X-Request-ID', requestId);

    next();
  }
}
