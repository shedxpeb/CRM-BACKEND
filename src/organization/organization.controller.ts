import { Controller, Get, Post, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@ApiTags('organization')
@Controller('organization')
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Get()
  @ApiOperation({ summary: 'Get all organizations (super admin)' })
  async findAll() {
    const data = await this.orgService.findAll();
    return { message: 'Organizations fetched successfully.', data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  async findById(@Param('id') id: string) {
    const data = await this.orgService.findById(id);
    return { message: 'Organization fetched successfully.', data };
  }

  @Post()
  @ApiOperation({ summary: 'Create organization' })
  async create(@Body() dto: CreateOrganizationDto, @Req() req: any) {
    const createdById = req.user?.id;
    const data = await this.orgService.create(dto, createdById);
    return { message: 'Organization created successfully.', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization' })
  async update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    const data = await this.orgService.update(id, dto);
    return { message: 'Organization updated successfully.', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete organization' })
  async softDelete(@Param('id') id: string) {
    await this.orgService.softDelete(id);
    return { message: 'Organization deleted successfully.' };
  }
}
