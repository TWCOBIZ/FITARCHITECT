import { getSession } from 'next-auth/react';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import db from '../../../lib/db';

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

const VerifySchema = z.object({ code: z.string().length(6) });

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
  const parse = VerifySchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid code', details: parse.error.errors });
  const { code } = parse.data;
  try {
    const link = await db.userTelegramLink.findUnique({ where: { userId: userAuth.userId } });
    if (!link || link.code !== code) {
      return res.status(400).json({ error: 'Invalid code' });
    }
    await db.userTelegramLink.update({ where: { userId: userAuth.userId }, data: { verified: true } });
    // Optionally, update user profile with chatId
    await db.user.update({ where: { id: userAuth.userId }, data: { telegramChatId: link.chatId } });
    return res.status(200).json({ status: 'verified' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to verify code' });
  }
} 