import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SkipOrgScope } from '../common/decorators/org-scope.decorator';

@ApiTags('organization')
@ApiBearerAuth()
@Controller('organization')
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Get()
  @SkipOrgScope()
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
  async findById(@Param('id') id: string) {
    const data = await this.orgService.findById(id);
    return { message: 'Organization fetched successfully.', data };
  }

  @Post()
  @SkipOrgScope()
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
  async update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    const data = await this.orgService.update(id, dto);
    return { message: 'Organization updated successfully.', data };
  }

  @Delete(':id')
  @SkipOrgScope()
  @RequirePermissions('organization:delete')
  @ApiOperation({ summary: 'Soft delete organization' })
  async softDelete(@Param('id') id: string) {
    await this.orgService.softDelete(id);
    return { message: 'Organization deleted successfully.' };
  }
}
