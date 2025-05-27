import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useWorkout } from '../../contexts/WorkoutContext'
import { WorkoutLog } from '../../types/workout'

const WorkoutHistory: React.FC = () => {
  const { workoutHistory, getWorkoutProgress } = useWorkout()
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'year'>('week')

  const timeframes = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' }
  ]

  const getFilteredHistory = () => {
    const now = new Date()
    const filtered = workoutHistory.filter(log => {
      const logDate = new Date(log.date)
      switch (selectedTimeframe) {
        case 'week':
          return logDate >= new Date(now.setDate(now.getDate() - 7))
        case 'month':
          return logDate >= new Date(now.setMonth(now.getMonth() - 1))
        case 'year':
          return logDate >= new Date(now.setFullYear(now.getFullYear() - 1))
        default:
          return true
      }
    })
    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime())
  }

  const getStats = () => {
    const filtered = getFilteredHistory()
    const totalWorkouts = filtered.length
    const completedWorkouts = filtered.filter(log => log.completed).length
    const averageRating =
      filtered.reduce((acc, log) => acc + (log.rating || 0), 0) / completedWorkouts || 0
    const totalDuration = filtered.reduce((acc, log) => acc + log.duration, 0)

    return {
      totalWorkouts,
      completedWorkouts,
      averageRating,
      totalDuration
    }
  }

  const stats = getStats()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Workout History</h1>
          <div className="flex gap-2">
            {timeframes.map(timeframe => (
              <button
                key={timeframe.value}
                onClick={() => setSelectedTimeframe(timeframe.value as 'week' | 'month' | 'year')}
                className={`px-4 py-2 rounded-lg ${
                  selectedTimeframe === timeframe.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {timeframe.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-lg p-6"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-2">Total Workouts</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.totalWorkouts}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-lg p-6"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-2">Completed</h3>
            <p className="text-3xl font-bold text-green-600">{stats.completedWorkouts}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-lg p-6"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-2">Average Rating</h3>
            <p className="text-3xl font-bold text-yellow-600">
              {stats.averageRating.toFixed(1)}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow-lg p-6"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-2">Total Duration</h3>
            <p className="text-3xl font-bold text-purple-600">
              {Math.round(stats.totalDuration / 60)}h
            </p>
          </motion.div>
        </div>

        <div className="space-y-4">
          {getFilteredHistory().map(log => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-lg p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Workout {log.workoutId}
                  </h3>
                  <p className="text-gray-600">
                    {new Date(log.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {Math.round(log.duration / 60)} minutes
                  </span>
                  {log.rating && (
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={`text-lg ${
                            i < log.rating ? 'text-yellow-400' : 'text-gray-300'
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {log.notes && (
                <p className="text-gray-600 mb-4">{log.notes}</p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {log.exercises.map((exercise, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-lg p-4"
                  >
                    <h4 className="font-medium text-gray-900 mb-2">
                      Exercise {index + 1}
                    </h4>
                    <div className="space-y-2">
                      {exercise.sets.map((set, setIndex) => (
                        <div
                          key={setIndex}
                          className="text-sm text-gray-600"
                        >
                          Set {setIndex + 1}: {set.reps} reps
                          {set.weight && ` @ ${set.weight}lbs`}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default WorkoutHistory 