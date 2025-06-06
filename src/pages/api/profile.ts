import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '../../utils/auth';
import { Profile } from '../../types/user';
import { ProfileUpdateSchema } from '../../validation/profileValidation';
import { prisma } from '../../lib/prisma';
import { z } from 'zod';

const NutritionProfileSchema = z.object({
  calorieGoal: z.number().min(800).max(6000),
  dietaryPreferences: z.array(z.string()),
  allergies: z.array(z.string()),
  macroTargets: z.object({
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const userId = session.user.id;

  if (req.method === 'GET') {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user || !user.profile) return res.status(404).json({ error: 'Profile not found' });
    return res.status(200).json(user.profile);
  }
  if (req.method === 'PUT') {
    const update = req.body;
    const result = ProfileUpdateSchema.safeParse(update);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', errors: result.error.flatten() });
    }
    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data: update,
    });
    return res.status(200).json(updatedProfile);
  }
  if (req.method === 'PATCH') {
    try {
      const { nutritionProfile, ...otherFields } = req.body;
      let updateData = { ...otherFields };
      if (nutritionProfile) {
        const parse = NutritionProfileSchema.safeParse(nutritionProfile);
        if (!parse.success) {
          return res.status(400).json({ error: 'Invalid nutrition profile', details: parse.error.errors });
        }
        updateData.nutritionProfile = nutritionProfile;
      }
      const updated = await prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
      });
      return res.status(200).json({ profile: updated });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to update profile.' });
    }
  }
  res.setHeader('Allow', ['GET', 'PUT', 'PATCH']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
} 