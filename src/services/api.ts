import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'
import { toast } from 'react-hot-toast'
import { backendHealthCheck } from '../utils/backendHealthCheck'

// Extend AxiosRequestConfig to add retry count
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  __retryCount?: number
  __isRetry?: boolean
  skipErrorToast?: boolean
  skipHealthCheck?: boolean
}

// Create axios instance with enhanced configuration  
const getApiBaseUrl = () => {
  // 1. First check runtime config (set during deployment)
  const runtimeApiUrl = (window as any).__RUNTIME_CONFIG__?.API_URL;
  if (runtimeApiUrl && runtimeApiUrl !== 'VITE_API_URL_PLACEHOLDER') {
    console.log('Using runtime config API URL:', runtimeApiUrl);
    return runtimeApiUrl;
  }
  
  // 2. Check build-time environment variable
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) {
    console.log('Using build-time API URL:', envApiUrl);
    return envApiUrl;
  }
  
  // 3. Production fallback - use production backend URL, never localhost
  if (import.meta.env.PROD) {
    const productionUrl = 'https://fitarchitect-production.up.railway.app';
    console.log('Using production fallback API URL:', productionUrl);
    return productionUrl;
  }
  
  // 4. Development fallback
  const developmentUrl = 'http://localhost:3001';
  console.log('Using development API URL:', developmentUrl);
  return developmentUrl;
};

const api: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config: ExtendedAxiosRequestConfig) => {
    // Skip health check for health endpoint itself or if explicitly skipped
    const shouldSkipHealthCheck = config.url?.includes('/health') || 
                                 config.skipHealthCheck === true ||
                                 backendHealthCheck.isReady();
    
    if (!shouldSkipHealthCheck) {
      // Ensure backend is ready before making requests
      try {
        await backendHealthCheck.ensureReady()
      } catch (error) {
        console.log('Backend not ready, request will be retried:', config.url)
      }
    }
    
    // Check both regular and admin tokens, but don't overwrite existing Authorization header
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken')
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add request ID for tracking
    config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET']
}

// Helper function to determine if error is retryable
const isRetryableError = (error: AxiosError): boolean => {
  // Network errors
  if (!error.response && error.code && RETRY_CONFIG.retryableErrors.includes(error.code)) {
    return true
  }
  
  // HTTP status errors
  if (error.response && RETRY_CONFIG.retryableStatuses.includes(error.response.status)) {
    return true
  }
  
  return false
}

// Calculate retry delay with exponential backoff and jitter
const calculateRetryDelay = (retryCount: number, error: AxiosError): number => {
  let delay = RETRY_CONFIG.retryDelay * Math.pow(2, retryCount)
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay
  delay += jitter
  
  // Check for Retry-After header
  if (error.response?.headers['retry-after']) {
    const retryAfter = parseInt(error.response.headers['retry-after'])
    if (!isNaN(retryAfter)) {
      delay = Math.max(delay, retryAfter * 1000)
    }
  }
  
  return Math.min(delay, 30000) // Cap at 30 seconds
}

