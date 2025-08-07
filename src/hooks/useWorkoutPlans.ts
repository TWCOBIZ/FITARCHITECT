import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { AIGeneratedPlan } from '../contexts/WorkoutContext'
import { toast } from 'react-hot-toast'

// Query Keys
export const workoutKeys = {
  all: ['workouts'] as const,
  plans: () => [...workoutKeys.all, 'plans'] as const,
  plan: (id: string) => [...workoutKeys.plans(), id] as const,
  history: () => [...workoutKeys.all, 'history'] as const,
  logs: () => [...workoutKeys.all, 'logs'] as const,
}

// Fetch workout plans
export function useWorkoutPlans() {
  return useQuery({
    queryKey: workoutKeys.plans(),
    queryFn: async (): Promise<AIGeneratedPlan[]> => {
      const response = await api.get('/api/workout-plans')
      return response.data
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  })
}

// Save workout plan mutation
export function useSaveWorkoutPlan() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (plan: AIGeneratedPlan): Promise<AIGeneratedPlan> => {
      const payload = {
        ...plan,
        isDefault: false,
        completed: false,
      }
      
      const response = await api.post('/api/workout-plans', payload)
      
      return response.data
    },
    onSuccess: (savedPlan) => {
      // Update the cached workout plans
      queryClient.setQueryData<AIGeneratedPlan[]>(workoutKeys.plans(), (old) => {
        return old ? [...old, savedPlan] : [savedPlan]
      })
      
      toast.success('Workout plan saved successfully! 🎉')
    },
    onError: (error) => {
      console.error('Failed to save workout plan:', error)
      toast.error('Failed to save workout plan. Please try again.')
    },
  })
}

// Delete workout plan mutation
export function useDeleteWorkoutPlan() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (planId: string): Promise<void> => {
      await api.delete(`/api/workout-plans/${planId}`)
    },
    onSuccess: (_, planId) => {
      // Remove the deleted plan from cache
      queryClient.setQueryData<AIGeneratedPlan[]>(workoutKeys.plans(), (old) => {
        return old ? old.filter(plan => plan.id !== planId) : []
      })
      
      toast.success('Workout plan deleted successfully')
    },
    onError: (error) => {
      console.error('Failed to delete workout plan:', error)
      toast.error('Failed to delete workout plan. Please try again.')
    },
  })
}

// Mark workout plan as complete mutation
export function useCompleteWorkoutPlan() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (planId: string): Promise<AIGeneratedPlan> => {
      const response = await api.patch('/api/workout-plans', 
        { id: planId, completed: true }
      )
      return response.data
    },
    onSuccess: (completedPlan) => {
      // Update the specific plan in cache
      queryClient.setQueryData<AIGeneratedPlan[]>(workoutKeys.plans(), (old) => {
        return old ? old.map(plan => 
          plan.id === completedPlan.id 
            ? { ...plan, completed: true } 
            : plan
        ) : []
      })
      
      toast.success('Workout plan completed! 🎉')
    },
    onError: (error) => {
      console.error('Failed to complete workout plan:', error)
      toast.error('Failed to mark workout plan as complete. Please try again.')
    },
  })
}

// Generate workout plan mutation
export function useGenerateWorkoutPlan() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (userProfile: any): Promise<AIGeneratedPlan> => {
      const response = await api.post('/api/workout-plans/generate', 
        { userProfile }
      )
      return response.data
    },
    onSuccess: (newPlan) => {
      // Add the new plan to cache
      queryClient.setQueryData<AIGeneratedPlan[]>(workoutKeys.plans(), (old) => {
        return old ? [...old, newPlan] : [newPlan]
      })
      
      toast.success('Workout plan generated successfully! 🎉')
    },
    onError: (error) => {
      console.error('Failed to generate workout plan:', error)
      toast.error('Failed to generate workout plan. Please try again.')
    },
  })
}