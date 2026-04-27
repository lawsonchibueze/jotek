'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { CouponInput } from '@/components/shop/coupon-input';
import type { Cart, ShippingOption } from '@jotek/types';

const addressSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().min(10, 'Enter a valid phone number'),
  line1: z.string().min(3, 'Required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'Required'),
  state: z.string().min(1, 'Required'),
});

type AddressForm = z.infer<typeof addressSchema>;

type Step = 'address' | 'shipping' | 'payment' | 'review';
type PaymentMethod = 'PAYSTACK_CARD' | 'PAYSTACK_TRANSFER' | 'PAYSTACK_USSD' | 'PAY_ON_DELIVERY';

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; desc: string }[] = [
  { value: 'PAYSTACK_CARD', label: 'Card Payment', desc: 'Visa, Mastercard, Verve' },
  { value: 'PAYSTACK_TRANSFER', label: 'Bank Transfer', desc: 'Pay via bank transfer' },
  { value: 'PAYSTACK_USSD', label: 'USSD', desc: 'Dial *737#, *737#, *770# etc.' },
  { value: 'PAY_ON_DELIVERY', label: 'Pay on Delivery', desc: 'Cash on delivery (orders under ₦150,000)' },
];

const NIGERIA_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara',
];

export default function CheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('address');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PAYSTACK_CARD');
  const [addressData, setAddressData] = useState<AddressForm | null>(null);

  const { data: cart } = useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: () => api.get<Cart>('/cart'),
  });

  const { data: shippingOptions = [] } = useQuery<ShippingOption[]>({
    queryKey: ['shipping-zones', addressData?.state],
    queryFn: () =>
      api.get<ShippingOption[]>(
        `/shipping-zones?state=${encodeURIComponent(addressData?.state ?? '')}`,
      ),
    enabled: step === 'shipping' && !!addressData?.state,
  });

  const { register, handleSubmit, formState: { errors } } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
  });

  const placeMutation = useMutation({
    mutationFn: async (body: {
      cartId: string;
      guestAddress: unknown;
      guestEmail: string;
      guestPhone: string;
      shippingZoneId: string;
      paymentMethod: PaymentMethod;
      deliveryMethod: string;
    }) => {
      const { order } = await api.post<{ order: { id: string; orderNumber: string } }>('/orders', body);
      if (body.paymentMethod !== 'PAY_ON_DELIVERY') {
        const payment = await api.post<{ authorizationUrl: string }>('/payments/initialize', {
          orderId: order.id,
        });
        return { orderNumber: order.orderNumber, authorizationUrl: payment.authorizationUrl };
      }
      return { orderNumber: order.orderNumber, authorizationUrl: null };
    },
    onSuccess: (data) => {
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        router.push(`/order-confirmation/${data.orderNumber}`);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const selectedZone = shippingOptions.find((z) => z.zoneId === selectedZoneId);

  function onAddressSubmit(values: AddressForm) {
    setAddressData(values);
    setStep('shipping');
  }

  function placeOrder() {
    if (!cart || !addressData || !selectedZoneId) return;
    const { email, ...deliveryAddress } = addressData;
    placeMutation.mutate({
      cartId: cart.id,
      guestAddress: { ...deliveryAddress, label: 'HOME' },
      guestEmail: email,
      guestPhone: addressData.phone,
      shippingZoneId: selectedZoneId,
      paymentMethod,
      deliveryMethod: 'STANDARD',
    });
  }

  const cartTotal = cart ? parseFloat(cart.total) : 0;
  const shippingFee = selectedZone ? parseFloat(selectedZone.cost) : 0;
  const orderTotal = cartTotal + shippingFee;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>

      {/* Step indicator */}
      <div className="mt-6 flex items-center gap-2 text-sm">
        {(['address', 'shipping', 'payment', 'review'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                s === step
                  ? 'bg-brand-500 text-white'
                  : ['address', 'shipping', 'payment', 'review'].indexOf(s) <
                    ['address', 'shipping', 'payment', 'review'].indexOf(step)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`capitalize ${s === step ? 'font-medium text-gray-900' : 'text-gray-400'}`}
            >
              {s}
            </span>
            {i < 3 && <span className="text-gray-300">›</span>}
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Step: Address */}
          {step === 'address' && (
            <form onSubmit={handleSubmit(onAddressSubmit)} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Delivery Address</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">First Name</label>
                  <input {...register('firstName')} className="input" />
                  {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Last Name</label>
                  <input {...register('lastName')} className="input" />
                  {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number</label>
                <input {...register('phone')} className="input" placeholder="08012345678" />
                {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email Address</label>
                <input {...register('email')} type="email" className="input" placeholder="you@example.com" />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Address</label>
                <input {...register('line1')} className="input" placeholder="Street, house number" />
                {errors.line1 && <p className="mt-1 text-xs text-red-500">{errors.line1.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Apartment / Suite (optional)</label>
                <input {...register('line2')} className="input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
                  <input {...register('city')} className="input" />
                  {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">State</label>
                  <select {...register('state')} className="input">
                    <option value="">Select state</option>
                    {NIGERIA_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.state && <p className="mt-1 text-xs text-red-500">{errors.state.message}</p>}
                </div>
              </div>
              <button type="submit" className="btn-primary w-full">
                Continue to Shipping
              </button>
            </form>
          )}

          {/* Step: Shipping */}
          {step === 'shipping' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Shipping Method</h2>
              {shippingOptions.length === 0 ? (
                <p className="text-sm text-gray-500">No shipping options available for your state.</p>
              ) : (
                <div className="space-y-3">
                  {shippingOptions.map((zone) => (
                    <label
                      key={zone.zoneId}
                      className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors ${
                        selectedZoneId === zone.zoneId
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="zone"
                        value={zone.zoneId}
                        checked={selectedZoneId === zone.zoneId}
                        onChange={() => setSelectedZoneId(zone.zoneId)}
                        className="accent-brand-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{zone.name}</p>
                        <p className="text-sm text-gray-500">
                          {zone.estimatedDaysMin}–{zone.estimatedDaysMax} business days · {zone.carrier}
                        </p>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {parseFloat(zone.cost) === 0 ? 'Free' : formatPrice(zone.cost)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep('address')} className="btn-secondary flex-1">Back</button>
                <button
                  disabled={!selectedZoneId}
                  onClick={() => setStep('payment')}
                  className="btn-primary flex-1"
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          )}

          {/* Step: Payment */}
          {step === 'payment' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Payment Method</h2>
              <div className="space-y-3">
                {PAYMENT_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors ${
                      paymentMethod === opt.value
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={opt.value}
                      checked={paymentMethod === opt.value}
                      onChange={() => setPaymentMethod(opt.value)}
                      className="accent-brand-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{opt.label}</p>
                      <p className="text-sm text-gray-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep('shipping')} className="btn-secondary flex-1">Back</button>
                <button onClick={() => setStep('review')} className="btn-primary flex-1">
                  Review Order
                </button>
              </div>
            </div>
          )}

          {/* Step: Review */}
          {step === 'review' && addressData && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Review Your Order</h2>

              <div className="rounded-xl border border-gray-200 p-4 text-sm">
                <p className="font-medium text-gray-900">Delivery to</p>
                <p className="mt-1 text-gray-600">
                  {addressData.firstName} {addressData.lastName} · {addressData.phone}
                </p>
                <p className="text-gray-500">{addressData.email}</p>
                <p className="text-gray-500">
                  {addressData.line1}{addressData.line2 ? `, ${addressData.line2}` : ''},{' '}
                  {addressData.city}, {addressData.state}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 text-sm">
                <p className="font-medium text-gray-900">Shipping</p>
                <p className="mt-1 text-gray-600">
                  {selectedZone?.name} · {formatPrice(selectedZone?.cost ?? '0')}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 text-sm">
                <p className="font-medium text-gray-900">Payment</p>
                <p className="mt-1 text-gray-600">
                  {PAYMENT_OPTIONS.find((o) => o.value === paymentMethod)?.label}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep('payment')} className="btn-secondary flex-1">Back</button>
                <button
                  disabled={placeMutation.isPending}
                  onClick={placeOrder}
                  className="btn-primary flex-1"
                >
                  {placeMutation.isPending
                    ? 'Placing order…'
                    : paymentMethod === 'PAY_ON_DELIVERY'
                    ? 'Place Order'
                    : 'Pay Now'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order summary sidebar */}
        <div className="rounded-xl border border-gray-200 p-5 h-fit space-y-3 text-sm">
          <h3 className="font-semibold text-gray-900">Order Summary</h3>
          <div className="space-y-2 divide-y divide-gray-100">
            {cart?.items.map((item) => (
              <div key={item.id} className="flex justify-between py-2">
                <span className="text-gray-600 truncate max-w-[180px]">
                  {item.product.name} × {item.quantity}
                </span>
                <span className="font-medium">{formatPrice(parseFloat(item.variant.price) * item.quantity)}</span>
              </div>
            ))}
          </div>
          <CouponInput appliedCoupon={cart?.coupon ?? null} />
          {cart?.coupon && (
            <div className="flex justify-between text-green-600">
              <span>Coupon ({cart.coupon.code})</span>
              <span>-{formatPrice(cart.coupon.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-500">
            <span>Shipping</span>
            <span>{selectedZone ? formatPrice(selectedZone.cost) : '—'}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-3 font-bold text-base text-gray-900">
            <span>Total</span>
            <span>{formatPrice(orderTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
