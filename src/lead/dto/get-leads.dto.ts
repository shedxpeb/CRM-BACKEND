import {
  IsOptional,
  IsInt,
  IsString,
  IsEnum,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

// Enums matching Prisma schema (source of truth)
export enum LeadStatus {
  New = 'New',
  Contacted = 'Contacted',
  DesignPending = 'DesignPending',
  BOQPending = 'BOQPending',
  EstimateSent = 'EstimateSent',
  ProposalSent = 'ProposalSent',
  Negotiation = 'Negotiation',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Converted = 'Converted',
}

export enum LeadPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Urgent = 'Urgent',
}

export enum LeadSource {
  Website = 'Website',
  Referral = 'Referral',
  ColdCall = 'ColdCall',
  Email = 'Email',
  SocialMedia = 'SocialMedia',
  TradeShow = 'TradeShow',
  Advertisement = 'Advertisement',
  Other = 'Other',
}

export enum ProjectType {
  Factory = 'Factory',
  Warehouse = 'Warehouse',
  IndustrialShed = 'IndustrialShed',
  Commercial = 'Commercial',
  Residential = 'Residential',
  ColdStorage = 'ColdStorage',
  Other = 'Other',
}

export enum StructureType {
  PEB = 'PEB',
  SteelStructure = 'SteelStructure',
  Hybrid = 'Hybrid',
  Other = 'Other',
}

export enum RoofType {
  MetalSheet = 'MetalSheet',
  DeckSheet = 'DeckSheet',
  SandwichPanel = 'SandwichPanel',
  Other = 'Other',
}

export enum WallType {
  MetalSheet = 'MetalSheet',
  BrickWall = 'BrickWall',
  SandwichPanel = 'SandwichPanel',
  Other = 'Other',
}

export enum MaterialPreference {
  Standard = 'Standard',
  Premium = 'Premium',
  Economy = 'Economy',
}

export enum Industry {
  Construction = 'Construction',
  Manufacturing = 'Manufacturing',
  Technology = 'Technology',
  Healthcare = 'Healthcare',
  Hospitality = 'Hospitality',
  Retail = 'Retail',
  Education = 'Education',
  Finance = 'Finance',
  RealEstate = 'RealEstate',
  Infrastructure = 'Infrastructure',
  Energy = 'Energy',
  Mining = 'Mining',
  Agriculture = 'Agriculture',
  Transportation = 'Transportation',
  Logistics = 'Logistics',
  Commercial = 'Commercial',
  Other = 'Other',
}

export enum BusinessType {
  SoleProprietorship = 'SoleProprietorship',
  Partnership = 'Partnership',
  PrivateLimited = 'PrivateLimited',
  PublicLimited = 'PublicLimited',
  LLP = 'LLP',
  Government = 'Government',
  NonProfit = 'NonProfit',
  Other = 'Other',
}

export class GetLeadsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  pageSize?: number = 25;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  @IsIn(['in-progress'])
  statusMode?: string;

  @IsOptional()
  @IsEnum(LeadPriority)
  priority?: LeadPriority;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsEnum(ProjectType)
  projectType?: ProjectType;

  @IsOptional()
  @IsEnum(StructureType)
  structureType?: StructureType;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(Industry)
  industry?: Industry;

  @IsOptional()
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  @IsOptional()
  @IsString()
  assignedEmployeeId?: string;

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
