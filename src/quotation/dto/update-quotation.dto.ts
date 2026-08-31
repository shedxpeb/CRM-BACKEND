import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsNumber,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateQuotationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  validUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryTerms?: string;

  // Material selections
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  materialSelections?: any[];

  // Scope configuration
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  scopeConfiguration?: Record<string, any>;

  // Technical specifications
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

  // Proposal configuration
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  proposalConfiguration?: Record<string, any>;

  // Timeline
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  timeline?: Record<string, any>;

  // Pricing configuration
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
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateId?: string;
}
