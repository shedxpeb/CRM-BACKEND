import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  MinLength,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SalaryAdjustmentTypeEnum {
  Credit = 'Credit',
  Deduction = 'Deduction',
  Advance = 'Advance',
  Bonus = 'Bonus',
  Penalty = 'Penalty',
}

export enum SalaryAdjustmentStatusEnum {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Processed = 'Processed',
}

export class CreateSalaryAdjustmentDto {
  @IsString()
  employeeId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  employeeName: string;

  @IsEnum(SalaryAdjustmentTypeEnum)
  type: SalaryAdjustmentTypeEnum;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  referenceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateSalaryAdjustmentDto {
  @IsOptional()
  @IsEnum(SalaryAdjustmentTypeEnum)
  type?: SalaryAdjustmentTypeEnum;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsEnum(SalaryAdjustmentStatusEnum)
  status?: SalaryAdjustmentStatusEnum;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ApproveSalaryAdjustmentDto {
  @IsString()
  approvedBy: string;

  @IsString()
  approvedByName: string;
}

export class ProcessSalaryAdjustmentDto {
  @IsString()
  processedBy: string;
}

export class GetSalaryAdjustmentsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10000)
  pageSize?: number = 25;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsEnum(SalaryAdjustmentTypeEnum)
  type?: SalaryAdjustmentTypeEnum;

  @IsOptional()
  @IsEnum(SalaryAdjustmentStatusEnum)
  status?: SalaryAdjustmentStatusEnum;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
