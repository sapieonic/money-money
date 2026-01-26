/**
 * Email Service
 * Uses the email provider factory to send emails
 */

import { getEmailProvider } from './factory';
import { EmailOptions } from './types';

/**
 * Send an email using the configured provider
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const provider = getEmailProvider();
  const result = await provider.send(options);
  return result.success;
}

/**
 * Send weekly expense summary email
 */
export async function sendWeeklyExpenseSummary(
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<boolean> {
  return sendEmail({
    to,
    subject,
    htmlBody,
    textBody,
  });
}
