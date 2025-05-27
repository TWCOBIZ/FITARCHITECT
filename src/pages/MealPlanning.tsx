import React, { useState, useEffect } from 'react'
import { useNutrition } from '../contexts/NutritionContext'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { isProfileComplete } from '../utils/profile'

const FALLBACK_IMAGE = '/assets/meal-fallback.png';

const MealPlanning: React.FC = () => {
  const { mealPlan, generateMealPlan } = useNutrition()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isProfileComplete(user)) {
      navigate('/profile', { state: { from: '/meal-planning', message: 'Please complete your profile to use AI meal planning.' } });
    }
  }, [user, navigate]);

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      await generateMealPlan()
    } catch (err: any) {
      setError(err.message || 'Failed to generate meal plan')
    } finally {
      setLoading(false)
    }
  }

  if (user && !user.profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-xl mb-4">Redirecting to fitness profile...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">AI Meal Planning</h2>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="mb-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Meal Plan'}
        </button>
        {error && <div className="mb-4 text-red-400">{error}</div>}
        {!mealPlan || mealPlan.length === 0 ? (
          <div className="text-center text-gray-400 mt-12 text-lg">
            No meal plan found. Click "Generate Meal Plan" to get started!
          </div>
        ) : (
          <div className="space-y-8">
            {mealPlan.map((day, idx) => (
              <section key={idx} className="bg-gray-900 rounded-2xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold mb-6 text-blue-300">Day {idx + 1}</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {['breakfast', 'lunch', 'dinner', 'snack'].map((mealType) => {
                    const meal = day.meals.find((m: any) => m.type === mealType)
                    return (
                      <article key={mealType} className="bg-black border border-gray-800 rounded-xl p-4 flex flex-col items-center shadow-md">
                        <h4 className="text-lg font-semibold mb-2 capitalize text-white">{mealType}</h4>
                        <img
                          src={meal?.items[0]?.imageUrl || FALLBACK_IMAGE}
                          alt={meal?.items[0]?.name || 'Meal'}
                          className="w-24 h-24 object-cover rounded mb-2 border border-gray-700"
                        />
                        <div className="text-center mb-2">
                          <span className="font-bold text-white">{meal?.items[0]?.name || 'No meal'}</span>
                          <div className="text-gray-400 text-xs mt-1">{meal?.items[0]?.description || 'No description available.'}</div>
                        </div>
                        <div className="flex flex-col gap-1 text-xs text-gray-300 w-full">
                          <div>Calories: <span className="font-semibold text-white">{meal?.items[0]?.calories ?? '--'}</span></div>
                          <div>Protein: <span className="font-semibold text-white">{meal?.items[0]?.protein ?? '--'}g</span></div>
                          <div>Carbs: <span className="font-semibold text-white">{meal?.items[0]?.carbs ?? '--'}g</span></div>
                          <div>Fat: <span className="font-semibold text-white">{meal?.items[0]?.fat ?? '--'}g</span></div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MealPlanning 