'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';

interface Profile {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
}

export default function SettingsPage() {
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ['account-profile'],
    queryFn: () => api.get('/account/profile'),
  });

  // Profile form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileInitialized, setProfileInitialized] = useState(false);

  if (profile && !profileInitialized) {
    setName(profile.name ?? '');
    setPhone(profile.phoneNumber ?? '');
    setProfileInitialized(true);
  }

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const profileMutation = useMutation({
    mutationFn: () => api.patch('/account/profile', { name, phone }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-profile'] });
      toast.success('Profile updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error('Passwords do not match');
      if (newPassword.length < 8) throw new Error('Password must be at least 8 characters');
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => {
      toast.success('Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-100" />
          <div className="h-64 rounded-xl bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/account" className="text-sm text-gray-500 hover:text-gray-700">← Account</Link>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Profile */}
      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-900">Profile Information</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              value={profile?.email ?? ''}
              disabled
              className="input bg-gray-50 text-gray-400"
            />
            <p className="mt-1 text-xs text-gray-400">Email cannot be changed here.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              placeholder="+2348012345678"
            />
          </div>
        </div>

        <button
          onClick={() => profileMutation.mutate()}
          disabled={profileMutation.isPending}
          className="btn-primary mt-6"
        >
          {profileMutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </section>

      {/* Password */}
      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-900">Change Password</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              autoComplete="new-password"
            />
          </div>
        </div>

        <button
          onClick={() => passwordMutation.mutate()}
          disabled={passwordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
          className="btn-primary mt-6"
        >
          {passwordMutation.isPending ? 'Changing…' : 'Change Password'}
        </button>
      </section>

      {/* Danger zone */}
      <section className="mt-6 rounded-xl border border-red-200 bg-white p-6">
        <h2 className="mb-1 font-semibold text-red-700">Danger Zone</h2>
        <p className="mb-4 text-sm text-gray-500">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        <button
          onClick={() => toast.error('Please contact support to delete your account.')}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
        >
          Delete Account
        </button>
      </section>
    </div>
  );
}
