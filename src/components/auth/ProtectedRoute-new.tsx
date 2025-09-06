import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireParq?: boolean
  requireSubscription?: 'basic' | 'premium'
  allowGuest?: boolean
  requireProfileComplete?: boolean
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireParq = false,
  requireSubscription,
  allowGuest = false,
  requireProfileComplete = false
}) => {
  const { 
    user,
    isProfileComplete,
    hasFeatureAccess,
    getSubscriptionTier
  } = useAuthStore()
  
  const location = useLocation()
  
  // Check authentication
  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  
  // Check guest restrictions
  if (user?.type === 'guest' && !allowGuest) {
    return <Navigate to="/dashboard" replace />
  }
  
  // Check PAR-Q completion
  if (requireParq && !user?.parqCompleted) {
    return <Navigate to="/parq" state={{ from: location }} replace />
  }
  
  // Check profile completion
  if (requireProfileComplete && !isProfileComplete()) {
    return <Navigate to="/fitness-profile" state={{ from: location }} replace />
  }
  
  // Check subscription tier
  if (requireSubscription) {
    const currentTier = getSubscriptionTier()
    const tierHierarchy = ['guest', 'free', 'basic', 'premium']
    const currentTierLevel = tierHierarchy.indexOf(currentTier)
    const requiredTierLevel = tierHierarchy.indexOf(requireSubscription)
    
    if (currentTierLevel < requiredTierLevel) {
      return <Navigate to="/pricing" state={{ from: location }} replace />
    }
  }
  
  return <>{children}</>
}