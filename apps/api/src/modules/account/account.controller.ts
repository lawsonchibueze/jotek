import {
  Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccountService } from './account.service';
import { SessionGuard } from '@core/auth/guards/session.guard';
import { CurrentUser } from '@core/auth/decorators/current-user.decorator';
import type { User } from '@core/auth/auth';

@ApiTags('account')
@Controller('account')
@UseGuards(SessionGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('addresses')
  getAddresses(@CurrentUser() user: User) {
    return this.accountService.getAddresses(user.id);
  }

  @Post('addresses')
  createAddress(@CurrentUser() user: User, @Body() body: any) {
    return this.accountService.createAddress(user.id, body);
  }

  @Put('addresses/:id')
  updateAddress(@CurrentUser() user: User, @Param('id') id: string, @Body() body: any) {
    return this.accountService.updateAddress(user.id, id, body);
  }

  @Delete('addresses/:id')
  deleteAddress(@CurrentUser() user: User, @Param('id') id: string) {
    return this.accountService.deleteAddress(user.id, id);
  }

  @Post('addresses/:id/default')
  setDefault(@CurrentUser() user: User, @Param('id') id: string) {
    return this.accountService.setDefaultAddress(user.id, id);
  }

  @Get('wishlist')
  getWishlist(@CurrentUser() user: User) {
    return this.accountService.getWishlist(user.id);
  }

  @Post('wishlist')
  addToWishlist(@CurrentUser() user: User, @Body() body: { variantId: string }) {
    return this.accountService.addToWishlist(user.id, body.variantId);
  }

  @Delete('wishlist/:variantId')
  removeFromWishlist(@CurrentUser() user: User, @Param('variantId') variantId: string) {
    return this.accountService.removeFromWishlist(user.id, variantId);
  }

  @Get('reviews')
  getReviews(@CurrentUser() user: User) {
    return this.accountService.getReviews(user.id);
  }

  @Delete('reviews/:id')
  deleteReview(@CurrentUser() user: User, @Param('id') id: string) {
    return this.accountService.deleteReview(user.id, id);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    return this.accountService.getProfile(user.id);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: User, @Body() body: { name?: string; phone?: string }) {
    return this.accountService.updateProfile(user.id, body);
  }
}
