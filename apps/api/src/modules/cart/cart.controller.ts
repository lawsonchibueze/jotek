import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { OptionalSessionGuard } from '@core/auth/guards/optional-session.guard';
import { SessionGuard } from '@core/auth/guards/session.guard';
import { CurrentUser } from '@core/auth/decorators/current-user.decorator';
import type { User } from '@core/auth/auth';

@ApiTags('cart')
@Controller('cart')
@UseGuards(OptionalSessionGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Req() req: any, @CurrentUser() user?: User) {
    return this.cartService.getOrCreate(user?.id, req.cookies?.sessionId ?? req.headers['x-session-id']);
  }

  @Post('items')
  async addItem(
    @Req() req: any,
    @Body() body: { variantId: string; quantity: number },
    @CurrentUser() user?: User,
  ) {
    const cart = await this.cartService.getOrCreate(user?.id, req.headers['x-session-id']);
    await this.cartService.addItem(cart.id, body.variantId, body.quantity);
    return this.cartService.getOrCreate(user?.id, req.headers['x-session-id']);
  }

  @Patch('items/:itemId')
  async updateItem(
    @Req() req: any,
    @Param('itemId') itemId: string,
    @Body() body: { quantity: number },
    @CurrentUser() user?: User,
  ) {
    const cart = await this.cartService.getOrCreate(user?.id, req.headers['x-session-id']);
    await this.cartService.updateItem(cart.id, itemId, body.quantity);
    return this.cartService.getOrCreate(user?.id, req.headers['x-session-id']);
  }

  @Delete('items/:itemId')
  async removeItem(
    @Req() req: any,
    @Param('itemId') itemId: string,
    @CurrentUser() user?: User,
  ) {
    const cart = await this.cartService.getOrCreate(user?.id, req.headers['x-session-id']);
    await this.cartService.removeItem(cart.id, itemId);
    return this.cartService.getOrCreate(user?.id, req.headers['x-session-id']);
  }

  @Post('apply-coupon')
  async applyCoupon(
    @Req() req: any,
    @Body() body: { code: string },
    @CurrentUser() user?: User,
  ) {
    const cart = await this.cartService.getOrCreate(user?.id, req.headers['x-session-id']);
    return this.cartService.applyCoupon(cart.id, body.code);
  }

  @Delete('coupon')
  async removeCoupon(@Req() req: any, @CurrentUser() user?: User) {
    const cart = await this.cartService.getOrCreate(user?.id, req.headers['x-session-id']);
    await this.cartService.removeCoupon(cart.id);
    return this.cartService.getOrCreate(user?.id, req.headers['x-session-id']);
  }

  @Post('merge')
  @UseGuards(SessionGuard)
  async mergeCart(@Req() req: any, @CurrentUser() user: User) {
    await this.cartService.mergeGuestCart(req.headers['x-session-id'], user.id);
    return this.cartService.getOrCreate(user.id);
  }
}
