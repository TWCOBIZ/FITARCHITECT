import React from 'react'
import { motion } from 'framer-motion'

type StatusType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'pending'

interface StatusBadgeProps {
  status: StatusType
  text?: string
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
  className?: string
  showIcon?: boolean
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  text,
  size = 'md',
  animated = true,
  className = '',
  showIcon = true
}) => {
  const statusConfig = {
    success: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: '✓',
      defaultText: 'Success'
    },
    error: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: '✕',
      defaultText: 'Error'
    },
    warning: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: '⚠',
      defaultText: 'Warning'
    },
    info: {
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: 'ℹ',
      defaultText: 'Info'
    },
    loading: {
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: '⟳',
      defaultText: 'Loading'
    },
    pending: {
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: '⏳',
      defaultText: 'Pending'
    }
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  const config = statusConfig[status]
  const displayText = text || config.defaultText

  return (
    <motion.span
      initial={animated ? { opacity: 0, scale: 0.8 } : undefined}
      animate={animated ? { opacity: 1, scale: 1 } : undefined}
      transition={animated ? { duration: 0.3 } : undefined}
      className={`
        inline-flex items-center
        ${sizeClasses[size]}
        ${config.color}
        border rounded-full font-medium
        ${className}
      `}
    >
      {showIcon && (
        <motion.span
          className="mr-1"
          animate={status === 'loading' ? { rotate: 360 } : undefined}
          transition={status === 'loading' ? { 
            duration: 1, 
            repeat: Infinity, 
            ease: 'linear' 
          } : undefined}
        >
          {config.icon}
        </motion.span>
      )}
      {displayText}
    </motion.span>
  )
}

export default StatusBadge