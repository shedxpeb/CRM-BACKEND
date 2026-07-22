import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customFields?: Record<string, any>;
}
