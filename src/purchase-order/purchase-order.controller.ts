import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PurchaseOrderService } from './purchase-order.service';
import { GetPurchaseOrdersDto } from './dto/get-purchase-orders.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { BulkDeletePurchaseOrderDto, BulkStatusPurchaseOrderDto } from './dto/bulk.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('purchase-order')
@ApiBearerAuth()
@Controller('purchase-order')
export class PurchaseOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  @Get()
  @RequirePermissions('purchase-order:list')
  @ApiOperation({ summary: 'Get all purchase orders with pagination, search, and filters' })
  async findAll(
    @Query() query: GetPurchaseOrdersDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.purchaseOrderService.findAll(query, organizationId);
    return { message: 'Purchase Orders fetched successfully.', data };
  }

  @Get('export')
  @RequirePermissions('purchase-order:list')
  @ApiOperation({ summary: 'Export purchase orders' })
  async export(
    @Query() query: GetPurchaseOrdersDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.purchaseOrderService.findAllForExport(query, organizationId);
    return { message: 'Export data fetched.', data };
  }

  @Get('stats')
  @RequirePermissions('purchase-order:list')
  @ApiOperation({ summary: 'Get purchase order statistics' })
  async getStats(@CurrentUser('organizationId') organizationId: string) {
    const data = await this.purchaseOrderService.getStats(organizationId);
    return { message: 'Stats fetched.', data };
  }

  @Patch('bulk/status')
  @RequirePermissions('purchase-order:update')
  async bulkStatusUpdate(
    @Body() body: BulkStatusPurchaseOrderDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.purchaseOrderService.bulkStatusUpdate(
      body.ids,
      body.status,
      organizationId,
    );
    return { message: 'Purchase Orders updated.', data };
  }

  @Delete('bulk')
  @RequirePermissions('purchase-order:delete')
  async bulkDelete(
    @Body() body: BulkDeletePurchaseOrderDto,
    @CurrentUser('id') deletedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.purchaseOrderService.bulkDelete(body.ids, deletedById, organizationId);
    return { message: 'Purchase Orders deleted.', data };
  }

  @Get(':id')
  @RequirePermissions('purchase-order:read')
  @ApiOperation({ summary: 'Get purchase order by ID' })
  async findById(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.purchaseOrderService.findById(id, organizationId);
    return { message: 'Purchase Order fetched.', data };
  }

  @Post()
  @RequirePermissions('purchase-order:create')
  @ApiOperation({ summary: 'Create a new purchase order' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser('id') createdById: string,
    @CurrentUser('name') createdBy: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.purchaseOrderService.create(dto, createdById, createdBy, organizationId);
    return { message: 'Purchase Order created successfully.', data };
  }

  @Patch(':id')
  @RequirePermissions('purchase-order:update')
  @ApiOperation({ summary: 'Update purchase order' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @CurrentUser('id') updatedById: string,
    @CurrentUser('name') updatedBy: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.purchaseOrderService.update(id, dto, updatedById, updatedBy, organizationId);
    return { message: 'Purchase Order updated successfully.', data };
  }

  @Patch(':id/approve')
  @RequirePermissions('purchase-order:approve')
  @ApiOperation({ summary: 'Approve purchase order' })
  async approve(
    @Param('id') id: string,
    @CurrentUser('id') approvedById: string,
    @CurrentUser('name') approvedBy: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.purchaseOrderService.approve(id, approvedById, approvedBy, organizationId);
    return { message: 'Purchase Order approved successfully.', data };
  }

  @Delete(':id')
  @RequirePermissions('purchase-order:delete')
  @ApiOperation({ summary: 'Delete purchase order' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') deletedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.purchaseOrderService.delete(id, deletedById, organizationId);
    return { message: 'Purchase Order deleted successfully.', data };
  }
}
