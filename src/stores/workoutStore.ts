import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { api } from '../services/api';
import type { WorkoutPlan, Workout } from '../types/workout';

interface WorkoutPreferences {
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  equipment: string[];
  duration: number;
  daysPerWeek: number;
}

interface WorkoutState {
  // Current state
  currentPlan: WorkoutPlan | null;
  workoutHistory: WorkoutPlan[];
  currentWorkout: Workout | null;
  
  // Generation state
  isGenerating: boolean;
  generationProgress: number;
  generationMessage: string;
  generationError: string | null;
  
  // Generation limits
  remainingGenerations: number;
  maxGenerations: number;
  canGenerate: boolean;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  generateWorkout: (preferences: WorkoutPreferences) => Promise<WorkoutPlan>;
  checkGenerationLimits: () => Promise<void>;
  getWorkoutHistory: () => Promise<void>;
  getWorkoutPlan: (planId: string) => Promise<WorkoutPlan>;
  deleteWorkoutPlan: (planId: string) => Promise<void>;
  setCurrentWorkout: (workout: Workout | null) => void;
  clearError: () => void;
  resetGenerationState: () => void;
}

export const useWorkoutStore = create<WorkoutState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      currentPlan: null,
      workoutHistory: [],
      currentWorkout: null,
      
      // Generation state
      isGenerating: false,
      generationProgress: 0,
      generationMessage: '',
      generationError: null,
      
      // Generation limits
      remainingGenerations: 0,
      maxGenerations: 0,
      canGenerate: false,
      
      // Loading states
      isLoading: false,
      error: null,
      
      // Actions
      generateWorkout: async (preferences: WorkoutPreferences) => {
        set((state) => {
          state.isGenerating = true;
          state.generationProgress = 0;
          state.generationMessage = 'Preparing workout generation...';
          state.generationError = null;
          state.error = null;
        });
        
        try {
          // Step 1: Check generation limits first
          set((state) => {
            state.generationProgress = 10;
            state.generationMessage = 'Checking generation limits...';
          });
          
          await get().checkGenerationLimits();
          
          if (!get().canGenerate) {
            throw new Error(`Generation limit reached. You have ${get().remainingGenerations} generations remaining today.`);
          }
          
          // Step 2: Start workout generation
          set((state) => {
            state.generationProgress = 25;
            state.generationMessage = 'Analyzing your preferences...';
          });
          
          // Add slight delay to show progress
          await new Promise(resolve => setTimeout(resolve, 500));
          
          set((state) => {
            state.generationProgress = 50;
            state.generationMessage = 'Creating personalized workout...';
          });
          
          // Call backend workout generation endpoint
          const response = await api.post('/api/workout-plans/generate', {
            preferences
          });
          
          if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to generate workout');
          }
          
          set((state) => {
            state.generationProgress = 90;
            state.generationMessage = 'Finalizing your workout plan...';
          });
          
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const workoutPlan = response.data.workoutPlan;
          
          set((state) => {
            state.currentPlan = workoutPlan;
            state.workoutHistory = [workoutPlan, ...state.workoutHistory.slice(0, 19)]; // Keep last 20
            state.isGenerating = false;
            state.generationProgress = 100;
            state.generationMessage = 'Workout generated successfully!';
            
            // Update generation limits
            if (state.remainingGenerations > 0) {
              state.remainingGenerations--;
            }
            state.canGenerate = state.remainingGenerations > 0;
          });
          
          // Show success message briefly
          setTimeout(() => {
            set((state) => {
              state.generationMessage = '';
              state.generationProgress = 0;
            });
          }, 2000);
          
          return workoutPlan;
          
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || 'Failed to generate workout';
          
          set((state) => {
            state.isGenerating = false;
            state.generationError = errorMessage;
            state.generationProgress = 0;
            state.generationMessage = '';
          });
          
          // If the backend returned a fallback workout, handle it
          if (error.response?.data?.workoutPlan) {
            const fallbackPlan = error.response.data.workoutPlan;
            set((state) => {
              state.currentPlan = fallbackPlan;
              state.workoutHistory = [fallbackPlan, ...state.workoutHistory.slice(0, 19)];
              state.generationMessage = error.response.data.message || 'Using template workout - AI service temporarily unavailable';
            });
            
            setTimeout(() => {
              set((state) => {
                state.generationMessage = '';
              });
            }, 3000);
            
            return fallbackPlan;
          }
          
          throw error;
        }
      },
      
      checkGenerationLimits: async () => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });
        
        try {
          const response = await api.get('/api/workout-plans/check-free-generation');
          
          if (response.data.success) {
            const { canGenerate, remainingGenerations, maxGenerations } = response.data;
            
            set((state) => {
              state.canGenerate = canGenerate;
              state.remainingGenerations = remainingGenerations;
              state.maxGenerations = maxGenerations || 1;
              state.isLoading = false;
            });
          } else {
            throw new Error(response.data.error || 'Failed to check generation limits');
          }
        } catch (error: any) {
          set((state) => {
            state.error = error.response?.data?.error || error.message || 'Failed to check generation limits';
            state.isLoading = false;
            // Default to no generation allowed on error
            state.canGenerate = false;
            state.remainingGenerations = 0;
          });
          throw error;
        }
      },
      
      getWorkoutHistory: async () => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });
        
        try {
          const response = await api.get('/api/workout-plans');
          
          if (response.data.success) {
            set((state) => {
              state.workoutHistory = response.data.workoutPlans;
              state.isLoading = false;
            });
          } else {
            throw new Error(response.data.error || 'Failed to load workout history');
          }
        } catch (error: any) {
          set((state) => {
            state.error = error.response?.data?.error || error.message || 'Failed to load workout history';
            state.isLoading = false;
          });
          throw error;
        }
      },
      
      getWorkoutPlan: async (planId: string) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });
        
        try {
          const response = await api.get(`/api/workout-plans/${planId}`);
          
          if (response.data.success) {
            const workoutPlan = response.data.workoutPlan;
            
            set((state) => {
              state.currentPlan = workoutPlan;
              state.isLoading = false;
            });
            
            return workoutPlan;
          } else {
            throw new Error(response.data.error || 'Failed to load workout plan');
          }
        } catch (error: any) {
          set((state) => {
            state.error = error.response?.data?.error || error.message || 'Failed to load workout plan';
            state.isLoading = false;
          });
          throw error;
        }
      },
      
      deleteWorkoutPlan: async (planId: string) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });
        
        try {
          const response = await api.delete(`/api/workout-plans/${planId}`);
          
          if (response.data.success) {
            set((state) => {
              state.workoutHistory = state.workoutHistory.filter(plan => plan.id !== planId);
              if (state.currentPlan?.id === planId) {
                state.currentPlan = null;
              }
              state.isLoading = false;
            });
          } else {
            throw new Error(response.data.error || 'Failed to delete workout plan');
          }
        } catch (error: any) {
          set((state) => {
            state.error = error.response?.data?.error || error.message || 'Failed to delete workout plan';
            state.isLoading = false;
          });
          throw error;
        }
      },
      
      setCurrentWorkout: (workout: Workout | null) => {
        set((state) => {
          state.currentWorkout = workout;
        });
      },
      
      clearError: () => {
        set((state) => {
          state.error = null;
          state.generationError = null;
        });
      },
      
      resetGenerationState: () => {
        set((state) => {
          state.isGenerating = false;
          state.generationProgress = 0;
          state.generationMessage = '';
          state.generationError = null;
        });
      }
    })),
    {
      name: 'workout-store'
    }
  )
);