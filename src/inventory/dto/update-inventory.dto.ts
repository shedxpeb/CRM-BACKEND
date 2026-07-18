import { PartialType } from '@nestjs/swagger';
import { CreateInventoryItemDto } from './create-inventory.dto';

export class UpdateInventoryItemDto extends PartialType(CreateInventoryItemDto) {}
