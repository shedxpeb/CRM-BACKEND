import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { AppModule } from './app.module';
import { isOriginAllowed, parseAllowedOrigins } from './common/cors/allowed-origins';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { GlobalValidationPipe } from './common/pipes/validation.pipe';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
    { bufferLogs: true },
  );

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('nodeEnv', 'development');

  const fastify = app.getHttpAdapter().getInstance();

  fastify.addHook('onRequest', async (request, reply) => {
    const requestId = (request.headers['x-request-id'] as string) || randomUUID();
    request.requestId = requestId;
    reply.header('X-Request-ID', requestId);
  });

  app.useGlobalPipes(new GlobalValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  await app.register(helmet, {
    contentSecurityPolicy: nodeEnv === 'production',
    crossOriginEmbedderPolicy: false,
  });

  // Compression — compress API responses with gzip/brotli.
  // NGINX/CloudPanel may also compress; Fastify-level compression is lightweight
  // and ensures API responses are compressed even if proxied without NGINX gzip.
  await app.register(compress, {
    encodings: ['br', 'gzip', 'deflate'],
    threshold: 1024, // Only compress responses > 1 KB
  });

  const frontendUrl = configService.get<string>('frontendUrl');
  if (!frontendUrl?.trim()) {
    throw new Error('FRONTEND_URL is required for CORS configuration');
  }
  // Accept ALLOWED_ORIGINS (comma-separated) in addition to FRONTEND_URL.
  // Origins are normalized (trailing slashes stripped, case-insensitive) and
  // `*.vercel.app` previews are allowed unless explicitly disabled.
  const rawOrigins = [configService.get<string>('ALLOWED_ORIGINS', ''), frontendUrl]
    .filter(Boolean)
    .join(',');
  const corsOrigins = parseAllowedOrigins(rawOrigins);
  const allowVercelPreview =
    (configService.get<string>('CORS_ALLOW_VERCEL_PREVIEW', 'true') || 'true').toLowerCase() !==
    'false';

  await app.register(cors, {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin, corsOrigins, { allowVercelApp: allowVercelPreview })) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Request-ID'],
  });

  console.log(
    `CORS allowed origins: ${corsOrigins.join(', ') || '(none)'}` +
      (allowVercelPreview ? ' (+ any *.vercel.app)' : ''),
  );

  await app.register(cookie, {
    secret: configService.get<string>('cookieSecret')!,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });

  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('PEB CRM API')
      .setDescription('PEB CRM Backend API Documentation')
      .setVersion('1.0')
      .addTag('lead', 'Lead management endpoints')
      .addTag('auth', 'Authentication endpoints')
      .addTag('health', 'Health check endpoints')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
  }

  app.enableShutdownHooks();

  // Fastify rejects bodyless requests that carry `Content-Type: application/json`
  // (e.g. DELETE without a payload) with "Body cannot be empty". Accept an empty
  // JSON body as `{}` so standard clients (axios sets the header globally) can
  // delete without a payload. Must run after app.init() because the Nest adapter
  // registers its own JSON parser there.
  await app.init();
  fastify.removeContentTypeParser('application/json');
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    try {
      const raw = typeof body === 'string' ? body : body.toString('utf8');
      done(null, raw && raw.trim().length > 0 ? JSON.parse(raw) : {});
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      done(error);
    }
  });

  const port = configService.get<number>('port', 8000);
  await app.listen(port, '0.0.0.0');
}
bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Backend startup failed: ${message}`);
  process.exit(1);
});
