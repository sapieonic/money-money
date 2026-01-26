/**
 * Email Provider Factory
 * Selects the appropriate email provider based on configuration
 */

import { EmailProvider, EmailProviderType } from './types';
import { MailjetProvider } from './providers/mailjet';
import { ConsoleProvider } from './providers/console';

// Singleton instances
let mailjetProvider: MailjetProvider | null = null;
let consoleProvider: ConsoleProvider | null = null;

/**
 * Get the Mailjet provider instance
 */
function getMailjetProvider(): MailjetProvider {
  if (!mailjetProvider) {
    mailjetProvider = new MailjetProvider();
  }
  return mailjetProvider;
}

/**
 * Get the Console provider instance (fallback)
 */
function getConsoleProvider(): ConsoleProvider {
  if (!consoleProvider) {
    consoleProvider = new ConsoleProvider();
  }
  return consoleProvider;
}

/**
 * Get a specific email provider by type
 */
export function getEmailProviderByType(type: EmailProviderType): EmailProvider {
  switch (type) {
    case 'mailjet':
      return getMailjetProvider();
    case 'console':
      return getConsoleProvider();
    default:
      console.warn(`Unknown email provider type: ${type}, falling back to console`);
      return getConsoleProvider();
  }
}

/**
 * Get the configured email provider
 * Priority:
 * 1. EMAIL_PROVIDER env var (explicit selection)
 * 2. Auto-detect based on available credentials
 * 3. Fallback to console provider
 */
export function getEmailProvider(): EmailProvider {
  const explicitProvider = process.env.EMAIL_PROVIDER as EmailProviderType | undefined;

  // If explicitly configured, use that provider
  if (explicitProvider) {
    const provider = getEmailProviderByType(explicitProvider);
    if (provider.isConfigured()) {
      console.log(`Using explicitly configured email provider: ${provider.name}`);
      return provider;
    }
    console.warn(`Explicitly configured provider ${explicitProvider} is not properly configured`);
  }

  // Auto-detect based on available credentials
  const mailjet = getMailjetProvider();
  if (mailjet.isConfigured()) {
    console.log(`Auto-detected email provider: ${mailjet.name}`);
    return mailjet;
  }

  // Fallback to console
  console.warn('No email provider configured. Using console provider (emails will not be sent).');
  return getConsoleProvider();
}
