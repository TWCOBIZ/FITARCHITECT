import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { dashboardFeatures } from '../config/dashboardFeatures'
import FeatureCard from '../components/dashboard/FeatureCard'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user, isGuest, subscriptionTier } = useAuth()
  // @ts-ignore
  const trackEvent = (window as any).trackEvent || ((event: string, data?: any) => { if (typeof window !== 'undefined') console.log('[Analytics]', event, data) })

  // Debug logging
  console.log('Dashboard Debug:', { user, isGuest, userType: user?.type, userIsGuest: user?.isGuest, subscriptionTier, featuresCount: dashboardFeatures.length })

  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Helper to determine if a feature is locked for the current user
  const isFeatureLocked = (feature: typeof dashboardFeatures[number]) => {
    // Guest logic
    if (isGuest && !feature.allowGuest) return true
    // Subscription logic
    if (feature.requiresSubscription) {
      if (
        (feature.requiresSubscription === 'basic' && subscriptionTier === 'free') ||
        (feature.requiresSubscription === 'premium' && subscriptionTier !== 'premium')
      ) {
        return true
      }
    }
    // PAR-Q logic
    if (feature.requiresParq && !user?.parqCompleted) return true
    return false
  }

  // Helper to get lock reason
  const getLockReason = (feature: typeof dashboardFeatures[number]) => {
    if (isGuest && !feature.allowGuest) return 'Sign up to unlock this feature'
    if (feature.requiresSubscription) {
      if (feature.requiresSubscription === 'basic' && subscriptionTier === 'free') {
        return 'Upgrade to Basic to access this feature'
      }
      if (feature.requiresSubscription === 'premium' && subscriptionTier !== 'premium') {
        return 'Upgrade to Premium to access this feature'
      }
    }
    if (feature.requiresParq && !user?.parqCompleted) return 'Complete PAR-Q to unlock this feature'
    return undefined
  }

  // Check if any features are locked due to plan
  const lockedDueToPlan = dashboardFeatures.some(f => {
    if (!isFeatureLocked(f)) return false
    const reason = getLockReason(f)
    return reason && reason.toLowerCase().includes('upgrade')
  })

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto bg-black rounded-lg border border-gray-800 p-8">
        {/* Guest Mode Banner */}
        {isGuest && (
          <div className="bg-yellow-500/10 border border-yellow-500 text-yellow-200 px-4 py-3 rounded-lg mb-8 flex items-center justify-between">
            <span>You are in guest mode. Your preferences will be saved for 7 days. </span>
            <button
              className="bg-yellow-500 text-black px-4 py-2 rounded-md font-semibold ml-4 hover:bg-yellow-400 transition-colors"
              onClick={() => {
                trackEvent('guest_create_account_cta')
                navigate('/register')
              }}
            >
              Create Account
            </button>
          </div>
        )}
        {/* PAR-Q Prompt Banner */}
        {user && !user.parqCompleted && !isGuest && (
          <div className="bg-blue-500/10 border border-blue-500 text-blue-200 px-4 py-3 rounded-lg mb-8 flex items-center justify-between">
            <span>Complete your PAR-Q assessment to unlock all features.</span>
            <button
              className="bg-blue-500 text-black px-4 py-2 rounded-md font-semibold ml-4 hover:bg-blue-400 transition-colors"
              onClick={() => {
                trackEvent('parq_prompt_cta')
                navigate('/parq')
              }}
            >
              Complete PAR-Q
            </button>
          </div>
        )}
        {/* Empty State for New Users */}
        {user && !isGuest && !user.parqCompleted && (
          <div className="bg-gray-900 border border-gray-800 text-gray-200 px-4 py-6 rounded-lg mb-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Welcome to FitArchitect!</h2>
            <p className="mb-2">Get started by completing your PAR-Q, logging your first meal, or starting a workout.</p>
            <div className="flex justify-center gap-4 mt-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" onClick={() => { trackEvent('empty_state_parq_cta'); navigate('/parq') }}>Complete PAR-Q</button>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded" onClick={() => { trackEvent('empty_state_log_meal_cta'); navigate('/nutrition') }}>Log Meal</button>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded" onClick={() => { trackEvent('empty_state_start_workout_cta'); navigate('/workouts') }}>Start Workout</button>
            </div>
          </div>
        )}
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Welcome{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
          </h1>
          <p className="text-gray-400 text-lg">
            Your fitness journey starts here
          </p>
        </div>
        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {dashboardFeatures.map((feature) => {
            const locked = isFeatureLocked(feature)
            const lockReason = getLockReason(feature)
            return (
              <FeatureCard
                key={feature.key}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
                locked={locked}
                lockReason={lockReason}
                onClick={() => {
                  if (isGuest) {
                    trackEvent('guest_feature_click', { feature: feature.title, allowed: !locked })
                  }
                  if (locked) {
                    if (isGuest) {
                      trackEvent('guest_locked_feature_attempt', { feature: feature.title })
                      // For guests, navigate to register page for locked features
                      navigate('/register')
                      return
                    }
                    if (lockReason && lockReason.toLowerCase().includes('upgrade')) {
                      setShowUpgradeModal(true)
                      return
                    }
                    // For other locked features (like PAR-Q required), don't navigate
                    return
                  }
                  navigate(feature.path)
                }}
              />
            )
          })}
        </div>
        {/* Upgrade Floating Button */}
        {lockedDueToPlan && !isGuest && (
          <button
            className="fixed bottom-8 right-8 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-6 py-3 rounded-full shadow-lg font-bold text-lg z-50 hover:from-yellow-300 hover:to-yellow-500 transition-colors"
            onClick={() => setShowUpgradeModal(true)}
          >
            Upgrade Plan
          </button>
        )}
        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
            <div className="bg-gray-900 rounded-lg p-8 max-w-md w-full text-white relative border border-gray-800">
              <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-300" onClick={() => setShowUpgradeModal(false)}>&times;</button>
              <h2 className="text-2xl font-bold mb-4">Upgrade Your Plan</h2>
              <p className="mb-4">Unlock premium features by upgrading your subscription plan.</p>
              <div className="flex flex-col gap-4">
                <button className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded font-semibold" onClick={() => { trackEvent('upgrade_to_basic'); navigate('/pricing') }}>Upgrade to Basic</button>
                <button className="bg-yellow-700 hover:bg-yellow-600 text-white px-4 py-2 rounded font-semibold" onClick={() => { trackEvent('upgrade_to_premium'); navigate('/pricing') }}>Upgrade to Premium</button>
              </div>
            </div>
          </div>
        )}
        {/* Quick Actions */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-6">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/workouts')}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg transition-colors"
            >
              Start Workout
            </button>
            <button
              onClick={() => navigate('/nutrition')}
              className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg transition-colors"
            >
              Log Meal
            </button>
            <button
              onClick={() => navigate('/meal-planning')}
              className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg transition-colors"
            >
              Meal Planning
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 