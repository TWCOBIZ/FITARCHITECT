// Implement POST for Telegram webhook, process commands, update DB 
import { telegramService } from '../../../services/telegramService';
import db from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
  try {
    const body = req.body;
    if (!body || !body.message) return res.status(400).json({ error: 'Invalid webhook payload' });
    const chatId = body.message.chat.id;
    const text = body.message.text || '';
    // Simple command handling
    if (text.startsWith('/start')) {
      await telegramService.setConfig({ chatId });
      await telegramService.sendMessage('Welcome to FitArchitect! Use /link in the app to connect your account.');
    } else if (text.startsWith('/help')) {
      await telegramService.setConfig({ chatId });
      await telegramService.sendMessage('FitArchitect bot commands:\n/start - Welcome\n/help - This help message\nYou will receive notifications here if you link your account.');
    } else if (text.startsWith('/link')) {
      await telegramService.setConfig({ chatId });
      await telegramService.sendMessage('To link your account, go to FitArchitect app > Settings > Telegram and enter your chat ID.');
    } else {
      await telegramService.setConfig({ chatId });
      await telegramService.sendMessage('Unknown command. Type /help for options.');
    }
    // Optionally, log messages to DB
    await db.telegramMessage.create({ data: { chatId: String(chatId), text } });
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to process webhook' });
  }
} 