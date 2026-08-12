import { Module } from '@nestjs/common';
import { PermissionInheritanceService } from './permission-inheritance.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PermissionInheritanceService],
  exports: [PermissionInheritanceService],
})
export class PermissionsModule {}