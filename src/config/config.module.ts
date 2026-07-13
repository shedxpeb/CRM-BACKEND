import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import configuration from './configuration';
import { validateEnv, applyConfigToProcessEnv } from './env.validation';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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
