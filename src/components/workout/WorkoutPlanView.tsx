import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WorkoutPlan, WorkoutLog } from '../../types/workout'
import { workoutService } from '../../services/workoutService'
import { UserProfile } from '../../types/user'
import ExerciseCard from './ExerciseCard'

interface WorkoutPlanViewProps {
  userProfile: UserProfile
}

const WorkoutPlanView: React.FC<WorkoutPlanViewProps> = ({ userProfile }) => {
  const [currentPlan, setCurrentPlan] = useState<WorkoutPlan | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null)
  const [workoutNotes, setWorkoutNotes] = useState('')
  const [workoutRating, setWorkoutRating] = useState(0)
  const [showTips, setShowTips] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState(0)

  useEffect(() => {
    const plan = workoutService.getCurrentPlan()
    setCurrentPlan(plan)
  }, [])

  const handleGeneratePlan = async () => {
    setIsGenerating(true)
    try {
      const plan = await workoutService.generateWorkoutPlan(userProfile)
      setCurrentPlan(plan)
    } catch (error) {
      console.error('Error generating plan:', error)
      alert('Failed to generate workout plan. Please try again.')
    }
    setIsGenerating(false)
  }

  const handleEndPlan = () => {
    if (window.confirm('Are you sure you want to end this workout plan?')) {
      workoutService.endCurrentPlan()
      setCurrentPlan(null)
    }
  }

  const handleCompleteWorkout = (workoutId: string) => {
    const workout = currentPlan?.workouts.find(w => w.id === workoutId)
    if (!workout) return

    const exercises = workout.exercises.map(ex => ({
      exerciseId: ex.exercise.id,
      sets: ex.sets.map(set => ({
        reps: set.reps,
        weight: set.weight,
        completed: true
      }))
    }))

    workoutService.logWorkout(workoutId, exercises, workoutNotes)
    setWorkoutNotes('')
    setWorkoutRating(0)
    setSelectedWorkout(null)
  }

  const renderWorkoutTips = (workoutId: string) => {
    const tips = workoutService.getWorkoutTips(workoutId)
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 p-4 bg-blue-50 rounded-lg"
      >
        <h3 className="text-lg font-semibold mb-2">Workout Tips</h3>
        <ul className="space-y-2">
          {tips.map((tip, index) => (
            <li key={index} className="text-sm text-gray-700">{tip}</li>
          ))}
        </ul>
      </motion.div>
    )
  }

  if (!currentPlan) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">Your Workout Plan</h2>
        <div className="text-center py-12">
          <p className="text-gray-600 mb-6">You don't have an active workout plan.</p>
          <button
            onClick={handleGeneratePlan}
            disabled={isGenerating}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isGenerating ? 'Generating Plan...' : 'Generate New Workout Plan'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Your Workout Plan</h2>
        <button
          onClick={handleEndPlan}
          className="px-4 py-2 text-red-600 hover:text-red-700"
        >
          End Plan
        </button>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">{currentPlan.name}</h3>
        <p className="text-gray-600">{currentPlan.description}</p>
      </div>

      {currentPlan.weeks && currentPlan.weeks.length > 0 && (
        <div className="flex gap-2 mb-4">
          {currentPlan.weeks.map((w, i) => (
            <button
              key={i}
              className={`px-3 py-1 rounded ${selectedWeek === i ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setSelectedWeek(i)}
            >
              Week {w.week || i + 1}
            </button>
          ))}
        </div>
      )}

      {currentPlan.weeks && currentPlan.weeks[selectedWeek]?.days.map(day => (
        <div key={day.day} className="mb-6">
          <h4 className="font-semibold mb-2">Day {day.day}</h4>
          {day.exercises.map((ex, idx) => (
            <ExerciseCard key={idx} exercise={ex} />
          ))}
          {day.exercises.some(ex => ex.progression) && (
            <div className="mt-2 text-sm text-blue-700">Progression: {day.exercises.map(ex => ex.progression).filter(Boolean).join('; ')}</div>
          )}
        </div>
      ))}

      <div className="space-y-6">
        {currentPlan.workouts.map(workout => (
          <motion.div
            key={workout.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border rounded-lg p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-semibold">{workout.name}</h4>
                <p className="text-sm text-gray-600">{workout.description}</p>
              </div>
              <button
                onClick={() => setShowTips(!showTips)}
                className="text-blue-600 hover:text-blue-700"
              >
                {showTips ? 'Hide Tips' : 'Show Tips'}
              </button>
            </div>

            {showTips && renderWorkoutTips(workout.id)}

            <div className="mt-4">
              <h5 className="font-medium mb-2">Exercises:</h5>
              <ul className="space-y-3">
                {workout.exercises.map(exercise => (
                  <li key={exercise.exercise.id} className="text-sm">
                    <span className="font-medium">{exercise.exercise.name}</span>
                    <span className="text-gray-600">
                      {' '}- {exercise.sets.length} sets × {exercise.sets[0].reps} reps
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {selectedWorkout === workout.id ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 space-y-4"
              >
                <textarea
                  value={workoutNotes}
                  onChange={e => setWorkoutNotes(e.target.value)}
                  placeholder="Add notes about your workout..."
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                />
                <div className="flex items-center space-x-2">
                  <span className="text-sm">Rate your workout:</span>
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => setWorkoutRating(rating)}
                      className={`w-8 h-8 rounded-full ${
                        workoutRating >= rating ? 'bg-yellow-400' : 'bg-gray-200'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setSelectedWorkout(null)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleCompleteWorkout(workout.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Complete Workout
                  </button>
                </div>
              </motion.div>
            ) : (
              <button
                onClick={() => setSelectedWorkout(workout.id)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Start Workout
              </button>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Your Progress</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Completed Workouts</p>
            <p className="text-2xl font-bold">
              {workoutService.getProgress().completedWorkouts} / {workoutService.getProgress().totalWorkouts}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Current Streak</p>
            <p className="text-2xl font-bold">{workoutService.getProgress().streak} days</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkoutPlanView 