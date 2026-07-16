import { Module, Global } from '@nestjs/common';
import { OrganizationGuard } from './guards/organization.guard';

@Global()
@Module({
  providers: [OrganizationGuard],
  exports: [OrganizationGuard],
})
export class CommonModule {}
