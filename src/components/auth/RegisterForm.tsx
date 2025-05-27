import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { FormInput } from '../common/FormInput'
import { LoadingLogo } from '../common/LoadingLogo'

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
    fitnessGoals: '',
    activityLevel: '',
    dietaryPreferences: '',
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
    if (!formData.fitnessGoals) errors.fitnessGoals = 'Fitness goals are required'
    if (!formData.activityLevel) errors.activityLevel = 'Activity level is required'
    if (!formData.dietaryPreferences) errors.dietaryPreferences = 'Dietary preferences are required'

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
            Start your fitness journey with FitArchitect
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm space-y-4">
            <FormInput
              label="Name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              error={validationErrors.name}
              required
            />
            <FormInput
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              error={validationErrors.email}
              required
            />
            <FormInput
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              error={validationErrors.password}
              required
            />
            <FormInput
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              error={validationErrors.confirmPassword}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-300">Height</label>
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
              <label className="block text-sm font-medium text-gray-300">Gender</label>
              <select
                className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white"
                value={formData.gender}
                onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                required
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {validationErrors.gender && <div className="text-red-400 text-xs mt-1">{validationErrors.gender}</div>}
            </div>
            <FormInput
              label="Fitness Goals (comma separated)"
              type="text"
              value={formData.fitnessGoals}
              onChange={(e) => setFormData(prev => ({ ...prev, fitnessGoals: e.target.value }))}
              error={validationErrors.fitnessGoals}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-300">Activity Level</label>
              <select
                className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white"
                value={formData.activityLevel}
                onChange={e => setFormData(prev => ({ ...prev, activityLevel: e.target.value }))}
                required
              >
                <option value="">Select activity level</option>
                <option value="sedentary">Sedentary</option>
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="active">Active</option>
                <option value="very active">Very Active</option>
              </select>
              {validationErrors.activityLevel && <div className="text-red-400 text-xs mt-1">{validationErrors.activityLevel}</div>}
            </div>
            <FormInput
              label="Dietary Preferences (comma separated)"
              type="text"
              value={formData.dietaryPreferences}
              onChange={(e) => setFormData(prev => ({ ...prev, dietaryPreferences: e.target.value }))}
              error={validationErrors.dietaryPreferences}
              required
            />
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
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <LoadingLogo size="sm" className="mr-2" />
                  Creating Account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
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