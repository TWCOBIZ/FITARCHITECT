import React from 'react';
import { CheckIcon, FireIcon, TrophyIcon } from '@heroicons/react/24/solid';

interface CompletionBadgeProps {
  type: 'completed' | 'streak' | 'achievement';
  value?: number;
  label?: string;
  className?: string;
}

const CompletionBadge: React.FC<CompletionBadgeProps> = ({
  type,
  value,
  label,
  className = ''
}) => {
  const getBadgeConfig = () => {
    switch (type) {
      case 'completed':
        return {
          icon: CheckIcon,
          bgColor: 'bg-green-500',
          textColor: 'text-white',
          iconColor: 'text-white',
          defaultLabel: 'Completed'
        };
      case 'streak':
        return {
          icon: FireIcon,
          bgColor: 'bg-orange-500',
          textColor: 'text-white',
          iconColor: 'text-white',
          defaultLabel: `${value || 0} day streak`
        };
      case 'achievement':
        return {
          icon: TrophyIcon,
          bgColor: 'bg-yellow-500',
          textColor: 'text-white',
          iconColor: 'text-white',
          defaultLabel: 'Achievement'
        };
      default:
        return {
          icon: CheckIcon,
          bgColor: 'bg-gray-500',
          textColor: 'text-white',
          iconColor: 'text-white',
          defaultLabel: 'Badge'
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;
  const displayLabel = label || config.defaultLabel;

  return (
    <div className={`
      inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium
      ${config.bgColor} ${config.textColor} ${className}
      transition-all duration-200 ease-in-out hover:scale-105
    `}>
      <Icon className={`w-3 h-3 ${config.iconColor}`} />
      <span>{displayLabel}</span>
    </div>
  );
};

export default CompletionBadge;