import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@core/database/database.service';
import { RedisService } from '@core/redis/redis.service';
import { and, eq, sql } from 'drizzle-orm';

const GUEST_CART_TTL = 60 * 60 * 24 * 30; // 30 days
const USER_CART_TTL = 60 * 60 * 24 * 90; // 90 days

@Injectable()
export class CartService {
  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  private get db() { return this.database.db; }
  private get s() { return this.database.schema; }

  async getOrCreate(userId?: string, sessionId?: string) {
    let cart = userId
      ? await this.db.query.carts.findFirst({
          where: eq(this.s.carts.userId, userId),
          with: {
            items: {
              with: {
                variant: {
                  with: {
                    product: {
                      with: {
                        images: {
                          where: eq(this.s.productImages.isPrimary, true),
                          limit: 1,
                        },
                      },
                    },
                    inventory: true,
                  },
                },
              },
            },
            coupon: true,
          },
        })
      : await this.db.query.carts.findFirst({
          where: and(
            eq(this.s.carts.sessionId, sessionId!),
            sql`${this.s.carts.userId} IS NULL`,
          ),
          with: {
            items: {
              with: {
                variant: {
                  with: {
                    product: {
                      with: {
                        images: {
                          where: eq(this.s.productImages.isPrimary, true),
                          limit: 1,
                        },
                      },
                    },
                    inventory: true,
                  },
                },
              },
            },
            coupon: true,
          },
        });

    if (!cart) {
      const expiresAt = new Date(
        Date.now() + (userId ? USER_CART_TTL : GUEST_CART_TTL) * 1000,
      );
      const [newCart] = await this.db
        .insert(this.s.carts)
        .values({ userId, sessionId, expiresAt })
        .returning();
      cart = { ...newCart, items: [], coupon: null } as any;
    }

    return this.formatCart(cart);
  }

  async addItem(cartId: string, variantId: string, quantity: number) {
    const variant = await this.db.query.productVariants.findFirst({
      where: eq(this.s.productVariants.id, variantId),
      with: { inventory: true },
    });

    if (!variant) throw new NotFoundException('Variant not found');

    const available =
      (variant.inventory?.quantity ?? 0) - (variant.inventory?.reservedQuantity ?? 0);
    if (available < quantity) {
      throw new BadRequestException(`Only ${available} units available`);
    }

    const existing = await this.db.query.cartItems.findFirst({
      where: and(
        eq(this.s.cartItems.cartId, cartId),
        eq(this.s.cartItems.variantId, variantId),
      ),
    });

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (available < newQty) throw new BadRequestException(`Only ${available} units available`);

      await this.db
        .update(this.s.cartItems)
        .set({ quantity: newQty })
        .where(eq(this.s.cartItems.id, existing.id));
    } else {
      await this.db.insert(this.s.cartItems).values({
        cartId,
        variantId,
        quantity,
        priceAtAdd: variant.price,
      });
    }

