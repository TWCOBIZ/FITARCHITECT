import React from 'react'
import { cn } from '../../utils/helpers'

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  className,
  ...props
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        className={cn(
          "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2",
          error && "border-red-500",
          // Ensure text color is always opposite of background
          className?.includes('bg-black') || className?.includes('bg-gray-900') || className?.includes('bg-gray-800') || className?.includes('bg-muted')
            ? 'text-white'
            : (className?.includes('bg-white') || className?.includes('bg-gray-50') || className?.includes('bg-gray-100'))
              ? 'text-black'
              : 'text-black', // default to black for safety
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
} 