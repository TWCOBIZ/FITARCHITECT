import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { Workout, WorkoutPlan, WorkoutLog, WeekStructure, DayStructure, workoutPlanUtils } from '../types/workout'
import { useAuth } from './AuthContext'
import { api } from '../services/api'
import { workoutService } from '../services/workoutService'

// Enhanced retry utility for API calls
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 8000,
  backoffMultiplier: 2
};

async function withRetry<T>(
  operation: () => Promise<T>, 
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries, initialDelay, maxDelay, backoffMultiplier } = { ...DEFAULT_RETRY_CONFIG, ...config };
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on final attempt or non-retryable errors
      if (attempt === maxRetries || !isRetryableError(error)) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(backoffMultiplier, attempt), maxDelay);
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

function isRetryableError(error: any): boolean {
  // Retry on network errors, timeouts, and 5xx server errors
  return (
    !error.response || // Network error
    error.code === 'NETWORK_ERROR' ||
    error.code === 'ECONNABORTED' ||
    (error.response && error.response.status >= 500) ||
    error.response.status === 408 || // Request timeout
    error.response.status === 429    // Rate limited
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Circuit breaker for API calls
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private maxFailures = 5,
    private timeout = 30000 // 30 seconds
  ) {}
  
  async call<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open - service temporarily unavailable');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.maxFailures) {
      this.state = 'open';
    }
  }
  
  getState() {
    return this.state;
  }
}

// Enhanced AIGeneratedPlan interface for WorkoutContext
export interface AIGeneratedPlan {
  id: string
  name: string
  description: string
  duration: number
  weeks: WeekStructure[] // Primary structure
  workouts?: Workout[] // Deprecated - kept for backward compatibility
  targetMuscleGroups: string[]
  difficulty: string
  createdAt: Date | string
  updatedAt: Date | string
  completed?: boolean
  // New completion tracking fields
  completedWorkouts?: { [workoutId: string]: { 
    completed: boolean
    completedAt?: string
    rating?: number
    notes?: string
    duration?: number
  }}
  lastWorkoutCompleted?: Date | string
  progressData?: {
    totalWorkouts: number
    completedCount: number
    weeklyProgress: { [weekNumber: string]: number }
    streaks: { current: number; longest: number }
    lastCompletedWorkout?: string
  }
}


