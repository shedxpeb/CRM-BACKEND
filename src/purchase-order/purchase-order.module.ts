import { Module, forwardRef } from '@nestjs/common';
import { PurchaseOrderController } from './purchase-order.controller';
import { PurchaseOrderService } from './purchase-order.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { VendorModule } from '../vendor/vendor.module';
import { ItemMasterModule } from '../item-master/item-master.module';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => VendorModule), forwardRef(() => ItemMasterModule), forwardRef(() => ProjectModule)],
  controllers: [PurchaseOrderController],
  providers: [PurchaseOrderService],
  exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {
  static readonly moduleCapability = { capability: 'purchase-order' } as const;
}
