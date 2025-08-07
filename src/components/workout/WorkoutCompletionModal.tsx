import React, { useState, useEffect, useCallback } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface WorkoutCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (rating?: number, notes?: string, duration?: number) => Promise<void>;
  workoutName: string;
  loading?: boolean;
}

const WorkoutCompletionModal: React.FC<WorkoutCompletionModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  workoutName,
  loading = false
}) => {
  const [rating, setRating] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(10);
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null);

  // Clear auto-close timer when user interacts
  const clearAutoCloseTimer = useCallback(() => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      setAutoCloseTimer(null);
    }
  }, [autoCloseTimer]);

  const handleSubmit = async () => {
    clearAutoCloseTimer();
    try {
      await onComplete(
        rating > 0 ? rating : undefined,
        notes.trim() || undefined,
        duration ? parseInt(duration) : undefined
      );
      
      // Reset form
      setRating(0);
      setNotes('');
      setDuration('');
      setTimeRemaining(10);
      onClose();
    } catch (error) {
      console.error('Failed to complete workout:', error);
    }
  };

  const handleQuickComplete = async () => {
    clearAutoCloseTimer();
    try {
      await onComplete();
      onClose();
    } catch (error) {
      console.error('Failed to complete workout:', error);
    }
  };

  const handleClose = () => {
    clearAutoCloseTimer();
    setRating(0);
    setNotes('');
    setDuration('');
    setTimeRemaining(10);
    onClose();
  };

  // Auto-dismiss functionality
  useEffect(() => {
    if (isOpen && !loading) {
      setTimeRemaining(10);
      
      // Start countdown timer
      const countdownInterval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto-close timer
      const timer = setTimeout(() => {
        console.log('WorkoutCompletionModal: Auto-closing after 10 seconds');
        handleQuickComplete();
      }, 10000);

      setAutoCloseTimer(timer);

      return () => {
        clearInterval(countdownInterval);
        clearTimeout(timer);
      };
    } else {
      clearAutoCloseTimer();
    }
  }, [isOpen, loading]);

  // Clear timer when component unmounts
  useEffect(() => {
    return () => {
      clearAutoCloseTimer();
    };
  }, [clearAutoCloseTimer]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-4 sm:p-8 md:p-6 lg:p-6 w-full max-w-md mx-4 border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-xl md:text-lg font-semibold text-white">Complete Workout</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] md:min-h-[44px] md:min-w-[44px] flex items-center justify-center"
            disabled={loading}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Auto-close countdown indicator */}
        {!loading && timeRemaining > 0 && (
          <div className="mb-4 bg-gray-800 rounded-lg p-3 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-base md:text-sm text-gray-300">Auto-closing in {timeRemaining}s</span>
              <button
                onClick={clearAutoCloseTimer}
                className="text-xs sm:text-sm md:text-xs text-blue-400 hover:text-blue-300 underline min-h-[44px] sm:min-h-[48px] md:min-h-[44px] flex items-center"
              >
                Cancel auto-close
              </button>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(timeRemaining / 10) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Workout Name */}
        <div className="mb-6">
          <p className="text-gray-300 text-xs sm:text-base md:text-sm mb-1">Workout:</p>
          <p className="text-white font-medium text-sm sm:text-lg md:text-base">{workoutName}</p>
        </div>

        {/* Rating */}
        <div className="mb-4">
          <label className="block text-xs sm:text-base md:text-sm font-medium text-gray-300 mb-2">
            How did it go? (optional)
          </label>
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => {
                  setRating(star);
                  clearAutoCloseTimer();
                }}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className={`text-xl sm:text-3xl md:text-2xl transition-colors min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] md:min-h-[44px] md:min-w-[44px] flex items-center justify-center ${
                  star <= (hoveredRating || rating)
                    ? 'text-yellow-400'
                    : 'text-gray-600 hover:text-gray-400'
                }`}
                disabled={loading}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="mb-4">
          <label className="block text-xs sm:text-base md:text-sm font-medium text-gray-300 mb-2">
            Duration (minutes) - optional
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => {
              setDuration(e.target.value);
              clearAutoCloseTimer();
            }}
            onFocus={clearAutoCloseTimer}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] sm:min-h-[48px] md:min-h-[44px] text-sm sm:text-base md:text-sm"
            placeholder="e.g., 30"
            min="1"
            max="300"
            disabled={loading}
          />
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-xs sm:text-base md:text-sm font-medium text-gray-300 mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              clearAutoCloseTimer();
            }}
            onFocus={clearAutoCloseTimer}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm sm:text-base md:text-sm"
            placeholder="How did the workout feel? Any observations..."
            rows={3}
            maxLength={500}
            disabled={loading}
          />
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={handleQuickComplete}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:min-h-[48px] md:min-h-[44px] text-sm sm:text-base md:text-sm"
            disabled={loading}
          >
            {loading ? 'Completing...' : 'Quick Complete'}
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:min-h-[48px] md:min-h-[44px] text-sm sm:text-base md:text-sm"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Complete with Details'}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-3 px-4 py-2 text-gray-400 hover:text-white transition-colors text-xs sm:text-base md:text-sm min-h-[44px] sm:min-h-[48px] md:min-h-[44px]"
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default WorkoutCompletionModal;