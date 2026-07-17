import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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
  async findAll(
    @Query() query: GetProjectsDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.projectService.findAll(query, organizationId);
    return { message: 'Project list fetched successfully.', data };
  }

  @Get('stats')
  @RequirePermissions('project:read')
  async getStats(@CurrentUser('organizationId') organizationId: string) {
    const data = await this.projectService.getStats(organizationId);
    return { message: 'Project stats fetched successfully.', data };
  }

  @Get('export')
  @RequirePermissions('project:list')
  async export(
    @Query() query: GetProjectsDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.projectService.findAllForExport(query, organizationId);
    return { message: 'Export data fetched successfully.', data };
  }

  @Patch('bulk')
  @RequirePermissions('project:update')
  async bulkUpdate(
    @Body() body: BulkUpdateDto,
    @CurrentUser('id') updatedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.projectService.bulkUpdate(
      body.ids,
      body.data,
      updatedById,
      organizationId,
    );
    return { message: 'Projects updated successfully.', data };
  }

  @Delete('bulk')
  @RequirePermissions('project:delete')
  async bulkDelete(
    @Body() body: BulkDeleteDto,
    @CurrentUser('id') deletedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.projectService.bulkDelete(body.ids, deletedById, organizationId);
    return { message: 'Projects deleted successfully.', data };
  }

  @Post()
  @RequirePermissions('project:create')
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser('id') createdById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.projectService.create(dto, createdById, organizationId);
    return { message: 'Project created successfully.', data };
  }

  @Get(':id')
  @RequirePermissions('project:read')
  async findById(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.projectService.findById(
      id,
      { milestones: true, teamMembers: true },
      organizationId,
    );
    return { message: 'Project fetched successfully.', data };
  }

  @Get(':id/activities')
  @RequirePermissions('project:read')
  async getActivities(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.projectService.getActivities(id, organizationId);
    return { message: 'Activities fetched successfully.', data };
  }

  @Get(':id/tasks')
  @RequirePermissions('project:read')
  async getTasks(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.projectService.getTasks(id, organizationId);
    return { message: 'Tasks fetched successfully.', data };
  }

  @Post(':id/restore')
  @RequirePermissions('project:restore')
  async restore(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.projectService.restore(id, organizationId);
    return { message: 'Project restored.', data };
  }

  @Patch(':id')
  @RequirePermissions('project:update')
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
  async softDelete(
    @Param('id') id: string,
    @CurrentUser('id') deletedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.projectService.softDelete(id, deletedById, organizationId);
    return { message: 'Project deleted successfully.', data };
  }

  @Post(':id/tasks')
  @RequirePermissions('project:update')
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
