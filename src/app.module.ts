import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { LeadModule } from './lead/lead.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { OrganizationGuard } from './common/guards/organization.guard';
import { ModuleAccessGuard } from './auth/guards/module-access.guard';
import { DataIsolationGuard } from './common/guards/data-isolation.guard';
import { TenantContextGuard } from './common/guards/tenant-context.guard';
import { CustomerModule } from './customer/customer.module';
import { ProjectModule } from './project/project.module';
import { OrganizationModule } from './organization/organization.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { TrackingModule } from './tracking/tracking.module';
import { WorkflowModule } from './workflow/workflow.module';
import { SystemModule } from './system/system.module';
import { ItemMasterModule } from './item-master/item-master.module';
import { InventoryModule } from './inventory/inventory.module';
import { VendorModule } from './vendor/vendor.module';
import { PurchaseOrderModule } from './purchase-order/purchase-order.module';
import { PdfModule } from './pdf/pdf.module';
import { TaskModule } from './task/task.module';
import { DocumentModule } from './document/document.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PermissionsModule } from './permissions/permissions.module';
import { OrganizationBootstrapModule } from './organizations/organization-bootstrap.module';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('throttle.ttlMs') || 60000,
          limit: config.get<number>('throttle.limit') || 60,
        },
      ],
    }),
    PrismaModule,
    CommonModule,
    HealthModule,
    AuthModule,
    MailModule,
    LeadModule,
    CustomerModule,
    ProjectModule,
    OrganizationModule,
    UsersModule,
    RolesModule,
    TrackingModule,
    WorkflowModule,
    SystemModule,
    ItemMasterModule,
    InventoryModule,
    VendorModule,
    PurchaseOrderModule,
    PdfModule,
    TaskModule,
    DocumentModule,
    DashboardModule,
    PermissionsModule,
    OrganizationBootstrapModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantContextGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: OrganizationGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: ModuleAccessGuard },
    { provide: APP_GUARD, useClass: DataIsolationGuard },
  ],
})
export class AppModule {}
