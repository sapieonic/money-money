/**
 * Migration Script: Populate emailPreferences for all users
 *
 * This script sets emailPreferences.weeklyExpenseSummary = true for all users
 * who don't have this field set.
 *
 * Usage:
 *   npx ts-node scripts/migrate-email-preferences.ts
 *
 * Or with environment variables:
 *   MONGODB_URI=mongodb+srv://... npx ts-node scripts/migrate-email-preferences.ts
 */
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is required');
  process.exit(1);
}

async function migrate() {
  console.log('NOT NEEDED ANYMORE');
  return;
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
