import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { SystemCapabilitiesService } from './system-capabilities.service';
import { SeedAdminDto, SystemSeedService } from './system-seed.service';

@Controller('system')
export class SystemController {
  constructor(
    private readonly capabilities: SystemCapabilitiesService,
    private readonly seed: SystemSeedService,
  ) {}

  @Get('capabilities')
  getCapabilities() {
    return this.capabilities.getCapabilities();
  }

  /**
   * One-time admin bootstrap for hosts without Shell (e.g. Render free).
   * Requires env SEED_ADMIN_SECRET and header x-seed-secret.
   * Remove SEED_ADMIN_SECRET after seeding.
   */
  @Public()
  @Post('seed-admin')
  seedAdmin(
    @Body() body: SeedAdminDto,
    @Headers('x-seed-secret') seedSecret?: string,
  ) {
    return this.seed.seedAdmin(body, seedSecret);
  }
}
