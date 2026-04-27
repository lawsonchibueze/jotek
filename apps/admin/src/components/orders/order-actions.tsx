'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, CheckCircle2, PackageCheck, RotateCcw, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { OrderStatus, PaymentMethod, PaymentStatus, ShipmentCarrier } from '@jotek/types';

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
  PROCESSING: 'Start Processing',
  PACKED: 'Mark Packed',
  SHIPPED: 'Ship Order',
  DELIVERED: 'Mark Delivered',
  CANCELLED: 'Cancel Order',
  RETURNED: 'Mark Returned',
  REFUNDED: 'Refund',
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
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus | null;
}

export function OrderActions({ orderId, currentStatus, paymentMethod, paymentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showShipForm, setShowShipForm] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [cancelledReason, setCancelledReason] = useState('');
  const [carrier, setCarrier] = useState<ShipmentCarrier>('GIG');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');

  const next = TRANSITIONS[currentStatus] ?? [];
  const isPaystack = paymentMethod !== 'PAY_ON_DELIVERY';

  async function patchStatus(status: OrderStatus, body: Record<string, unknown> = {}) {
    await api.patch(`/admin/orders/${orderId}/status`, { status, ...body });
  }

  async function handleTransition(status: OrderStatus) {
    if (status === 'SHIPPED') {
      setShowShipForm(true);
      setShowCancelForm(false);
      return;
    }

    if (status === 'CANCELLED') {
      setShowCancelForm(true);
      setShowShipForm(false);
      return;
    }

    if (status === 'REFUNDED') {
      await handleRefund();
      return;
    }

    setLoading(true);
    try {
      await patchStatus(status, adminNotes ? { adminNotes } : {});
      toast.success(BUTTON_LABELS[status] ?? `Order ${status.toLowerCase()}`);
      setAdminNotes('');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (cancelledReason.trim().length < 4) {
      toast.error('Add a cancellation reason');
      return;
    }

    setLoading(true);
    try {
      await patchStatus('CANCELLED', {
        cancelledReason: cancelledReason.trim(),
        ...(adminNotes.trim() ? { adminNotes: adminNotes.trim() } : {}),
      });
      toast.success('Order cancelled');
      setShowCancelForm(false);
      setCancelledReason('');
      setAdminNotes('');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefund() {
    setLoading(true);
    try {
      if (isPaystack && paymentStatus === 'SUCCESS') {
        await api.post(`/admin/orders/${orderId}/refund`, {});
      } else {
        await patchStatus('REFUNDED', adminNotes ? { adminNotes } : {});
      }
      toast.success('Refund recorded');
      setAdminNotes('');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to process refund');
    } finally {
      setLoading(false);
    }
  }

  async function handleShip() {
    setLoading(true);
    try {
      await api.patch(`/admin/orders/${orderId}/shipment`, {
        carrier,
        trackingNumber: trackingNumber.trim() || undefined,
        trackingUrl: trackingUrl.trim() || undefined,
        estimatedDelivery: estimatedDelivery || undefined,
      });
      await patchStatus('SHIPPED', adminNotes ? { adminNotes } : {});
      toast.success('Order shipped');
      setShowShipForm(false);
      setAdminNotes('');
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
        {next.map((status) => {
          const Icon =
            status === 'SHIPPED'
              ? Truck
              : status === 'CANCELLED'
                ? Ban
                : status === 'REFUNDED'
                  ? RotateCcw
                  : status === 'DELIVERED'
                    ? CheckCircle2
                    : PackageCheck;

          return (
            <button
              key={status}
              disabled={loading}
              onClick={() => handleTransition(status)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                status === 'CANCELLED'
                  ? 'border border-red-200 text-red-600 hover:bg-red-50'
                  : status === 'REFUNDED'
                    ? 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                    : 'bg-brand-500 text-white hover:bg-brand-600'
              }`}
            >
              <Icon className="h-4 w-4" />
              {BUTTON_LABELS[status] ?? status.replace(/_/g, ' ')}
            </button>
          );
        })}
      </div>

      <textarea
        value={adminNotes}
        onChange={(e) => setAdminNotes(e.target.value)}
        rows={2}
        placeholder="Internal note for this action"
        className="input resize-none text-sm"
      />

      {showCancelForm && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <label className="mb-1 block text-sm font-medium text-red-900">
            Cancellation reason
          </label>
          <input
            value={cancelledReason}
            onChange={(e) => setCancelledReason(e.target.value)}
            placeholder="e.g. Customer requested cancellation"
            className="input bg-white"
          />
          <div className="mt-3 flex gap-2">
            <button onClick={handleCancel} disabled={loading} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
              Confirm Cancel
            </button>
            <button onClick={() => setShowCancelForm(false)} className="btn-secondary text-sm">
              Keep Order
            </button>
          </div>
        </div>
      )}

      {showShipForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-4 font-semibold text-gray-900">Shipment Details</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Carrier</label>
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
                Estimated Delivery
              </label>
              <input
                type="date"
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
                className="input"
              />
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
              <label className="mb-1 block text-sm font-medium text-gray-700">Tracking URL</label>
              <input
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://..."
                className="input"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={handleShip} disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? 'Confirming...' : 'Confirm Shipment'}
            </button>
            <button onClick={() => setShowShipForm(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
