import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateItemVariantDto {
  @IsString()
  itemMasterId: string;

  @IsString()
  variantName: string;

  @IsString()
  variantCode: string;

  @IsOptional()
  @IsString()
  specifications?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  standardWeight?: number;

  @IsOptional()
  dimensions?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  defaultRate?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  customFields?: Record<string, any>;
}

export class UpdateItemVariantDto {
  @IsOptional()
  @IsString()
  variantName?: string;

  @IsOptional()
  @IsString()
  variantCode?: string;

  @IsOptional()
  @IsString()
  specifications?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  standardWeight?: number;

  @IsOptional()
  dimensions?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  defaultRate?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  customFields?: Record<string, any>;
}
