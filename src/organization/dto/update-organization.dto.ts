import { PartialType } from '@nestjs/mapped-types';
import { CreateOrganizationDto } from './create-organization.dto';
import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';

enum OrgStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Suspended = 'Suspended',
}

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {
  @IsOptional()
  @IsEnum(OrgStatus)
  status?: OrgStatus;

  @IsOptional()
  @IsNumber()
  maxUsers?: number;

  @IsOptional()
  @IsNumber()
  maxStorageGb?: number;

  @IsOptional()
  @IsString()
  subscriptionTier?: string;
}
