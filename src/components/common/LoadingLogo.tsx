import React from 'react'
import { motion } from 'framer-motion'

interface LoadingLogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const LoadingLogo: React.FC<LoadingLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <motion.div
      className={`${sizeClasses[size]} ${className}`}
      animate={{
        y: [0, -10, 0],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <img
        src="/assets/images/logo.png"
        alt="FitArchitect Logo"
        className="w-full h-full"
      />
    </motion.div>
  )
} 