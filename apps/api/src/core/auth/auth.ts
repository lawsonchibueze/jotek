import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, phoneNumber, twoFactor } from 'better-auth/plugins';
import { db } from '../database/db';
import {
  user,
  session,
  account,
  verification,
  twoFactor as twoFactorTable,
} from '../database/schema';

// Better Auth is initialized as a module-level singleton so it can be
// mounted as Express middleware before NestJS's router processes requests.
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:4000',
  secret: process.env.BETTER_AUTH_SECRET!,

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user,
      session,
      account,
      verification,
      twoFactor: twoFactorTable,
    },
    usePlural: false,
  }),

  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    minPasswordLength: 8,
    sendResetPassword: async ({ user: u, token }) => {
      // Better Auth builds its default `url` from the server's baseURL (the API),
      // but the reset page lives on the storefront. Rebuild the URL using the
      // storefront base so the email link points at the right origin.
      const storefront = process.env.STOREFRONT_URL ?? 'http://localhost:3000';
      const resetUrl = `${storefront.replace(/\/$/, '')}/reset-password?token=${token}`;
      const { sendPasswordResetEmail } = await import('../auth/email-helpers');
      await sendPasswordResetEmail(u.email!, u.name, resetUrl);
    },
  },

  emailVerification: {
    sendVerificationEmail: async ({ user: u, url }) => {
      // `url` is the Better Auth verification endpoint on the API, which
      // handles verification and then redirects. Leave as-is.
      const { sendEmailVerificationEmail } = await import('../auth/email-helpers');
      await sendEmailVerificationEmail(u.email!, u.name, url);
    },
  },

  plugins: [
    phoneNumber({
      sendOTP: async ({ phoneNumber: phone, code }) => {
        const { sendSmsOtp } = await import('../auth/sms-helpers');
        await sendSmsOtp(phone, code);
      },
      otpLength: 6,
      expiresIn: 300, // 5 minutes
    }),

    admin({
      defaultRole: 'user',
      // NOTE: custom role hierarchy (super_admin / manager / inventory_clerk /
      // support) needs access-control definitions via createAccessControl from
      // better-auth/plugins/access. For now, use the built-in 'admin' role.
      adminRoles: ['admin'],
      impersonationSessionDuration: 60 * 60, // 1 hour
    }),

    twoFactor({
      issuer: 'Jotek',
      totpOptions: {
        period: 30,
        digits: 6,
      },
    }),
  ],

  trustedOrigins: [
    process.env.STOREFRONT_URL || 'http://localhost:3000',
    process.env.ADMIN_URL || 'http://localhost:3001',
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh session if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 min client-side cache
    },
  },

  rateLimit: {
    window: 60,
    max: 100,
  },
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
