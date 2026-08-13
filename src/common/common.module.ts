import { Module, Global } from '@nestjs/common';
import { OrganizationGuard } from './guards/organization.guard';
import { TenantContextService } from './services/tenant-context.service';
import { TenantContextGuard } from './guards/tenant-context.guard';

@Global()
@Module({
  providers: [OrganizationGuard, TenantContextService, TenantContextGuard],
  exports: [OrganizationGuard, TenantContextService, TenantContextGuard],
})
export class CommonModule {}
