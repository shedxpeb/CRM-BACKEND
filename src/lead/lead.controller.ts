import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { LeadService } from './lead.service';
import { GetLeadsDto } from './dto/get-leads.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { BulkStatusDto } from './dto/bulk-status.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { WorkflowDto } from './dto/workflow.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('lead')
@ApiBearerAuth()
@Controller('lead')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Get()
  @RequirePermissions('lead:list')
  @ApiOperation({ summary: 'Get all leads with pagination, search, and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 25 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'John' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['New', 'Contacted', 'DesignPending', 'BOQPending', 'EstimateSent', 'ProposalSent', 'Negotiation', 'Approved', 'Rejected', 'Converted'],
  })
  @ApiQuery({ name: 'priority', required: false, enum: ['Low', 'Medium', 'High', 'Urgent'] })
  @ApiQuery({
    name: 'source',
    required: false,
    enum: ['Website', 'Referral', 'ColdCall', 'Email', 'SocialMedia', 'TradeShow', 'Advertisement', 'Other'],
  })
  @ApiQuery({ name: 'projectType', required: false, enum: ['Factory', 'Warehouse', 'IndustrialShed', 'Commercial', 'Residential', 'Other'] })
  @ApiQuery({ name: 'structureType', required: false, enum: ['PEB', 'SteelStructure', 'Hybrid', 'Other'] })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'assignedEmployeeId', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'companyName', 'customerName', 'priority', 'status', 'leadNumber'], example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc' })
  @ApiResponse({ status: 200, description: 'Lead list fetched successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request parameters.' })
  async findAll(@Query() query: GetLeadsDto, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.leadService.findAll(query, organizationId);
    return { message: 'Lead list fetched successfully.', data };
  }

  @Get('kanban')
  @RequirePermissions('lead:list')
  @ApiOperation({ summary: 'Get leads grouped by status for Kanban view' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'priority', required: false, enum: ['Low', 'Medium', 'High', 'Urgent'] })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'assignedTo', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Kanban data fetched.' })
  async getKanban(
    @Query('search') search?: string,
    @Query('priority') priority?: string,
    @Query('city') city?: string,
    @Query('assignedTo') assignedTo?: string,
    @CurrentUser('organizationId') organizationId?: string,
  ) {
    const data = await this.leadService.getKanban({ search, priority, city, assignedTo }, organizationId);
    return { message: 'Kanban data fetched.', data };
  }

  @Get('calendar')
  @RequirePermissions('lead:list')
  @ApiOperation({ summary: 'Get leads for Calendar view' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'priority', required: false, enum: ['Low', 'Medium', 'High', 'Urgent'] })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Calendar data fetched.' })
  async getCalendar(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('city') city?: string,
    @CurrentUser('organizationId') organizationId?: string,
  ) {
    const data = await this.leadService.getCalendar({ search, status, priority, city }, organizationId);
    return { message: 'Calendar data fetched.', data };
  }

  @Get(':id')
  @RequirePermissions('lead:read')
  @ApiOperation({ summary: 'Get lead by ID' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiResponse({ status: 200, description: 'Lead fetched successfully.' })
  @ApiResponse({ status: 404, description: 'Lead not found.' })
  async findById(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.leadService.findById(id, undefined, organizationId);
    return { message: 'Lead fetched successfully.', data };
  }

  @Post()
  @RequirePermissions('lead:create')
  @ApiOperation({ summary: 'Create new lead' })
  @ApiBody({ type: CreateLeadDto })
  @ApiResponse({ status: 201, description: 'Lead created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request data.' })
  async create(
    @Body() dto: CreateLeadDto,
    @CurrentUser('id') createdById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.leadService.create(dto, createdById, organizationId);
    return { message: 'Lead created successfully.', data };
  }

  @Post('import')
  @RequirePermissions('lead:create')
  @ApiOperation({ summary: 'Import leads from Excel file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Import completed.' })
  @ApiResponse({ status: 400, description: 'Invalid file or data.' })
  async importLeads(
    @Req() request: FastifyRequest,
    @CurrentUser('id') createdById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const file = await (request as any).file();
    if (!file) {
      return { message: 'No file uploaded', data: null };
    }

    const buffer = await file.toBuffer();
    const data = await this.leadService.importLeads(buffer, createdById, organizationId);
    return { message: 'Import completed.', data };
  }

  @Patch(':id')
  @RequirePermissions('lead:update')
  @ApiOperation({ summary: 'Update lead by ID' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiBody({ type: UpdateLeadDto })
  @ApiResponse({ status: 200, description: 'Lead updated successfully.' })
  @ApiResponse({ status: 404, description: 'Lead not found.' })
  @ApiResponse({ status: 400, description: 'Invalid request data.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser('id') updatedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.leadService.update(id, dto, updatedById, organizationId);
    return { message: 'Lead updated successfully.', data };
  }

  @Delete(':id')
  @RequirePermissions('lead:delete')
  @ApiOperation({ summary: 'Soft delete lead by ID' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiResponse({ status: 200, description: 'Lead deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Lead not found.' })
  async softDelete(
    @Param('id') id: string,
    @CurrentUser('id') deletedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.leadService.softDelete(id, deletedById, organizationId);
    return { message: 'Lead deleted successfully.', data };
  }

  @Patch('bulk/status')
  @RequirePermissions('lead:update')
  @ApiOperation({ summary: 'Bulk update lead status' })
  @ApiBody({ type: BulkStatusDto })
  @ApiResponse({ status: 200, description: 'Leads updated successfully.' })
  async bulkStatusUpdate(
    @Body() body: BulkStatusDto,
    @CurrentUser('id') updatedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.leadService.bulkStatusUpdate(body.ids, body.status, updatedById, organizationId);
    return { message: 'Leads updated successfully.', data };
  }

  @Delete('bulk')
  @RequirePermissions('lead:delete')
  @ApiOperation({ summary: 'Bulk delete leads' })
  @ApiBody({ type: BulkDeleteDto })
  @ApiResponse({ status: 200, description: 'Leads deleted successfully.' })
  async bulkDelete(
    @Body() body: BulkDeleteDto,
    @CurrentUser('id') deletedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.leadService.bulkDelete(body.ids, deletedById, organizationId);
    return { message: 'Leads deleted successfully.', data };
  }

  @Get(':id/logs')
  @RequirePermissions('lead:read')
  @ApiOperation({ summary: 'Get lead activity logs' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiResponse({ status: 200, description: 'Logs fetched successfully.' })
  async getLogs(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.leadService.getLogs(id, organizationId);
    return { message: 'Logs fetched successfully.', data };
  }

  @Post(':id/workflow')
  @RequirePermissions('lead:update')
  @ApiOperation({ summary: 'Update lead workflow stage' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiBody({ type: WorkflowDto })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully.' })
  async updateWorkflow(
    @Param('id') id: string,
    @Body() body: WorkflowDto,
    @CurrentUser('id') updatedById: string,
  ) {
    const data = await this.leadService.updateWorkflow(id, body.stage, body.notes, updatedById);
    return { message: 'Workflow updated successfully.', data };
  }
}
