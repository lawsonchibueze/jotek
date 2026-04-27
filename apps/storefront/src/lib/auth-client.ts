import { createAuthClient } from 'better-auth/react';
import { phoneNumberClient, adminClient, twoFactorClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  basePath: '/api/auth',
  plugins: [phoneNumberClient(), adminClient(), twoFactorClient()],
});

export const { signIn, signOut, signUp, useSession, getSession } = authClient;

// forgetPassword / resetPassword are dynamically attached by the server's
// emailAndPassword config; the client type doesn't always surface them, so
// we expose thin wrappers that call through authClient.
type ForgetPasswordArgs = { email: string; redirectTo?: string };
type ResetPasswordArgs = { newPassword: string; token: string };
type AuthResult<T> = { data: T | null; error: { message?: string } | null };

export const forgetPassword = (args: ForgetPasswordArgs): Promise<AuthResult<unknown>> =>
  (authClient as any).forgetPassword(args);

export const resetPassword = (args: ResetPasswordArgs): Promise<AuthResult<unknown>> =>
  (authClient as any).resetPassword(args);

export const sendVerificationEmail = (args: { email: string; callbackURL?: string }): Promise<AuthResult<unknown>> =>
  (authClient as any).sendVerificationEmail(args);
