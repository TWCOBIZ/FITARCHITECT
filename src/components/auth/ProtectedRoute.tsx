import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

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
  const { 
    isAuthenticated, 
    isGuest, 
    parqCompleted, 
    hasValidSubscription 
  } = useAuth()
  const location = useLocation()

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (isGuest && !allowGuest) {
    return <Navigate to="/dashboard" replace />
  }

  if (requireParq && !parqCompleted) {
    return <Navigate to="/parq" state={{ from: location }} replace />
  }

  if (requireSubscription && !hasValidSubscription(requireSubscription)) {
    return <Navigate to="/pricing" state={{ from: location }} replace />
  }

  return <>{children}</>
} 