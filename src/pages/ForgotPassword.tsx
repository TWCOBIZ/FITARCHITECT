import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    // Simulate API call
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    setSubmitted(true)
    // TODO: Call backend endpoint for password reset
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="w-full max-w-md space-y-8 bg-gray-900 p-8 rounded-xl shadow-md z-20 relative">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Forgot Your Password?
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Enter your email and we'll send you a reset link.
          </p>
        </div>
        {submitted ? (
          <div className="text-green-400 text-center">
            If an account exists for <b>{email}</b>, a password reset link has been sent.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              />
            </div>
            {error && <div className="text-red-400 text-sm">{error}</div>}
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-gray-700 text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Send Reset Link
            </button>
            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-gray-400 hover:text-white text-sm"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword 