import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { WorkoutPlan, Workout, Exercise, WorkoutExercise, WorkoutType } from '../../types/workout'
import { wgerService } from '../../services/wgerService'

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
  const [editedPlan, setEditedPlan] = useState<WorkoutPlan>(plan)
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('')
  const [isSearching, setIsSearching] = useState(false)
  const [name, setName] = useState(plan.title || plan.name || '')
  const [description, setDescription] = useState(plan.description || '')
  const [duration, setDuration] = useState(plan.weeks || plan.duration || 3)
  const [daysPerWeek, setDaysPerWeek] = useState(3)

  useEffect(() => {
    const fetchExercises = async () => {
      if (searchQuery || selectedMuscleGroup) {
        setIsSearching(true)
        try {
          const exercises = await wgerService.searchExercises(searchQuery, selectedMuscleGroup)
          setAvailableExercises(exercises)
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
    setEditedPlan(prev => ({
      ...prev,
      workouts: prev.workouts.map(workout =>
        workout.id === workoutId ? { ...workout, ...updates } : workout
      )
    }))
  }

  const handleExerciseUpdate = (
    workoutId: string,
    exerciseIndex: number,
    updates: Partial<WorkoutExercise>
  ) => {
    setEditedPlan(prev => ({
      ...prev,
      workouts: prev.workouts.map(workout =>
        workout.id === workoutId
          ? {
              ...workout,
              exercises: workout.exercises.map((workoutExercise, index) =>
                index === exerciseIndex ? { ...workoutExercise, ...updates } : workoutExercise
              )
            }
          : workout
      )
    }))
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
      workouts: prev.workouts.map(workout =>
        workout.id === workoutId
          ? {
              ...workout,
              exercises: [...workout.exercises, newWorkoutExercise]
            }
          : workout
      )
    }))
  }

  const handleRemoveExercise = (workoutId: string, exerciseIndex: number) => {
    setEditedPlan(prev => ({
      ...prev,
      workouts: prev.workouts.map(workout =>
        workout.id === workoutId
          ? {
              ...workout,
              exercises: workout.exercises.filter((_, index) => index !== exerciseIndex)
            }
          : workout
      )
    }))
  }

  const handleSave = () => {
    onSave({
      ...plan,
      name,
      description,
      duration,
      daysPerWeek,
      workouts: editedPlan.workouts
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Customize Workout Plan</h2>
          <div className="flex space-x-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>

        <div className="space-y-8">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Plan Name</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Duration (weeks)</label>
            <input
              type="number"
              min={1}
              max={12}
              className="w-full border rounded px-3 py-2"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Days per Week</label>
            <input
              type="number"
              min={1}
              max={7}
              className="w-full border rounded px-3 py-2"
              value={daysPerWeek}
              onChange={e => setDaysPerWeek(Number(e.target.value))}
            />
          </div>

          {editedPlan.workouts.map((workout, workoutIndex) => (
            <motion.div
              key={workout.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: workoutIndex * 0.1 }}
              className="bg-gray-50 rounded-lg p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{workout.name}</h3>
                  <p className="text-sm text-gray-600">{workout.description}</p>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={workout.duration}
                    onChange={e => handleWorkoutUpdate(workout.id, { duration: Number(e.target.value) })}
                    className="w-20 px-3 py-2 border rounded-lg"
                    placeholder="Duration"
                  />
                  <select
                    value={workout.difficulty}
                    onChange={e => handleWorkoutUpdate(workout.id, { difficulty: e.target.value as 'beginner' | 'intermediate' | 'advanced' })}
                    className="px-3 py-2 border rounded-lg"
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
                    className="bg-white rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex-1 flex items-center gap-4">
                      {workoutExercise.exercise.imageUrl && (
                        <img src={workoutExercise.exercise.imageUrl} alt={workoutExercise.exercise.name} className="w-12 h-12 object-cover rounded" />
                      )}
                      <div>
                        <h4 className="font-medium text-gray-900">{workoutExercise.exercise.name}</h4>
                        <div className="flex space-x-4 mt-2">
                          <input
                            type="number"
                            value={workoutExercise.sets}
                            onChange={e =>
                              handleExerciseUpdate(workout.id, exerciseIndex, {
                                sets: Number(e.target.value)
                              })
                            }
                            className="w-20 px-3 py-2 border rounded-lg"
                            placeholder="Sets"
                          />
                          <input
                            type="number"
                            value={workoutExercise.reps}
                            onChange={e =>
                              handleExerciseUpdate(workout.id, exerciseIndex, {
                                reps: Number(e.target.value)
                              })
                            }
                            className="w-20 px-3 py-2 border rounded-lg"
                            placeholder="Reps"
                          />
                          <input
                            type="number"
                            value={workoutExercise.restTime}
                            onChange={e =>
                              handleExerciseUpdate(workout.id, exerciseIndex, {
                                restTime: Number(e.target.value)
                              })
                            }
                            className="w-20 px-3 py-2 border rounded-lg"
                            placeholder="Rest (s)"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveExercise(workout.id, exerciseIndex)}
                      className="text-red-600 hover:text-red-800"
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
                      className="flex-1 px-4 py-2 border rounded-lg"
                    />
                    <select
                      value={selectedMuscleGroup}
                      onChange={e => setSelectedMuscleGroup(e.target.value)}
                      className="px-4 py-2 border rounded-lg"
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
                    <div className="text-center py-4">
                      <p className="text-gray-600">Searching exercises...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableExercises.map(exercise => (
                        <div
                          key={exercise.id}
                          className="bg-white rounded-lg p-4 border hover:border-blue-500 cursor-pointer"
                          onClick={() => handleAddExercise(workout.id, exercise)}
                        >
                          <h4 className="font-medium text-gray-900">{exercise.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{exercise.description}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {exercise.muscleGroups.map(muscle => (
                              <span
                                key={muscle}
                                className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
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