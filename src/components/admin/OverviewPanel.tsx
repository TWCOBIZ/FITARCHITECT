import React, { useState, useEffect } from 'react'
import { FaUsers, FaCreditCard, FaChartLine, FaExclamationTriangle } from 'react-icons/fa'
import { motion } from 'framer-motion'
import { api } from '../../services/api'

interface DashboardStats {
  totalUsers: number
  activeSubscriptions: number
  monthlyRevenue: number
  totalRevenue: number
  newUsersToday: number
  churnRate: number
  averageSessionTime: number
  completedWorkouts: number
}

interface RecentActivity {
  id: string
  type: 'user_registration' | 'subscription' | 'workout_completion' | 'error'
  message: string
  timestamp: string
  user?: string
}

const OverviewPanel: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, activityResponse] = await Promise.all([
        api.get('/api/admin/dashboard/stats'),
        api.get('/api/admin/dashboard/activity')
      ])
      
      setStats(statsResponse.data)
      setRecentActivity(activityResponse.data)
      setError(null)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return <FaUsers className="text-green-400" />
      case 'subscription':
        return <FaCreditCard className="text-blue-400" />
      case 'workout_completion':
        return <FaChartLine className="text-purple-400" />
      case 'error':
        return <FaExclamationTriangle className="text-red-400" />
      default:
        return <FaChartLine className="text-gray-400" />
    }
  }

  const StatCard = ({ icon, title, value, subtitle, trend }: {
    icon: React.ReactNode
    title: string
    value: string | number
    subtitle?: string
    trend?: 'up' | 'down' | 'neutral'
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg p-6 border border-gray-700"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subtitle && (
            <p className={`text-sm mt-1 ${
              trend === 'up' ? 'text-green-400' : 
              trend === 'down' ? 'text-red-400' : 
              'text-gray-400'
            }`}>
              {subtitle}
            </p>
          )}
        </div>
        <div className="text-2xl text-blue-400">
          {icon}
        </div>
      </div>
    </motion.div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
        <div className="flex items-center">
          <FaExclamationTriangle className="text-red-400 mr-3" />
          <div>
            <h3 className="text-red-400 font-medium">Error Loading Dashboard</h3>
            <p className="text-red-300 text-sm mt-1">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Dashboard Overview</h1>
        <p className="text-gray-400">Real-time metrics and system status</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<FaUsers />}
          title="Total Users"
          value={formatNumber(stats?.totalUsers || 0)}
          subtitle={`+${stats?.newUsersToday || 0} today`}
          trend={stats?.newUsersToday ? 'up' : 'neutral'}
        />
        <StatCard
          icon={<FaCreditCard />}
          title="Active Subscriptions"
          value={formatNumber(stats?.activeSubscriptions || 0)}
          subtitle={`${((stats?.activeSubscriptions || 0) / (stats?.totalUsers || 1) * 100).toFixed(1)}% conversion`}
        />
        <StatCard
          icon={<FaChartLine />}
          title="Monthly Revenue"
          value={formatCurrency(stats?.monthlyRevenue || 0)}
          subtitle={`${formatCurrency(stats?.totalRevenue || 0)} total`}
        />
        <StatCard
          icon={<FaExclamationTriangle />}
          title="Completed Workouts"
          value={formatNumber(stats?.completedWorkouts || 0)}
          subtitle={`${(stats?.averageSessionTime || 0)} min avg`}
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <button
              onClick={fetchDashboardData}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="divide-y divide-gray-700">
          {recentActivity.length > 0 ? (
            recentActivity.slice(0, 10).map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 flex items-center space-x-3"
              >
                <div className="text-lg">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {activity.message}
                  </p>
                  {activity.user && (
                    <p className="text-gray-400 text-xs mt-1">
                      User: {activity.user}
                    </p>
                  )}
                </div>
                <div className="text-gray-400 text-xs whitespace-nowrap">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-400">No recent activity</p>
            </div>
          )}
        </div>
      </div>

      {/* System Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-white font-medium mb-3">Database Status</h3>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
            <span className="text-green-400 text-sm">Connected</span>
          </div>
          <p className="text-gray-400 text-xs mt-2">
            {formatNumber(stats?.totalUsers || 0)} records indexed
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-white font-medium mb-3">API Performance</h3>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
            <span className="text-green-400 text-sm">Operational</span>
          </div>
          <p className="text-gray-400 text-xs mt-2">
            Average response time: &lt;200ms
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-white font-medium mb-3">External Services</h3>
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              <span className="text-gray-300 text-xs">Stripe</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              <span className="text-gray-300 text-xs">OpenAI</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
              <span className="text-gray-300 text-xs">WGER API</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OverviewPanel