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
      `[PDF] Generation requested for quotation ${id} by user ${userId} in org ${organizationId}`,
    );

    // 1. Fetch quotation data (with organization validation)
    let quotationData;
    try {
      quotationData = await this.quotationPdfService.fetchQuotation(id, organizationId);
      this.logger.log(`[PDF] Quotation data fetched successfully for ${id}, quotationNumber: ${quotationData.quotationNumber}`);
    } catch (error) {
      this.logger.error(`[PDF] Failed to fetch quotation ${id}: ${error.message}`);
      this.logger.error(`[PDF] Error stack: ${error.stack}`);
      throw error;
    }

    // 2. Resolve organization branding
    this.logger.log(`[PDF] Resolving branding for org ${organizationId}`);
    const branding = await this.quotationPdfService.resolveBranding(organizationId);
    this.logger.log(`[PDF] Branding resolved: ${branding.companyName}`);

    // 3. Map to PDF view model
    this.logger.log(`[PDF] Mapping to view model`);
    const viewModel = this.quotationPdfService.mapToViewModel(quotationData, branding);
    this.logger.log(`[PDF] View model created, quotationNumber: ${viewModel.meta.quotationNumber}`);

    // 4. Generate PDF
    this.logger.log(`[PDF] Generating PDF from view model`);
    let pdfBuffer;
    try {
      pdfBuffer = await this.quotationPdfService.generatePdf(viewModel);
      this.logger.log(`[PDF] PDF buffer generated, size: ${pdfBuffer.length} bytes`);
    } catch (error) {
      this.logger.error(`[PDF] PDF generation failed: ${error.message}`);
      this.logger.error(`[PDF] Error stack: ${error.stack}`);
      throw error;
    }

    // Validate PDF buffer
    if (!pdfBuffer || pdfBuffer.length === 0) {
      this.logger.error(`[PDF] PDF buffer is empty or null`);
      throw new Error('PDF generation failed: empty buffer');
    }

    if (pdfBuffer.length < 100) {
      this.logger.error(`[PDF] PDF buffer too small: ${pdfBuffer.length} bytes`);
      this.logger.error(`[PDF] Buffer content: ${pdfBuffer.toString('utf-8')}`);
      throw new Error(`PDF generation failed: invalid size (${pdfBuffer.length} bytes)`);
    }

    // Check PDF magic bytes
    const header = pdfBuffer.subarray(0, 4).toString('utf-8');
    if (header !== '%PDF') {
      this.logger.error(`[PDF] Invalid PDF header: ${header}`);
      this.logger.error(`[PDF] First 100 bytes: ${pdfBuffer.subarray(0, 100).toString('utf-8')}`);
      throw new Error('PDF generation failed: invalid PDF format');
    }

    // 5. Return as streamable response (no file written to disk)
    const filename = `${viewModel.meta.quotationNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;

    this.logger.log(`[PDF] PDF generated successfully: ${filename} (${pdfBuffer.length} bytes)`);

    return new StreamableFile(Buffer.from(pdfBuffer), {
      type: 'application/pdf',
      disposition: `inline; filename="${filename}"`,
    });
  }

  // Temporary development endpoint to reload templates
  @Get('reload-templates')
  @ApiOperation({ summary: 'Reload PDF templates (development only)' })
  async reloadTemplates() {
    this.logger.log('[DEV] Template reload requested');
    this.quotationPdfService.reloadTemplates();
    return { success: true, message: 'Templates reloaded' };
  }
}
