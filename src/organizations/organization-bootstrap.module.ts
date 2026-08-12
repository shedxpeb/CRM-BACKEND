import { Module } from '@nestjs/common';
import { OrganizationBootstrapService } from './organization-bootstrap.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [OrganizationBootstrapService],
  exports: [OrganizationBootstrapService],
})
export class OrganizationBootstrapModule {}