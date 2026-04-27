import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { PaymentMethod, DeliveryMethod, AddressLabel } from '@jotek/types';

export class GuestAddressDto {
  @IsEnum(['HOME', 'WORK', 'OTHER']) label: AddressLabel;
  @IsString() @IsNotEmpty() firstName: string;
  @IsString() @IsNotEmpty() lastName: string;
  @IsString() @IsNotEmpty() phone: string;
  @IsString() @IsNotEmpty() line1: string;
  @IsOptional() @IsString() line2?: string;
  @IsString() @IsNotEmpty() city: string;
  @IsString() @IsNotEmpty() state: string;
}

export class CreateOrderDto {
  @IsUUID() cartId: string;

  @IsOptional() @IsUUID() addressId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => GuestAddressDto)
  guestAddress?: GuestAddressDto;

  @IsUUID() shippingZoneId: string;

  @IsEnum(['PAYSTACK_CARD', 'PAYSTACK_TRANSFER', 'PAYSTACK_USSD', 'PAY_ON_DELIVERY'])
  paymentMethod: PaymentMethod;

  @IsEnum(['COURIER_GIG', 'COURIER_KWIK', 'COURIER_SENDBOX', 'PICKUP', 'STANDARD'])
  deliveryMethod: DeliveryMethod;

  @IsOptional() @IsString() couponCode?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() guestEmail?: string;
  @IsOptional() @IsString() guestPhone?: string;
}

export class UpdateOrderStatusDto {
  @IsEnum(['PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED'])
  status: string;

  @IsOptional() @IsString() adminNotes?: string;
  @IsOptional() @IsString() cancelledReason?: string;
}
