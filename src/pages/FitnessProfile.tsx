import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'react-hot-toast'

const FITNESS_GOALS = [
  'Weight Loss',
  'Muscle Gain',
  'Endurance',
  'Flexibility',
  'General Fitness',
  'Increase Strength',
  'Improve Cardio',
  'Sports Performance'
];

const FitnessProfile: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/dashboard'
  const { updateProfile } = useAuth()
  const [formData, setFormData] = React.useState<any>({
    height: undefined,
    weight: undefined,
    age: undefined,
    gender: undefined,
    goals: [],
    fitnessLevel: undefined,
    activityLevel: undefined,
    availableEquipment: [],
    preferredWorkoutDuration: undefined,
    daysPerWeek: undefined,
    medicalConditions: [],
    injuries: [],
  })
  const [isLoading, setIsLoading] = React.useState(false)
  const [heightFeet, setHeightFeet] = useState('5')
  const [heightInches, setHeightInches] = useState('6')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    if (name === 'goals') {
      setFormData(prev => ({
        ...prev,
        goals: checked
          ? [...(prev.goals || []), value]
          : (prev.goals || []).filter(g => g !== value)
      }))
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: value ? Number(value) : undefined }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleHeightChange = (feet: string, inches: string) => {
    setHeightFeet(feet)
    setHeightInches(inches)
    const totalInches = parseInt(feet || '0', 10) * 12 + parseInt(inches || '0', 10)
    setFormData(prev => ({ ...prev, height: totalInches || 0 }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      updateProfile(formData)
      toast.success('Profile updated successfully!')
      navigate(from)
    } catch (error) {
      toast.error('Profile update failed. Please try again.')
      console.error('Profile update failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white">
            Your Fitness Profile
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Tell us about yourself to get personalized recommendations
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="height" className="block text-sm font-medium text-gray-400">
                Height
              </label>
              <div className="flex gap-2">
                <select
                  className="rounded-md bg-gray-200 border-gray-300 text-black px-2 py-1"
                  value={heightFeet}
                  onChange={e => handleHeightChange(e.target.value, heightInches)}
                  required
                >
                  {Array.from({ length: 8 }, (_, i) => i + 3).map(f => (
                    <option key={f} value={f}>{f}'</option>
                  ))}
                </select>
                <select
                  className="rounded-md bg-gray-200 border-gray-300 text-black px-2 py-1"
                  value={heightInches}
                  onChange={e => handleHeightChange(heightFeet, e.target.value)}
                  required
                >
                  {Array.from({ length: 12 }, (_, i) => i).map(i => (
                    <option key={i} value={i}>{i}''</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="weight" className="block text-sm font-medium text-gray-700">
                Weight (kg)
              </label>
              <input
                type="number"
                name="weight"
                id="weight"
                required
                value={formData.weight ?? ''}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
              />
            </div>

            <div>
              <label htmlFor="age" className="block text-sm font-medium text-gray-700">
                Age
              </label>
              <input
                type="number"
                name="age"
                id="age"
                required
                value={formData.age ?? ''}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
              />
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                required
                value={formData.gender ?? ''}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Fitness Goals
              </label>
              <div className="flex flex-wrap gap-2 mt-1">
                {FITNESS_GOALS.map(goal => (
                  <label key={goal} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="goals"
                      value={goal}
                      checked={formData.goals?.includes(goal) || false}
                      onChange={handleChange}
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                    <span className="text-gray-700 text-sm">{goal}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="activityLevel" className="block text-sm font-medium text-gray-700">
                Activity Level
              </label>
              <select
                id="activityLevel"
                name="activityLevel"
                required
                value={formData.activityLevel ?? ''}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
              >
                <option value="">Select your activity level</option>
                <option value="sedentary">Sedentary</option>
                <option value="lightly-active">Lightly Active</option>
                <option value="moderately-active">Moderately Active</option>
                <option value="very-active">Very Active</option>
                <option value="extremely-active">Extremely Active</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default FitnessProfile 