interface WorkoutContextType {
  currentWorkout: Workout | null
  currentPlan: WorkoutPlan | null
  activePlan: AIGeneratedPlan | null // New: single active plan across all tabs
  trackingWorkout: any | null // New: specific workout being tracked
  workoutHistory: WorkoutLog[]
  workoutPlans: AIGeneratedPlan[] // Updated to use AIGeneratedPlan
  loading: boolean
  error: string | null
  setCurrentWorkout: (workout: Workout | null) => void
  setCurrentPlan: (plan: WorkoutPlan | null) => void
  setActivePlan: (plan: AIGeneratedPlan | null) => void // New: set active plan
  setTrackingWorkout: (workout: any | null) => void // New: set workout for tracking
  addWorkoutLog: (log: WorkoutLog) => void
  getWorkoutHistory: () => WorkoutLog[]
  getWorkoutProgress: (workoutId: string) => {
    totalCompleted: number
    averageRating: number
    lastCompleted: Date | null
  }
  generateWorkoutPlan: (userProfile: any) => Promise<WorkoutPlan | null>
  completeWorkout: (workoutId: string, exercises: any[], notes?: string, rating?: number, duration?: number) => Promise<void>
  // New individual workout completion functions
  completeIndividualWorkout: (planId: string, workoutId: string, rating?: number, notes?: string, duration?: number) => Promise<void>
  uncompleteIndividualWorkout: (planId: string, workoutId: string) => Promise<void>
  getWorkoutCompletionStatus: (planId: string, workoutId: string) => { completed: boolean; completedAt?: string; rating?: number }
  getWorkoutPlanProgress: (planId: string) => Promise<any>
  fetchWorkoutPlans: () => Promise<void>
  deleteWorkoutPlan: (planId: string) => Promise<void>
  saveWorkoutPlan: (plan: AIGeneratedPlan) => Promise<void> // New: save and set as active
  getTodaysWorkout: (plan?: AIGeneratedPlan) => Workout | null // New: get today's workout
  getSmartCTASuggestions: () => { action: string; message: string; route: string }[] // New: smart CTA suggestions
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined)

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth()
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null)
  const [currentPlan, setCurrentPlan] = useState<WorkoutPlan | null>(null)
  const [activePlan, setActivePlan] = useState<AIGeneratedPlan | null>(null) // New: single active plan
  const [trackingWorkout, setTrackingWorkout] = useState<any | null>(null) // New: specific workout being tracked
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutLog[]>([])
  const [workoutPlans, setWorkoutPlans] = useState<AIGeneratedPlan[]>([]) // Updated type
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Enhanced error recovery state
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [retryCount, setRetryCount] = useState(0)
  const circuitBreaker = useRef(new CircuitBreaker())
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setRetryCount(0);
      setError(null);
      // Auto-retry failed requests when connection is restored
      if (workoutPlans.length === 0 && user && !user.isGuest) {
        fetchWorkoutPlansWithRetry();
      }
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setError('You are currently offline. Some features may not be available.');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [user, workoutPlans.length]);

  // Enhanced API call wrapper with offline handling
  const callAPIWithFallback = async <T,>(
    operation: () => Promise<T>,
    fallbackData?: T,
    cacheKey?: string
  ): Promise<T> => {
    if (isOffline) {
      if (fallbackData !== undefined) {
        return fallbackData;
      }
      
      if (cacheKey) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }
      
      throw new Error('No internet connection and no cached data available');
    }
    
    return circuitBreaker.current.call(() => withRetry(operation));
  };

  const loadGuestWorkoutData = () => {
    // Load guest workout data from localStorage
    const savedHistory = localStorage.getItem('guestWorkoutHistory')
    const savedPlans = localStorage.getItem('guestWorkoutPlans')
    
    if (savedHistory) {
      setWorkoutHistory(JSON.parse(savedHistory))
    }
    if (savedPlans) {
      const plans = JSON.parse(savedPlans);
      // Ensure all loaded plans have weeks structure
      const plansWithWeeks = plans.map((plan: any) => ({
        ...plan,
        ...workoutPlanUtils.ensureWeeksStructure(plan)
      }));
      setWorkoutPlans(plansWithWeeks);
    }
  }

  // Fetch workout history and plans from backend on mount
  useEffect(() => {
    // Wait for auth to finish loading before making any data calls
    if (authLoading) {
      return
    }
    
    // Check if we have a valid auth token before making API calls
    const authToken = localStorage.getItem('token');
    const isAuthenticated = authToken && !authToken.startsWith('guest-') && authToken.length > 50
    
    // Only load API data for authenticated registered users
    if (user && !user.isGuest && user.type !== 'guest' && isAuthenticated) {
      // Check if we already have data to avoid unnecessary refetching
      if (workoutHistory.length === 0) {
        // Fetch workout history
        api.get('/api/workout-log')
          .then(res => setWorkoutHistory(res.data))
          .catch(() => setWorkoutHistory([]));
      }
      
      // Fetch workout plans only if we don't have any
      if (workoutPlans.length === 0) {
        fetchWorkoutPlans();
      }
    } else if (user) {
      // For guests or unauthenticated users, load from localStorage
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
      const missingFields = [];
      if (!log.planId) missingFields.push('plan');
      if (!log.workoutId) missingFields.push('workout');
      if (!log.exercises || !Array.isArray(log.exercises) || log.exercises.length === 0) missingFields.push('exercises');
      
      setError(`Cannot save workout: Missing ${missingFields.join(', ')}. Please try generating a new workout plan.`);
      return;
    }
    try {
      const authToken = localStorage.getItem('token');
      if (!authToken) {
        setError('You must be logged in to save workouts. Please login and try again.');
        return;
      }
      
      const res = await api.post('/api/workout-log', log);
      setWorkoutHistory(prev => [...prev, res.data]);
      console.log('Workout saved successfully:', res.data);
    } catch (error: any) {
      console.error('Failed to save workout:', error);
      if (error.response?.status === 401) {
        setError('Your session has expired. Please login again to save workouts.');
      } else if (error.response?.data?.error) {
        setError(`Failed to save workout: ${error.response.data.error}`);
      } else {
        setError('Failed to save workout. Please check your connection and try again.');
      }
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
      const authToken = localStorage.getItem('token');
      
      // Comprehensive validation to prevent unnecessary API calls
      const shouldSkipApiCall = !user || 
                               user.isGuest || 
                               user.type === 'guest' || 
                               !authToken || 
                               authToken.startsWith('guest-') ||
                               authToken.length < 50 || // Invalid/test tokens
                               loading // Prevent duplicate calls
      
      if (shouldSkipApiCall) {
        console.log('Skipping workout plans API call - authentication not ready or user is guest')
        setWorkoutPlans([]);
        return;
      }

      console.log('Fetching workout plans with enhanced error recovery');
      
      const response = await callAPIWithFallback(
        () => api.get('/api/workout-plans', {
          skipErrorToast: true // Prevent toast spam for workout plans API errors
        } as any),
        undefined,
        'cachedWorkoutPlans'
      );
      
      // Ensure all plans have the weeks structure
      const plansWithWeeks = response.data.map((plan: any) => ({
        ...plan,
        ...workoutPlanUtils.ensureWeeksStructure(plan)
      }));
      
      setWorkoutPlans(plansWithWeeks as AIGeneratedPlan[]);
      setError(null); // Clear any previous errors
      setRetryCount(0);
      
      // Cache the fresh data
      localStorage.setItem('cachedWorkoutPlans', JSON.stringify(plansWithWeeks));
      
      console.log(`Successfully loaded ${plansWithWeeks.length} workout plans`)
    } catch (err: any) {
      console.error('Failed to fetch workout plans:', err);
      
      // Enhanced error handling with retry logic
      const isNetworkError = !err.response || err.code === 'NETWORK_ERROR';
      const isServerError = err.response?.status >= 500;
      const isRetryable = isNetworkError || isServerError || err.response?.status === 429;
      
      if (isRetryable && retryCount < 3 && !isOffline) {
        const nextRetryCount = retryCount + 1;
        setRetryCount(nextRetryCount);
        
        const retryDelay = Math.min(1000 * Math.pow(2, nextRetryCount - 1), 8000);
        setError(`Connection failed. Retrying in ${retryDelay / 1000} seconds... (${nextRetryCount}/3)`);
        
        retryTimeoutRef.current = setTimeout(() => {
          fetchWorkoutPlans();
        }, retryDelay);
        
        return;
      }
      
      // Handle specific error types
      if (err.response?.status === 401) {
        console.log('Authentication expired for workout plans - clearing plans')
        setError('Authentication expired. Please log in again.');
      } else if (circuitBreaker.current.getState() === 'open') {
        setError('Service temporarily unavailable. Please try again in a few minutes.');
      } else if (isOffline) {
        setError('You are offline. Workout plans will load when connection is restored.');
      } else {
        setError(`Could not load workout plans. ${isRetryable ? 'All retries exhausted.' : 'Please try again later.'}`);
      }
      
      // Try to load from localStorage as fallback
      try {
        const cachedPlans = localStorage.getItem('cachedWorkoutPlans');
        if (cachedPlans) {
          const parsed = JSON.parse(cachedPlans);
          const normalizedPlans = parsed.map((plan: any) => ({
            ...plan,
            ...workoutPlanUtils.ensureWeeksStructure(plan)
          }));
          setWorkoutPlans(normalizedPlans);
          console.log('Loaded workout plans from cache after API failure');
          
          if (!isOffline) {
            setError(error => error ? `${error} (Using cached data)` : 'Using cached workout plans');
          }
        } else {
          setWorkoutPlans([]);
        }
      } catch (cacheErr) {
        console.error('Error loading cached workout plans:', cacheErr);
        setWorkoutPlans([]);
      }
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

      const response = await api.post('/api/workout-plans/generate', { userProfile });

      const newPlan = response.data;
      // Ensure the new plan has weeks structure
      const planWithWeeks = {
        ...newPlan,
        ...workoutPlanUtils.ensureWeeksStructure(newPlan)
      };

      // Generate contextual workout names using AI
      try {
        const planGoal = userProfile.fitnessGoal || 'General Fitness';
        const workoutTypes = planWithWeeks.weeks?.[0]?.days?.map((day: DayStructure) => day.type).filter(Boolean) || [];
        const numberOfWorkouts = planWithWeeks.weeks?.[0]?.days?.length || 5;

        console.log('Generating workout names for:', { planGoal, numberOfWorkouts, workoutTypes });
        
        const workoutNames = await workoutService.generateWorkoutNames(
          planGoal,
          numberOfWorkouts,
          workoutTypes
        );

        console.log('Generated workout names:', workoutNames);

        // Apply the generated names to the workouts
        if (planWithWeeks.weeks && planWithWeeks.weeks[0] && planWithWeeks.weeks[0].days) {
          planWithWeeks.weeks[0].days.forEach((day: DayStructure, index: number) => {
            if (workoutNames[index]) {
              day.name = workoutNames[index];
            }
          });
        }
      } catch (nameError) {
        console.warn('Failed to generate contextual workout names, using defaults:', nameError);
        // Continue with default names - this shouldn't block plan creation
      }
      
      setWorkoutPlans(prev => [...prev, planWithWeeks]);
      setCurrentPlan(planWithWeeks);
      setActivePlan(planWithWeeks); // Also set as active plan
      
      return planWithWeeks;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to generate workout plan';
      setError(errorMessage);
      console.error('Failed to generate workout plan:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }

  const completeWorkout = async (workoutId: string, exercises: any[], notes?: string, rating?: number, duration?: number): Promise<void> => {
    try {
      // Get planId from the active plan or current plan
      const planId = activePlan?.id || currentPlan?.id || '';
      
      // Calculate completion rate
      const completedExercises = exercises.filter(ex => ex.completed).length;
      const completionRate = exercises.length > 0 ? (completedExercises / exercises.length) * 100 : 0;
      
      const workoutLog = {
        userId: '', // Will be set by backend
        planId,
        workoutId,
        date: new Date(),
        exercises,
        notes,
        completed: completionRate > 0, // Mark as completed if any exercises were done
        duration: duration || undefined, // Duration in minutes
        rating: rating || undefined,
        completionRate
      };

      // Save the enhanced log
      await addWorkoutLog(workoutLog as WorkoutLog);
      
      console.log('Workout completed successfully:', {
        completionRate: `${completionRate.toFixed(1)}%`,
        rating: rating || 'No rating',
        duration: duration ? `${duration} minutes` : 'Not tracked'
      });
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

      await api.delete(`/api/workout-plans/${planId}`);

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
      
      // Ensure the plan has weeks structure before saving
      const planWithWeeks = {
        ...plan,
        ...workoutPlanUtils.ensureWeeksStructure(plan as WorkoutPlan)
      };
      
      const payload = {
        ...planWithWeeks,
        isDefault: false,
        completed: false,
        estimatedDuration: planWithWeeks.estimatedDuration || 45, // Default 45 minutes
        equipment: planWithWeeks.equipment || ['bodyweight'],
        source: planWithWeeks.source || 'wger_openai_exercisedb' // Track generation source
      };
      
      console.log('Saving workout plan with payload:', payload);
      
      const res = await api.post('/api/workout-plans', payload);
      
      const savedPlan = res.data;
      console.log('Successfully saved plan:', savedPlan);
      setWorkoutPlans(prev => [...prev, savedPlan]);
      setActivePlan(savedPlan); // Set as active plan immediately
      
    } catch (err) {
      console.error('Failed to save workout plan:', err);
      throw err;
    }
  }

  // Smart CTA suggestions based on user activity
  const getSmartCTASuggestions = (): { action: string; message: string; route: string }[] => {
    const suggestions = [];
    
    // Check if user has no active plan
    if (!activePlan && workoutPlans.length === 0) {
      suggestions.push({
        action: 'Generate Your First Workout',
        message: 'Get started with an AI-powered workout plan',
        route: '/workouts'
      });
    }
    
    // Check if user has plan but hasn't worked out recently
    if (activePlan && workoutHistory.length === 0) {
      suggestions.push({
        action: 'Start Your First Workout',
        message: 'Your plan is ready - time to begin!',
        route: '/workouts'
      });
    }
    
    // Check last workout was more than 3 days ago
    const lastWorkout = workoutHistory[0];
    if (lastWorkout) {
      const daysSinceLastWorkout = Math.floor((Date.now() - new Date(lastWorkout.date).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastWorkout >= 3) {
        suggestions.push({
          action: 'Get Back On Track',
          message: `It's been ${daysSinceLastWorkout} days since your last workout`,
          route: '/workouts'
        });
      }
    }
    
    return suggestions;
  };

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
          exercises: currentDay.exercises.map((ex: any, index: number) => {
            // Ensure we have a proper exercise object with all required fields
            const exerciseData = ex.exercise || ex;
            
            // Generate a consistent ID if missing
            const exerciseId = exerciseData.id || exerciseData.uuid || `${targetPlan.id}-ex-${index}`;
            
            return {
              exercise: {
                ...exerciseData,
                id: exerciseId,
                name: exerciseData.name || 'Exercise',
                description: exerciseData.description || '',
                muscleGroups: exerciseData.muscleGroups || exerciseData.muscles || [],
                equipment: exerciseData.equipment || [],
                difficulty: exerciseData.difficulty || 'intermediate',
                instructions: exerciseData.instructions || [],
                imageUrl: exerciseData.imageUrl,
                videoUrl: exerciseData.videoUrl
              },
              sets: ex.sets || 3,
              reps: ex.reps || 10,
              restTime: ex.restTime || ex.rest || 60,
              weight: ex.weight,
              notes: ex.notes
            };
          }),
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

  // Complete individual workout within a plan
  const completeIndividualWorkout = async (planId: string, workoutId: string, rating?: number, notes?: string, duration?: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.patch(`/api/workout-plans/${planId}/workouts/${workoutId}/complete`, {
        rating,
        notes,
        duration
      });

      if (response.data.success) {
        // Update the plan in local state
        setWorkoutPlans(prev => prev.map(plan => 
          plan.id === planId 
            ? {
                ...plan,
                completedWorkouts: response.data.plan.completedWorkouts,
                progressData: response.data.plan.progressData,
                lastWorkoutCompleted: response.data.plan.lastWorkoutCompleted,
                completed: response.data.plan.completed,
                updatedAt: response.data.plan.updatedAt
              }
            : plan
        ));

        // If this is the active plan, update it too
        if (activePlan?.id === planId) {
          setActivePlan(prev => prev ? {
            ...prev,
            completedWorkouts: response.data.plan.completedWorkouts,
            progressData: response.data.plan.progressData,
            lastWorkoutCompleted: response.data.plan.lastWorkoutCompleted,
            completed: response.data.plan.completed,
            updatedAt: response.data.plan.updatedAt
          } : null);
        }

        console.log('Individual workout marked as complete:', {
          planId,
          workoutId,
          progress: response.data.completionStatus.totalProgress
        });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to complete workout';
      setError(errorMessage);
      console.error('Failed to complete individual workout:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Uncomplete individual workout within a plan
  const uncompleteIndividualWorkout = async (planId: string, workoutId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.patch(`/api/workout-plans/${planId}/workouts/${workoutId}/uncomplete`);

      if (response.data.success) {
        // Update the plan in local state
        setWorkoutPlans(prev => prev.map(plan => 
          plan.id === planId 
            ? {
                ...plan,
                completedWorkouts: response.data.plan.completedWorkouts,
                progressData: response.data.plan.progressData,
                completed: response.data.plan.completed,
                updatedAt: response.data.plan.updatedAt
              }
            : plan
        ));

        // If this is the active plan, update it too
        if (activePlan?.id === planId) {
          setActivePlan(prev => prev ? {
            ...prev,
            completedWorkouts: response.data.plan.completedWorkouts,
            progressData: response.data.plan.progressData,
            completed: response.data.plan.completed,
            updatedAt: response.data.plan.updatedAt
          } : null);
        }

        console.log('Individual workout unmarked as complete:', {
          planId,
          workoutId,
          progress: response.data.completionStatus.totalProgress
        });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to uncomplete workout';
      setError(errorMessage);
      console.error('Failed to uncomplete individual workout:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get completion status for a specific workout
  const getWorkoutCompletionStatus = (planId: string, workoutId: string) => {
    const plan = workoutPlans.find(p => p.id === planId);
    if (!plan || !plan.completedWorkouts) {
      return { completed: false };
    }
    
    const completion = plan.completedWorkouts[workoutId];
    return completion || { completed: false };
  };

  // Get detailed progress for a workout plan
  const getWorkoutPlanProgress = async (planId: string) => {
    try {
      const response = await api.get(`/api/workout-plans/${planId}/progress`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch workout plan progress:', error);
      return null;
    }
  };

  return (
    <WorkoutContext.Provider
      value={{
        currentWorkout,
        currentPlan,
        activePlan, // New: single active plan
        trackingWorkout, // New: specific workout being tracked
        workoutHistory,
        workoutPlans,
        loading,
        error,
        setCurrentWorkout,
        setCurrentPlan,
        setActivePlan, // New: set active plan
        setTrackingWorkout, // New: set workout for tracking
        addWorkoutLog,
        getWorkoutHistory,
        getWorkoutProgress,
        generateWorkoutPlan,
        completeWorkout,
        // New individual workout completion functions
        completeIndividualWorkout,
        uncompleteIndividualWorkout,
        getWorkoutCompletionStatus,
        getWorkoutPlanProgress,
        fetchWorkoutPlans,
        deleteWorkoutPlan,
        saveWorkoutPlan, // New: save and set as active
        getTodaysWorkout, // New: get today's workout
        getSmartCTASuggestions // New: smart CTA suggestions
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