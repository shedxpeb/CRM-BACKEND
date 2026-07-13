import { IsString, IsUUID } from 'class-validator';

export class LeadIdDto {
  @IsString()
  @IsUUID()
  id: string;
}
