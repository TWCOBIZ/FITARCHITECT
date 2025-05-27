import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useWorkout } from '../../contexts/WorkoutContext'
import { WorkoutLog } from '../../types/workout'

interface WorkoutSummaryProps {
  workoutLog: WorkoutLog
  onClose: () => void
}

const WorkoutSummary: React.FC<WorkoutSummaryProps> = ({ workoutLog, onClose }) => {
  const [achievements, setAchievements] = useState<string[]>([])
  const [performanceFeedback, setPerformanceFeedback] = useState<string[]>([])

  useEffect(() => {
    // Calculate achievements
    const newAchievements: string[] = []
    const newFeedback: string[] = []

    // Volume achievement
    const totalVolume = workoutLog.exercises.reduce((total, exercise) => {
      return total + exercise.sets.reduce((setTotal, set) => {
        return setTotal + (set.weight * set.reps)
      }, 0)
    }, 0)

    if (totalVolume > 10000) {
      newAchievements.push('Volume Master: Lifted over 10,000 lbs in a single workout!')
    }

    // Consistency achievement
    const completedSets = workoutLog.exercises.reduce((total, exercise) => {
      return total + exercise.sets.filter(set => set.completed).length
    }, 0)
    const totalSets = workoutLog.exercises.reduce((total, exercise) => {
      return total + exercise.sets.length
    }, 0)

    if (completedSets === totalSets) {
      newAchievements.push('Perfect Completion: Completed all sets in the workout!')
    }

    // Performance feedback
    if (workoutLog.rating >= 4) {
      newFeedback.push('Excellent workout! Your form and intensity were on point.')
    } else if (workoutLog.rating >= 3) {
      newFeedback.push('Good effort! Consider pushing a bit harder next time.')
    } else {
      newFeedback.push('Keep going! Every workout is a step towards your goals.')
    }

    // Duration feedback
    if (workoutLog.duration < 30) {
      newFeedback.push('Quick and efficient workout! Great for busy days.')
    } else if (workoutLog.duration > 90) {
      newFeedback.push('Long and thorough session! Make sure to get enough rest.')
    }

    setAchievements(newAchievements)
    setPerformanceFeedback(newFeedback)
  }, [workoutLog])

  const calculateWorkoutStats = () => {
    const totalExercises = workoutLog.exercises.length
    const totalSets = workoutLog.exercises.reduce((total, exercise) => total + exercise.sets.length, 0)
    const totalReps = workoutLog.exercises.reduce((total, exercise) => {
      return total + exercise.sets.reduce((setTotal, set) => setTotal + set.reps, 0)
    }, 0)
    const totalVolume = workoutLog.exercises.reduce((total, exercise) => {
      return total + exercise.sets.reduce((setTotal, set) => {
        return setTotal + (set.weight * set.reps)
      }, 0)
    }, 0)

    return {
      totalExercises,
      totalSets,
      totalReps,
      totalVolume
    }
  }

  const stats = calculateWorkoutStats()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="min-h-screen px-4 text-center">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

        <div className="inline-block w-full max-w-4xl p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Workout Summary</h2>
              <p className="text-gray-600">
                {new Date(workoutLog.date).toLocaleDateString()} at{' '}
                {new Date(workoutLog.date).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Exercises</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.totalExercises}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-900 mb-2">Sets</h3>
              <p className="text-3xl font-bold text-green-600">{stats.totalSets}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">Reps</h3>
              <p className="text-3xl font-bold text-purple-600">{stats.totalReps}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-orange-900 mb-2">Volume</h3>
              <p className="text-3xl font-bold text-orange-600">
                {stats.totalVolume.toLocaleString()} lbs
              </p>
            </div>
          </div>

          {achievements.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Achievements Unlocked</h3>
              <div className="space-y-3">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-yellow-50 rounded-lg p-4 flex items-center"
                  >
                    <svg
                      className="h-6 w-6 text-yellow-600 mr-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                    <p className="text-yellow-800">{achievement}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Performance Feedback</h3>
            <div className="space-y-3">
              {performanceFeedback.map((feedback, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-50 rounded-lg p-4"
                >
                  <p className="text-gray-700">{feedback}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {workoutLog.notes && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Your Notes</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">{workoutLog.notes}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default WorkoutSummary 