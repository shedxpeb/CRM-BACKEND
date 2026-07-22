import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';

export enum VerifyAction {
  Verified = 'Verified',
  Rejected = 'Rejected',
}

export class VerifyTaskDto {
  @IsEnum(VerifyAction)
  status: VerifyAction;

  @IsOptional()
  @IsString()
  @MinLength(1)
  verificationNotes?: string;

  @IsOptional()
  @IsString()
  verifiedBy?: string;

  @IsOptional()
  @IsString()
  verifiedByName?: string;
}
