import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkout } from '../../contexts/WorkoutContext'
import ExerciseDetails from './ExerciseDetails'
import { Exercise } from '../../types/workout'

const WorkoutTracker: React.FC = () => {
  const { currentWorkout, completeWorkout } = useWorkout()
  const [workoutNotes, setWorkoutNotes] = useState('')
  const [workoutRating, setWorkoutRating] = useState(0)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [showExerciseDetails, setShowExerciseDetails] = useState(false)

  if (!currentWorkout) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Active Workout</h2>
        <p className="text-gray-600 mb-6">Start a workout from your current plan to begin tracking.</p>
      </div>
    )
  }

  const handleCompleteWorkout = () => {
    if (currentWorkout) {
      completeWorkout(workoutNotes, workoutRating)
    }
  }

  const handleExerciseClick = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setShowExerciseDetails(true)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{currentWorkout.name}</h2>
        
        <div className="space-y-6">
          {currentWorkout.exercises.map((exercise, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-50 rounded-lg p-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{exercise.name}</h3>
                  <p className="text-sm text-gray-600">{exercise.description}</p>
                </div>
                <button
                  onClick={() => handleExerciseClick(exercise)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Details
                </button>
              </div>
              
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-600">Sets</p>
                  <p className="text-lg font-semibold text-gray-900">{exercise.sets}</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-600">Reps</p>
                  <p className="text-lg font-semibold text-gray-900">{exercise.reps}</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-600">Rest</p>
                  <p className="text-lg font-semibold text-gray-900">{exercise.restTime}s</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 space-y-4">
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Workout Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={workoutNotes}
              onChange={(e) => setWorkoutNotes(e.target.value)}
              placeholder="How was your workout? Any challenges or achievements?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rate Your Workout
            </label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setWorkoutRating(rating)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    workoutRating >= rating
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCompleteWorkout}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Complete Workout
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showExerciseDetails && selectedExercise && (
          <ExerciseDetails
            exercise={selectedExercise}
            onClose={() => {
              setShowExerciseDetails(false)
              setSelectedExercise(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default WorkoutTracker 