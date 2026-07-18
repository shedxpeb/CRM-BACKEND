import { Module, forwardRef } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => WorkflowModule)],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {
  static readonly moduleCapability = { capability: 'inventory' } as const;
}
