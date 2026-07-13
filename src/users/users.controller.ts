import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersDto } from './dto/get-users.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users in organization' })
  async findAll(@Query() query: GetUsersDto, @Req() req: any) {
    const orgId = req.user?.organizationId;
    const data = await this.usersService.findAll(orgId, query);
    return { message: 'Users fetched successfully.', data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async findById(@Param('id') id: string, @Req() req: any) {
    const orgId = req.user?.organizationId;
    const data = await this.usersService.findById(orgId, id);
    return { message: 'User fetched successfully.', data };
  }

  @Post()
  @ApiOperation({ summary: 'Create user in organization (invite)' })
  async create(@Body() dto: CreateUserDto, @Req() req: any) {
    const orgId = req.user?.organizationId;
    const createdById = req.user?.id;
    const data = await this.usersService.create(orgId, dto, createdById);
    return { message: 'User created successfully.', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: any) {
    const orgId = req.user?.organizationId;
    const data = await this.usersService.update(orgId, id, dto);
    return { message: 'User updated successfully.', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete (deactivate) user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async softDelete(@Param('id') id: string, @Req() req: any) {
    const orgId = req.user?.organizationId;
    await this.usersService.softDelete(orgId, id);
    return { message: 'User deactivated successfully.' };
  }
}
