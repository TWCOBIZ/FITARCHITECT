import { getSession } from 'next-auth/react';
import db from '../../lib/db';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

function getTokenFromHeader(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.split(' ')[1];
  }
  return null;
}

async function getUserFromRequest(req) {
  // Try NextAuth session first
  const session = await getSession({ req });
  if (session && session.user?.id) {
    return { userId: session.user.id, type: session.user.type || 'registered' };
  }
  // Try JWT from Authorization header
  const token = getTokenFromHeader(req);
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (typeof payload === 'object' && payload.userId) {
        return { userId: payload.userId, type: payload.type || 'registered' };
      }
    } catch (e) {
      return null;
    }
  }
  return null;
}

const FoodEntrySchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  servingSize: z.string(),
  servingUnit: z.string(),
  imageUrl: z.string().optional(),
  description: z.string().optional(),
  barcode: z.string().optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
  ingredients: z.array(z.string()).optional(),
  nutritionFacts: z.any().optional()
});

const DailyLogSchema = z.object({
  date: z.union([z.string(), z.date()]),
  calories: z.number(),
  calorieGoal: z.number(),
  protein: z.number(),
  proteinGoal: z.number(),
  carbs: z.number(),
  carbsGoal: z.number(),
  fat: z.number(),
  fatGoal: z.number(),
  entries: z.array(FoodEntrySchema),
  notes: z.string().optional()
});

export default async function handler(req, res) {
  const userAuth = await getUserFromRequest(req);
  if (!userAuth || !userAuth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = userAuth.userId;

  switch (req.method) {
    case 'GET': {
      try {
        const logs = await db.nutritionLog.findMany({ where: { userId }, orderBy: { date: 'desc' } });
        return res.status(200).json(logs);
      } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
    case 'POST': {
      try {
        const parse = DailyLogSchema.safeParse(req.body);
        if (!parse.success) return res.status(400).json({ error: 'Invalid input', details: parse.error.errors });
        const logData = parse.data;
        // Upsert today's log
        const log = await db.nutritionLog.upsert({
          where: { userId_date: { userId, date: new Date(logData.date).toISOString().slice(0, 10) } },
          update: logData,
          create: { ...logData, userId }
        });
        return res.status(201).json(log);
      } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
    case 'PUT': {
      try {
        const parse = DailyLogSchema.extend({ id: z.string() }).safeParse(req.body);
        if (!parse.success) return res.status(400).json({ error: 'Invalid input', details: parse.error.errors });
        const { id, ...update } = parse.data;
        const log = await db.nutritionLog.update({ where: { id, userId }, data: update });
        return res.status(200).json(log);
      } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
    case 'DELETE': {
      try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'Missing log id' });
        await db.nutritionLog.delete({ where: { id, userId } });
        return res.status(204).end();
      } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
} 