import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ShippingService } from './shipping.service';

@ApiTags('shipping')
@Controller('shipping-zones')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get()
  findAvailable(@Query('state') state?: string) {
    return this.shippingService.findAvailable(state);
  }
}
