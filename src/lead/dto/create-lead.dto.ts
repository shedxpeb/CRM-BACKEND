import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsNumber,
  MinLength,
  MaxLength,
  Matches,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  LeadStatus,
  LeadPriority,
  LeadSource,
  ProjectType,
  StructureType,
  RoofType,
  WallType,
  MaterialPreference,
  Industry,
  BusinessType,
} from './get-leads.dto';

export class CreateLeadDto {
  // Customer Details
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  customerName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  companyName: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  designation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(15)
  @Matches(/^[0-9]+$/, { message: 'Mobile must contain only numbers' })
  mobile: string;

  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  alternateMobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  gstNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  panNumber?: string;

  @IsOptional()
  @IsEnum(Industry)
  industry?: Industry;

  @IsOptional()
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  // Address
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  area?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  pincode?: string;

  // Company Info
  @IsOptional()
  @IsString()
  @MaxLength(50)
  companySize?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  annualRevenue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  employeeCount?: number;

  // Social Links
  @IsOptional()
  @IsString()
  @MaxLength(200)
  linkedin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  facebook?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  instagram?: string;

  // Media
  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsString()
  companyLogo?: string;

  // Tags
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // Project Details
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  projectTitle: string;

  @IsEnum(ProjectType)
  projectType: ProjectType;

  // Structure Details
  @IsEnum(StructureType)
  structureType: StructureType;

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

  @IsOptional()
  @IsEnum(RoofType)
  roofType?: RoofType;

  @IsOptional()
  @IsBoolean()
  craneRequired?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  craneCapacity?: number;

  @IsOptional()
  @IsBoolean()
  mezzanine?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  mezzanineArea?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  mezzanineLoad?: number;

  @IsOptional()
  @IsEnum(WallType)
  wallType?: WallType;

  @IsOptional()
  @IsBoolean()
  insulationRequired?: boolean;

  @IsOptional()
  @IsString()
  insulationType?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  insulationThickness?: number;

  @IsOptional()
  @IsEnum(MaterialPreference)
  materialPreference?: MaterialPreference;

  // Site Details
  @IsOptional()
  @IsString()
  siteLocation?: string;

  @IsOptional()
  @IsString()
  siteAddress?: string;

  @IsOptional()
  @IsString()
  mapCoordinates?: string;

  @IsOptional()
  @IsString()
  soilNotes?: string;

  // Business Details
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @IsOptional()
  @IsString()
  specialRequirement?: string;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsEnum(LeadPriority)
  priority: LeadPriority;

  @IsEnum(LeadSource)
  source: LeadSource;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  score?: number;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;

  @IsOptional()
  customFields?: Record<string, any>;
}
