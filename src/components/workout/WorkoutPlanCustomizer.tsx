import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { WorkoutPlan, Workout, Exercise, WorkoutExercise, workoutPlanUtils } from '../../types/workout'
import { wgerService } from '../../services/wgerService'
import { InlineLoader } from '../common/LoadingOverlay'
import ActionButton from '../common/ActionButton'

interface WorkoutPlanCustomizerProps {
  plan: WorkoutPlan
  onSave: (updatedPlan: WorkoutPlan) => void
  onCancel: () => void
}

const WorkoutPlanCustomizer: React.FC<WorkoutPlanCustomizerProps> = ({
  plan,
  onSave,
  onCancel
}) => {
  const [editedPlan, setEditedPlan] = useState<WorkoutPlan>(workoutPlanUtils.ensureWeeksStructure(plan))
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('')
  const [isSearching, setIsSearching] = useState(false)
  const [name, setName] = useState(plan.name || '')
  const [description, setDescription] = useState(plan.description || '')
  const [duration, setDuration] = useState(plan.duration || 3)
  // const [daysPerWeek, setDaysPerWeek] = useState(3)

  useEffect(() => {
    const fetchExercises = async () => {
      if (searchQuery || selectedMuscleGroup) {
        setIsSearching(true)
        try {
          const wgerExercises = await wgerService.fetchExercises({})
          // Convert WGER exercises to our Exercise type
          const convertedExercises: Exercise[] = wgerExercises.map((ex: any) => ({
            id: String(ex.id),
            name: ex.name,
            description: ex.description || '',
            muscleGroups: ex.muscles || ['fullBody'],
            equipment: ex.equipment || ['bodyweight'],
            difficulty: 'intermediate' as const,
            instructions: ex.instructions || []
          }))
          setAvailableExercises(convertedExercises)
        } catch (error) {
          console.error('Error fetching exercises:', error)
        } finally {
          setIsSearching(false)
        }
      } else {
        setAvailableExercises([])
      }
    }

    fetchExercises()
  }, [searchQuery, selectedMuscleGroup])

  const handleWorkoutUpdate = (workoutId: string, updates: Partial<Workout>) => {
    setEditedPlan(prev => {
      // Extract week and day numbers from workoutId (format: week-X-day-Y)
      const match = workoutId.match(/week-(\d+)-day-(\d+)/)
      if (match && prev.weeks) {
        const weekNum = parseInt(match[1])
        const dayNum = parseInt(match[2])
        
        const updatedWeeks = prev.weeks.map(week => {
          if (week.weekNumber === weekNum) {
            return {
              ...week,
              days: week.days.map(day => {
                if (day.dayNumber === dayNum) {
                  return {
                    ...day,
                    name: updates.name || day.name,
                    description: updates.description || day.description,
                    type: updates.type || day.type,
                    difficulty: updates.difficulty || day.difficulty,
                    duration: updates.duration || day.duration
                  }
                }
                return day
              })
            }
          }
          return week
        })
        
        return {
          ...prev,
          weeks: updatedWeeks,
          workouts: prev.workouts // Keep for compatibility
        }
      }
      
      // Fallback to workouts array if weeks structure not available
      return {
        ...prev,
        workouts: prev.workouts?.map(workout =>
          workout.id === workoutId ? { ...workout, ...updates } : workout
        ) || []
      }
    })
  }

  const handleExerciseUpdate = (
    workoutId: string,
    exerciseIndex: number,
    updates: Partial<WorkoutExercise>
  ) => {
    setEditedPlan(prev => {
      // Extract week and day numbers from workoutId (format: week-X-day-Y)
      const match = workoutId.match(/week-(\d+)-day-(\d+)/)
      if (match && prev.weeks) {
        const weekNum = parseInt(match[1])
        const dayNum = parseInt(match[2])
        
        const updatedWeeks = prev.weeks.map(week => {
          if (week.weekNumber === weekNum) {
            return {
              ...week,
              days: week.days.map(day => {
                if (day.dayNumber === dayNum) {
                  return {
                    ...day,
                    exercises: day.exercises.map((workoutExercise, index) =>
                      index === exerciseIndex ? { ...workoutExercise, ...updates } : workoutExercise
                    )
                  }
                }
                return day
              })
            }
          }
          return week
        })
        
        return {
          ...prev,
          weeks: updatedWeeks,
          workouts: prev.workouts // Keep for compatibility
        }
      }
      
      // Fallback to workouts array
      return {
        ...prev,
        workouts: prev.workouts?.map(workout =>
          workout.id === workoutId
            ? {
                ...workout,
                exercises: workout.exercises.map((workoutExercise, index) =>
                  index === exerciseIndex ? { ...workoutExercise, ...updates } : workoutExercise
                )
              }
            : workout
        ) || []
      }
    })
  }

  const handleAddExercise = (workoutId: string, exercise: Exercise) => {
    const newWorkoutExercise: WorkoutExercise = {
      exercise,
      sets: 3,
      reps: 10,
      restTime: 60
    }
    setEditedPlan(prev => ({
      ...prev,
      workouts: prev.workouts?.map(workout =>
        workout.id === workoutId
          ? {
              ...workout,
              exercises: [...workout.exercises, newWorkoutExercise]
            }
          : workout
      ) || []
    }))
  }

  const handleRemoveExercise = (workoutId: string, exerciseIndex: number) => {
    setEditedPlan(prev => ({
      ...prev,
      workouts: prev.workouts?.map(workout =>
        workout.id === workoutId
          ? {
              ...workout,
              exercises: workout.exercises.filter((_, index) => index !== exerciseIndex)
            }
          : workout
      ) || []
    }))
  }

  const handleSave = () => {
    onSave({
      ...plan,
      name,
      description,
      duration,
      workouts: editedPlan.workouts
    })
  }

  // Convert weeks structure to workouts for display (using utility function)
  const workoutsToDisplay = editedPlan.weeks && editedPlan.weeks.length > 0 ? 
    workoutPlanUtils.convertWeeksToWorkouts(editedPlan.weeks) :
    editedPlan.workouts || [];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">🎯 Customize Workout Plan</h2>
            <div className="flex space-x-4">
              <ActionButton
                onClick={onCancel}
                variant="ghost"
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </ActionButton>
              <ActionButton
                onClick={handleSave}
                variant="primary"
                className="font-semibold"
              >
                Save Changes
              </ActionButton>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Plan Configuration */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Plan Name</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter plan name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Duration (weeks)</label>
              <input
                type="number"
                min={1}
                max={12}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your workout plan"
            />
          </div>

          {/* Workouts Section */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">📅 Workout Schedule</h3>
            <p className="text-gray-400 mb-6">Customize your {workoutsToDisplay.length} workouts with real exercises</p>
          </div>

          {workoutsToDisplay && workoutsToDisplay.map((workout, workoutIndex) => (
            <motion.div
              key={workout.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: workoutIndex * 0.1 }}
              className="bg-gray-800 border border-gray-700 rounded-xl p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{workout.name}</h3>
                  <p className="text-sm text-gray-400">{workout.description}</p>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={workout.duration}
                    onChange={e => handleWorkoutUpdate(workout.id, { duration: Number(e.target.value) })}
                    className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500"
                    placeholder="Duration"
                  />
                  <select
                    value={workout.difficulty}
                    onChange={e => handleWorkoutUpdate(workout.id, { difficulty: e.target.value as 'beginner' | 'intermediate' | 'advanced' })}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {workout.exercises.map((workoutExercise: WorkoutExercise, exerciseIndex: number) => (
                  <div
                    key={exerciseIndex}
                    className="bg-gray-700 border border-gray-600 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex-1 flex items-center gap-4">
                      <div className="relative w-12 h-12 rounded overflow-hidden bg-gray-200">
                        {/* Exercise type placeholder */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        {/* Real image overlay */}
                        {workoutExercise.exercise.imageUrl && (
                          <img 
                            src={workoutExercise.exercise.imageUrl} 
                            alt={workoutExercise.exercise.name} 
                            className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300"
                            onLoad={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.opacity = '1';
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white">
                          {workoutExercise.exercise?.name || 'Unknown Exercise'}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {workoutExercise.exercise?.muscleGroups?.join(', ') || 'Full body'}
                        </p>
                        <div className="flex space-x-4 mt-2">
                          <input
                            type="number"
                            value={workoutExercise.sets === 0 ? '' : workoutExercise.sets}
                            onChange={e =>
                              handleExerciseUpdate(workout.id, exerciseIndex, {
                                sets: Number(e.target.value) || 0
                              })
                            }
                            onFocus={(e) => {
                              if (workoutExercise.sets === 0) {
                                e.target.value = ''
                              }
                            }}
                            className="w-20 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 min-h-[44px]"
                            placeholder="Sets"
                            min="0"
                            max="99"
                          />
                          <input
                            type="number"
                            value={workoutExercise.reps === 0 ? '' : workoutExercise.reps}
                            onChange={e =>
                              handleExerciseUpdate(workout.id, exerciseIndex, {
                                reps: Number(e.target.value) || 0
                              })
                            }
                            onFocus={(e) => {
                              if (workoutExercise.reps === 0) {
                                e.target.value = ''
                              }
                            }}
                            className="w-20 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 min-h-[44px]"
                            placeholder="Reps"
                            min="0"
                            max="999"
                          />
                          <input
                            type="number"
                            value={workoutExercise.restTime === 0 ? '' : workoutExercise.restTime}
                            onChange={e =>
                              handleExerciseUpdate(workout.id, exerciseIndex, {
                                restTime: Number(e.target.value) || 0
                              })
                            }
                            onFocus={(e) => {
                              if (workoutExercise.restTime === 0) {
                                e.target.value = ''
                              }
                            }}
                            className="w-20 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 min-h-[44px]"
                            placeholder="Rest (s)"
                            min="0"
                            max="9999"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveExercise(workout.id, exerciseIndex)}
                      className="text-red-400 hover:text-red-300 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <div className="mt-4">
                  <div className="flex space-x-4 mb-4">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search exercises..."
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500"
                    />
                    <select
                      value={selectedMuscleGroup}
                      onChange={e => setSelectedMuscleGroup(e.target.value)}
                      className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500"
                    >
                      <option value="">All Muscle Groups</option>
                      <option value="chest">Chest</option>
                      <option value="back">Back</option>
                      <option value="legs">Legs</option>
                      <option value="shoulders">Shoulders</option>
                      <option value="arms">Arms</option>
                      <option value="core">Core</option>
                    </select>
                  </div>

                  {isSearching ? (
                    <div className="py-8 flex justify-center">
                      <InlineLoader message="Searching exercises..." />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableExercises && availableExercises.map(exercise => (
                        <div
                          key={exercise.id}
                          className="bg-gray-700 border border-gray-600 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors"
                          onClick={() => handleAddExercise(workout.id, exercise)}
                        >
                          <h4 className="font-medium text-white">{exercise.name}</h4>
                          <p className="text-sm text-gray-400 mt-1">{exercise.description}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {exercise.muscleGroups && exercise.muscleGroups.map(muscle => (
                              <span
                                key={muscle}
                                className="px-2 py-1 bg-gray-600 text-gray-300 rounded-full text-xs"
                              >
                                {muscle}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default WorkoutPlanCustomizer 