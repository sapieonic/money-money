import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { connectToDatabase } from '../utils/db';
import { User } from '../models/User';
import { DailyExpense } from '../models/DailyExpense';
import { TelegramLinkCode } from '../models/TelegramLinkCode';
import { success, error, notFound, badRequest } from '../utils/response';
import { withAuth } from '../middleware/auth';
import { AuthenticatedEvent } from '../types';
import {
  sendTelegramMessage,
  generateLinkCode,
  parseExpenseMessage,
  isLinkCommand,
  isStartCommand,
  isHelpCommand,
  getHelpMessage,
  TelegramUpdate,
} from '../services/telegram';
import { startRequestSpan, checkColdStart, recordError, flush } from '../utils/telemetry';

// POST /api/telegram/webhook - Receives messages from Telegram (no auth)
export const webhook = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const result = await startRequestSpan(
    'POST /api/telegram/webhook',
    {
      'http.method': 'POST',
      'http.route': '/api/telegram/webhook',
      'telegram.webhook': true,
    },
    async () => {
      checkColdStart();
      try {
    await connectToDatabase();

    const update: TelegramUpdate = JSON.parse(event.body || '{}');
    const message = update.message;

    if (!message || !message.text) {
      return success({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const username = message.from?.username || message.chat.username || '';

    // Handle /start command
    if (isStartCommand(text)) {
      await sendTelegramMessage(
        chatId,
        `Welcome to <b>Finance Watch Bot</b>!

I help you track daily expenses by parsing your forwarded bank SMS messages.

To get started, link your account using /link command, then enter the code in the Finance Watch app Settings page.

Use /help for more information.`
      );
      return success({ ok: true });
    }

    // Handle /help command
    if (isHelpCommand(text)) {
      await sendTelegramMessage(chatId, getHelpMessage());
      return success({ ok: true });
    }

    // Handle /link command
    if (isLinkCommand(text)) {
      // Generate a new link code
      const code = generateLinkCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Invalidate any existing codes for this chat
      await TelegramLinkCode.updateMany(
        { telegramChatId: chatId, used: false },
        { used: true }
      );

      // Create new link code
      await TelegramLinkCode.create({
        code,
        telegramChatId: chatId,
        telegramUsername: username,
        expiresAt,
        used: false,
      });

      await sendTelegramMessage(
        chatId,
        `Your link code is: <b>${code}</b>

Enter this code in Finance Watch app:
Settings → Telegram Integration → Enter Code

This code expires in 10 minutes.`
      );
      return success({ ok: true });
    }

    // For any other message, try to parse it as an expense
    // First, check if the user is linked
    const user = await User.findOne({ telegramChatId: chatId });

    if (!user) {
      await sendTelegramMessage(
        chatId,
        `Please link your account first.

Send /link to get a code, then enter it in the Finance Watch app Settings.`
      );
      return success({ ok: true });
    }

    // Try to parse the message as an expense using LLM
    const parseResult = await parseExpenseMessage(text);

    if (!parseResult.success || !parseResult.data) {
      await sendTelegramMessage(
        chatId,
        `I couldn't parse your message.

${parseResult.error || 'Please forward a bank SMS that contains an amount like "Rs.500" or "INR 250".'}

Example: "Rs.500 debited at Amazon"`
      );
      return success({ ok: true });
    }

    const parsedExpense = parseResult.data;

    // Create the daily expense
    await DailyExpense.create({
      userId: user.firebaseUid,
      amount: parsedExpense.amount,
      description: parsedExpense.description,
      vendor: parsedExpense.vendor,
      category: parsedExpense.category,
      date: new Date(parsedExpense.date),
      currency: 'INR',
      isActive: true,
    });

    const vendorText = parsedExpense.vendor ? ` @ ${parsedExpense.vendor}` : '';
    const confidenceText = parsedExpense.confidence && parsedExpense.confidence < 0.7
      ? '\n\n<i>Note: Low confidence parsing. Please verify the details.</i>'
      : '';

    await sendTelegramMessage(
      chatId,
      `✅ <b>Expense Added!</b>

Amount: ₹${parsedExpense.amount.toLocaleString('en-IN')}${vendorText}
Category: ${parsedExpense.category}
Date: ${parsedExpense.date}${confidenceText}

View in Finance Watch → Daily Expenses`
    );

    return success({ ok: true });
      } catch (err) {
        console.error('Error processing Telegram webhook:', err);
        if (err instanceof Error) {
          recordError(err, { 'telegram.error': 'webhook_processing' });
        }
        // Always return 200 to Telegram to acknowledge receipt
        return success({ ok: true });
      }
    }
  );

  await flush();
  return result;
};

// GET /api/telegram/status - Check if user has linked Telegram
export const status = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const user = await User.findOne({ firebaseUid: event.userId });

    if (!user) {
      return notFound('User not found');
    }

    return success({
      linked: !!user.telegramChatId,
      username: user.telegramUsername || null,
    });
  } catch (err) {
    console.error('Error fetching Telegram status:', err);
    return error('Failed to fetch Telegram status');
  }
});

// POST /api/telegram/verify-code - Verify link code and connect account
export const verifyCode = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const body = JSON.parse(event.body || '{}');
    const { code } = body;

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return badRequest('Invalid code format. Please enter a 6-digit code.');
    }

    // Find the link code
    const linkCode = await TelegramLinkCode.findOne({
      code,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!linkCode) {
      return badRequest('Invalid or expired code. Please request a new code using /link in Telegram.');
    }

    // Check if this telegram account is already linked to another user
    const existingUser = await User.findOne({ telegramChatId: linkCode.telegramChatId });
    if (existingUser && existingUser.firebaseUid !== event.userId) {
      return badRequest('This Telegram account is already linked to another user.');
    }

    // Update the user with the telegram details
    const user = await User.findOneAndUpdate(
      { firebaseUid: event.userId },
      {
        telegramChatId: linkCode.telegramChatId,
        telegramUsername: linkCode.telegramUsername,
      },
      { new: true }
    );

    if (!user) {
      return notFound('User not found');
    }

    // Mark the code as used
    linkCode.used = true;
    await linkCode.save();

    // Send confirmation to Telegram
    await sendTelegramMessage(
      linkCode.telegramChatId,
      `✅ <b>Account Linked Successfully!</b>

Your Telegram is now connected to Finance Watch.

You can now forward bank SMS messages to me, and I'll automatically add them as expenses.`
    );

    return success({
      linked: true,
      username: user.telegramUsername,
    });
  } catch (err) {
    console.error('Error verifying Telegram code:', err);
    return error('Failed to verify code');
  }
});

// DELETE /api/telegram/unlink - Disconnect Telegram account
export const unlink = withAuth(async (event: AuthenticatedEvent): Promise<APIGatewayProxyResultV2> => {
  try {
    await connectToDatabase();

    const user = await User.findOne({ firebaseUid: event.userId });

    if (!user) {
      return notFound('User not found');
    }

    if (!user.telegramChatId) {
      return badRequest('No Telegram account linked');
    }

    const chatId = user.telegramChatId;

    // Remove telegram details from user
    user.telegramChatId = undefined;
    user.telegramUsername = undefined;
    await user.save();

    // Notify on Telegram
    await sendTelegramMessage(
      chatId,
      `Your Telegram account has been disconnected from Finance Watch.

Use /link to reconnect anytime.`
    );

    return success({
      linked: false,
      message: 'Telegram account unlinked successfully',
    });
  } catch (err) {
    console.error('Error unlinking Telegram:', err);
    return error('Failed to unlink Telegram account');
  }
});
