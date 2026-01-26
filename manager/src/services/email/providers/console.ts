/**
 * Console Email Provider (Fallback)
 * Logs emails to console instead of sending them
 * Used for development and when no email provider is configured
 */

import { EmailProvider, EmailOptions, EmailResult } from '../types';

export class ConsoleProvider implements EmailProvider {
  name = 'Console (Development)';

  isConfigured(): boolean {
    // Always available as fallback
    return true;
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    console.log('='.repeat(60));
    console.log('EMAIL (Console Provider - Not Actually Sent)');
    console.log('='.repeat(60));
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('-'.repeat(60));
    console.log('Text Body:');
    console.log(options.textBody);
    console.log('='.repeat(60));

    return {
      success: true,
      messageId: `console-${Date.now()}`,
    };
  }
}
