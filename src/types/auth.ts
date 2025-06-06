import { User } from './user'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials extends LoginCredentials {
  name: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isCleared: boolean
  subscriptionTier: 'free' | 'basic' | 'premium'
}

export interface AuthResponse {
  user: User
  token: string
}

export interface ParqResponse {
  isCleared: boolean
  flaggedQuestions: string[]
  submissionDate: string
} 