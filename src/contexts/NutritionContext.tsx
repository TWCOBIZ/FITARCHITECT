import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { useOpenAI } from './OpenAIContext'
import { openFoodFactsService } from '../services/openFoodFactsService'
import { FoodEntry, MealPlan, DailyLog } from '../types/nutrition'
import toast from 'react-hot-toast'
import { calculateNutritionGoals, getDefaultNutritionGoals, isProfileCompleteForNutrition } from '../utils/calorieCalculator'
import { api } from '../services/api'

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
  const { user, isLoading: authLoading } = useAuth()
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

  // Initialize nutrition goals based on user profile completeness
  const initializeNutritionGoals = () => {
    // Check if profile has sufficient data for personalized calculation
    if (user?.profile && isProfileCompleteForNutrition(user.profile)) {
      try {
        const goals = calculateNutritionGoals(user.profile)
        setDailyLog(prev => ({
          ...prev,
          calorieGoal: goals.calories,
          proteinGoal: goals.protein,
          carbsGoal: goals.carbs,
          fatGoal: goals.fat
        }))
        console.log('Using personalized nutrition goals based on complete profile')
      } catch (error) {
        console.error('Error calculating personalized nutrition goals:', error)
        // Fall back to defaults if calculation fails
        const defaultGoals = getDefaultNutritionGoals()
        setDailyLog(prev => ({
          ...prev,
          calorieGoal: defaultGoals.calories,
          proteinGoal: defaultGoals.protein,
          carbsGoal: defaultGoals.carbs,
          fatGoal: defaultGoals.fat
        }))
      }
    } else {
      // Use default goals for users without complete profiles
      const defaultGoals = getDefaultNutritionGoals()
      setDailyLog(prev => ({
        ...prev,
        calorieGoal: defaultGoals.calories,
        proteinGoal: defaultGoals.protein,
        carbsGoal: defaultGoals.carbs,
        fatGoal: defaultGoals.fat
      }))
      
      if (user?.profile) {
        console.log('Using default nutrition goals - profile incomplete. Complete your profile for personalized targets.')
      }
    }
  }

  const loadGuestData = () => {
    // Load guest nutrition data from localStorage
    const saved = localStorage.getItem('guestNutritionLog')
    if (saved) {
      try {
        const parsedLog = JSON.parse(saved)
        
        // Ensure date is a Date object
        parsedLog.date = new Date(parsedLog.date)
        
        // Check if the saved data is for today
        const today = new Date().toISOString().slice(0, 10)
        const savedDate = parsedLog.date.toISOString().slice(0, 10)
        
        if (savedDate === today) {
          // Use today's saved data
          setDailyLog(parsedLog)
        } else {
          // Create new daily log for today with default goals
          const defaultGoals = getDefaultNutritionGoals()
          setDailyLog({
            date: new Date(),
            calories: 0,
            calorieGoal: defaultGoals.calories,
            protein: 0,
            proteinGoal: defaultGoals.protein,
            carbs: 0,
            carbsGoal: defaultGoals.carbs,
            fat: 0,
            fatGoal: defaultGoals.fat,
            entries: []
          })
        }
      } catch (error) {
        console.error('Error loading guest nutrition data:', error)
        // Create default daily log if parsing fails
        const defaultGoals = getDefaultNutritionGoals()
        setDailyLog({
          date: new Date(),
          calories: 0,
          calorieGoal: defaultGoals.calories,
          protein: 0,
          proteinGoal: defaultGoals.protein,
          carbs: 0,
          carbsGoal: defaultGoals.carbs,
          fat: 0,
          fatGoal: defaultGoals.fat,
          entries: []
        })
      }
    } else {
      // Create default daily log for new guest users
      const defaultGoals = getDefaultNutritionGoals()
      setDailyLog({
        date: new Date(),
        calories: 0,
        calorieGoal: defaultGoals.calories,
        protein: 0,
        proteinGoal: defaultGoals.protein,
        carbs: 0,
        carbsGoal: defaultGoals.carbs,
        fat: 0,
        fatGoal: defaultGoals.fat,
        entries: []
      })
    }
  }

  useEffect(() => {
    // Wait for auth to finish loading before making any data calls
    if (authLoading) {
      return
    }
    
    // Initialize nutrition goals based on user profile
    initializeNutritionGoals()
    
    // Check if we have a valid auth token before making API calls
    const token = localStorage.getItem('token')
    const isAuthenticated = token && !token.startsWith('guest-') && token.length > 50
    
    // Only load API data for authenticated registered users
    if (user && !user.isGuest && user.type !== 'guest' && isAuthenticated) {
      // Only load if we don't already have today's data
      if (!dailyLog.entries || dailyLog.entries.length === 0) {
        loadDailyLog()
      }
    } else if (user) {
      // For guests or unauthenticated users, load from localStorage
      loadGuestData()
    }
    // Load meal plan from localStorage for all users
    const saved = localStorage.getItem('mealPlan')
    if (saved) {
      setMealPlan(JSON.parse(saved))
    }
  }, [user, authLoading])

  // Listen for profile changes and reinitialize nutrition goals
  useEffect(() => {
    const handleProfileChange = (event: CustomEvent) => {
      const { fields, user: updatedUser } = event.detail
      
      // Check if any nutrition-relevant fields changed
      const nutritionFields = ['weight', 'height', 'dateOfBirth', 'gender', 'fitnessGoals', 'activityLevel']
      const hasNutritionChanges = fields.some((field: string) => nutritionFields.includes(field))
      
      if (hasNutritionChanges) {
        console.log('Profile changed with nutrition-relevant fields:', fields)
        
        // Update user context and reinitialize nutrition goals
        setTimeout(() => {
          initializeNutritionGoals()
        }, 100) // Small delay to ensure state is updated
      }
    }

    window.addEventListener('profileChanged', handleProfileChange as EventListener)
    
    return () => {
      window.removeEventListener('profileChanged', handleProfileChange as EventListener)
    }
  }, [])

  const loadDailyLog = async () => {
    // Comprehensive authentication check before making API call
    const token = localStorage.getItem('token')
    
    // Enhanced validation to prevent unnecessary API calls
    const shouldSkipApiCall = !token || 
                             !user || 
                             user.isGuest || 
                             user.type === 'guest' || 
                             token.startsWith('guest-') ||
                             token.length < 50 || // Invalid/test tokens
                             authLoading
    
    if (shouldSkipApiCall) {
      console.log('Skipping nutrition API call - authentication not ready or user is guest')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const response = await api.get('/api/nutrition-log', {
        skipErrorToast: true // Prevent toast spam for nutrition API errors
      } as any)
      const logs = response.data
      
      // Find today's log or use default
      const today = new Date().toISOString().slice(0, 10)
      const todaysNutritionLog = logs.find((log: any) => log.date && log.date.slice(0, 10) === today)
      
      // Transform NutritionLog from backend to DailyLog for frontend
      if (todaysNutritionLog) {
        // Calculate nutrition totals from foods with proper validation
        const foods = todaysNutritionLog.foods || []
        const safeNumber = (value: any): number => {
          const num = Number(value);
          return isNaN(num) || num < 0 ? 0 : num;
        };
        
        const totals = foods.reduce((acc: any, food: any) => ({
          calories: acc.calories + safeNumber(food.calories),
          protein: acc.protein + safeNumber(food.protein),
          carbs: acc.carbs + safeNumber(food.carbs),  
          fat: acc.fat + safeNumber(food.fat)
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
        
        setDailyLog({
          date: new Date(todaysNutritionLog.date),
          calories: totals.calories,
          calorieGoal: dailyLog.calorieGoal, // Keep existing goals
          protein: totals.protein,
          proteinGoal: dailyLog.proteinGoal,
          carbs: totals.carbs,
          carbsGoal: dailyLog.carbsGoal,
          fat: totals.fat,
          fatGoal: dailyLog.fatGoal,
          entries: foods // Keep entries for frontend compatibility but source from foods
        })
      } else {
        setDailyLog({
          date: new Date(),
          calories: 0,
          calorieGoal: dailyLog.calorieGoal || 2000,
          protein: 0,
          proteinGoal: dailyLog.proteinGoal || 150,
          carbs: 0,
          carbsGoal: dailyLog.carbsGoal || 250,
          fat: 0,
          fatGoal: dailyLog.fatGoal || 65,
          entries: []
        })
      }
    } catch (err: any) {
      console.error('Failed to load daily nutrition log:', err)
      
      // Handle specific error types
      if (err.response?.status === 401) {
        setError('Authentication expired. Please log in again.')
      } else if (err.response?.status >= 500) {
        setError('Server temporarily unavailable. Using local data.')
      } else if (err.code === 'NETWORK_ERROR' || !err.response) {
        setError('Network connection issue. Using local data.')
      } else {
        setError('Could not load nutrition data. Using local data.')
      }
      
      // Enhanced fallback to localStorage
      const saved = localStorage.getItem('dailyLog')
      if (saved) {
        try {
          const parsedLog = JSON.parse(saved)
          // Ensure date is a Date object
          parsedLog.date = new Date(parsedLog.date)
          setDailyLog(parsedLog)
          console.log('Successfully loaded nutrition data from local storage')
        } catch (parseErr) {
          console.error('Error parsing local nutrition data:', parseErr)
          // Use default goals if local data is corrupted
          const defaultGoals = getDefaultNutritionGoals()
          setDailyLog({
            date: new Date(),
            calories: 0,
            calorieGoal: defaultGoals.calories,
            protein: 0,
            proteinGoal: defaultGoals.protein,
            carbs: 0,
            carbsGoal: defaultGoals.carbs,
            fat: 0,
            fatGoal: defaultGoals.fat,
            entries: []
          })
        }
      } else {
        // No local data available, use defaults
        const defaultGoals = getDefaultNutritionGoals()
        setDailyLog({
          date: new Date(),
          calories: 0,
          calorieGoal: defaultGoals.calories,
          protein: 0,
          proteinGoal: defaultGoals.protein,
          carbs: 0,
          carbsGoal: defaultGoals.carbs,
          fat: 0,
          fatGoal: defaultGoals.fat,
          entries: []
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const addFoodEntry = async (entry: FoodEntry) => {
    // Validate entry values with null checks
    const safeNumber = (value: any): number => {
      const num = Number(value);
      return isNaN(num) || num < 0 ? 0 : num;
    };
    
    const validatedEntry = {
      ...entry,
      calories: safeNumber(entry.calories),
      protein: safeNumber(entry.protein),
      carbs: safeNumber(entry.carbs),
      fat: safeNumber(entry.fat)
    };
    
    const updatedLog = { 
      ...dailyLog, 
      entries: [...dailyLog.entries, validatedEntry],
      calories: dailyLog.calories + validatedEntry.calories,
      protein: dailyLog.protein + validatedEntry.protein,
      carbs: dailyLog.carbs + validatedEntry.carbs,
      fat: dailyLog.fat + validatedEntry.fat
    }
    
    // For guests, only use localStorage
    if (user?.isGuest || user?.type === 'guest') {
      setDailyLog(updatedLog)
      localStorage.setItem('guestNutritionLog', JSON.stringify(updatedLog))
      toast.success('Food logged!')
      return
    }
    
    // For registered users, try API first, fallback to localStorage
    setLoading(true)
    setError(null)
    try {
      // Transform DailyLog to match backend expectations
      const nutritionLogData = {
        date: updatedLog.date.toISOString(),
        foods: updatedLog.entries, // Transform entries to foods for backend
        calories: updatedLog.calories,
        notes: '' // Optional field
      }
      
      const response = await api.post('/api/nutrition-log', nutritionLogData)
      // Backend returns NutritionLog, but we need to maintain the DailyLog structure
      setDailyLog(updatedLog)
      toast.success('Food logged!')
      localStorage.setItem('dailyLog', JSON.stringify(updatedLog))
    } catch (err: any) {
      console.error('Failed to log food to API:', err)
      setError('Could not log food, using local data.')
      // fallback to localStorage
      setDailyLog(updatedLog)
      localStorage.setItem('dailyLog', JSON.stringify(updatedLog))
      toast.success('Food logged locally!')
    } finally {
      setLoading(false)
    }
  }

  const removeFoodEntry = async (index: number) => {
    if (index < 0 || index >= dailyLog.entries.length) {
      console.error('Invalid index for removing food entry:', index)
      return
    }
    
    const entry = dailyLog.entries[index]
    const safeNumber = (value: any): number => {
      const num = Number(value);
      return isNaN(num) || num < 0 ? 0 : num;
    };
    
    const updated = {
      ...dailyLog,
      calories: Math.max(0, dailyLog.calories - safeNumber(entry.calories)),
      protein: Math.max(0, dailyLog.protein - safeNumber(entry.protein)),
      carbs: Math.max(0, dailyLog.carbs - safeNumber(entry.carbs)),
      fat: Math.max(0, dailyLog.fat - safeNumber(entry.fat)),
      entries: dailyLog.entries.filter((_, i) => i !== index)
    }
    
    // For guests, only use localStorage
    if (user?.isGuest || user?.type === 'guest') {
      setDailyLog(updated)
      localStorage.setItem('guestNutritionLog', JSON.stringify(updated))
      toast.success('Food entry removed!')
      return
    }
    
    // For registered users, sync with backend
    setLoading(true)
    try {
      // Transform DailyLog to match backend expectations
      const nutritionLogData = {
        date: updated.date.toISOString(),
        foods: updated.entries, // Transform entries to foods for backend
        calories: updated.calories,
        notes: '' // Optional field
      }
      
      // Update the full nutrition log on the backend
      await api.post('/api/nutrition-log', nutritionLogData)
      setDailyLog(updated)
      localStorage.setItem('dailyLog', JSON.stringify(updated))
      toast.success('Food entry removed!')
    } catch (error) {
      console.error('Failed to sync food removal to backend:', error)
      setError('Could not sync changes to server, using local data.')
      // Still apply the change locally
      setDailyLog(updated)
      localStorage.setItem('dailyLog', JSON.stringify(updated))
      toast.success('Food entry removed locally!')
    } finally {
      setLoading(false)
    }
  }

  const generateMealPlan = async () => {
    try {
      if (!user) {
        throw new Error('User not found')
      }
      
      // Check if user has required profile fields - support both nested and flat structure
      const profile = user.profile || user;
      const requiredFields = ['height', 'weight', 'age', 'gender', 'activityLevel']
      const missingFields = requiredFields.filter(field => !profile[field as keyof typeof profile])
      
      // Provide default values for missing fields instead of throwing error
      const profileWithDefaults = {
        ...profile,
        height: profile.height || 70, // Default 5'10" in inches
        weight: profile.weight || 155, // Default 155 lbs
        age: profile.age || 30, // Default 30 years old
        gender: profile.gender || 'other', // Default gender
        activityLevel: profile.activityLevel || 'moderate', // Default activity level
        dietaryPreferences: profile.dietaryPreferences || [], // Default no restrictions
        fitnessGoals: profile.fitnessGoals || ['maintain_weight'] // Default goal
      };
      
      if (missingFields.length > 0) {
        console.warn(`Meal plan generation using default values for missing fields: ${missingFields.join(', ')}`);
        // Show a warning toast but don't block generation
        toast.error(`Using default values for missing profile fields: ${missingFields.join(', ')}. Complete your profile for better personalization.`, {
          duration: 6000
        });
      }
      
      const plan = await retry(() => generateWithGPT({
        type: 'meal_plan',
        fitnessProfile: profileWithDefaults,
        preferences: {
          dietaryRestrictions: profileWithDefaults.dietaryPreferences || [],
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

  // Barcode scanning is handled directly in FoodScan component
  // This function is deprecated and kept for backward compatibility
  const scanBarcode = async (): Promise<FoodEntry | null> => {
    console.warn('scanBarcode in NutritionContext is deprecated. Use FoodScan component directly.')
    return null
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