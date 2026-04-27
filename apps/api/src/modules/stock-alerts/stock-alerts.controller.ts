import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { OptionalSessionGuard } from '@core/auth/guards/optional-session.guard';
import { CurrentUser } from '@core/auth/decorators/current-user.decorator';
import type { User } from '@core/auth/auth';
import { StockAlertsService } from './stock-alerts.service';

@ApiTags('stock-alerts')
@Controller('stock-alerts')
export class StockAlertsController {
  constructor(private readonly service: StockAlertsService) {}

  @Post()
  @UseGuards(OptionalSessionGuard)
  subscribe(
    @Body() body: { variantId: string; email: string },
    @CurrentUser() user?: User,
  ) {
    return this.service.subscribe({
      variantId: body.variantId,
      email: body.email,
      userId: user?.id,
    });
  }
}
