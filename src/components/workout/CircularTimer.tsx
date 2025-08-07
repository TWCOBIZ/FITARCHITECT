import React from 'react'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'
import { motion } from 'framer-motion'

interface CircularTimerProps {
  timeRemaining: number
  totalTime: number
  isActive: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'rest' | 'exercise' | 'session'
  onComplete?: () => void
}

const CircularTimer: React.FC<CircularTimerProps> = ({
  timeRemaining,
  totalTime,
  isActive,
  size = 'lg',
  variant = 'rest',
  onComplete
}) => {
  const percentage = totalTime > 0 ? ((totalTime - timeRemaining) / totalTime) * 100 : 0

  // Size configurations
  const sizeMap = {
    sm: { width: 60, height: 60, textSize: 'text-sm', strokeWidth: 8 },
    md: { width: 100, height: 100, textSize: 'text-lg', strokeWidth: 6 },
    lg: { width: 160, height: 160, textSize: 'text-3xl', strokeWidth: 4 },
    xl: { width: 220, height: 220, textSize: 'text-5xl', strokeWidth: 3 }
  }

  // Color configurations based on variant
  const colorMap = {
    rest: {
      path: '#3b82f6', // Blue
      trail: '#1e293b',
      text: '#3b82f6',
      glow: '0 0 20px rgba(59, 130, 246, 0.4)'
    },
    exercise: {
      path: '#f97316', // Orange
      trail: '#1e293b', 
      text: '#f97316',
      glow: '0 0 20px rgba(249, 115, 22, 0.4)'
    },
    session: {
      path: '#10b981', // Green
      trail: '#1e293b',
      text: '#10b981', 
      glow: '0 0 20px rgba(16, 185, 129, 0.4)'
    }
  }

  const config = sizeMap[size]
  const colors = colorMap[variant]

  // Format time display
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Pulse animation when time is running low
  const isUrgent = variant === 'rest' && timeRemaining <= 10 && timeRemaining > 0
  const isPulsing = isActive && (isUrgent || variant === 'exercise')

  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ width: config.width, height: config.height }}
      animate={isPulsing ? {
        scale: [1, 1.05, 1],
        boxShadow: [
          colors.glow,
          `0 0 30px ${colors.path}40`,
          colors.glow
        ]
      } : {}}
      transition={{
        duration: isUrgent ? 0.5 : 1.5,
        repeat: isPulsing ? Infinity : 0,
        ease: "easeInOut"
      }}
    >
      {/* Circular Progress Bar */}
      <CircularProgressbar
        value={percentage}
        styles={buildStyles({
          pathColor: colors.path,
          trailColor: colors.trail,
          pathTransitionDuration: 0.5,
          strokeLinecap: 'round'
        })}
        strokeWidth={config.strokeWidth}
      />
      
      {/* Time Display Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          className={`font-bold ${config.textSize} text-white leading-none`}
          style={{ color: colors.text }}
          animate={isUrgent ? {
            color: ['#ef4444', colors.text, '#ef4444']
          } : {}}
          transition={{
            duration: 0.5,
            repeat: isUrgent ? Infinity : 0
          }}
        >
          {formatTime(timeRemaining)}
        </motion.div>
        
        {/* Additional info for larger sizes */}
        {size === 'xl' && (
          <motion.div
            className="text-gray-400 text-sm mt-1 uppercase tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {variant === 'rest' ? 'Rest Time' : 
             variant === 'exercise' ? 'Active' : 'Session'}
          </motion.div>
        )}
      </div>

      {/* Completion indicator */}
      {percentage >= 100 && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
        >
          <div 
            className="w-full h-full rounded-full border-4 border-green-500"
            style={{ boxShadow: '0 0 20px rgba(16, 185, 129, 0.6)' }}
          />
          <div className="absolute text-green-500 text-2xl">
            ✓
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default CircularTimer