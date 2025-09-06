import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore, useUIStore, showErrorNotification, showSuccessNotification } from '../../stores'
import { FormInput } from '../common/FormInput'
import { LoadingButton } from '../common/LoadingOverlay'

export const LoginForm: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoading } = useAuthStore()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
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

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationErrors({})

    if (!validateForm()) {
      return
    }

    try {
      await login(formData.email, formData.password)
      showSuccessNotification('Welcome back!', 'Login successful')
      const from = (location.state as any)?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch (err) {
      showErrorNotification(
        'Login Failed',
        err instanceof Error ? err.message : 'Invalid email or password'
      )
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear validation error when user types
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background image */}
      <img
        src="/assets/images/login-bg.jpg"
        alt="Login background"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 z-10" />
      
      <div className="w-full max-w-md space-y-8 relative z-20">
        <div>
          <h2 className="mt-6 text-center text-xl sm:text-4xl md:text-3xl lg:text-3xl font-extrabold text-white">
            Welcome Back
          </h2>
          <p className="mt-2 text-center text-xs sm:text-base md:text-sm text-gray-400">
            Sign in to continue your fitness journey
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-gray-900 p-4 sm:p-10 md:p-8 lg:p-8 rounded-xl shadow-md" data-testid="login-form">
          <div className="space-y-4">
            <FormInput
              id="email"
              name="email"
              type="email"
              label="Email"
              value={formData.email}
              onChange={handleInputChange}
              error={validationErrors.email}
              required
              autoComplete="email"
              placeholder="Enter your email"
            />
            
            <FormInput
              id="password"
              name="password"
              type="password"
              label="Password"
              value={formData.password}
              onChange={handleInputChange}
              error={validationErrors.password}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-800"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="/forgot-password" className="font-medium text-blue-500 hover:text-blue-400">
                Forgot password?
              </a>
            </div>
          </div>

          <LoadingButton
            isLoading={isLoading}
            loadingText="Signing in..."
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            type="submit"
          >
            Sign In
          </LoadingButton>

          <div className="text-center">
            <span className="text-gray-400">Don't have an account?</span>{' '}
            <a href="/register" className="font-medium text-blue-500 hover:text-blue-400">
              Sign up
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}