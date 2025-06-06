// Common types
// Remove the User interface from this file. Use only the canonical User from src/types/user.ts.

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