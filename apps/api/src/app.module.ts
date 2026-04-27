import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './core/database/database.module';
import { RedisModule } from './core/redis/redis.module';
import { AuthModule } from './core/auth/auth.module';
import { QueueModule } from './core/queue/queue.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BrandsModule } from './modules/brands/brands.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SearchModule } from './modules/search/search.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AccountModule } from './modules/account/account.module';
import { AdminModule } from './modules/admin/admin.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { MediaModule } from './modules/media/media.module';
import { StockAlertsModule } from './modules/stock-alerts/stock-alerts.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),

    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60_000,
        limit: 100,
      },
      {
        name: 'long',
        ttl: 600_000,
        limit: 1000,
      },
    ]),

    // ── Core ────────────────────────────────────────────────────────────────
    DatabaseModule,
    RedisModule,
    AuthModule,
    QueueModule,

    // ── Business Modules ────────────────────────────────────────────────────
    ProductsModule,
    CategoriesModule,
    BrandsModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    WebhooksModule,
    InventoryModule,
    SearchModule,
    NotificationsModule,
    ReviewsModule,
    AccountModule,
    AdminModule,
    ShippingModule,
    MediaModule,
    StockAlertsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
