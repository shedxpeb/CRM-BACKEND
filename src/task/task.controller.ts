import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { GetTasksDto } from './dto/get-tasks.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { VerifyTaskDto } from './dto/verify-task.dto';
import {
  CreateSalaryAdjustmentDto,
  UpdateSalaryAdjustmentDto,
  ApproveSalaryAdjustmentDto,
  ProcessSalaryAdjustmentDto,
  GetSalaryAdjustmentsDto,
} from './dto/salary-adjustment.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('task')
@ApiBearerAuth()
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @RequirePermissions('task:list')
  @ApiOperation({ summary: 'Get all tasks with pagination and filters' })
  async findAll(
    @Query() query: GetTasksDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.taskService.findAll(query, organizationId);
    return { message: 'Tasks fetched successfully.', data };
  }

  @Get('stats')
  @RequirePermissions('task:list')
  @ApiOperation({ summary: 'Get task statistics' })
  async getStats(@CurrentUser('organizationId') organizationId: string) {
    const data = await this.taskService.getStats(organizationId);
    return { message: 'Task stats fetched.', data };
  }

  @Get('dashboard-kpis')
  @RequirePermissions('task:list')
  @ApiOperation({ summary: 'Get dashboard KPIs for tasks' })
  async getDashboardKPIs(@CurrentUser('organizationId') organizationId: string) {
    const data = await this.taskService.getDashboardKPIs(organizationId);
    return { message: 'Dashboard KPIs fetched.', data };
  }

  @Get('employee-performance')
  @RequirePermissions('task:list')
  @ApiOperation({ summary: 'Get employee performance stats' })
  async getEmployeePerformance(
    @Query('employeeId') employeeId: string | undefined,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.taskService.getEmployeePerformance(organizationId, employeeId);
    return { message: 'Employee performance fetched.', data };
  }

  @Get('employee-salary-ledger/:employeeId')
  @RequirePermissions('task:list')
  @ApiOperation({ summary: 'Get employee salary ledger' })
  async getEmployeeSalaryLedger(
    @Param('employeeId') employeeId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.taskService.getEmployeeSalaryLedger(
      organizationId,
      employeeId,
      new Date(periodStart),
      new Date(periodEnd),
    );
    return { message: 'Salary ledger fetched.', data };
  }

  @Get('salary-adjustments')
  @RequirePermissions('task:list')
  @ApiOperation({ summary: 'Get all salary adjustments' })
  async getSalaryAdjustments(
    @Query() query: GetSalaryAdjustmentsDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.taskService.getSalaryAdjustments(query, organizationId);
    return { message: 'Salary adjustments fetched.', data };
  }

  @Get('salary-adjustments/:id')
  @RequirePermissions('task:list')
  @ApiOperation({ summary: 'Get salary adjustment by ID' })
  async getSalaryAdjustmentById(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.taskService.getSalaryAdjustmentById(id, organizationId);
    return { message: 'Salary adjustment fetched.', data };
  }

  @Get(':id')
  @RequirePermissions('task:list')
  @ApiOperation({ summary: 'Get task by ID' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.taskService.findById(id, organizationId);
    return { message: 'Task fetched successfully.', data };
  }

  @Post()
  @RequirePermissions('task:create')
  @ApiOperation({ summary: 'Create a new task' })
  async create(
    @Body() dto: CreateTaskDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('name') userName: string,
  ) {
    const data = await this.taskService.create(dto, organizationId, userId, userName || 'Unknown');
    return { message: 'Task created successfully.', data };
  }

  @Post(':id/complete')
  @RequirePermissions('task:update')
  @ApiOperation({ summary: 'Complete a task with photo proof' })
  async complete(
    @Param('id') id: string,
    @Body() dto: CompleteTaskDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('name') userName: string,
  ) {
    const data = await this.taskService.complete(id, dto, organizationId, userId, userName || 'Unknown');
    return { message: 'Task completed successfully.', data };
  }

  @Post(':id/verify')
  @RequirePermissions('task:approve')
  @ApiOperation({ summary: 'Verify or reject a completed task' })
  async verify(
    @Param('id') id: string,
    @Body() dto: VerifyTaskDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.taskService.verify(id, dto, organizationId);
    const action = dto.status === 'Verified' ? 'verified' : 'rejected';
    return { message: `Task ${action} successfully.`, data };
  }

  @Post('salary-adjustments')
  @RequirePermissions('task:create')
  @ApiOperation({ summary: 'Create a salary adjustment' })
  async createSalaryAdjustment(
    @Body() dto: CreateSalaryAdjustmentDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.taskService.createSalaryAdjustment(dto, organizationId, userId);
    return { message: 'Salary adjustment created.', data };
  }

  @Post('salary-adjustments/:id/approve')
  @RequirePermissions('task:approve')
  @ApiOperation({ summary: 'Approve a salary adjustment' })
  async approveSalaryAdjustment(
    @Param('id') id: string,
    @Body() dto: ApproveSalaryAdjustmentDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.taskService.approveSalaryAdjustment(id, dto.approvedBy, dto.approvedByName, organizationId);
    return { message: 'Salary adjustment approved.', data };
  }

  @Post('salary-adjustments/:id/process')
  @RequirePermissions('task:approve')
  @ApiOperation({ summary: 'Process an approved salary adjustment' })
  async processSalaryAdjustment(
    @Param('id') id: string,
    @Body() dto: ProcessSalaryAdjustmentDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.taskService.processSalaryAdjustment(id, dto.processedBy, organizationId);
    return { message: 'Salary adjustment processed.', data };
  }

  @Patch(':id')
  @RequirePermissions('task:update')
  @ApiOperation({ summary: 'Update a task' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('name') userName: string,
  ) {
    const data = await this.taskService.update(id, dto, organizationId, userId, userName || 'Unknown');
    return { message: 'Task updated successfully.', data };
  }

  @Patch('salary-adjustments/:id')
  @RequirePermissions('task:update')
  @ApiOperation({ summary: 'Update a salary adjustment' })
  async updateSalaryAdjustment(
    @Param('id') id: string,
    @Body() dto: UpdateSalaryAdjustmentDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.taskService.updateSalaryAdjustment(id, dto, organizationId);
    return { message: 'Salary adjustment updated.', data };
  }

  @Delete(':id')
  @RequirePermissions('task:delete')
  @ApiOperation({ summary: 'Delete a task' })
  async softDelete(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('name') userName: string,
  ) {
    const data = await this.taskService.deleteTask(id, organizationId, userId, userName || 'Unknown');
    return { message: 'Task deleted successfully.', data };
  }

  @Delete('salary-adjustments/:id')
  @RequirePermissions('task:delete')
  @ApiOperation({ summary: 'Delete a salary adjustment' })
  async deleteSalaryAdjustment(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.taskService.softDeleteSalaryAdjustment(id, organizationId);
    return { message: 'Salary adjustment deleted.', data };
  }
}
