import { createAuthClient } from 'better-auth/react';
import { adminClient, twoFactorClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  basePath: '/api/auth',
  plugins: [adminClient(), twoFactorClient()],
});

export const { signIn, signOut, useSession, getSession } = authClient;
