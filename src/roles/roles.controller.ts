import { Controller, Get, Post, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all roles in organization' })
  async findAll(@Req() req: any) {
    const orgId = req.user?.organizationId;
    const data = await this.rolesService.findAll(orgId);
    return { message: 'Roles fetched successfully.', data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  async findById(@Param('id') id: string, @Req() req: any) {
    const orgId = req.user?.organizationId;
    const data = await this.rolesService.findById(orgId, id);
    return { message: 'Role fetched successfully.', data };
  }

  @Post()
  @ApiOperation({ summary: 'Create role' })
  async create(@Body() dto: CreateRoleDto, @Req() req: any) {
    const orgId = req.user?.organizationId;
    const createdById = req.user?.id;
    const data = await this.rolesService.create(orgId, dto, createdById);
    return { message: 'Role created successfully.', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto, @Req() req: any) {
    const orgId = req.user?.organizationId;
    const data = await this.rolesService.update(orgId, id, dto);
    return { message: 'Role updated successfully.', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  async delete(@Param('id') id: string, @Req() req: any) {
    const orgId = req.user?.organizationId;
    await this.rolesService.delete(orgId, id);
    return { message: 'Role deleted successfully.' };
  }
}
