import {
  Injectable,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

/**
 * Organization Bootstrap Service
 *
 * Handles complete organization creation in a single ACID transaction:
 * - Organization creation
 * - Default admin user creation
 * - Default roles creation
 * - Role assignment
 * - Module enablement
 * - Permission pool initialization
 * - Audit logging
 *
 * If any step fails, the entire transaction rolls back.
 */
@Injectable()
export class OrganizationBootstrapService {
  private readonly logger = new Logger(OrganizationBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create complete organization with all required components
   * This is the main entry point for organization creation
   */
  async createCompleteOrganization(dto: CreateOrganizationDto, tenantInfo: TenantInfo) {
    this.logger.log(`Starting organization creation for: ${dto.name}`);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Step 1: Create Organization
        this.logger.log('Step 1: Creating organization');
        const organization = await tx.organization.create({
          data: {
            name: dto.name,
            email: dto.email,
            mobile: dto.mobile,
            address: dto.address,
            city: dto.city,
            state: dto.state,
            country: dto.country || 'India',
            pincode: dto.pincode,
            gstNumber: dto.gstNumber,
            panNumber: dto.panNumber,
            website: dto.website,
            status: 'Active',
            maxUsers: dto.maxUsers || 25,
            maxStorageGb: dto.maxStorageGb || 10,
            subscriptionTier: dto.subscriptionTier || 'free',
            permissionPool: dto.permissionPool ? JSON.stringify(dto.permissionPool) : undefined,
            roleHierarchyEnabled: dto.roleHierarchyEnabled ?? true,
            maxRoleDepth: dto.maxRoleDepth || 5,
            createdById: tenantInfo.superAdminId,
          },
        });

        this.logger.log(`Organization created with ID: ${organization.id}`);

        // Step 2: Create Default Admin User
        this.logger.log('Step 2: Creating default admin user');
        const hashedPassword = await bcrypt.hash(dto.tempPassword, 12);

        const adminUser = await tx.user.create({
          data: {
            email: dto.adminEmail,
            password: hashedPassword,
            name: dto.adminName || 'Admin',
            role: 'OWNER',
            organizationType: 'COMPANY',
            organizationId: organization.id,
            isActive: true,
            isVerified: true,
            mobile: dto.adminMobile,
            department: dto.adminDepartment,
            designation: 'Administrator',
          },
        });

        this.logger.log(`Admin user created with ID: ${adminUser.id}`);

        // Step 3: Create Default Roles
        this.logger.log('Step 3: Creating default roles');
        const defaultRoles = await this.createDefaultRoles(
          tx,
          organization.id,
          dto.grantedPermissions,
          tenantInfo.superAdminId,
        );

        // Step 4: Assign Admin Role to User
        this.logger.log('Step 4: Assigning admin role to user');
        const adminRole = defaultRoles.find((r: any) => r.code === 'ADMIN');
        if (adminRole) {
          await tx.userRole.create({
            data: {
              userId: adminUser.id,
              roleId: adminRole.id,
              organizationId: organization.id,
              assignedById: adminUser.id,
            },
          });
        }

        // Step 5: Enable Modules
        this.logger.log('Step 5: Enabling modules');
        await this.enableModules(
          tx,
          organization.id,
          dto.enabledModules || [],
          tenantInfo.superAdminId,
        );

        // Step 6: Create Default Organization Settings
        this.logger.log('Step 6: Creating default settings');
        await this.createDefaultSettings(tx, organization.id);

        // Step 7: Initialize Permission Pool if provided
        if (dto.permissionPool && dto.permissionPool.length > 0) {
          this.logger.log('Step 7: Initializing permission pool');
          await this.initializePermissionPool(tx, organization.id, dto.permissionPool);
        }

        // Step 8: Create Audit Log
        this.logger.log('Step 8: Creating audit log');
        await tx.auditLog.create({
          data: {
            action: 'ORGANIZATION_CREATED',
            organizationId: organization.id,
            userId: adminUser.id,
            metadata: {
              createdBy: tenantInfo.superAdminId,
              tenantId: tenantInfo.tenantId,
              modulesEnabled: dto.enabledModules,
              permissionsGranted: dto.grantedPermissions?.length || 0,
              organizationName: dto.name,
              adminEmail: dto.adminEmail,
            },
            severity: 'INFO',
          },
        });

        this.logger.log(`Organization creation completed successfully: ${organization.id}`);

        return {
          organization,
          adminUser: {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.name,
            role: adminUser.role,
          },
          roles: defaultRoles,
        };
      });

      return result;
    } catch (error) {
      this.logger.error(`Organization creation failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Organization creation failed: ${error.message}`);
    }
  }

  /**
   * Create default roles for a new organization
   */
  private async createDefaultRoles(
    tx: any,
    organizationId: string,
    grantedPermissions: string[] = [],
    createdById: string,
  ): Promise<any[]> {
    const defaultRoles: any[] = [];

    // Admin Role - Full access within granted permissions
    const adminRole = await tx.role.create({
      data: {
        organizationId,
        name: 'Admin',
        code: 'ADMIN',
        description: 'Full administrative access within granted permissions',
        permissions: grantedPermissions,
        isSystem: true,
        level: 1,
        createdById,
      },
    });
    defaultRoles.push(adminRole);

    // Create explicit permission mappings for admin role
    if (grantedPermissions && grantedPermissions.length > 0) {
      for (const permKey of grantedPermissions) {
        const permission = await tx.permission.findFirst({
          where: { key: permKey },
        });
        if (permission) {
          await tx.rolePermission.create({
            data: {
              roleId: adminRole.id,
              permissionId: permission.id,
              grantedById: createdById,
            },
          });
        }
      }
    }

    // Manager Role - Subset of admin permissions
    const managerPermissions = this.filterManagerPermissions(grantedPermissions || []);
    const managerRole = await tx.role.create({
      data: {
        organizationId,
        name: 'Manager',
        code: 'MANAGER',
        description: 'Manager role with limited permissions',
        permissions: managerPermissions,
        isSystem: true,
        level: 2,
        createdById,
      },
    });
    defaultRoles.push(managerRole);

    // Employee Role - Basic permissions
    const employeePermissions = this.filterEmployeePermissions(grantedPermissions || []);
    const employeeRole = await tx.role.create({
      data: {
        organizationId,
        name: 'Employee',
        code: 'EMPLOYEE',
        description: 'Basic employee permissions',
        permissions: employeePermissions,
        isSystem: true,
        level: 3,
        createdById,
      },
    });
    defaultRoles.push(employeeRole);

    return defaultRoles;
  }

  /**
   * Enable specified modules for organization
   */
  private async enableModules(
    tx: any,
    organizationId: string,
    enabledModules: string[],
    grantedBy: string,
  ) {
    const defaultModules =
      enabledModules.length > 0
        ? enabledModules
        : ['leads', 'customers', 'projects', 'inventory', 'tasks'];

    for (const moduleKey of defaultModules) {
      await tx.organizationModule.upsert({
        where: {
          organizationId_moduleKey: {
            organizationId,
            moduleKey,
          },
        },
        create: {
          organizationId,
          moduleKey,
          enabled: true,
          enabledAt: new Date(),
          grantedBy,
        },
        update: {
          enabled: true,
          enabledAt: new Date(),
          grantedBy,
        },
      });
    }
  }

  /**
   * Create default organization settings
   */
  private async createDefaultSettings(tx: any, organizationId: string) {
    const defaultSettings = {
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: 'HH:mm',
      currency: 'INR',
      language: 'en',
      notifications: {
        email: true,
        sms: false,
        push: true,
      },
      security: {
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireLowercase: true,
        passwordRequireNumbers: true,
        passwordRequireSpecialChars: true,
        sessionTimeout: 30,
      },
    };

    await tx.organization.update({
      where: { id: organizationId },
      data: {
        settings: defaultSettings,
      },
    });
  }

  /**
   * Initialize permission pool for organization
   */
  private async initializePermissionPool(
    tx: any,
    organizationId: string,
    permissionPool: string[],
  ) {
    // Create organization-specific permission records if they don't exist
    for (const permKey of permissionPool) {
      const existingPermission = await tx.permission.findFirst({
        where: { key: permKey, organizationId: null },
      });

      if (existingPermission) {
        // Create organization-specific copy
        await tx.permission.create({
          data: {
            organizationId,
            key: existingPermission.key,
            module: existingPermission.module,
            action: existingPermission.action,
            label: existingPermission.label,
            description: existingPermission.description,
            category: existingPermission.category,
            isSystem: false,
          },
        });
      }
    }
  }

  /**
   * Filter permissions for manager role
   */
  private filterManagerPermissions(allPermissions: string[]): string[] {
    // Managers get view, create, update permissions but not delete
    return allPermissions.filter(
      (perm) =>
        perm.includes('.view') ||
        perm.includes('.create') ||
        perm.includes('.update') ||
        perm.includes('.manage'),
    );
  }

  /**
   * Filter permissions for employee role
   */
  private filterEmployeePermissions(allPermissions: string[]): string[] {
    // Employees get only view and create permissions
    return allPermissions.filter((perm) => perm.includes('.view') || perm.includes('.create'));
  }

  /**
   * Validate organization creation request
   */
  async validateOrganizationCreation(dto: CreateOrganizationDto): Promise<void> {
    // Check if organization email already exists
    if (dto.email) {
      const existingOrg = await this.prisma.organization.findFirst({
        where: { email: dto.email },
      });
      if (existingOrg) {
        throw new BadRequestException('Organization with this email already exists');
      }
    }

    // Check if admin email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail },
    });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Validate module keys
    const validModules = [
      'leads',
      'customers',
      'projects',
      'inventory',
      'purchase-orders',
      'tasks',
      'users',
      'roles',
      'reports',
    ];
    const invalidModules = (dto.enabledModules || []).filter((m) => !validModules.includes(m));
    if (invalidModules.length > 0) {
      throw new BadRequestException(`Invalid module keys: ${invalidModules.join(', ')}`);
    }
  }
}

// DTOs
export interface CreateOrganizationDto {
  name: string;
  email?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  gstNumber?: string;
  panNumber?: string;
  website?: string;
  maxUsers?: number;
  maxStorageGb?: number;
  subscriptionTier?: string;
  adminEmail: string;
  adminName?: string;
  adminMobile?: string;
  adminDepartment?: string;
  tempPassword: string;
  enabledModules?: string[];
  grantedPermissions?: string[];
  permissionPool?: string[];
  roleHierarchyEnabled?: boolean;
  maxRoleDepth?: number;
}

export interface TenantInfo {
  superAdminId: string;
  tenantId: string;
  tenantName: string;
}
