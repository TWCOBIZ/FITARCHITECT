import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number; // Auto-dismiss after this many ms (default: 5000)
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: number;
}

interface LoadingState {
  id: string;
  message: string;
  progress?: number; // 0-100
}

interface Modal {
  id: string;
  component: string;
  props?: Record<string, any>;
  isClosable?: boolean;
}

interface UIState {
  // Global loading
  isLoading: boolean;
  loadingMessage: string;
  loadingStates: LoadingState[];
  
  // Notifications/Toast system
  notifications: Notification[];
  
  // Modals
  activeModal: Modal | null;
  
  // Navigation
  currentPage: string;
  sidebarOpen: boolean;
  
  // Theme and preferences
  theme: 'light' | 'dark';
  
  // Error boundaries
  globalError: string | null;
  
  // Actions
  setLoading: (loading: boolean, message?: string) => void;
  addLoadingState: (id: string, message: string, progress?: number) => void;
  updateLoadingState: (id: string, message?: string, progress?: number) => void;
  removeLoadingState: (id: string) => void;
  
  showNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  showModal: (modal: Omit<Modal, 'id'>) => void;
  closeModal: () => void;
  
  setCurrentPage: (page: string) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  setTheme: (theme: 'light' | 'dark') => void;
  
  setGlobalError: (error: string | null) => void;
  clearError: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useUIStore = create<UIState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      isLoading: false,
      loadingMessage: '',
      loadingStates: [],
      
      notifications: [],
      
      activeModal: null,
      
      currentPage: '/',
      sidebarOpen: false,
      
      theme: 'dark', // Default to dark theme
      
      globalError: null,
      
      // Loading actions
      setLoading: (loading: boolean, message: string = '') => {
        set((state) => {
          state.isLoading = loading;
          state.loadingMessage = message;
        });
      },
      
      addLoadingState: (id: string, message: string, progress?: number) => {
        set((state) => {
          state.loadingStates.push({ id, message, progress });
        });
      },
      
      updateLoadingState: (id: string, message?: string, progress?: number) => {
        set((state) => {
          const loadingState = state.loadingStates.find(ls => ls.id === id);
          if (loadingState) {
            if (message !== undefined) loadingState.message = message;
            if (progress !== undefined) loadingState.progress = progress;
          }
        });
      },
      
      removeLoadingState: (id: string) => {
        set((state) => {
          state.loadingStates = state.loadingStates.filter(ls => ls.id !== id);
        });
      },
      
      // Notification actions
      showNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => {
        const id = generateId();
        const newNotification: Notification = {
          ...notification,
          id,
          createdAt: Date.now(),
          duration: notification.duration ?? 5000
        };
        
        set((state) => {
          state.notifications.push(newNotification);
        });
        
        // Auto-dismiss notification
        if (newNotification.duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, newNotification.duration);
        }
      },
      
      removeNotification: (id: string) => {
        set((state) => {
          state.notifications = state.notifications.filter(n => n.id !== id);
        });
      },
      
      clearNotifications: () => {
        set((state) => {
          state.notifications = [];
        });
      },
      
      // Modal actions
      showModal: (modal: Omit<Modal, 'id'>) => {
        set((state) => {
          state.activeModal = {
            ...modal,
            id: generateId(),
            isClosable: modal.isClosable ?? true
          };
        });
      },
      
      closeModal: () => {
        set((state) => {
          state.activeModal = null;
        });
      },
      
      // Navigation actions
      setCurrentPage: (page: string) => {
        set((state) => {
          state.currentPage = page;
        });
      },
      
      toggleSidebar: () => {
        set((state) => {
          state.sidebarOpen = !state.sidebarOpen;
        });
      },
      
      setSidebarOpen: (open: boolean) => {
        set((state) => {
          state.sidebarOpen = open;
        });
      },
      
      // Theme actions
      setTheme: (theme: 'light' | 'dark') => {
        set((state) => {
          state.theme = theme;
        });
        
        // Apply theme to document
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', theme === 'dark');
        }
      },
      
      // Error actions
      setGlobalError: (error: string | null) => {
        set((state) => {
          state.globalError = error;
        });
      },
      
      clearError: () => {
        set((state) => {
          state.globalError = null;
        });
      }
    })),
    {
      name: 'ui-store'
    }
  )
);

// Notification helper functions
export const showSuccessNotification = (title: string, message: string) => {
  useUIStore.getState().showNotification({
    type: 'success',
    title,
    message
  });
};

export const showErrorNotification = (title: string, message: string) => {
  useUIStore.getState().showNotification({
    type: 'error',
    title,
    message,
    duration: 7000 // Errors stay longer
  });
};

export const showWarningNotification = (title: string, message: string) => {
  useUIStore.getState().showNotification({
    type: 'warning',
    title,
    message
  });
};

export const showInfoNotification = (title: string, message: string) => {
  useUIStore.getState().showNotification({
    type: 'info',
    title,
    message
  });
};