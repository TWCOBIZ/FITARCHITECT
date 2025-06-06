import { getSession } from 'next-auth/react';
import jwt from 'jsonwebtoken';
import db from '../../lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

function getTokenFromHeader(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.split(' ')[1];
  }
  return null;
}

async function getUserFromRequest(req) {
  const session = await getSession({ req });
  if (session && session.user?.id) {
    return { userId: session.user.id };
  }
  const token = getTokenFromHeader(req);
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (typeof payload === 'object' && payload.userId) {
        return { userId: payload.userId };
      }
    } catch (e) {
      return null;
    }
  }
  return null;
}

function calcStreaks(dates) {
  let streak = 0, bestStreak = 0, prev = null;
  for (const d of dates) {
    if (!prev || (new Date(d) - new Date(prev) === 86400000)) {
      streak++;
      bestStreak = Math.max(bestStreak, streak);
    } else {
      streak = 1;
    }
    prev = d;
  }
  return { streak, bestStreak };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
  const userAuth = await getUserFromRequest(req);
  if (!userAuth || !userAuth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    // Nutrition logs
    const logs = await db.nutritionLog.findMany({ where: { userId: userAuth.userId }, orderBy: { date: 'asc' } });
    const calories = logs.map(l => l.calories);
    const protein = logs.map(l => l.protein);
    const carbs = logs.map(l => l.carbs);
    const fat = logs.map(l => l.fat);
    const dates = logs.map(l => l.date.toISOString().slice(0, 10));
    const { streak, bestStreak } = calcStreaks(dates);
    const avgCalories = calories.length ? Math.round(calories.reduce((a, b) => a + b, 0) / calories.length) : 0;
    const avgProtein = protein.length ? Math.round(protein.reduce((a, b) => a + b, 0) / protein.length) : 0;
    const avgCarbs = carbs.length ? Math.round(carbs.reduce((a, b) => a + b, 0) / carbs.length) : 0;
    const avgFat = fat.length ? Math.round(fat.reduce((a, b) => a + b, 0) / fat.length) : 0;
    // TODO: Add meal plan and workout analytics if needed
    return res.status(200).json({ calories, protein, carbs, fat, dates, streak, bestStreak, avgCalories, avgProtein, avgCarbs, avgFat });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
} 