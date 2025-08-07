import React from 'react'
import { motion } from 'framer-motion'
import LoadingSpinner from './LoadingSpinner'

interface ActionButtonProps {
  onClick?: () => void | Promise<void>
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  loadingText?: string
  className?: string
  type?: 'button' | 'submit' | 'reset'
  'data-testid'?: string
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  loadingText,
  className = '',
  type = 'button',
  'data-testid': dataTestId
}) => {
  const [internalLoading, setInternalLoading] = React.useState(false)

  const handleClick = async () => {
    if (isLoading || disabled || !onClick) return

    try {
      setInternalLoading(true)
      const result = onClick()
      if (result instanceof Promise) {
        await result
      }
    } catch (error) {
      console.error('Button action failed:', error)
    } finally {
      setInternalLoading(false)
    }
  }

  const isButtonLoading = isLoading || internalLoading

  const variantClasses = {
    primary: `
      bg-blue-600 hover:bg-blue-700 text-white
      disabled:bg-blue-400 disabled:cursor-not-allowed
    `,
    secondary: `
      bg-gray-200 hover:bg-gray-300 text-gray-800
      disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
    `,
    danger: `
      bg-red-600 hover:bg-red-700 text-white
      disabled:bg-red-400 disabled:cursor-not-allowed
    `,
    ghost: `
      bg-transparent hover:bg-gray-100 text-gray-700 border border-gray-300
      disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent
    `
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }

  return (
    <motion.button
      type={type}
      onClick={handleClick}
      disabled={disabled || isButtonLoading}
      data-testid={dataTestId}
      whileHover={!disabled && !isButtonLoading ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !isButtonLoading ? { scale: 0.98 } : undefined}
      className={`
        relative inline-flex items-center justify-center
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
        rounded-lg font-medium transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${className}
      `}
    >
      {isButtonLoading ? (
        <div className="flex items-center">
          <LoadingSpinner 
            size="sm" 
            color={variant === 'primary' || variant === 'danger' ? 'white' : 'gray'} 
          />
          {loadingText && (
            <span className="ml-2">{loadingText}</span>
          )}
        </div>
      ) : (
        children
      )}
    </motion.button>
  )
}

export default ActionButton