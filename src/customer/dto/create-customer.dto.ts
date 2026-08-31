import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  Matches,
  ValidateIf,
  IsNumber,
} from 'class-validator';
import { CustomerStatus } from './get-customers.dto';
import { BusinessType } from '../../lead/dto/get-leads.dto';

export class CreateCustomerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  customerName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  companyName: string;

  @IsString()
  @MinLength(10)
  @MaxLength(15)
  @Matches(/^[0-9+\-\s()]+$/, { message: 'Invalid mobile format' })
  mobile: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  alternateMobile?: string;

  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  gstNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  panNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  industry?: string;

  @IsOptional()
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  address: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  city: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  state: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  country?: string;

  @IsOptional()
  @ValidateIf((obj) => obj.pincode !== null && obj.pincode !== undefined)
  @IsString()
  @MaxLength(10)
  pincode?: string | null;

  @IsOptional()
  @IsString()
  assignedEmployeeId?: string;

  @IsString()
  source: string;

  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  projectTitle: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  projectType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  projectCode?: string;

  @IsOptional()
  @ValidateIf((obj) => obj.accountTier !== null && obj.accountTier !== undefined)
  @IsString()
  @MaxLength(50)
  accountTier?: string | null;

  @IsOptional()
  @ValidateIf((obj) => obj.creditLimit !== null && obj.creditLimit !== undefined)
  creditLimit?: number | null;

  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customFields?: Record<string, any>;
}
