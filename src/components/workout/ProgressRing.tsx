import React from 'react';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number; // diameter in pixels
  strokeWidth?: number;
  showPercentage?: boolean;
  className?: string;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 60,
  strokeWidth = 4,
  showPercentage = true,
  className = ''
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Color based on progress
  const getProgressColor = (progress: number) => {
    if (progress === 100) return '#10b981'; // green-500
    if (progress >= 75) return '#3b82f6'; // blue-500
    if (progress >= 50) return '#f59e0b'; // amber-500
    if (progress >= 25) return '#ef4444'; // red-500
    return '#6b7280'; // gray-500
  };

  const progressColor = getProgressColor(progress);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#374151" // gray-700
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      
      {/* Percentage text */}
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span 
            className="text-xs font-semibold text-white"
            style={{ fontSize: `${size / 5}px` }}
          >
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default ProgressRing;