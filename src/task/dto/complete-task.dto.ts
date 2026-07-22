import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  IsObject,
  ValidateNested,
  MinLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CompletionProofDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  beforeImages?: string[];

  @IsArray()
  @IsString({ each: true })
  afterImages: string[];

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CompleteTaskDto {
  @IsObject()
  @ValidateNested()
  @Type(() => CompletionProofDto)
  completionProof: CompletionProofDto;

  @IsString()
  @MinLength(1)
  completionNotes: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  timeSpent?: number;

  @IsOptional()
  @IsArray()
  @IsOptional()
  completionChecklist?: { text: string; completed: boolean; order: number }[];
}
