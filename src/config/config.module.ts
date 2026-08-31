import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import configuration from './configuration';
import { validateEnv } from './env.validation';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      // Production reads .env.production / production.env only; development uses .env.
      // NODE_ENV is set by PM2/CLI before the process starts.
      envFilePath:
        process.env.NODE_ENV === 'production' ? ['.env.production', 'production.env'] : ['.env'],
      load: [configuration],
      validate: (envConfig: Record<string, unknown>) => {
        // envConfig = { ...envFileParsed, ...process.env }  (flat keys)
        // Validate directly from this object — do not depend on process.env
        // which may not contain env-file values (dotenv.parse ≠ dotenv.config).
        validateEnv(envConfig);
        // Merge env-file values into process.env so downstream code can read them.
        for (const [key, value] of Object.entries(envConfig)) {
          if (
            value !== undefined &&
            value !== null &&
            typeof value === 'string' &&
            !process.env[key]
          ) {
            process.env[key] = value;
          }
        }
        // Return the nested configuration object for ConfigService.
        return configuration();
      },
    }),
  ],
})
export class ConfigModule {}
