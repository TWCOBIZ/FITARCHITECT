import React from 'react';
import FeatureGateWrapper from '../components/common/FeatureGateWrapper';
import { useFeatureAccess } from '../hooks/useFeatureAccess';

const FoodScan = () => {
  const { access, reasons } = useFeatureAccess();
  if (!access.foodscan) {
    return (
      <FeatureGateWrapper>
        <div className="text-red-400 text-center p-8">{reasons.foodscan || 'Upgrade to Premium to access food scanning.'}</div>
      </FeatureGateWrapper>
    );
  }
  return (
    <FeatureGateWrapper>
      {/* Food scanner UI here */}
      <div className="text-white">Food Scanner Feature (Premium Only)</div>
    </FeatureGateWrapper>
  );
};

export default FoodScan; 