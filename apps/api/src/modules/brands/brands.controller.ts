import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BrandsService } from './brands.service';
import { AdminGuard } from '@core/auth/guards/admin.guard';

@ApiTags('brands')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get() findAll() { return this.brandsService.findAll(); }
  @Get('featured') findFeatured() { return this.brandsService.findFeatured(); }
  @Get(':slug') findOne(@Param('slug') slug: string) { return this.brandsService.findBySlug(slug); }

  @Post() @UseGuards(AdminGuard) create(@Body() body: any) { return this.brandsService.create(body); }
  @Patch(':id') @UseGuards(AdminGuard) update(@Param('id') id: string, @Body() body: any) { return this.brandsService.update(id, body); }
  @Delete(':id') @UseGuards(AdminGuard) remove(@Param('id') id: string) { return this.brandsService.remove(id); }
}
