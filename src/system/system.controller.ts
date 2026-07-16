import { Controller, Get } from '@nestjs/common';
import { SystemCapabilitiesService } from './system-capabilities.service';

@Controller('system')
export class SystemController {
  constructor(private readonly capabilities: SystemCapabilitiesService) {}

  @Get('capabilities')
  getCapabilities() {
    return this.capabilities.getCapabilities();
  }
}
