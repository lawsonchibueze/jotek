import { Module } from '@nestjs/common';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminReportsController } from './admin-reports.controller';
import { AdminProductsController } from './admin-products.controller';
import { AdminCustomersController } from './admin-customers.controller';
import { AdminCouponsController } from './admin-coupons.controller';
import { AdminInventoryController } from './admin-inventory.controller';
import { AdminAuditLogController } from './admin-audit-log.controller';
import { AdminReviewsController } from './admin-reviews.controller';
import { AdminReportsService } from './admin-reports.service';
import { AdminAuditService } from './admin-audit.service';
import { ProductsModule } from '../products/products.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PaymentsModule } from '../payments/payments.module';
import { OrdersModule } from '../orders/orders.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ProductsModule, InventoryModule, PaymentsModule, OrdersModule, NotificationsModule],
  controllers: [
    AdminOrdersController,
    AdminReportsController,
    AdminProductsController,
    AdminCustomersController,
    AdminCouponsController,
    AdminInventoryController,
    AdminAuditLogController,
    AdminReviewsController,
  ],
  providers: [AdminReportsService, AdminAuditService],
  exports: [AdminAuditService],
})
export class AdminModule {}
