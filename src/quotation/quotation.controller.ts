import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  StreamableFile,
  Header,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProduces } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QuotationService } from './quotation.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';

const PDF_THROTTLE = { default: { limit: 30, ttl: 60_000 } };

@ApiTags('quotations')
@ApiBearerAuth()
@Controller('quotations')
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions('document:list')
  @ApiOperation({ summary: 'List quotations' })
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('search') search?: string,
    @CurrentUser('organizationId') organizationId?: string,
  ) {
    const data = await this.quotationService.findAll(
      organizationId!,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 25,
      { status, customerId, search },
    );
    return { message: 'Quotations fetched successfully.', data };
  }

  @Get(':id')
  @RequirePermissions('document:read')
  @ApiOperation({ summary: 'Get quotation by ID' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.quotationService.findById(id, organizationId);
    return { message: 'Quotation fetched.', data };
  }

  @Post()
  @RequirePermissions('document:create')
  @ApiOperation({ summary: 'Create a new quotation' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateQuotationDto,
    @CurrentUser('id') createdById: string,
    @CurrentUser('name') createdBy: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.quotationService.create(dto, createdById, createdBy, organizationId);
    return { message: 'Quotation created successfully.', data };
  }

  @Patch(':id')
  @RequirePermissions('document:update')
  @ApiOperation({ summary: 'Update quotation' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuotationDto,
    @CurrentUser('id') updatedById: string,
    @CurrentUser('name') updatedBy: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.quotationService.update(id, dto, updatedById, updatedBy, organizationId);
    return { message: 'Quotation updated successfully.', data };
  }

  @Patch(':id/status')
  @RequirePermissions('document:update')
  @ApiOperation({ summary: 'Update quotation status' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.quotationService.updateStatus(id, status, userId, organizationId);
    return { message: 'Status updated.', data };
  }

  @Patch(':id/convert-to-project')
  @RequirePermissions('document:update')
  @ApiOperation({ summary: 'Convert quotation to project' })
  async convertToProject(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.quotationService.convertToProject(id, organizationId);
    return { message: 'Quotation converted to project.', data };
  }

  @Delete(':id')
  @RequirePermissions('document:delete')
  @ApiOperation({ summary: 'Delete quotation' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') deletedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.quotationService.delete(id, deletedById, organizationId);
    return { message: 'Quotation deleted successfully.', data };
  }

  // ─── PDF Generation ──────────────────────────────────────────────────────

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
    const pdfBuffer = await this.quotationService.generatePdf(id, organizationId);

    // Safe filename from quotation number
    const quotation = await this.quotationService.findById(id, organizationId);
    const filename = `${(quotation.quotationNumber || 'quotation').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;

    return new StreamableFile(Buffer.from(pdfBuffer), {
      type: 'application/pdf',
      disposition: `inline; filename="${filename}"`,
    });
  }
}
