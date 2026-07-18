import { IsArray, IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkDeleteInventoryDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

export class BulkStatusInventoryDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];

  @IsString()
  status: string;
}

export class CreateWarehouseDto {
  @IsString()
  warehouseCode: string;

  @IsString()
  name: string;

  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  manager?: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  capacity?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSupplierDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsString()
  mobile: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsBoolean()
  gstRegistered?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  rating?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateStockMovementDto {
  @IsString()
  itemId: string;

  @IsString()
  itemName: string;

  @IsString()
  type: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantity: number;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  warehouse?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  performedBy?: string;
}

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
