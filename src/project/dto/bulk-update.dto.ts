import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateProjectDto } from './update-project.dto';

export class BulkUpdateDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];

  @ValidateNested()
  @Type(() => UpdateProjectDto)
  data: UpdateProjectDto;
}
