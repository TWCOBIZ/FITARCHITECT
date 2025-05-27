import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import prisma from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req })
  // Optionally, check if the user is an admin here
  if (!session /* || !session.user.isAdmin */) {
    return res.status(401).json({ message: 'Unauthorized' })
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
      return res.status(500).json({ message: 'Failed to fetch users' })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ message: `Method ${req.method} not allowed` })
  }
} 