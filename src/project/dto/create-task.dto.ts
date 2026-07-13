import { IsString, IsOptional, IsEnum, IsArray, MinLength, MaxLength, IsDateString } from 'class-validator';
import { ProjectPriority } from './get-projects.dto';

export class CreateTaskDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  assignedTo: string;

  @IsOptional()
  @IsString()
  assignedToName?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsEnum(ProjectPriority)
  priority: ProjectPriority;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];
}
