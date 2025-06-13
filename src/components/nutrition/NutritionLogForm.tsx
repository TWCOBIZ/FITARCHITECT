import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import BarcodeScanner from './BarcodeScanner';
import { openFoodFactsService } from '../../services/openFoodFactsService';
import { useNutrition } from '../../contexts/NutritionContext';

interface NutritionLogFormProps {
  onLogged?: () => void;
}

// Define the food type for clarity
interface Food {
  name: string;
  brand: string;
  barcode: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

export default function NutritionLogForm({ onLogged }: NutritionLogFormProps) {
  const { addFoodEntry } = useNutrition();
  const [foods, setFoods] = useState<Food[]>([
    { name: '', brand: '', barcode: '', calories: '', protein: '', carbs: '', fat: '' }
  ]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanningIdx, setScanningIdx] = useState<number | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [favorites, setFavorites] = useState<Food[]>([]);
  const [presets, setPresets] = useState<Array<{ name: string; foods: Food[] }>>([]);
  const [presetName, setPresetName] = useState('');

  useEffect(() => {
    const favs = JSON.parse(localStorage.getItem('favoriteFoods') || '[]');
    setFavorites(favs);
    const prs = JSON.parse(localStorage.getItem('mealPresets') || '[]');
    setPresets(prs);
  }, []);

  const toggleFavorite = (food: Food) => {
    let favs: Food[] = JSON.parse(localStorage.getItem('favoriteFoods') || '[]');
    const exists = favs.find((f: Food) => f.name === food.name && f.brand === food.brand);
    if (exists) {
      favs = favs.filter((f: Food) => !(f.name === food.name && f.brand === food.brand));
    } else {
      favs.push(food);
    }
    setFavorites(favs);
    localStorage.setItem('favoriteFoods', JSON.stringify(favs));
  };

  const addFavoriteToFoods = (food: Food) => {
    setFoods([...foods, { ...food }]);
  };

  const savePreset = () => {
    if (!presetName.trim()) return;
    const prs = [...presets, { name: presetName, foods }];
    setPresets(prs);
    localStorage.setItem('mealPresets', JSON.stringify(prs));
    setPresetName('');
  };

  const addPresetToFoods = (presetFoods: Food[]) => {
    setFoods([...foods, ...presetFoods.map((f: Food) => ({ ...f }))]);
  };

  const handleFoodChange = (idx: number, field: string, value: string) => {
    setFoods(foods =>
      foods.map((f, i) => (i === idx ? { ...f, [field]: value } : f))
    );
  };

  const addFood = () => setFoods([...foods, { name: '', brand: '', barcode: '', calories: '', protein: '', carbs: '', fat: '' }]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Add each food entry to the daily log using NutritionContext
      for (const food of foods) {
        if (food.name) { // Only add foods with names
          await addFoodEntry({
            name: food.name,
            calories: Number(food.calories || 0),
            protein: Number(food.protein || 0),
            carbs: Number(food.carbs || 0),
            fat: Number(food.fat || 0),
            servingSize: '1 serving',
            servingUnit: ''
          });
        }
      }
      
      setFoods([{ name: '', brand: '', barcode: '', calories: '', protein: '', carbs: '', fat: '' }]);
      setNotes('');
      if (onLogged) onLogged();
    } catch (err) {
      console.error('Failed to log nutrition:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeDetected = async (barcode: string) => {
    setShowScanner(false);
    setScanningIdx(null);
    setLookupLoading(true);
    try {
      const product = await openFoodFactsService.getFoodByBarcode(barcode);
      if (product) {
        setFoods(foods => foods.map((f, i) =>
          i === scanningIdx
            ? {
                ...f,
                barcode,
                name: product.name || f.name,
                brand: f.brand,
                calories: product.calories ? String(product.calories) : f.calories,
                protein: product.protein ? String(product.protein) : f.protein,
                carbs: product.carbs ? String(product.carbs) : f.carbs,
                fat: product.fat ? String(product.fat) : f.fat,
              }
            : f
        ));
      } else {
        setFoods(foods => foods.map((f, i) => i === scanningIdx ? { ...f, barcode } : f));
        toast.error('Food not found in Open Food Facts database. Please enter nutrition information manually.');
      }
    } catch (err) {
      setFoods(foods => foods.map((f, i) => i === scanningIdx ? { ...f, barcode } : f));
      toast.error('Error looking up food information. Please check your connection and try again.');
    }
    setLookupLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-gray-900 p-6 rounded-lg border border-gray-800">
      <h2 className="text-xl font-bold text-white">Log Nutrition</h2>
      {/* Favorites Section */}
      {favorites.length > 0 && (
        <div className="mb-2">
          <div className="font-semibold mb-1 text-white">Favorites:</div>
          <div className="flex flex-wrap gap-2">
            {favorites.map((food, idx) => (
              <button type="button" key={idx} onClick={() => addFavoriteToFoods(food)} className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm">
                {food.name} {food.brand && `(${food.brand})`}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Presets Section */}
      {presets.length > 0 && (
        <div className="mb-2">
          <div className="font-semibold mb-1 text-white">Presets:</div>
          <select onChange={e => {
            const idx = Number(e.target.value);
            if (!isNaN(idx)) addPresetToFoods(presets[idx].foods);
          }} className="border border-gray-600 rounded px-2 py-1 bg-gray-800 text-white">
            <option value="">Select a preset</option>
            {presets.map((preset, idx) => (
              <option key={idx} value={idx}>{preset.name}</option>
            ))}
          </select>
        </div>
      )}
      {/* Foods Form */}
      {foods.map((food, idx) => (
        <div key={idx} className="border border-gray-600 p-4 rounded mb-2 bg-gray-800 flex items-center">
          <div className="flex-1 space-y-2">
            <input placeholder="Food name" value={food.name} onChange={e => handleFoodChange(idx, 'name', e.target.value)} required className="border border-gray-600 p-2 rounded w-full bg-gray-700 text-white placeholder-gray-400" />
            <input placeholder="Brand" value={food.brand} onChange={e => handleFoodChange(idx, 'brand', e.target.value)} className="border border-gray-600 p-2 rounded w-full bg-gray-700 text-white placeholder-gray-400" />
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Barcode"
                value={food.barcode}
                onChange={e => handleFoodChange(idx, 'barcode', e.target.value)}
                className="border border-gray-600 rounded px-2 py-1 flex-1 bg-gray-700 text-white placeholder-gray-400"
              />
              <button type="button" onClick={() => { setShowScanner(true); setScanningIdx(idx); }} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded">Scan</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <input placeholder="Calories" type="number" value={food.calories} onChange={e => handleFoodChange(idx, 'calories', e.target.value)} className="border border-gray-600 p-2 rounded bg-gray-700 text-white placeholder-gray-400" />
              <input placeholder="Protein (g)" type="number" value={food.protein} onChange={e => handleFoodChange(idx, 'protein', e.target.value)} className="border border-gray-600 p-2 rounded bg-gray-700 text-white placeholder-gray-400" />
              <input placeholder="Carbs (g)" type="number" value={food.carbs} onChange={e => handleFoodChange(idx, 'carbs', e.target.value)} className="border border-gray-600 p-2 rounded bg-gray-700 text-white placeholder-gray-400" />
              <input placeholder="Fat (g)" type="number" value={food.fat} onChange={e => handleFoodChange(idx, 'fat', e.target.value)} className="border border-gray-600 p-2 rounded bg-gray-700 text-white placeholder-gray-400" />
            </div>
          </div>
          <button type="button" onClick={() => toggleFavorite(food)} className={`ml-2 text-xl ${favorites.find(f => f.name === food.name && f.brand === food.brand) ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
        </div>
      ))}
      <button type="button" onClick={addFood} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">Add Another Food</button>
      {/* Save as Preset */}
      {foods.length > 1 && (
        <div className="flex items-center space-x-2 mt-2">
          <input type="text" placeholder="Preset name" value={presetName} onChange={e => setPresetName(e.target.value)} className="border border-gray-600 rounded px-2 py-1 bg-gray-700 text-white placeholder-gray-400" />
          <button type="button" onClick={savePreset} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Save as Preset</button>
        </div>
      )}
      <textarea placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} className="border border-gray-600 p-2 rounded w-full bg-gray-700 text-white placeholder-gray-400" />
      <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold">{loading ? 'Saving...' : 'Log Nutrition'}</button>
      {showScanner && <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setShowScanner(false)} />}
      {lookupLoading && <p className="text-gray-300">Looking up food info...</p>}
    </form>
  );
} 