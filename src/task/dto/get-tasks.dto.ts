import {
  IsOptional,
  IsInt,
  IsString,
  IsEnum,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TaskStatusFilter {
  Pending = 'Pending',
  InProgress = 'InProgress',
  Blocked = 'Blocked',
  Review = 'Review',
  Completed = 'Completed',
  Verified = 'Verified',
  Rejected = 'Rejected',
  Closed = 'Closed',
  Cancelled = 'Cancelled',
  Reopened = 'Reopened',
}

export enum TaskPriorityFilter {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

export enum TaskCategoryFilter {
  General = 'General',
  Office = 'Office',
  FieldWork = 'FieldWork',
  Maintenance = 'Maintenance',
  Installation = 'Installation',
  Inspection = 'Inspection',
  Documentation = 'Documentation',
  Meeting = 'Meeting',
  Training = 'Training',
  Other = 'Other',
}

export enum LinkedModuleFilter {
  Leads = 'Leads',
  Customers = 'Customers',
  Projects = 'Projects',
  Estimates = 'Estimates',
  Proposals = 'Proposals',
  Quotations = 'Quotations',
  Invoices = 'Invoices',
  Inventory = 'Inventory',
  Purchases = 'Purchases',
  Finance = 'Finance',
  Documents = 'Documents',
  General = 'General',
}

export class GetTasksDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  pageSize?: number = 25;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(TaskStatusFilter)
  status?: TaskStatusFilter;

  @IsOptional()
  @IsEnum(TaskPriorityFilter)
  priority?: TaskPriorityFilter;

  @IsOptional()
  @IsEnum(TaskCategoryFilter)
  category?: TaskCategoryFilter;

  @IsOptional()
  @IsEnum(LinkedModuleFilter)
  linkedModule?: LinkedModuleFilter;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  dueDateFrom?: string;

  @IsOptional()
  @IsString()
  dueDateTo?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
