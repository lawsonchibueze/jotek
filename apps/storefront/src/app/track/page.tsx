'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const STATUS_STEPS = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'];

export default function TrackPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.get<any>(`/orders/track?orderNumber=${orderNumber}&phone=${phone}`);
      setResult(data);
    } catch {
      toast.error('Order not found. Check your order number and phone number.');
    } finally {
      setLoading(false);
    }
  };

  const currentStep = result ? STATUS_STEPS.indexOf(result.status) : -1;

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Track Your Order</h1>
      <p className="mt-2 text-sm text-gray-500">Enter your order number and delivery phone number.</p>

      <form onSubmit={handleTrack} className="mt-8 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Order Number</label>
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="JTK-20260101-XXXXX"
            className="input"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+2348012345678"
            className="input"
            required
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Tracking...' : 'Track Order'}
        </button>
      </form>

      {result && (
        <div className="mt-8 rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900">{result.orderNumber}</span>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-500">
              {result.status.replace('_', ' ')}
            </span>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute left-3.5 top-0 h-full w-0.5 bg-gray-200" />
              <div className="space-y-6">
                {STATUS_STEPS.slice(1).map((step, i) => (
                  <div key={step} className="relative flex items-center gap-4">
                    <div className={`relative z-10 h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs ${
                      i <= currentStep - 1 ? 'border-brand-500 bg-brand-500 text-white' : 'border-gray-300 bg-white text-gray-400'
                    }`}>
                      {i <= currentStep - 1 ? '✓' : i + 1}
                    </div>
                    <span className={`text-sm ${i <= currentStep - 1 ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
                      {step.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {result.shipment?.trackingNumber && (
            <div className="mt-6 rounded-lg bg-gray-50 p-3 text-sm">
              <p className="font-medium text-gray-700">Tracking Number</p>
              <p className="mt-1 text-gray-500">{result.shipment.trackingNumber}</p>
              {result.shipment.trackingUrl && (
                <a href={result.shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-brand-500 hover:underline">
                  Track with carrier →
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
