import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const { email, password } = req.body;
  // Log incoming request (mask password)
  console.log(`[LOGIN] Attempt for email: ${email}, password: ${password ? '***' : '[empty]'}`);
  if (!email || !password) {
    console.log('[LOGIN] Missing required fields');
    return res.status(400).json({ message: 'Missing required fields' });
  }
  try {
    const user = await prisma.userProfile.findUnique({ where: { email } });
    console.log('[LOGIN] User lookup result:', user ? `Found user ${user.id}` : 'User not found');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password);
    console.log('[LOGIN] Password comparison:', valid ? 'Valid' : 'Invalid');
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // Build richer user object for AuthContext (see src/types/user.ts)
    const userProfile = {
      id: user.id,
      email: user.email,
      firstName: user.name?.split(' ')[0] || '',
      lastName: user.name?.split(' ').slice(1).join(' ') || '',
      dateOfBirth: null, // Not present, can be derived from age if needed
      gender: user.gender || null,
      height: user.height || null,
      weight: user.weight || null,
      fitnessLevel: user.experienceLevel || null,
      goals: user.fitnessGoals || [],
      availableEquipment: user.equipmentPreferences || [],
      preferredWorkoutDuration: user.preferredWorkoutDuration || null,
      daysPerWeek: user.daysPerWeek || null,
      parqAnswers: user.parqAnswers || null,
      nutritionProfile: user.nutritionProfile || null,
      activityLevel: user.activityLevel || null,
      dietaryPreferences: user.dietaryPreferences || [],
      notifications: {
        email: user.emailNotifications,
        telegram: user.telegramEnabled,
        telegramChatId: user.telegramChatId || null,
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    const userPreferences = {
      theme: 'system', // Default, can be updated later
      notifications: {
        workoutReminders: true,
        progressUpdates: true,
        achievementAlerts: true,
      },
      units: {
        weight: 'lbs',
        height: 'inches',
        distance: 'mi',
      },
    };
    const subscription = {
      plan: user.tier || 'free',
      status: user.subscriptionStatus || 'inactive',
      startDate: null,
      endDate: null,
    };
    const userObj = {
      id: user.id,
      email: user.email,
      profile: userProfile,
      preferences: userPreferences,
      subscription,
      parqCompleted: user.parqCompleted || false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      type: user.type || 'registered',
      isGuest: user.type === 'guest',
    };
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({ token, user: userObj });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 