import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { useOpenAI } from './OpenAIContext'
import { openFoodFactsService } from '../services/openFoodFactsService'
import { FoodEntry, MealPlan, DailyLog } from '../types/nutrition'
import toast from 'react-hot-toast'
import { useProfile } from './ProfileContext'

interface Analytics {
  calories: number[];
  protein: number[];
  carbs: number[];
  fat: number[];
  dates: string[];
  streak: number;
  bestStreak: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
}

interface NutritionContextType {
  dailyLog: DailyLog | null;
  mealPlan: MealPlan | null;
  analytics: Analytics | null;
  loading: boolean;
  error: string | null;
  fetchDailyLog: () => Promise<void>;
  addFoodEntry: (entry: FoodEntry) => Promise<void>;
  updateFoodEntry: (index: number, entry: FoodEntry) => Promise<void>;
  removeFoodEntry: (index: number) => Promise<void>;
  fetchMealPlan: () => Promise<void>;
  generateMealPlan: () => Promise<void>;
  getAnalytics: () => Promise<void>;
  scanBarcode: (barcode: string) => Promise<FoodEntry | null>;
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
  const { nutritionProfile } = useProfile()
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null)
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch today's log on mount
  const fetchDailyLog = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/nutrition-log', { method: 'GET', headers: { 'Content-Type': 'application/json' } })
      if (!res.ok) throw new Error('Failed to fetch logs')
      const logs = await res.json()
      const today = new Date().toISOString().slice(0, 10)
      const todaysLog = logs.find((log: any) => log.date && log.date.slice(0, 10) === today)
      setDailyLog(todaysLog || {
        date: new Date(),
        calories: 0,
        calorieGoal: nutritionProfile?.calorieGoal || 2000,
        protein: 0,
        proteinGoal: nutritionProfile?.macroTargets.protein || 150,
        carbs: 0,
        carbsGoal: nutritionProfile?.macroTargets.carbs || 250,
        fat: 0,
        fatGoal: nutritionProfile?.macroTargets.fat || 65,
        entries: []
      })
    } catch (err: any) {
      setError('Could not load logs')
    } finally {
      setLoading(false)
    }
  }, [nutritionProfile])

  // Add food entry
  const addFoodEntry = async (entry: FoodEntry) => {
    setLoading(true)
    setError(null)
    try {
      const log = dailyLog || {
        date: new Date(),
        calories: 0,
        calorieGoal: nutritionProfile?.calorieGoal || 2000,
        protein: 0,
        proteinGoal: nutritionProfile?.macroTargets.protein || 150,
        carbs: 0,
        carbsGoal: nutritionProfile?.macroTargets.carbs || 250,
        fat: 0,
        fatGoal: nutritionProfile?.macroTargets.fat || 65,
        entries: []
      }
      const updatedEntries = [...log.entries, entry]
      const updatedLog = {
        ...log,
        entries: updatedEntries,
        calories: updatedEntries.reduce((a, f) => a + (f.calories || 0), 0),
        protein: updatedEntries.reduce((a, f) => a + (f.protein || 0), 0),
        carbs: updatedEntries.reduce((a, f) => a + (f.carbs || 0), 0),
        fat: updatedEntries.reduce((a, f) => a + (f.fat || 0), 0)
      }
      const res = await fetch('/api/nutrition-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLog)
      })
      if (!res.ok) throw new Error('Failed to log food')
      const saved = await res.json()
      setDailyLog(saved)
      toast.success('Food logged!')
    } catch (err: any) {
      setError('Could not log food')
      toast.error('Could not log food')
    } finally {
      setLoading(false)
    }
  }

  // Update food entry
  const updateFoodEntry = async (index: number, entry: FoodEntry) => {
    setLoading(true)
    setError(null)
    try {
      if (!dailyLog) return
      const updatedEntries = dailyLog.entries.map((e, i) => (i === index ? entry : e))
      const updatedLog = {
        ...dailyLog,
        entries: updatedEntries,
        calories: updatedEntries.reduce((a, f) => a + (f.calories || 0), 0),
        protein: updatedEntries.reduce((a, f) => a + (f.protein || 0), 0),
        carbs: updatedEntries.reduce((a, f) => a + (f.carbs || 0), 0),
        fat: updatedEntries.reduce((a, f) => a + (f.fat || 0), 0)
      }
      const res = await fetch('/api/nutrition-log', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLog)
      })
      if (!res.ok) throw new Error('Failed to update food entry')
      const saved = await res.json()
      setDailyLog(saved)
      toast.success('Food entry updated!')
    } catch (err: any) {
      setError('Could not update food entry')
      toast.error('Could not update food entry')
    } finally {
      setLoading(false)
    }
  }

  // Remove food entry
  const removeFoodEntry = async (index: number) => {
    setLoading(true)
    setError(null)
    try {
      if (!dailyLog) return
      const updatedEntries = dailyLog.entries.filter((_, i) => i !== index)
      const updatedLog = {
        ...dailyLog,
        entries: updatedEntries,
        calories: updatedEntries.reduce((a, f) => a + (f.calories || 0), 0),
        protein: updatedEntries.reduce((a, f) => a + (f.protein || 0), 0),
        carbs: updatedEntries.reduce((a, f) => a + (f.carbs || 0), 0),
        fat: updatedEntries.reduce((a, f) => a + (f.fat || 0), 0)
      }
      const res = await fetch('/api/nutrition-log', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLog)
      })
      if (!res.ok) throw new Error('Failed to remove food entry')
      const saved = await res.json()
      setDailyLog(saved)
      toast.success('Food entry removed!')
    } catch (err: any) {
      setError('Could not remove food entry')
      toast.error('Could not remove food entry')
    } finally {
      setLoading(false)
    }
  }

  // Fetch meal plan
  const fetchMealPlan = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/meal-plan', { method: 'GET', headers: { 'Content-Type': 'application/json' } })
      if (!res.ok) throw new Error('Failed to fetch meal plan')
      const data = await res.json()
      setMealPlan(data.plan)
    } catch (err: any) {
      setError('Could not load meal plan')
    } finally {
      setLoading(false)
    }
  }, [])

  // Generate meal plan
  const generateMealPlan = async () => {
    setLoading(true)
    setError(null)
    try {
      if (!nutritionProfile) throw new Error('Nutrition profile not found')
      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nutritionProfile })
      })
      if (!res.ok) throw new Error('Failed to generate meal plan')
      const data = await res.json()
      setMealPlan(data.plan)
      toast.success('Meal plan generated!')
    } catch (err: any) {
      setError('Could not generate meal plan')
      toast.error('Could not generate meal plan')
    } finally {
      setLoading(false)
    }
  }

  // Fetch analytics
  const getAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analytics', { method: 'GET', headers: { 'Content-Type': 'application/json' } })
      if (!res.ok) throw new Error('Failed to fetch analytics')
      const data = await res.json()
      setAnalytics(data)
    } catch (err: any) {
      setError('Could not load analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  // Barcode scan
  const scanBarcode = async (barcode: string): Promise<FoodEntry | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/food-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode })
      })
      if (!res.ok) throw new Error('Failed to scan barcode')
      const data = await res.json()
      return data.foodEntry as FoodEntry
    } catch (err: any) {
      setError('Could not scan barcode')
      toast.error('Could not scan barcode')
      return null
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchDailyLog()
    fetchMealPlan()
    getAnalytics()
  }, [fetchDailyLog, fetchMealPlan, getAnalytics])

  return (
    <NutritionContext.Provider
      value={{
        dailyLog,
        mealPlan,
        analytics,
        loading,
        error,
        fetchDailyLog,
        addFoodEntry,
        updateFoodEntry,
        removeFoodEntry,
        fetchMealPlan,
        generateMealPlan,
        getAnalytics,
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