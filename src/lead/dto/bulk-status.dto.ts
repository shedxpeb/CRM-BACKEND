import { IsArray, IsEnum, IsString } from 'class-validator';
import { LeadStatus } from './get-leads.dto';

export class BulkStatusDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];

  @IsEnum(LeadStatus)
  status: LeadStatus;
}