    await this.db
      .update(this.s.carts)
      .set({ updatedAt: new Date() })
      .where(eq(this.s.carts.id, cartId));
  }

  async updateItem(cartId: string, itemId: string, quantity: number) {
    if (quantity <= 0) {
      await this.db
        .delete(this.s.cartItems)
        .where(and(eq(this.s.cartItems.id, itemId), eq(this.s.cartItems.cartId, cartId)));
      return;
    }

    const item = await this.db.query.cartItems.findFirst({
      where: and(eq(this.s.cartItems.id, itemId), eq(this.s.cartItems.cartId, cartId)),
      with: { variant: { with: { inventory: true } } },
    });

    if (!item) throw new NotFoundException('Cart item not found');

    const available =
      (item.variant.inventory?.quantity ?? 0) -
      (item.variant.inventory?.reservedQuantity ?? 0);
    if (available < quantity) throw new BadRequestException(`Only ${available} units available`);

    await this.db
      .update(this.s.cartItems)
      .set({ quantity })
      .where(eq(this.s.cartItems.id, itemId));
  }

  async removeItem(cartId: string, itemId: string) {
    await this.db
      .delete(this.s.cartItems)
      .where(and(eq(this.s.cartItems.id, itemId), eq(this.s.cartItems.cartId, cartId)));
  }

  async applyCoupon(cartId: string, code: string) {
    const coupon = await this.db.query.coupons.findFirst({
      where: eq(this.s.coupons.code, code.toUpperCase()),
    });

    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('Invalid or expired coupon code');
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestException('This coupon has expired');
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }

    await this.db
      .update(this.s.carts)
      .set({ couponId: coupon.id, updatedAt: new Date() })
      .where(eq(this.s.carts.id, cartId));

    return { message: 'Coupon applied', code: coupon.code };
  }

  async removeCoupon(cartId: string) {
    await this.db
      .update(this.s.carts)
      .set({ couponId: null, updatedAt: new Date() })
      .where(eq(this.s.carts.id, cartId));
  }

  async mergeGuestCart(sessionId: string, userId: string) {
    const guestCart = await this.db.query.carts.findFirst({
      where: and(
        eq(this.s.carts.sessionId, sessionId),
        sql`${this.s.carts.userId} IS NULL`,
      ),
      with: { items: true },
    });

    if (!guestCart || !guestCart.items.length) return;

    const userCartData = await this.getOrCreate(userId);
    const userCart = await this.db.query.carts.findFirst({
      where: eq(this.s.carts.id, userCartData.id),
    });

    if (!userCart) return;

    for (const item of guestCart.items) {
      await this.addItem(userCart.id, item.variantId, item.quantity).catch(() => {});
    }

    await this.db.delete(this.s.carts).where(eq(this.s.carts.id, guestCart.id));
  }

  private formatCart(cart: any) {
    const items = cart.items ?? [];
    let subtotal = 0;

    const formattedItems = items.map((item: any) => {
      const price = parseFloat(item.priceAtAdd);
      subtotal += price * item.quantity;

      return {
        id: item.id,
        variantId: item.variantId,
        quantity: item.quantity,
        priceAtAdd: item.priceAtAdd,
        product: {
          name: item.variant?.product?.name ?? '',
          slug: item.variant?.product?.slug ?? '',
          primaryImage: item.variant?.product?.images?.[0]?.url ?? null,
        },
        variant: {
          sku: item.variant?.sku ?? '',
          color: item.variant?.color ?? null,
          storage: item.variant?.storage ?? null,
          ram: item.variant?.ram ?? null,
          price: item.variant?.price ?? item.priceAtAdd,
          compareAtPrice: item.variant?.compareAtPrice ?? null,
          availableQuantity: Math.max(
            0,
            (item.variant?.inventory?.quantity ?? 0) -
              (item.variant?.inventory?.reservedQuantity ?? 0),
          ),
        },
      };
    });

    let discountAmount = 0;
    let appliedCoupon = null;

    if (cart.coupon) {
      const c = cart.coupon;
      if (c.type === 'PERCENTAGE') {
        discountAmount = Math.min(
          (subtotal * parseFloat(c.value)) / 100,
          c.maxDiscountAmount ? parseFloat(c.maxDiscountAmount) : Infinity,
        );
      } else if (c.type === 'FIXED_AMOUNT') {
        discountAmount = parseFloat(c.value);
      }

      appliedCoupon = {
        code: c.code,
        type: c.type,
        value: c.value,
        discountAmount: discountAmount.toFixed(2),
      };
    }

    return {
      id: cart.id,
      items: formattedItems,
      subtotal: subtotal.toFixed(2),
      itemCount: items.reduce((acc: number, i: any) => acc + i.quantity, 0),
      coupon: appliedCoupon,
      discountAmount: discountAmount.toFixed(2),
      total: Math.max(0, subtotal - discountAmount).toFixed(2),
    };
  }
}
