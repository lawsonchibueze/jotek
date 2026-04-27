import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { AdminGuard } from '@core/auth/guards/admin.guard';
import { Roles } from '@core/auth/decorators/roles.decorator';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(AdminGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.inventoryService.findAll(page, limit);
  }

  @Get('low-stock')
  findLowStock() {
    return this.inventoryService.findLowStock();
  }

  @Patch(':variantId')
  @Roles('super_admin', 'manager', 'inventory_clerk')
  update(@Param('variantId') variantId: string, @Body() body: { quantity: number }) {
    return this.inventoryService.updateQuantity(variantId, body.quantity);
  }
}
