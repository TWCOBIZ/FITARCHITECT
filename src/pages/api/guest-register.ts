import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

function generateGuestEmail() {
  return `guest_${Date.now()}_${Math.floor(Math.random() * 10000)}@guest.local`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  try {
    const email = generateGuestEmail();
    const name = 'Guest User';
    // Create guest user in Prisma
    const user = await prisma.userProfile.create({
      data: {
        email,
        name,
        type: 'guest',
        // Add any other default/temporary fields as needed
      },
    });
    const userObj = {
      id: user.id,
      email: user.email,
      name: user.name,
      isGuest: true,
      // Add more fields as needed for your User type
    };
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({ token, user: userObj });
  } catch (error) {
    console.error('Guest register error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 