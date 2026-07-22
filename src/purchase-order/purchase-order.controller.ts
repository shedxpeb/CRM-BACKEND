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
  @ApiResponse({ status: 200, description: 'Purchase Orders fetched successfully.' })
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

  @Get('combobox')
  @RequirePermissions('purchase-order:list')
  @ApiOperation({ summary: 'Get purchase orders for combobox/dropdown' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getCombobox(@Query() query: any, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.purchaseOrderService.getCombobox(query, organizationId);
    return { message: 'Combobox data fetched.', data };
  }

  @Patch('bulk/status')
  @RequirePermissions('purchase-order:update')
  @ApiOperation({ summary: 'Bulk update purchase order status' })
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
  @ApiOperation({ summary: 'Bulk delete purchase orders' })
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
    const data = await this.purchaseOrderService.createWithRetry(
      dto,
      createdById,
      createdBy,
      organizationId,
    );
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
    const data = await this.purchaseOrderService.update(
      id,
      dto,
      updatedById,
      updatedBy,
      organizationId,
    );
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
    const data = await this.purchaseOrderService.approve(
      id,
      approvedById,
      approvedBy,
      organizationId,
    );
    return { message: 'Purchase Order approved successfully.', data };
  }

  @Patch(':id/reject')
  @RequirePermissions('purchase-order:approve')
  @ApiOperation({ summary: 'Reject purchase order' })
  async reject(
    @Param('id') id: string,
    @CurrentUser('id') rejectedById: string,
    @CurrentUser('name') rejectedBy: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body('reason') reason?: string,
  ) {
    const data = await this.purchaseOrderService.reject(
      id,
      rejectedById,
      rejectedBy,
      organizationId,
      reason,
    );
    return { message: 'Purchase Order rejected successfully.', data };
  }

  @Patch(':id/send')
  @RequirePermissions('purchase-order:update')
  @ApiOperation({ summary: 'Mark purchase order as sent to vendor' })
  async markSent(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.purchaseOrderService.markSent(id, userId, organizationId);
    return { message: 'Purchase Order marked as sent.', data };
  }

  @Patch(':id/receive')
  @RequirePermissions('purchase-order:update')
  @ApiOperation({ summary: 'Receive items for a purchase order' })
  async receiveItems(
    @Param('id') id: string,
    @Body() body: { items: { itemId: string; receivedQuantity: number }[] },
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.purchaseOrderService.receiveItems(
      id,
      body.items,
      userId,
      organizationId,
    );
    return { message: 'Items received successfully.', data };
  }

  @Patch(':id/restore')
  @RequirePermissions('purchase-order:update')
  @ApiOperation({ summary: 'Restore a deleted purchase order' })
  async restore(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.purchaseOrderService.restore(id, organizationId);
    return { message: 'Purchase Order restored.', data };
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
