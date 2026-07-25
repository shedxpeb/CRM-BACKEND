import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class TransferOptionsDto {
  @IsOptional() @IsBoolean() standard?: boolean;
  @IsOptional() @IsBoolean() contact?: boolean;
  @IsOptional() @IsBoolean() company?: boolean;
  @IsOptional() @IsBoolean() address?: boolean;
  @IsOptional() @IsBoolean() notes?: boolean;
  @IsOptional() @IsBoolean() comments?: boolean;
  @IsOptional() @IsBoolean() activities?: boolean;
  @IsOptional() @IsBoolean() timeline?: boolean;
  @IsOptional() @IsBoolean() attachments?: boolean;
  @IsOptional() @IsBoolean() documents?: boolean;
  @IsOptional() @IsBoolean() followups?: boolean;
  @IsOptional() @IsBoolean() customFields?: boolean;
  @IsOptional() @IsBoolean() tags?: boolean;
}

export class ConvertLeadDto {
  @IsString()
  leadId: string;

  @IsString()
  customerName: string;

  @IsString()
  companyName: string;

  @IsString()
  mobile: string;

  @IsOptional() @IsString() alternateMobile?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() gstNumber?: string;
  @IsOptional() @IsString() panNumber?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() pincode?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() businessType?: string;
  @IsOptional() @IsString() website?: string;

  @IsString()
  source: string;

  @IsOptional() @IsString() assignedEmployeeId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() status?: string;

  @IsOptional()
  @IsObject()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customFields?: Record<string, any>;

  @IsOptional()
  @IsArray()
  attachments?: string[];

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsObject()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conversionContext?: Record<string, any>;

  @IsOptional()
  @ValidateNested()
  @Type(() => TransferOptionsDto)
  transferOptions?: TransferOptionsDto;

  @IsOptional()
  @IsString()
  profileId?: string;
}
