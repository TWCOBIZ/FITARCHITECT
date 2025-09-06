import React from 'react';
import { useUIStore } from '../../stores';

export const LoadingOverlay: React.FC = () => {
  const { isLoading, loadingMessage, loadingStates } = useUIStore();
  
  // Don't show if not loading and no loading states
  if (!isLoading && loadingStates.length === 0) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-900 rounded-lg p-6 max-w-sm w-full mx-4 border border-gray-800">
        <div className="flex flex-col items-center">
          {/* Spinner */}
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-6 w-6 bg-gray-900 rounded-full"></div>
            </div>
          </div>
          
          {/* Loading message */}
          {loadingMessage && (
            <p className="mt-4 text-white text-center font-medium">
              {loadingMessage}
            </p>
          )}
          
          {/* Loading states with progress */}
          {loadingStates.length > 0 && (
            <div className="mt-4 w-full space-y-3">
              {loadingStates.map((state) => (
                <div key={state.id} className="space-y-1">
                  <p className="text-sm text-gray-400">{state.message}</p>
                  {state.progress !== undefined && (
                    <div className="w-full bg-gray-800 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${state.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Component for inline loading states (non-blocking)
export const InlineLoader: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex items-center space-x-2 text-gray-400">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
      <span className="text-sm">{message}</span>
    </div>
  );
};

// Skeleton loader for content placeholders
export const SkeletonLoader: React.FC<{ 
  lines?: number;
  className?: string;
}> = ({ lines = 3, className = '' }) => {
  return (
    <div className={`animate-pulse space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className="h-4 bg-gray-800 rounded"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
};

// Loading button component
export const LoadingButton: React.FC<{
  isLoading: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  loadingText?: string;
  disabled?: boolean;
}> = ({ 
  isLoading, 
  onClick, 
  children, 
  className = '',
  loadingText = 'Processing...',
  disabled = false
}) => {
  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`
        relative flex items-center justify-center
        px-4 py-2 rounded-lg font-medium
        transition-all duration-200
        ${isLoading || disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};