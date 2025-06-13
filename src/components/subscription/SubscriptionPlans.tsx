import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PaymentForm } from './PaymentForm'
import { useNavigate } from 'react-router-dom'

interface PlanFeature {
  text: string
  included: boolean
}

interface Plan {
  name: string
  price: number
  period: 'month' | 'year'
  features: PlanFeature[]
  popular?: boolean
  planId: string // Stripe price ID
}

// Define a type for StripePlan
interface StripePlan {
  id: string;
  unit_amount: number;
}

const BASIC_PLAN_ID = 'price_1RNGfkDJqnmZlsfM1Bhn4q5m'
const PREMIUM_PLAN_ID = 'price_1RNGiSDJqnmZlsfMyaQp5RCy'

const FREE_PLAN: Plan = {
  name: 'Free',
  price: 0,
  period: 'month',
  planId: '',
  features: [
    { text: 'Access to basic features', included: true },
    { text: 'Limited workout plans', included: true },
    { text: 'No AI or premium content', included: false },
    { text: 'No nutrition tracking', included: false },
    { text: 'No trainer support', included: false }
  ]
}

const BASIC_FEATURES: PlanFeature[] = [
  { text: 'Basic workout plans', included: true },
  { text: 'Exercise library', included: true },
  { text: 'Progress tracking', included: true },
  { text: 'Nutrition guidance', included: true },
  { text: 'Personal trainer support', included: false },
  { text: 'Custom meal plans', included: false }
]

const PREMIUM_FEATURES: PlanFeature[] = [
  { text: 'Everything in Basic', included: true },
  { text: 'Advanced workout plans', included: true },
  { text: 'Nutrition guidance', included: true },
  { text: 'Personal trainer support', included: true },
  { text: 'Custom meal plans', included: true },
  { text: 'Group coaching sessions', included: true }
]

export const SubscriptionPlans: React.FC = () => {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<Plan[]>([FREE_PLAN])
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPlans() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/plans')
        if (!res.ok) throw new Error('Failed to fetch plans')
        const data: StripePlan[] = await res.json()
        // Find Basic and Premium by planId
        const basic = data.find((p) => p.id === BASIC_PLAN_ID)
        const premium = data.find((p) => p.id === PREMIUM_PLAN_ID)
        setPlans([
          FREE_PLAN,
          {
            name: 'Basic',
            price: basic ? basic.unit_amount / 100 : 20,
            period: 'month',
            planId: BASIC_PLAN_ID,
            features: BASIC_FEATURES
          },
          {
            name: 'Premium',
            price: premium ? premium.unit_amount / 100 : 40,
            period: 'month',
            planId: PREMIUM_PLAN_ID,
            features: PREMIUM_FEATURES,
            popular: true
          }
        ])
      } catch (err: unknown) {
        setPlans([
          FREE_PLAN,
          { name: 'Basic', price: 20, period: 'month', planId: BASIC_PLAN_ID, features: BASIC_FEATURES },
          { name: 'Premium', price: 40, period: 'month', planId: PREMIUM_PLAN_ID, features: PREMIUM_FEATURES, popular: true }
        ])
        setError('Could not load live pricing. Showing defaults.')
      } finally {
        setLoading(false)
      }
    }
    fetchPlans()
  }, [])

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan)
    setError(null)
  }

  const handlePaymentSuccess = () => {
    navigate('/dashboard')
  }

  const handlePaymentError = (error: string) => {
    setError(error)
  }

  return (
    <div className="min-h-screen bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Choose Your Plan
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Select the perfect plan for your fitness journey
          </p>
        </div>
        {error && <div className="text-red-400 text-center mt-4">{error}</div>}
        <AnimatePresence mode="wait">
          {!selectedPlan ? (
            loading ? <div className="text-white text-center mt-12">Loading plans...</div> : (
              <motion.div
                key="plans"
                className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:grid-cols-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {plans.map((plan) => (
                  <motion.div
                    key={plan.name}
                    className={`rounded-lg shadow-lg divide-y divide-gray-700 ${
                      plan.popular ? 'border-2 border-blue-500' : 'border border-gray-700'
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="p-6">
                      {plan.popular && (
                        <span className="inline-flex px-4 py-1 rounded-full text-sm font-semibold tracking-wide uppercase bg-blue-500 text-white">
                          Most Popular
                        </span>
                      )}
                      <h3 className="mt-4 text-2xl font-semibold text-white">{plan.name}</h3>
                      <p className="mt-8">
                        <span className="text-4xl font-extrabold text-white">${plan.price}</span>
                        <span className="text-base font-medium text-gray-400">/{plan.period}</span>
                      </p>
                      <button
                        onClick={() => handlePlanSelect(plan)}
                        className={`mt-8 block w-full bg-blue-600 border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-blue-700 transition-colors ${
                          plan.popular ? 'ring-2 ring-blue-500' : ''
                        }`}
                        disabled={plan.price === 0}
                      >
                        {plan.price === 0 ? 'Current Plan' : 'Get Started'}
                      </button>
                    </div>
                    <div className="pt-6 pb-8 px-6">
                      <h4 className="text-sm font-medium text-gray-400 tracking-wide uppercase">
                        What's included
                      </h4>
                      <ul className="mt-6 space-y-4">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex space-x-3">
                            {feature.included ? (
                              <svg
                                className="flex-shrink-0 h-5 w-5 text-green-500"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="flex-shrink-0 h-5 w-5 text-gray-400"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                            <span className="text-sm text-gray-300">{feature.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )
          ) : (
            <motion.div
              key="payment"
              className="mt-12 max-w-lg mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-white">
                    Complete Your Subscription
                  </h3>
                  <button
                    onClick={() => setSelectedPlan(null)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ← Back to plans
                  </button>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 rounded-md">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <PaymentForm
                  planName={selectedPlan.name}
                  amount={selectedPlan.price}
                  planId={selectedPlan.planId}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
} 