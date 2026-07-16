import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const isDatabaseUnavailable =
      exception instanceof Error &&
      (exception.message.includes("Can't reach database server") ||
        exception.message.includes('Server has closed the connection') ||
        exception.message.includes('Database is unavailable at'));

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : isDatabaseUnavailable
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message =
      exception instanceof HttpException
        ? exception.message
        : isDatabaseUnavailable
          ? 'Database is temporarily unavailable'
          : 'Internal server error';

    const requestId = request.requestId || 'unknown';

    // Log detailed validation errors
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        if (responseObj.message && Array.isArray(responseObj.message)) {
          this.logger.error(
            `${request.method} ${request.url} - RequestId: ${requestId} - Status: ${status} - Validation Errors: ${JSON.stringify(responseObj.message)}`,
          );
          message = responseObj.message.join(', ');
        } else if (responseObj.message) {
          this.logger.error(
            `${request.method} ${request.url} - RequestId: ${requestId} - Status: ${status} - Error Details: ${JSON.stringify(responseObj)}`,
          );
        }
      }
    }

    this.logger.error(
      `${request.method} ${request.url} - RequestId: ${requestId} - Status: ${status} - Message: ${message}`,
    );

    response.status(status).send({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
      message,
      errors: Array.isArray(message) ? message : message ? [message] : [],
    });
  }
}
