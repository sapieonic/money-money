/**
 * Debug script to check users in database
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

async function debugUsers() {
  try {
    await mongoose.connect(MONGODB_URI as string, {
      dbName: MONGODB_DB_NAME,
    });
    console.log(`✅ Connected to MongoDB (${MONGODB_DB_NAME})\n`);

    // Count total users
    const totalUsers = await User.countDocuments();
    console.log(`📊 Total users in database: ${totalUsers}\n`);

    if (totalUsers === 0) {
      console.log('❌ No users found in database!');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Get all users
    const allUsers = await User.find({}).limit(10);
    console.log('👥 First 10 users:');
    allUsers.forEach((user, idx) => {
      console.log(`\n${idx + 1}. ${user.name} (${user.email})`);
      console.log(`   Firebase UID: ${user.firebaseUid}`);
      console.log(`   Telegram Chat ID: ${user.telegramChatId || 'NOT SET'}`);
      console.log(`   Telegram Username: ${user.telegramUsername || 'NOT SET'}`);
    });

    // Count users with Telegram
    const usersWithTelegram = await User.countDocuments({
      telegramChatId: { $exists: true, $ne: null },
    });
    console.log(`\n\n📱 Users with Telegram linked: ${usersWithTelegram}`);

    // Try alternative query
    const usersWithTelegramAlt = await User.find({
      telegramChatId: { $ne: null },
    });
    console.log(`📱 Users with telegramChatId not null: ${usersWithTelegramAlt.length}`);

    if (usersWithTelegramAlt.length > 0) {
      console.log('\n🔍 Users with Telegram (alternative query):');
      usersWithTelegramAlt.forEach((user) => {
        console.log(`   - ${user.name}: chatId=${user.telegramChatId}`);
      });
    }

    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  } catch (err) {
    console.error('\n❌ Error:', err);
    await mongoose.connection.close();
    process.exit(1);
  }
}

debugUsers().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
