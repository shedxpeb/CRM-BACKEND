import { IsArray, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  status: string;
}
