import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { SystemCapabilitiesService } from './system-capabilities.service';

@Module({
  controllers: [SystemController],
  providers: [SystemCapabilitiesService],
})
export class SystemModule {}
