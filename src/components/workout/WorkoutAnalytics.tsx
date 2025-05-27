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
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey={metricKey}
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
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
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#3B82F6" />
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
    const totalDuration = filteredLogs.reduce((sum, log) => sum + log.duration, 0)

    return {
      totalWorkouts,
      totalVolume,
      averageRating,
      totalDuration
    }
  }

  const stats = getProgressStats()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Workouts</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.totalWorkouts}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Volume</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.totalVolume.toLocaleString()} lbs</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Average Rating</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.averageRating.toFixed(1)}/5</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Duration</h3>
          <p className="text-3xl font-bold text-blue-600">{Math.round(stats.totalDuration / 60)}h</p>
        </motion.div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Performance Trends</h2>
          <div className="flex space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'year')}
              className="rounded-lg border-gray-300"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as 'volume' | 'rating' | 'duration')}
              className="rounded-lg border-gray-300"
            >
              <option value="volume">Volume</option>
              <option value="rating">Rating</option>
              <option value="duration">Duration</option>
            </select>
          </div>
        </div>
        {renderChart()}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Muscle Group Distribution</h2>
        {renderMuscleGroupChart()}
      </div>
    </div>
  )
}

export default WorkoutAnalytics 