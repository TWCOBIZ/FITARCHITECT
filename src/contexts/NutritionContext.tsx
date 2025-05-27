import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { useOpenAI } from './OpenAIContext'
import { openFoodFactsService } from '../services/openFoodFactsService'
import { FoodEntry, MealPlan, DailyLog } from '../types/nutrition'
import toast from 'react-hot-toast'

interface NutritionContextType {
  dailyLog: DailyLog
  mealPlan: MealPlan[]
  addFoodEntry: (entry: FoodEntry) => void
  removeFoodEntry: (index: number) => void
  generateMealPlan: () => Promise<void>
  scanBarcode: () => Promise<FoodEntry | null>
}

const NutritionContext = createContext<NutritionContextType | undefined>(undefined)

// Fallback meal and utility
const FALLBACK_MEAL = {
  type: 'snack',
  items: [{
    name: 'Healthy Snack',
    calories: 150,
    protein: 5,
    carbs: 20,
    fat: 5,
    servingSize: '1 serving',
    servingUnit: '',
  }],
};
const REQUIRED_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries - 1) await new Promise(res => setTimeout(res, delay * (i + 1)));
    }
  }
  throw lastError;
}

function enforceMealPlanCompleteness(plan: any[]): any[] {
  return plan.map((day: any, idx: number) => {
    const mealTypes = day.meals.map((m: any) => m.type);
    const meals = [...day.meals];
    for (const type of REQUIRED_MEAL_TYPES) {
      if (!mealTypes.includes(type)) {
        meals.push({ ...FALLBACK_MEAL, type });
      }
    }
    return { ...day, meals };
  });
}

export const NutritionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const { generateMealPlan: generateWithGPT } = useOpenAI()
  const [dailyLog, setDailyLog] = useState<DailyLog>({
    date: new Date(),
    calories: 0,
    calorieGoal: 2000,
    protein: 0,
    proteinGoal: 150,
    carbs: 0,
    carbsGoal: 250,
    fat: 0,
    fatGoal: 65,
    entries: []
  })
  const [mealPlan, setMealPlan] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load user's daily log from storage/API
    loadDailyLog()
    // Load meal plan from localStorage
    const saved = localStorage.getItem('mealPlan')
    if (saved) {
      setMealPlan(JSON.parse(saved))
    }
  }, [user])

  const loadDailyLog = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/nutrition-log')
      if (!res.ok) throw new Error('Failed to load logs')
      const logs = await res.json()
      // Find today's log or use default
      const today = new Date().toISOString().slice(0, 10)
      const todaysLog = logs.find((log: any) => log.date && log.date.slice(0, 10) === today)
      setDailyLog(todaysLog || {
        date: new Date(),
        calories: 0,
        calorieGoal: 2000,
        protein: 0,
        proteinGoal: 150,
        carbs: 0,
        carbsGoal: 250,
        fat: 0,
        fatGoal: 65,
        entries: []
      })
    } catch (err: any) {
      setError('Could not load logs, using local data.')
      // fallback to localStorage
      const saved = localStorage.getItem('dailyLog')
      if (saved) setDailyLog(JSON.parse(saved))
    } finally {
      setLoading(false)
    }
  }

  const addFoodEntry = async (entry: FoodEntry) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/nutrition-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dailyLog, entries: [...dailyLog.entries, entry] })
      })
      if (!res.ok) throw new Error('Failed to log food')
      const updated = await res.json()
      setDailyLog(updated)
      toast.success('Food logged!')
      localStorage.setItem('dailyLog', JSON.stringify(updated))
    } catch (err: any) {
      setError('Could not log food, using local data.')
      // fallback to localStorage
      const updated = { ...dailyLog, entries: [...dailyLog.entries, entry] }
      setDailyLog(updated)
      localStorage.setItem('dailyLog', JSON.stringify(updated))
      toast.error('Logged locally.')
    } finally {
      setLoading(false)
    }
  }

  const removeFoodEntry = (index: number) => {
    setDailyLog(prev => {
      const entry = prev.entries[index]
      return {
        ...prev,
        calories: prev.calories - entry.calories,
        protein: prev.protein - entry.protein,
        carbs: prev.carbs - entry.carbs,
        fat: prev.fat - entry.fat,
        entries: prev.entries.filter((_, i) => i !== index)
      }
    })
  }

  const generateMealPlan = async () => {
    try {
      if (!user?.profile) {
        throw new Error('User profile not found')
      }
      const plan = await retry(() => generateWithGPT({
        type: 'meal_plan',
        fitnessProfile: user.profile,
        preferences: {
          dietaryRestrictions: [],
          allergies: [],
          favoriteFoods: []
        }
      }), 3, 1000)
      // Enforce completeness
      const completePlan = enforceMealPlanCompleteness(plan)
      setMealPlan(completePlan)
      localStorage.setItem('mealPlan', JSON.stringify(completePlan))
    } catch (error: any) {
      console.error('Error generating meal plan:', error)
      throw new Error('Could not generate meal plan after several attempts. Please try again later.')
    }
  }

  const scanBarcode = async (): Promise<FoodEntry | null> => {
    try {
      // TODO: Implement barcode scanning
      // For now, returning mock data
      return {
        name: 'Sample Food',
        calories: 100,
        protein: 10,
        carbs: 15,
        fat: 5,
        servingSize: '100g',
        servingUnit: 'g'
      }
    } catch (error) {
      console.error('Error scanning barcode:', error)
      return null
    }
  }

  return (
    <NutritionContext.Provider
      value={{
        dailyLog,
        mealPlan,
        addFoodEntry,
        removeFoodEntry,
        generateMealPlan,
        scanBarcode
      }}
    >
      {children}
    </NutritionContext.Provider>
  )
}

export const useNutrition = () => {
  const context = useContext(NutritionContext)
  if (context === undefined) {
    throw new Error('useNutrition must be used within a NutritionProvider')
  }
  return context
} 