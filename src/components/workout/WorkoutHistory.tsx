import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useWorkout } from '../../contexts/WorkoutContext'

const WorkoutHistory: React.FC = () => {
  const { workoutHistory } = useWorkout()
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
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const getStats = () => {
    const filtered = getFilteredHistory()
    const totalWorkouts = filtered.length
    const completedWorkouts = filtered.filter(log => log.completed).length
    const completionRate = totalWorkouts > 0 ? (completedWorkouts / totalWorkouts) * 100 : 0
    const averageRating = filtered.reduce((acc, log) => acc + (log.rating || 0), 0) / completedWorkouts || 0
    const totalDuration = filtered.reduce((acc, log) => acc + (log.duration || 0), 0)

    // Calculate streak
    const sortedLogs = filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    let currentStreak = 0
    for (const log of sortedLogs) {
      if (log.completed) currentStreak++
      else break
    }

    return {
      totalWorkouts,
      completedWorkouts,
      completionRate,
      averageRating,
      totalDuration,
      currentStreak
    }
  }

  const stats = getStats()

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header Section - Simplified */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <h1 className="text-2xl font-bold text-white mb-4 sm:mb-0">Workout History</h1>
        <div className="flex gap-1">
          {timeframes.map(timeframe => (
            <button
              key={timeframe.value}
              onClick={() => setSelectedTimeframe(timeframe.value as 'week' | 'month' | 'year')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTimeframe === timeframe.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {timeframe.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Metrics - Always Visible */}
      <div className="bg-gray-900 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Primary Progress Score */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="text-4xl font-bold text-green-400 mb-2">
              {stats.completionRate.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-300">Completion Rate</div>
            <div className="text-xs text-gray-400 mt-1">
              {stats.completedWorkouts} of {stats.totalWorkouts} completed
            </div>
          </motion.div>

          {/* Current Streak */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <div className="text-4xl font-bold text-blue-400 mb-2">
              {stats.currentStreak}
            </div>
            <div className="text-sm text-gray-300">Current Streak</div>
            <div className="text-xs text-gray-400 mt-1">
              consecutive workouts
            </div>
          </motion.div>

          {/* Weekly Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div className="text-4xl font-bold text-purple-400 mb-2">
              {Math.round(stats.totalDuration / 60)}h
            </div>
            <div className="text-sm text-gray-300">Total Time</div>
            <div className="text-xs text-gray-400 mt-1">
              {stats.averageRating > 0 ? `${stats.averageRating.toFixed(1)}★ avg` : 'No ratings yet'}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Workout History List - Simplified Layout */}
      <div className="space-y-3">
        {getFilteredHistory().length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-8 text-center">
            <div className="text-gray-400 mb-2">No workouts found</div>
            <div className="text-sm text-gray-500">
              Complete your first workout to see it here
            </div>
          </div>
        ) : (
          getFilteredHistory().map((log, index) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-gray-900 rounded-xl p-4 hover:bg-gray-800 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-white font-medium">
                      {new Date(log.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </h3>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      log.completed 
                        ? 'bg-green-900 text-green-300' 
                        : 'bg-orange-900 text-orange-300'
                    }`}>
                      {log.completed ? 'Completed' : 'Incomplete'}
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {Math.round((log.duration || 0) / 60)} min
                    {log.rating && (
                      <span className="ml-3">
                        {[...Array(Math.floor(log.rating))].map((_, i) => '★').join('')}
                        <span className="text-gray-600 ml-1">
                          {log.rating.toFixed(1)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {log.notes && (
                <p className="text-gray-300 text-sm mb-3 italic">"{log.notes}"</p>
              )}

              {/* Simplified Exercise Summary */}
              <div className="space-y-2">
                {log.exercises.slice(0, 3).map((exercise, exerciseIndex) => (
                  <div key={exerciseIndex} className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">
                      Exercise {exerciseIndex + 1}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {exercise.sets?.length || 0} sets
                    </span>
                  </div>
                ))}
                {log.exercises.length > 3 && (
                  <div className="text-gray-500 text-xs">
                    +{log.exercises.length - 3} more exercises
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

export default WorkoutHistory 