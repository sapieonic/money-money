/**
 * Email Provider Types and Interfaces
 */

export interface EmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email Provider Interface
 * All email providers must implement this interface
 */
export interface EmailProvider {
  /**
   * Provider name for logging
   */
  name: string;

  /**
   * Check if the provider is configured
   */
  isConfigured(): boolean;

  /**
   * Send an email
   */
  send(options: EmailOptions): Promise<EmailResult>;
}

/**
 * Supported email providers
 */
export type EmailProviderType = 'mailjet' | 'ses' | 'console';
