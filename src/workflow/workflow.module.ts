import { Module } from '@nestjs/common';
import { WorkflowEngineService } from './workflow-engine.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [WorkflowEngineService],
  exports: [WorkflowEngineService],
})
export class WorkflowModule {}
