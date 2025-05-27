export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: null,
    name: 'Free',
    price: '0',
    features: [
      'Meal planning',
      'Calorie tracking',
      'Basic nutrition guidance',
      'Community support'
    ]
  },
  BASIC: {
    id: import.meta.env.VITE_STRIPE_BASIC_PLAN_ID,
    name: 'Basic',
    price: '20',
    features: [
      'Everything in Free',
      'Full workout access',
      'Complete meal planning',
      'Calorie tracking',
      'Telegram integration',
      'Email support'
    ]
  },
  PREMIUM: {
    id: import.meta.env.VITE_STRIPE_PREMIUM_PLAN_ID,
    name: 'Premium',
    price: '40',
    features: [
      'Everything in Basic',
      'Food scanning',
      'Product scanning',
      'Advanced analytics',
      'Priority support',
      'Early access to new features'
    ]
  }
} as const

export type SubscriptionTier = keyof typeof SUBSCRIPTION_PLANS
export type SubscriptionPlan = typeof SUBSCRIPTION_PLANS[SubscriptionTier] 