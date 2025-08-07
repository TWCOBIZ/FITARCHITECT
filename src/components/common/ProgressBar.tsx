import React from 'react'
import { motion } from 'framer-motion'

interface ProgressBarProps {
  progress: number // 0-100
  size?: 'sm' | 'md' | 'lg'
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  showPercentage?: boolean
  animated?: boolean
  className?: string
  label?: string
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = 'md',
  color = 'blue',
  showPercentage = true,
  animated = true,
  className = '',
  label
}) => {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progress))

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  }

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-500',
    red: 'bg-red-600',
    purple: 'bg-purple-600'
  }

  const backgroundClasses = {
    blue: 'bg-gray-800',
    green: 'bg-gray-800', 
    yellow: 'bg-gray-800',
    red: 'bg-gray-800',
    purple: 'bg-gray-800'
  }

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-300">{label}</span>
          {showPercentage && (
            <span className="text-sm text-gray-400">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      
      <div className={`
        w-full ${sizeClasses[size]} ${backgroundClasses[color]} 
        rounded-full overflow-hidden
      `}>
        <motion.div
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full`}
          initial={animated ? { width: '0%' } : { width: `${clampedProgress}%` }}
          animate={{ width: `${clampedProgress}%` }}
          transition={animated ? { 
            duration: 0.8, 
            ease: 'easeOut',
            delay: 0.2 
          } : undefined}
        />
      </div>
      
      {showPercentage && !label && (
        <div className="flex justify-center mt-1">
          <motion.span 
            className="text-xs text-gray-400"
            initial={animated ? { opacity: 0 } : { opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={animated ? { delay: 0.5 } : undefined}
          >
            {Math.round(clampedProgress)}%
          </motion.span>
        </div>
      )}
    </div>
  )
}

export default ProgressBar