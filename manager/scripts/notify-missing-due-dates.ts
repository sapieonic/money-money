/**
 * Notification Script: Notify users about expenses without due dates
 *
 * This script sends a Telegram message to users who have recurring expenses
 * without due dates set, encouraging them to add due dates for reminders.
 *
 * Usage:
 *   cd manager
 *   npx ts-node scripts/notify-missing-due-dates.ts
 *
 * Or with environment variables:
 *   MONGODB_URI=mongodb+srv://... npx ts-node scripts/notify-missing-due-dates.ts
 */
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { Expense } from '../src/models/Expense';
import { sendTelegramMessage } from '../src/services/telegram';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'money-tracker';

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is required');
  process.exit(1);
}

/**
 * Generate message text for user
 */
function generateNotificationMessage(userName: string, expenses: any[]): string {
  const expenseList = expenses.map((e) => `• ${e.name}`).join('\n');

  return `Hey ${userName}! 👋

📋 <b>Action Required: Set Due Dates for Your Expenses</b>

You have <b>${expenses.length} recurring expense${expenses.length > 1 ? 's' : ''}</b> without due dates set:

${expenseList}

<b>Why set due dates?</b>
✅ Get timely payment reminders
✅ Plan your monthly budget better
✅ Never miss a deadline

📱 Set them now in Finance Watch → Expenses → Edit each expense

Need help? Reply to this message!`;
}

/**
 * Main notification function
 */
async function notifyUsers() {
  console.log('🚀 Starting notification script...');
  console.log('📡 Connecting to MongoDB...');

  try {
    await mongoose.connect(MONGODB_URI as string, {
      dbName: MONGODB_DB_NAME,
    });
    console.log(`✅ Connected to MongoDB (${MONGODB_DB_NAME})`);

    // Find all users with Telegram linked
    const users = await User.find({
      telegramChatId: { $exists: true, $ne: null },
    });

    console.log(`\n👥 Found ${users.length} users with Telegram linked`);

    let processed = 0;
    let notified = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      processed++;

      try {
        // Find expenses without due dates for this user
        const expensesWithoutDueDate = await Expense.find({
          userId: user.firebaseUid,
          isRecurring: true,
          isActive: true,
          $or: [{ dueDate: { $exists: false } }, { dueDate: null }],
        });

        // Skip if no expenses without due dates
        if (expensesWithoutDueDate.length === 0) {
          skipped++;
          console.log(`⏭️  Skipped ${user.name} - no expenses without due dates`);
          continue;
        }

        // Generate and send message
        const message = generateNotificationMessage(user.name, expensesWithoutDueDate);
        const sent = await sendTelegramMessage(user.telegramChatId!, message);

        if (sent) {
          notified++;
          console.log(
            `✉️  Notified ${user.name} (${expensesWithoutDueDate.length} expenses without due dates)`
          );
        } else {
          errors++;
          console.error(`❌ Failed to send message to ${user.name}`);
        }
      } catch (err) {
        errors++;
        console.error(`❌ Error processing ${user.name}:`, err);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total users processed: ${processed}`);
    console.log(`   Users notified: ${notified}`);
    console.log(`   Users skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
    console.log('\n✅ Notification script completed successfully!');

    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Script failed:', err);
    await mongoose.connection.close();
    process.exit(1);
  }
}

notifyUsers().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
