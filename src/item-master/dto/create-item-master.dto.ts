import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateItemMasterDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  itemCode?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  itemName: string;

  @IsString()
  @MinLength(1)
  category: string;

  @IsOptional()
  @IsString()
  subCategory?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  subcategoryId?: string;

  @IsOptional()
  @IsString()
  itemTypeId?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsString()
  specification?: string;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @IsString()
  unit: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  defaultRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  gstRate?: number;

  @IsOptional()
  @IsString()
  taxType?: string;

  @IsOptional()
  @IsString()
  technicalDescription?: string;

  @IsOptional()
  @IsString()
  datasheetUrl?: string;

  @IsOptional()
  @IsString()
  productImageUrl?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  countryOfOrigin?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  standardDimensions?: Record<string, any>;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  preferredSupplierId?: string;

  @IsOptional()
  @IsString()
  preferredSupplier?: string;

  @IsOptional()
  @IsString()
  inventoryItemId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  itemTypeClass?: string;

  @IsOptional()
  @IsString()
  materialGrade?: string;

  @IsOptional()
  @IsBoolean()
  isStructural?: boolean;

  @IsOptional()
  @IsBoolean()
  isCladding?: boolean;

  @IsOptional()
  @IsBoolean()
  isAccessory?: boolean;

  @IsOptional()
  @IsBoolean()
  isService?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  thickness?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  length?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  width?: number;

  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customFields?: Record<string, any>;
}
