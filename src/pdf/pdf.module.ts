import { Module } from '@nestjs/common';
import { PdfController } from './pdf.controller';
import { HtmlPdfService } from './html-pdf.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PdfController],
  providers: [HtmlPdfService],
})
export class PdfModule {}
