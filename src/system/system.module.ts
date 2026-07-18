import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { SystemCapabilitiesService } from './system-capabilities.service';
import { SystemSeedService } from './system-seed.service';

@Module({
  controllers: [SystemController],
  providers: [SystemCapabilitiesService, SystemSeedService],
})
export class SystemModule {}
