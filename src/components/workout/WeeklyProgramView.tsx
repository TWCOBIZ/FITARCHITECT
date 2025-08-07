import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AIGeneratedPlan } from '../../contexts/WorkoutContext'
import { getExerciseImageWithFallback } from '../../utils/exerciseImages'

interface WeeklyProgramViewProps {
  activePlan: AIGeneratedPlan
  onStartWorkout: (workout: any) => void
  onStartSession: (workout: any) => void
}

interface WeekStructure {
  weekNumber: number
  days: DayStructure[]
}

interface DayStructure {
  dayNumber: number
  exercises: any[]
  name?: string
  description?: string
  isCompleted?: boolean
  completedAt?: Date
}

const WeeklyProgramView: React.FC<WeeklyProgramViewProps> = ({
  activePlan,
  onStartWorkout,
  onStartSession
}) => {
  const [selectedWeek, setSelectedWeek] = useState(0)
  const [selectedDay, setSelectedDay] = useState<DayStructure | null>(null)

  const weeks = activePlan.weeks || []
  const currentWeek = weeks[selectedWeek]

  const getDayOfWeek = (dayNumber: number) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return days[dayNumber - 1] || `Day ${dayNumber}`
  }

  const getWeekPhase = (weekIndex: number) => {
    if (weekIndex === 0) return { name: 'Foundation', color: 'from-blue-600 to-blue-700' }
    if (weekIndex === 1) return { name: 'Progression', color: 'from-purple-600 to-purple-700' }
    return { name: 'Peak', color: 'from-orange-600 to-orange-700' }
  }

  const getCompletedDaysInWeek = (week: WeekStructure) => {
    return week.days?.filter(day => day.isCompleted).length || 0
  }

  const getTotalWorkoutDays = (week: WeekStructure) => {
    return week.days?.filter(day => day.exercises && day.exercises.length > 0).length || 0
  }

  const createWorkoutFromDay = (day: DayStructure) => {
    return {
      id: `${activePlan.id}-week${selectedWeek + 1}-day${day.dayNumber}`,
      name: day.name || `Week ${selectedWeek + 1}, ${getDayOfWeek(day.dayNumber)}`,
      description: day.description || 'Generated workout',
      type: 'strength' as const,
      difficulty: activePlan.difficulty as any,
      duration: 45,
      exercises: day.exercises?.map((ex: any) => ({
        exercise: ex.exercise || ex,
        sets: ex.sets || 3,
        reps: ex.reps || 10,
        restTime: ex.restTime || ex.rest || 60,
        notes: ex.notes
      })) || [],
      targetMuscleGroups: activePlan.targetMuscleGroups as any,
      equipment: [],
      caloriesBurned: 0,
      createdAt: new Date(activePlan.createdAt),
      updatedAt: new Date(activePlan.updatedAt)
    }
  }

  if (!weeks || weeks.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <h3 className="text-xl font-bold text-white mb-4">No Program Structure</h3>
        <p className="text-gray-400">This plan doesn't have a weekly structure available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Program Header */}
      <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-6 md:p-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">{activePlan.name}</h2>
            <p className="text-gray-400 text-lg">{activePlan.description}</p>
          </div>
          <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl px-4 py-2">
            <span className="text-blue-400 font-semibold">{weeks.length} Weeks</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>• {activePlan.difficulty} Level</span>
          <span>• {activePlan.targetMuscleGroups?.join(', ') || 'Full Body'}</span>
          <span>• Progressive Overload</span>
        </div>
      </div>

      {/* Week Selection */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Program Timeline</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {weeks.map((week, index) => {
            const phase = getWeekPhase(index)
            const completedDays = getCompletedDaysInWeek(week)
            const totalDays = getTotalWorkoutDays(week)
            const isSelected = selectedWeek === index
            
            return (
              <motion.button
                key={index}
                onClick={() => setSelectedWeek(index)}
                className={`p-6 rounded-xl border-2 transition-all text-left hover:scale-[1.02] ${
                  isSelected
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-700 bg-black/50 hover:border-gray-600'
                }`}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${phase.color} flex items-center justify-center mb-4`}>
                  <span className="text-white font-bold text-lg">{index + 1}</span>
                </div>
                
                <h4 className="text-lg font-bold text-white mb-2">
                  Week {week.weekNumber || index + 1}
                </h4>
                <p className="text-sm text-gray-400 mb-3">{phase.name} Phase</p>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-800 rounded-full h-2">
                    <div 
                      className="bg-blue-500 rounded-full h-2 transition-all duration-300"
                      style={{ width: `${totalDays > 0 ? (completedDays / totalDays) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{completedDays}/{totalDays}</span>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Week Calendar View */}
      {currentWeek && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {/* Week Header */}
          <div className={`bg-gradient-to-r ${getWeekPhase(selectedWeek).color} p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  Week {currentWeek.weekNumber || selectedWeek + 1}
                </h3>
                <p className="text-white/80">
                  {getWeekPhase(selectedWeek).name} Phase • {getTotalWorkoutDays(currentWeek)} Workout Days
                </p>
              </div>
              <div className="bg-white/20 rounded-full px-4 py-2">
                <span className="text-white font-semibold">
                  {getCompletedDaysInWeek(currentWeek)}/{getTotalWorkoutDays(currentWeek)} Complete
                </span>
              </div>
            </div>
          </div>

          {/* Days Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentWeek.days?.map((day, dayIndex) => {
                const isWorkoutDay = day.exercises && day.exercises.length > 0
                const isRestDay = !isWorkoutDay
                const isCompleted = day.isCompleted
                
                if (isRestDay) {
                  return (
                    <div key={dayIndex} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
                      <div className="w-12 h-12 mx-auto mb-3 bg-gray-700 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-gray-400 mb-1">{getDayOfWeek(day.dayNumber)}</h4>
                      <p className="text-xs text-gray-500">Rest Day</p>
                    </div>
                  )
                }

                // Get first exercise for preview image
                const firstExercise = day.exercises[0]
                const exerciseData = firstExercise?.exercise || firstExercise
                
                // Clean exercise name for preview
                const exerciseName = ('name' in exerciseData ? exerciseData.name : exerciseData?.exercise?.name) || 'Workout'
                const previewExerciseName = exerciseName && 
                  !/^\d+x\/week|^accessory|running\/cycling|circuit.*training/i.test(exerciseName) 
                    ? exerciseName : 'Workout'
                
                const { imageUrl, gradient, icon: IconComponent } = getExerciseImageWithFallback(exerciseData)

                return (
                  <motion.div
                    key={dayIndex}
                    className={`bg-black border rounded-xl overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer group ${
                      isCompleted ? 'border-green-500/50' : 'border-gray-700'
                    }`}
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedDay(day)}
                  >
                    {/* Day Preview Image */}
                    <div className="relative h-32 overflow-hidden">
                      {imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt={previewExerciseName}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                          <div className="w-12 h-12 opacity-90">
                            <IconComponent />
                          </div>
                        </div>
                      )}
                      
                      {/* Completed Badge */}
                      {isCompleted && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}

                      {/* Day Number */}
                      <div className="absolute top-2 left-2 w-8 h-8 bg-black/80 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">{day.dayNumber}</span>
                      </div>
                    </div>

                    {/* Day Info */}
                    <div className="p-4">
                      <h4 className="font-bold text-white mb-1 truncate">
                        {day.name || getDayOfWeek(day.dayNumber)}
                      </h4>
                      <p className="text-gray-400 text-xs mb-3 line-clamp-2">
                        {`${day.exercises.length} exercises • Full workout session`}
                      </p>
                      
                      {/* Exercise Count & Duration */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="bg-blue-600/20 rounded-lg px-2 py-1">
                          <span className="text-blue-400 font-semibold">{day.exercises.length} exercises</span>
                        </div>
                        <span className="text-gray-500">~45 min</span>
                      </div>
                      
                      {/* Action Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const workout = createWorkoutFromDay(day)
                          onStartSession(workout)
                        }}
                        className="w-full mt-3 bg-white text-black font-bold py-3 rounded-xl text-sm hover:bg-gray-200 transition-colors duration-200"
                      >
                        {isCompleted ? 'Repeat Workout' : 'Start Workout'}
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Day Detail Modal */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedDay(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      {selectedDay.name || getDayOfWeek(selectedDay.dayNumber)}
                    </h3>
                    <p className="text-gray-400">Week {selectedWeek + 1} • {selectedDay.exercises.length} exercises</p>
                  </div>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Exercise List */}
              <div className="p-6">
                <div className="space-y-4 mb-6">
                  {selectedDay.exercises.map((exercise, exIndex) => {
                    // 🔧 DEPLOYMENT FIX: Improved exercise data extraction
                    const ex = exercise.exercise || exercise
                    
                    // Filter out plan descriptions that shouldn't be exercise names
                    const isValidExerciseName = (name: string) => {
                      if (!name) return false
                      const lowerName = name.toLowerCase()
                      // Filter out plan descriptions like '4x/week', 'Accessory', etc.
                      const invalidPatterns = [
                        /^\d+x\/week/,  // "3x/week", "4x/week"
                        /^accessory/i,  // "Accessory"
                        /^\d+x\/week.*split/i,  // "4x/week upper/lower split"
                        /^progressive.*overload/i,  // "Progressive overload"
                        /running\/cycling/i,  // "3x/week running/cycling"
                        /circuit.*training/i,  // "2x/week circuit training"
                        /mobility.*recovery/i   // "Mobility and recovery focus"
                      ]
                      return !invalidPatterns.some(pattern => pattern.test(name))
                    }
                    
                    // Get the best exercise name available
                    const exerciseName = 
                      (ex.name && isValidExerciseName(ex.name)) ? ex.name :
                      (exercise.name && isValidExerciseName(exercise.name)) ? exercise.name :
                      ex.exercise?.name || 'Exercise'
                    
                    const { imageUrl, gradient, icon: IconComponent } = getExerciseImageWithFallback(ex)
                    
                    // Determine workout phase based on exercise position and description
                    let phase = 'main'
                    const exerciseNameLower = exerciseName?.toLowerCase() || ''
                    const exerciseDesc = (ex.description || '').toLowerCase()
                    
                    // Check for warm-up indicators
                    if (exerciseDesc.includes('warm-up') || exerciseDesc.includes('warm up') || 
                        exerciseNameLower.includes('warm') || exIndex < 2) {
                      phase = 'warm-up'
                    } 
                    // Check for cool-down indicators
                    else if (exerciseDesc.includes('cool-down') || exerciseDesc.includes('cool down') || 
                             exerciseNameLower.includes('cool') || exerciseNameLower.includes('stretch') ||
                             exIndex >= selectedDay.exercises.length - 2) {
                      phase = 'cool-down'
                    }
                    
                    return (
                      <div key={exIndex} className="relative">
                        {/* Phase Header */}
                        {(exIndex === 0 || 
                          (exIndex === 2 && phase === 'main') || 
                          (exIndex === selectedDay.exercises.length - 2 && phase === 'cool-down')) && (
                          <div className="mb-3 flex items-center gap-2">
                            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              phase === 'warm-up' ? 'bg-yellow-600/20 text-yellow-400' :
                              phase === 'cool-down' ? 'bg-blue-600/20 text-blue-400' :
                              'bg-green-600/20 text-green-400'
                            }`}>
                              {phase === 'warm-up' ? '🔥 Warm-up' :
                               phase === 'cool-down' ? '🧘 Cool-down' :
                               '💪 Main Workout'}
                            </div>
                          </div>
                        )}
                        
                        <div className="bg-black border border-gray-700 rounded-xl p-4 flex items-center gap-4">
                          {/* Exercise Image */}
                          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            {imageUrl ? (
                              <img src={imageUrl} alt={exerciseName} className="w-full h-full object-cover" />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                                <div className="w-8 h-8 opacity-90">
                                  <IconComponent />
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Exercise Info */}
                          <div className="flex-1">
                            <h4 className="font-semibold text-white mb-1">{exerciseName}</h4>
                            <p className="text-gray-400 text-sm">
                              {exercise.sets || 3} sets × {exercise.reps || 10} reps • {exercise.restTime || exercise.rest || 60}s rest
                            </p>
                            {exercise.notes && (
                              <p className="text-gray-500 text-xs mt-1">{exercise.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      const workout = createWorkoutFromDay(selectedDay)
                      onStartSession(workout)
                      setSelectedDay(null)
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-colors duration-200"
                  >
                    Start Full Workout Session
                  </button>
                  <button
                    onClick={() => {
                      const workout = createWorkoutFromDay(selectedDay)
                      onStartWorkout(workout)
                      setSelectedDay(null)
                    }}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Quick Track Mode
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default WeeklyProgramView