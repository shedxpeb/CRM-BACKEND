import { Controller, Get, Query, Post, Patch, Delete, Param, Body, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { LeadService } from './lead.service';
import { GetLeadsDto } from './dto/get-leads.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { BulkStatusDto } from './dto/bulk-status.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { WorkflowDto } from './dto/workflow.dto';

@ApiTags('lead')
@Controller('lead')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Get()
  @ApiOperation({ summary: 'Get all leads with pagination, search, and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 25 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'John' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'New',
      'Contacted',
      'DesignPending',
      'BOQPending',
      'EstimateSent',
      'ProposalSent',
      'Negotiation',
      'Approved',
      'Rejected',
      'Converted',
    ],
  })
  @ApiQuery({ name: 'priority', required: false, enum: ['Low', 'Medium', 'High', 'Urgent'] })
  @ApiQuery({
    name: 'source',
    required: false,
    enum: [
      'Website',
      'Referral',
      'ColdCall',
      'Email',
      'SocialMedia',
      'TradeShow',
      'Advertisement',
      'Other',
    ],
  })
  @ApiQuery({
    name: 'projectType',
    required: false,
    enum: ['Factory', 'Warehouse', 'IndustrialShed', 'Commercial', 'Residential', 'Other'],
  })
  @ApiQuery({
    name: 'structureType',
    required: false,
    enum: ['PEB', 'SteelStructure', 'Hybrid', 'Other'],
  })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'assignedEmployeeId', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'companyName', 'customerName', 'priority', 'status', 'leadNumber'],
    example: 'createdAt',
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc' })
  @ApiResponse({ status: 200, description: 'Lead list fetched successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request parameters.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async findAll(@Query() query: GetLeadsDto) {
    const data = await this.leadService.findAll(query);
    return {
      message: 'Lead list fetched successfully.',
      data,
    };
  }

  @Get('kanban')
  @ApiOperation({ summary: 'Get leads grouped by status for Kanban view' })
  @ApiResponse({ status: 200, description: 'Kanban data fetched successfully.' })
  async getKanban() {
    const data = await this.leadService.getKanban();
    return {
      message: 'Kanban data fetched successfully.',
      data,
    };
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get leads with follow-up dates for Calendar view' })
  @ApiResponse({ status: 200, description: 'Calendar data fetched successfully.' })
  async getCalendar() {
    const data = await this.leadService.getCalendar();
    return {
      message: 'Calendar data fetched successfully.',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead by ID' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiResponse({ status: 200, description: 'Lead fetched successfully.' })
  @ApiResponse({ status: 404, description: 'Lead not found.' })
  async findById(@Param('id') id: string) {
    const data = await this.leadService.findById(id);
    return {
      message: 'Lead fetched successfully.',
      data,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create new lead' })
  @ApiBody({ type: CreateLeadDto })
  @ApiResponse({ status: 201, description: 'Lead created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request data.' })
  async create(@Body() createLeadDto: CreateLeadDto, @Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException('Authenticated user is required');
    const createdById = req.user.id;
    const organizationId = req.user?.organizationId;
    const data = await this.leadService.create(createLeadDto, createdById, organizationId);
    return {
      message: 'Lead created successfully.',
      data,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lead by ID' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiBody({ type: UpdateLeadDto })
  @ApiResponse({ status: 200, description: 'Lead updated successfully.' })
  @ApiResponse({ status: 404, description: 'Lead not found.' })
  @ApiResponse({ status: 400, description: 'Invalid request data.' })
  async update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto, @Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException('Authenticated user is required');
    const updatedById = req.user.id;
    const data = await this.leadService.update(id, updateLeadDto, updatedById);
    return {
      message: 'Lead updated successfully.',
      data,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete lead by ID' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiResponse({ status: 200, description: 'Lead deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Lead not found.' })
  async softDelete(@Param('id') id: string, @Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException('Authenticated user is required');
    const deletedById = req.user.id;
    const data = await this.leadService.softDelete(id, deletedById);
    return {
      message: 'Lead deleted successfully.',
      data,
    };
  }

  @Patch('bulk/status')
  @ApiOperation({ summary: 'Bulk update lead status' })
  @ApiBody({ type: BulkStatusDto })
  @ApiResponse({ status: 200, description: 'Leads updated successfully.' })
  async bulkStatusUpdate(@Body() body: BulkStatusDto, @Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException('Authenticated user is required');
    const updatedById = req.user.id;
    const data = await this.leadService.bulkStatusUpdate(body.ids, body.status, updatedById);
    return {
      message: 'Leads updated successfully.',
      data,
    };
  }

  @Delete('bulk')
  @ApiOperation({ summary: 'Bulk delete leads' })
  @ApiBody({ type: BulkDeleteDto })
  @ApiResponse({ status: 200, description: 'Leads deleted successfully.' })
  async bulkDelete(@Body() body: BulkDeleteDto, @Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException('Authenticated user is required');
    const deletedById = req.user.id;
    const data = await this.leadService.bulkDelete(body.ids, deletedById);
    return {
      message: 'Leads deleted successfully.',
      data,
    };
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get lead activity logs' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiResponse({ status: 200, description: 'Logs fetched successfully.' })
  async getLogs(@Param('id') id: string) {
    const data = await this.leadService.getLogs(id);
    return {
      message: 'Logs fetched successfully.',
      data,
    };
  }

  @Post(':id/workflow')
  @ApiOperation({ summary: 'Update lead workflow stage' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiBody({ type: WorkflowDto })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully.' })
  async updateWorkflow(@Param('id') id: string, @Body() body: WorkflowDto, @Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException('Authenticated user is required');
    const updatedById = req.user.id;
    const data = await this.leadService.updateWorkflow(id, body.stage, body.notes, updatedById);
    return {
      message: 'Workflow updated successfully.',
      data,
    };
  }
}
