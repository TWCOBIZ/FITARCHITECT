import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import WorkoutAnalytics from '../components/workout/WorkoutAnalytics';
import NutritionAnalytics from '../components/nutrition/NutritionAnalytics';
import { useWorkout } from '../contexts/WorkoutContext';
import { useNutrition } from '../contexts/NutritionContext';

const Analytics: React.FC = () => {
  const { workoutHistory, workoutPlans } = useWorkout();
  const { dailyLog } = useNutrition();
  const [stats, setStats] = useState({
    completedWorkouts: 0,
    avgDailyCalories: 0,
    currentStreak: 0
  });

  useEffect(() => {
    // Calculate workout stats
    const completedWorkouts = workoutHistory.filter(log => log.completed).length;
    
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

    setStats({
      completedWorkouts,
      avgDailyCalories: Math.round(avgDailyCalories),
      currentStreak: streak
    });
  }, [workoutHistory, dailyLog]);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-gray-400">Track your fitness and nutrition progress</p>
        </div>

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