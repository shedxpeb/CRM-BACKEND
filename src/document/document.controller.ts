import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('document')
@ApiBearerAuth()
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get()
  @RequirePermissions('document:list')
  @ApiOperation({ summary: 'Get all documents' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.documentService.getAll(
      organizationId,
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 25,
    );
  }

  @Get('dashboard')
  @RequirePermissions('document:list')
  @ApiOperation({ summary: 'Get document dashboard statistics' })
  async getDashboard(@CurrentUser('organizationId') organizationId: string) {
    const data = await this.documentService.getDashboard(organizationId);
    return { message: 'Document dashboard fetched successfully.', data };
  }
}
