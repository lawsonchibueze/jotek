import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, ProductListQueryDto, UpdateProductDto } from './dto/product.dto';
import { AdminGuard } from '@core/auth/guards/admin.guard';
import { Roles } from '@core/auth/decorators/roles.decorator';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products with filters' })
  findAll(@Query() query: ProductListQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get product by slug' })
  findOne(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Post()
  @UseGuards(AdminGuard)
  @Roles('super_admin', 'manager')
  @ApiOperation({ summary: '[Admin] Create product' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @Roles('super_admin', 'manager')
  @ApiOperation({ summary: '[Admin] Update product' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @Roles('super_admin', 'manager')
  @ApiOperation({ summary: '[Admin] Soft-delete product' })
  remove(@Param('id') id: string) {
    return this.productsService.softDelete(id);
  }
}
