import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// BullMQ requires maxRetriesPerRequest: null on its connection
const makeConnection = () =>
  new IORedis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queue = new Queue('jobs', {
    connection: makeConnection(),
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  });

  async onModuleInit() {
    // Hourly sweep for abandoned carts. BullMQ's repeatable scheduler is
    // idempotent — registering with the same key simply updates the pattern.
    await this.queue.add(
      'sweep-abandoned-carts',
      {},
      {
        repeat: { pattern: '0 * * * *' }, // top of every hour
        jobId: 'sweep-abandoned-carts',
      },
    );
    this.logger.log('Scheduled hourly abandoned-cart sweep');
  }

  async dispatchOrderPaid(orderId: string) {
    await this.queue.add('order-paid', { orderId }, {
      jobId: `order-paid:${orderId}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
    });
    this.logger.log(`Dispatched order-paid job for order ${orderId}`);
  }

  async dispatchSyncProduct(productId: string) {
    // Deduplicate rapid updates — only keep the latest per product
    await this.queue.add('sync-product', { productId }, {
      jobId: `sync-product:${productId}`,
      attempts: 3,
      backoff: { type: 'fixed', delay: 2_000 },
    });
  }

  async dispatchDeleteProduct(productId: string) {
    await this.queue.add('delete-product', { productId }, {
      attempts: 2,
    });
  }

  async dispatchNotifyBackInStock(variantId: string) {
    await this.queue.add(
      'notify-back-in-stock',
      { variantId },
      {
        jobId: `notify-back-in-stock:${variantId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
      },
    );
  }

  /**
   * Schedule a job that cancels a PENDING_PAYMENT order and releases its
   * reserved inventory if payment hasn't completed by the deadline. Deduped by
   * orderId so retrying order creation doesn't enqueue duplicate timeouts.
   */
  async dispatchReleaseStaleReservation(orderId: string, delayMs: number) {
    await this.queue.add(
      'release-stale-reservation',
      { orderId },
      {
        jobId: `release-stale-reservation:${orderId}`,
        delay: delayMs,
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
      },
    );
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}
