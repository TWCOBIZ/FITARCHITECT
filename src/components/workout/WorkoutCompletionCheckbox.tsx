import React, { useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';

interface WorkoutCompletionCheckboxProps {
  workoutId: string;
  planId: string;
  isCompleted: boolean;
  completedAt?: string;
  rating?: number;
  workoutName: string;
  onComplete: (planId: string, workoutId: string) => Promise<void>;
  onUncomplete: (planId: string, workoutId: string) => Promise<void>;
  disabled?: boolean;
}

const WorkoutCompletionCheckbox: React.FC<WorkoutCompletionCheckboxProps> = ({
  workoutId,
  planId,
  isCompleted,
  completedAt,
  rating,
  workoutName,
  onComplete,
  onUncomplete,
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    try {
      if (isCompleted) {
        await onUncomplete(planId, workoutId);
      } else {
        await onComplete(planId, workoutId);
      }
    } catch (error) {
      console.error('Failed to toggle workout completion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCompletedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="flex items-center space-x-3">
      {/* Completion Checkbox */}
      <button
        onClick={handleToggle}
        disabled={disabled || isLoading}
        className={`
          relative w-6 h-6 rounded-md border-2 transition-all duration-200 ease-in-out
          ${isCompleted 
            ? 'bg-green-500 border-green-500 text-white' 
            : 'border-gray-600 hover:border-gray-400 bg-gray-800'
          }
          ${disabled || isLoading 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer hover:scale-105'
          }
          focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50
        `}
      >
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : isCompleted ? (
          <CheckIcon className="w-4 h-4 absolute inset-0 m-auto text-white" />
        ) : null}
      </button>

      {/* Workout Info */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium transition-colors duration-200 ${
          isCompleted ? 'text-green-400 line-through' : 'text-white'
        }`}>
          {workoutName}
        </div>
        
        {isCompleted && completedAt && (
          <div className="flex items-center space-x-3 mt-1">
            <span className="text-xs text-gray-400">
              Completed {formatCompletedDate(completedAt)}
            </span>
            
            {rating && (
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`text-xs ${
                      star <= rating ? 'text-yellow-400' : 'text-gray-600'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutCompletionCheckbox;