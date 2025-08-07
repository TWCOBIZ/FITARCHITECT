import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'

interface SetData {
  completed: boolean
  reps: number
  weight?: number
}

interface SetTrackerProps {
  exerciseId: string
  exerciseName: string
  sets: SetData[]
  targetReps: number
  targetSets: number
  onSetComplete: (setIndex: number, reps: number, weight?: number) => void
  onSetUpdate: (setIndex: number, reps: number, weight?: number) => void
}

const SetTracker: React.FC<SetTrackerProps> = ({
  exerciseId,
  exerciseName,
  sets,
  targetReps,
  targetSets,
  onSetComplete,
  onSetUpdate
}) => {
  const [setInputs, setSetInputs] = useState<{ reps: string; weight: string }[]>([])
  const [focusedInput, setFocusedInput] = useState<string | null>(null)
  const [hasBeenFocused, setHasBeenFocused] = useState<Record<number, {reps: boolean, weight: boolean}>>({})
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({})
  const firstIncompleteInputRef = useRef<HTMLInputElement>(null)

  // Initialize input values - start empty for better UX
  useEffect(() => {
    const initialInputs = Array(targetSets).fill(null).map((_, index) => ({
      reps: sets[index]?.reps?.toString() || '',
      weight: sets[index]?.weight?.toString() || ''
    }))
    setSetInputs(initialInputs)
    
    // Initialize hasBeenFocused tracking
    const initialFocusTracking: Record<number, {reps: boolean, weight: boolean}> = {}
    for (let i = 0; i < targetSets; i++) {
      initialFocusTracking[i] = { reps: false, weight: false }
    }
    setHasBeenFocused(initialFocusTracking)
  }, [targetSets, targetReps, sets])

  // Auto-focus on first incomplete set
  useEffect(() => {
    const firstIncompleteIndex = sets.findIndex(set => !set.completed)
    if (firstIncompleteIndex >= 0 && firstIncompleteInputRef.current) {
      setTimeout(() => {
        firstIncompleteInputRef.current?.focus()
      }, 300) // Small delay for smooth animation
    }
  }, [sets])

  // Validation function
  const validateInput = (field: 'reps' | 'weight', value: string): string | null => {
    const numValue = parseFloat(value)
    if (!value || isNaN(numValue)) return null
    
    if (field === 'reps' && (numValue < 1 || numValue > 999)) {
      return 'Reps must be between 1 and 999'
    }
    if (field === 'weight' && (numValue < 0 || numValue > 9999)) {
      return 'Weight must be between 0 and 9999 lbs'
    }
    return null
  }

  // Focus handler - clear placeholder values and track focus
  const handleInputFocus = (setIndex: number, field: 'reps' | 'weight') => {
    setFocusedInput(`${setIndex}-${field}`)
    
    // Clear validation error when user focuses
    const errorKey = `${setIndex}-${field}`
    if (inputErrors[errorKey]) {
      setInputErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
    
    // Mark as focused for this field
    setHasBeenFocused(prev => ({
      ...prev,
      [setIndex]: { ...prev[setIndex], [field]: true }
    }))
  }

  // Blur handler - validate and provide feedback
  const handleInputBlur = (setIndex: number, field: 'reps' | 'weight') => {
    setFocusedInput(null)
    
    const value = setInputs[setIndex]?.[field] || ''
    const error = validateInput(field, value)
    
    if (error) {
      setInputErrors(prev => ({
        ...prev,
        [`${setIndex}-${field}`]: error
      }))
    }
  }

  // Auto-focus progression
  const handleKeyNavigation = (e: React.KeyboardEvent, setIndex: number, field: 'reps' | 'weight') => {
    if (e.key === 'Enter') {
      e.preventDefault()
      
      // Move to next input field
      if (field === 'reps') {
        // Move to weight field of same set
        const weightInput = document.querySelector(`input[data-set="${setIndex}"][data-field="weight"]`) as HTMLInputElement
        weightInput?.focus()
      } else if (field === 'weight') {
        // Move to reps field of next set
        if (setIndex < targetSets - 1) {
          const nextRepsInput = document.querySelector(`input[data-set="${setIndex + 1}"][data-field="reps"]`) as HTMLInputElement
          nextRepsInput?.focus()
        }
      }
    }
  }

  const handleSetInputChange = (setIndex: number, field: 'reps' | 'weight', value: string) => {
    setSetInputs(prev => {
      const newInputs = [...prev]
      newInputs[setIndex] = { ...newInputs[setIndex], [field]: value }
      return newInputs
    })

    // Update the set data in real-time
    const reps = field === 'reps' ? parseInt(value) || 0 : parseInt(setInputs[setIndex]?.reps) || 0
    const weight = field === 'weight' ? parseFloat(value) || undefined : parseFloat(setInputs[setIndex]?.weight) || undefined

    onSetUpdate(setIndex, reps, weight)
  }

  const handleCompleteSet = (setIndex: number) => {
    const reps = parseInt(setInputs[setIndex]?.reps) || 0
    const weight = parseFloat(setInputs[setIndex]?.weight) || undefined

    if (reps <= 0) {
      toast.error('Please enter a valid number of reps')
      return
    }

    onSetComplete(setIndex, reps, weight)
    
    // Celebration feedback
    const completedSets = sets.filter(set => set.completed).length + 1
    const progressPercentage = (completedSets / targetSets) * 100
    
    // Celebrations are now handled by the unified CelebrationSystem in WorkoutTracker
    // This provides a cleaner, non-blocking celebration experience
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 mb-6">
      <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-white">Set Tracking</h3>
      
      <div className="space-y-3 sm:space-y-4">
        {Array(targetSets).fill(null).map((_, setIndex) => {
          const setData = sets[setIndex]
          const isCompleted = setData?.completed || false
          
          return (
            <motion.div
              key={setIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: setIndex * 0.1 }}
              className={`border rounded-lg p-4 transition-all duration-300 ${
                isCompleted 
                  ? 'border-green-500 bg-green-900/20' 
                  : 'border-gray-700 bg-black/50'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    isCompleted 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-700 text-gray-300'
                  }`}>
                    {isCompleted ? '✓' : setIndex + 1}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <label className="text-gray-300 text-xs sm:text-sm font-medium">Reps:</label>
                        <input
                          ref={setIndex === sets.findIndex(set => !set.completed) ? firstIncompleteInputRef : undefined}
                          type="number"
                          value={setInputs[setIndex]?.reps || ''}
                          onChange={(e) => handleSetInputChange(setIndex, 'reps', e.target.value)}
                          onFocus={() => handleInputFocus(setIndex, 'reps')}
                          onBlur={() => handleInputBlur(setIndex, 'reps')}
                          onKeyDown={(e) => handleKeyNavigation(e, setIndex, 'reps')}
                          disabled={isCompleted}
                          placeholder={`${targetReps}`}
                          data-set={setIndex}
                          data-field="reps"
                          className={`w-14 sm:w-20 md:w-16 lg:w-14 px-1.5 sm:px-3 md:px-2 py-1 sm:py-2 md:py-1 bg-gray-800 border rounded text-white text-center text-xs sm:text-base md:text-sm min-h-[44px] sm:min-h-[48px] md:min-h-[44px] focus:ring-1 disabled:opacity-50 transition-colors ${
                            inputErrors[`${setIndex}-reps`] 
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                              : 'border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                          }`}
                          min="0"
                          max="999"
                        />
                      </div>
                      {inputErrors[`${setIndex}-reps`] && (
                        <span className="text-red-400 text-xs ml-12">{inputErrors[`${setIndex}-reps`]}</span>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <label className="text-gray-300 text-xs sm:text-sm font-medium">Weight:</label>
                        <input
                          type="number"
                          value={setInputs[setIndex]?.weight || ''}
                          onChange={(e) => handleSetInputChange(setIndex, 'weight', e.target.value)}
                          onFocus={() => handleInputFocus(setIndex, 'weight')}
                          onBlur={() => handleInputBlur(setIndex, 'weight')}
                          onKeyDown={(e) => handleKeyNavigation(e, setIndex, 'weight')}
                          disabled={isCompleted}
                          placeholder="lbs"
                          data-set={setIndex}
                          data-field="weight"
                          className={`w-16 sm:w-24 md:w-20 lg:w-16 px-1.5 sm:px-3 md:px-2 py-1 sm:py-2 md:py-1 bg-gray-800 border rounded text-white text-center text-xs sm:text-base md:text-sm min-h-[44px] sm:min-h-[48px] md:min-h-[44px] focus:ring-1 disabled:opacity-50 transition-colors ${
                            inputErrors[`${setIndex}-weight`] 
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                              : 'border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                          }`}
                          min="0"
                          max="9999"
                          step="0.5"
                        />
                        <span className="text-gray-400 text-xs">lbs</span>
                      </div>
                      {inputErrors[`${setIndex}-weight`] && (
                        <span className="text-red-400 text-xs ml-16">{inputErrors[`${setIndex}-weight`]}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isCompleted && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-2 text-green-400 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Complete</span>
                    </motion.div>
                  )}
                  
                  {!isCompleted && (
                    <button
                      onClick={() => handleCompleteSet(setIndex)}
                      className="px-3 py-1 sm:px-4 sm:py-3 md:px-3 md:py-1 bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base md:text-sm rounded transition-colors duration-200 flex items-center gap-1 min-h-[44px] sm:min-h-[48px] md:min-h-[44px]"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Complete Set
                    </button>
                  )}
                </div>
              </div>
              
              {/* Set Details */}
              {isCompleted && setData && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="flex gap-4 text-sm text-gray-400">
                    <span>✅ {setData.reps} reps</span>
                    {setData.weight && <span>🏋️ {setData.weight} lbs</span>}
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
      
      {/* Progress Summary */}
      <div className="mt-6 p-4 bg-black/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-300 text-sm">Progress</span>
          <span className="text-blue-400 text-sm font-medium">
            {sets.filter(set => set.completed).length}/{targetSets} sets
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-500 rounded-full h-2 transition-all duration-300"
            style={{ width: `${(sets.filter(set => set.completed).length / targetSets) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default SetTracker