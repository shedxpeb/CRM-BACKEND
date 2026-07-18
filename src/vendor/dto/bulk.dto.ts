import { IsArray, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkDeleteVendorDto {
  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

export class BulkStatusVendorDto {
  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  ids: string[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  status: string;
}
