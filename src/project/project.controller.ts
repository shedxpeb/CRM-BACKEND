import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { GetProjectsDto } from './dto/get-projects.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { BulkUpdateDto } from './dto/bulk-update.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@ApiTags('project')
@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @ApiOperation({ summary: 'Get all projects with pagination, search, and filters' })
  @ApiResponse({ status: 200, description: 'Project list fetched successfully.' })
  async findAll(@Query() query: GetProjectsDto) {
    const data = await this.projectService.findAll(query);
    return { message: 'Project list fetched successfully.', data };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get project statistics' })
  @ApiResponse({ status: 200, description: 'Project stats fetched successfully.' })
  async getStats() {
    const data = await this.projectService.getStats();
    return { message: 'Project stats fetched successfully.', data };
  }

  @Get('export')
  @ApiOperation({ summary: 'Export projects (placeholder)' })
  @ApiResponse({ status: 200, description: 'Export endpoint placeholder.' })
  async export(@Query() query: GetProjectsDto) {
    const data = await this.projectService.findAll(query);
    return { message: 'Export data fetched successfully.', data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project fetched successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  async findById(@Param('id') id: string) {
    const data = await this.projectService.findById(id);
    return { message: 'Project fetched successfully.', data };
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get project activities' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Activities fetched successfully.' })
  async getActivities(@Param('id') id: string) {
    const data = await this.projectService.getActivities(id);
    return { message: 'Activities fetched successfully.', data };
  }

  @Get(':id/tasks')
  @ApiOperation({ summary: 'Get project tasks' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Tasks fetched successfully.' })
  async getTasks(@Param('id') id: string) {
    const data = await this.projectService.getTasks(id);
    return { message: 'Tasks fetched successfully.', data };
  }

  @Post()
  @ApiOperation({ summary: 'Create new project' })
  @ApiBody({ type: CreateProjectDto })
  @ApiResponse({ status: 201, description: 'Project created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request data.' })
  async create(@Body() dto: CreateProjectDto, @Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException('Authenticated user is required');
    const createdById = req.user.id;
    const organizationId = req.user?.organizationId;
    const data = await this.projectService.create(dto, createdById, organizationId);
    return { message: 'Project created successfully.', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project by ID' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiBody({ type: UpdateProjectDto })
  @ApiResponse({ status: 200, description: 'Project updated successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  async update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException('Authenticated user is required');
    const updatedById = req.user.id;
    const data = await this.projectService.update(id, dto, updatedById);
    return { message: 'Project updated successfully.', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete project by ID' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  async softDelete(@Param('id') id: string, @Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException('Authenticated user is required');
    const deletedById = req.user.id;
    const data = await this.projectService.softDelete(id, deletedById);
    return { message: 'Project deleted successfully.', data };
  }

  @Patch('bulk')
  @ApiOperation({ summary: 'Bulk update projects' })
  @ApiBody({ type: BulkUpdateDto })
  @ApiResponse({ status: 200, description: 'Projects updated successfully.' })
  async bulkUpdate(@Body() body: BulkUpdateDto, @Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException('Authenticated user is required');
    const updatedById = req.user.id;
    const data = await this.projectService.bulkUpdate(body.ids, body.data, updatedById);
    return { message: 'Projects updated successfully.', data };
  }

  @Delete('bulk')
  @ApiOperation({ summary: 'Bulk delete projects' })
  @ApiBody({ type: BulkDeleteDto })
  @ApiResponse({ status: 200, description: 'Projects deleted successfully.' })
  async bulkDelete(@Body() body: BulkDeleteDto, @Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException('Authenticated user is required');
    const deletedById = req.user.id;
    const data = await this.projectService.bulkDelete(body.ids, deletedById);
    return { message: 'Projects deleted successfully.', data };
  }

  @Post(':id/tasks')
  @ApiOperation({ summary: 'Create task for project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiBody({ type: CreateTaskDto })
  @ApiResponse({ status: 201, description: 'Task created successfully.' })
  async createTask(@Param('id') id: string, @Body() dto: CreateTaskDto) {
    const data = await this.projectService.createTask(id, dto);
    return { message: 'Task created successfully.', data };
  }

  @Patch(':id/tasks/:taskId')
  @ApiOperation({ summary: 'Update project task' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiBody({ type: UpdateTaskDto })
  @ApiResponse({ status: 200, description: 'Task updated successfully.' })
  async updateTask(@Param('id') id: string, @Param('taskId') taskId: string, @Body() dto: UpdateTaskDto) {
    const data = await this.projectService.updateTask(id, taskId, dto);
    return { message: 'Task updated successfully.', data };
  }

  @Delete(':id/tasks/:taskId')
  @ApiOperation({ summary: 'Delete project task' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully.' })
  async deleteTask(@Param('id') id: string, @Param('taskId') taskId: string) {
    await this.projectService.deleteTask(id, taskId);
    return { message: 'Task deleted successfully.' };
  }
}
