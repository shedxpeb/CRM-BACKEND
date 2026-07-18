import { IsArray, IsString } from 'class-validator';

export class BulkDeleteItemMasterDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

export class BulkStatusItemMasterDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];

  @IsString()
  status: string;
}
