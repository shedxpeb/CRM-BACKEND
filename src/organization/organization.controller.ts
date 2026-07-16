import { Controller, Get, Post, Patch, Delete, Param, Body, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SkipOrgScope } from '../common/decorators/org-scope.decorator';

@ApiTags('organization')
@ApiBearerAuth()
@Controller('organization')
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Get()
  @SkipOrgScope()
  @RequireRoles('SUPER_ADMIN')
  @RequirePermissions('organization:list')
  @ApiOperation({ summary: 'Get all organizations (super admin)' })
  async findAll() {
    const data = await this.orgService.findAll();
    return { message: 'Organizations fetched successfully.', data };
  }

  @Get(':id')
  @SkipOrgScope()
  @RequirePermissions('organization:read')
  @ApiOperation({ summary: 'Get organization by ID' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('role') role: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    if (role !== 'SUPER_ADMIN' && id !== organizationId) {
      throw new ForbiddenException('Cannot access another organization');
    }
    const data = await this.orgService.findById(id);
    return { message: 'Organization fetched successfully.', data };
  }

  @Post()
  @SkipOrgScope()
  @RequireRoles('SUPER_ADMIN')
  @RequirePermissions('organization:create')
  @ApiOperation({ summary: 'Create organization' })
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser('id') createdById: string,
  ) {
    const data = await this.orgService.create(dto, createdById);
    return { message: 'Organization created successfully.', data };
  }

  @Patch(':id')
  @SkipOrgScope()
  @RequirePermissions('organization:update')
  @ApiOperation({ summary: 'Update organization' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser('role') role: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    if (role !== 'SUPER_ADMIN' && id !== organizationId) {
      throw new ForbiddenException('Cannot update another organization');
    }
    const data = await this.orgService.update(id, dto);
    return { message: 'Organization updated successfully.', data };
  }

  @Delete(':id')
  @SkipOrgScope()
  @RequireRoles('SUPER_ADMIN')
  @RequirePermissions('organization:delete')
  @ApiOperation({ summary: 'Soft delete organization' })
  async softDelete(@Param('id') id: string) {
    await this.orgService.softDelete(id);
    return { message: 'Organization deleted successfully.' };
  }
}
