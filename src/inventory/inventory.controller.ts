import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { GetInventoryDto } from './dto/get-inventory.dto';
import { CreateInventoryItemDto } from './dto/create-inventory.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory.dto';
import {
  BulkDeleteInventoryDto,
  BulkStatusInventoryDto,
  CreateWarehouseDto,
  CreateSupplierDto,
  CreateStockMovementDto,
  CreateCategoryDto,
} from './dto/bulk.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequirePermissions('inventory:list')
  @ApiOperation({ summary: 'Get all inventory items' })
  async findAll(
    @Query() query: GetInventoryDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.inventoryService.findAll(query, organizationId);
    return { message: 'Inventory fetched.', data };
  }

  @Get('export')
  @RequirePermissions('inventory:list')
  async export(
    @Query() query: GetInventoryDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.inventoryService.findAllForExport(query, organizationId);
    return { message: 'Export data fetched.', data };
  }

  @Get('stats')
  @RequirePermissions('inventory:list')
  @ApiOperation({ summary: 'Get inventory statistics' })
  async getStats(@CurrentUser('organizationId') organizationId: string) {
    const data = await this.inventoryService.getStats(organizationId);
    return { message: 'Stats fetched.', data };
  }

  @Get('alerts')
  @RequirePermissions('inventory:list')
  @ApiOperation({ summary: 'Get low stock alerts' })
  async getAlerts(@CurrentUser('organizationId') organizationId: string) {
    const data = await this.inventoryService.getAlerts(organizationId);
    return { message: 'Alerts fetched.', data };
  }

  @Patch('bulk/status')
  @RequirePermissions('inventory:update')
  async bulkStatusUpdate(
    @Body() body: BulkStatusInventoryDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.inventoryService.bulkStatusUpdate(
      body.ids,
      body.status,
      organizationId,
    );
    return { message: 'Items updated.', data };
  }

  @Delete('bulk')
  @RequirePermissions('inventory:delete')
  async bulkDelete(
    @Body() body: BulkDeleteInventoryDto,
    @CurrentUser('id') deletedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.inventoryService.bulkDelete(body.ids, deletedById, organizationId);
    return { message: 'Items deleted.', data };
  }

  // ─── WAREHOUSES ──────────────────────────────────────

  @Get('warehouses')
  @RequirePermissions('inventory:list')
  async getWarehouses(@CurrentUser('organizationId') organizationId: string) {
    const data = await this.inventoryService.getWarehouses(organizationId);
    return { message: 'Warehouses fetched.', data };
  }

  @Post('warehouses')
  @RequirePermissions('inventory:create')
  async createWarehouse(
    @Body() dto: CreateWarehouseDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.inventoryService.createWarehouse(dto, organizationId);
    return { message: 'Warehouse created.', data };
  }

  @Patch('warehouses/:id')
  @RequirePermissions('inventory:update')
  async updateWarehouse(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.inventoryService.updateWarehouse(id, dto, organizationId);
    return { message: 'Warehouse updated.', data };
  }

  @Delete('warehouses/:id')
  @RequirePermissions('inventory:delete')
  async deleteWarehouse(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.inventoryService.deleteWarehouse(id, organizationId);
    return { message: 'Warehouse deleted.', data };
  }

  // ─── SUPPLIERS ──────────────────────────────────────

  @Get('suppliers')
  @RequirePermissions('inventory:list')
  async getSuppliers(@CurrentUser('organizationId') organizationId: string) {
    const data = await this.inventoryService.getSuppliers(organizationId);
    return { message: 'Suppliers fetched.', data };
  }

  @Post('suppliers')
  @RequirePermissions('inventory:create')
  async createSupplier(
    @Body() dto: CreateSupplierDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.inventoryService.createSupplier(dto, organizationId);
    return { message: 'Supplier created.', data };
  }

  @Patch('suppliers/:id')
  @RequirePermissions('inventory:update')
  async updateSupplier(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.inventoryService.updateSupplier(id, dto, organizationId);
    return { message: 'Supplier updated.', data };
  }

  @Delete('suppliers/:id')
  @RequirePermissions('inventory:delete')
  async deleteSupplier(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.inventoryService.deleteSupplier(id, organizationId);
    return { message: 'Supplier deleted.', data };
  }

  // ─── CATEGORIES ──────────────────────────────────────

  @Get('categories')
  @RequirePermissions('inventory:list')
  async getCategories(@CurrentUser('organizationId') organizationId: string) {
    const data = await this.inventoryService.getCategories(organizationId);
    return { message: 'Categories fetched.', data };
  }

  @Post('categories')
  @RequirePermissions('inventory:create')
  async createCategory(
    @Body() dto: CreateCategoryDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.inventoryService.createCategory(dto, organizationId);
    return { message: 'Category created.', data };
  }

  // ─── STOCK MOVEMENTS ─────────────────────────────────

  @Get('movements')
  @RequirePermissions('inventory:list')
  @ApiOperation({ summary: 'Get stock movements' })
  async getMovements(@Query() query: any, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.inventoryService.getMovements(organizationId, query);
    return { message: 'Movements fetched.', data };
  }

  @Post('movements')
  @RequirePermissions('inventory:update')
  @ApiOperation({ summary: 'Create stock movement' })
  async createMovement(
    @Body() dto: CreateStockMovementDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.inventoryService.createMovement(dto, organizationId, userId);
    return { message: 'Movement created.', data };
  }

  // ─── CRUD ────────────────────────────────────────────

  @Get(':id')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get inventory item by ID' })
  async findById(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.inventoryService.findById(id, organizationId);
    return { message: 'Item fetched.', data };
  }

  @Post()
  @RequirePermissions('inventory:create')
  @ApiOperation({ summary: 'Create inventory item' })
  async create(
    @Body() dto: CreateInventoryItemDto,
    @CurrentUser('id') createdById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.inventoryService.create(dto, createdById, organizationId);
    return { message: 'Item created.', data };
  }

  @Patch(':id')
  @RequirePermissions('inventory:update')
  @ApiOperation({ summary: 'Update inventory item' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
    @CurrentUser('id') updatedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.inventoryService.update(id, dto, updatedById, organizationId);
    return { message: 'Item updated.', data };
  }

  @Delete(':id')
  @RequirePermissions('inventory:delete')
  @ApiOperation({ summary: 'Delete inventory item' })
  async softDelete(
    @Param('id') id: string,
    @CurrentUser('id') deletedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.inventoryService.softDelete(id, deletedById, organizationId);
    return { message: 'Item deleted.', data };
  }

  @Post(':id/restore')
  @RequirePermissions('inventory:update')
  async restore(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.inventoryService.restore(id, organizationId);
    return { message: 'Item restored.', data };
  }

  @Get(':id/movements')
  @RequirePermissions('inventory:read')
  async getMovementHistory(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.inventoryService.getMovementHistory(id, organizationId);
    return { message: 'Movement history fetched.', data };
  }
}
