import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import axios from 'axios';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly resend = new Resend(process.env.RESEND_API_KEY);
  private readonly fromEmail = `${process.env.RESEND_FROM_NAME || 'Jotek'} <${process.env.RESEND_FROM_EMAIL || 'orders@jotek.ng'}>`;

  async sendOrderConfirmation(params: {
    to: string;
    name: string;
    orderNumber: string;
    total: string;
    items: Array<{ name: string; quantity: number; price: string }>;
  }) {
    const itemsList = params.items
      .map((i) => `<li>${i.name} × ${i.quantity} — ₦${i.price}</li>`)
      .join('');

    await this.resend.emails.send({
      from: this.fromEmail,
      to: params.to,
      subject: `Order Confirmed — ${params.orderNumber}`,
      html: `
        <p>Hi ${params.name},</p>
        <p>Your order <strong>${params.orderNumber}</strong> has been confirmed!</p>
        <ul>${itemsList}</ul>
        <p><strong>Total: ₦${params.total}</strong></p>
        <p>We'll notify you when your order is shipped.</p>
        <p>— Jotek Team</p>
      `,
    });
  }

  async sendOrderSms(phone: string, orderNumber: string, status: string) {
    const messages: Record<string, string> = {
      PAID: `Jotek: Your order ${orderNumber} is confirmed & being processed. Thank you!`,
      SHIPPED: `Jotek: Your order ${orderNumber} has been shipped. Track at jotek.ng/track`,
      DELIVERED: `Jotek: Your order ${orderNumber} has been delivered. Enjoy! Rate us at jotek.ng`,
    };

    const message = messages[status];
    if (!message) return;

    try {
      await axios.post(`${process.env.TERMII_BASE_URL}/api/sms/send`, {
        api_key: process.env.TERMII_API_KEY,
        to: phone,
        from: process.env.TERMII_SENDER_ID || 'Jotek',
        sms: message,
        type: 'plain',
        channel: 'dnd',
      });
    } catch (err: any) {
      this.logger.error(`SMS send failed: ${err.message}`);
    }
  }

  async sendAbandonedCartEmail(params: {
    to: string;
    name: string;
    items: Array<{ name: string; variantDescription?: string | null; imageUrl?: string | null; price: string; quantity: number }>;
    cartUrl: string;
  }) {
    const itemRows = params.items
      .map(
        (i) => `
          <tr>
            <td style="padding:12px 0;vertical-align:top;width:64px">
              ${i.imageUrl ? `<img src="${i.imageUrl}" alt="" width="56" height="56" style="border-radius:8px;object-fit:cover" />` : ''}
            </td>
            <td style="padding:12px;vertical-align:top">
              <div style="font-weight:600;color:#111827">${i.name}</div>
              ${i.variantDescription ? `<div style="font-size:12px;color:#6b7280;margin-top:2px">${i.variantDescription}</div>` : ''}
              <div style="font-size:12px;color:#9ca3af;margin-top:4px">Qty: ${i.quantity}</div>
            </td>
            <td style="padding:12px 0;vertical-align:top;text-align:right;font-weight:600;color:#111827">
              ₦${Number(i.price).toLocaleString('en-NG')}
            </td>
          </tr>`,
      )
      .join('');

    await this.resend.emails.send({
      from: this.fromEmail,
      to: params.to,
      subject: 'You left something in your cart',
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:auto;padding:24px">
          <p style="color:#111827">Hi ${params.name},</p>
          <p style="color:#4b5563">Still thinking about these? We've saved them for you — secure them before they sell out.</p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px">${itemRows}</table>
          <div style="margin-top:24px;text-align:center">
            <a href="${params.cartUrl}"
               style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600">
              Complete Your Order
            </a>
          </div>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">
            Not interested anymore? No action needed — we won't email you about this cart again.
          </p>
        </div>
      `,
    });
  }

  async sendBackInStockEmail(params: {
    to: string;
    productName: string;
    variantDescription?: string | null;
    productUrl: string;
    imageUrl?: string | null;
  }) {
    await this.resend.emails.send({
      from: this.fromEmail,
      to: params.to,
      subject: `Back in stock: ${params.productName}`,
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:auto;padding:24px">
          <h2 style="color:#111827;margin:0 0 8px">It's back</h2>
          <p style="color:#4b5563;margin:0 0 16px">The item you wanted is available again — stocks are limited, so grab yours now.</p>
          ${params.imageUrl ? `<img src="${params.imageUrl}" alt="" width="200" style="border-radius:12px;display:block;margin:16px 0" />` : ''}
          <div style="font-weight:600;color:#111827">${params.productName}</div>
          ${params.variantDescription ? `<div style="font-size:12px;color:#6b7280;margin-top:2px">${params.variantDescription}</div>` : ''}
          <div style="margin-top:20px">
            <a href="${params.productUrl}"
               style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600">
              Buy Now
            </a>
          </div>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">
            You're receiving this because you asked to be notified when this item is back in stock.
          </p>
        </div>
      `,
    });
  }

  async sendAdminLowStockAlert(items: Array<{ sku: string; name: string; quantity: number }>) {
    await this.resend.emails.send({
      from: this.fromEmail,
      to: process.env.ADMIN_ALERT_EMAIL || 'admin@jotek.ng',
      subject: `Low Stock Alert — ${items.length} items`,
      html: `
        <p>The following items are running low on stock:</p>
        <ul>
          ${items.map((i) => `<li><strong>${i.name}</strong> (${i.sku}) — ${i.quantity} remaining</li>`).join('')}
        </ul>
        <p><a href="${process.env.ADMIN_URL}/inventory">View Inventory</a></p>
      `,
    });
  }
}
