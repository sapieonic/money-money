/**
 * Feature Promo Script: Send promotional message about new features
 *
 * Supports sending via Telegram (promo.txt) and/or Email (promo-email.txt).
 * Both files use {userName} as a placeholder for personalisation.
 *
 * Usage:
 *   cd manager
 *   npx ts-node scripts/send-feature-promo.ts                # send both
 *   npx ts-node scripts/send-feature-promo.ts --telegram      # Telegram only
 *   npx ts-node scripts/send-feature-promo.ts --email         # Email only
 *
 * Or with environment variables:
 *   MONGODB_URI=mongodb+srv://... npx ts-node scripts/send-feature-promo.ts
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { sendTelegramMessage } from '../src/services/telegram';
import { sendEmail } from '../src/services/email';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'money-tracker';

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is required');
  process.exit(1);
}

// Parse CLI flags
const args = process.argv.slice(2);
const telegramOnly = args.includes('--telegram');
const emailOnly = args.includes('--email');
const sendTelegram = telegramOnly || (!telegramOnly && !emailOnly);
const sendEmailFlag = emailOnly || (!telegramOnly && !emailOnly);

/**
 * Read a template file from the scripts directory
 */
function readTemplate(filename: string): string {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: ${filename} not found at`, filePath);
    process.exit(1);
  }
  return fs.readFileSync(filePath, 'utf-8').trim();
}

/**
 * Personalize a template for a user
 */
function personalizeMessage(template: string, userName: string): string {
  return template.replace(/\{userName\}/g, userName);
}

/**
 * Strip HTML tags to produce a plain-text fallback
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '  - ')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&rarr;/g, '→')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x[0-9A-Fa-f]+;/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Main promo sending function
 */
async function sendFeaturePromo() {
  console.log('🚀 Starting feature promo script...');
  console.log(`   Channels: ${sendTelegram ? 'Telegram' : ''}${sendTelegram && sendEmailFlag ? ' + ' : ''}${sendEmailFlag ? 'Email' : ''}`);

  let telegramTemplate = '';
  let emailHtmlTemplate = '';

  if (sendTelegram) {
    telegramTemplate = readTemplate('promo.txt');
    console.log('📄 Loaded Telegram template from promo.txt');
  }
  if (sendEmailFlag) {
    emailHtmlTemplate = readTemplate('promo-email.txt');
    console.log('📄 Loaded Email template from promo-email.txt');
  }

  console.log('📡 Connecting to MongoDB...');

  try {
    await mongoose.connect(MONGODB_URI as string, {
      dbName: MONGODB_DB_NAME,
    });
    console.log(`✅ Connected to MongoDB (${MONGODB_DB_NAME})`);

    const users = await User.find({});
    console.log(`\n👥 Found ${users.length} total users`);

    let processed = 0;
    let telegramSent = 0;
    let emailSent = 0;
    let telegramErrors = 0;
    let emailErrors = 0;
    let skipped = 0;

    for (const user of users) {
      processed++;
      let didSomething = false;

      // Telegram
      if (sendTelegram && user.telegramChatId) {
        try {
          const message = personalizeMessage(telegramTemplate, user.name);
          const sent = await sendTelegramMessage(user.telegramChatId, message);
          if (sent) {
            telegramSent++;
            console.log(`📱 Telegram sent to ${user.name}`);
          } else {
            telegramErrors++;
            console.error(`❌ Telegram failed for ${user.name}`);
          }
          didSomething = true;
        } catch (err) {
          telegramErrors++;
          console.error(`❌ Telegram error for ${user.name}:`, err);
        }
      }

      // Email
      if (sendEmailFlag && user.email) {
        try {
          const htmlBody = personalizeMessage(emailHtmlTemplate, user.name);
          const textBody = personalizeMessage(htmlToPlainText(emailHtmlTemplate), user.name);
          const sent = await sendEmail({
            to: user.email,
            subject: '🎉 New Feature: Debt Snowball Calculator — Finance Watch',
            htmlBody,
            textBody,
          });
          if (sent) {
            emailSent++;
            console.log(`📧 Email sent to ${user.name} (${user.email})`);
          } else {
            emailErrors++;
            console.error(`❌ Email failed for ${user.name} (${user.email})`);
          }
          didSomething = true;
        } catch (err) {
          emailErrors++;
          console.error(`❌ Email error for ${user.name}:`, err);
        }
      }

      if (!didSomething) {
        skipped++;
        console.log(`⏭️  Skipped ${user.name} — no reachable channel`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total users processed: ${processed}`);
    if (sendTelegram) {
      console.log(`   Telegram sent: ${telegramSent}, errors: ${telegramErrors}`);
    }
    if (sendEmailFlag) {
      console.log(`   Emails sent: ${emailSent}, errors: ${emailErrors}`);
    }
    console.log(`   Skipped (no channel): ${skipped}`);
    console.log('\n✅ Feature promo script completed!');

    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Script failed:', err);
    await mongoose.connection.close();
    process.exit(1);
  }
}

sendFeaturePromo().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
