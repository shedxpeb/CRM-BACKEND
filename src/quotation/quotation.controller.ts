import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { QuotationService } from './quotation.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('quotations')
@ApiBearerAuth()
@Controller('quotations')
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @Get()
  @RequirePermissions('document:list')
  @ApiOperation({ summary: 'Get all quotations with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Quotations fetched successfully.' })
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('search') search?: string,
    @CurrentUser('organizationId') organizationId?: string,
  ) {
    const data = await this.quotationService.findAll(
      {
        page: page ? parseInt(page, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
        status,
        customerId,
        search,
      },
      organizationId!,
    );
    return { message: 'Quotations fetched successfully.', data };
  }

  @Get(':id')
  @RequirePermissions('document:read')
  @ApiOperation({ summary: 'Get quotation by ID' })
  @ApiResponse({ status: 200, description: 'Quotation fetched.' })
  async findById(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.quotationService.findById(id, organizationId);
    return { message: 'Quotation fetched.', data };
  }

  @Post()
  @RequirePermissions('document:create')
  @ApiOperation({ summary: 'Create a new quotation' })
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: 201, description: 'Quotation created successfully.' })
  async create(
    @Body() dto: CreateQuotationDto,
    @CurrentUser('id') createdById: string,
    @CurrentUser('name') createdBy: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.quotationService.create(dto, organizationId, createdById, createdBy);
    return { message: 'Quotation created successfully.', data };
  }

  @Patch(':id')
  @RequirePermissions('document:update')
  @ApiOperation({ summary: 'Update quotation' })
  @ApiResponse({ status: 200, description: 'Quotation updated successfully.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuotationDto,
    @CurrentUser('id') updatedById: string,
    @CurrentUser('name') updatedBy: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.quotationService.update(
      id,
      dto,
      organizationId,
      updatedById,
      updatedBy,
    );
    return { message: 'Quotation updated successfully.', data };
  }

  @Patch(':id/status')
  @RequirePermissions('document:update')
  @ApiOperation({ summary: 'Update quotation status' })
  @ApiResponse({ status: 200, description: 'Status updated.' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.quotationService.updateStatus(id, status, organizationId);
    return { message: 'Status updated.', data };
  }

  @Patch(':id/convert-to-project')
  @RequirePermissions('document:update')
  @ApiOperation({ summary: 'Convert quotation to project' })
  @ApiResponse({ status: 200, description: 'Quotation converted.' })
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
  @ApiResponse({ status: 200, description: 'Quotation deleted.' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') deletedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.quotationService.delete(id, organizationId, deletedById);
    return { message: 'Quotation deleted successfully.', data };
  }
}
