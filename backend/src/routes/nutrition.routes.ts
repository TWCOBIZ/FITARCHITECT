import { Router, Response } from 'express';
import { prisma } from '../db/prisma';
import { 
  authenticate, 
  AuthenticatedRequest 
} from '../auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = Router();

// Get all nutrition logs for the user
router.get('/', 
  authenticate, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    
    const logs = await prisma.nutritionLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' }
    });
    
    logger.info(`Successfully fetched ${logs.length} nutrition logs for user ${userId}`);
    res.json(logs);
  })
);

// Create a new nutrition log
router.post('/', 
  authenticate, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { date, foods, calories, notes } = req.body;
    
    if (!date || !foods || !Array.isArray(foods)) {
      throw new AppError(400, 'Invalid input. Date and foods array required.');
    }

    // Validate food entries structure
    for (const food of foods) {
      if (!food.name || typeof food.calories !== 'number') {
        throw new AppError(400, 'Invalid food entry. Each entry must have name and calories.');
      }
    }

    // Check if a log for this date already exists
    const existingLog = await prisma.nutritionLog.findFirst({
      where: {
        userId,
        date: {
          gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
          lt: new Date(new Date(date).setHours(23, 59, 59, 999))
        }
      }
    });

    let log;
    if (existingLog) {
      // Update existing log by merging foods
      const mergedFoods = [...(existingLog.foods as any[]), ...foods];
      const totalCalories = mergedFoods.reduce((sum, food) => sum + (food.calories || 0), 0);
      
      log = await prisma.nutritionLog.update({
        where: { id: existingLog.id },
        data: {
          foods: mergedFoods,
          calories: totalCalories,
          notes: notes || existingLog.notes || ''
        }
      });
    } else {
      // Create new log
      log = await prisma.nutritionLog.create({
        data: {
          userId,
          date: new Date(date),
          foods,
          calories: calories || 0,
          notes: notes || ''
        }
      });
    }
    
    res.status(201).json(log);
  })
);

// Update a nutrition log
router.put('/:id', 
  authenticate, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { date, foods, calories, notes } = req.body;
    
    // Check if log exists and belongs to user
    const existingLog = await prisma.nutritionLog.findFirst({
      where: { id, userId }
    });
    
    if (!existingLog) {
      throw new AppError(404, 'Nutrition log not found');
    }
    
    const updatedLog = await prisma.nutritionLog.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        foods,
        calories,
        notes
      }
    });
    
    res.json(updatedLog);
  })
);

// Delete a nutrition log
router.delete('/:id', 
  authenticate, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    
    // Check if log exists and belongs to user
    const existingLog = await prisma.nutritionLog.findFirst({
      where: { id, userId }
    });
    
    if (!existingLog) {
      throw new AppError(404, 'Nutrition log not found');
    }
    
    await prisma.nutritionLog.delete({ where: { id } });
    res.status(204).end();
  })
);

