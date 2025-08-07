import React from 'react';
import { useNutrition } from '../../contexts/NutritionContext';
import { useNavigate } from 'react-router-dom';

interface MacroProgressProps {
  label: string;
  current: number;
  goal: number;
  color: string;
  unit?: string;
}

const MacroProgress: React.FC<MacroProgressProps> = ({ label, current, goal, color, unit = 'g' }) => {
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const isOverGoal = current > goal;
  
  return (
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        <span className={`text-sm font-bold ${isOverGoal ? 'text-orange-400' : 'text-white'}`}>
          {Math.round(current)}{unit} / {goal}{unit}
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
        <div 
          className={`h-2.5 rounded-full transition-all duration-300 ${color} ${isOverGoal ? 'animate-pulse' : ''}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
        {isOverGoal && (
          <div className="h-2.5 bg-orange-500 opacity-50 rounded-full -mt-2.5 animate-pulse" 
               style={{ width: `${Math.min(((current - goal) / goal) * 100, 50)}%` }} />
        )}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-500">0{unit}</span>
        <span className="text-xs text-gray-500">{goal}{unit}</span>
      </div>
    </div>
  );
};

const NutritionSummary: React.FC = () => {
  const { dailyLog, mealPlan } = useNutrition();
  const navigate = useNavigate();

  // Calculate calorie percentage for visual indicator
  const caloriePercentage = dailyLog.calorieGoal > 0 ? (dailyLog.calories / dailyLog.calorieGoal) * 100 : 0;
  const remainingCalories = Math.max(0, dailyLog.calorieGoal - dailyLog.calories);
  
  // Determine status color based on calorie intake
  const getCalorieStatus = () => {
    if (caloriePercentage < 70) return { color: 'text-blue-400', status: 'Under Target', bg: 'bg-blue-500' };
    if (caloriePercentage <= 110) return { color: 'text-green-400', status: 'On Track', bg: 'bg-green-500' };
    return { color: 'text-orange-400', status: 'Over Target', bg: 'bg-orange-500' };
  };

  const calorieStatus = getCalorieStatus();

  return (
    <div className="space-y-6">
      {/* Enhanced Calorie Summary */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Calorie Circle Progress */}
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-gray-700"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - Math.min(caloriePercentage / 100, 1))}`}
                  className={calorieStatus.bg.replace('bg-', 'text-')}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-sm font-bold text-white">{Math.round(caloriePercentage)}%</div>
                  <div className="text-xs text-gray-400">Goal</div>
                </div>
              </div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-white">{Math.round(dailyLog.calories)} kcal</div>
              <div className={`text-sm font-medium ${calorieStatus.color}`}>{calorieStatus.status}</div>
              <div className="text-sm text-gray-400">
                {remainingCalories > 0 ? `${Math.round(remainingCalories)} kcal remaining` : 'Daily goal reached'}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-col gap-2">
            <div className="text-lg font-semibold text-white">Daily Progress</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-300">Protein: {Math.round((dailyLog.protein / dailyLog.proteinGoal) * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-300">Carbs: {Math.round((dailyLog.carbs / dailyLog.carbsGoal) * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Macro Progress Bars */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Macro Breakdown</h3>
        <div className="grid gap-6 md:grid-cols-3">
          <MacroProgress
            label="Protein"
            current={dailyLog.protein}
            goal={dailyLog.proteinGoal}
            color="bg-blue-500"
          />
          <MacroProgress
            label="Carbohydrates"
            current={dailyLog.carbs}
            goal={dailyLog.carbsGoal}
            color="bg-green-500"
          />
          <MacroProgress
            label="Fat"
            current={dailyLog.fat}
            goal={dailyLog.fatGoal}
            color="bg-purple-500"
          />
        </div>
        
        {/* Macro Pie Chart Visual */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-300">Protein ({Math.round((dailyLog.protein * 4 / dailyLog.calories) * 100) || 0}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-300">Carbs ({Math.round((dailyLog.carbs * 4 / dailyLog.calories) * 100) || 0}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span className="text-sm text-gray-300">Fat ({Math.round((dailyLog.fat * 9 / dailyLog.calories) * 100) || 0}%)</span>
            </div>
          </div>
        </div>
      </div>
      
      {mealPlan && mealPlan.length > 0 && (
        <div className="bg-green-900/20 border border-green-600 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📋</span>
            <div>
              <p className="text-green-400 font-semibold">Meal Plan Active</p>
              <p className="text-gray-400 text-sm">Follow your personalized meal plan for optimal nutrition</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/meal-planning')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
          >
            View Meal Plan
          </button>
        </div>
      )}
    </div>
  );
}

export default NutritionSummary; 