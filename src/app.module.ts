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
import { CustomerModule } from './customer/customer.module';
import { ProjectModule } from './project/project.module';
import { OrganizationModule } from './organization/organization.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { TrackingModule } from './tracking/tracking.module';
import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('throttle.ttlMs') || 60000,
          limit: config.get<number>('throttle.limit') || 20,
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
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
