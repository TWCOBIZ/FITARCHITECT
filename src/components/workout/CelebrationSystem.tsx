import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'

interface CelebrationSystemProps {
  trigger: 'set' | 'exercise' | 'workout' | null
  onComplete?: () => void
}

// Export interface for imperative handle
export interface CelebrationSystemRef {
  forceReset: () => void
}

const CelebrationSystem = React.forwardRef<CelebrationSystemRef, CelebrationSystemProps>(({
  trigger,
  onComplete
}, ref) => {
  const [isVisible, setIsVisible] = React.useState(false)
  const [currentTrigger, setCurrentTrigger] = React.useState<'set' | 'exercise' | 'workout' | null>(null)
  
  // Use useRef to store the latest callback without causing re-renders
  const onCompleteRef = React.useRef(onComplete)
  React.useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Use useRef for timer IDs to prevent cleanup issues
  const timersRef = React.useRef<{ main?: NodeJS.Timeout; failsafe?: NodeJS.Timeout }>({})

  // SIMPLIFIED: Immediate dismissal for user interactions
  const handleComplete = React.useCallback(() => {
    console.log('CelebrationSystem: user-triggered dismissal - immediate cleanup')
    
    // Clear all timers immediately
    Object.values(timersRef.current).forEach(timer => {
      if (timer) clearTimeout(timer)
    })
    timersRef.current = {}
    
    // Immediate state cleanup
    setIsVisible(false)
    setCurrentTrigger(null)
    confetti.reset()
    confettiIntervals.current.forEach(clearInterval)
    confettiIntervals.current = []
    
    // Call callback immediately for responsive UX
    if (onCompleteRef.current) {
      onCompleteRef.current()
    }
  }, [])

  // EMERGENCY: Force reset function exposed via imperative handle
  const forceReset = React.useCallback(() => {
    console.log('CelebrationSystem: FORCE RESET - emergency cleanup')
    
    // Immediately clear all state and timers
    Object.values(timersRef.current).forEach(timer => {
      if (timer) clearTimeout(timer)
    })
    timersRef.current = {}
    
    setIsVisible(false)
    setCurrentTrigger(null)
    confetti.reset()
    confettiIntervals.current.forEach(clearInterval)
    confettiIntervals.current = []
    
    // Call onComplete immediately without delay
    onCompleteRef.current?.()
  }, [])

  // Expose force reset function via imperative handle
  React.useImperativeHandle(ref, () => ({
    forceReset
  }), [forceReset])

  // URGENT: Immediate confetti clearing effect when trigger becomes null
  React.useEffect(() => {
    if (!trigger && currentTrigger) {
      console.log('CelebrationSystem: trigger became null, immediate cleanup')
      handleComplete()
    }
  }, [trigger, currentTrigger, handleComplete])

  // Main celebration effect with debouncing and proper cleanup
  React.useEffect(() => {
    if (trigger && trigger !== currentTrigger) {
      console.log('CelebrationSystem: trigger activated:', trigger)
      
      // Clear any existing timers first (debouncing)
      Object.values(timersRef.current).forEach(timer => {
        if (timer) clearTimeout(timer)
      })
      timersRef.current = {}
      
      // Set new celebration state
      setCurrentTrigger(trigger)
      setIsVisible(true)
      triggerCelebration(trigger)
      
          // CRITICAL FIX: Single auto-dismiss timer with guaranteed cleanup
      timersRef.current.main = setTimeout(() => {
        console.log('CelebrationSystem: auto-dismiss timer fired after 3s - guaranteed cleanup')
        
        // Immediate state reset
        setIsVisible(false)
        setCurrentTrigger(null)
        
        // Clear confetti immediately
        confetti.reset()
        confettiIntervals.current.forEach(clearInterval)
        confettiIntervals.current = []
        
        // Call onComplete callback after cleanup
        setTimeout(() => {
          if (onCompleteRef.current) {
            onCompleteRef.current()
          }
        }, 100)
      }, 2500)
    }

    // Cleanup function
    return () => {
      console.log('CelebrationSystem: useEffect cleanup')
      Object.values(timersRef.current).forEach(timer => {
        if (timer) clearTimeout(timer)
      })
      confetti.reset()
      confettiIntervals.current.forEach(clearInterval)
      confettiIntervals.current = []
    }
  }, [trigger, currentTrigger, handleComplete])

  const confettiIntervals = React.useRef<NodeJS.Timeout[]>([])

  const triggerCelebration = (type: 'set' | 'exercise' | 'workout') => {
    // Clear any existing intervals first
    confettiIntervals.current.forEach(clearInterval)
    confettiIntervals.current = []

    const celebrations = {
      set: () => {
        // Quick burst for set completion - faster fall
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10b981', '#059669', '#065f46'],
          gravity: 1.5,
          scalar: 0.8,
          ticks: 120
        })
      },
      exercise: () => {
        // Medium celebration for exercise completion - faster fall
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f97316', '#ea580c', '#c2410c'],
          gravity: 1.5,
          scalar: 0.8,
          ticks: 120
        })
        
        const interval = setTimeout(() => {
          confetti({
            particleCount: 50,
            spread: 100,
            origin: { y: 0.8 },
            colors: ['#f97316', '#ea580c', '#c2410c'],
            gravity: 1.5,
            scalar: 0.8,
            ticks: 120
          })
        }, 250)
        confettiIntervals.current.push(interval)
      },
      workout: () => {
        // URGENT: Single burst workout celebration - NO continuous intervals
        confetti({
          particleCount: 150,
          spread: 120,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#1d4ed8', '#1e3a8a', '#10b981', '#059669', '#065f46'],
          gravity: 2,
          scalar: 0.8,
          ticks: 150
        })
        
        // Second burst after short delay
        const burst2 = setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 100,
            origin: { y: 0.8 },
            colors: ['#f59e0b', '#ef4444', '#8b5cf6'],
            gravity: 2,
            scalar: 0.8,
            ticks: 150
          })
        }, 300)
        
        confettiIntervals.current.push(burst2)
      }
    }

    celebrations[type]()
  }

  // Clear intervals on unmount
  React.useEffect(() => {
    return () => {
      confettiIntervals.current.forEach(clearInterval)
      confetti.reset()
    }
  }, [])

  const getMessageAndIcon = () => {
    switch (currentTrigger) {
      case 'set':
        return {
          message: 'Set Complete!',
          icon: '💪',
          subtext: 'Great job!',
          color: 'text-green-400'
        }
      case 'exercise':
        return {
          message: 'Exercise Complete!',
          icon: '🔥',
          subtext: 'You crushed it!',
          color: 'text-orange-400'
        }
      case 'workout':
        return {
          message: 'Workout Complete!',
          icon: '🏆',
          subtext: 'Amazing work today!',
          color: 'text-blue-400'
        }
      default:
        return {
          message: '',
          icon: '',
          subtext: '',
          color: ''
        }
    }
  }

  const celebration = getMessageAndIcon()

  return (
    <AnimatePresence>
      {isVisible && currentTrigger && (
        <motion.div
          className={`fixed inset-0 z-50 flex items-center justify-center cursor-pointer`}
          onClick={handleComplete}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
        >
          {/* Overlay - only for exercise and workout completions */}
          {currentTrigger !== 'set' && (
            <motion.div
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}

          {/* Celebration Content */}
          <motion.div
            className={`relative z-10 text-center ${currentTrigger === 'set' ? 'mb-32' : ''}`}
            initial={{ scale: 0, rotate: currentTrigger === 'set' ? 0 : -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: currentTrigger === 'set' ? 0 : 180 }}
            transition={{
              type: "spring",
              damping: currentTrigger === 'set' ? 20 : 15,
              stiffness: currentTrigger === 'set' ? 400 : 300
            }}
          >
            {/* Icon */}
            <motion.div
              className={`${currentTrigger === 'set' ? 'text-6xl mb-2' : 'text-8xl mb-4'}`}
              animate={currentTrigger === 'workout' ? {
                rotate: [0, 10, -10, 10, 0],
                scale: [1, 1.1, 1, 1.1, 1]
              } : currentTrigger === 'set' ? {
                scale: [1, 1.1, 1]
              } : {
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: currentTrigger === 'workout' ? 2 : currentTrigger === 'set' ? 0.4 : 0.6,
                repeat: currentTrigger === 'workout' ? Infinity : 0,
                ease: "easeInOut"
              }}
            >
              {celebration.icon}
            </motion.div>

            {/* Main Message */}
            <motion.h1
              className={`text-4xl font-bold ${celebration.color} mb-2`}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {celebration.message}
            </motion.h1>

            {/* Subtext */}
            <motion.p
              className="text-xl text-gray-300"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {celebration.subtext}
            </motion.p>

            {/* Animated rings for workout completion */}
            {currentTrigger === 'workout' && (
              <div className="absolute inset-0 flex items-center justify-center">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute border-2 border-blue-400/30 rounded-full"
                    initial={{ width: 0, height: 0, opacity: 1 }}
                    animate={{
                      width: [0, 200, 400],
                      height: [0, 200, 400],
                      opacity: [1, 0.5, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.5,
                      ease: "easeOut"
                    }}
                  />
                ))}
              </div>
            )}

            {/* Progress indicator for timed celebrations */}
            <motion.div
              className="mt-8 w-64 h-1 bg-gray-700 rounded-full overflow-hidden mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <motion.div
                className={`h-full ${
                  currentTrigger === 'set' ? 'bg-green-400' :
                  currentTrigger === 'exercise' ? 'bg-orange-400' :
                  'bg-blue-400'
                }`}
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ 
                  duration: currentTrigger === 'set' ? 1.5 : currentTrigger === 'exercise' ? 2 : 3, 
                  ease: "linear" 
                }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

CelebrationSystem.displayName = 'CelebrationSystem'

export default CelebrationSystem