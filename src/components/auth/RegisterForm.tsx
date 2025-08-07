import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { FormInput } from '../common/FormInput'
import { motion, AnimatePresence } from 'framer-motion'
import { FaCheck } from 'react-icons/fa'
import ActionButton from '../common/ActionButton'

// Data constants copied from Profile.tsx
const FITNESS_GOALS = [
  { id: 'weight_loss', label: 'Weight Loss', description: 'Burn fat and lose weight' },
  { id: 'muscle_gain', label: 'Muscle Gain', description: 'Build lean muscle mass' },
  { id: 'strength', label: 'Strength', description: 'Increase overall strength' },
  { id: 'endurance', label: 'Endurance', description: 'Improve cardiovascular fitness' },
  { id: 'flexibility', label: 'Flexibility', description: 'Improve mobility and flexibility' },
  { id: 'general_fitness', label: 'General Fitness', description: 'Overall health and wellness' }
]

const EQUIPMENT_OPTIONS = [
  { id: 'bodyweight', label: 'Bodyweight Only', description: 'No equipment needed' },
  { id: 'dumbbells', label: 'Dumbbells', description: 'Adjustable or fixed dumbbells' },
  { id: 'barbells', label: 'Barbells', description: 'Olympic barbell and plates' },
  { id: 'resistance_bands', label: 'Resistance Bands', description: 'Various resistance levels' },
  { id: 'kettlebells', label: 'Kettlebells', description: 'Various weights available' },
  { id: 'pull_up_bar', label: 'Pull-up Bar', description: 'Wall or door-mounted' },
  { id: 'gym_access', label: 'Full Gym Access', description: 'Complete gym equipment' },
  { id: 'home_gym', label: 'Home Gym Setup', description: 'Personal gym with machines' }
]

const WORKOUT_DURATION_OPTIONS = [
  { value: '15min', label: '15 Minutes', description: 'Quick, high-intensity sessions' },
  { value: '30min', label: '30 Minutes', description: 'Balanced workout length' },
  { value: '45min', label: '45 Minutes', description: 'Standard gym session' },
  { value: '60min', label: '60 Minutes', description: 'Extended training time' },
  { value: '90min', label: '90+ Minutes', description: 'Long, comprehensive workouts' }
]

const DIETARY_PREFERENCES = [
  { id: 'none', label: 'No Restrictions', description: 'I eat everything' },
  { id: 'vegetarian', label: 'Vegetarian', description: 'No meat' },
  { id: 'vegan', label: 'Vegan', description: 'No animal products' },
  { id: 'pescatarian', label: 'Pescatarian', description: 'Fish but no meat' },
  { id: 'keto', label: 'Keto', description: 'Low-carb, high-fat' },
  { id: 'paleo', label: 'Paleo', description: 'Whole foods only' },
  { id: 'gluten_free', label: 'Gluten-Free', description: 'No gluten' },
  { id: 'dairy_free', label: 'Dairy-Free', description: 'No dairy products' }
]

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little to no exercise' },
  { value: 'light', label: 'Light', description: '1-3 days per week' },
  { value: 'moderate', label: 'Moderate', description: '3-5 days per week' },
  { value: 'active', label: 'Active', description: '6-7 days per week' },
  { value: 'very_active', label: 'Very Active', description: 'Multiple times per day' }
]

