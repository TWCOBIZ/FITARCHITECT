// Common types
export interface User {
  id: string
  email: string
  name: string
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