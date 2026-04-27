'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { authClient, useSession } from '@/lib/auth-client';

export function TwoFactorSetup() {
  const { data: session } = useSession();
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);

  const enabled = (session?.user as { twoFactorEnabled?: boolean })?.twoFactorEnabled ?? false;

  async function handleEnable() {
    setLoading(true);
    try {
      const result = await authClient.twoFactor.enable({ password: '' });
      if (result.data?.totpURI) setQrUri(result.data.totpURI);
    } catch {
      toast.error('Failed to start 2FA setup');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await authClient.twoFactor.verifyTotp({ code: totpCode });
      toast.success('Two-factor authentication enabled');
      setQrUri(null);
    } catch {
      toast.error('Invalid code — please try again');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    if (!confirm('Disable 2FA? Your account will be less secure.')) return;
    setLoading(true);
    try {
      await authClient.twoFactor.disable({});
      toast.success('Two-factor authentication disabled');
    } catch {
      toast.error('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  }

  if (qrUri) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Scan this QR code with your authenticator app, then enter the code below.
        </p>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}`}
          alt="2FA QR Code"
          className="rounded-lg"
          width={200}
          height={200}
        />
        <form onSubmit={handleVerify} className="flex gap-3">
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            className="input w-36 text-center tracking-widest"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            required
          />
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Verifying…' : 'Verify & Enable'}
          </button>
        </form>
      </div>
    );
  }

  return enabled ? (
    <div className="flex items-center gap-4">
      <span className="flex items-center gap-2 text-sm font-medium text-green-600">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Enabled
      </span>
      <button disabled={loading} onClick={handleDisable} className="btn-secondary">
        Disable 2FA
      </button>
    </div>
  ) : (
    <button disabled={loading} onClick={handleEnable} className="btn-primary">
      {loading ? 'Setting up…' : 'Enable 2FA'}
    </button>
  );
}
