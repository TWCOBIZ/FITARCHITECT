import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { UserProfile } from '../../types/user'
import { z } from 'zod'

interface WorkoutProfileFormProps {
  onSubmit: (profile: Partial<UserProfile>) => void
  onBack: () => void
}

const fitnessGoals = [
  'Build Muscle',
  'Lose Weight',
  'Improve Strength',
  'Increase Endurance',
  'Improve Flexibility',
  'Core Strength',
  'General Fitness'
]

const equipmentOptions = [
  'None',
  'Dumbbells',
  'Resistance Bands',
  'Barbell',
  'Kettlebell',
  'Pull-up Bar',
  'Bench',
  'Squat Rack',
  'Cable Machine',
  'Cardio Equipment'
]

const userProfileSchema = z.object({
  height: z.number().min(1, 'Height must be a positive number.'),
  weight: z.number().min(1, 'Weight must be a positive number.'),
  fitnessLevel: z.string().nonempty('Fitness level is required.'),
  goals: z.array(z.string()).min(1, 'At least one fitness goal must be selected.'),
  availableEquipment: z.array(z.string()).min(1, 'Select at least one available equipment option.'),
  preferredWorkoutDuration: z.number().min(1, 'Preferred workout duration must be a positive number.'),
  daysPerWeek: z.number().min(1).max(7, 'Workout days per week must be between 1 and 7.')
})

