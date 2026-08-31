import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsNumber,
  IsBoolean,
  ValidateNested,
  IsDateString,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuotationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  proposalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  proposalNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceEstimateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceEstimateNumber?: string;

  @ApiProperty()
  @IsString()
  customerId: string;

  @ApiProperty()
  @IsString()
  customerName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerPincode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerGST?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiProperty({ default: '' })
  @IsString()
  paymentTerms: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryTerms?: string;

  // Material selections (JSON array matching frontend MaterialSelection[])
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  materialSelections?: any[];

  // Scope configuration (JSON object matching frontend ScopeConfiguration)
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  scopeConfiguration?: Record<string, any>;

  // Technical specifications (JSON object matching frontend TechnicalSpecifications)
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  technicalSpecifications?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  inclusions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  exclusions?: string[];

  // Proposal configuration (JSON object matching frontend ProposalConfiguration)
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  proposalConfiguration?: Record<string, any>;

  // Timeline (JSON object matching frontend ProposalTimeline)
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  timeline?: Record<string, any>;

  // Pricing configuration (JSON object matching frontend PricingConfiguration)
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  pricingConfiguration?: Record<string, any>;

  // Calculated amounts
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  materialCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  labourCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  installationCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  transportationCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  craneCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  civilCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  accommodationCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  erectionCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  freightCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  otherCosts?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  discountPercentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gstType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  gstRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  grandTotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  amountInWords?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateId?: string;
}
