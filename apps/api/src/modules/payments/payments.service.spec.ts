import axios from 'axios';
import { PaymentsService } from './payments.service';

declare const beforeEach: any;
declare const describe: any;
declare const expect: any;
declare const it: any;
declare const jest: any;

jest.mock('axios');

const mockedAxios = axios as any;

function updateBuilder(returningValue?: unknown[]) {
  const builder: any = {
    set: jest.fn(() => builder),
    where: jest.fn(() => builder),
    returning: jest.fn(() => Promise.resolve(returningValue ?? [])),
  };
  return builder;
}

function createService(overrides: Record<string, unknown> = {}) {
  const schema: any = {
    orders: {
      id: 'orders.id',
      status: 'orders.status',
      adminNotes: 'orders.adminNotes',
    },
    payments: {
      id: 'payments.id',
      orderId: 'payments.orderId',
      paystackReference: 'payments.paystackReference',
      amountKobo: 'payments.amountKobo',
      status: 'payments.status',
      channel: 'payments.channel',
      paystackResponse: 'payments.paystackResponse',
      verifiedAt: 'payments.verifiedAt',
      createdAt: 'payments.createdAt',
    },
  };

  const builders: any[] = [];
  const db: any = {
    query: {
      orders: { findFirst: jest.fn() },
      payments: { findFirst: jest.fn() },
    },
    update: jest.fn(() => {
      const builder = updateBuilder([{ id: 'order-1' }]);
      builders.push(builder);
      return builder;
    }),
    insert: jest.fn(() => ({
      values: jest.fn(() => Promise.resolve()),
    })),
  };

  const database: any = { db, schema };
  const redis: any = {
    setIfAbsent: jest.fn(() => Promise.resolve(true)),
    del: jest.fn(() => Promise.resolve()),
  };
  const queue: any = {
    dispatchOrderPaid: jest.fn(() => Promise.resolve()),
  };

  const service = new PaymentsService(database, redis, queue);

  return {
    service,
    db,
    redis,
    queue,
    builders,
    ...overrides,
  };
}

describe('PaymentsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PAYSTACK_SECRET_KEY = 'sk_test';
    process.env.STOREFRONT_URL = 'https://jotek.ng';
  });

  it('reuses a recent pending Paystack initialization instead of creating a duplicate reference', async () => {
    const { service, db } = createService();
    db.query.orders.findFirst.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'JTK-001',
      status: 'PENDING_PAYMENT',
      total: '250000.00',
      guestEmail: 'customer@example.com',
    });
    db.query.payments.findFirst.mockResolvedValue({
      paystackReference: 'JTK-existing',
      createdAt: new Date(),
      paystackResponse: { authorization_url: 'https://checkout.paystack.com/existing' },
    });

    const result = await service.initializeTransaction('order-1');

    expect(result).toEqual({
      authorizationUrl: 'https://checkout.paystack.com/existing',
      reference: 'JTK-existing',
      orderId: 'order-1',
      orderNumber: 'JTK-001',
    });
    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('deduplicates Paystack success webhooks before touching payment or inventory flow', async () => {
    const { service, redis, db, queue } = createService();
    redis.setIfAbsent.mockResolvedValue(false);

    await service.handleWebhookSuccess('JTK-duplicate', { reference: 'JTK-duplicate' });

    expect(redis.setIfAbsent).toHaveBeenCalledWith('paystack:processed:JTK-duplicate', '1', 86400);
    expect(db.query.payments.findFirst).not.toHaveBeenCalled();
    expect(queue.dispatchOrderPaid).not.toHaveBeenCalled();
  });

  it('verifies successful Paystack webhooks, marks the order paid, and dispatches fulfillment once', async () => {
    const { service, db, queue } = createService();
    db.query.payments.findFirst.mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      amountKobo: '25000000',
      status: 'PENDING',
      order: { id: 'order-1', status: 'PENDING_PAYMENT' },
    });
    mockedAxios.get.mockResolvedValue({
      data: { data: { status: 'success', amount: 25000000, channel: 'card' } },
    } as any);

    await service.handleWebhookSuccess('JTK-success', { reference: 'JTK-success' });

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.paystack.co/transaction/verify/JTK-success',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(db.update).toHaveBeenCalledTimes(2);
    expect(queue.dispatchOrderPaid).toHaveBeenCalledWith('order-1');
  });

  it('records failed payment webhooks without cancelling the order reservation prematurely', async () => {
    const { service, db, queue } = createService();
    db.query.payments.findFirst.mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      status: 'PENDING',
    });

    await service.handleWebhookFailure('JTK-failed', { reference: 'JTK-failed' });

    expect(db.update).toHaveBeenCalledTimes(2);
    expect(queue.dispatchOrderPaid).not.toHaveBeenCalled();
  });
});
