import { IsArray, IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PurchaseOrderStatus } from '@prisma/client';

export class BulkDeletePurchaseOrderDto {
  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

export class BulkStatusPurchaseOrderDto {
  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  ids: string[];

  @ApiProperty({ enum: PurchaseOrderStatus })
  @IsEnum(PurchaseOrderStatus)
  @IsNotEmpty()
  status: PurchaseOrderStatus;
}
