import { Module, forwardRef } from '@nestjs/common';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ExcelImportService } from '../common/services/excel-import.service';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => WorkflowModule)],
  controllers: [LeadController],
  providers: [LeadService, ExcelImportService],
  exports: [LeadService],
})
export class LeadModule {}
