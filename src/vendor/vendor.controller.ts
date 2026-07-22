import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VendorService } from './vendor.service';
import { GetVendorsDto } from './dto/get-vendors.dto';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { BulkDeleteVendorDto, BulkStatusVendorDto } from './dto/bulk.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('vendor')
@ApiBearerAuth()
@Controller('vendor')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Get()
  @RequirePermissions('vendor:list')
  @ApiOperation({ summary: 'Get all vendors with pagination, search, and filters' })
  async findAll(
    @Query() query: GetVendorsDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.vendorService.findAll(query, organizationId);
    return { message: 'Vendors fetched successfully.', data };
  }

  @Get('export')
  @RequirePermissions('vendor:list')
  @ApiOperation({ summary: 'Export vendors' })
  async export(
    @Query() query: GetVendorsDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.vendorService.findAllForExport(query, organizationId);
    return { message: 'Export data fetched.', data };
  }

  @Get('combobox')
  @RequirePermissions('vendor:list')
  @ApiOperation({ summary: 'Get vendors for dropdown' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async combobox(@Query() query: any, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.vendorService.getCombobox(query, organizationId);
    return { message: 'Vendors fetched.', data };
  }

  @Get('stats')
  @RequirePermissions('vendor:list')
  @ApiOperation({ summary: 'Get vendor statistics' })
  async getStats(@CurrentUser('organizationId') organizationId: string) {
    const data = await this.vendorService.getStats(organizationId);
    return { message: 'Stats fetched.', data };
  }

  @Patch('bulk/status')
  @RequirePermissions('vendor:update')
  async bulkStatusUpdate(
    @Body() body: BulkStatusVendorDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.vendorService.bulkStatusUpdate(body.ids, body.status, organizationId);
    return { message: 'Vendors updated.', data };
  }

  @Delete('bulk')
  @RequirePermissions('vendor:delete')
  async bulkDelete(
    @Body() body: BulkDeleteVendorDto,
    @CurrentUser('id') deletedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.vendorService.bulkDelete(body.ids, deletedById, organizationId);
    return { message: 'Vendors deleted.', data };
  }

  @Get(':id')
  @RequirePermissions('vendor:read')
  @ApiOperation({ summary: 'Get vendor by ID' })
  async findById(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.vendorService.findById(id, organizationId);
    return { message: 'Vendor fetched.', data };
  }

  @Post()
  @RequirePermissions('vendor:create')
  @ApiOperation({ summary: 'Create a new vendor' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateVendorDto,
    @CurrentUser('id') createdById: string,
    @CurrentUser('name') createdBy: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.vendorService.create(dto, createdById, createdBy, organizationId);
    return { message: 'Vendor created successfully.', data };
  }

  @Patch(':id')
  @RequirePermissions('vendor:update')
  @ApiOperation({ summary: 'Update vendor' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVendorDto,
    @CurrentUser('id') updatedById: string,
    @CurrentUser('name') updatedBy: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.vendorService.update(id, dto, updatedById, updatedBy, organizationId);
    return { message: 'Vendor updated successfully.', data };
  }

  @Delete(':id')
  @RequirePermissions('vendor:delete')
  @ApiOperation({ summary: 'Delete vendor' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') deletedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.vendorService.delete(id, deletedById, organizationId);
    return { message: 'Vendor deleted successfully.', data };
  }
}
