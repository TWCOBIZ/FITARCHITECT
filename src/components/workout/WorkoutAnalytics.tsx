import { useState } from 'react'
import { motion } from 'framer-motion'
import { useWorkout } from '../../contexts/WorkoutContext'
import { WorkoutLog, WorkoutLogExercise } from '../../types/workout'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts'

// This dashboard visualizes workout volume, streaks, PRs, calories, muscle group distribution, average rating, and total duration.
// Uses recharts for charts and graphs.

const WorkoutAnalytics: React.FC = () => {
  const { workoutHistory } = useWorkout()
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month')
  const [selectedMetric, setSelectedMetric] = useState<'volume' | 'rating' | 'duration'>('volume')

  const calculateWorkoutVolume = (log: WorkoutLog): number => {
    return log.exercises.reduce((total: number, exercise: WorkoutLogExercise) => {
      return total + exercise.sets.reduce((setTotal: number, set) => {
        return setTotal + ((set.weight ?? 0) * (set.reps ?? 0))
      }, 0)
    }, 0)
  }

  const getFilteredLogs = (): WorkoutLog[] => {
    const now = new Date()
    const filteredLogs = workoutHistory.filter((log: WorkoutLog) => {
      const logDate = new Date(log.date)
      switch (timeRange) {
        case 'week':
          return logDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        case 'month':
          return logDate >= new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        case 'year':
          return logDate >= new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        default:
          return true
      }
    })
    return filteredLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const getChartData = () => {
    const filteredLogs = getFilteredLogs()
    return filteredLogs.map(log => ({
      date: new Date(log.date).toLocaleDateString(),
      volume: calculateWorkoutVolume(log),
      rating: log.rating,
      duration: log.duration
    }))
  }

  const getMuscleGroupData = () => {
    const muscleGroups = new Map<string, number>()
    workoutHistory.forEach((log: WorkoutLog) => {
      log.exercises.forEach((exercise: WorkoutLogExercise) => {
        const current = muscleGroups.get(exercise.exerciseId) || 0
        muscleGroups.set(exercise.exerciseId, current + 1)
      })
    })
    return Array.from(muscleGroups.entries()).map(([name, count]) => ({
      name,
      count
    }))
  }

  const renderChart = () => {
    const data = getChartData()
    const metricKey = selectedMetric

    return (
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '0.5rem'
              }}
              labelStyle={{ color: '#F3F4F6' }}
              itemStyle={{ color: '#60A5FA' }}
            />
            <Line
              type="monotone"
              dataKey={metricKey}
              stroke="#60A5FA"
              strokeWidth={3}
              dot={{ r: 4, fill: '#60A5FA' }}
              activeDot={{ r: 6, fill: '#3B82F6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const renderMuscleGroupChart = () => {
    const data = getMuscleGroupData()

    return (
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '0.5rem'
              }}
              labelStyle={{ color: '#F3F4F6' }}
              itemStyle={{ color: '#60A5FA' }}
            />
            <Legend 
              wrapperStyle={{ color: '#9CA3AF' }}
            />
            <Bar dataKey="count" fill="#60A5FA" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const getProgressStats = () => {
    const filteredLogs = getFilteredLogs()
    const totalWorkouts = filteredLogs.length
    const totalVolume = filteredLogs.reduce((sum, log) => sum + calculateWorkoutVolume(log), 0)
    const averageRating = filteredLogs.reduce((sum, log) => sum + (log.rating ?? 0), 0) / totalWorkouts
    const totalDuration = filteredLogs.reduce((sum, log) => sum + (log.duration || 0), 0)

    return {
      totalWorkouts,
      totalVolume,
      averageRating,
      totalDuration
    }
  }

  const stats = getProgressStats()

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Key Metrics - Simplified Grid */}
      <div className="bg-gray-900 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="text-3xl font-bold text-blue-400 mb-1">{stats.totalWorkouts}</div>
            <div className="text-sm text-gray-300">Total Workouts</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <div className="text-3xl font-bold text-blue-400 mb-1">
              {stats.totalVolume > 999 ? `${(stats.totalVolume / 1000).toFixed(1)}k` : stats.totalVolume.toLocaleString()}
            </div>
            <div className="text-sm text-gray-300">Volume (lbs)</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div className="text-3xl font-bold text-green-400 mb-1">
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
            </div>
            <div className="text-sm text-gray-300">Avg Rating</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <div className="text-3xl font-bold text-purple-400 mb-1">
              {Math.round(stats.totalDuration / 60)}h
            </div>
            <div className="text-sm text-gray-300">Total Time</div>
          </motion.div>
        </div>
      </div>

      {/* Performance Trends Chart */}
      <div className="bg-gray-900 rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
          <h2 className="text-xl font-bold text-white mb-4 sm:mb-0">Performance Trends</h2>
          <div className="flex gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'year')}
              className="rounded-lg bg-gray-800 text-white border-0 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as 'volume' | 'rating' | 'duration')}
              className="rounded-lg bg-gray-800 text-white border-0 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="volume">Volume</option>
              <option value="rating">Rating</option>
              <option value="duration">Duration</option>
            </select>
          </div>
        </div>
        {renderChart()}
      </div>

      {/* Muscle Group Distribution */}
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Muscle Group Distribution</h2>
        {renderMuscleGroupChart()}
      </div>
    </div>
  )
}

export default WorkoutAnalytics 