import React, { createContext, useContext, useState, useEffect } from 'react'
import { Workout, WorkoutPlan, WorkoutLog } from '../types/workout'
import axios from 'axios'

interface WorkoutContextType {
  currentWorkout: Workout | null
  currentPlan: WorkoutPlan | null
  workoutHistory: WorkoutLog[]
  setCurrentWorkout: (workout: Workout | null) => void
  setCurrentPlan: (plan: WorkoutPlan | null) => void
  addWorkoutLog: (log: WorkoutLog) => void
  getWorkoutHistory: () => WorkoutLog[]
  getWorkoutProgress: (workoutId: string) => {
    totalCompleted: number
    averageRating: number
    lastCompleted: Date | null
  }
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined)

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null)
  const [currentPlan, setCurrentPlan] = useState<WorkoutPlan | null>(null)
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutLog[]>([])

  // Fetch workout history from backend on mount
  useEffect(() => {
    const authToken = localStorage.getItem('token');
    axios.get('/api/workout-log', authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : {})
      .then(res => setWorkoutHistory(res.data))
      .catch(() => setWorkoutHistory([]));
  }, [])

  const addWorkoutLog = async (log: WorkoutLog) => {
    // Frontend validation before sending to backend
    if (!log.planId || !log.workoutId || !log.exercises || !Array.isArray(log.exercises) || log.exercises.length === 0) {
      console.error('Workout log missing required fields:', log);
      // Optionally show error to user
      return;
    }
    try {
      const authToken = localStorage.getItem('token');
      const res = await axios.post('/api/workout-log', log, authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : {});
      setWorkoutHistory(prev => [...prev, res.data]);
    } catch {
      // Optionally show error to user
    }
  }

  const getWorkoutHistory = () => {
    return workoutHistory
  }

  const getWorkoutProgress = (workoutId: string) => {
    const workoutLogs = workoutHistory.filter(log => log.workoutId === workoutId)
    const totalCompleted = workoutLogs.filter(log => log.completed).length
    const averageRating = workoutLogs.reduce((acc, log) => acc + (log.rating || 0), 0) / totalCompleted || 0
    const lastCompleted = workoutLogs
      .filter(log => log.completed)
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0]?.date || null

    return {
      totalCompleted,
      averageRating,
      lastCompleted
    }
  }

  return (
    <WorkoutContext.Provider
      value={{
        currentWorkout,
        currentPlan,
        workoutHistory,
        setCurrentWorkout,
        setCurrentPlan,
        addWorkoutLog,
        getWorkoutHistory,
        getWorkoutProgress
      }}
    >
      {children}
    </WorkoutContext.Provider>
  )
}

export const useWorkout = () => {
  const context = useContext(WorkoutContext)
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider')
  }
  return context
} 