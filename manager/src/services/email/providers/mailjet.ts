/**
 * Mailjet Email Provider
 * Uses Mailjet Send API v3.1
 *
 * Required environment variables:
 * - MAILJET_API_KEY
 * - MAILJET_SECRET_KEY
 * - MAILJET_FROM_EMAIL
 * - MAILJET_FROM_NAME (optional)
 */

import { EmailProvider, EmailOptions, EmailResult } from '../types';
import { logger } from '../../../utils/telemetry';

interface MailjetMessage {
  From: {
    Email: string;
    Name?: string;
  };
  To: Array<{
    Email: string;
    Name?: string;
  }>;
  Subject: string;
  HTMLPart?: string;
  TextPart?: string;
}

interface MailjetRequest {
  Messages: MailjetMessage[];
}

interface MailjetResponseMessage {
  Status: string;
  To: Array<{
    Email: string;
    MessageUUID: string;
    MessageID: number;
    MessageHref: string;
  }>;
}

interface MailjetResponse {
  Messages: MailjetResponseMessage[];
}

export class MailjetProvider implements EmailProvider {
  name = 'Mailjet';

  private apiKey: string | undefined;
  private secretKey: string | undefined;
  private fromEmail: string | undefined;
  private fromName: string | undefined;

  constructor() {
    this.apiKey = process.env.MAILJET_API_KEY;
    this.secretKey = process.env.MAILJET_SECRET_KEY;
    this.fromEmail = process.env.MAILJET_FROM_EMAIL;
    this.fromName = process.env.MAILJET_FROM_NAME || 'Finance Watch';
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.secretKey && this.fromEmail);
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Mailjet is not configured. Missing API key, secret key, or from email.',
      };
    }

    const payload: MailjetRequest = {
      Messages: [
        {
          From: {
            Email: this.fromEmail!,
            Name: this.fromName,
          },
          To: [
            {
              Email: options.to,
            },
          ],
          Subject: options.subject,
          HTMLPart: options.htmlBody,
          TextPart: options.textBody,
        },
      ],
    };

    try {
      const credentials = Buffer.from(`${this.apiKey}:${this.secretKey}`).toString('base64');

      const response = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Mailjet API error', { status: response.status, error: errorText });
        return {
          success: false,
          error: `Mailjet API error: ${response.status} - ${errorText}`,
        };
      }

      const result = (await response.json()) as MailjetResponse;

      if (result.Messages && result.Messages[0]?.Status === 'success') {
        const messageId = result.Messages[0].To[0]?.MessageUUID;
        logger.info('Email sent successfully via Mailjet', { messageId });
        return {
          success: true,
          messageId,
        };
      }

      return {
        success: false,
        error: 'Mailjet returned unexpected response',
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Failed to send email via Mailjet', { error: errorMessage });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
