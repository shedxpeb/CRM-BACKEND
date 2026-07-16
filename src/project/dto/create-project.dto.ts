import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, MinLength, MaxLength, Min, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectPriority } from './get-projects.dto';

class CreateMilestoneDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsDateString()
  plannedDate?: string;

  @IsOptional()
  @IsDateString()
  actualDate?: string;
}

class CreateTeamMemberDto {
  @IsString()
  employeeId: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  role: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  workload?: number;
}

export class CreateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  projectCode?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  projectName: string;

  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsString()
  projectType: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  value?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  budget?: number;

  @IsString()
  @MinLength(3)
  location: string;

  @IsString()
  @MinLength(2)
  city: string;

  @IsString()
  @MinLength(2)
  state: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsEnum(ProjectPriority)
  priority: ProjectPriority;

  @IsString()
  projectManagerId: string;

  @IsOptional()
  @IsString()
  projectManager?: string;

  @IsString()
  structureType: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  width?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  length?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  height?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  baySpacing?: number;

  @IsString()
  roofType: string;

  @IsString()
  craneSystem: string;

  @IsOptional()
  @IsBoolean()
  mezzanine?: boolean;

  @IsString()
  wallType: string;

  @IsOptional()
  @IsBoolean()
  insulation?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  coveredArea?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalWeight?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMilestoneDto)
  milestones?: CreateMilestoneDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTeamMemberDto)
  team?: CreateTeamMemberDto[];

  @IsOptional()
  customFields?: Record<string, any>;
}
