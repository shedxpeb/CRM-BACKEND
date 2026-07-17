import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import configuration from './configuration';
import { validateEnv, applyConfigToProcessEnv } from './env.validation';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      // Production reads .env.production / production.env only; development uses .env.
      envFilePath:
        process.env.NODE_ENV === 'production' ? ['.env.production', 'production.env'] : ['.env'],
      load: [configuration],
      validate: (config) => {
        applyConfigToProcessEnv(config);
        validateEnv();
        return { ...config, ...configuration() };
      },
    }),
  ],
})
export class ConfigModule {}
