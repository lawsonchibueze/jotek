import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { SessionGuard } from '@core/auth/guards/session.guard';
import { CurrentUser } from '@core/auth/decorators/current-user.decorator';
import type { User } from '@core/auth/auth';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('product/:productId')
  findByProduct(@Param('productId') productId: string, @Query('page') page?: number) {
    return this.reviewsService.findByProduct(productId, page);
  }

  @Post()
  @UseGuards(SessionGuard)
  create(
    @Body() body: { productId: string; rating: number; title?: string; body?: string },
    @CurrentUser() user: User,
  ) {
    return this.reviewsService.create({
      productId: body.productId,
      rating: body.rating,
      title: body.title,
      body: body.body,
      userId: user.id,
    });
  }
}
