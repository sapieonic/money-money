/**
 * Manual script to link Telegram to a user
 * Usage: npx ts-node scripts/link-telegram-manually.ts <email> <chatId>
 */
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../src/models/User';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'money-tracker';

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is required');
  process.exit(1);
}

const email = process.argv[2];
const chatId = process.argv[3];

if (!email || !chatId) {
  console.error('Usage: npx ts-node scripts/link-telegram-manually.ts <email> <chatId>');
  console.error('Example: npx ts-node scripts/link-telegram-manually.ts user@example.com 123456789');
  process.exit(1);
}

async function linkTelegram() {
  try {
    await mongoose.connect(MONGODB_URI as string, {
      dbName: MONGODB_DB_NAME,
    });
    console.log(`✅ Connected to MongoDB (${MONGODB_DB_NAME})\n`);

    const user = await User.findOne({ email });

    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`Current Telegram Chat ID: ${user.telegramChatId || 'NOT SET'}\n`);

    user.telegramChatId = parseInt(chatId);
    user.telegramUsername = 'manual_link'; // Placeholder
    await user.save();

    console.log(`✅ Successfully linked Telegram!`);
    console.log(`   Chat ID: ${user.telegramChatId}`);
    console.log(`\n💡 Now you can run: npx ts-node scripts/notify-missing-due-dates.ts`);

    await mongoose.connection.close();
  } catch (err) {
    console.error('\n❌ Error:', err);
    await mongoose.connection.close();
    process.exit(1);
  }
}

linkTelegram().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
