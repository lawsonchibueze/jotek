'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara',
];

interface Address {
  id: string;
  label: 'HOME' | 'WORK' | 'OTHER';
  firstName: string;
  lastName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  isDefault: boolean;
}

type AddressLabel = 'HOME' | 'WORK' | 'OTHER';

const emptyForm: {
  label: AddressLabel;
  firstName: string;
  lastName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
} = {
  label: 'HOME',
  firstName: '',
  lastName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
};

export default function AddressesPage() {
  const qc = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: addresses = [], isLoading } = useQuery<Address[]>({
    queryKey: ['account-addresses'],
    queryFn: () => api.get('/account/addresses'),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      if (editId) return api.patch(`/account/addresses/${editId}`, data);
      return api.post('/account/addresses', data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-addresses'] });
      toast.success(editId ? 'Address updated' : 'Address added');
      closeForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/account/addresses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-addresses'] });
      toast.success('Address removed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const defaultMutation = useMutation({
    mutationFn: (id: string) => api.post(`/account/addresses/${id}/default`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['account-addresses'] }),
    onError: (err: Error) => toast.error(err.message),
  });

  function openNew() {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(addr: Address) {
    setEditId(addr.id);
    setForm({
      label: addr.label,
      firstName: addr.firstName,
      lastName: addr.lastName,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 ?? '',
      city: addr.city,
      state: addr.state,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
  }

  function set(field: keyof typeof emptyForm, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveMutation.mutate(form);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/account" className="text-sm text-gray-500 hover:text-gray-700">← Account</Link>
          <h1 className="text-2xl font-bold text-gray-900">Addresses</h1>
        </div>
        <button onClick={openNew} className="btn-primary">+ Add Address</button>
      </div>

      {/* Address list */}
      <div className="mt-8 space-y-4">
        {isLoading && (
          <div className="animate-pulse space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-gray-100" />
            ))}
          </div>
        )}

        {!isLoading && addresses.length === 0 && !showForm && (
          <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
            <div className="text-4xl">📍</div>
            <p className="mt-3 font-medium text-gray-900">No saved addresses</p>
            <p className="mt-1 text-sm text-gray-500">Add an address for faster checkout.</p>
            <button onClick={openNew} className="btn-primary mt-6">Add Address</button>
          </div>
        )}

        {addresses.map((addr) => (
          <div
            key={addr.id}
            className={`relative rounded-xl border bg-white p-5 ${
              addr.isDefault ? 'border-brand-500 ring-1 ring-brand-500/30' : 'border-gray-200'
            }`}
          >
            {addr.isDefault && (
              <span className="absolute right-4 top-4 rounded-full bg-brand-500 px-2 py-0.5 text-xs font-medium text-white">
                Default
              </span>
            )}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{addr.label}</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {addr.firstName} {addr.lastName}
                </p>
                <p className="text-sm text-gray-600">{addr.phone}</p>
                <p className="mt-1 text-sm text-gray-600">
                  {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.state}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => openEdit(addr)} className="btn-secondary py-1 text-xs">
                Edit
              </button>
              {!addr.isDefault && (
                <button
                  onClick={() => defaultMutation.mutate(addr.id)}
                  disabled={defaultMutation.isPending}
                  className="btn-ghost py-1 text-xs"
                >
                  Set as Default
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm('Remove this address?')) deleteMutation.mutate(addr.id);
                }}
                disabled={deleteMutation.isPending}
                className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-gray-900">
            {editId ? 'Edit Address' : 'New Address'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Label</label>
              <select
                value={form.label}
                onChange={(e) => set('label', e.target.value)}
                className="input"
              >
                <option value="HOME">Home</option>
                <option value="WORK">Work</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">First Name *</label>
                <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required className="input" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Last Name *</label>
                <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required className="input" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone *</label>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} required placeholder="+2348012345678" className="input" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Address Line 1 *</label>
              <input value={form.line1} onChange={(e) => set('line1', e.target.value)} required placeholder="House number, street name" className="input" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Address Line 2</label>
              <input value={form.line2} onChange={(e) => set('line2', e.target.value)} placeholder="Apartment, estate, landmark" className="input" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">City *</label>
                <input value={form.city} onChange={(e) => set('city', e.target.value)} required className="input" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">State *</label>
                <select value={form.state} onChange={(e) => set('state', e.target.value)} required className="input">
                  <option value="">Select state</option>
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
                {saveMutation.isPending ? 'Saving…' : editId ? 'Update Address' : 'Save Address'}
              </button>
              <button type="button" onClick={closeForm} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
