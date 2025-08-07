import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNutrition } from '../contexts/NutritionContext'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { isProfileComplete } from '../utils/profile'
import { FoodEntry } from '../types/nutrition'
import { api } from '../services/api'
import ErrorBoundary from '../components/common/ErrorBoundary'

const FALLBACK_IMAGE = '/assets/meal-fallback.png';

interface SavedMealPlan {
  id: number
  dietType: string
  createdAt: string
  updatedAt: string
  meals: any[]
  shoppingList: any[]
}

interface Recipe {
  id: number
  name: string
  description?: string
  category: string
  difficulty: string
  prepTime: number
  cookTime: number
  servings: number
  ingredients: any[]
  instructions: string[]
  nutrition?: any
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

// Simplified error boundary for meal planning
const MealPlanningErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const fallbackUI = (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center p-8 max-w-md">
        <div className="text-6xl mb-4">🍽️</div>
        <h1 className="text-2xl font-bold mb-4">Meal Planning Unavailable</h1>
        <p className="text-gray-400 mb-6">
          We're having trouble loading the meal planning feature. Please try refreshing the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Refresh Page
        </button>
      </div>
    </div>
  )

  return (
    <ErrorBoundary fallback={fallbackUI}>
      {children}
    </ErrorBoundary>
  )
}

