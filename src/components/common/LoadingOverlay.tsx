import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LoadingSpinner from './LoadingSpinner'

interface LoadingOverlayProps {
  isLoading: boolean
  text?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  blur?: boolean
  className?: string
  children?: React.ReactNode
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  text = 'Loading...',
  size = 'lg',
  blur = true,
  className = '',
  children
}) => {
  return (
    <div className={`relative ${className}`}>
      {children}
      
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`
              absolute inset-0 
              bg-white/80 
              ${blur ? 'backdrop-blur-sm' : ''}
              flex items-center justify-center 
              z-50
            `}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4"
            >
              <LoadingSpinner 
                size={size} 
                color="blue" 
                text={text}
                className="text-center"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LoadingOverlay