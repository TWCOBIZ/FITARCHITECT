import React, { createContext, useContext, useState, useEffect } from 'react'
import { Workout, WorkoutPlan, WorkoutLog } from '../types/workout'
import { useAuth } from './AuthContext'
import axios from 'axios'

// Enhanced AIGeneratedPlan interface for WorkoutContext
export interface AIGeneratedPlan {
  id: string
  name: string
  description: string
  duration: number
  workouts?: Workout[]
  weeks?: WeekStructure[]
  targetMuscleGroups: string[]
  difficulty: string
  createdAt: Date | string
  updatedAt: Date | string
  completed?: boolean
}

interface WeekStructure {
  weekNumber: number
  days: DayStructure[]
}

interface DayStructure {
  dayNumber: number
  exercises: any[]
  name?: string
  description?: string
}

interface WorkoutContextType {
  currentWorkout: Workout | null
  currentPlan: WorkoutPlan | null
  activePlan: AIGeneratedPlan | null // New: single active plan across all tabs
  workoutHistory: WorkoutLog[]
  workoutPlans: AIGeneratedPlan[] // Updated to use AIGeneratedPlan
  loading: boolean
  error: string | null
  setCurrentWorkout: (workout: Workout | null) => void
  setCurrentPlan: (plan: WorkoutPlan | null) => void
  setActivePlan: (plan: AIGeneratedPlan | null) => void // New: set active plan
  addWorkoutLog: (log: WorkoutLog) => void
  getWorkoutHistory: () => WorkoutLog[]
  getWorkoutProgress: (workoutId: string) => {
    totalCompleted: number
    averageRating: number
    lastCompleted: Date | null
  }
  generateWorkoutPlan: (userProfile: any) => Promise<WorkoutPlan | null>
  completeWorkout: (workoutId: string, exercises: any[], notes?: string, rating?: number) => Promise<void>
  fetchWorkoutPlans: () => Promise<void>
  deleteWorkoutPlan: (planId: string) => Promise<void>
  saveWorkoutPlan: (plan: AIGeneratedPlan) => Promise<void> // New: save and set as active
  getTodaysWorkout: (plan?: AIGeneratedPlan) => Workout | null // New: get today's workout
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined)

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth()
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null)
  const [currentPlan, setCurrentPlan] = useState<WorkoutPlan | null>(null)
  const [activePlan, setActivePlan] = useState<AIGeneratedPlan | null>(null) // New: single active plan
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutLog[]>([])
  const [workoutPlans, setWorkoutPlans] = useState<AIGeneratedPlan[]>([]) // Updated type
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadGuestWorkoutData = () => {
    // Load guest workout data from localStorage
    const savedHistory = localStorage.getItem('guestWorkoutHistory')
    const savedPlans = localStorage.getItem('guestWorkoutPlans')
    
    if (savedHistory) {
      setWorkoutHistory(JSON.parse(savedHistory))
    }
    if (savedPlans) {
      setWorkoutPlans(JSON.parse(savedPlans))
    }
  }

  // Fetch workout history and plans from backend on mount
  useEffect(() => {
    // Wait for auth to finish loading before making any data calls
    if (authLoading) {
      return
    }
    
    // Only load API data for registered users (not guests)
    if (user && !user.isGuest && user.type !== 'guest') {
      const authToken = localStorage.getItem('token');
      
      // Fetch workout history
      axios.get('/api/workout-log', authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : {})
        .then(res => setWorkoutHistory(res.data))
        .catch(() => setWorkoutHistory([]));
      
      // Fetch workout plans
      fetchWorkoutPlans();
    } else if (user) {
      // For guests, load from localStorage
      loadGuestWorkoutData();
    }
  }, [user, authLoading])

  // Auto-set activePlan when workoutPlans change
  useEffect(() => {
    if (workoutPlans.length > 0 && !activePlan) {
      // Find the first non-completed plan
      const activeWorkoutPlan = workoutPlans.find(p => !p.completed);
      if (activeWorkoutPlan) {
        setActivePlan(activeWorkoutPlan);
      }
    }
  }, [workoutPlans, activePlan])

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

  const fetchWorkoutPlans = async () => {
    try {
      // Only fetch from API for registered users (not guests)
      if (!user || user.isGuest || user.type === 'guest') {
        return;
      }
      
      const authToken = localStorage.getItem('token');
      if (!authToken) {
        setWorkoutPlans([]);
        return;
      }
      
      const response = await axios.get('/api/workout-plans', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setWorkoutPlans(response.data as AIGeneratedPlan[]);
    } catch (err) {
      console.error('Failed to fetch workout plans:', err);
      setWorkoutPlans([]);
    }
  }

  const generateWorkoutPlan = async (userProfile: any): Promise<WorkoutPlan | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const authToken = localStorage.getItem('token');
      if (!authToken) {
        throw new Error('Authentication required');
      }

      const response = await axios.post('/api/workout-plans/generate', 
        { userProfile },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      const newPlan = response.data;
      setWorkoutPlans(prev => [...prev, newPlan]);
      setCurrentPlan(newPlan);
      
      return newPlan;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to generate workout plan';
      setError(errorMessage);
      console.error('Failed to generate workout plan:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }

  const completeWorkout = async (workoutId: string, exercises: any[], notes?: string, rating?: number): Promise<void> => {
    try {
      const workoutLog: Omit<WorkoutLog, 'id'> = {
        userId: '', // Will be set by backend
        workoutId,
        date: new Date(),
        exercises,
        duration: 0, // Calculate based on exercises or user input
        notes,
        rating,
        completed: true
      };

      await addWorkoutLog(workoutLog as WorkoutLog);
    } catch (err) {
      console.error('Failed to complete workout:', err);
      throw err;
    }
  }

  const deleteWorkoutPlan = async (planId: string): Promise<void> => {
    try {
      const authToken = localStorage.getItem('token');
      if (!authToken) {
        throw new Error('Authentication required');
      }

      await axios.delete(`/api/workout-plans/${planId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      setWorkoutPlans(prev => prev.filter(plan => plan.id !== planId));
      
      // Clear current plan if it was deleted
      if (currentPlan?.id === planId) {
        setCurrentPlan(null);
      }
      
      // Clear active plan if it was deleted and set new one
      if (activePlan?.id === planId) {
        const remainingPlans = workoutPlans.filter(plan => plan.id !== planId);
        const newActivePlan = remainingPlans.find(p => !p.completed);
        setActivePlan(newActivePlan || null);
      }
    } catch (err) {
      console.error('Failed to delete workout plan:', err);
      throw err;
    }
  }

  // New: Save workout plan and set as active
  const saveWorkoutPlan = async (plan: AIGeneratedPlan): Promise<void> => {
    try {
      const authToken = localStorage.getItem('token');
      const payload = {
        ...plan,
        isDefault: false,
        completed: false,
      };
      
      const res = await axios.post('/api/workout-plans', payload, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      
      const savedPlan = res.data;
      setWorkoutPlans(prev => [...prev, savedPlan]);
      setActivePlan(savedPlan); // Set as active plan immediately
      
    } catch (err) {
      console.error('Failed to save workout plan:', err);
      throw err;
    }
  }

  // New: Get today's workout from active plan or provided plan
  const getTodaysWorkout = (plan?: AIGeneratedPlan): Workout | null => {
    const targetPlan = plan || activePlan;
    if (!targetPlan) return null;

    // Handle standard workouts array structure
    if (targetPlan.workouts && targetPlan.workouts.length > 0) {
      // Find the first incomplete workout, or return the first workout
      return targetPlan.workouts.find((w: Workout & { completed?: boolean }) => !w.completed) || targetPlan.workouts[0];
    }
    
    // Handle weeks-based structure
    if (targetPlan.weeks && targetPlan.weeks.length > 0) {
      const currentWeek = getCurrentWeek(targetPlan);
      const currentDay = getCurrentDay(currentWeek);
      
      if (currentDay && currentDay.exercises && currentDay.exercises.length > 0) {
        // Convert day structure to workout structure
        return {
          id: `${targetPlan.id}-week${currentWeek.weekNumber}-day${currentDay.dayNumber}`,
          name: currentDay.name || `Week ${currentWeek.weekNumber}, Day ${currentDay.dayNumber}`,
          description: currentDay.description || 'Generated workout',
          type: 'strength' as const,
          difficulty: targetPlan.difficulty as any,
          duration: 45,
          exercises: currentDay.exercises.map((ex: any) => ({
            exercise: ex.exercise || ex,
            sets: ex.sets || 3,
            reps: ex.reps || 10,
            restTime: ex.restTime || ex.rest || 60,
            notes: ex.notes
          })),
          targetMuscleGroups: targetPlan.targetMuscleGroups as any,
          equipment: [],
          caloriesBurned: 0,
          createdAt: new Date(targetPlan.createdAt),
          updatedAt: new Date(targetPlan.updatedAt)
        };
      }
    }
    
    return null;
  }

  // Helper functions for weeks-based structure
  const getCurrentWeek = (plan: AIGeneratedPlan): WeekStructure => {
    if (!plan.weeks || plan.weeks.length === 0) {
      throw new Error('No weeks found in plan');
    }
    // For now, return the first week. Could be enhanced to track progress
    return plan.weeks[0];
  };
  
  const getCurrentDay = (week: WeekStructure): DayStructure | null => {
    if (!week.days || week.days.length === 0) {
      return null;
    }
    // For now, return the first day. Could be enhanced to track daily progress
    return week.days[0];
  };

  return (
    <WorkoutContext.Provider
      value={{
        currentWorkout,
        currentPlan,
        activePlan, // New: single active plan
        workoutHistory,
        workoutPlans,
        loading,
        error,
        setCurrentWorkout,
        setCurrentPlan,
        setActivePlan, // New: set active plan
        addWorkoutLog,
        getWorkoutHistory,
        getWorkoutProgress,
        generateWorkoutPlan,
        completeWorkout,
        fetchWorkoutPlans,
        deleteWorkoutPlan,
        saveWorkoutPlan, // New: save and set as active
        getTodaysWorkout // New: get today's workout
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