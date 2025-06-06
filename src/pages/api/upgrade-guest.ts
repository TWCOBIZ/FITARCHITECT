import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token' });
  }
  const token = auth.split(' ')[1];
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
  const { email, password, name, height, weight, age, gender, fitnessGoals, activityLevel, dietaryPreferences } = req.body;
  if (!email || !password || !name || height == null || weight == null || age == null || !gender || !fitnessGoals || !activityLevel || !dietaryPreferences) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  try {
    const guest = await prisma.userProfile.findUnique({ where: { id: payload.userId } });
    if (!guest || guest.type !== 'guest') {
      return res.status(404).json({ message: 'Guest user not found' });
    }
    const hashed = await bcrypt.hash(password, 10);
    // Update guest user to registered
    const user = await prisma.userProfile.update({
      where: { id: guest.id },
      data: {
        email,
        password: hashed,
        name,
        height: parseFloat(height),
        weight: parseFloat(weight),
        age: parseInt(age),
        gender,
        fitnessGoals,
        activityLevel,
        dietaryPreferences,
        type: 'registered',
        // Preserve other guest data as needed
      },
    });
    const userObj = {
      id: user.id,
      email: user.email,
      name: user.name,
      isGuest: false,
      // Add more fields as needed for your User type
    };
    const newToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({ token: newToken, user: userObj });
  } catch (error) {
    console.error('Upgrade guest error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 