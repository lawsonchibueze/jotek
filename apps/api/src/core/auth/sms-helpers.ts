import axios from 'axios';

interface TermiiResponse {
  code: string;
  message_id: string;
  message: string;
  balance: number;
  user: string;
}

export async function sendSmsOtp(phone: string, code: string): Promise<void> {
  const payload = {
    api_key: process.env.TERMII_API_KEY,
    message_id: `jotek-${Date.now()}`,
    phone_number: phone,
    pin_attempts: 3,
    pin_time_to_live: 5,
    pin_length: 6,
    pin_placeholder: '< 1234 >',
    message_text: `Your Jotek verification code is < 1234 >. Valid for 5 minutes. Do not share.`,
    pin_type: 'NUMERIC',
    channel: 'dnd',
    type: 'ALPHANUMERIC',
    to: phone,
    from: process.env.TERMII_SENDER_ID || 'Jotek',
    sms: `Your Jotek code is ${code}. Expires in 5 mins. Don't share it.`,
  };

  // Use the direct OTP endpoint for better control
  await axios.post(`${process.env.TERMII_BASE_URL}/api/sms/otp/send`, payload);
}
