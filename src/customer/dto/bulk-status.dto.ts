import { IsArray, IsEnum, IsString } from 'class-validator';
import { CustomerStatus } from './get-customers.dto';

export class BulkStatusDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];

  @IsEnum(CustomerStatus)
  status: CustomerStatus;
}
