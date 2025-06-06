import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import prisma from '../../../lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

function getTokenFromHeader(req: NextApiRequest) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.split(' ')[1];
  }
  return null;
}

async function getUserFromRequest(req: NextApiRequest) {
  const session = await getSession({ req });
  if (session && session.user?.isAdmin) {
    return { isAdmin: true };
  }
  const token = getTokenFromHeader(req);
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (typeof payload === 'object' && (payload as any).isAdmin) {
        return { isAdmin: true };
      }
    } catch (e) {
      console.error('[ADMIN-USERS] Invalid JWT:', e);
      return null;
    }
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth || !userAuth.isAdmin) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const users = await prisma.userProfile.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          createdAt: true,
        }
      })
      return res.status(200).json(users)
    } catch (error) {
      console.error('[ADMIN-USERS] Failed to fetch users:', error);
      return res.status(500).json({ message: 'Failed to fetch users' })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ message: `Method ${req.method} not allowed` })
  }
} 