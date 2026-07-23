import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
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
  async findAll(
    @Query() query: GetLeadsDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.leadService.findAll(query, organizationId);
    return { message: 'Lead list fetched successfully.', data };
  }

  @Get('kanban')
  @RequirePermissions('lead:list')
  async getKanban(
    @Query('search') search: string | undefined,
    @Query('priority') priority: string | undefined,
    @Query('city') city: string | undefined,
    @Query('assignedTo') assignedTo: string | undefined,
    @Query('assignedEmployeeId') assignedEmployeeId: string | undefined,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.leadService.getKanban(
      { search, priority, city, assignedTo, assignedEmployeeId },
      organizationId,
    );
    return { message: 'Kanban data fetched.', data };
  }

  @Get('calendar')
  @RequirePermissions('lead:list')
  async getCalendar(
    @Query('search') search: string | undefined,
    @Query('status') status: string | undefined,
    @Query('priority') priority: string | undefined,
    @Query('city') city: string | undefined,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.leadService.getCalendar(
      { search, status, priority, city },
      organizationId,
    );
    return { message: 'Calendar data fetched.', data };
  }

  @Get('export')
  @RequirePermissions('lead:list')
  async export(@Query() query: GetLeadsDto, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.leadService.findAllForExport(query, organizationId);
    return { message: 'Export data fetched.', data };
  }

  @Get('check-duplicate')
  @RequirePermissions('lead:read')
  async checkDuplicate(
    @Query('mobile') mobile: string,
    @Query('email') email: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.leadService.checkDuplicate(mobile, email, organizationId);
    return { message: 'Duplicate check completed.', data };
  }

  @Patch('bulk/status')
  @RequirePermissions('lead:update')
  async bulkStatusUpdate(
    @Body() body: BulkStatusDto,
    @CurrentUser('id') updatedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.leadService.bulkStatusUpdate(
      body.ids,
      body.status,
      updatedById,
      organizationId,
    );
    return { message: 'Leads updated successfully.', data };
  }

  @Delete('bulk')
  @RequirePermissions('lead:delete')
  async bulkDelete(
    @Body() body: BulkDeleteDto,
    @CurrentUser('id') deletedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.leadService.bulkDelete(body.ids, deletedById, organizationId);
    return { message: 'Leads deleted successfully.', data };
  }

  @Post('import')
  @RequirePermissions('lead:create')
  @ApiConsumes('multipart/form-data')
  async importLeads(
    @Req() request: FastifyRequest,
    @CurrentUser('id') createdById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const file = await (request as any).file();
    if (!file) {
      return { message: 'No file uploaded', data: null };
    }
    const buffer = await file.toBuffer();
    const data = await this.leadService.importLeads(buffer, createdById, organizationId);
    return { message: 'Import completed.', data };
  }

  @Post()
  @RequirePermissions('lead:create')
  async create(
    @Body() dto: CreateLeadDto,
    @CurrentUser('id') createdById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.leadService.create(dto, createdById, organizationId);
    return { message: 'Lead created successfully.', data };
  }

  @Get(':id')
  @RequirePermissions('lead:read')
  async findById(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.leadService.findById(id, undefined, organizationId);
    return { message: 'Lead fetched successfully.', data };
  }

  @Get(':id/logs')
  @RequirePermissions('lead:read')
  async getLogs(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.leadService.getLogs(id, organizationId);
    return { message: 'Logs fetched.', data };
  }

  @Post(':id/workflow')
  @RequirePermissions('lead:update')
  async updateWorkflow(
    @Param('id') id: string,
    @Body() body: WorkflowDto,
    @CurrentUser('id') updatedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.leadService.updateWorkflow(
      id,
      body.stage,
      body.notes,
      updatedById,
      organizationId,
    );
    return { message: 'Workflow updated.', data };
  }

  @Post(':id/restore')
  @RequirePermissions('lead:restore')
  async restore(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.leadService.restore(id, organizationId);
    return { message: 'Lead restored.', data };
  }

  @Patch(':id')
  @RequirePermissions('lead:update')
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
  async softDelete(
    @Param('id') id: string,
    @CurrentUser('id') deletedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.leadService.softDelete(id, deletedById, organizationId);
    return { message: 'Lead deleted successfully.', data };
  }
}
