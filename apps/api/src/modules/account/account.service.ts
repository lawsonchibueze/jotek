import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@core/database/database.service';
import { and, eq } from 'drizzle-orm';

@Injectable()
export class AccountService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db; }
  private get s() { return this.database.schema; }

  async getAddresses(userId: string) {
    return this.db.query.addresses.findMany({
      where: eq(this.s.addresses.userId, userId),
      orderBy: this.s.addresses.createdAt,
    });
  }

  async createAddress(userId: string, data: any) {
    const [address] = await this.db
      .insert(this.s.addresses)
      .values({ ...data, userId })
      .returning();
    return address;
  }

  async updateAddress(userId: string, addressId: string, data: any) {
    const [updated] = await this.db
      .update(this.s.addresses)
      .set(data)
      .where(and(eq(this.s.addresses.id, addressId), eq(this.s.addresses.userId, userId)))
      .returning();
    if (!updated) throw new NotFoundException('Address not found');
    return updated;
  }

  async deleteAddress(userId: string, addressId: string) {
    await this.db
      .delete(this.s.addresses)
      .where(and(eq(this.s.addresses.id, addressId), eq(this.s.addresses.userId, userId)));
  }

  async setDefaultAddress(userId: string, addressId: string) {
    await this.db
      .update(this.s.addresses)
      .set({ isDefault: false })
      .where(eq(this.s.addresses.userId, userId));

    await this.db
      .update(this.s.addresses)
      .set({ isDefault: true })
      .where(and(eq(this.s.addresses.id, addressId), eq(this.s.addresses.userId, userId)));
  }

  async getWishlist(userId: string) {
    let wishlist = await this.db.query.wishlists.findFirst({
      where: eq(this.s.wishlists.userId, userId),
      with: {
        items: {
          with: {
            variant: {
              with: { product: { with: { images: true } }, inventory: true },
            },
          },
        },
      },
    });

    if (!wishlist) {
      await this.db.insert(this.s.wishlists).values({ userId });
      wishlist = await this.db.query.wishlists.findFirst({
        where: eq(this.s.wishlists.userId, userId),
        with: {
          items: {
            with: {
              variant: {
                with: { product: { with: { images: true } }, inventory: true },
              },
            },
          },
        },
      });
    }

    return wishlist;
  }

  async addToWishlist(userId: string, variantId: string) {
    const wishlist = await this.getWishlist(userId);
    await this.db
      .insert(this.s.wishlistItems)
      .values({ wishlistId: wishlist!.id, variantId })
      .onConflictDoNothing();
  }

  async removeFromWishlist(userId: string, variantId: string) {
    const wishlist = await this.getWishlist(userId);
    await this.db
      .delete(this.s.wishlistItems)
      .where(
        and(
          eq(this.s.wishlistItems.wishlistId, wishlist!.id),
          eq(this.s.wishlistItems.variantId, variantId),
        ),
      );
  }

  async getReviews(userId: string) {
    return this.db.query.reviews.findMany({
      where: eq(this.s.reviews.userId, userId),
      with: { product: { columns: { id: true, name: true, slug: true } } },
      orderBy: this.s.reviews.createdAt,
    });
  }

  async deleteReview(userId: string, reviewId: string) {
    const review = await this.db.query.reviews.findFirst({
      where: and(eq(this.s.reviews.id, reviewId), eq(this.s.reviews.userId, userId)),
    });
    if (!review) throw new NotFoundException('Review not found');
    await this.db.delete(this.s.reviews).where(eq(this.s.reviews.id, reviewId));
  }

  async getProfile(userId: string) {
    const profile = await this.db.query.user.findFirst({
      where: eq(this.s.user.id, userId),
      columns: { id: true, name: true, email: true, phoneNumber: true, image: true, createdAt: true },
    });
    if (!profile) throw new NotFoundException('User not found');
    return profile;
  }

  async updateProfile(userId: string, data: { name?: string; phone?: string }) {
    const [updated] = await this.db
      .update(this.s.user)
      .set({
        ...(data.name && { name: data.name }),
        ...(data.phone !== undefined && { phoneNumber: data.phone }),
        updatedAt: new Date(),
      })
      .where(eq(this.s.user.id, userId))
      .returning({ id: this.s.user.id, name: this.s.user.name, email: this.s.user.email, phoneNumber: this.s.user.phoneNumber });
    return updated;
  }
}
