import { useNutrition } from '../contexts/NutritionContext';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

const FALLBACK_IMAGE = '/assets/meal-fallback.png';

interface FoodItem {
  code: string;
  product_name: string;
  brands?: string;
  image_url?: string;
  nutriments: {
    'energy-kcal_100g'?: number;
    'proteins_100g'?: number;
    'carbohydrates_100g'?: number;
    'fat_100g'?: number;
    'fiber_100g'?: number;
    'sugars_100g'?: number;
    'salt_100g'?: number;
  };
}

const CalorieTracker: React.FC = () => {
  const { dailyLog, addFoodEntry, removeFoodEntry } = useNutrition();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servingSize, setServingSize] = useState(100);
  const [mealType, setMealType] = useState('breakfast');

  // Food search functionality
  const searchFood = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.get(`/api/food/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data.products || []);
    } catch (error) {
      console.error('Food search error:', error);
      toast.error('Failed to search foods');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchFood(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Add food entry
  const handleAddFood = () => {
    if (!selectedFood) return;

    const nutrients = selectedFood.nutriments;
    const servingMultiplier = servingSize / 100;

    const entry = {
      name: selectedFood.product_name,
      brand: selectedFood.brands || '',
      code: selectedFood.code,
      mealType,
      quantity: servingSize,
      servingUnit: 'g',
      calories: Math.round((nutrients['energy-kcal_100g'] || 0) * servingMultiplier),
      protein: Math.round((nutrients['proteins_100g'] || 0) * servingMultiplier * 10) / 10,
      carbs: Math.round((nutrients['carbohydrates_100g'] || 0) * servingMultiplier * 10) / 10,
      fat: Math.round((nutrients['fat_100g'] || 0) * servingMultiplier * 10) / 10,
      fiber: Math.round((nutrients['fiber_100g'] || 0) * servingMultiplier * 10) / 10,
      sugar: Math.round((nutrients['sugars_100g'] || 0) * servingMultiplier * 10) / 10,
      sodium: Math.round((nutrients['salt_100g'] || 0) * servingMultiplier * 1000) / 10, // Convert to mg
      imageUrl: selectedFood.image_url
    };

    addFoodEntry(entry);
    toast.success('Food added successfully!');
    
    // Reset form
    setShowAdd(false);
    setSelectedFood(null);
    setSearchQuery('');
    setSearchResults([]);
    setServingSize(100);
  };

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
        <button className="ml-auto bg-blue-600 text-white px-4 py-2 rounded" onClick={() => window.location.reload()}>Refresh</button>
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
              <img src={FALLBACK_IMAGE} alt={entry.name} className="w-16 h-16 object-cover rounded" />
              <div className="flex-1">
                <div className="font-semibold">{entry.name}</div>
                <div className="text-sm text-gray-600">{entry.mealType} • {entry.quantity} {entry.servingUnit}</div>
                <div className="text-xs text-gray-500">{entry.calories} kcal, {entry.protein}g P, {entry.carbs}g C, {entry.fat}g F</div>
              </div>
              <button className="text-blue-600 mr-2" onClick={() => { setSelectedEntry(entry); setShowAdd(true); }}>Edit</button>
              <button className="text-red-600" onClick={() => { removeFoodEntry(idx); toast.success('Entry removed'); }}>Remove</button>
            </div>
          ))}
        </div>
      )}
      {/* Add Food Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Add Food</h2>
                <button
                  onClick={() => {
                    setShowAdd(false);
                    setSelectedFood(null);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {!selectedFood ? (
                <>
                  {/* Search Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Food
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Enter food name..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Search Results */}
                  {isSearching && (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="text-gray-500 mt-2">Searching...</p>
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {searchResults.map((food) => (
                        <div
                          key={food.code}
                          onClick={() => setSelectedFood(food)}
                          className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={food.image_url || FALLBACK_IMAGE}
                              alt={food.product_name}
                              className="w-12 h-12 object-cover rounded"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                              }}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{food.product_name}</div>
                              {food.brands && (
                                <div className="text-sm text-gray-500">{food.brands}</div>
                              )}
                              <div className="text-xs text-gray-400">
                                {food.nutriments['energy-kcal_100g'] || 0} kcal per 100g
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Selected Food Details */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src={selectedFood.image_url || FALLBACK_IMAGE}
                        alt={selectedFood.product_name}
                        className="w-16 h-16 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                        }}
                      />
                      <div>
                        <h3 className="font-medium">{selectedFood.product_name}</h3>
                        {selectedFood.brands && (
                          <p className="text-sm text-gray-500">{selectedFood.brands}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedFood(null)}
                      className="text-blue-500 text-sm"
                    >
                      ← Choose different food
                    </button>
                  </div>

                  {/* Serving Size */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Serving Size (grams)
                    </label>
                    <input
                      type="number"
                      value={servingSize}
                      onChange={(e) => setServingSize(Number(e.target.value))}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Meal Type */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Meal Type
                    </label>
                    <select
                      value={mealType}
                      onChange={(e) => setMealType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snack">Snack</option>
                    </select>
                  </div>

                  {/* Nutrition Preview */}
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Nutrition (for {servingSize}g):</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Calories: {Math.round((selectedFood.nutriments['energy-kcal_100g'] || 0) * servingSize / 100)}</div>
                      <div>Protein: {Math.round((selectedFood.nutriments['proteins_100g'] || 0) * servingSize / 10) / 10}g</div>
                      <div>Carbs: {Math.round((selectedFood.nutriments['carbohydrates_100g'] || 0) * servingSize / 10) / 10}g</div>
                      <div>Fat: {Math.round((selectedFood.nutriments['fat_100g'] || 0) * servingSize / 10) / 10}g</div>
                    </div>
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={handleAddFood}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors"
                  >
                    Add to Log
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalorieTracker; 