import { Module } from '@nestjs/common';
import { PdfController } from './pdf.controller';
import { QuotationPdfController } from './quotation-pdf.controller';
import { HtmlPdfService } from './html-pdf.service';
import { QuotationPdfService } from './quotation-pdf.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PdfController, QuotationPdfController],
  providers: [HtmlPdfService, QuotationPdfService],
  exports: [HtmlPdfService, QuotationPdfService],
})
export class PdfModule {}
