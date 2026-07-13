import { IsString, IsEmail, IsOptional, IsEnum, IsBoolean, IsDateString, MinLength, MaxLength, Matches } from 'class-validator';
import { LeadStatus, LeadPriority, LeadSource, ProjectType, StructureType } from './get-leads.dto';
import { PartialType } from '@nestjs/mapped-types';
import { CreateLeadDto } from './create-lead.dto';

export class UpdateLeadDto extends PartialType(CreateLeadDto) {
  // All fields are optional for partial update
  // Inherits all validation from CreateLeadDto but makes them optional
}
