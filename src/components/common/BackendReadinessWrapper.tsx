import React, { useEffect, useState } from 'react';
import { backendHealthCheck } from '../../utils/backendHealthCheck';
import LoadingSpinner from './LoadingSpinner';

interface BackendReadinessWrapperProps {
  children: React.ReactNode;
}

export const BackendReadinessWrapper: React.FC<BackendReadinessWrapperProps> = ({ children }) => {
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const checkBackend = async () => {
      console.log('BackendReadinessWrapper: Starting backend check...');
      setIsChecking(true);
      setError(null);
      
      try {
        const status = await backendHealthCheck.waitForBackend(5, 2000); // 5 retries, 2 second delay
        console.log('BackendReadinessWrapper: Backend check result:', status);
        setIsBackendReady(status.isReady);
        
        if (!status.isReady) {
          setError(status.message || 'Backend is not available');
        }
      } catch (err) {
        console.error('BackendReadinessWrapper: Backend check failed:', err);
        setError('Unable to connect to backend services');
        setIsBackendReady(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkBackend();
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  if (isChecking) {
    console.log('BackendReadinessWrapper: Showing loading screen');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900">
        <LoadingSpinner size="xl" color="white" text="Connecting to backend services..." />
        <p className="text-gray-400 mt-4 text-sm">This may take a few seconds on first load</p>
      </div>
    );
  }

  if (!isBackendReady && error) {
    console.log('BackendReadinessWrapper: Showing error screen:', error);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h2 className="text-xl font-semibold text-white mb-3">Connection Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          
          <button
            onClick={handleRetry}
            className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Retry Connection
          </button>
          
          <p className="text-sm text-gray-500 mt-4">
            If the problem persists, please check your internet connection or try again later.
          </p>
        </div>
      </div>
    );
  }

  console.log('BackendReadinessWrapper: Backend is ready, rendering app');
  return <>{children}</>;
};