import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useNutrition } from '../contexts/NutritionContext'
import { FoodEntry } from '../types/nutrition'
import { api } from '../services/api'
import { toast } from 'react-hot-toast'

interface NutritionGoals {
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface DailyTotals {
  calories: number
  protein: number
  carbs: number
  fat: number
}

const NutritionTracking: React.FC = () => {
  const { user } = useAuth()
  const { dailyLog, addFoodEntry, removeFoodEntry } = useNutrition()
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showFoodSearch, setShowFoodSearch] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [quickAddAmount, setQuickAddAmount] = useState<{ [key: string]: number }>({})

  // Calculate daily nutrition goals based on user profile
  const calculateNutritionGoals = (): NutritionGoals => {
    if (!user) return { calories: 2000, protein: 150, carbs: 250, fat: 67 }
    
    // Calculate BMR using Mifflin-St Jeor equation
    const weight = user.weight || 70
    const height = user.height || 170
    const age = user.age || 30
    const gender = user.gender || 'male'
    
    let bmr: number
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161
    }
    
    // Apply activity level multiplier
    const activityMultipliers = {
      'sedentary': 1.2,
      'lightly-active': 1.375,
      'moderately-active': 1.55,
      'very-active': 1.725,
      'extremely-active': 1.9
    }
    
    const activityLevel = user.activityLevel || 'moderately-active'
    const tdee = bmr * (activityMultipliers[activityLevel as keyof typeof activityMultipliers] || 1.55)
    
    // Adjust for fitness goals
    let calorieGoal = tdee
    if (user.fitnessGoals?.includes('weight-loss')) {
      calorieGoal = tdee - 500 // 500 calorie deficit
    } else if (user.fitnessGoals?.includes('muscle-gain')) {
      calorieGoal = tdee + 300 // 300 calorie surplus
    }
    
    // Calculate macro goals (protein: 1.6g/kg, fat: 25% of calories, carbs: remainder)
    const protein = weight * 1.6
    const fat = (calorieGoal * 0.25) / 9 // 9 calories per gram of fat
    const carbs = (calorieGoal - (protein * 4) - (fat * 9)) / 4 // 4 calories per gram
    
    return {
      calories: Math.round(calorieGoal),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat)
    }
  }

  const nutritionGoals = calculateNutritionGoals()
  const todayEntries = dailyLog.entries

  // Calculate daily totals
  const dailyTotals: DailyTotals = todayEntries.reduce(
    (totals, entry) => ({
      calories: totals.calories + (entry.calories || 0),
      protein: totals.protein + (entry.protein || 0),
      carbs: totals.carbs + (entry.carbs || 0),
      fat: totals.fat + (entry.fat || 0)
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  // Search for foods
  const searchFoods = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([])
      return
    }
    
    setIsSearching(true)
    try {
      const response = await api.get(`/api/food/search?q=${encodeURIComponent(term)}`)
      setSearchResults(response.data.products || [])
    } catch (error) {
      console.error('Food search error:', error)
      toast.error('Failed to search foods')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Quick add food entry
  const handleQuickAdd = (food: any) => {
    const amount = quickAddAmount[food.id] || 100 // Default 100g
    
    const foodEntry: FoodEntry = {
      name: food.product_name || food.name,
      calories: (food.nutriments?.['energy-kcal_100g'] || 0) * (amount / 100),
      protein: (food.nutriments?.proteins_100g || 0) * (amount / 100),
      carbs: (food.nutriments?.carbohydrates_100g || 0) * (amount / 100),
      fat: (food.nutriments?.fat_100g || 0) * (amount / 100),
      servingSize: amount.toString(),
      servingUnit: 'g'
    }
    
    addFoodEntry(foodEntry)
    toast.success(`Added ${foodEntry.name} to food diary`)
    setShowFoodSearch(false)
    setSearchTerm('')
    setSearchResults([])
  }

  // Remove food entry
  const handleRemoveEntry = (index: number) => {
    removeFoodEntry(index)
    toast.success('Food entry removed')
  }

  useEffect(() => {
    if (searchTerm) {
      const timeoutId = setTimeout(() => searchFoods(searchTerm), 500)
      return () => clearTimeout(timeoutId)
    } else {
      setSearchResults([])
    }
  }, [searchTerm])

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Nutrition Tracking</h1>
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
            />
            <button
              onClick={() => setShowFoodSearch(true)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
            >
              + Add Food
            </button>
          </div>
        </div>

        {/* Daily Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Object.entries(dailyTotals).map(([key, value]) => {
            const goal = nutritionGoals[key as keyof NutritionGoals]
            const percentage = goal > 0 ? (value / goal) * 100 : 0
            const isCalories = key === 'calories'
            
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900 rounded-xl p-4 border border-gray-800"
              >
                <h3 className="text-sm text-gray-400 uppercase tracking-wide mb-2">
                  {key === 'carbs' ? 'Carbs' : key.charAt(0).toUpperCase() + key.slice(1)}
                </h3>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-bold">
                    {Math.round(value)}
                  </span>
                  <span className="text-gray-400">
                    / {goal}{isCalories ? '' : 'g'}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      percentage > 100 ? 'bg-red-500' : 
                      percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {Math.round(percentage)}% of goal
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Food Entries */}
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">
            Food Diary - {new Date(selectedDate).toLocaleDateString()}
          </h2>
          
          {todayEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-lg mb-2">No food entries for this day</p>
              <p className="text-sm">Click "Add Food" to start tracking your nutrition</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayEntries.map((entry, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-4 bg-black rounded-lg border border-gray-800"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{entry.name}</h3>
                    <p className="text-sm text-gray-400">
                      {entry.servingSize} {entry.servingUnit}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-400">{Math.round(entry.calories || 0)} cal</span>
                    <span className="text-blue-400">{Math.round(entry.protein || 0)}g protein</span>
                    <span className="text-yellow-400">{Math.round(entry.carbs || 0)}g carbs</span>
                    <span className="text-red-400">{Math.round(entry.fat || 0)}g fat</span>
                    <button
                      onClick={() => handleRemoveEntry(index)}
                      className="text-gray-400 hover:text-red-400 ml-4"
                    >
                      ✕
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Food Search Modal */}
        {showFoodSearch && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h3 className="text-xl font-bold">Add Food</h3>
                <button
                  onClick={() => {
                    setShowFoodSearch(false)
                    setSearchTerm('')
                    setSearchResults([])
                  }}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6">
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search for foods..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    autoFocus
                  />
                </div>
                
                {isSearching && (
                  <div className="text-center py-4 text-gray-400">
                    Searching foods...
                  </div>
                )}
                
                <div className="max-h-96 overflow-y-auto">
                  {searchResults.map((food, index) => (
                    <div
                      key={food.id || index}
                      className="flex items-center justify-between p-4 border border-gray-700 rounded-lg mb-2"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold">{food.product_name || food.name}</h4>
                        <p className="text-sm text-gray-400">
                          {food.nutriments?.['energy-kcal_100g'] || 0} cal per 100g
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="100"
                          value={quickAddAmount[food.id] || ''}
                          onChange={(e) => setQuickAddAmount({
                            ...quickAddAmount,
                            [food.id]: parseInt(e.target.value) || 100
                          })}
                          className="w-16 px-2 py-1 bg-black border border-gray-600 rounded text-sm"
                        />
                        <span className="text-xs text-gray-400">g</span>
                        <button
                          onClick={() => handleQuickAdd(food)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {searchTerm && !isSearching && searchResults.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      No foods found for "{searchTerm}"
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

export default NutritionTracking