// Get daily nutrition summary for a specific date
router.get('/daily/:date', 
  authenticate, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { date } = req.params;
    
    // Validate date format
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new AppError(400, 'Invalid date format');
    }
    
    // Get nutrition log for the specific date
    const log = await prisma.nutritionLog.findFirst({
      where: {
        userId,
        date: {
          gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
          lt: new Date(new Date(date).setHours(23, 59, 59, 999))
        }
      }
    });

    if (!log) {
      return res.json({
        date,
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        foods: [],
        isEmpty: true
      });
    }

    // Calculate totals from foods
    const foods = (log.foods as any[]) || [];
    const totals = foods.reduce((acc, food) => ({
      calories: acc.calories + (Number(food.calories) || 0),
      protein: acc.protein + (Number(food.protein) || 0),
      carbs: acc.carbs + (Number(food.carbs) || 0),
      fat: acc.fat + (Number(food.fat) || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    res.json({
      date,
      totalCalories: Math.round(totals.calories),
      totalProtein: Math.round(totals.protein * 10) / 10,
      totalCarbs: Math.round(totals.carbs * 10) / 10,
      totalFat: Math.round(totals.fat * 10) / 10,
      foods,
      notes: log.notes || '',
      isEmpty: false
    });
  })
);

// Get weekly nutrition summary
router.get('/weekly', 
  authenticate, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { startDate } = req.query;
    
    // Calculate week range
    const start = startDate ? new Date(startDate as string) : new Date();
    if (!startDate) {
      // Start from last Monday
      const dayOfWeek = start.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start.setDate(start.getDate() - daysToMonday);
    }
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setHours(0, 0, 0, 0);

    // Get all logs for the week
    const logs = await prisma.nutritionLog.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lt: end
        }
      },
      orderBy: { date: 'asc' }
    });

    // Process daily summaries
    const dailySummaries = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const dayLog = logs.find(log => 
        log.date.toISOString().split('T')[0] === dateStr
      );

      if (dayLog) {
        const foods = (dayLog.foods as any[]) || [];
        const totals = foods.reduce((acc, food) => ({
          calories: acc.calories + (Number(food.calories) || 0),
          protein: acc.protein + (Number(food.protein) || 0),
          carbs: acc.carbs + (Number(food.carbs) || 0),
          fat: acc.fat + (Number(food.fat) || 0)
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

        dailySummaries.push({
          date: dateStr,
          dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
          totalCalories: Math.round(totals.calories),
          totalProtein: Math.round(totals.protein * 10) / 10,
          totalCarbs: Math.round(totals.carbs * 10) / 10,
          totalFat: Math.round(totals.fat * 10) / 10,
          foodCount: foods.length,
          hasData: true
        });
      } else {
        dailySummaries.push({
          date: dateStr,
          dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          foodCount: 0,
          hasData: false
        });
      }
    }

    // Calculate weekly totals and averages
    const weeklyTotals = dailySummaries.reduce((acc, day) => ({
      calories: acc.calories + day.totalCalories,
      protein: acc.protein + day.totalProtein,
      carbs: acc.carbs + day.totalCarbs,
      fat: acc.fat + day.totalFat,
      daysWithData: acc.daysWithData + (day.hasData ? 1 : 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, daysWithData: 0 });

    const averages = {
      calories: weeklyTotals.daysWithData > 0 ? Math.round(weeklyTotals.calories / weeklyTotals.daysWithData) : 0,
      protein: weeklyTotals.daysWithData > 0 ? Math.round((weeklyTotals.protein / weeklyTotals.daysWithData) * 10) / 10 : 0,
      carbs: weeklyTotals.daysWithData > 0 ? Math.round((weeklyTotals.carbs / weeklyTotals.daysWithData) * 10) / 10 : 0,
      fat: weeklyTotals.daysWithData > 0 ? Math.round((weeklyTotals.fat / weeklyTotals.daysWithData) * 10) / 10 : 0
    };

    res.json({
      weekStart: start.toISOString().split('T')[0],
      weekEnd: new Date(end.getTime() - 86400000).toISOString().split('T')[0], // End is exclusive, so subtract 1 day for display
      dailySummaries,
      weeklyTotals: {
        calories: Math.round(weeklyTotals.calories),
        protein: Math.round(weeklyTotals.protein * 10) / 10,
        carbs: Math.round(weeklyTotals.carbs * 10) / 10,
        fat: Math.round(weeklyTotals.fat * 10) / 10
      },
      averages,
      daysWithData: weeklyTotals.daysWithData,
      completionRate: Math.round((weeklyTotals.daysWithData / 7) * 100)
    });
  })
);

// Get monthly nutrition summary
router.get('/monthly', 
  authenticate, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { year, month } = req.query;
    
    // Calculate month range
    const currentDate = new Date();
    const targetYear = year ? parseInt(year as string) : currentDate.getFullYear();
    const targetMonth = month ? parseInt(month as string) - 1 : currentDate.getMonth(); // JS months are 0-indexed
    
    const start = new Date(targetYear, targetMonth, 1);
    const end = new Date(targetYear, targetMonth + 1, 0); // Last day of month
    end.setHours(23, 59, 59, 999);

    // Get all logs for the month
    const logs = await prisma.nutritionLog.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lte: end
        }
      },
      orderBy: { date: 'asc' }
    });

    // Process daily summaries
    const dailySummaries = [];
    const daysInMonth = end.getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(targetYear, targetMonth, day);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const dayLog = logs.find(log => 
        log.date.toISOString().split('T')[0] === dateStr
      );

      if (dayLog) {
        const foods = (dayLog.foods as any[]) || [];
        const totals = foods.reduce((acc, food) => ({
          calories: acc.calories + (Number(food.calories) || 0),
          protein: acc.protein + (Number(food.protein) || 0),
          carbs: acc.carbs + (Number(food.carbs) || 0),
          fat: acc.fat + (Number(food.fat) || 0)
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

        dailySummaries.push({
          date: dateStr,
          day: day,
          totalCalories: Math.round(totals.calories),
          totalProtein: Math.round(totals.protein * 10) / 10,
          totalCarbs: Math.round(totals.carbs * 10) / 10,
          totalFat: Math.round(totals.fat * 10) / 10,
          foodCount: foods.length,
          hasData: true
        });
      } else {
        dailySummaries.push({
          date: dateStr,
          day: day,
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          foodCount: 0,
          hasData: false
        });
      }
    }

    // Calculate monthly totals and averages
    const monthlyTotals = dailySummaries.reduce((acc, day) => ({
      calories: acc.calories + day.totalCalories,
      protein: acc.protein + day.totalProtein,
      carbs: acc.carbs + day.totalCarbs,
      fat: acc.fat + day.totalFat,
      daysWithData: acc.daysWithData + (day.hasData ? 1 : 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, daysWithData: 0 });

    const averages = {
      calories: monthlyTotals.daysWithData > 0 ? Math.round(monthlyTotals.calories / monthlyTotals.daysWithData) : 0,
      protein: monthlyTotals.daysWithData > 0 ? Math.round((monthlyTotals.protein / monthlyTotals.daysWithData) * 10) / 10 : 0,
      carbs: monthlyTotals.daysWithData > 0 ? Math.round((monthlyTotals.carbs / monthlyTotals.daysWithData) * 10) / 10 : 0,
      fat: monthlyTotals.daysWithData > 0 ? Math.round((monthlyTotals.fat / monthlyTotals.daysWithData) * 10) / 10 : 0
    };

    // Calculate nutrition streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    for (let i = dailySummaries.length - 1; i >= 0; i--) {
      if (dailySummaries[i].hasData) {
        tempStreak++;
        if (i === dailySummaries.length - 1 || currentStreak === 0) {
          currentStreak = tempStreak;
        }
      } else {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        tempStreak = 0;
      }
    }
    
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }

    res.json({
      year: targetYear,
      month: targetMonth + 1, // Convert back to 1-indexed
      monthName: start.toLocaleDateString('en-US', { month: 'long' }),
      dailySummaries,
      monthlyTotals: {
        calories: Math.round(monthlyTotals.calories),
        protein: Math.round(monthlyTotals.protein * 10) / 10,
        carbs: Math.round(monthlyTotals.carbs * 10) / 10,
        fat: Math.round(monthlyTotals.fat * 10) / 10
      },
      averages,
      daysWithData: monthlyTotals.daysWithData,
      completionRate: Math.round((monthlyTotals.daysWithData / daysInMonth) * 100),
      streaks: {
        current: currentStreak,
        longest: longestStreak
      },
      daysInMonth
    });
  })
);

