import React from 'react'
import { motion } from 'framer-motion'

interface ProgressPyramidProps {
  totalSets: number
  completedSets: number
  currentSet: number
  variant?: 'compact' | 'detailed'
  showLabels?: boolean
}

const ProgressPyramid: React.FC<ProgressPyramidProps> = ({
  totalSets,
  completedSets,
  currentSet,
  variant = 'detailed',
  showLabels = true
}) => {
  const generateSets = () => {
    const sets = []
    for (let i = 1; i <= totalSets; i++) {
      const isCompleted = i <= completedSets
      const isCurrent = i === currentSet
      const isPending = i > currentSet
      
      sets.push({
        id: i,
        isCompleted,
        isCurrent,
        isPending,
        status: isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'
      })
    }
    return sets
  }

  const sets = generateSets()
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const setVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 300
      }
    }
  }

  const getSetStyles = (set: any) => {
    const baseClasses = "relative flex items-center justify-center font-bold text-sm transition-all duration-300"
    
    if (set.isCompleted) {
      return `${baseClasses} bg-green-500 text-white border-2 border-green-400 shadow-lg`
    } else if (set.isCurrent) {
      return `${baseClasses} bg-orange-500 text-white border-2 border-orange-400 shadow-lg animate-pulse`
    } else {
      return `${baseClasses} bg-gray-700 text-gray-400 border-2 border-gray-600`
    }
  }

  if (variant === 'compact') {
    return (
      <div className="flex flex-col items-center space-y-2">
        {/* Progress Bar */}
        <div className="w-full bg-gray-800 rounded-full h-2">
          <motion.div
            className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        
        {/* Set Counter */}
        <div className="text-sm text-gray-400">
          Set {currentSet} of {totalSets}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {showLabels && (
        <div className="text-center">
          <div className="text-lg font-semibold text-white">Set Progress</div>
          <div className="text-sm text-gray-400">
            {completedSets} of {totalSets} completed
          </div>
        </div>
      )}

      {/* Pyramid Structure */}
      <motion.div
        className="flex flex-col items-center space-y-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Build pyramid rows based on total sets */}
        {Array.from({ length: Math.ceil(totalSets / 3) }, (_, rowIndex) => {
          const setsInRow = Math.min(3, totalSets - rowIndex * 3)
          const rowSets = sets.slice(rowIndex * 3, rowIndex * 3 + setsInRow)
          
          return (
            <motion.div
              key={rowIndex}
              className="flex space-x-2"
              variants={setVariants}
            >
              {rowSets.map((set) => (
                <motion.div
                  key={set.id}
                  className={`w-12 h-12 rounded-lg ${getSetStyles(set)}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  layout
                >
                  {set.isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-white"
                    >
                      ✓
                    </motion.div>
                  ) : (
                    <span>{set.id}</span>
                  )}
                  
                  {/* Glow effect for current set */}
                  {set.isCurrent && (
                    <motion.div
                      className="absolute inset-0 rounded-lg bg-orange-500/20"
                      animate={{
                        opacity: [0.5, 1, 0.5],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}
                </motion.div>
              ))}
            </motion.div>
          )
        })}
      </motion.div>

      {/* Time Under Tension Indicator (if detailed) */}
      {variant === 'detailed' && (
        <motion.div
          className="flex items-center space-x-4 text-xs text-gray-400"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span>Current</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
            <span>Pending</span>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default ProgressPyramid