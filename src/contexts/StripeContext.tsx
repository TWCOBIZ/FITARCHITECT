import React, { createContext, useContext, useEffect, useState } from 'react'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { SUBSCRIPTION_PLANS, SubscriptionTier } from '../config/subscription'

// Initialize Stripe with the publishable key from environment variables
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY)

interface StripeContextType {
  stripePromise: Promise<Stripe | null>
  clientSecret: string | null
  setClientSecret: (secret: string | null) => void
  handleSubscription: (tier: SubscriptionTier) => Promise<void>
}

const StripeContext = createContext<StripeContextType | undefined>(undefined)

export const StripeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  const handleSubscription = async (tier: SubscriptionTier) => {
    const plan = SUBSCRIPTION_PLANS[tier]
    if (!plan.id) {
      // Handle free tier subscription
      return
    }

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.id,
          successUrl: `${window.location.origin}/subscription/success`,
          cancelUrl: `${window.location.origin}/subscription`,
        }),
      })

      const session = await response.json()
      const stripe = await stripePromise
      
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      })

      if (result.error) {
        throw new Error(result.error.message)
      }
    } catch (error) {
      console.error('Subscription error:', error)
      throw error
    }
  }

  return (
    <StripeContext.Provider value={{ stripePromise, clientSecret, setClientSecret, handleSubscription }}>
      <Elements stripe={stripePromise} {...(clientSecret ? { options: { clientSecret } } : {})}>
        {children}
      </Elements>
    </StripeContext.Provider>
  )
}

export const useStripe = () => {
  const context = useContext(StripeContext)
  if (context === undefined) {
    throw new Error('useStripe must be used within a StripeProvider')
  }
  return context
} 