import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { api } from '../services/api';
import type { User } from '../types/user';

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  
  // Profile helpers
  isProfileComplete: () => boolean;
  getSubscriptionTier: () => string;
  hasFeatureAccess: (feature: string) => boolean;
}

// Feature access rules
const featureRules = {
  'workout-generation': { tier: 'basic', parq: true },
  'nutrition-tracking': { tier: 'free', parq: false },
  'meal-planning': { tier: 'free', parq: false },
  'barcode-scanning': { tier: 'premium', parq: false },
  'telegram-notifications': { tier: 'premium', parq: false },
  'analytics': { tier: 'free', parq: false }
} as const;

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        user: null,
        token: null,
        isLoading: false,
        error: null,
        isInitialized: false,
        
        // Authentication actions
        login: async (email: string, password: string) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });
          
          try {
            const response = await api.post('/api/login', { email, password });
            
            if (response.data.success) {
              const { token, user } = response.data;
              
              set((state) => {
                state.user = user;
                state.token = token;
                state.isLoading = false;
                state.error = null;
              });
              
              // Set axios default header
              api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            } else {
              throw new Error(response.data.error || 'Login failed');
            }
          } catch (error: any) {
            set((state) => {
              state.error = error.response?.data?.error || error.message || 'Login failed';
              state.isLoading = false;
            });
            throw error;
          }
        },
        
        register: async (email: string, password: string, name: string) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });
          
          try {
            const response = await api.post('/api/register', { email, password, name });
            
            if (response.data.success) {
              const { token, user } = response.data;
              
              set((state) => {
                state.user = user;
                state.token = token;
                state.isLoading = false;
                state.error = null;
              });
              
              // Set axios default header
              api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            } else {
              throw new Error(response.data.error || 'Registration failed');
            }
          } catch (error: any) {
            set((state) => {
              state.error = error.response?.data?.error || error.message || 'Registration failed';
              state.isLoading = false;
            });
            throw error;
          }
        },
        
        logout: () => {
          set((state) => {
            state.user = null;
            state.token = null;
            state.error = null;
          });
          
          delete api.defaults.headers.common['Authorization'];
          
          // Call logout endpoint to invalidate token server-side
          api.post('/api/logout').catch(() => {
            // Ignore errors on logout endpoint
          });
        },
        
        updateProfile: async (data: Partial<User>) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });
          
          try {
            const response = await api.put('/api/profile', data);
            
            if (response.data.success) {
              set((state) => {
                if (state.user) {
                  Object.assign(state.user, response.data.user);
                }
                state.isLoading = false;
              });
            } else {
              throw new Error(response.data.error || 'Profile update failed');
            }
          } catch (error: any) {
            set((state) => {
              state.error = error.response?.data?.error || error.message || 'Profile update failed';
              state.isLoading = false;
            });
            throw error;
          }
        },
        
        checkAuth: async () => {
          const token = get().token;
          
          if (!token) {
            set((state) => {
              state.isInitialized = true;
            });
            return;
          }
          
          set((state) => {
            state.isLoading = true;
          });
          
          try {
            // Set token for request
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            const response = await api.get('/api/profile');
            
            if (response.data.success) {
              set((state) => {
                state.user = response.data.user;
                state.isLoading = false;
                state.isInitialized = true;
                state.error = null;
              });
            } else {
              throw new Error('Invalid token');
            }
          } catch (error) {
            // Token is invalid, clear auth state
            set((state) => {
              state.user = null;
              state.token = null;
              state.isLoading = false;
              state.isInitialized = true;
              state.error = null;
            });
            
            delete api.defaults.headers.common['Authorization'];
          }
        },
        
        clearError: () => {
          set((state) => {
            state.error = null;
          });
        },
        
        setLoading: (loading: boolean) => {
          set((state) => {
            state.isLoading = loading;
          });
        },
        
        // Profile helpers
        isProfileComplete: () => {
          const user = get().user;
          if (!user) return false;
          
          const requiredFields = ['age', 'weight', 'height', 'fitnessLevel'];
          return requiredFields.every(field => {
            const value = user[field as keyof User];
            return value !== null && value !== undefined && value !== '';
          });
        },
        
        getSubscriptionTier: () => {
          const user = get().user;
          return user?.tier || 'free';
        },
        
        hasFeatureAccess: (feature: string) => {
          const user = get().user;
          if (!user) return false;
          
          const rule = featureRules[feature as keyof typeof featureRules];
          if (!rule) return false;
          
          // Check subscription tier
          const tierHierarchy = ['guest', 'free', 'basic', 'premium'];
          const userTierLevel = tierHierarchy.indexOf(user.tier);
          const requiredTierLevel = tierHierarchy.indexOf(rule.tier);
          
          if (userTierLevel < requiredTierLevel) return false;
          
          // Check PAR-Q requirement
          if (rule.parq && !user.parqCompleted) return false;
          
          return true;
        }
      })),
      {
        name: 'auth-storage',
        partialize: (state) => ({ 
          token: state.token,
          user: state.user 
        })
      }
    ),
    {
      name: 'auth-store'
    }
  )
);