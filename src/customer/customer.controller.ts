import { Controller, Get, Post, Patch, Delete, Param, Query, Body, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { GetCustomersDto } from './dto/get-customers.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { BulkStatusDto } from './dto/bulk-status.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';

@ApiTags('customer')
@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @ApiOperation({ summary: 'Get all customers with pagination, search, and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 25 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'Rajesh' })
  @ApiQuery({ name: 'status', required: false, enum: ['Active', 'Inactive', 'Prospect', 'Converted', 'Churned'] })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'state', required: false, type: String })
  @ApiQuery({ name: 'industry', required: false, type: String })
  @ApiQuery({ name: 'assignedEmployee', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'companyName', 'customerName', 'status'], example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc' })
  @ApiResponse({ status: 200, description: 'Customer list fetched successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request parameters.' })
  async findAll(@Query() query: GetCustomersDto) {
    const data = await this.customerService.findAll(query);
    return {
      message: 'Customer list fetched successfully.',
      data,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get customer statistics for KPIs' })
  @ApiResponse({ status: 200, description: 'Customer stats fetched successfully.' })
  async getStats() {
    const data = await this.customerService.getStats();
    return {
      message: 'Customer stats fetched successfully.',
      data,
    };
  }

  @Get('check-duplicate')
  @ApiOperation({ summary: 'Check for duplicate customer by mobile or email' })
  @ApiQuery({ name: 'mobile', required: true, type: String })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Duplicate check result.' })
  async checkDuplicate(@Query('mobile') mobile: string, @Query('email') email?: string) {
    const data = await this.customerService.checkDuplicate(mobile, email);
    return {
      message: 'Duplicate check completed.',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({ status: 200, description: 'Customer fetched successfully.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  async findById(@Param('id') id: string) {
    const data = await this.customerService.findById(id);
    return {
      message: 'Customer fetched successfully.',
      data,
    };
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get customer activity timeline' })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({ status: 200, description: 'Activities fetched successfully.' })
  async getActivities(@Param('id') id: string) {
    const data = await this.customerService.getActivities(id);
    return {
      message: 'Activities fetched successfully.',
      data,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create new customer' })
  @ApiBody({ type: CreateCustomerDto })
  @ApiResponse({ status: 201, description: 'Customer created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request data.' })
  async create(@Body() createCustomerDto: CreateCustomerDto, @Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException('Authenticated user is required');
    const createdById = req.user.id;
    const organizationId = req.user?.organizationId;
    const data = await this.customerService.create(createCustomerDto, createdById, organizationId);
    return {
      message: 'Customer created successfully.',
      data,
    };
  }

  @Post('convert-lead')
  @ApiOperation({ summary: 'Convert lead to customer' })
  @ApiBody({ type: ConvertLeadDto })
  @ApiResponse({ status: 201, description: 'Lead converted successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request data.' })
  @ApiResponse({ status: 404, description: 'Lead not found.' })
  async convertLead(@Body() convertLeadDto: ConvertLeadDto, @Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException('Authenticated user is required');
    const createdById = req.user.id;
    const organizationId = req.user?.organizationId;
    const data = await this.customerService.convertLead(convertLeadDto, createdById, organizationId);
    return {
      message: 'Lead converted to customer successfully.',
      data,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer by ID' })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiResponse({ status: 200, description: 'Customer updated successfully.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  async update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto, @Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException('Authenticated user is required');
    const updatedById = req.user.id;
    const data = await this.customerService.update(id, updateCustomerDto, updatedById);
    return {
      message: 'Customer updated successfully.',
      data,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete customer by ID' })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({ status: 200, description: 'Customer deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  async softDelete(@Param('id') id: string, @Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException('Authenticated user is required');
    const deletedById = req.user.id;
    const data = await this.customerService.softDelete(id, deletedById);
    return {
      message: 'Customer deleted successfully.',
      data,
    };
  }

  @Patch('bulk/status')
  @ApiOperation({ summary: 'Bulk update customer status' })
  @ApiBody({ type: BulkStatusDto })
  @ApiResponse({ status: 200, description: 'Customers updated successfully.' })
  async bulkStatusUpdate(@Body() body: BulkStatusDto, @Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException('Authenticated user is required');
    const updatedById = req.user.id;
    const data = await this.customerService.bulkStatusUpdate(body.ids, body.status, updatedById);
    return {
      message: 'Customers updated successfully.',
      data,
    };
  }

  @Delete('bulk')
  @ApiOperation({ summary: 'Bulk delete customers' })
  @ApiBody({ type: BulkDeleteDto })
  @ApiResponse({ status: 200, description: 'Customers deleted successfully.' })
  async bulkDelete(@Body() body: BulkDeleteDto, @Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException('Authenticated user is required');
    const deletedById = req.user.id;
    const data = await this.customerService.bulkDelete(body.ids, deletedById);
    return {
      message: 'Customers deleted successfully.',
      data,
    };
  }

  @Get('export')
  @ApiOperation({ summary: 'Export customers to CSV' })
  @ApiResponse({ status: 200, description: 'CSV export.' })
  async export() {
    const data = await this.customerService.findAll({ pageSize: 10000 } as GetCustomersDto);
    return {
      message: 'Export data fetched.',
      data,
    };
  }
}