// Custom Select Component
const CustomSelect: React.FC<{
  value: string
  onChange: (value: string) => void
  options: Array<{value: string, label: string, description?: string}>
  placeholder: string
  error?: string
}> = ({ value, onChange, options, placeholder, error }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 hover:bg-gray-700 ${
          error ? 'border-red-500' : 'border-gray-600'
        }`}
      >
        <span className={value ? 'text-white' : 'text-gray-400'}>
          {value ? options.find(opt => opt.value === value)?.label : placeholder}
        </span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-700 focus:bg-gray-700 focus:outline-none transition-colors"
              >
                <div className="text-white font-medium">{option.label}</div>
                {option.description && (
                  <div className="text-gray-400 text-sm">{option.description}</div>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Multi-Select Component for Goals/Preferences
const MultiSelect: React.FC<{
  value: string[]
  onChange: (value: string[]) => void
  options: Array<{id: string, label: string, description?: string}>
  title: string
  error?: string
}> = ({ value, onChange, options, title, error }) => {
  const toggleOption = (optionId: string) => {
    const newValue = value.includes(optionId) 
      ? value.filter(id => id !== optionId)
      : [...value, optionId]
    onChange(newValue)
  }

  return (
    <div>
      <label className={`block text-sm font-medium mb-3 ${error ? 'text-red-400' : 'text-gray-300'}`}>{title}</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = value.includes(option.id)
          return (
            <motion.button
              key={option.id}
              type="button"
              onClick={() => toggleOption(option.id)}
              className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                isSelected 
                  ? 'border-blue-500 bg-blue-500/20 text-white' 
                  : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-gray-400 mt-1">{option.description}</div>
                  )}
                </div>
                {isSelected && <FaCheck className="text-blue-400 text-sm" />}
              </div>
            </motion.button>
          )
        })}
      </div>
      {error && <div className="text-red-400 text-xs mt-1">{error}</div>}
    </div>
  )
}

export const RegisterForm: React.FC = () => {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    height: '',
    weight: '',
    age: '',
    gender: '',
    fitnessGoals: [] as string[],
    activityLevel: '',
    equipmentAvailability: [] as string[],
    preferredWorkoutDuration: '',
    dietaryPreferences: [] as string[],
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [heightFeet, setHeightFeet] = useState('5')
  const [heightInches, setHeightInches] = useState('6')

  const handleHeightChange = (feet: string, inches: string) => {
    setHeightFeet(feet)
    setHeightInches(inches)
    const totalInches = parseInt(feet || '0', 10) * 12 + parseInt(inches || '0', 10)
    setFormData(prev => ({ ...prev, height: totalInches ? String(totalInches) : '' }))
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required'
    }
    
    if (!formData.email) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email'
    }
    
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.height) errors.height = 'Height is required'
    if (!formData.weight) errors.weight = 'Weight is required'
    if (!formData.age) errors.age = 'Age is required'
    if (!formData.gender) errors.gender = 'Gender is required'
    if (!formData.fitnessGoals || formData.fitnessGoals.length === 0) errors.fitnessGoals = 'Please select at least one fitness goal'
    if (!formData.activityLevel) errors.activityLevel = 'Activity level is required'
    if (!formData.equipmentAvailability || formData.equipmentAvailability.length === 0) errors.equipmentAvailability = 'Please select available equipment'
    if (!formData.preferredWorkoutDuration) errors.preferredWorkoutDuration = 'Workout duration is required'
    if (!formData.dietaryPreferences || formData.dietaryPreferences.length === 0) errors.dietaryPreferences = 'Please select dietary preferences'

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setValidationErrors({})

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      await register(
        formData.email,
        formData.password,
        formData.name,
        formData.height,
        formData.weight,
        formData.age,
        formData.gender,
        formData.fitnessGoals,
        formData.activityLevel,
        formData.equipmentAvailability,
        formData.preferredWorkoutDuration,
        formData.dietaryPreferences
      )
      navigate('/parq')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Create Your Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Complete your profile and get 3 days of Premium access
          </p>
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-400 text-sm text-center">
              🎉 Start your 3-day Premium trial immediately after registration
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm space-y-6">
            {/* Basic Account Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Account Information</h3>
              <FormInput
                label="Name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                error={validationErrors.name}
                required
                data-testid="register-name"
              />
              <FormInput
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                error={validationErrors.email}
                required
                data-testid="register-email"
              />
              <FormInput
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                error={validationErrors.password}
                required
                data-testid="register-password"
              />
              <FormInput
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                error={validationErrors.confirmPassword}
                required
              />
            </div>

            {/* Physical Profile */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Physical Profile</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Height</label>
                <div className="flex gap-2">
                  <select
                    className="rounded-md bg-gray-800 border-gray-700 text-white px-3 py-2 border focus:ring-2 focus:ring-blue-500"
                    value={heightFeet}
                    onChange={e => handleHeightChange(e.target.value, heightInches)}
                    required
                  >
                    {Array.from({ length: 8 }, (_, i) => i + 3).map(f => (
                      <option key={f} value={f}>{f}'</option>
                    ))}
                  </select>
                  <select
                    className="rounded-md bg-gray-800 border-gray-700 text-white px-3 py-2 border focus:ring-2 focus:ring-blue-500"
                    value={heightInches}
                    onChange={e => handleHeightChange(heightFeet, e.target.value)}
                    required
                  >
                    {Array.from({ length: 12 }, (_, i) => i).map(i => (
                      <option key={i} value={i}>{i}"</option>
                    ))}
                  </select>
                </div>
                {validationErrors.height && <div className="text-red-400 text-xs mt-1">{validationErrors.height}</div>}
              </div>
              <FormInput
                label="Weight (lbs)"
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                error={validationErrors.weight}
                required
              />
              <FormInput
                label="Age"
                type="number"
                value={formData.age}
                onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                error={validationErrors.age}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Gender</label>
                <CustomSelect
                  value={formData.gender}
                  onChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' }
                  ]}
                  placeholder="Select gender"
                  error={validationErrors.gender}
                />
                {validationErrors.gender && <div className="text-red-400 text-xs mt-1">{validationErrors.gender}</div>}
              </div>
            </div>

            {/* Fitness Profile */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Fitness Profile</h3>
              <MultiSelect
                value={formData.fitnessGoals}
                onChange={(value) => setFormData(prev => ({ ...prev, fitnessGoals: value }))}
                options={FITNESS_GOALS}
                title="Fitness Goals"
                error={validationErrors.fitnessGoals}
              />
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Activity Level</label>
                <CustomSelect
                  value={formData.activityLevel}
                  onChange={(value) => setFormData(prev => ({ ...prev, activityLevel: value }))}
                  options={ACTIVITY_LEVELS}
                  placeholder="Select your current activity level"
                  error={validationErrors.activityLevel}
                />
                {validationErrors.activityLevel && <div className="text-red-400 text-xs mt-1">{validationErrors.activityLevel}</div>}
              </div>
              <MultiSelect
                value={formData.equipmentAvailability}
                onChange={(value) => setFormData(prev => ({ ...prev, equipmentAvailability: value }))}
                options={EQUIPMENT_OPTIONS}
                title="Available Equipment"
                error={validationErrors.equipmentAvailability}
              />
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Preferred Workout Duration</label>
                <CustomSelect
                  value={formData.preferredWorkoutDuration}
                  onChange={(value) => setFormData(prev => ({ ...prev, preferredWorkoutDuration: value }))}
                  options={WORKOUT_DURATION_OPTIONS}
                  placeholder="Select preferred workout length"
                  error={validationErrors.preferredWorkoutDuration}
                />
                {validationErrors.preferredWorkoutDuration && <div className="text-red-400 text-xs mt-1">{validationErrors.preferredWorkoutDuration}</div>}
              </div>
            </div>

            {/* Nutrition Profile */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Nutrition Profile</h3>
              <MultiSelect
                value={formData.dietaryPreferences}
                onChange={(value) => setFormData(prev => ({ ...prev, dietaryPreferences: value }))}
                options={DIETARY_PREFERENCES}
                title="Dietary Preferences"
                error={validationErrors.dietaryPreferences}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-500/10 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-400">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <ActionButton
              type="submit"
              isLoading={isLoading}
              disabled={isLoading}
              variant="primary"
              fullWidth
              size="lg"
              loadingText="Creating Account & Starting Trial..."
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
              data-testid="register-submit"
            >
              🚀 Create Account & Start 3-Day Premium Trial
            </ActionButton>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="font-medium text-blue-500 hover:text-blue-400 transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
} 