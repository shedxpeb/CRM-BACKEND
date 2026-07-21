import { Module } from '@nestjs/common';
import { PdfController } from './pdf.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PdfController],
})
export class PdfModule {}
