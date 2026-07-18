import { Module, forwardRef } from '@nestjs/common';
import { ItemMasterController } from './item-master.controller';
import { ItemMasterService } from './item-master.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => WorkflowModule)],
  controllers: [ItemMasterController],
  providers: [ItemMasterService],
  exports: [ItemMasterService],
})
export class ItemMasterModule {
  static readonly moduleCapability = { capability: 'item-master' } as const;
}
