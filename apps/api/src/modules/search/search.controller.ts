import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '@core/auth/guards/admin.guard';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post('reindex')
  @UseGuards(AdminGuard)
  reindex() {
    return this.searchService.reindexAll();
  }

  @Get()
  search(
    @Query('q') query?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('brandSlug') brandSlug?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('condition') condition?: string,
    @Query('inStockOnly') inStockOnly?: boolean,
    @Query('onSaleOnly') onSaleOnly?: boolean,
    @Query('sort') sort?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.searchService.search({
      query, categorySlug, brandSlug, minPrice, maxPrice,
      condition, inStockOnly, onSaleOnly, sort, page, limit,
    });
  }
}
