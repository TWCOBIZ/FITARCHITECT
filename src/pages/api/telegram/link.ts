import { getSession } from 'next-auth/react';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import db from '../../../lib/db';
import { telegramService } from '../../../services/telegramService';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

function getTokenFromHeader(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.split(' ')[1];
  }
  return null;
}

async function getUserFromRequest(req) {
  const session = await getSession({ req });
  if (session && session.user?.id) {
    return { userId: session.user.id, type: session.user.type || 'registered', subscription: session.user.subscription || 'free' };
  }
  const token = getTokenFromHeader(req);
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (typeof payload === 'object' && payload.userId) {
        return { userId: payload.userId, type: payload.type || 'registered', subscription: payload.subscription || 'free' };
      }
    } catch (e) {
      return null;
    }
  }
  return null;
}

const LinkSchema = z.object({ chatId: z.string().min(5) });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
  const userAuth = await getUserFromRequest(req);
  if (!userAuth || !userAuth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (userAuth.subscription !== 'premium') {
    return res.status(403).json({ error: 'Premium required' });
  }
  const parse = LinkSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid chatId', details: parse.error.errors });
  const { chatId } = parse.data;
  try {
    // Generate code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Store in DB
    await db.userTelegramLink.upsert({
      where: { userId: userAuth.userId },
      update: { chatId, code, verified: false },
      create: { userId: userAuth.userId, chatId, code, verified: false }
    });
    // Send code via Telegram
    await telegramService.setConfig({ chatId });
    await telegramService.sendMessage(`Your FitArchitect verification code: ${code}`);
    return res.status(200).json({ status: 'sent' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to send code' });
  }
} 