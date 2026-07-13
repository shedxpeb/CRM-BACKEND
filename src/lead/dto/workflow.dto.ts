import { IsString, IsOptional, MinLength } from 'class-validator';

export class WorkflowDto {
  @IsString()
  @MinLength(1)
  stage: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
