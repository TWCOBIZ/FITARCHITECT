import React from 'react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  locked: boolean;
  lockReason?: string;
  onClick?: () => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
  locked,
  lockReason,
  onClick,
}) => {
  return (
    <div
      className={`bg-black border border-gray-800 rounded-xl p-6 transition-colors cursor-pointer text-white relative ${
        locked ? 'opacity-75' : 'hover:bg-gray-900'
      }`}
      onClick={onClick}
      tabIndex={0}
      aria-disabled={locked}
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 mb-2">{description}</p>
      {locked && lockReason && (
        <div className="mt-4 text-sm text-yellow-400">{lockReason}</div>
      )}
      {locked && (
        <div className="absolute top-4 right-4 text-2xl text-yellow-400" title="Locked">
          <span role="img" aria-label="locked">🔒</span>
        </div>
      )}
    </div>
  );
};

export default FeatureCard; 