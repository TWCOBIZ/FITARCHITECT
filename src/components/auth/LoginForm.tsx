import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { FormInput } from '../common/FormInput'
import { LoadingLogo } from '../common/LoadingLogo'

export const LoginForm: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
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
    setError('')
    setValidationErrors({})

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      await login(formData.email, formData.password)
      const from = (location.state as any)?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password')
    } finally {
      setIsLoading(false)
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
          <div className="rounded-md shadow-sm space-y-4">
            <FormInput
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              error={validationErrors.email}
              autoComplete="email"
              required
              data-testid="login-email"
            />
            <FormInput
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              error={validationErrors.password}
              autoComplete="current-password"
              required
              data-testid="login-password"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-500/10 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-xs sm:text-base md:text-sm font-medium text-red-400">{error}</h3>
                  {error.toLowerCase().includes('invalid') && (
                    <p className="text-xs sm:text-sm md:text-xs text-gray-400 mt-2">
                      If you already have an account but forgot your password, <button type="button" className="underline text-gray-300 hover:text-white" onClick={() => navigate('/forgot-password')}>reset it here</button>.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              data-testid="login-submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-gray-700 text-sm sm:text-base md:text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] sm:min-h-[48px] md:min-h-[44px]"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <LoadingLogo size="sm" className="mr-2" />
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs sm:text-base md:text-sm text-gray-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="font-medium text-gray-300 hover:text-white transition-colors min-h-[44px] sm:min-h-[48px] md:min-h-[44px] flex items-center justify-center inline-flex"
              >
                Create one now
              </button>
            </p>
          </div>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-gray-400 hover:text-white text-xs sm:text-base md:text-sm underline min-h-[44px] sm:min-h-[48px] md:min-h-[44px] flex items-center justify-center"
            >
              Forgot your password?
            </button>
          </div>
        </form>
        
        {/* Admin Login Link centered below the form */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => navigate('/admin/login')}
            className="text-xs sm:text-sm md:text-xs text-blue-400 hover:underline focus:outline-none min-h-[44px] sm:min-h-[48px] md:min-h-[44px] inline-flex items-center justify-center"
            aria-label="Admin Login"
          >
            Admin Login
          </button>
        </div>
      </div>
    </div>
  )
} 