import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import prisma from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req })
  if (!session || !session.user?.email) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  const userEmail = session.user.email

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
        console.error('Error fetching notification preferences:', error)
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
        console.error('Error updating notification preferences:', error)
        return res.status(500).json({ message: 'Internal server error' })
      }
    }
    default:
      res.setHeader('Allow', ['GET', 'PUT'])
      return res.status(405).json({ message: `Method ${req.method} not allowed` })
  }
} 