// Get nutrition insights and recommendations
router.get('/insights', 
  authenticate, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    
    // Get last 30 days of data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const logs = await prisma.nutritionLog.findMany({
      where: {
        userId,
        date: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: { date: 'desc' }
    });

    if (logs.length === 0) {
      return res.json({
        insights: ['Start logging your meals to get personalized nutrition insights!'],
        recommendations: ['Begin by tracking your breakfast tomorrow'],
        stats: {
          loggingDays: 0,
          averageCalories: 0,
          consistencyScore: 0
        }
      });
    }

    // Calculate insights
    const totalDays = 30;
    const loggingDays = logs.length;
    const consistencyScore = Math.round((loggingDays / totalDays) * 100);
    
    // Calculate average calories
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    
    logs.forEach(log => {
      const foods = (log.foods as any[]) || [];
      foods.forEach(food => {
        totalCalories += Number(food.calories) || 0;
        totalProtein += Number(food.protein) || 0;
        totalCarbs += Number(food.carbs) || 0;
        totalFat += Number(food.fat) || 0;
      });
    });
    
    const averageCalories = loggingDays > 0 ? Math.round(totalCalories / loggingDays) : 0;
    const averageProtein = loggingDays > 0 ? Math.round(totalProtein / loggingDays) : 0;
    const averageCarbs = loggingDays > 0 ? Math.round(totalCarbs / loggingDays) : 0;
    const averageFat = loggingDays > 0 ? Math.round(totalFat / loggingDays) : 0;
    
    // Generate insights
    const insights = [];
    const recommendations = [];
    
    if (consistencyScore < 50) {
      insights.push('Your logging consistency could improve. Try setting daily reminders!');
      recommendations.push('Set a daily reminder to log your meals');
    } else if (consistencyScore >= 80) {
      insights.push('Excellent logging consistency! Keep up the great work!');
    }
    
    if (averageCalories < 1500) {
      insights.push('Your average calorie intake seems low');
      recommendations.push('Consider consulting with a nutritionist about your calorie needs');
    } else if (averageCalories > 3000) {
      insights.push('Your calorie intake is quite high');
      recommendations.push('Review your portion sizes if weight management is a goal');
    }
    
    if (averageProtein < 50) {
      recommendations.push('Try adding more protein sources to your meals');
    }
    
    if (insights.length === 0) {
      insights.push('You\'re doing great with nutrition tracking!');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Keep logging consistently for more insights');
    }
    
    res.json({
      insights,
      recommendations,
      stats: {
        loggingDays,
        averageCalories,
        averageProtein,
        averageCarbs,
        averageFat,
        consistencyScore
      }
    });
  })
);

export default router;