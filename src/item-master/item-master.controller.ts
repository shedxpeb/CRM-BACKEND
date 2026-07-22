import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ItemMasterService } from './item-master.service';
import { GetItemMastersDto } from './dto/get-item-masters.dto';
import { CreateItemMasterDto } from './dto/create-item-master.dto';
import { UpdateItemMasterDto } from './dto/update-item-master.dto';
import { BulkDeleteItemMasterDto, BulkStatusItemMasterDto } from './dto/bulk.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { serializeDecimals } from '../common/services/base-query.service';

@ApiTags('item-master')
@ApiBearerAuth()
@Controller('item-master')
export class ItemMasterController {
  constructor(
    private readonly itemMasterService: ItemMasterService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @RequirePermissions('item-master:list')
  @ApiOperation({ summary: 'Get all items with pagination, search, and filters' })
  async findAll(
    @Query() query: GetItemMastersDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.itemMasterService.findAll(query, organizationId);
    return { message: 'Items fetched successfully.', data };
  }

  @Get('export')
  @RequirePermissions('item-master:list')
  @ApiOperation({ summary: 'Export items' })
  async export(
    @Query() query: GetItemMastersDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.itemMasterService.findAllForExport(query, organizationId);
    return { message: 'Export data fetched.', data };
  }

  @Get('combobox')
  @RequirePermissions('item-master:list')
  @ApiOperation({ summary: 'Get items for dropdown' })
  async combobox(@Query() query: any, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.itemMasterService.getCombobox(query, organizationId);
    return { message: 'Items fetched.', data };
  }

  @Get('stats')
  @RequirePermissions('item-master:list')
  @ApiOperation({ summary: 'Get item statistics' })
  async getStats(@CurrentUser('organizationId') organizationId: string) {
    const data = await this.itemMasterService.getStats(organizationId);
    return { message: 'Stats fetched.', data };
  }

  @Patch('bulk/status')
  @RequirePermissions('item-master:update')
  async bulkStatusUpdate(
    @Body() body: BulkStatusItemMasterDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.itemMasterService.bulkStatusUpdate(
      body.ids,
      body.status,
      organizationId,
    );
    return { message: 'Items updated.', data };
  }

  @Delete('bulk')
  @RequirePermissions('item-master:delete')
  async bulkDelete(
    @Body() body: BulkDeleteItemMasterDto,
    @CurrentUser('id') deletedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.itemMasterService.bulkDelete(body.ids, deletedById, organizationId);
    return { message: 'Items deleted.', data };
  }

  @Get(':id')
  @RequirePermissions('item-master:read')
  @ApiOperation({ summary: 'Get item by ID' })
  async findById(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.itemMasterService.findById(id, organizationId);
    return { message: 'Item fetched.', data };
  }

  @Post()
  @RequirePermissions('item-master:create')
  @ApiOperation({ summary: 'Create a new item' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateItemMasterDto,
    @CurrentUser('id') createdById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.itemMasterService.create(dto, createdById, organizationId);
    return { message: 'Item created.', data };
  }

  @Patch(':id')
  @RequirePermissions('item-master:update')
  @ApiOperation({ summary: 'Update item' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateItemMasterDto,
    @CurrentUser('id') updatedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.itemMasterService.update(id, dto, updatedById, organizationId);
    return { message: 'Item updated.', data };
  }

  @Delete(':id')
  @RequirePermissions('item-master:delete')
  @ApiOperation({ summary: 'Delete item' })
  async softDelete(
    @Param('id') id: string,
    @CurrentUser('id') deletedById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.itemMasterService.softDelete(id, deletedById, organizationId);
    return { message: 'Item deleted.', data };
  }

  @Post(':id/restore')
  @RequirePermissions('item-master:update')
  @ApiOperation({ summary: 'Restore deleted item' })
  async restore(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    const data = await this.itemMasterService.restore(id, organizationId);
    return { message: 'Item restored.', data };
  }

  // ─── VARIANTS ──────────────────────────────────────

  @Get(':id/variants')
  @RequirePermissions('item-master:read')
  @ApiOperation({ summary: 'Get variants for item' })
  async getVariants(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const data = await this.prisma.itemVariant.findMany({
      where: { itemMasterId: id, organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return { message: 'Variants fetched.', data: serializeDecimals(data) };
  }

  @Post(':id/variants')
  @RequirePermissions('item-master:create')
  @ApiOperation({ summary: 'Create variant' })
  async createVariant(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser('id') createdById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    await this.itemMasterService.findById(id, organizationId);
    const data = await this.prisma.itemVariant.create({
      data: {
        organizationId,
        itemMasterId: id,
        variantName: dto.variantName,
        variantCode: dto.variantCode,
        specifications: dto.specifications,
        standardWeight: dto.standardWeight,
        dimensions: dto.dimensions || undefined,
        defaultRate: dto.defaultRate,
        status: dto.status || 'Active',
        customFields: dto.customFields || undefined,
      },
    });
    return { message: 'Variant created.', data: serializeDecimals(data) };
  }

  @Patch(':itemId/variants/:variantId')
  @RequirePermissions('item-master:update')
  @ApiOperation({ summary: 'Update variant' })
  async updateVariant(
    @Param('itemId') itemId: string,
    @Param('variantId') variantId: string,
    @Body() dto: any,
    @CurrentUser('id') _updatedById: string,
    @CurrentUser('organizationId') _organizationId: string,
  ) {
    const data = await this.prisma.itemVariant.update({
      where: { id: variantId },
      data: {
        ...(dto.variantName !== undefined && { variantName: dto.variantName }),
        ...(dto.variantCode !== undefined && { variantCode: dto.variantCode }),
        ...(dto.specifications !== undefined && { specifications: dto.specifications }),
        ...(dto.standardWeight !== undefined && { standardWeight: dto.standardWeight }),
        ...(dto.dimensions !== undefined && { dimensions: dto.dimensions }),
        ...(dto.defaultRate !== undefined && { defaultRate: dto.defaultRate }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
    return { message: 'Variant updated.', data: serializeDecimals(data) };
  }

  @Delete(':itemId/variants/:variantId')
  @RequirePermissions('item-master:delete')
  @ApiOperation({ summary: 'Delete variant' })
  async deleteVariant(
    @Param('variantId') variantId: string,
    @CurrentUser('organizationId') _organizationId: string,
  ) {
    await this.prisma.itemVariant.delete({ where: { id: variantId } });
    return { message: 'Variant deleted.', data: null };
  }

  // ─── BUNDLES ───────────────────────────────────────

  @Get('bundles/list')
  @RequirePermissions('item-master:read')
  @ApiOperation({ summary: 'Get all bundles' })
  async getBundles(@CurrentUser('organizationId') organizationId: string) {
    const data = await this.prisma.itemBundle.findMany({
      where: { organizationId, isDeleted: false },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    return { message: 'Bundles fetched.', data: serializeDecimals(data) };
  }

  @Post('bundles')
  @RequirePermissions('item-master:create')
  @ApiOperation({ summary: 'Create bundle' })
  async createBundle(
    @Body() dto: any,
    @CurrentUser('id') createdById: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const bundle = await this.prisma.itemBundle.create({
      data: {
        organizationId,
        bundleCode: dto.bundleCode,
        bundleName: dto.bundleName,
        description: dto.description,
        bundleRate: dto.bundleRate,
        discountPercentage: dto.discountPercentage,
        status: dto.status || 'Active',
        items: dto.items
          ? {
              create: dto.items.map((item: any) => ({
                organizationId,
                itemMasterId: item.itemMasterId,
                quantity: item.quantity || 1,
                unit: item.unit,
                rate: item.rate,
              })),
            }
          : undefined,
      },
      include: { items: true },
    });
    return { message: 'Bundle created.', data: serializeDecimals(bundle) };
  }

  @Delete('bundles/:id')
  @RequirePermissions('item-master:delete')
  @ApiOperation({ summary: 'Delete bundle' })
  async deleteBundle(
    @Param('id') id: string,
    @CurrentUser('organizationId') _organizationId: string,
  ) {
    await this.prisma.itemBundle.update({
      where: { id },
      data: { isDeleted: true },
    });
    return { message: 'Bundle deleted.', data: null };
  }
}
