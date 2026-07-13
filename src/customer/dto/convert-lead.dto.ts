import { IsString, IsOptional, IsEnum } from 'class-validator';

export class ConvertLeadDto {
  @IsString()
  leadId: string;

  @IsString()
  customerName: string;

  @IsString()
  companyName: string;

  @IsString()
  mobile: string;

  @IsOptional()
  @IsString()
  alternateMobile?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  businessType?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsString()
  source: string;

  @IsOptional()
  @IsString()
  assignedEmployeeId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
