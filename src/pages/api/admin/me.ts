import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token' });
  }
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; isAdmin: boolean };
    if (!payload.isAdmin) return res.status(403).json({ message: 'Forbidden' });
    const user = await prisma.userProfile.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isAdmin) return res.status(403).json({ message: 'Not an admin' });
    res.status(200).json({ id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin });
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
} 