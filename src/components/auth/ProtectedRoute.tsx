import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useUser } from '../../contexts/UserContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireParq?: boolean
  requireSubscription?: 'basic' | 'premium'
  allowGuest?: boolean
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireParq = false,
  requireSubscription,
  allowGuest = false
}) => {
  const { isAuthenticated, isGuest } = useAuth()
  const { isCleared, subscriptionTier, user } = useUser()
  const location = useLocation()

  // Bypass all protection for test user
  if (user?.email === 'nepacreativeagency@icloud.com') {
    return <>{children}</>;
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (isGuest && !allowGuest) {
    return <Navigate to="/landing" replace />
  }

  if (requireParq && !isCleared) {
    return <Navigate to="/parq" state={{ from: location }} replace />
  }

  if (requireSubscription && subscriptionTier !== requireSubscription) {
    // Bypass for test user
    const userEmail = (typeof window !== 'undefined' && localStorage.getItem('user')) ? JSON.parse(localStorage.getItem('user') || '{}').email : undefined;
    if (userEmail === 'nepacreativeagency@icloud.com') {
      return <>{children}</>;
    }
    return <Navigate to="/pricing" state={{ from: location }} replace />
  }

  return <>{children}</>
} 