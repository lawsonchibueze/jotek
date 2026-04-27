import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';

declare const beforeEach: any;
declare const describe: any;
declare const expect: any;
declare const it: any;
declare const jest: any;

function updateBuilder(returningValue?: unknown[]) {
  const builder: any = {
    set: jest.fn(() => builder),
    where: jest.fn(() => builder),
    returning: jest.fn(() => Promise.resolve(returningValue ?? [])),
  };
  return builder;
}

function createService() {
  const schema: any = {
    orders: {
      id: 'orders.id',
      orderNumber: 'orders.orderNumber',
      status: 'orders.status',
      adminNotes: 'orders.adminNotes',
    },
    orderItems: {
      orderId: 'orderItems.orderId',
    },
    inventory: {
      variantId: 'inventory.variantId',
      quantity: 'inventory.quantity',
      reservedQuantity: 'inventory.reservedQuantity',
      lastUpdated: 'inventory.lastUpdated',
    },
  };

  const builders: any[] = [];
  const tx: any = {
    query: {
      orders: { findFirst: jest.fn() },
      orderItems: { findMany: jest.fn() },
    },
    update: jest.fn(() => {
      const builder = updateBuilder([{ id: 'order-1', status: 'CANCELLED' }]);
      builders.push(builder);
      return builder;
    }),
  };

  const db: any = {
    transaction: jest.fn((callback: (txArg: any) => unknown) => callback(tx)),
    query: {
      orders: { findFirst: jest.fn() },
      carts: { findFirst: jest.fn() },
      shippingZones: { findFirst: jest.fn() },
      addresses: { findFirst: jest.fn() },
      orderItems: { findMany: jest.fn() },
    },
  };

  const database: any = { db, schema };
  const cartService: any = {};
  const queue: any = {
    dispatchOrderPaid: jest.fn(),
    dispatchReleaseStaleReservation: jest.fn(),
  };
  const service = new OrdersService(database, cartService, queue);

  return { service, db, tx, builders };
}

describe('OrdersService status lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid admin transitions before touching inventory', async () => {
    const { service, tx } = createService();
    tx.query.orders.findFirst.mockResolvedValue({
      id: 'order-1',
      status: 'PENDING_PAYMENT',
      adminNotes: null,
      cancelledReason: null,
    });

    await expect(service.updateStatus('order-1', { status: 'PAID' })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(tx.query.orderItems.findMany).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('releases reserved stock when cancelling an unpaid order', async () => {
    const { service, tx } = createService();
    tx.query.orders.findFirst.mockResolvedValue({
      id: 'order-1',
      status: 'PENDING_PAYMENT',
      adminNotes: null,
      cancelledReason: null,
    });
    tx.query.orderItems.findMany.mockResolvedValue([
      { variantId: 'variant-1', quantity: 2 },
      { variantId: 'variant-2', quantity: 1 },
    ]);

    const result = await service.updateStatus('order-1', {
      status: 'CANCELLED',
      cancelledReason: 'Customer changed mind',
      adminNotes: 'Customer called support',
    });

    expect(result).toEqual({ id: 'order-1', status: 'CANCELLED' });
    expect(tx.query.orderItems.findMany).toHaveBeenCalledTimes(1);
    expect(tx.update).toHaveBeenCalledTimes(3);
  });

  it('restocks committed inventory only once when cancelling a processing order', async () => {
    const { service, tx } = createService();
    tx.query.orders.findFirst.mockResolvedValue({
      id: 'order-1',
      status: 'PROCESSING',
      adminNotes: '[INVENTORY_COMMITTED] 2026-04-27T00:00:00.000Z',
      cancelledReason: null,
    });
    tx.query.orderItems.findMany.mockResolvedValue([{ variantId: 'variant-1', quantity: 2 }]);

    await service.updateStatus('order-1', {
      status: 'CANCELLED',
      cancelledReason: 'Out of stock replacement rejected',
    });

    expect(tx.query.orderItems.findMany).toHaveBeenCalledTimes(1);
    expect(tx.update).toHaveBeenCalledTimes(2);
    const orderUpdate = tx.update.mock.results[1].value;
    expect(orderUpdate.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'CANCELLED',
        cancelledReason: 'Out of stock replacement rejected',
      }),
    );
  });
});
