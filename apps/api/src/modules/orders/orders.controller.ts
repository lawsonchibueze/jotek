import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { SessionGuard } from '@core/auth/guards/session.guard';
import { OptionalSessionGuard } from '@core/auth/guards/optional-session.guard';
import { CurrentUser } from '@core/auth/decorators/current-user.decorator';
import type { User } from '@core/auth/auth';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(OptionalSessionGuard)
  create(@Body() dto: CreateOrderDto, @CurrentUser() user?: User) {
    return this.ordersService.create(dto, user);
  }

  @Get('track')
  track(@Query('orderNumber') orderNumber: string, @Query('phone') phone: string) {
    return this.ordersService.trackPublic(orderNumber, phone);
  }

  @Get()
  @UseGuards(SessionGuard)
  async findAll(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const data = await this.ordersService.findByUser(user.id, page ?? 1, limit ?? 10);
    return { data, meta: { total: data.length } };
  }

  @Get(':orderNumber')
  @UseGuards(OptionalSessionGuard)
  findOne(@Param('orderNumber') orderNumber: string, @CurrentUser() user?: User) {
    return this.ordersService.findByOrderNumber(orderNumber, user?.id);
  }

  @Post(':orderNumber/cancel')
  @UseGuards(SessionGuard)
  cancel(@Param('orderNumber') orderNumber: string, @CurrentUser() user: User) {
    return this.ordersService.cancel(orderNumber, user.id);
  }

  @Post(':orderNumber/return-request')
  @UseGuards(SessionGuard)
  requestReturn(
    @Param('orderNumber') orderNumber: string,
    @Body() body: { reason: string },
    @CurrentUser() user: User,
  ) {
    return this.ordersService.requestReturn(orderNumber, user.id, body.reason);
  }
}
