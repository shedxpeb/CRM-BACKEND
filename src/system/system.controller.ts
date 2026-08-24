import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { SystemCapabilitiesService } from './system-capabilities.service';
import { SystemSeedService } from './system-seed.service';
import type { SeedAdminDto } from './system-seed.service';

@Controller('system')
export class SystemController {
  constructor(
    private readonly capabilities: SystemCapabilitiesService,
    private readonly seed: SystemSeedService,
  ) {}

  @Get('capabilities')
  @RequirePermissions('system:read')
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
  seedAdmin(@Body() body: SeedAdminDto, @Headers('x-seed-admin-secret') seedSecret?: string) {
    return this.seed.seedAdmin(body, seedSecret);
  }
}
