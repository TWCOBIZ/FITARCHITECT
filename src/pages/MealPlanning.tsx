import React, { useState, useEffect } from 'react'
import { useNutrition } from '../contexts/NutritionContext'
import { useProfileContext as useProfile } from '../contexts/ProfileContext'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import NutritionProfileForm from '../components/nutrition/NutritionProfileForm'
import MealPlanView from '../components/nutrition/MealPlanView'
import ShoppingList from '../components/nutrition/ShoppingList'
import NutritionLogForm from '../components/nutrition/NutritionLogForm'

const MealPlanning: React.FC = () => {
  // NutritionContext may not provide loading/error, so fallback to local state if needed
  const { mealPlan, generateMealPlan } = useNutrition() as any;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { nutritionProfile } = useProfile();
  const [showShoppingList, setShowShoppingList] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // If no nutrition profile, prompt user to fill it out
    if (!nutritionProfile) {
      // Optionally, could redirect or just show the form below
    }
  }, [nutritionProfile])

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      await generateMealPlan()
      toast.success('Meal Plan Saved ✓')
    } catch (err: any) {
      setError('Save Failed - Please Try Again')
      toast.error('Save Failed - Please Try Again')
    } finally {
      setLoading(false);
    }
  }

  if (!nutritionProfile) {
    return <NutritionProfileForm />
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">AI Meal Planning</h2>
        <div className="flex gap-4 mb-6">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Meal Plan'}
          </button>
          <button
            onClick={() => setShowShoppingList(s => !s)}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold"
          >
            {showShoppingList ? 'Hide Shopping List' : 'Show Shopping List'}
          </button>
        </div>
        {error && <div className="mb-4 text-red-400">{error}</div>}
        {!mealPlan || mealPlan.length === 0 ? (
          <div className="text-center text-gray-400 mt-12 text-lg">
            No meal plan found. Click "Generate Meal Plan" to get started!
          </div>
        ) : (
          <>
            {showShoppingList && <ShoppingList mealPlan={mealPlan} />}
            <MealPlanView mealPlan={mealPlan} />
          </>
        )}
        <div className="mt-12">
          <NutritionLogForm />
        </div>
      </div>
    </div>
  )
}

export default MealPlanning 