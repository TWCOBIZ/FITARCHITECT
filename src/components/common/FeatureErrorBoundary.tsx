import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useUIStore } from '../../stores';
import { toast } from 'react-hot-toast';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  featureName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Feature Error Boundary caught error:', error, errorInfo);
    
    // Log to error tracking service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        extra: {
          errorInfo,
          featureName: this.props.featureName
        }
      });
    }
    
    // Report error to admin endpoints
    this.reportErrorToAdmin(error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = async () => {
    this.setState({ isRetrying: true });
    
    // Exponential backoff retry delay
    const retryDelay = Math.min(1000 * Math.pow(2, this.state.retryCount), 8000);
    
    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: this.state.retryCount + 1,
        isRetrying: false
      });
    }, retryDelay);
  };

  reportErrorToAdmin = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('authToken');
      if (!token) return;

      await fetch('/api/admin/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          errorType: 'frontend_boundary',
          severity: 'medium',
          endpoint: window.location.pathname,
          userAgent: navigator.userAgent,
          requestBody: {
            featureName: this.props.featureName,
            componentStack: errorInfo.componentStack,
            retryCount: this.state.retryCount
          }
        })
      });
    } catch (reportError) {
      console.error('Failed to report error to admin:', reportError);
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-red-400 font-medium">
                  {this.props.featureName 
                    ? `Error in ${this.props.featureName}`
                    : 'Something went wrong'}
                </h3>
                <p className="mt-2 text-sm text-gray-400">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mt-3">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                      Technical details
                    </summary>
                    <pre className="mt-2 text-xs text-gray-500 overflow-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={this.handleReset}
                    disabled={this.state.isRetrying}
                    className="px-3 py-1 text-sm bg-red-800 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {this.state.isRetrying ? 'Retrying...' : `Try again${this.state.retryCount > 0 ? ` (${this.state.retryCount + 1})` : ''}`}
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-3 py-1 text-sm bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
                  >
                    Refresh page
                  </button>
                  {this.state.retryCount >= 3 && (
                    <button
                      onClick={() => {
                        toast.error('Error reported to support team');
                        this.reportErrorToAdmin(this.state.error!, this.state.errorInfo!);
                      }}
                      className="px-3 py-1 text-sm bg-yellow-800 text-yellow-200 rounded hover:bg-yellow-700 transition-colors"
                    >
                      Report issue
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional component wrapper to use hooks
export const FeatureErrorBoundary: React.FC<Props> = (props) => {
  return <ErrorBoundaryClass {...props} />;
};

// Hook for error handling in functional components
export const useErrorHandler = () => {
  const { showNotification } = useUIStore();
  
  const handleError = async (error: Error, context?: string, canRetry: boolean = false) => {
    console.error(`Error in ${context || 'component'}:`, error);
    
    // Show user-friendly notification
    showNotification({
      type: 'error',
      title: 'Error',
      message: error.message || 'An unexpected error occurred',
      duration: 7000
    });
    
    // Report to admin endpoint
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('authToken');
      if (token) {
        await fetch('/api/admin/errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            message: error.message,
            stack: error.stack,
            errorType: 'frontend_hook',
            severity: 'medium',
            endpoint: window.location.pathname,
            userAgent: navigator.userAgent,
            requestBody: {
              context,
              canRetry,
              timestamp: new Date().toISOString()
            }
          })
        });
      }
    } catch (reportError) {
      console.error('Failed to report error to admin:', reportError);
    }
    
    // Log to error tracking
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        extra: { context, canRetry }
      });
    }
  };
  
  // Helper for API call error handling with retry logic
  const handleApiError = async (error: Error, endpoint: string, retryFn?: () => Promise<any>, maxRetries: number = 3) => {
    console.error(`API Error on ${endpoint}:`, error);
    
    let retryCount = 0;
    const attemptRetry = async (): Promise<any> => {
      if (!retryFn || retryCount >= maxRetries) {
        await handleError(error, `API: ${endpoint}`, false);
        throw error;
      }
      
      try {
        retryCount++;
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 8000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        toast.loading(`Retrying... (${retryCount}/${maxRetries})`, { duration: 2000 });
        return await retryFn();
      } catch (retryError) {
        if (retryCount >= maxRetries) {
          await handleError(retryError as Error, `API: ${endpoint} (failed after ${maxRetries} retries)`, false);
          throw retryError;
        }
        return attemptRetry();
      }
    };
    
    return attemptRetry();
  };
  
  return { handleError, handleApiError };
};

// Utility for wrapping async functions with error handling
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) => {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      const { handleError } = useErrorHandler();
      await handleError(error as Error, context, true);
      return null;
    }
  };
};