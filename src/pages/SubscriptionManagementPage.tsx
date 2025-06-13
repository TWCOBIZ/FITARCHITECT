import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useStripe } from '../contexts/StripeContext'
import { motion } from 'framer-motion'

const getPlanPrice = (tier: string) => {
  switch (tier) {
    case 'free':
      return 'Basic features'
    case 'basic':
      return '$20/month'
    case 'premium':
      return '$40/month'
    default:
      return ''
  }
}

export const SubscriptionManagementPage: React.FC = () => {
  const navigate = useNavigate()
  const { subscriptionTier, updateSubscription } = useAuth()
  const { stripePromise } = useStripe()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<any>(null)

  useEffect(() => {
    async function fetchSubscription() {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/user/subscription', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        })
        if (!res.ok) throw new Error('Failed to fetch subscription')
        const data = await res.json()
        setSubscription(data)
        updateSubscription(data.tier)
      } catch (err: any) {
        setError('Could not load subscription info.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchSubscription()
  }, [])

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) {
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/cancel-subscription/${subscription?.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
      })
      if (!response.ok) {
        throw new Error('Failed to cancel subscription')
      }
      updateSubscription('free')
      setSubscription({ ...subscription, status: 'canceled', tier: 'free' })
    } catch (error) {
      setError('Failed to cancel subscription. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRenewSubscription = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/renew-subscription/${subscription?.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
      })
      if (!response.ok) {
        throw new Error('Failed to renew subscription')
      }
      const data = await response.json()
      updateSubscription(data.tier)
      setSubscription(data)
    } catch (error) {
      setError('Failed to renew subscription. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePaymentMethod = async () => {
    try {
      const stripe = await stripePromise
      if (!stripe) throw new Error('Stripe failed to load')
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
      })
      const session = await response.json()
      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
    } catch (error) {
      setError('Failed to update payment method. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold mb-8">Subscription Management</h1>
          {error && <div className="text-red-400 mb-4">{error}</div>}
          <div className="bg-gray-900 rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4">Current Plan</h2>
            {isLoading ? <div>Loading...</div> : (
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-2xl font-bold capitalize">{subscription?.tier || subscriptionTier}</p>
                  <p className="text-gray-400">
                    {subscription?.tier === 'basic' ? '$20/month' : subscription?.tier === 'premium' ? '$40/month' : 'Basic features'}
                  </p>
                  <p className="text-gray-500 text-sm">Status: {subscription?.status || 'active'}</p>
                </div>
                {subscription?.tier !== 'free' && subscription?.status !== 'canceled' && (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={isLoading}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Processing...' : 'Cancel Subscription'}
                  </button>
                )}
                {subscription?.status === 'canceled' && (
                  <button
                    onClick={handleRenewSubscription}
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Processing...' : 'Renew Subscription'}
                  </button>
                )}
              </div>
            )}
            {subscription?.tier !== 'free' && subscription?.status !== 'canceled' && (
              <div className="border-t border-gray-800 pt-6">
                <h3 className="text-xl font-semibold mb-4">Payment Method</h3>
                <button
                  onClick={handleUpdatePaymentMethod}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Update Payment Method
                </button>
              </div>
            )}
          </div>
          <div className="bg-gray-900 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4">Available Plans</h2>
            <p className="text-gray-400 mb-6">
              Want to upgrade or change your plan? Check out our available options.
            </p>
            <button
              onClick={() => navigate('/pricing')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              View Plans
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 