import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '../../../utils/auth';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';
import { openaiService } from '../../../services/openaiService';

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

const MealPlanDaySchema = z.object({
  date: z.string(),
  meals: z.array(z.object({
    type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
    items: z.array(z.object({
      name: z.string(),
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
      servingSize: z.string(),
      servingUnit: z.string(),
      imageUrl: z.string().optional(),
      description: z.string().optional(),
    })),
  })),
});
const MealPlanSchema = z.array(MealPlanDaySchema);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const userId = session.user.id;

  if (req.method === 'POST') {
    try {
      const { nutritionProfile } = req.body;
      const parse = NutritionProfileSchema.safeParse(nutritionProfile);
      if (!parse.success) {
        return res.status(400).json({ error: 'Invalid nutrition profile', details: parse.error.errors });
      }
      // Generate meal plan with OpenAI
      const plan = await openaiService.generateMealPlan(nutritionProfile);
      MealPlanSchema.parse(plan); // Validate
      // Save to DB (as JSON)
      const dbPlan = await prisma.mealPlan.create({
        data: {
          userId,
          plan,
          createdAt: new Date(),
        },
      });
      return res.status(200).json({ plan: dbPlan.plan });
    } catch (e: any) {
      console.error('Meal plan generation error:', e);
      return res.status(500).json({ error: 'Failed to generate meal plan.' });
    }
  }
  if (req.method === 'GET') {
    try {
      const dbPlan = await prisma.mealPlan.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (!dbPlan) return res.status(404).json({ error: 'No meal plan found.' });
      return res.status(200).json({ plan: dbPlan.plan });
    } catch (e: any) {
      return res.status(500).json({ error: 'Failed to fetch meal plan.' });
    }
  }
  res.setHeader('Allow', ['POST', 'GET']);
  res.status(405).end('Method Not Allowed');
} 