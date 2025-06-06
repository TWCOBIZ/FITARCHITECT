import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/db';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET;

const WorkoutLogSchema = z.object({
  planId: z.string(),
  workoutId: z.string(),
  date: z.string(),
  exercises: z.array(z.object({
    exerciseId: z.string(),
    sets: z.array(z.object({
      reps: z.number(),
      weight: z.number(),
      completed: z.boolean(),
      notes: z.string().optional(),
    })),
    notes: z.string().optional(),
  })),
  duration: z.number(),
  notes: z.string().optional(),
  rating: z.number().optional(),
  completed: z.boolean(),
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
  const userId = getUserIdFromAuth(req);
  if (!userId) return res.status(401).json({ message: 'Not authenticated' });

  try {
    switch (req.method) {
      case 'GET': {
        const logs = await prisma.workoutLog.findMany({ where: { userId } });
        return res.status(200).json(logs);
      }
      case 'POST': {
        const parse = WorkoutLogSchema.safeParse(req.body);
        if (!parse.success) {
          return res.status(400).json({ message: 'Invalid input', errors: parse.error.errors });
        }
        const log = await prisma.workoutLog.create({
          data: {
            userId,
            ...parse.data,
            date: new Date(parse.data.date),
          },
        });
        return res.status(201).json(log);
      }
      case 'PATCH': {
        const { id, ...updates } = req.body;
        if (!id) return res.status(400).json({ message: 'Missing log id' });
        const log = await prisma.workoutLog.update({ where: { id }, data: updates });
        return res.status(200).json(log);
      }
      case 'DELETE': {
        const { id } = req.body;
        if (!id) return res.status(400).json({ message: 'Missing log id' });
        await prisma.workoutLog.delete({ where: { id } });
        return res.status(204).end();
      }
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Workout log API error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
} 