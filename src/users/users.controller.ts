import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersDto } from './dto/get-users.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('user:list')
  @ApiOperation({ summary: 'Get all users in organization' })
  async findAll(@Query() query: GetUsersDto, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.usersService.findAll(organizationId, query);
    return { message: 'Users fetched successfully.', data };
  }

  @Get(':id')
  @RequirePermissions('user:read')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async findById(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.usersService.findById(organizationId, id);
    return { message: 'User fetched successfully.', data };
  }

  @Post()
  @RequirePermissions('user:create')
  @ApiOperation({ summary: 'Create user in organization (invite)' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') createdById: string,
    @CurrentUser('role') actorRole: string,
  ) {
    const data = await this.usersService.create(organizationId, dto, createdById, actorRole);
    return { message: 'User created successfully.', data };
  }

  @Patch(':id')
  @RequirePermissions('user:update')
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.usersService.update(organizationId, id, dto);
    return { message: 'User updated successfully.', data };
  }

  @Delete(':id')
  @RequirePermissions('user:delete')
  @ApiOperation({ summary: 'Soft delete (deactivate) user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async softDelete(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    await this.usersService.softDelete(organizationId, id);
    return { message: 'User deactivated successfully.' };
  }
}
