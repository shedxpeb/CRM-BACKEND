import { Module } from '@nestjs/common';
import { StubsController } from './stubs.controller';

@Module({
  controllers: [StubsController]
})
export class StubsModule {}
