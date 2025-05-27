import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import prisma from '../../lib/db'

interface UserProfile {
  id: string
  name: string
  email: string
  avatar?: string
  height: number
  weight: number
  age: number
  gender: 'male' | 'female' | 'other'
  fitnessGoals: string[]
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  dietaryPreferences: string[]
  notifications: {
    email: boolean
    telegram: boolean
    telegramChatId?: string
  }
  parqAnswers?: string[]
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req })

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const userEmail = session.user?.email

  if (!userEmail) {
    return res.status(400).json({ message: 'User email is required' })
  }

  switch (req.method) {
    case 'GET':
      try {
        const profile = await prisma.userProfile.findUnique({
          where: { email: userEmail },
          include: {
            nutritionLogs: true,
            workoutLogs: true,
          }
        })

        if (!profile) {
          return res.status(404).json({ message: 'Profile not found' })
        }

        // Workouts summary
        let workoutSummary: { total: number; lastWorkout: Date | null } = { total: 0, lastWorkout: null };
        let recentWorkouts: any[] = [];
        try {
          const workouts = profile.workoutLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          workoutSummary = {
            total: workouts.length,
            lastWorkout: workouts[0]?.date || null
          };
          recentWorkouts = workouts.slice(0, 5);
        } catch (e) {}

        // Nutrition summary (meals/calories)
        let calorieSummary = { today: 0, goal: 0 };
        let mealSummary: { nextMeal: string | null; favoriteFoods: string[] } = { nextMeal: null, favoriteFoods: [] };
        let recentMeals: any[] = [];
        let recentCalories: any[] = [];
        try {
          const today = new Date();
          today.setHours(0,0,0,0);
          const todayLogs = profile.nutritionLogs.filter(log => new Date(log.date) >= today);
          calorieSummary.today = todayLogs.reduce((sum, log) => sum + (log.calories || 0), 0);
          // No calorie goal in schema, keep as 0 or add if needed
          // Recent meals and calories
          const sortedLogs = profile.nutritionLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          recentMeals = sortedLogs.slice(0, 5);
          recentCalories = sortedLogs.slice(0, 5);
          // Favorite foods: extract most frequent foods from logs
          const foodCounts: { [key: string]: number } = {};
          sortedLogs.forEach(log => {
            if (Array.isArray(log.foods)) {
              log.foods.forEach(food => {
                if (typeof food === 'string') {
                  foodCounts[food] = (foodCounts[food] || 0) + 1;
                } else if (food && typeof food === 'object' && 'name' in food && typeof food.name === 'string') {
                  foodCounts[food.name] = (foodCounts[food.name] || 0) + 1;
                }
              });
            }
          });
          mealSummary.favoriteFoods = Object.entries(foodCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name]) => name);
        } catch (e) {}

        // Analytics summary (weight progress: just current weight)
        let analyticsSummary: { weightProgress: { date: Date; weight: number }[] } = { weightProgress: [] };
        try {
          analyticsSummary.weightProgress = [{ date: new Date(), weight: profile.weight }];
        } catch (e) {}

        // Transform database profile to API response format
        let parqAnswers: string[] | undefined = undefined;
        if (Array.isArray(profile.parqAnswers)) {
          parqAnswers = profile.parqAnswers as string[];
        } else if (typeof profile.parqAnswers === 'string') {
          try {
            const parsed = JSON.parse(profile.parqAnswers);
            if (Array.isArray(parsed) && parsed.every((v: any) => typeof v === 'string')) parqAnswers = parsed;
          } catch {}
        }
        const formattedProfile: UserProfile = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          avatar: profile.avatar || undefined,
          height: profile.height,
          weight: profile.weight,
          age: profile.age,
          gender: profile.gender as 'male' | 'female' | 'other',
          fitnessGoals: profile.fitnessGoals,
          activityLevel: profile.activityLevel as UserProfile['activityLevel'],
          dietaryPreferences: profile.dietaryPreferences,
          notifications: {
            email: profile.emailNotifications,
            telegram: profile.telegramEnabled,
            telegramChatId: profile.telegramChatId || undefined
          },
          parqAnswers
        }

        // Return unified payload
        return res.status(200).json({
          profile: formattedProfile,
          workoutSummary,
          calorieSummary,
          mealSummary,
          analyticsSummary,
          recentWorkouts,
          recentMeals,
          recentCalories
        })
      } catch (error) {
        console.error('Error fetching profile:', error)
        return res.status(500).json({ message: 'Internal server error' })
      }

    case 'POST':
      try {
        const profileData: UserProfile = req.body
        // Validation
        const missingFields = [];
        if (!profileData.name) missingFields.push('name');
        if (!profileData.email) missingFields.push('email');
        if (typeof profileData.height !== 'number') missingFields.push('height');
        if (typeof profileData.weight !== 'number') missingFields.push('weight');
        if (typeof profileData.age !== 'number') missingFields.push('age');
        if (!['male','female','other'].includes(profileData.gender)) missingFields.push('gender');
        if (!Array.isArray(profileData.fitnessGoals)) missingFields.push('fitnessGoals');
        if (!['sedentary','light','moderate','active','very_active'].includes(profileData.activityLevel)) missingFields.push('activityLevel');
        if (!Array.isArray(profileData.dietaryPreferences)) missingFields.push('dietaryPreferences');
        if (!profileData.notifications || typeof profileData.notifications.email !== 'boolean' || typeof profileData.notifications.telegram !== 'boolean') missingFields.push('notifications');
        if (missingFields.length > 0) {
          return res.status(400).json({ message: 'Missing or invalid fields', fields: missingFields });
        }

        const profile = await prisma.userProfile.create({
          data: {
            email: userEmail,
            name: profileData.name,
            avatar: profileData.avatar,
            height: profileData.height,
            weight: profileData.weight,
            age: profileData.age,
            gender: profileData.gender,
            fitnessGoals: profileData.fitnessGoals,
            activityLevel: profileData.activityLevel,
            dietaryPreferences: profileData.dietaryPreferences,
            emailNotifications: profileData.notifications.email,
            telegramEnabled: profileData.notifications.telegram,
            telegramChatId: profileData.notifications.telegramChatId,
            parqAnswers: profileData.parqAnswers || undefined
          }
        })

        return res.status(201).json({
          ...profileData,
          id: profile.id,
          email: profile.email
        })
      } catch (error) {
        console.error('Error creating profile:', error)
        return res.status(500).json({ message: 'Internal server error' })
      }

    case 'PUT':
      try {
        const profileData: Partial<UserProfile> = req.body
        // Validation for updatable fields
        const invalidFields = [];
        if (profileData.name !== undefined && typeof profileData.name !== 'string') invalidFields.push('name');
        if (profileData.avatar !== undefined && typeof profileData.avatar !== 'string') invalidFields.push('avatar');
        if (profileData.height !== undefined && typeof profileData.height !== 'number') invalidFields.push('height');
        if (profileData.weight !== undefined && typeof profileData.weight !== 'number') invalidFields.push('weight');
        if (profileData.age !== undefined && typeof profileData.age !== 'number') invalidFields.push('age');
        if (profileData.gender !== undefined && !['male','female','other'].includes(profileData.gender)) invalidFields.push('gender');
        if (profileData.fitnessGoals !== undefined && !Array.isArray(profileData.fitnessGoals)) invalidFields.push('fitnessGoals');
        if (profileData.activityLevel !== undefined && !['sedentary','light','moderate','active','very_active'].includes(profileData.activityLevel)) invalidFields.push('activityLevel');
        if (profileData.dietaryPreferences !== undefined && !Array.isArray(profileData.dietaryPreferences)) invalidFields.push('dietaryPreferences');
        if (profileData.notifications !== undefined) {
          if (typeof profileData.notifications.email !== 'boolean' || typeof profileData.notifications.telegram !== 'boolean') invalidFields.push('notifications');
        }
        if (profileData.parqAnswers !== undefined && !Array.isArray(profileData.parqAnswers)) invalidFields.push('parqAnswers');
        if (invalidFields.length > 0) {
          return res.status(400).json({ message: 'Invalid field types', fields: invalidFields });
        }

        const existingProfile = await prisma.userProfile.findUnique({
          where: { email: userEmail }
        })

        if (!existingProfile) {
          return res.status(404).json({ message: 'Profile not found' })
        }

        const updatedProfile = await prisma.userProfile.update({
          where: { email: userEmail },
          data: {
            name: profileData.name,
            avatar: profileData.avatar, // Now a URL string
            height: profileData.height,
            weight: profileData.weight,
            age: profileData.age,
            gender: profileData.gender,
            fitnessGoals: profileData.fitnessGoals,
            activityLevel: profileData.activityLevel,
            dietaryPreferences: profileData.dietaryPreferences,
            emailNotifications: profileData.notifications?.email,
            telegramEnabled: profileData.notifications?.telegram,
            telegramChatId: profileData.notifications?.telegramChatId,
            ...(profileData.parqAnswers !== undefined ? { parqAnswers: profileData.parqAnswers } : {})
          }
        })

        // Transform database profile to API response format
        let parqAnswers: string[] | undefined = undefined;
        if (Array.isArray(updatedProfile.parqAnswers)) {
          parqAnswers = updatedProfile.parqAnswers as string[];
        } else if (typeof updatedProfile.parqAnswers === 'string') {
          try {
            const parsed = JSON.parse(updatedProfile.parqAnswers);
            if (Array.isArray(parsed) && parsed.every((v: any) => typeof v === 'string')) parqAnswers = parsed;
          } catch {}
        }
        const formattedProfile: UserProfile = {
          id: updatedProfile.id,
          name: updatedProfile.name,
          email: updatedProfile.email,
          avatar: updatedProfile.avatar || undefined, // URL string
          height: updatedProfile.height,
          weight: updatedProfile.weight,
          age: updatedProfile.age,
          gender: updatedProfile.gender as 'male' | 'female' | 'other',
          fitnessGoals: updatedProfile.fitnessGoals,
          activityLevel: updatedProfile.activityLevel as UserProfile['activityLevel'],
          dietaryPreferences: updatedProfile.dietaryPreferences,
          notifications: {
            email: updatedProfile.emailNotifications,
            telegram: updatedProfile.telegramEnabled,
            telegramChatId: updatedProfile.telegramChatId || undefined
          },
          parqAnswers
        }

        return res.status(200).json(formattedProfile)
      } catch (error) {
        console.error('Error updating profile:', error)
        return res.status(500).json({ message: 'Internal server error' })
      }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT'])
      return res.status(405).json({ message: `Method ${req.method} not allowed` })
  }
} 