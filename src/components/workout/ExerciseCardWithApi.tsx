import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { logger } from '../../utils/logger'
import { useExerciseFallback, ExerciseGif } from './ExerciseFallbackProvider'

// Exercise card props interface
interface ExerciseCardProps {
  exercise: any
  sets?: number
  reps?: number | string
  restTime?: number
  notes?: string
  onClick?: () => void
  showDetails?: boolean
  exerciseProgress?: any
}

// Difficulty colors for exercise badges
const difficultyColors = {
  beginner: 'bg-green-600',
  intermediate: 'bg-yellow-600',
  advanced: 'bg-red-600'
}

const ExerciseCardWithApi: React.FC<ExerciseCardProps> = ({
  exercise,
  sets = 3,
  reps = 10,
  restTime = 60,
  notes,
  onClick,
  showDetails = true,
  exerciseProgress = null // Add progress prop for set completion tracking
}) => {
  const [hasError, setHasError] = useState(false)
  const exerciseData = exercise.exercise || exercise
  const { isInitialized } = useExerciseFallback()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-black border border-gray-800 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl ${
        onClick ? 'cursor-pointer hover:scale-[1.02]' : ''
      }`}
      onClick={onClick}
    >
      {/* Exercise Visual Demonstration */}
      <div className="relative h-48 sm:h-64 md:h-72 overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700">
        {isInitialized ? (
          <ExerciseGif
            exerciseName={exerciseData.name}
            className="w-full h-full object-contain bg-black"
            onLoad={() => setHasError(false)}
            onError={(error) => {
              logger.workout.debug(`No visual demonstration available for ${exerciseData.name}:`, error)
              setHasError(true)
            }}
            showLoadingSpinner={true}
          />
        ) : (
          // Loading state while exercise fallback system initializes
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-700 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-white text-center">
              <div className="text-sm font-medium">Loading Exercise...</div>
              <div className="text-xs opacity-90 mt-1">
                {exerciseData.muscleGroups?.[0] || exerciseData.target || 'Exercise'}
              </div>
            </div>
          </div>
        )}

        {/* Difficulty Badge */}
        {exerciseData.difficulty && (
          <div className="absolute top-3 left-3">
            <span className={`${difficultyColors[exerciseData.difficulty as keyof typeof difficultyColors]} text-white text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide`}>
              {exerciseData.difficulty}
            </span>
          </div>
        )}

      </div>

      {/* Exercise Details */}
      <div className="p-4 sm:p-5 lg:p-6">
        {/* Exercise Name */}
        <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3 leading-tight">
          {exerciseData.name || 'Exercise'}
        </h3>

        {/* Muscle Groups Tags */}
        {exerciseData.muscleGroups && exerciseData.muscleGroups.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {exerciseData.muscleGroups.slice(0, 3).map((muscle: string, index: number) => (
              <span 
                key={index}
                className="bg-blue-600/20 text-blue-400 text-xs font-medium px-2 py-1 rounded-full border border-blue-500/30"
              >
                {muscle}
              </span>
            ))}
          </div>
        )}

        {/* Sets & Reps - Nike Training Club Style */}
        <div className="mb-4">
          <div className="text-3xl font-black text-white mb-1 tracking-tight">
            {sets} × {reps}
          </div>
          <div className="text-gray-400 text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {restTime}s rest
          </div>
        </div>

        {/* Exercise Description */}
        {showDetails && exerciseData.description && exerciseData.description.trim() !== '' && (
          <div className="mb-4">
            {/* Enhanced description from ChatGPT (with formatting) */}
            {exerciseData.description.includes('**') || exerciseData.description.includes('🎯') ? (
              <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                {exerciseData.description.split('\n').map((line: string, index: number) => {
                  // Handle markdown-style formatting from ChatGPT
                  if (line.includes('**')) {
                    const parts = line.split('**');
                    return (
                      <div key={index} className="mb-1">
                        {parts.map((part, i) => 
                          i % 2 === 1 ? <strong key={i} className="text-blue-400">{part}</strong> : part
                        )}
                      </div>
                    );
                  }
                  return line.trim() && <div key={index} className="mb-1">{line}</div>;
                }).filter(Boolean)}
              </div>
            ) : (
              /* Basic description */
              <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
                {exerciseData.description}
              </p>
            )}
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-yellow-300 text-sm">
                {notes}
              </p>
            </div>
          </div>
        )}

        {/* Set Progress Indicators */}
        {exerciseProgress && exerciseProgress.sets && exerciseProgress.sets.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                Set Progress
              </h4>
              <span className="text-blue-400 text-xs font-medium">
                {exerciseProgress.sets.filter(set => set.completed).length}/{exerciseProgress.sets.length} complete
              </span>
            </div>
            <div className="flex gap-2">
              {exerciseProgress.sets.map((set, index) => (
                <div
                  key={index}
                  className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                    set.completed 
                      ? 'bg-green-500 shadow-sm shadow-green-500/50' 
                      : 'bg-gray-700'
                  }`}
                  title={set.completed ? `Set ${index + 1}: ${set.reps} reps${set.weight ? ` @ ${set.weight}lbs` : ''}` : `Set ${index + 1}: Not completed`}
                />
              ))}
            </div>
            
            {/* Show completion status with visual feedback */}
            {exerciseProgress.completed && (
              <div className="flex items-center gap-2 mt-3 p-2 bg-green-900/30 border border-green-500/30 rounded-lg">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-400 text-sm font-medium">Exercise Complete!</span>
              </div>
            )}
          </div>
        )}

        {/* Instructions Preview */}
        {showDetails && exerciseData.instructions && exerciseData.instructions.length > 0 && (
          <div className="border-t border-gray-800 pt-4">
            <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Form Tips
            </h4>
            <ul className="space-y-1">
              {exerciseData.instructions.map((instruction: string, index: number) => (
                <li key={index} className="text-gray-400 text-xs flex items-start gap-2">
                  <span className="text-blue-400 flex-shrink-0">•</span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default ExerciseCardWithApi