const WorkoutProfileForm: React.FC<WorkoutProfileFormProps> = ({ onSubmit, onBack }) => {
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    fitnessLevel: 'beginner',
    goals: [],
    availableEquipment: [],
    preferredWorkoutDuration: 45,
    daysPerWeek: 3,
    medicalConditions: [],
    injuries: []
  })

  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 3
  const [errors, setErrors] = useState<string[]>([])
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [heightFeet, setHeightFeet] = useState('5')
  const [heightInches, setHeightInches] = useState('6')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: Number(value)
    }))
  }

  const handleMultiSelect = (name: string, value: string) => {
    setFormData(prev => {
      const currentValues = prev[name as keyof UserProfile] as string[]
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]
      return {
        ...prev,
        [name]: newValues
      }
    })
  }

  const handleHeightChange = (feet: string, inches: string) => {
    setHeightFeet(feet)
    setHeightInches(inches)
    const totalInches = parseInt(feet || '0', 10) * 12 + parseInt(inches || '0', 10)
    setFormData(prev => ({ ...prev, height: totalInches ? String(totalInches) : '' }))
  }

  const validateForm = () => {
    try {
      userProfileSchema.parse(formData);
      return [];
    } catch (e) {
      if (e instanceof z.ZodError) {
        return e.errors.map(err => err.message);
      }
      return ['Unknown validation error'];
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])
    setSuccess(null)
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }
    setIsLoading(true)
    try {
      const maybePromise = onSubmit(formData)
      if (maybePromise && typeof maybePromise.then === 'function') {
        await maybePromise
      }
      setSuccess('Profile created successfully!')
      setFormData({
        fitnessLevel: 'beginner',
        goals: [],
        availableEquipment: [],
        preferredWorkoutDuration: 45,
        daysPerWeek: 3,
        medicalConditions: [],
        injuries: []
      })
      setCurrentStep(1)
    } catch (err: any) {
      setErrors([err?.message || 'An unexpected error occurred. Please try again.'])
    } finally {
      setIsLoading(false)
    }
  }

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-2xl font-bold mb-6">Basic Information</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="height" className="block text-sm font-medium text-gray-300">
            Height
          </label>
          <div className="flex gap-2">
            <select
              className="rounded-md bg-gray-800 border-gray-700 text-white px-2 py-1"
              value={heightFeet}
              onChange={e => handleHeightChange(e.target.value, heightInches)}
              required
            >
              {Array.from({ length: 8 }, (_, i) => i + 3).map(f => (
                <option key={f} value={f}>{f}'</option>
              ))}
            </select>
            <select
              className="rounded-md bg-gray-800 border-gray-700 text-white px-2 py-1"
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
          <label htmlFor="weight" className="block text-sm font-medium text-gray-300">
            Weight (lbs)
          </label>
          <input
            type="number"
            name="weight"
            id="weight"
            value={formData.weight || ''}
            onChange={handleNumberInput}
            className="w-full px-3 py-2 border rounded-lg text-white bg-black"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fitness Level
          </label>
          <select
            name="fitnessLevel"
            value={formData.fitnessLevel}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded-lg text-white bg-black"
            required
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>
    </motion.div>
  )

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-2xl font-bold mb-6">Goals & Preferences</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fitness Goals
          </label>
          <div className="grid grid-cols-2 gap-2">
            {fitnessGoals.map(goal => (
              <button
                key={goal}
                type="button"
                onClick={() => handleMultiSelect('goals', goal)}
                className={`px-4 py-2 rounded-lg text-sm ${
                  formData.goals?.includes(goal)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Available Equipment
          </label>
          <div className="grid grid-cols-2 gap-2">
            {equipmentOptions.map(equipment => (
              <button
                key={equipment}
                type="button"
                onClick={() => handleMultiSelect('availableEquipment', equipment)}
                className={`px-4 py-2 rounded-lg text-sm ${
                  formData.availableEquipment?.includes(equipment)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {equipment}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Workout Duration (minutes)
          </label>
          <input
            type="number"
            name="preferredWorkoutDuration"
            value={formData.preferredWorkoutDuration}
            onChange={handleNumberInput}
            className="w-full px-3 py-2 border rounded-lg text-white bg-black"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Workout Days per Week
          </label>
          <input
            type="number"
            name="daysPerWeek"
            value={formData.daysPerWeek}
            onChange={handleNumberInput}
            min="1"
            max="7"
            className="w-full px-3 py-2 border rounded-lg text-white bg-black"
            required
          />
        </div>
      </div>
    </motion.div>
  )

  const renderStep3 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-2xl font-bold mb-6">Health Information</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Medical Conditions (optional)
          </label>
          <input
            type="text"
            name="medicalConditions"
            value={formData.medicalConditions?.join(', ') || ''}
            onChange={e => {
              const conditions = e.target.value.split(',').map(c => c.trim())
              setFormData(prev => ({ ...prev, medicalConditions: conditions }))
            }}
            placeholder="Separate conditions with commas"
            className="w-full px-3 py-2 border rounded-lg text-white bg-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Injuries (optional)
          </label>
          <input
            type="text"
            name="injuries"
            value={formData.injuries?.join(', ') || ''}
            onChange={e => {
              const injuries = e.target.value.split(',').map(i => i.trim())
              setFormData(prev => ({ ...prev, injuries: injuries }))
            }}
            placeholder="Separate injuries with commas"
            className="w-full px-3 py-2 border rounded-lg text-white bg-black"
          />
        </div>
      </div>
    </motion.div>
  )

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      {errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          <ul className="list-disc pl-5">
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          {success}
        </div>
      )}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            {[...Array(totalSteps)].map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  currentStep > index + 1
                    ? 'bg-blue-600'
                    : currentStep === index + 1
                    ? 'bg-blue-400'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-500">
            Step {currentStep} of {totalSteps}
          </span>
        </div>
      </div>

      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}

      <div className="flex justify-between mt-8">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 text-gray-600 hover:text-gray-800"
          disabled={isLoading}
        >
          Back
        </button>
        {currentStep < totalSteps ? (
          <button
            type="button"
            onClick={() => setCurrentStep(prev => prev + 1)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            disabled={isLoading}
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center min-w-[180px]"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                Submitting...
              </span>
            ) : (
              'Complete Profile'
            )}
          </button>
        )}
      </div>
    </form>
  )
}

export default WorkoutProfileForm 