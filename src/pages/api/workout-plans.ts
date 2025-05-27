import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/db';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET;

const REQUIRED_ENV_VARS = ['JWT_SECRET'];
function checkEnvVars() {
  const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    return `Missing required environment variables: ${missing.join(', ')}. Please set them in your deployment environment.`;
  }
  return null;
}

// Zod schemas for validation
const WorkoutPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  duration: z.number().int().min(1),
  workouts: z.any(), // You can make this stricter if you want
  targetMuscleGroups: z.array(z.string()),
  difficulty: z.string().min(1),
  isDefault: z.boolean().optional(),
  completed: z.boolean().optional(),
});

const UpdatePlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  description: z.string().optional(),
  duration: z.number().int().optional(),
  workouts: z.any().optional(),
  targetMuscleGroups: z.array(z.string()).optional(),
  difficulty: z.string().optional(),
  isDefault: z.boolean().optional(),
  completed: z.boolean().optional(),
});

function getUserIdFromAuth(req: NextApiRequest): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET!) as { userId: string };
    return payload.userId;
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check for required env vars
  const envError = checkEnvVars();
  if (envError) {
    return res.status(500).json({ message: envError });
  }

  // Authenticate user
  const userId = getUserIdFromAuth(req);
  if (!userId) return res.status(401).json({ message: 'Not authenticated' });

  try {
    switch (req.method) {
      case 'GET': {
        // Fetch all plans for user
        const plans = await prisma.workoutPlan.findMany({ where: { userId } });
        return res.status(200).json(plans);
      }
      case 'POST': {
        // Validate input
        const parse = WorkoutPlanSchema.safeParse(req.body);
        if (!parse.success) {
          return res.status(400).json({ message: 'Invalid input', errors: parse.error.errors });
        }
        const { name, description, duration, workouts, targetMuscleGroups, difficulty, isDefault, completed } = parse.data;
        const plan = await prisma.workoutPlan.create({
          data: {
            userId,
            name,
            description,
            duration,
            workouts,
            targetMuscleGroups,
            difficulty,
            isDefault: !!isDefault,
            completed: !!completed,
          },
        });
        return res.status(201).json(plan);
      }
      case 'DELETE': {
        const { id } = req.body;
        if (!id) return res.status(400).json({ message: 'Missing plan id' });
        await prisma.workoutPlan.delete({ where: { id } });
        return res.status(204).end();
      }
      case 'PATCH': {
        // Validate input
        const parse = UpdatePlanSchema.safeParse(req.body);
        if (!parse.success) {
          return res.status(400).json({ message: 'Invalid input', errors: parse.error.errors });
        }
        const { id, ...updates } = parse.data;
        if (!id) return res.status(400).json({ message: 'Missing plan id' });
        const plan = await prisma.workoutPlan.update({ where: { id }, data: updates });
        return res.status(200).json(plan);
      }
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('API error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
} 