import React from 'react'
import { motion } from 'framer-motion'

interface LoadingLogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const LoadingLogo: React.FC<LoadingLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32'
  }

  // Use the exact logo file as the splash screen
  return (
    <motion.div
      className={`relative ${sizeClasses[size]} ${className}`}
      animate={{
        scale: [1, 1.22, 0.92, 1.18, 1],
        boxShadow: [
          '0 0 0px #00FFD0',
          '0 0 32px #00FFD0',
          '0 0 12px #00FFD0',
          '0 0 24px #00FFD0',
          '0 0 0px #00FFD0'
        ]
      }}
      transition={{
        duration: 1.2,
        repeat: Infinity,
        ease: 'easeInOut',
        times: [0, 0.2, 0.4, 0.7, 1]
      }}
    >
      <img
        src="/assets/images/logo.png"
        alt="FitArchitect Logo"
        className="w-full h-full drop-shadow-xl"
        style={{ filter: 'drop-shadow(0 0 16px #00FFD0)' }}
      />
    </motion.div>
  )
} 