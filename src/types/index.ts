// Common types
export interface User {
  id: string
  email: string
  name: string
  tier?: 'free' | 'basic' | 'premium'
  type?: 'guest' | 'registered'
  parqCompleted?: boolean
  isAdmin?: boolean
  isGuest?: boolean
  profile?: {
    email: string
  }
  subscription?: {
    plan?: string
  }
  subscriptionStatus?: string
}

// API Response types
export interface ApiResponse<T> {
  data: T
  status: number
  message: string
}

// Component Props types
export interface BaseProps {
  className?: string
  children?: React.ReactNode
} 