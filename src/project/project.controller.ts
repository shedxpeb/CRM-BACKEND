import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { GetProjectsDto } from './dto/get-projects.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { BulkUpdateDto } from './dto/bulk-update.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('project')
@ApiBearerAuth()
@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @RequirePermissions('project:list')
  @ApiOperation({ summary: 'Get all projects with pagination, search, and filters' })
  @ApiResponse({ status: 200, description: 'Project list fetched successfully.' })
  async findAll(@Query() query: GetProjectsDto, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.projectService.findAll(query, organizationId);
    return { message: 'Project list fetched successfully.', data };
  }

  @Get('stats')
  @RequirePermissions('project:read')
  @ApiOperation({ summary: 'Get project statistics' })
  @ApiResponse({ status: 200, description: 'Project stats fetched successfully.' })
  async getStats(@CurrentUser('organizationId') organizationId: string) {
    const data = await this.projectService.getStats(organizationId);
    return { message: 'Project stats fetched successfully.', data };
  }

  @Get('export')
  @RequirePermissions('project:list')
  @ApiOperation({ summary: 'Export projects' })
  @ApiResponse({ status: 200, description: 'Export data fetched successfully.' })
  async export(@Query() query: GetProjectsDto, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.projectService.findAll({ ...query, pageSize: 10000 }, organizationId);
    return { message: 'Export data fetched successfully.', data };
  }

  @Get(':id')
  @RequirePermissions('project:read')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project fetched successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  async findById(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.projectService.findById(id, { milestones: true, teamMembers: true }, organizationId);
    return { message: 'Project fetched successfully.', data };
  }

  @Get(':id/activities')
  @RequirePermissions('project:read')
  @ApiOperation({ summary: 'Get project activities' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Activities fetched successfully.' })
  async getActivities(@Param('id') id: string) {
    const data = await this.projectService.getActivities(id);
    return { message: 'Activities fetched successfully.', data };
  }

  @Get(':id/tasks')
  @RequirePermissions('project:read')
  @ApiOperation({ summary: 'Get project tasks' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Tasks fetched successfully.' })
  async getTasks(@Param('id') id: string) {
    const data = await this.projectService.getTasks(id);
    return { message: 'Tasks fetched successfully.', data };
  }

  @Post()
  @RequirePermissions('project:create')
  @ApiOperation({ summary: 'Create new project' })
  @ApiBody({ type: CreateProjectDto })
  @ApiResponse({ status: 201, description: 'Project created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request data.' })
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser('id') createdById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.projectService.create(dto, createdById, organizationId);
    return { message: 'Project created successfully.', data };
  }

  @Patch(':id')
  @RequirePermissions('project:update')
  @ApiOperation({ summary: 'Update project by ID' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiBody({ type: UpdateProjectDto })
  @ApiResponse({ status: 200, description: 'Project updated successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser('id') updatedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.projectService.update(id, dto, updatedById, organizationId);
    return { message: 'Project updated successfully.', data };
  }

  @Delete(':id')
  @RequirePermissions('project:delete')
  @ApiOperation({ summary: 'Soft delete project by ID' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  async softDelete(
    @Param('id') id: string,
    @CurrentUser('id') deletedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.projectService.softDelete(id, deletedById, organizationId);
    return { message: 'Project deleted successfully.', data };
  }

  @Patch('bulk')
  @RequirePermissions('project:update')
  @ApiOperation({ summary: 'Bulk update projects' })
  @ApiBody({ type: BulkUpdateDto })
  @ApiResponse({ status: 200, description: 'Projects updated successfully.' })
  async bulkUpdate(
    @Body() body: BulkUpdateDto,
    @CurrentUser('id') updatedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.projectService.bulkUpdate(body.ids, body.data, updatedById, organizationId);
    return { message: 'Projects updated successfully.', data };
  }

  @Delete('bulk')
  @RequirePermissions('project:delete')
  @ApiOperation({ summary: 'Bulk delete projects' })
  @ApiBody({ type: BulkDeleteDto })
  @ApiResponse({ status: 200, description: 'Projects deleted successfully.' })
  async bulkDelete(
    @Body() body: BulkDeleteDto,
    @CurrentUser('id') deletedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.projectService.bulkDelete(body.ids, deletedById, organizationId);
    return { message: 'Projects deleted successfully.', data };
  }

  @Post(':id/tasks')
  @RequirePermissions('project:update')
  @ApiOperation({ summary: 'Create task for project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiBody({ type: CreateTaskDto })
  @ApiResponse({ status: 201, description: 'Task created successfully.' })
  async createTask(
    @Param('id') id: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.projectService.createTask(id, dto, organizationId);
    return { message: 'Task created successfully.', data };
  }

  @Patch(':id/tasks/:taskId')
  @RequirePermissions('project:update')
  @ApiOperation({ summary: 'Update project task' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiBody({ type: UpdateTaskDto })
  @ApiResponse({ status: 200, description: 'Task updated successfully.' })
  async updateTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser('id') updatedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.projectService.updateTask(id, taskId, dto, updatedById, organizationId);
    return { message: 'Task updated successfully.', data };
  }

  @Delete(':id/tasks/:taskId')
  @RequirePermissions('project:update')
  @ApiOperation({ summary: 'Delete project task' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully.' })
  async deleteTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @CurrentUser('id') deletedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    await this.projectService.deleteTask(id, taskId, deletedById, organizationId);
    return { message: 'Task deleted successfully.' };
  }
}