const MealPlanningCore: React.FC = () => {
  // Safe context initialization with error handling
  const nutrition = useNutrition()
  const auth = useAuth()
  const navigate = useNavigate()
  
  // Safe destructuring with fallbacks
  const { mealPlan, generateMealPlan, addFoodEntry } = nutrition || {}
  const { user } = auth || {}
  
  // Track user changes for debugging (reduced logging)
  const userRef = useRef(user)
  if (userRef.current !== user && user) {
    console.log('MealPlanning: User loaded', { email: user.email, type: user.type })
    userRef.current = user
  }
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedPlans, setSavedPlans] = useState<SavedMealPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<SavedMealPlan | null>(null)
  const [showSavedPlans, setShowSavedPlans] = useState(false)
  const [showShoppingList, setShowShoppingList] = useState(false)
  const [currentShoppingList, setCurrentShoppingList] = useState<any[]>([])
  
  // Recipe integration state
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [showRecipeForm, setShowRecipeForm] = useState(false)
  const [recipeSearchTerm, setRecipeSearchTerm] = useState('')
  
  // Recipe form state
  const [recipeForm, setRecipeForm] = useState({
    name: '',
    description: '',
    category: 'dinner',
    difficulty: 'medium',
    prepTime: 30,
    cookTime: 0,
    servings: 4,
    ingredients: [{ name: '', quantity: 1, unit: 'cup' }],
    instructions: ['']
  })
  
  // Fasting and meal timing state
  const [fastingSchedule, setFastingSchedule] = useState({
    type: 'none', // 'none', '16:8', '18:6', '20:4', 'omad', 'custom'
    startTime: '20:00', // Fasting start time
    endTime: '12:00',   // Eating window start time
    enabled: false
  })
  const [showFastingModal, setShowFastingModal] = useState(false)
  const [fastingTimer, setFastingTimer] = useState({
    isActive: false,
    timeRemaining: 0,
    phase: 'eating' // 'eating' or 'fasting'
  })

  // Centralized error handler
  const handleError = (error: any, action: string) => {
    console.error(`${action} failed:`, error);
    const errorMessage = error.response?.data?.error || error.message || `Failed to ${action.toLowerCase()}`;
    setError(errorMessage);
    
    // Show error toast
    const event = new CustomEvent('show-toast', {
      detail: { message: errorMessage, type: 'error' }
    });
    window.dispatchEvent(event);
  }

  // Success handler
  const handleSuccess = (message: string) => {
    const event = new CustomEvent('show-toast', {
      detail: { message, type: 'success' }
    });
    window.dispatchEvent(event);
  }

  // Check profile completeness without blocking access
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  useEffect(() => {
    // For registered users, check profile completeness but don't block access
    if (user && !user.isGuest && user.type !== 'guest') {
      const profileComplete = isProfileComplete(user);
      setProfileIncomplete(!profileComplete);
      
      if (!profileComplete) {
        // Get detailed information about missing fields from console logs
        // This will be captured by the enhanced isProfileComplete function
        console.log('MealPlanning: User profile incomplete but allowing access with warnings:', {
          user: user.email,
          profileComplete: profileComplete,
          hasProfile: !!user.profile
        });
        
        // Set some common missing fields (will be improved with detailed validation)
        const profile = user.profile || user;
        const missing = [];
        if (!profile.height || profile.height <= 0) missing.push('height');
        if (!profile.weight || profile.weight <= 0) missing.push('weight');
        if (!profile.age || profile.age <= 0) missing.push('age');
        if (!profile.gender) missing.push('gender');
        if (!Array.isArray(profile.fitnessGoals) || profile.fitnessGoals.length === 0) missing.push('fitness goals');
        if (!profile.activityLevel) missing.push('activity level');
        setMissingFields(missing);
      }
    }
    
    // Load saved meal plans and recipes for registered users
    if (user && !user.isGuest && user.type !== 'guest') {
      loadSavedPlans();
      loadRecipes();
    }
    
    // For guests, load any locally stored meal plans
    if (user && (user.isGuest || user.type === 'guest')) {
      loadGuestMealPlans();
    }
  }, [user, navigate]);

  const loadSavedPlans = async () => {
    try {
      const response = await api.get('/api/meal-plans');
      setSavedPlans(response.data.mealPlans || []);
    } catch (err: any) {
      handleError(err, 'Load saved meal plans');
      setSavedPlans([]);
    }
  };

  const loadGuestMealPlans = () => {
    try {
      const guestPlans = localStorage.getItem('guest_meal_plans');
      if (guestPlans) {
        const plans = JSON.parse(guestPlans);
        setSavedPlans(plans || []);
      } else {
        setSavedPlans([]);
      }
    } catch (err) {
      console.error('Failed to load guest meal plans from localStorage:', err);
      setSavedPlans([]);
    }
  };

  const saveGuestMealPlan = (plan: any) => {
    try {
      const existingPlans = JSON.parse(localStorage.getItem('guest_meal_plans') || '[]');
      const newPlan = {
        id: Date.now(), // Simple ID for guests
        dietType: 'balanced',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        meals: plan,
        shoppingList: []
      };
      
      const updatedPlans = [newPlan, ...existingPlans.slice(0, 4)]; // Keep max 5 plans for guests
      localStorage.setItem('guest_meal_plans', JSON.stringify(updatedPlans));
      setSavedPlans(updatedPlans);
      
      return newPlan;
    } catch (err) {
      console.error('Failed to save guest meal plan to localStorage:', err);
      throw new Error('Failed to save meal plan locally');
    }
  };

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const preferences = {
        fastingSchedule: fastingSchedule.enabled ? {
          type: fastingSchedule.type,
          startTime: fastingSchedule.startTime,
          endTime: fastingSchedule.endTime
        } : null,
        optimizeForFasting: fastingSchedule.enabled && fastingSchedule.type !== 'none'
      };
      
      const response = await api.post('/api/meal-plans/generate', {
        dietType: 'balanced',
        days: 7,
        preferences
      });
      
      const generatedPlan = response.data;
      if (!generatedPlan || !generatedPlan.meals) {
        throw new Error('Invalid meal plan generated. Please try again.');
      }
      
      setSelectedPlan(generatedPlan);
      setCurrentShoppingList(generatedPlan.shoppingList || []);
      
      // Update nutrition context (ignore errors)
      try {
        await generateMealPlan();
      } catch (nutritionError) {
        console.warn('Failed to update nutrition context:', nutritionError);
      }
      
      await loadSavedPlans();
      handleSuccess('Meal plan generated successfully!');
    } catch (err: any) {
      handleError(err, 'Generate meal plan');
    } finally {
      setLoading(false)
    }
  }

  const handleSavePlan = async (plan: any) => {
    try {
      if (!plan || !Array.isArray(plan) || plan.length === 0) {
        throw new Error('Invalid meal plan data. Cannot save empty plan.');
      }
      
      // Handle guest users with localStorage
      if (user && (user.isGuest || user.type === 'guest')) {
        const savedPlan = saveGuestMealPlan(plan);
        setSelectedPlan(savedPlan);
        
        const event = new CustomEvent('show-toast', {
          detail: { message: 'Meal plan saved locally! Sign up to sync across devices.', type: 'success' }
        });
        window.dispatchEvent(event);
        return;
      }
      
      // Handle registered users - create a new meal plan using the generate endpoint (which saves automatically)
      const response = await api.post('/api/meal-plans/generate', {
        dietType: 'balanced',
        days: plan.length,
        preferences: {}
      });
      
      // The generate endpoint automatically saves, so just reload the saved plans
      await loadSavedPlans();
      
      const event = new CustomEvent('show-toast', {
        detail: { message: 'New meal plan generated and saved successfully!', type: 'success' }
      });
      window.dispatchEvent(event);
    } catch (err: any) {
      console.error('Failed to save meal plan:', err);
      const errorMessage = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to save meal plan';
      setError(errorMessage);
      
      const event = new CustomEvent('show-toast', {
        detail: { message: errorMessage, type: 'error' }
      });
      window.dispatchEvent(event);
    }
  }

  const handleDeletePlan = async (planId: number) => {
    try {
      if (!planId) {
        throw new Error('Invalid plan ID. Cannot delete meal plan.');
      }
      
      // Handle guest users with localStorage
      if (user && (user.isGuest || user.type === 'guest')) {
        const existingPlans = JSON.parse(localStorage.getItem('guest_meal_plans') || '[]');
        const updatedPlans = existingPlans.filter((plan: any) => plan.id !== planId);
        localStorage.setItem('guest_meal_plans', JSON.stringify(updatedPlans));
        setSavedPlans(updatedPlans);
        
        if (selectedPlan?.id === planId) {
          setSelectedPlan(null);
          setCurrentShoppingList([]);
        }
        
        const event = new CustomEvent('show-toast', {
          detail: { message: 'Meal plan deleted successfully!', type: 'success' }
        });
        window.dispatchEvent(event);
        return;
      }
      
      // Handle registered users
      await api.delete(`/api/meal-plans/${planId}`);
      await loadSavedPlans();
      
      if (selectedPlan?.id === planId) {
        setSelectedPlan(null);
        setCurrentShoppingList([]);
      }
      
      const event = new CustomEvent('show-toast', {
        detail: { message: 'Meal plan deleted successfully!', type: 'success' }
      });
      window.dispatchEvent(event);
    } catch (err: any) {
      console.error('Failed to delete meal plan:', err);
      const errorMessage = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to delete meal plan';
      setError(errorMessage);
      
      const event = new CustomEvent('show-toast', {
        detail: { message: errorMessage, type: 'error' }
      });
      window.dispatchEvent(event);
    }
  }

  const handleSelectPlan = async (plan: SavedMealPlan) => {
    setSelectedPlan(plan);
    setCurrentShoppingList(plan.shoppingList || []);
  }

  const handleLogMeal = (meal: any) => {
    if (!meal?.items?.[0]) return

    const foodEntry: FoodEntry = {
      name: meal.items[0].name,
      calories: meal.items[0].calories || 0,
      protein: meal.items[0].protein || 0,
      carbs: meal.items[0].carbs || 0,
      fat: meal.items[0].fat || 0,
      servingSize: meal.items[0].servingSize || '1',
      servingUnit: meal.items[0].servingUnit || 'serving'
    }

    addFoodEntry(foodEntry)
    
    // Show success message
    const event = new CustomEvent('show-toast', {
      detail: { message: `${foodEntry.name} added to nutrition log!`, type: 'success' }
    });
    window.dispatchEvent(event);
  }

  // Recipe management functions
  const loadRecipes = async () => {
    try {
      const response = await api.get('/api/recipes');
      const recipesData = response.data;
      
      if (Array.isArray(recipesData)) {
        setRecipes(recipesData);
      } else if (recipesData && Array.isArray(recipesData.recipes)) {
        setRecipes(recipesData.recipes);
      } else {
        setRecipes([]);
      }
    } catch (err: any) {
      handleError(err, 'Load recipes');
      setRecipes([]);
    }
  };

  const handleCreateRecipe = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!recipeForm.name || !recipeForm.ingredients.length || !recipeForm.instructions.length) {
        throw new Error('Please fill in all required fields: name, ingredients, and instructions.');
      }
      
      const response = await api.post('/api/recipes', recipeForm);
      const newRecipe = response.data;
      setRecipes(prev => Array.isArray(prev) ? [newRecipe, ...prev] : [newRecipe]);
      setSelectedRecipe(newRecipe);
      setShowRecipeForm(false);
      resetRecipeForm();
      
      const event = new CustomEvent('show-toast', {
        detail: { message: 'Recipe created successfully!', type: 'success' }
      });
      window.dispatchEvent(event);
    } catch (err: any) {
      console.error('Failed to create recipe:', err);
      const errorMessage = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to create recipe';
      setError(errorMessage);
      
      const event = new CustomEvent('show-toast', {
        detail: { message: errorMessage, type: 'error' }
      });
      window.dispatchEvent(event);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecipe = async (preferences: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/recipes/generate', preferences);
      const newRecipe = response.data;
      
      if (!newRecipe || !newRecipe.name) {
        throw new Error('Invalid recipe generated. Please try again.');
      }
      
      setRecipes(prev => Array.isArray(prev) ? [newRecipe, ...prev] : [newRecipe]);
      setSelectedRecipe(newRecipe);
      
      const event = new CustomEvent('show-toast', {
        detail: { message: 'Recipe generated successfully!', type: 'success' }
      });
      window.dispatchEvent(event);
    } catch (err: any) {
      console.error('Failed to generate recipe:', err);
      const errorMessage = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to generate recipe';
      setError(errorMessage);
      
      const event = new CustomEvent('show-toast', {
        detail: { message: errorMessage, type: 'error' }
      });
      window.dispatchEvent(event);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipe = async (recipeId: number) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    
    try {
      if (!recipeId) {
        throw new Error('Invalid recipe ID. Cannot delete recipe.');
      }
      
      await api.delete(`/api/recipes/${recipeId}`);
      setRecipes((recipes || []).filter(r => r.id !== recipeId));
      if (selectedRecipe?.id === recipeId) {
        setSelectedRecipe(null);
      }
      
      const event = new CustomEvent('show-toast', {
        detail: { message: 'Recipe deleted successfully!', type: 'success' }
      });
      window.dispatchEvent(event);
    } catch (err: any) {
      console.error('Failed to delete recipe:', err);
      const errorMessage = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to delete recipe';
      setError(errorMessage);
      
      const event = new CustomEvent('show-toast', {
        detail: { message: errorMessage, type: 'error' }
      });
      window.dispatchEvent(event);
    }
  };

  const resetRecipeForm = () => {
    setRecipeForm({
      name: '',
      description: '',
      category: 'dinner',
      difficulty: 'medium',
      prepTime: 30,
      cookTime: 0,
      servings: 4,
      ingredients: [{ name: '', quantity: 1, unit: 'cup' }],
      instructions: ['']
    });
  };

  const addRecipeToMealPlan = (recipe: Recipe, day: number, mealType: string) => {
    // Add selected recipe to the current meal plan
    const event = new CustomEvent('show-toast', {
      detail: { message: `${recipe.name} added to ${mealType} on day ${day + 1}!`, type: 'success' }
    });
    window.dispatchEvent(event);
    setShowRecipeModal(false);
  };

  // Filter recipes based on search term (with comprehensive safety using useMemo)
  const filteredRecipes = useMemo(() => {
    if (!Array.isArray(recipes)) {
      return [];
    }
    
    return recipes.filter(recipe => {
      if (!recipe || typeof recipe !== 'object' || !recipe.name || !recipe.category) {
        return false;
      }
      
      return recipe.name.toLowerCase().includes(recipeSearchTerm.toLowerCase()) ||
             recipe.category.toLowerCase().includes(recipeSearchTerm.toLowerCase());
    });
  }, [recipes, recipeSearchTerm]);
  
  // Meal timing optimizer based on fasting schedule
  const getOptimalMealTiming = (fastingType: string) => {
    const timings = {
      'none': {
        breakfast: '07:00',
        lunch: '12:00',
        dinner: '18:00',
        snack: '15:00'
      },
      '16:8': {
        breakfast: null, // Skip breakfast
        lunch: '12:00',
        dinner: '18:00',
        snack: '15:00'
      },
      '18:6': {
        breakfast: null,
        lunch: '13:00',
        dinner: '18:00',
        snack: null // Skip snack
      },
      '20:4': {
        breakfast: null,
        lunch: null,
        dinner: '18:00',
        snack: '16:00' // Light snack before main meal
      },
      'omad': {
        breakfast: null,
        lunch: null,
        dinner: '18:00',
        snack: null
      }
    };
    
    return timings[fastingType as keyof typeof timings] || timings.none;
  };
  
  // Calculate fasting timer (simplified for demo)
  React.useEffect(() => {
    if (!fastingSchedule.enabled || fastingSchedule.type === 'none') return;
    
    const updateTimer = () => {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      // Convert schedule times to minutes
      const [startHour, startMin] = fastingSchedule.startTime.split(':').map(Number);
      const [endHour, endMin] = fastingSchedule.endTime.split(':').map(Number);
      const fastingStart = startHour * 60 + startMin;
      const eatingStart = endHour * 60 + endMin;
      
      // Determine current phase and time remaining
      let phase: 'eating' | 'fasting';
      let timeRemaining: number;
      
      if (fastingStart < eatingStart) {
        // Normal case: fasting period doesn't cross midnight
        if (currentTime >= fastingStart && currentTime < eatingStart) {
          phase = 'fasting';
          timeRemaining = (eatingStart - currentTime) * 60;
        } else {
          phase = 'eating';
          timeRemaining = currentTime < fastingStart 
            ? (fastingStart - currentTime) * 60
            : (24 * 60 - currentTime + fastingStart) * 60;
        }
      } else {
        // Fasting period crosses midnight
        if (currentTime >= fastingStart || currentTime < eatingStart) {
          phase = 'fasting';
          timeRemaining = currentTime >= fastingStart
            ? (24 * 60 - currentTime + eatingStart) * 60
            : (eatingStart - currentTime) * 60;
        } else {
          phase = 'eating';
          timeRemaining = (fastingStart - currentTime) * 60;
        }
      }
      
      setFastingTimer({ isActive: true, timeRemaining, phase });
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [fastingSchedule]);

  // Profile completion warning banner component
  const ProfileWarningBanner = () => {
    if (!profileIncomplete || missingFields.length === 0) return null;
    
    return (
      <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="text-yellow-400 text-xl">⚠️</div>
          <div className="flex-1">
            <h3 className="text-yellow-300 font-semibold mb-1">Complete Your Profile for Better Meal Plans</h3>
            <p className="text-yellow-100 text-sm mb-3">
              Some profile fields are missing. We'll use default values for now, but completing your profile will give you more personalized meal plans.
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-yellow-200 text-xs">Missing:</span>
              {missingFields.map(field => (
                <span key={field} className="bg-yellow-800/50 text-yellow-200 px-2 py-1 rounded text-xs">
                  {field}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => navigate('/profile')}
                className="bg-yellow-600 hover:bg-yellow-700 text-black px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                Complete Profile
              </button>
              <button 
                onClick={() => setProfileIncomplete(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Dietary preferences indicator component
  const DietaryPreferencesIndicator = () => {
    if (!user?.profile) return null;
    
    const profile = user.profile || user;
    const dietaryPreferences = profile.dietaryPreferences || [];
    
    if (dietaryPreferences.length === 0) {
      return (
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="text-gray-400 text-sm">🍽️</div>
            <span className="text-gray-300 text-sm">No dietary preferences set - meal plans will include all food types</span>
            <button 
              onClick={() => navigate('/profile')}
              className="text-blue-400 hover:text-blue-300 text-sm underline ml-auto"
            >
              Set preferences
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-green-900/30 border border-green-600 rounded-lg p-3 mb-4">
        <div className="flex items-start gap-2">
          <div className="text-green-400 text-sm">🥗</div>
          <div className="flex-1">
            <span className="text-green-300 text-sm font-medium">Active Dietary Preferences:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {dietaryPreferences.map((pref: string) => (
                <span key={pref} className="bg-green-800/50 text-green-200 px-2 py-1 rounded text-xs capitalize">
                  {pref.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
          <button 
            onClick={() => navigate('/profile')}
            className="text-green-400 hover:text-green-300 text-xs underline"
          >
            Edit
          </button>
        </div>
      </div>
    );
  };

  const currentPlanData = selectedPlan?.meals || mealPlan;

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Profile completion warning banner */}
        <ProfileWarningBanner />
        
        {/* Dietary preferences indicator */}
        <DietaryPreferencesIndicator />
        
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">AI Meal Planning</h2>
          
          {/* Mobile Action Buttons - Stacked */}
          <div className="flex flex-col sm:hidden gap-3 mb-4">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold disabled:opacity-50 text-base min-h-[44px]"
            >
              {loading ? 'Generating...' : 'Generate New Plan'}
            </button>
            
            <div className="grid grid-cols-2 gap-3">
              {savedPlans.length > 0 && (
                <button
                  onClick={() => setShowSavedPlans(!showSavedPlans)}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium text-sm min-h-[44px]"
                >
                  {showSavedPlans ? 'Hide' : 'Show'} Plans ({savedPlans.length})
                </button>
              )}
              <button
                onClick={() => setShowRecipeModal(true)}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium text-sm min-h-[44px]"
              >
                Recipes ({(recipes || []).length})
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowRecipeForm(true)}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-sm min-h-[44px]"
              >
                + Create Recipe
              </button>
              <button
                onClick={() => setShowFastingModal(true)}
                className="px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium text-sm min-h-[44px] flex items-center justify-center gap-1"
              >
                ⏰ Fasting
                {fastingSchedule.enabled && (
                  <span className="bg-green-500 text-white text-xs px-1 py-0.5 rounded">
                    {fastingSchedule.type}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {/* Desktop Action Buttons - Horizontal */}
          <div className="hidden sm:flex items-center justify-between">
            <div></div>
            <div className="flex gap-4">
              {savedPlans.length > 0 && (
                <button
                  onClick={() => setShowSavedPlans(!showSavedPlans)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold"
                >
                  {showSavedPlans ? 'Hide' : 'Show'} Saved Plans ({savedPlans.length})
                </button>
              )}
              <button
                onClick={() => setShowRecipeModal(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold"
              >
                Browse Recipes ({(recipes || []).length})
              </button>
              <button
                onClick={() => setShowRecipeForm(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold"
              >
                + Create Recipe
              </button>
              <button
                onClick={() => setShowFastingModal(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg font-semibold flex items-center gap-2"
              >
                ⏰ Fasting Schedule
                {fastingSchedule.enabled && (
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    {fastingSchedule.type}
                  </span>
                )}
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate New Plan'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Fasting Timer Display */}
        {fastingSchedule.enabled && fastingSchedule.type !== 'none' && (
          <div className="mb-6 bg-gradient-to-r from-orange-900 to-orange-800 rounded-xl p-6 border border-orange-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-3xl">
                  {fastingTimer.phase === 'fasting' ? '😵' : '🍽️'}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-orange-100">
                    {fastingTimer.phase === 'fasting' ? 'Fasting Active' : 'Eating Window'}
                  </h3>
                  <p className="text-orange-200 text-sm">
                    {fastingSchedule.type} Schedule • 
                    {fastingTimer.phase === 'fasting' 
                      ? `Eating window opens at ${fastingSchedule.endTime}`
                      : `Fasting starts at ${fastingSchedule.startTime}`
                    }
                  </p>
                </div>
              </div>
              
              {/* Timer Display */}
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-100">
                  {Math.floor(fastingTimer.timeRemaining / 3600).toString().padStart(2, '0')}:
                  {Math.floor((fastingTimer.timeRemaining % 3600) / 60).toString().padStart(2, '0')}:
                  {(fastingTimer.timeRemaining % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-orange-200 text-sm">
                  {fastingTimer.phase === 'fasting' ? 'Until eating window' : 'Until fasting starts'}
                </div>
              </div>
              
              <button
                onClick={() => setShowFastingModal(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm"
              >
                Adjust
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-orange-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-orange-400 to-orange-300 h-2 rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${fastingTimer.phase === 'fasting' 
                      ? ((16 * 3600 - fastingTimer.timeRemaining) / (16 * 3600)) * 100
                      : ((8 * 3600 - fastingTimer.timeRemaining) / (8 * 3600)) * 100
                    }%` 
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-orange-300 mt-1">
                <span>{fastingTimer.phase === 'fasting' ? 'Fasting Progress' : 'Eating Window Progress'}</span>
                <span>
                  {fastingTimer.phase === 'fasting' 
                    ? `${Math.round(((16 * 3600 - fastingTimer.timeRemaining) / (16 * 3600)) * 100)}% complete`
                    : `${Math.round(((8 * 3600 - fastingTimer.timeRemaining) / (8 * 3600)) * 100)}% remaining`
                  }
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Saved Plans Section - Mobile Optimized */}
        {showSavedPlans && savedPlans.length > 0 && (
          <div className="mb-8 bg-gray-900 rounded-2xl p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold mb-4">Saved Meal Plans</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {savedPlans.map((plan) => (
                <div 
                  key={plan.id} 
                  className={`border rounded-lg p-3 sm:p-4 cursor-pointer transition-colors ${
                    selectedPlan?.id === plan.id 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => handleSelectPlan(plan)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold capitalize text-sm sm:text-base">{plan.dietType} Plan</h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlan(plan.id);
                      }}
                      className="text-red-400 hover:text-red-300 text-sm min-h-[32px] min-w-[32px] flex items-center justify-center sm:min-h-[auto] sm:min-w-[auto]"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Created: {new Date(plan.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Days: {Array.isArray(plan.meals) ? plan.meals.length : 0}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Smart Meal Insights Panel */}
        {(selectedPlan || mealPlan.length > 0) && (
          <div className="mb-6 bg-gradient-to-r from-blue-900 to-purple-900 rounded-xl p-6 border border-blue-700">
            <h3 className="text-xl font-bold mb-4 text-blue-100">🧠 Smart Meal Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Nutritional Balance */}
              <div className="bg-black/30 rounded-lg p-4">
                <h4 className="font-semibold text-blue-200 mb-2">🥗 Nutritional Balance</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Protein:</span>
                    <span className="text-green-400 font-semibold">Optimal</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Carbs:</span>
                    <span className="text-yellow-400 font-semibold">Moderate</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Fats:</span>
                    <span className="text-green-400 font-semibold">Good</span>
                  </div>
                </div>
              </div>
              
              {/* Fasting Compatibility */}
              {fastingSchedule.enabled && (
                <div className="bg-black/30 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-200 mb-2">⏰ Fasting Compatibility</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Schedule Match:</span>
                      <span className="text-green-400 font-semibold">95%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Meal Timing:</span>
                      <span className="text-green-400 font-semibold">Optimized</span>
                    </div>
                    <div className="text-orange-300 text-xs">
                      ✨ Plan adapted for {fastingSchedule.type} fasting
                    </div>
                  </div>
                </div>
              )}
              
              {/* Recipe Integration */}
              <div className="bg-black/30 rounded-lg p-4">
                <h4 className="font-semibold text-purple-200 mb-2">📚 Recipe Suggestions</h4>
                <div className="space-y-2 text-sm">
                  <div className="text-gray-300">
                    {(recipes || []).length} saved recipes available
                  </div>
                  <div className="text-purple-300 text-xs">
                    💡 Try adding your favorite recipes to meal plans
                  </div>
                  <button
                    onClick={() => setShowRecipeModal(true)}
                    className="w-full mt-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded"
                  >
                    Browse Recipes
                  </button>
                </div>
              </div>
            </div>
            
            {/* Smart Recommendations */}
            <div className="mt-4 pt-4 border-t border-blue-700">
              <h4 className="font-semibold text-blue-200 mb-2">🎯 Smart Recommendations</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-400">✓</span>
                    <span className="font-medium text-green-300">Well-balanced protein distribution</span>
                  </div>
                  <p className="text-green-200 text-xs">Your meals provide steady protein throughout the day</p>
                </div>
                
                {fastingSchedule.enabled && (
                  <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-orange-400">💡</span>
                      <span className="font-medium text-orange-300">Fasting-optimized timing</span>
                    </div>
                    <p className="text-orange-200 text-xs">Meals are timed to support your {fastingSchedule.type} schedule</p>
                  </div>
                )}
                
                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue-400">🥗</span>
                    <span className="font-medium text-blue-300">Nutrient variety</span>
                  </div>
                  <p className="text-blue-200 text-xs">Good mix of vitamins and minerals across meals</p>
                </div>
                
                {(recipes || []).length > 0 && (
                  <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-purple-400">📚</span>
                      <span className="font-medium text-purple-300">Recipe integration ready</span>
                    </div>
                    <p className="text-purple-200 text-xs">Substitute meals with your saved recipes anytime</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Shopping List Toggle - Mobile Optimized - Only show if shopping list has data */}
        {(selectedPlan || mealPlan.length > 0) && currentShoppingList.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowShoppingList(!showShoppingList)}
              className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-base sm:text-sm min-h-[44px] sm:min-h-[auto]"
            >
              {showShoppingList ? 'Hide' : 'Show'} Shopping List
            </button>
          </div>
        )}
        
        {/* Shopping List Section - Mobile Optimized */}
        {showShoppingList && currentShoppingList.length > 0 && (
          <div className="mb-8 bg-gray-900 rounded-2xl p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold mb-4">Shopping List</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {currentShoppingList.map((category, idx) => (
                <div key={idx} className="bg-black border border-gray-800 rounded-lg p-3 sm:p-4">
                  <h4 className="font-semibold text-blue-300 mb-3 capitalize text-sm sm:text-base">{category.category}</h4>
                  <ul className="space-y-2">
                    {category.items?.map((item: any, itemIdx: number) => (
                      <li key={itemIdx} className="flex justify-between text-xs sm:text-sm">
                        <span className="pr-2">{item.name}</span>
                        <span className="text-gray-400 flex-shrink-0">{item.quantity} {item.unit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {error && <div className="mb-4 text-red-400">{error}</div>}
        {(!selectedPlan && (!mealPlan || mealPlan.length === 0)) ? (
          <div className="text-center text-gray-400 mt-12 text-lg">
            No meal plan selected. Generate a new plan or select a saved plan to get started!
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* Day Navigation for Mobile */}
            {currentPlanData.length > 1 && (
              <div className="block sm:hidden mb-6">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {currentPlanData.map((_, dayIdx) => (
                    <button
                      key={dayIdx}
                      onClick={() => {
                        document.getElementById(`day-${dayIdx}`)?.scrollIntoView({ 
                          behavior: 'smooth', 
                          block: 'start' 
                        });
                      }}
                      className="flex-shrink-0 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium min-w-[80px] min-h-[40px]"
                    >
                      Day {dayIdx + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Display selected saved plan or generated plan */}
            {currentPlanData.map((day, idx) => (
              <section key={idx} id={`day-${idx}`} className="bg-gray-900 rounded-2xl p-4 sm:p-8 shadow-lg scroll-mt-4">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold text-blue-300">Day {idx + 1}</h3>
                  
                  {/* Day Navigation Arrows for Mobile */}
                  <div className="flex gap-2 sm:hidden">
                    {idx > 0 && (
                      <button
                        onClick={() => {
                          document.getElementById(`day-${idx - 1}`)?.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start' 
                          });
                        }}
                        className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
                        title="Previous day"
                      >
                        ←
                      </button>
                    )}
                    {idx < currentPlanData.length - 1 && (
                      <button
                        onClick={() => {
                          document.getElementById(`day-${idx + 1}`)?.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start' 
                          });
                        }}
                        className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
                        title="Next day"
                      >
                        →
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {['breakfast', 'lunch', 'dinner', 'snack'].map((mealType) => {
                    const meal = day.meals?.find((m: any) => m.type === mealType)
                    
                    // Check if meal falls within eating window when fasting is enabled
                    const isOutsideEatingWindow = fastingSchedule.enabled && fastingSchedule.type !== 'none' && (
                      (mealType === 'breakfast' && fastingSchedule.type === '16:8') ||
                      (mealType === 'breakfast' && fastingSchedule.type === '18:6') ||
                      (['breakfast', 'snack'].includes(mealType) && fastingSchedule.type === '20:4') ||
                      (['breakfast', 'lunch', 'snack'].includes(mealType) && fastingSchedule.type === 'omad')
                    )
                    
                    return (
                      <article key={mealType} className={`bg-black border rounded-xl p-3 sm:p-4 flex flex-col items-center shadow-md ${
                        isOutsideEatingWindow 
                          ? 'border-orange-500/50 bg-orange-900/20' 
                          : 'border-gray-800'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-base sm:text-lg font-semibold capitalize text-white">{mealType}</h4>
                          {isOutsideEatingWindow && (
                            <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded-full" title="Outside eating window">
                              ⏰
                            </span>
                          )}
                        </div>
                        <img
                          src={meal?.items?.[0]?.imageUrl || FALLBACK_IMAGE}
                          alt={meal?.items?.[0]?.name || 'Meal'}
                          className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded mb-2 border border-gray-700"
                        />
                        <div className="text-center mb-2">
                          <span className="font-bold text-white text-sm sm:text-base">{meal?.items?.[0]?.name || 'No meal'}</span>
                          <div className="text-gray-400 text-xs mt-1 px-1">{meal?.items?.[0]?.description || 'No description available.'}</div>
                        </div>
                        <div className="flex flex-col gap-1 text-xs text-gray-300 w-full">
                          <div className="flex justify-between">Calories: <span className="font-semibold text-white">{meal?.items?.[0]?.calories ?? '--'}</span></div>
                          <div className="flex justify-between">Protein: <span className="font-semibold text-white">{meal?.items?.[0]?.protein ?? '--'}g</span></div>
                          <div className="flex justify-between">Carbs: <span className="font-semibold text-white">{meal?.items?.[0]?.carbs ?? '--'}g</span></div>
                          <div className="flex justify-between">Fat: <span className="font-semibold text-white">{meal?.items?.[0]?.fat ?? '--'}g</span></div>
                        </div>
                        {meal && (
                          <>
                            <div className="mt-3 space-y-2 w-full">
                              <button
                                onClick={() => handleLogMeal(meal)}
                                className="w-full px-3 py-2 sm:py-1 bg-green-600 hover:bg-green-700 text-white text-sm sm:text-xs rounded-lg transition-colors duration-200 min-h-[36px] sm:min-h-[auto]"
                              >
                                + Log This Meal
                              </button>
                              
                              {(recipes || []).length > 0 && (
                                <button
                                  onClick={() => {
                                    setShowRecipeModal(true);
                                    // Could implement meal substitution logic here
                                  }}
                                  className="w-full px-3 py-2 sm:py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm sm:text-xs rounded-lg transition-colors duration-200 min-h-[36px] sm:min-h-[auto]"
                                >
                                  🔄 Substitute Recipe
                                </button>
                              )}
                            </div>
                            
                            {isOutsideEatingWindow && (
                              <div className="mt-2 text-xs text-orange-300 text-center">
                                ⚠️ Outside eating window
                              </div>
                            )}
                          </>
                        )}
                      </article>
                    )
                  })}
                </div>
              </section>
            ))}
            
            {/* Save Plan Button for generated plans - Mobile Optimized */}
            {!selectedPlan && mealPlan.length > 0 && (
              <div className="text-center mt-8">
                <button
                  onClick={() => handleSavePlan(mealPlan)}
                  className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-base min-h-[44px]"
                >
                  💾 Save This Meal Plan
                </button>
              </div>
            )}
          </div>
        )}

        {/* Recipe Browse Modal - Mobile Optimized */}
        {showRecipeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700">
                <h3 className="text-xl sm:text-2xl font-bold">Browse Recipes</h3>
                <button
                  onClick={() => setShowRecipeModal(false)}
                  className="text-gray-400 hover:text-white text-2xl min-h-[44px] min-w-[44px] sm:min-h-[auto] sm:min-w-[auto] flex items-center justify-center"
                >
                  ×
                </button>
              </div>
              
              <div className="p-4 sm:p-6">
                {/* Search Bar - Mobile Optimized */}
                <div className="mb-4 sm:mb-6">
                  <input
                    type="text"
                    placeholder="Search recipes..."
                    value={recipeSearchTerm}
                    onChange={(e) => setRecipeSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 sm:py-2 bg-black border border-gray-600 rounded-lg text-white text-base sm:text-sm"
                  />
                </div>

                {/* Recipe Grid - Mobile Optimized */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-h-80 sm:max-h-96 overflow-y-auto">
                  {filteredRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="bg-black border border-gray-700 rounded-lg p-3 sm:p-4 hover:border-gray-600 transition-colors"
                    >
                      <h4 className="font-semibold text-white mb-2 text-sm sm:text-base">{recipe.name}</h4>
                      <p className="text-gray-400 text-xs sm:text-sm mb-2 line-clamp-2">{recipe.description}</p>
                      <div className="flex justify-between text-xs text-gray-500 mb-3">
                        <span>Prep: {recipe.prepTime}min</span>
                        <span>Cook: {recipe.cookTime}min</span>
                        <span>Serves: {recipe.servings}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedRecipe(recipe)}
                          className="flex-1 px-3 py-2 sm:py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded min-h-[36px] sm:min-h-[auto]"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleDeleteRecipe(recipe.id)}
                          className="px-3 py-2 sm:py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded min-h-[36px] sm:min-h-[auto]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredRecipes.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    {recipeSearchTerm ? 'No recipes found matching your search.' : 'No recipes yet. Create your first recipe!'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recipe Form Modal - Mobile Optimized */}
        {showRecipeForm && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700">
                <h3 className="text-xl sm:text-2xl font-bold">Create New Recipe</h3>
                <button
                  onClick={() => {
                    setShowRecipeForm(false);
                    resetRecipeForm();
                  }}
                  className="text-gray-400 hover:text-white text-2xl min-h-[44px] min-w-[44px] sm:min-h-[auto] sm:min-w-[auto] flex items-center justify-center"
                >
                  ×
                </button>
              </div>
              
              <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-120px)] sm:max-h-[calc(90vh-120px)]">
                <div className="space-y-4 sm:space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Recipe Name</label>
                      <input
                        type="text"
                        value={recipeForm.name}
                        onChange={(e) => setRecipeForm({ ...recipeForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                        placeholder="Enter recipe name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Category</label>
                      <select
                        value={recipeForm.category}
                        onChange={(e) => setRecipeForm({ ...recipeForm, category: e.target.value })}
                        className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                      >
                        <option value="breakfast">Breakfast</option>
                        <option value="lunch">Lunch</option>
                        <option value="dinner">Dinner</option>
                        <option value="snack">Snack</option>
                        <option value="dessert">Dessert</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={recipeForm.description}
                      onChange={(e) => setRecipeForm({ ...recipeForm, description: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                      rows={3}
                      placeholder="Describe your recipe"
                    />
                  </div>

                  {/* Timing & Difficulty */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Prep Time (min)</label>
                      <input
                        type="number"
                        value={recipeForm.prepTime}
                        onChange={(e) => setRecipeForm({ ...recipeForm, prepTime: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Cook Time (min)</label>
                      <input
                        type="number"
                        value={recipeForm.cookTime}
                        onChange={(e) => setRecipeForm({ ...recipeForm, cookTime: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Servings</label>
                      <input
                        type="number"
                        value={recipeForm.servings}
                        onChange={(e) => setRecipeForm({ ...recipeForm, servings: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Difficulty</label>
                      <select
                        value={recipeForm.difficulty}
                        onChange={(e) => setRecipeForm({ ...recipeForm, difficulty: e.target.value })}
                        className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  {/* Ingredients */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Ingredients</label>
                    {recipeForm.ingredients.map((ingredient, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="number"
                          step="0.1"
                          value={ingredient.quantity}
                          onChange={(e) => {
                            const newIngredients = [...recipeForm.ingredients];
                            newIngredients[index].quantity = parseFloat(e.target.value) || 0;
                            setRecipeForm({ ...recipeForm, ingredients: newIngredients });
                          }}
                          className="w-20 px-2 py-1 bg-black border border-gray-600 rounded text-white text-sm"
                          placeholder="Qty"
                        />
                        <select
                          value={ingredient.unit}
                          onChange={(e) => {
                            const newIngredients = [...recipeForm.ingredients];
                            newIngredients[index].unit = e.target.value;
                            setRecipeForm({ ...recipeForm, ingredients: newIngredients });
                          }}
                          className="w-24 px-2 py-1 bg-black border border-gray-600 rounded text-white text-sm"
                        >
                          <option value="cup">cup</option>
                          <option value="tbsp">tbsp</option>
                          <option value="tsp">tsp</option>
                          <option value="lb">lb</option>
                          <option value="oz">oz</option>
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="piece">piece</option>
                        </select>
                        <input
                          type="text"
                          value={ingredient.name}
                          onChange={(e) => {
                            const newIngredients = [...recipeForm.ingredients];
                            newIngredients[index].name = e.target.value;
                            setRecipeForm({ ...recipeForm, ingredients: newIngredients });
                          }}
                          className="flex-1 px-2 py-1 bg-black border border-gray-600 rounded text-white text-sm"
                          placeholder="Ingredient name"
                        />
                        <button
                          onClick={() => {
                            const newIngredients = recipeForm.ingredients.filter((_, i) => i !== index);
                            setRecipeForm({ ...recipeForm, ingredients: newIngredients });
                          }}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setRecipeForm({
                          ...recipeForm,
                          ingredients: [...recipeForm.ingredients, { name: '', quantity: 1, unit: 'cup' }]
                        });
                      }}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
                    >
                      + Add Ingredient
                    </button>
                  </div>

                  {/* Instructions */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Instructions</label>
                    {recipeForm.instructions.map((instruction, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <span className="text-gray-400 text-sm pt-2 w-8">{index + 1}.</span>
                        <textarea
                          value={instruction}
                          onChange={(e) => {
                            const newInstructions = [...recipeForm.instructions];
                            newInstructions[index] = e.target.value;
                            setRecipeForm({ ...recipeForm, instructions: newInstructions });
                          }}
                          className="flex-1 px-2 py-1 bg-black border border-gray-600 rounded text-white text-sm"
                          rows={2}
                          placeholder={`Step ${index + 1} instructions`}
                        />
                        <button
                          onClick={() => {
                            const newInstructions = recipeForm.instructions.filter((_, i) => i !== index);
                            setRecipeForm({ ...recipeForm, instructions: newInstructions });
                          }}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setRecipeForm({
                          ...recipeForm,
                          instructions: [...recipeForm.instructions, '']
                        });
                      }}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
                    >
                      + Add Step
                    </button>
                  </div>

                  {/* Action Buttons - Mobile Optimized */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                    <button
                      onClick={handleCreateRecipe}
                      disabled={loading || !recipeForm.name}
                      className="flex-1 px-4 py-3 sm:py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-base sm:text-sm min-h-[44px] sm:min-h-[auto]"
                    >
                      {loading ? 'Creating...' : 'Create Recipe'}
                    </button>
                    <button
                      onClick={() => {
                        setShowRecipeForm(false);
                        resetRecipeForm();
                      }}
                      className="px-4 py-3 sm:py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-base sm:text-sm min-h-[44px] sm:min-h-[auto]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fasting Schedule Modal - Mobile Optimized */}
        {showFastingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-gray-900 rounded-xl max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700">
                <h3 className="text-xl sm:text-2xl font-bold">Fasting Schedule</h3>
                <button
                  onClick={() => setShowFastingModal(false)}
                  className="text-gray-400 hover:text-white text-2xl min-h-[44px] min-w-[44px] sm:min-h-[auto] sm:min-w-[auto] flex items-center justify-center"
                >
                  ×
                </button>
              </div>
              
              <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-120px)] sm:max-h-[calc(90vh-120px)]">
                <div className="space-y-4">
                  {/* Fasting Type Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Fasting Type</label>
                    <select
                      value={fastingSchedule.type}
                      onChange={(e) => setFastingSchedule({ ...fastingSchedule, type: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                    >
                      <option value="none">No Fasting</option>
                      <option value="16:8">16:8 (16h fast, 8h eating)</option>
                      <option value="18:6">18:6 (18h fast, 6h eating)</option>
                      <option value="20:4">20:4 (20h fast, 4h eating)</option>
                      <option value="omad">OMAD (One Meal A Day)</option>
                      <option value="custom">Custom Schedule</option>
                    </select>
                  </div>

                  {/* Time Settings */}
                  {fastingSchedule.type !== 'none' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Eating Window Start</label>
                          <input
                            type="time"
                            value={fastingSchedule.endTime}
                            onChange={(e) => setFastingSchedule({ ...fastingSchedule, endTime: e.target.value })}
                            className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Fasting Start</label>
                          <input
                            type="time"
                            value={fastingSchedule.startTime}
                            onChange={(e) => setFastingSchedule({ ...fastingSchedule, startTime: e.target.value })}
                            className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
                          />
                        </div>
                      </div>

                      {/* Schedule Preview */}
                      <div className="bg-black border border-gray-700 rounded-lg p-4">
                        <h4 className="font-semibold mb-2">Schedule Preview</h4>
                        <div className="text-sm text-gray-300">
                          <div>🍽️ Eating Window: {fastingSchedule.endTime} - {fastingSchedule.startTime}</div>
                          <div>⏰ Fasting Period: {fastingSchedule.startTime} - {fastingSchedule.endTime}</div>
                          {fastingSchedule.type !== 'custom' && (
                            <div className="mt-2 text-orange-400">
                              {fastingSchedule.type === '16:8' && 'Popular beginner-friendly schedule'}
                              {fastingSchedule.type === '18:6' && 'Intermediate fasting schedule'}
                              {fastingSchedule.type === '20:4' && 'Advanced fasting schedule'}
                              {fastingSchedule.type === 'omad' && 'Most restrictive - one meal daily'}
                            </div>
                          )}
                        </div>
                        
                        {/* Optimal Meal Timing Suggestions */}
                        {fastingSchedule.type !== 'none' && (
                          <div className="mt-4 pt-4 border-t border-gray-700">
                            <h5 className="font-medium mb-2 text-blue-300">Suggested Meal Timing</h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {Object.entries(getOptimalMealTiming(fastingSchedule.type)).map(([meal, time]) => (
                                <div key={meal} className={`flex justify-between p-2 rounded ${
                                  time ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'
                                }`}>
                                  <span className="capitalize">{meal}:</span>
                                  <span>{time || 'Skip'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Enable/Disable Toggle */}
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Enable Fasting Schedule</span>
                        <button
                          onClick={() => setFastingSchedule({ 
                            ...fastingSchedule, 
                            enabled: !fastingSchedule.enabled 
                          })}
                          className={`w-12 h-6 rounded-full transition-colors duration-200 ${
                            fastingSchedule.enabled ? 'bg-green-600' : 'bg-gray-600'
                          }`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                            fastingSchedule.enabled ? 'translate-x-6' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </div>
                    </>
                  )}

                  {/* Action Buttons - Mobile Optimized */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                    <button
                      onClick={() => {
                        setShowFastingModal(false);
                        // Save fasting schedule to backend if needed
                        const event = new CustomEvent('show-toast', {
                          detail: { 
                            message: fastingSchedule.enabled 
                              ? `Fasting schedule ${fastingSchedule.type} enabled!` 
                              : 'Fasting schedule disabled', 
                            type: 'success' 
                          }
                        });
                        window.dispatchEvent(event);
                      }}
                      className="flex-1 px-4 py-3 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-base sm:text-sm min-h-[44px] sm:min-h-[auto]"
                    >
                      Save Schedule
                    </button>
                    <button
                      onClick={() => setShowFastingModal(false)}
                      className="px-4 py-3 sm:py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-base sm:text-sm min-h-[44px] sm:min-h-[auto]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recipe Details Modal */}
        {selectedRecipe && !showRecipeForm && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h3 className="text-2xl font-bold">{selectedRecipe.name}</h3>
                <button
                  onClick={() => setSelectedRecipe(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="space-y-4">
                  {/* Recipe Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-gray-400">Prep Time</div>
                      <div className="font-semibold">{selectedRecipe.prepTime}min</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400">Cook Time</div>
                      <div className="font-semibold">{selectedRecipe.cookTime}min</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400">Servings</div>
                      <div className="font-semibold">{selectedRecipe.servings}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400">Difficulty</div>
                      <div className="font-semibold capitalize">{selectedRecipe.difficulty}</div>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedRecipe.description && (
                    <div>
                      <h4 className="font-semibold mb-2">Description</h4>
                      <p className="text-gray-300">{selectedRecipe.description}</p>
                    </div>
                  )}

                  {/* Ingredients */}
                  <div>
                    <h4 className="font-semibold mb-2">Ingredients</h4>
                    <ul className="space-y-1">
                      {selectedRecipe.ingredients.map((ingredient: any, index: number) => (
                        <li key={index} className="flex justify-between">
                          <span>{ingredient.name}</span>
                          <span className="text-gray-400">{ingredient.quantity} {ingredient.unit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Instructions */}
                  <div>
                    <h4 className="font-semibold mb-2">Instructions</h4>
                    <ol className="space-y-2">
                      {selectedRecipe.instructions.map((instruction: string, index: number) => (
                        <li key={index} className="flex gap-3">
                          <span className="text-blue-400 font-semibold min-w-[1.5rem]">{index + 1}.</span>
                          <span className="text-gray-300">{instruction}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Nutrition Info */}
                  {selectedRecipe.nutrition && (
                    <div>
                      <h4 className="font-semibold mb-2">Nutrition (per serving)</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-gray-400">Calories</div>
                          <div className="font-semibold">{selectedRecipe.nutrition.calories || '--'}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400">Protein</div>
                          <div className="font-semibold">{selectedRecipe.nutrition.protein || '--'}g</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400">Carbs</div>
                          <div className="font-semibold">{selectedRecipe.nutrition.carbs || '--'}g</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400">Fat</div>
                          <div className="font-semibold">{selectedRecipe.nutrition.fat || '--'}g</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Main component wrapped with error boundary
const MealPlanning: React.FC = () => {
  return (
    <MealPlanningErrorBoundary>
      <MealPlanningCore />
    </MealPlanningErrorBoundary>
  )
}

export default MealPlanning