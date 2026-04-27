import { Controller, Get, Param, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '@core/auth/guards/admin.guard';
import { InventoryService } from '../inventory/inventory.service';

@ApiTags('admin')
@Controller('admin/inventory')
@UseGuards(AdminGuard)
export class AdminInventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async findAll(@Query('page') page = 1, @Query('limit') limit = 50) {
    const raw = await this.inventoryService.findAll(Number(page), Number(limit));
    return {
      data: raw.map((inv) => ({
        productId: inv.variant?.product?.id ?? inv.variantId,
        productName: inv.variant?.product?.name ?? '—',
        sku: inv.variant?.product?.sku ?? inv.variantId,
        stockQuantity: inv.quantity,
        reservedQuantity: inv.reservedQuantity,
        available: inv.quantity - inv.reservedQuantity,
        lowStockThreshold: inv.lowStockThreshold,
      })),
    };
  }

  @Patch(':variantId')
  updateStock(
    @Param('variantId') variantId: string,
    @Body() body: { quantity: number },
  ) {
    return this.inventoryService.updateQuantity(variantId, body.quantity);
  }
}
