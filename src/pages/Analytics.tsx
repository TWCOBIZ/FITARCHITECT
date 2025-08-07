import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import WorkoutAnalytics from '../components/workout/WorkoutAnalytics';
import NutritionAnalytics from '../components/nutrition/NutritionAnalytics';
import { useWorkout } from '../contexts/WorkoutContext';
import { useNutrition } from '../contexts/NutritionContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const Analytics: React.FC = () => {
  const { workoutHistory, workoutPlans } = useWorkout();
  const { dailyLog } = useNutrition();
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [stats, setStats] = useState({
    completedWorkouts: 0,
    avgDailyCalories: 0,
    currentStreak: 0
  });

  // Load analytics data from backend
  const loadAnalyticsData = async () => {
    if (!user || (user.isGuest && user.type === 'guest')) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/api/analytics/dashboard?days=${selectedPeriod}`);
      setAnalyticsData(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh analytics data
  useEffect(() => {
    loadAnalyticsData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadAnalyticsData, 5 * 60 * 1000); // Refresh every 5 minutes
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, selectedPeriod, autoRefresh]);

  useEffect(() => {
    // Calculate workout stats
    
    // Calculate daily calories from the already calculated total
    const avgDailyCalories = dailyLog.calories || 0;
    
    // Calculate workout streak
    const today = new Date();
    let streak = 0;
    const sortedLogs = [...workoutHistory]
      .filter(log => log.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    for (const log of sortedLogs) {
      const logDate = new Date(log.date);
      const daysDiff = Math.floor((today.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }

    const completedWorkouts = workoutHistory.filter(log => log.completed).length;

    setStats({
      completedWorkouts,
      avgDailyCalories: Math.round(avgDailyCalories),
      currentStreak: streak
    });
  }, [workoutHistory, dailyLog]);

  const handleExportData = async (format: 'json' | 'csv', type: 'nutrition' | 'workouts' | 'all') => {
    try {
      const response = await api.get(`/api/analytics/export?format=${format}&type=${type}&days=${selectedPeriod}`, {
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fitness-data-${type}-${selectedPeriod}days.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fitness-data-${type}-${selectedPeriod}days.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export data');
    }
  };

  if (loading && !analyticsData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-xl">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header with Controls */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
              <p className="text-gray-400">Track your fitness and nutrition progress</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg font-semibold ${
                  autoRefresh ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                }`}
              >
                {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
              </button>
              <button
                onClick={loadAnalyticsData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold disabled:opacity-50"
              >
                {loading ? 'Loading...' : '🔄 Refresh'}
              </button>
            </div>
          </div>

          {/* Period Selection */}
          <div className="flex gap-2 mb-4">
            {[7, 30, 90, 365].map((days) => (
              <button
                key={days}
                onClick={() => setSelectedPeriod(days)}
                className={`px-4 py-2 rounded-lg font-semibold ${
                  selectedPeriod === days
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {days === 7 ? '1 Week' : days === 30 ? '1 Month' : days === 90 ? '3 Months' : '1 Year'}
              </button>
            ))}
          </div>

          {/* Export Controls */}
          <div className="flex gap-2 mb-4">
            <div className="text-sm text-gray-400 flex items-center mr-4">Export Data:</div>
            <button
              onClick={() => handleExportData('json', 'all')}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
            >
              📊 JSON
            </button>
            <button
              onClick={() => handleExportData('csv', 'all')}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
            >
              📈 CSV
            </button>
            <button
              onClick={() => handleExportData('json', 'nutrition')}
              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-sm"
            >
              🥗 Nutrition
            </button>
            <button
              onClick={() => handleExportData('json', 'workouts')}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
            >
              💪 Workouts
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Backend Analytics Data */}
        {analyticsData && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Nutrition Overview</h3>
              <div className="space-y-2">
                <div>Avg Daily Calories: <span className="text-blue-400 font-semibold">{analyticsData.nutrition?.averages?.calories || 0}</span></div>
                <div>Avg Protein: <span className="text-green-400 font-semibold">{analyticsData.nutrition?.averages?.protein || 0}g</span></div>
                <div>Goal Adherence: <span className="text-yellow-400 font-semibold">{analyticsData.nutrition?.goalAdherence?.percentage || 0}%</span></div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Workout Overview</h3>
              <div className="space-y-2">
                <div>Total Workouts: <span className="text-blue-400 font-semibold">{analyticsData.workouts?.totalWorkouts || 0}</span></div>
                <div>Weekly Frequency: <span className="text-green-400 font-semibold">{analyticsData.workouts?.weeklyFrequency?.toFixed(1) || 0}/week</span></div>
                <div>Consistency: <span className="text-yellow-400 font-semibold">{Math.round((analyticsData.workouts?.consistency || 0) * 100)}%</span></div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Progress Score</h3>
              <div className="space-y-2">
                <div>Overall Grade: <span className="text-purple-400 font-semibold text-xl">{analyticsData.goals?.overall?.grade || 'N/A'}</span></div>
                <div>Score: <span className="text-blue-400 font-semibold">{analyticsData.goals?.overall?.score || 0}/100</span></div>
                <div>Profile: <span className="text-green-400 font-semibold">{analyticsData.progress?.profileCompleteness || 0}% Complete</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Last Updated Info */}
        {analyticsData && (
          <div className="mb-6 text-center text-sm text-gray-500">
            Data period: {selectedPeriod} days • Last updated: {new Date().toLocaleTimeString()} • 
            {autoRefresh && ' Auto-refreshing every 5 minutes'}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Workout Analytics */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-gray-900 rounded-lg p-6"
          >
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <span className="mr-3">💪</span>
              Workout Analytics
            </h2>
            <WorkoutAnalytics />
          </motion.div>

          {/* Nutrition Analytics */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-gray-900 rounded-lg p-6"
          >
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <span className="mr-3">🥗</span>
              Nutrition Analytics
            </h2>
            <NutritionAnalytics />
          </motion.div>
        </div>

        {/* Progress Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 bg-gray-900 rounded-lg p-6"
        >
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <span className="mr-3">📊</span>
            Progress Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">{stats.completedWorkouts}</div>
              <div className="text-gray-400">Workouts Completed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">{stats.avgDailyCalories}</div>
              <div className="text-gray-400">Today's Calories</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">{stats.currentStreak}</div>
              <div className="text-gray-400">Day Streak</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Analytics;