// Response interceptor with retry logic and error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as ExtendedAxiosRequestConfig
    
    if (!config) {
      return Promise.reject(error)
    }
    
    // Initialize retry count
    config.__retryCount = config.__retryCount || 0
    
    // Check if we should retry
    if (config.__retryCount < RETRY_CONFIG.maxRetries && isRetryableError(error)) {
      config.__retryCount++
      config.__isRetry = true
      
      const delay = calculateRetryDelay(config.__retryCount, error)
      
      console.log(`Retrying request (attempt ${config.__retryCount}/${RETRY_CONFIG.maxRetries}) after ${Math.round(delay)}ms`)
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Retry the request
      return api(config)
    }
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      // Don't clear auth data for login/register endpoints - let them handle their own errors
      const isAuthEndpoint = error.config?.url?.includes('/api/login') || 
                            error.config?.url?.includes('/api/register') ||
                            error.config?.url?.includes('/api/guest-register') ||
                            error.config?.url?.includes('/api/admin/login')
      
      if (!isAuthEndpoint) {
        console.log('Authentication error detected - clearing auth data')
        
        // Clear auth data (both regular and admin tokens)
        localStorage.removeItem('token')
        localStorage.removeItem('adminToken')
        localStorage.removeItem('user')
        
        // Don't redirect during app initialization or if already on auth pages
        const isAuthPage = window.location.pathname.includes('/login') || 
                          window.location.pathname.includes('/register') ||
                          window.location.pathname.includes('/dashboard')
        
        // Only redirect if not on auth pages and not during initial load
        if (!isAuthPage && document.readyState === 'complete') {
          console.log('Redirecting to login due to authentication error')
          window.location.href = '/login'
        }
      }
    }
    
    // Show user-friendly error messages
    if (!config.skipErrorToast) {
      let errorMessage = 'An error occurred. Please try again.'
      
      // Don't show toast for authentication errors during app initialization
      const isAuthError = error.response?.status === 401
      const isAppStartup = window.location.pathname === '/' || window.location.pathname === '/dashboard'
      
      if (isAuthError && isAppStartup) {
        // Silent authentication errors during startup
        console.log('Authentication error during app startup - not showing toast')
      } else {
        if (error.response?.data) {
          const data = error.response.data as any
          errorMessage = data.error || data.message || errorMessage
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = 'Request timed out. Please check your connection and try again.'
        } else if (!navigator.onLine) {
          errorMessage = 'No internet connection. Please check your connection and try again.'
        }
        
        toast.error(errorMessage)
      }
    }
    
    return Promise.reject(error)
  }
)

// Helper function to handle API responses
export const handleApiResponse = async <T>(
  promise: Promise<any>,
  options?: {
    successMessage?: string
    errorMessage?: string
    skipErrorToast?: boolean
  }
): Promise<T | null> => {
  try {
    const response = await promise
    
    if (options?.successMessage) {
      toast.success(options.successMessage)
    }
    
    return response.data
  } catch (error) {
    if (!options?.skipErrorToast) {
      const errorMsg = options?.errorMessage || 'Operation failed. Please try again.'
      console.error(errorMsg, error)
    }
    return null
  }
}

// Utility functions for common API patterns
export const apiHelpers = {
  // GET request with caching
  getCached: async <T>(url: string, cacheKey: string, cacheDuration = 5 * 60 * 1000): Promise<T | null> => {
    // Check cache first
    const cached = localStorage.getItem(`api_cache_${cacheKey}`)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < cacheDuration) {
        return data
      }
    }
    
    // Fetch fresh data
    const result = await handleApiResponse<T>(api.get(url))
    
    if (result) {
      // Cache the result
      localStorage.setItem(`api_cache_${cacheKey}`, JSON.stringify({
        data: result,
        timestamp: Date.now()
      }))
    }
    
    return result
  },
  
  // Clear cache for a specific key
  clearCache: (cacheKey: string) => {
    localStorage.removeItem(`api_cache_${cacheKey}`)
  },
  
  // Batch requests
  batch: async (requests: Array<() => Promise<any>>): Promise<any[]> => {
    return Promise.all(requests.map(req => req()))
  },
  
  // Request with progress tracking
  withProgress: async <T>(
    config: AxiosRequestConfig,
    onProgress: (progress: number) => void
  ): Promise<T | null> => {
    const enhancedConfig: AxiosRequestConfig = {
      ...config,
      onUploadProgress: (progressEvent) => {
        const progress = progressEvent.total
          ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
          : 0
        onProgress(progress)
      }
    }
    
    return handleApiResponse<T>(api(enhancedConfig))
  }
}

// Export configured axios instance
export { api }

// Export common HTTP methods with proper typing
export const apiService = {
  get: <T = any>(url: string, config?: ExtendedAxiosRequestConfig) => 
    api.get<T>(url, config),
  
  post: <T = any>(url: string, data?: any, config?: ExtendedAxiosRequestConfig) => 
    api.post<T>(url, data, config),
  
  put: <T = any>(url: string, data?: any, config?: ExtendedAxiosRequestConfig) => 
    api.put<T>(url, data, config),
  
  patch: <T = any>(url: string, data?: any, config?: ExtendedAxiosRequestConfig) => 
    api.patch<T>(url, data, config),
  
  delete: <T = any>(url: string, config?: ExtendedAxiosRequestConfig) => 
    api.delete<T>(url, config)
}