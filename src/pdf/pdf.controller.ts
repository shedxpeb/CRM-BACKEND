import { Controller, Get, Param, NotFoundException, Logger, StreamableFile, Header } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProduces } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { generatePurchaseOrderPdf, PurchaseOrderPdfData } from './templates/purchase-order.template';

@ApiTags('purchase-order-pdf')
@ApiBearerAuth()
@Controller('purchase-order')
export class PdfController {
  private readonly logger = new Logger(PdfController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get(':id/pdf')
  @RequirePermissions('purchase-order:read')
  @ApiOperation({ summary: 'Generate and stream Purchase Order PDF' })
  @ApiProduces('application/pdf')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async generatePdf(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<StreamableFile> {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId, isDeleted: false },
      include: {
        items: true,
        vendor: true,
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase Order not found');
    }

    const buyer = await this.prisma.organization.findFirst({
      where: { id: organizationId },
    });

    const warehouse = po.warehouseId
      ? await this.prisma.warehouse.findUnique({ where: { id: po.warehouseId } })
      : null;

    const pdfData: PurchaseOrderPdfData = {
      poNumber: po.poNumber,
      poDate: po.createdAt.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      paymentTerms: po.paymentTerms || undefined,
      expectedDelivery: po.expectedDeliveryDate
        ? po.expectedDeliveryDate.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : undefined,

      buyer: {
        name: buyer?.name || '',
        companyName: buyer?.name || '',
        address: buyer?.address || undefined,
        city: buyer?.city || undefined,
        state: buyer?.state || undefined,
        pincode: buyer?.pincode || undefined,
        phone: buyer?.mobile || undefined,
        email: buyer?.email || undefined,
        gstin: buyer?.gstNumber || undefined,
      },

      supplier: {
        companyName: po.vendor?.companyName || po.vendorName,
        contactPerson: po.vendor?.contactPerson || undefined,
        address: po.vendor?.address || undefined,
        city: po.vendor?.city || undefined,
        state: po.vendor?.state || undefined,
        pincode: po.vendor?.pincode || undefined,
        phone: po.vendor?.phone || undefined,
        email: po.vendor?.email || undefined,
        gstin: po.vendor?.gstNumber || undefined,
      },

      shipTo: warehouse
        ? {
            name: warehouse.name,
            address: warehouse.address || warehouse.location || undefined,
            city: undefined,
            state: undefined,
            pincode: undefined,
          }
        : undefined,

      items: po.items.map((item) => ({
        itemName: item.itemName,
        description: item.description || undefined,
        hsnCode: item.hsnCode || undefined,
        quantity: Number(item.quantity),
        unit: item.unit,
        rate: Number(item.rate),
        discount: item.discount ? Number(item.discount) : undefined,
        discountType: item.discountType || undefined,
        gstRate: item.gstRate ? Number(item.gstRate) : undefined,
        gstAmount: item.gstAmount ? Number(item.gstAmount) : undefined,
        total: Number(item.total),
      })),

      subtotal: Number(po.subtotal),
      discount: po.discount ? Number(po.discount) : undefined,
      discountType: po.discountType || undefined,
      tax: Number(po.tax),
      freight: po.freight ? Number(po.freight) : undefined,
      packingCharges: po.packingCharges ? Number(po.packingCharges) : undefined,
      shippingCharges: po.shippingCharges ? Number(po.shippingCharges) : undefined,
      otherCharges: po.otherCharges ? Number(po.otherCharges) : undefined,
      roundOff: po.roundOff ? Number(po.roundOff) : undefined,
      grandTotal: Number(po.grandTotal),
      currency: po.currency || 'INR',

      notes: po.notes || undefined,
      terms: po.terms || undefined,

      company: {
        name: buyer?.name || 'PEB Systems',
        gstin: buyer?.gstNumber || undefined,
        phone: buyer?.mobile || undefined,
        email: buyer?.email || undefined,
        website: buyer?.website || undefined,
      },
    };

    this.logger.log(`Generating PDF for PO ${po.poNumber}`);

    const stream = await generatePurchaseOrderPdf(pdfData);

    return new StreamableFile(stream, {
      type: 'application/pdf',
      disposition: `attachment; filename="${po.poNumber}.pdf"`,
    });
  }
}
