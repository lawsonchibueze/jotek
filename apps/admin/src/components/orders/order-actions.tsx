'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { OrderStatus, ShipmentCarrier } from '@jotek/types';

const TRANSITIONS: Partial<Record<string, OrderStatus[]>> = {
  PENDING_PAYMENT: ['CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['RETURNED'],
  RETURNED: ['REFUNDED'],
};

const BUTTON_LABELS: Partial<Record<OrderStatus, string>> = {
  PROCESSING: 'Mark as Processing',
  PACKED: 'Mark as Packed',
  SHIPPED: 'Ship Order',
  DELIVERED: 'Mark as Delivered',
  CANCELLED: 'Cancel Order',
  RETURNED: 'Mark as Returned',
  REFUNDED: 'Process Refund',
};

const CARRIERS: { value: ShipmentCarrier; label: string }[] = [
  { value: 'GIG', label: 'GIG Logistics' },
  { value: 'KWIK', label: 'KWIK' },
  { value: 'SENDBOX', label: 'Sendbox' },
  { value: 'DHL', label: 'DHL' },
  { value: 'SELF', label: 'Self Delivery' },
];

interface Props {
  orderId: string;
  currentStatus: string;
}

export function OrderActions({ orderId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showShipForm, setShowShipForm] = useState(false);
  const [carrier, setCarrier] = useState<ShipmentCarrier>('GIG');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');

  const next = TRANSITIONS[currentStatus] ?? [];

  async function handleTransition(status: OrderStatus) {
    if (status === 'SHIPPED') {
      setShowShipForm(true);
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status });
      toast.success(`Order ${BUTTON_LABELS[status] ?? status}`);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setLoading(false);
    }
  }

  async function handleShip() {
    setLoading(true);
    try {
      await api.patch(`/admin/orders/${orderId}/shipment`, {
        carrier,
        trackingNumber: trackingNumber || undefined,
        trackingUrl: trackingUrl || undefined,
        estimatedDelivery: estimatedDelivery || undefined,
      });
      await api.patch(`/admin/orders/${orderId}/status`, { status: 'SHIPPED' });
      toast.success('Order shipped');
      setShowShipForm(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to ship order');
    } finally {
      setLoading(false);
    }
  }

  if (next.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {next.map((status) => (
          <button
            key={status}
            disabled={loading}
            onClick={() => handleTransition(status)}
            className={`${
              status === 'CANCELLED'
                ? 'rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50'
                : 'btn-primary disabled:opacity-50'
            }`}
          >
            {BUTTON_LABELS[status] ?? `Mark as ${status.replace(/_/g, ' ')}`}
          </button>
        ))}
      </div>

      {showShipForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 font-semibold text-gray-900">Shipment Details</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Carrier <span className="text-red-500">*</span>
              </label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value as ShipmentCarrier)}
                className="input"
              >
                {CARRIERS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tracking Number
              </label>
              <input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. GIG-123456789"
                className="input"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tracking URL
              </label>
              <input
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://giglogistics.com/track/..."
                className="input"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Estimated Delivery Date
              </label>
              <input
                type="date"
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
                className="input"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleShip}
                disabled={loading}
                className="btn-primary disabled:opacity-50"
              >
                {loading ? 'Confirming…' : 'Confirm Shipment'}
              </button>
              <button
                onClick={() => setShowShipForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
