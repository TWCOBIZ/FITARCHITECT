import React, { useState, useEffect } from 'react';
import BarcodeScanner from './BarcodeScanner';
import { openFoodFactsService } from '../../services/openFoodFactsService';
import { api } from '../../services/api';

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
    const macros = foods.reduce(
      (acc, f) => ({
        protein: acc.protein + Number(f.protein || 0),
        carbs: acc.carbs + Number(f.carbs || 0),
        fat: acc.fat + Number(f.fat || 0),
      }),
      { protein: 0, carbs: 0, fat: 0 }
    );
    const calories = foods.reduce((acc, f) => acc + Number(f.calories || 0), 0);
    try {
      await api.post('/api/nutrition-log', {
        foods,
        calories,
        macros,
        notes,
      });
      setFoods([{ name: '', brand: '', barcode: '', calories: '', protein: '', carbs: '', fat: '' }]);
      setNotes('');
      if (onLogged) onLogged();
      alert('Nutrition log saved!');
    } catch {
      alert('Failed to log nutrition');
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
        alert('Food not found in Open Food Facts.');
      }
    } catch (err) {
      setFoods(foods => foods.map((f, i) => i === scanningIdx ? { ...f, barcode } : f));
      alert('Error looking up food info.');
    }
    setLookupLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold">Log Nutrition</h2>
      {/* Favorites Section */}
      {favorites.length > 0 && (
        <div className="mb-2">
          <div className="font-semibold mb-1">Favorites:</div>
          <div className="flex flex-wrap gap-2">
            {favorites.map((food, idx) => (
              <button type="button" key={idx} onClick={() => addFavoriteToFoods(food)} className="px-2 py-1 bg-yellow-100 rounded text-sm">
                {food.name} {food.brand && `(${food.brand})`}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Presets Section */}
      {presets.length > 0 && (
        <div className="mb-2">
          <div className="font-semibold mb-1">Presets:</div>
          <select onChange={e => {
            const idx = Number(e.target.value);
            if (!isNaN(idx)) addPresetToFoods(presets[idx].foods);
          }} className="border rounded px-2 py-1">
            <option value="">Select a preset</option>
            {presets.map((preset, idx) => (
              <option key={idx} value={idx}>{preset.name}</option>
            ))}
          </select>
        </div>
      )}
      {/* Foods Form */}
      {foods.map((food, idx) => (
        <div key={idx} className="border p-4 rounded mb-2 bg-gray-50 flex items-center">
          <div className="flex-1">
            <input placeholder="Food name" value={food.name} onChange={e => handleFoodChange(idx, 'name', e.target.value)} required className="border p-1 rounded w-full text-black" />
            <input placeholder="Brand" value={food.brand} onChange={e => handleFoodChange(idx, 'brand', e.target.value)} className="border p-1 rounded w-full text-black" />
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Barcode"
                value={food.barcode}
                onChange={e => handleFoodChange(idx, 'barcode', e.target.value)}
                className="border rounded px-2 py-1 flex-1 text-black"
              />
              <button type="button" onClick={() => { setShowScanner(true); setScanningIdx(idx); }} className="px-2 py-1 bg-blue-100 rounded">Scan</button>
            </div>
            <input placeholder="Calories" type="number" value={food.calories} onChange={e => handleFoodChange(idx, 'calories', e.target.value)} className="border p-1 rounded w-full text-black" />
            <input placeholder="Protein (g)" type="number" value={food.protein} onChange={e => handleFoodChange(idx, 'protein', e.target.value)} className="border p-1 rounded w-full text-black" />
            <input placeholder="Carbs (g)" type="number" value={food.carbs} onChange={e => handleFoodChange(idx, 'carbs', e.target.value)} className="border p-1 rounded w-full text-black" />
            <input placeholder="Fat (g)" type="number" value={food.fat} onChange={e => handleFoodChange(idx, 'fat', e.target.value)} className="border p-1 rounded w-full text-black" />
          </div>
          <button type="button" onClick={() => toggleFavorite(food)} className={`ml-2 text-xl ${favorites.find(f => f.name === food.name && f.brand === food.brand) ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
        </div>
      ))}
      <button type="button" onClick={addFood} className="bg-gray-200 px-2 py-1 rounded">Add Another Food</button>
      {/* Save as Preset */}
      {foods.length > 1 && (
        <div className="flex items-center space-x-2 mt-2">
          <input type="text" placeholder="Preset name" value={presetName} onChange={e => setPresetName(e.target.value)} className="border rounded px-2 py-1" />
          <button type="button" onClick={savePreset} className="bg-green-200 px-2 py-1 rounded">Save as Preset</button>
        </div>
      )}
      <textarea placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} className="border p-1 rounded w-full text-black" />
      <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">{loading ? 'Saving...' : 'Log Nutrition'}</button>
      {showScanner && <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setShowScanner(false)} />}
      {lookupLoading && <p>Looking up food info...</p>}
    </form>
  );
} 