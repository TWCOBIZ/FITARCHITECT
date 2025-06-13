import React from 'react';
import { useNutrition } from '../../contexts/NutritionContext';

const NutritionSummary: React.FC = () => {
  const { dailyLog } = useNutrition();

  return (
    <div className="mb-6 p-4 rounded bg-gray-900 flex flex-col md:flex-row md:space-x-8 items-center justify-between shadow border border-gray-800">
      <div className="text-lg font-bold text-white">Today's Totals</div>
      <div className="flex space-x-6 mt-2 md:mt-0">
        <div className="text-gray-300"><span className="font-semibold">Calories:</span> {dailyLog.calories} / {dailyLog.calorieGoal}</div>
        <div className="text-gray-300"><span className="font-semibold">Protein:</span> {dailyLog.protein}g / {dailyLog.proteinGoal}g</div>
        <div className="text-gray-300"><span className="font-semibold">Carbs:</span> {dailyLog.carbs}g / {dailyLog.carbsGoal}g</div>
        <div className="text-gray-300"><span className="font-semibold">Fat:</span> {dailyLog.fat}g / {dailyLog.fatGoal}g</div>
      </div>
    </div>
  );
}

export default NutritionSummary; 