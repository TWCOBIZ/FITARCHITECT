// Export all stores
export { useAuthStore } from './authStore';
export { useWorkoutStore } from './workoutStore';
export { 
  useUIStore, 
  showSuccessNotification, 
  showErrorNotification, 
  showWarningNotification, 
  showInfoNotification 
} from './uiStore';

// Combined store hook for convenience
import { useAuthStore } from './authStore';
import { useWorkoutStore } from './workoutStore';
import { useUIStore } from './uiStore';

export const useStore = () => ({
  auth: useAuthStore(),
  workout: useWorkoutStore(),
  ui: useUIStore()
});

// Store initialization hook
export const useStoreInitialization = () => {
  const checkAuth = useAuthStore(state => state.checkAuth);
  const checkGenerationLimits = useWorkoutStore(state => state.checkGenerationLimits);
  const setTheme = useUIStore(state => state.setTheme);
  
  // Initialize stores on app startup
  const initializeStores = async () => {
    try {
      // Set theme from system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
      
      // Check authentication
      await checkAuth();
      
      // Check workout generation limits if authenticated
      const isAuthenticated = useAuthStore.getState().user !== null;
      if (isAuthenticated) {
        try {
          await checkGenerationLimits();
        } catch (error) {
          // Ignore errors on generation limits check during init
          console.warn('Failed to check generation limits during initialization');
        }
      }
    } catch (error) {
      console.error('Store initialization error:', error);
    }
  };
  
  return { initializeStores };
};