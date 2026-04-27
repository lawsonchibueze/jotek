'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

interface Props {
  orderNumber: string;
  initialStatus: string;
  paymentMethod: string;
}

export function PaymentStatusBanner({ orderNumber, initialStatus, paymentMethod }: Props) {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');

  // Only poll when Paystack redirected here and webhook hasn't fired yet
  const shouldPoll = !!reference && initialStatus === 'PENDING_PAYMENT';

  const [status, setStatus] = useState(initialStatus);
  const [verifying, setVerifying] = useState(shouldPoll);

  useEffect(() => {
    if (!shouldPoll) return;

    let attempts = 0;
    const MAX = 10; // 10 × 2s = 20s max wait

    const interval = setInterval(async () => {
      attempts++;
      try {
        const updated = await api.get<{ status: string }>(`/orders/${orderNumber}`);
        if (updated.status !== 'PENDING_PAYMENT') {
          setStatus(updated.status);
          setVerifying(false);
          clearInterval(interval);
        } else if (attempts >= MAX) {
          setVerifying(false);
          clearInterval(interval);
        }
      } catch {
        if (attempts >= MAX) {
          setVerifying(false);
          clearInterval(interval);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [orderNumber, shouldPoll]);

  if (verifying) {
    return (
      <div className="text-center">
        <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-brand-100 border-t-brand-500" />
        <h1 className="mt-5 text-2xl font-bold text-gray-900">Verifying Payment…</h1>
        <p className="mt-2 text-gray-500">
          Please wait while we confirm your payment with Paystack.
        </p>
      </div>
    );
  }

  const isPaid = ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(status);
  const isPod = paymentMethod === 'PAY_ON_DELIVERY';
  const isConfirmed = isPaid || isPod;

  return (
    <div className="text-center">
      <div className="text-5xl">{isConfirmed ? '✅' : status === 'CANCELLED' ? '❌' : '⏳'}</div>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">
        {isConfirmed
          ? 'Order Confirmed!'
          : status === 'CANCELLED'
          ? 'Order Cancelled'
          : 'Order Received'}
      </h1>
      <p className="mt-2 text-gray-500">
        {isPod
          ? 'Your order has been placed. Pay cash when it arrives.'
          : isPaid
          ? 'Your payment was successful and your order is being processed.'
          : status === 'PENDING_PAYMENT'
          ? "Awaiting payment confirmation. We'll update you by email."
          : ''}
      </p>
      <p className="mt-4 text-lg font-semibold text-brand-500">{orderNumber}</p>
    </div>
  );
}
