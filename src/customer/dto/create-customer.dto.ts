import { IsString, IsEmail, IsOptional, IsEnum, MinLength, MaxLength, Matches, ValidateIf } from 'class-validator';
import { CustomerStatus } from './get-customers.dto';

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

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

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
  @IsString()
  @MaxLength(50)
  businessType?: string;

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
  @IsString()
  @MaxLength(10)
  pincode?: string;

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

  @IsOptional()
  customFields?: Record<string, any>;
}
