import React, { useEffect, useState } from 'react';
import { FoodEntry } from '../../types/nutrition';

interface NutritionLog {
  id: string;
  date: string;
  foods: FoodEntry[];
  notes?: string;
}

interface EditNutritionLogModalProps {
  log: NutritionLog;
  onClose: () => void;
  onSave: () => void;
}

function EditNutritionLogModal({ log, onClose, onSave }: EditNutritionLogModalProps) {
  const [foods, setFoods] = useState<FoodEntry[]>(log.foods || []);
  const [notes, setNotes] = useState<string>(log.notes || '');
  const [loading, setLoading] = useState<boolean>(false);

  const handleFoodChange = (idx: number, field: keyof FoodEntry, value: string | number) => {
    setFoods(foods => foods.map((f, i) => i === idx ? { ...f, [field]: value } : f));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const calories = foods.reduce((acc, f) => acc + Number(f.calories || 0), 0);
    const macros = foods.reduce((acc, f) => ({
      protein: acc.protein + Number(f.protein || 0),
      carbs: acc.carbs + Number(f.carbs || 0),
      fat: acc.fat + Number(f.fat || 0),
    }), { protein: 0, carbs: 0, fat: 0 });
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/nutrition-log/${log.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ foods, calories, macros, notes }),
    });
    setLoading(false);
    if (res.ok) {
      onSave();
      onClose();
    } else {
      alert('Failed to update log');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Edit Nutrition Log</h2>
        <form onSubmit={handleSubmit} className="space-y-2">
          {foods.map((food, idx) => (
            <div key={idx} className="border p-2 rounded mb-2 bg-gray-50">
              <input placeholder="Food name" value={food.name} onChange={e => handleFoodChange(idx, 'name', e.target.value)} required className="border p-1 rounded w-full text-black" />
              <input placeholder="Barcode" value={food.barcode} onChange={e => handleFoodChange(idx, 'barcode', e.target.value)} className="border p-1 rounded w-full text-black" />
              <input placeholder="Calories" type="number" value={food.calories} onChange={e => handleFoodChange(idx, 'calories', e.target.value)} className="border p-1 rounded w-full text-black" />
              <input placeholder="Protein (g)" type="number" value={food.protein} onChange={e => handleFoodChange(idx, 'protein', e.target.value)} className="border p-1 rounded w-full text-black" />
              <input placeholder="Carbs (g)" type="number" value={food.carbs} onChange={e => handleFoodChange(idx, 'carbs', e.target.value)} className="border p-1 rounded w-full text-black" />
              <input placeholder="Fat (g)" type="number" value={food.fat} onChange={e => handleFoodChange(idx, 'fat', e.target.value)} className="border p-1 rounded w-full text-black" />
            </div>
          ))}
          <textarea placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} className="border p-1 rounded w-full text-black" />
          <div className="flex justify-end space-x-2 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NutritionHistory() {
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingLog, setEditingLog] = useState<NutritionLog | null>(null);

  const fetchLogs = () => {
    const token = localStorage.getItem('token');
    fetch('/api/nutrition-log', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then((data: NutritionLog[]) => {
        setLogs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this nutrition log?')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/nutrition-log/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setLogs(logs => logs.filter(l => l.id !== id));
    } else {
      alert('Failed to delete log');
    }
  };

  if (loading) return <div>Loading nutrition history...</div>;

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Nutrition History</h2>
      {logs.length === 0 && <div>No nutrition logs yet.</div>}
      {logs.map(log => (
        <div key={log.id} className="border rounded p-4 mb-4 bg-white shadow">
          <div className="flex justify-between items-center mb-2">
            <div className="font-semibold">{new Date(log.date).toLocaleString()}</div>
            <div className="space-x-2">
              <button onClick={() => setEditingLog(log)} className="px-2 py-1 bg-yellow-100 rounded">Edit</button>
              <button onClick={() => handleDelete(log.id)} className="px-2 py-1 bg-red-100 rounded">Delete</button>
            </div>
          </div>
          <div className="mb-2">
            {log.foods && log.foods.map((food, idx) => (
              <div key={idx} className="text-sm text-gray-700">
                {food.name} - {food.calories} cal, {food.protein}g P, {food.carbs}g C, {food.fat}g F
              </div>
            ))}
          </div>
          <div className="text-gray-500 text-sm">Notes: {log.notes}</div>
        </div>
      ))}
      {editingLog && <EditNutritionLogModal log={editingLog} onClose={() => setEditingLog(null)} onSave={fetchLogs} />}
    </div>
  );
} 