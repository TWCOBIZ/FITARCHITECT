import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '../../../utils/auth';
import { prisma } from '../../../lib/prisma';
import { openaiService } from '../../../services/openaiService';
import { z } from 'zod';

const UserProfileSchema = z.object({
  fitnessGoal: z.string(),
  experienceLevel: z.string(),
  targetMuscles: z.array(z.string()),
  equipment: z.array(z.string()),
  workoutDays: z.number(),
  timePerWorkout: z.number()
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const userId = session.user.id;

  if (req.method === 'POST') {
    try {
      // Validate user profile
      const parse = UserProfileSchema.safeParse(req.body);
      if (!parse.success) {
        return res.status(400).json({ error: 'Invalid user profile', details: parse.error.errors });
      }
      const userProfile = parse.data;
      // Generate workout plan using OpenAI
      const plan = await openaiService.generateWorkoutPlan(userProfile, []);
      // Store in DB (canonical schema)
      const dbPlan = await prisma.workoutPlan.create({
        data: {
          userId,
          name: plan.name,
          description: plan.description,
          duration: plan.duration,
          workouts: plan.workouts || [],
          targetMuscleGroups: plan.targetMuscleGroups || [],
          difficulty: plan.difficulty,
          createdAt: new Date(plan.createdAt || Date.now()),
          updatedAt: new Date(plan.updatedAt || Date.now()),
        },
      });
      return res.status(200).json({ plan: dbPlan });
    } catch (e: any) {
      console.error('Workout generation error:', e);
      return res.status(500).json({ error: 'Failed to generate workout plan.' });
    }
  }
  res.setHeader('Allow', ['POST']);
  res.status(405).end('Method Not Allowed');
} 