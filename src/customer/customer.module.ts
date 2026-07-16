import { Module, forwardRef } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { AuthModule } from '../auth/auth.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [AuthModule, forwardRef(() => WorkflowModule)],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService],
})
export class CustomerModule {
  static readonly moduleCapability = { capability: 'customer' } as const;
}
