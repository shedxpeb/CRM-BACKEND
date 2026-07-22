import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TaskStatusFilter,
  TaskPriorityFilter,
  TaskCategoryFilter,
  LinkedModuleFilter,
} from './get-tasks.dto';

export class CreateTaskDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  assignedUserId: string;

  @IsOptional()
  @IsString()
  assignedUserName?: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  reminderDate?: string;

  @IsEnum(TaskPriorityFilter)
  priority: TaskPriorityFilter;

  @IsOptional()
  @IsEnum(TaskStatusFilter)
  status?: TaskStatusFilter;

  @IsOptional()
  @IsEnum(TaskCategoryFilter)
  category?: TaskCategoryFilter;

  @IsOptional()
  @IsEnum(LinkedModuleFilter)
  linkedModule?: LinkedModuleFilter;

  @IsOptional()
  @IsString()
  linkedRecordId?: string;

  @IsOptional()
  @IsString()
  linkedRecordName?: string;

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
  documentId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  incentiveValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  estimatedHours?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  beforeImages?: string[];
}
