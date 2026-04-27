import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `${process.env.RESEND_FROM_NAME || 'Jotek'} <${process.env.RESEND_FROM_EMAIL || 'noreply@jotek.ng'}>`;

export async function sendPasswordResetEmail(email: string, name: string, url: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Reset your Jotek password',
    html: `
      <p>Hi ${name},</p>
      <p>Click the link below to reset your password. It expires in 1 hour.</p>
      <p><a href="${url}">Reset Password</a></p>
      <p>If you didn't request this, ignore this email.</p>
    `,
  });
}

export async function sendEmailVerificationEmail(email: string, name: string, url: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Verify your Jotek email address',
    html: `
      <p>Hi ${name},</p>
      <p>Please verify your email address by clicking the link below.</p>
      <p><a href="${url}">Verify Email</a></p>
    `,
  });
}
