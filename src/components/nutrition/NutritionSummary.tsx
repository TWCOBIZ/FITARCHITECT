import React, { useEffect, useState } from 'react';
import { FoodEntry } from '../../types/nutrition';

interface NutritionLog {
  id: string;
  date: string;
  foods: FoodEntry[];
  notes?: string;
}

interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const NutritionSummary: React.FC = () => {
  const [totals, setTotals] = useState<NutritionTotals>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/nutrition-log', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then((logs: NutritionLog[]) => {
        // Filter logs for today
        const today = new Date().toISOString().slice(0, 10);
        const todaysLogs = logs.filter((log: NutritionLog) => log.date && log.date.slice(0, 10) === today);
        // Sum macros
        let calories = 0, protein = 0, carbs = 0, fat = 0;
        todaysLogs.forEach((log: NutritionLog) => {
          if (log.foods && Array.isArray(log.foods)) {
            log.foods.forEach((food: FoodEntry) => {
              calories += Number(food.calories) || 0;
              protein += Number(food.protein) || 0;
              carbs += Number(food.carbs) || 0;
              fat += Number(food.fat) || 0;
            });
          }
        });
        setTotals({ calories, protein, carbs, fat });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="mb-4">Loading nutrition summary...</div>;

  return (
    <div className="mb-6 p-4 rounded bg-blue-50 flex flex-col md:flex-row md:space-x-8 items-center justify-between shadow">
      <div className="text-lg font-bold text-blue-900">Today's Totals</div>
      <div className="flex space-x-6 mt-2 md:mt-0">
        <div className="text-blue-800"><span className="font-semibold">Calories:</span> {totals.calories}</div>
        <div className="text-blue-800"><span className="font-semibold">Protein:</span> {totals.protein}g</div>
        <div className="text-blue-800"><span className="font-semibold">Carbs:</span> {totals.carbs}g</div>
        <div className="text-blue-800"><span className="font-semibold">Fat:</span> {totals.fat}g</div>
      </div>
    </div>
  );
}

export default NutritionSummary; 