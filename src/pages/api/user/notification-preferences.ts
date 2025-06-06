import { NextApiRequest, NextApiResponse } from 'next'
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
  if (session && session.user?.email) {
    return { email: session.user.email };
  }
  const token = getTokenFromHeader(req);
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (typeof payload === 'object' && (payload as any).email) {
        return { email: (payload as any).email };
      }
    } catch (e) {
      console.error('[NOTIF-PREF] Invalid JWT:', e);
      return null;
    }
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth || !userAuth.email) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const userEmail = userAuth.email;

  switch (req.method) {
    case 'GET': {
      try {
        const profile = await prisma.userProfile.findUnique({
          where: { email: userEmail },
          select: { notificationPreferences: true }
        })
        if (!profile) {
          return res.status(404).json({ message: 'Profile not found' })
        }
        return res.status(200).json(profile.notificationPreferences || {})
      } catch (error) {
        console.error('[NOTIF-PREF] Error fetching notification preferences:', error)
        return res.status(500).json({ message: 'Internal server error' })
      }
    }
    case 'PUT': {
      try {
        const preferences = req.body
        const updated = await prisma.userProfile.update({
          where: { email: userEmail },
          data: { notificationPreferences: preferences }
        })
        return res.status(200).json(updated.notificationPreferences)
      } catch (error) {
        console.error('[NOTIF-PREF] Error updating notification preferences:', error)
        return res.status(500).json({ message: 'Internal server error' })
      }
    }
    default:
      res.setHeader('Allow', ['GET', 'PUT'])
      return res.status(405).json({ message: `Method ${req.method} not allowed` })
  }
} 