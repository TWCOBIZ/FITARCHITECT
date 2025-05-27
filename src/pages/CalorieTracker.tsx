import { useNutrition } from '../contexts/NutritionContext';
import { useState } from 'react';
import toast from 'react-hot-toast';

const FALLBACK_IMAGE = '/assets/meal-fallback.png';

const CalorieTracker: React.FC = () => {
  const { dailyLog, addFoodEntry, removeFoodEntry, editFoodEntry, loadDailyLog, loading, error } = useNutrition();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Calorie Tracker</h1>
      {/* Daily summary card */}
      <div className="bg-white rounded shadow p-4 mb-6 flex flex-col md:flex-row gap-4">
        <div>
          <h2 className="font-semibold">Today's Summary</h2>
          <div>Calories: {dailyLog.calories} / {dailyLog.calorieGoal}</div>
          <div>Protein: {dailyLog.protein}g / {dailyLog.proteinGoal}g</div>
          <div>Carbs: {dailyLog.carbs}g / {dailyLog.carbsGoal}g</div>
          <div>Fat: {dailyLog.fat}g / {dailyLog.fatGoal}g</div>
        </div>
        <button className="ml-auto bg-blue-600 text-white px-4 py-2 rounded" onClick={loadDailyLog}>Refresh</button>
      </div>
      {/* Food entries list */}
      <div className="mb-4 flex justify-between items-center">
        <h2 className="font-semibold text-lg">Food Entries</h2>
        <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={() => setShowAdd(true)}>Add Food</button>
      </div>
      {dailyLog.entries.length === 0 ? (
        <div className="text-gray-500">No foods logged yet.</div>
      ) : (
        <div className="grid gap-3">
          {dailyLog.entries.map((entry, idx) => (
            <div key={idx} className="bg-gray-100 rounded p-3 flex items-center gap-4">
              <img src={entry.imageUrl || FALLBACK_IMAGE} alt={entry.name} className="w-16 h-16 object-cover rounded" />
              <div className="flex-1">
                <div className="font-semibold">{entry.name}</div>
                <div className="text-sm text-gray-600">{entry.mealType} • {entry.quantity} {entry.unit}</div>
                <div className="text-xs text-gray-500">{entry.calories} kcal, {entry.protein}g P, {entry.carbs}g C, {entry.fat}g F</div>
              </div>
              <button className="text-blue-600 mr-2" onClick={() => { setSelectedEntry(entry); setShowAdd(true); }}>Edit</button>
              <button className="text-red-600" onClick={() => { removeFoodEntry(entry); toast.success('Entry removed'); }}>Remove</button>
            </div>
          ))}
        </div>
      )}
      {/* Add/Edit Food Modal (pseudo, implement as needed) */}
      {showAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow max-w-md w-full">
            {/* ...form fields for food entry... */}
            <button className="mt-4 bg-gray-600 text-white px-4 py-2 rounded" onClick={() => setShowAdd(false)}>Close</button>
          </div>
        </div>
      )}
      {/* Scan/Search Food Button */}
      <div className="mt-6 flex justify-center">
        <button className="bg-yellow-500 text-white px-4 py-2 rounded" onClick={() => toast('Scan/Search coming soon!')}>Scan/Search Food</button>
      </div>
    </div>
  );
};

export default CalorieTracker; 