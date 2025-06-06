import React, { useState } from 'react';
import { useProfile } from '../../contexts/ProfileContext';
import { NutritionProfile } from '../../types/user';

const NutritionProfileForm: React.FC = () => {
  const { nutritionProfile, updateNutritionProfile } = useProfile();
  const [form, setForm] = useState<NutritionProfile>(
    nutritionProfile || {
      calorieGoal: 2000,
      dietaryPreferences: [],
      allergies: [],
      macroTargets: { protein: 120, carbs: 250, fat: 60 },
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name in form.macroTargets) {
      setForm({ ...form, macroTargets: { ...form.macroTargets, [name]: Number(value) } });
    } else if (name === 'calorieGoal') {
      setForm({ ...form, calorieGoal: Number(value) });
    }
  };

  const handleArrayChange = (name: keyof NutritionProfile, value: string) => {
    setForm({ ...form, [name]: value.split(',').map((v) => v.trim()).filter(Boolean) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await updateNutritionProfile(form);
    } catch (err: any) {
      setError('Failed to update nutrition profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-8 shadow-lg max-w-xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-6 text-black">Nutrition Profile</h2>
      <div className="mb-4">
        <label className="block text-gray-700 font-semibold mb-2">Calorie Goal</label>
        <input
          type="number"
          name="calorieGoal"
          value={form.calorieGoal}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded px-3 py-2"
          min={800}
          max={6000}
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 font-semibold mb-2">Dietary Preferences (comma separated)</label>
        <input
          type="text"
          name="dietaryPreferences"
          value={form.dietaryPreferences.join(', ')}
          onChange={(e) => handleArrayChange('dietaryPreferences', e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 font-semibold mb-2">Allergies (comma separated)</label>
        <input
          type="text"
          name="allergies"
          value={form.allergies.join(', ')}
          onChange={(e) => handleArrayChange('allergies', e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>
      <div className="mb-4 grid grid-cols-3 gap-4">
        <div>
          <label className="block text-gray-700 font-semibold mb-2">Protein (g)</label>
          <input
            type="number"
            name="protein"
            value={form.macroTargets.protein}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
            min={0}
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 font-semibold mb-2">Carbs (g)</label>
          <input
            type="number"
            name="carbs"
            value={form.macroTargets.carbs}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
            min={0}
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 font-semibold mb-2">Fat (g)</label>
          <input
            type="number"
            name="fat"
            value={form.macroTargets.fat}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
            min={0}
            required
          />
        </div>
      </div>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
        disabled={loading}
      >
        {loading ? 'Saving...' : 'Save Nutrition Profile'}
      </button>
    </form>
  );
};

export default NutritionProfileForm; 