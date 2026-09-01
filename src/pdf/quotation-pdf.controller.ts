import { Controller, Get, Param, Logger, StreamableFile, Header } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProduces } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QuotationPdfService } from './quotation-pdf.service';

/** PDF generation is CPU/memory-intensive (Playwright Chromium). Stricter throttle. */
const PDF_THROTTLE = { default: { limit: 30, ttl: 60_000 } };

@ApiTags('quotation-pdf')
@ApiBearerAuth()
@Controller('quotations')
export class QuotationPdfController {
  private readonly logger = new Logger(QuotationPdfController.name);

  constructor(private readonly quotationPdfService: QuotationPdfService) {}

  @Throttle(PDF_THROTTLE)
  @Get(':id/pdf')
  @RequirePermissions('document:read')
  @ApiOperation({ summary: 'Generate and stream Quotation PDF' })
  @ApiProduces('application/pdf')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async generatePdf(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
  ): Promise<StreamableFile> {
    this.logger.log(
      `PDF generation requested for quotation ${id} by user ${userId} in org ${organizationId}`,
    );

    // 1. Fetch quotation data (with organization validation)
    const quotationData = await this.quotationPdfService.fetchQuotation(id, organizationId);

    // 2. Resolve organization branding
    const branding = await this.quotationPdfService.resolveBranding(organizationId);

    // 3. Map to PDF view model
    const viewModel = this.quotationPdfService.mapToViewModel(quotationData, branding);

    // 4. Generate PDF
    const pdfBuffer = await this.quotationPdfService.generatePdf(viewModel);

    // 5. Return as streamable response (no file written to disk)
    const filename = `${viewModel.meta.quotationNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;

    this.logger.log(`PDF generated successfully: ${filename} (${pdfBuffer.length} bytes)`);

    return new StreamableFile(Buffer.from(pdfBuffer), {
      type: 'application/pdf',
      disposition: `inline; filename="${filename}"`,
    });
  }
}
