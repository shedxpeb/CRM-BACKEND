import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('role:list')
  @ApiOperation({ summary: 'Get all roles in organization' })
  async findAll(@CurrentUser('organizationId') organizationId: string) {
    const data = await this.rolesService.findAll(organizationId);
    return { message: 'Roles fetched successfully.', data };
  }

  @Get(':id')
  @RequirePermissions('role:read')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  async findById(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.rolesService.findById(organizationId, id);
    return { message: 'Role fetched successfully.', data };
  }

  @Post()
  @RequirePermissions('role:create')
  @ApiOperation({ summary: 'Create role' })
  async create(
    @Body() dto: CreateRoleDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') createdById: string,
  ) {
    const data = await this.rolesService.create(organizationId, dto, createdById);
    return { message: 'Role created successfully.', data };
  }

  @Patch(':id')
  @RequirePermissions('role:update')
  @ApiOperation({ summary: 'Update role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.rolesService.update(organizationId, id, dto);
    return { message: 'Role updated successfully.', data };
  }

  @Delete(':id')
  @RequirePermissions('role:delete')
  @ApiOperation({ summary: 'Delete role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  async delete(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    await this.rolesService.delete(organizationId, id);
    return { message: 'Role deleted successfully.' };
  }
}
