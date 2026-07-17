import { Controller, Get, Post, Patch, Delete, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { GetCustomersDto } from './dto/get-customers.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { BulkStatusDto } from './dto/bulk-status.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('customer')
@ApiBearerAuth()
@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @RequirePermissions('customer:list')
  @ApiOperation({ summary: 'List customers with pagination, search, and filters' })
  @ApiResponse({ status: 200, description: 'Customer list fetched.' })
  async findAll(
    @Query() query: GetCustomersDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.customerService.findAll(query, organizationId);
    return { message: 'Customer list fetched.', data };
  }

  @Get('stats')
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Customer statistics' })
  async getStats(@CurrentUser('organizationId') organizationId: string) {
    const data = await this.customerService.getStats(organizationId);
    return { message: 'Customer stats fetched.', data };
  }

  @Get('check-duplicate')
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Check for duplicate customer' })
  async checkDuplicate(
    @Query('mobile') mobile: string,
    @Query('email') email: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.customerService.checkDuplicate(mobile, email, organizationId);
    return { message: 'Duplicate check completed.', data };
  }

  /** Static routes MUST be registered before :id to avoid shadowing */
  @Get('export')
  @RequirePermissions('customer:list')
  @ApiOperation({ summary: 'Export customers' })
  async export(
    @Query() query: GetCustomersDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.customerService.findAllForExport(query, organizationId);
    return { message: 'Export data fetched.', data };
  }

  @Get('combobox')
  @RequirePermissions('customer:list')
  @ApiOperation({ summary: 'Customer combobox for dropdowns' })
  async combobox(
    @Query() query: Record<string, unknown>,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.customerService.getCombobox(query, organizationId, [
      'id',
      'customerName',
      'companyName',
      'mobile',
    ]);
    return { message: 'Customers fetched.', data };
  }

  @Post(':id/restore')
  @RequirePermissions('customer:restore')
  @ApiOperation({ summary: 'Restore soft-deleted customer' })
  async restore(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.customerService.restore(id, organizationId);
    return { message: 'Customer restored.', data };
  }

  @Get(':id')
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Get customer by ID' })
  async findById(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.customerService.findById(id, undefined, organizationId);
    return { message: 'Customer fetched.', data };
  }

  @Get(':id/activities')
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Customer activity timeline' })
  async getActivities(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.customerService.getActivities(id, organizationId);
    return { message: 'Activities fetched.', data };
  }

  @Post()
  @RequirePermissions('customer:create')
  @ApiOperation({ summary: 'Create customer' })
  async create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser('id') createdById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.customerService.create(dto, createdById, organizationId);
    return { message: 'Customer created.', data };
  }

  @Post('convert-lead')
  @RequirePermissions('customer:create')
  @ApiOperation({ summary: 'Convert lead to customer' })
  async convertLead(
    @Body() dto: ConvertLeadDto,
    @CurrentUser('id') createdById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.customerService.convertLead(dto, createdById, organizationId);
    return { message: 'Lead converted to customer.', data };
  }

  /** Static bulk routes MUST be registered before parameterized :id routes */
  @Patch('bulk/status')
  @RequirePermissions('customer:update')
  @ApiOperation({ summary: 'Bulk update customer status' })
  async bulkStatusUpdate(
    @Body() dto: BulkStatusDto,
    @CurrentUser('id') updatedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.customerService.bulkStatusUpdate(
      dto.ids,
      dto.status,
      updatedById,
      organizationId,
    );
    return { message: 'Customers updated.', data };
  }

  @Delete('bulk')
  @RequirePermissions('customer:delete')
  @ApiOperation({ summary: 'Bulk delete customers' })
  async bulkDelete(
    @Body() dto: BulkDeleteDto,
    @CurrentUser('id') deletedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.customerService.bulkDelete(dto.ids, deletedById, organizationId);
    return { message: 'Customers deleted.', data };
  }

  @Patch(':id')
  @RequirePermissions('customer:update')
  @ApiOperation({ summary: 'Update customer' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser('id') updatedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.customerService.update(id, dto, updatedById, organizationId);
    return { message: 'Customer updated.', data };
  }

  @Delete(':id')
  @RequirePermissions('customer:delete')
  @ApiOperation({ summary: 'Soft delete customer' })
  async softDelete(
    @Param('id') id: string,
    @CurrentUser('id') deletedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.customerService.softDelete(id, deletedById, organizationId);
    return { message: 'Customer deleted.', data };
  }
}
