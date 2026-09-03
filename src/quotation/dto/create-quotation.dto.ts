import { IsString, IsOptional, IsObject, IsDateString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuotationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  proposalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

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
  customerGST?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ifscCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  finalSignatureName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  finalSignatureMobile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  finalSignatureCompany?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pricingConfiguration?: any;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inquiryNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildingSpec?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  designCode?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  designLoad?: any;

  @ApiPropertyOptional()
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mezzanineLoad?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  craneDetail?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  roofAccessories?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wallAccessories?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  materialSpecs?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contractPriceRows?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  weightRows?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lineItems?: any;

  // Page 2: Prepared By snapshot
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preparedByCompany?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preparedByAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preparedByGstin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preparedByName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preparedByDesignation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preparedByMobile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preparedByEmail?: string;

  // Page 2: Document content
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  introduction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signaturePrefix?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signatureName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signatureDesignation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signatureMobile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signatureEmail?: string;
}
