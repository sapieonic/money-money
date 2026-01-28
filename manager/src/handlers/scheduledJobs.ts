/**
 * Scheduled Jobs Handler
 * Handles cron-triggered tasks like weekly email summaries
 */

import { ScheduledEvent, Context } from 'aws-lambda';
import { connectToDatabase } from '../utils/db';
import { User } from '../models/User';
import { generateWeeklyAnalytics } from '../services/analytics';
import {
  sendWeeklyExpenseSummary,
  generateWeeklyExpenseEmailHTML,
  generateWeeklyExpenseEmailText,
} from '../services/email';
import { startRequestSpan, checkColdStart, recordError, flush, logger } from '../utils/telemetry';

/**
 * Send weekly expense summary emails to all opted-in users
 * Triggered every Monday at 9 AM IST
 */
export const sendWeeklyExpenseSummaries = async (
  event: ScheduledEvent,
  context: Context
): Promise<{ success: boolean; processed: number; sent: number; errors: number }> => {
  const result = await startRequestSpan(
    'scheduled.weeklyExpenseSummary',
    {
      'faas.trigger': 'timer',
      'scheduled.job': 'weekly_expense_summary',
    },
    async () => {
      checkColdStart();
      logger.info('Starting weekly expense summary job');

      try {
    await connectToDatabase();

    // Find all users who have opted in for weekly summaries
    const users = await User.find({
      'emailPreferences.weeklyExpenseSummary': true,
    });

    logger.info('Found users opted in for weekly summaries', { count: users.length });

    let sent = 0;
    let errors = 0;

    // Get reference date for last week (previous Monday to Sunday)
    const today = new Date();
    const lastWeekDate = new Date(today);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);

    for (const user of users) {
      try {
        // Generate analytics for the user
        const analytics = await generateWeeklyAnalytics(user.firebaseUid, lastWeekDate);

        // Skip if no expenses this week
        if (analytics.transactionCount === 0) {
          logger.info('Skipping user - no expenses last week', { email: user.email });
          continue;
        }

        // Generate email content
        const htmlBody = generateWeeklyExpenseEmailHTML(analytics, user.name);
        const textBody = generateWeeklyExpenseEmailText(analytics, user.name);
        const subject = `📊 Your Weekly Expense Summary (${analytics.weekStart} - ${analytics.weekEnd})`;

        // Send email
        const success = await sendWeeklyExpenseSummary(
          user.email,
          subject,
          htmlBody,
          textBody
        );

        if (success) {
          sent++;
          logger.info('Sent weekly summary', { email: user.email });
        } else {
          errors++;
          logger.error('Failed to send weekly summary', { email: user.email });
        }
      } catch (err) {
        errors++;
        logger.error('Error processing user', { email: user.email, error: String(err) });
      }
    }

    logger.info('Weekly summary job complete', { sent, errors });

    return {
          success: true,
          processed: users.length,
          sent,
          errors,
        };
      } catch (err) {
        logger.error('Weekly summary job failed', { error: String(err) });
        if (err instanceof Error) {
          recordError(err, { 'scheduled.error': 'weekly_summary_failed' });
        }
        return {
          success: false,
          processed: 0,
          sent: 0,
          errors: 1,
        };
      }
    }
  );

  try {
    await flush();
  } catch (e) {
    console.error('Telemetry flush error:', e);
  }
  return result;
};

/**
 * Manual trigger for testing - sends summary to a specific user
 */
export const sendTestWeeklySummary = async (
  event: { userId?: string; email?: string },
  context: Context
): Promise<{ success: boolean; message: string }> => {
  try {
    await connectToDatabase();

    const user = event.userId
      ? await User.findOne({ firebaseUid: event.userId })
      : event.email
        ? await User.findOne({ email: event.email })
        : null;

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Generate analytics for last week
    const lastWeekDate = new Date();
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const analytics = await generateWeeklyAnalytics(user.firebaseUid, lastWeekDate);

    if (analytics.transactionCount === 0) {
      return { success: false, message: 'No expenses found for last week' };
    }

    const htmlBody = generateWeeklyExpenseEmailHTML(analytics, user.name);
    const textBody = generateWeeklyExpenseEmailText(analytics, user.name);
    const subject = `📊 Your Weekly Expense Summary (${analytics.weekStart} - ${analytics.weekEnd})`;

    const success = await sendWeeklyExpenseSummary(
      user.email,
      subject,
      htmlBody,
      textBody
    );

    return {
      success,
      message: success ? `Email sent to ${user.email}` : 'Failed to send email',
    };
  } catch (err) {
    logger.error('Test summary failed', { error: String(err) });
    return { success: false, message: String(err) };
  }
};
