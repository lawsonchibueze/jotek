import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ProductsService } from '../products/products.service';
import { AdminGuard } from '@core/auth/guards/admin.guard';
import { CreateProductDto, UpdateProductDto } from '../products/dto/product.dto';
import { AdminAuditService } from './admin-audit.service';

@ApiTags('admin')
@Controller('admin/products')
@UseGuards(AdminGuard)
export class AdminProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('q') q?: string,
  ) {
    return this.productsService.findAll({ page: page ?? 1, limit: limit ?? 20, includeInactive: true });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateProductDto, @Req() req: Request) {
    const product = await this.productsService.create(dto);
    await this.audit.log(req, 'CREATE', 'product', product.id);
    return product;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: Request,
  ) {
    const product = await this.productsService.update(id, dto);
    await this.audit.log(req, 'UPDATE', 'product', id);
    return product;
  }

  @Patch(':id/stock')
  async updateStock(
    @Param('id') id: string,
    @Body() body: { stockQuantity: number },
    @Req() req: Request,
  ) {
    const result = await this.productsService.updateStock(id, body.stockQuantity);
    await this.audit.log(req, 'STOCK_ADJUST', 'product', id);
    return result;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    await this.productsService.softDelete(id);
    await this.audit.log(req, 'DELETE', 'product', id);
    return { success: true };
  }
}
