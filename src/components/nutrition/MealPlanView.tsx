import React from 'react';
import { MealPlan } from '../../types/nutrition';

const FALLBACK_IMAGE = '/assets/meal-fallback.png';

interface MealPlanViewProps {
  mealPlan: MealPlan;
}

const MealPlanView: React.FC<MealPlanViewProps> = ({ mealPlan }) => {
  if (!mealPlan || mealPlan.length === 0) return <div>No meal plan found.</div>;
  return (
    <div className="space-y-8">
      {mealPlan.map((day, idx) => (
        <section key={idx} className="bg-gray-900 rounded-2xl p-8 shadow-lg">
          <h3 className="text-2xl font-bold mb-6 text-blue-300">Day {idx + 1} ({day.date})</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {['breakfast', 'lunch', 'dinner', 'snack'].map((mealType) => {
              const meal = day.meals.find((m) => m.type === mealType);
              return (
                <article key={mealType} className="bg-black border border-gray-800 rounded-xl p-4 flex flex-col items-center shadow-md">
                  <h4 className="text-lg font-semibold mb-2 capitalize text-white">{mealType}</h4>
                  <img
                    src={meal?.items[0]?.imageUrl || FALLBACK_IMAGE}
                    alt={meal?.items[0]?.name || 'Meal'}
                    className="w-24 h-24 object-cover rounded mb-2 border border-gray-700"
                  />
                  <div className="text-center mb-2">
                    <span className="font-bold text-white">{meal?.items[0]?.name || 'No meal'}</span>
                    <div className="text-gray-400 text-xs mt-1">{meal?.items[0]?.description || 'No description available.'}</div>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-gray-300 w-full">
                    <div>Calories: <span className="font-semibold text-white">{meal?.items[0]?.calories ?? '--'}</span></div>
                    <div>Protein: <span className="font-semibold text-white">{meal?.items[0]?.protein ?? '--'}g</span></div>
                    <div>Carbs: <span className="font-semibold text-white">{meal?.items[0]?.carbs ?? '--'}g</span></div>
                    <div>Fat: <span className="font-semibold text-white">{meal?.items[0]?.fat ?? '--'}g</span></div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

export default MealPlanView; 