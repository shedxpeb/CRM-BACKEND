import { IsOptional, IsString, IsNumber, IsEnum, IsBoolean, Min, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectDto } from './create-project.dto';
import { ProjectStage, ProjectPriority } from './get-projects.dto';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsEnum(ProjectStage)
  stage?: ProjectStage;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  progress?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  designProgress?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  procurementProgress?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  fabricationProgress?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  installationProgress?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  materialCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  procurementCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  fabricationCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  installationCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  profitMargin?: number;
}
