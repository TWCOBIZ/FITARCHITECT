import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FoodEntry } from '../../types/nutrition';
import { useAuth } from '../../contexts/AuthContext';
import { useNutrition } from '../../contexts/NutritionContext';
import ConfirmationModal from '../common/ConfirmationModal';

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
      toast.success('Nutrition log updated successfully!');
      onSave();
      onClose();
    } else {
      toast.error('Failed to update nutrition log. Please try again.');
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
  const { user } = useAuth();
  const { dailyLog } = useNutrition();
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingLog, setEditingLog] = useState<NutritionLog | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{isOpen: boolean, logId: string | null}>({
    isOpen: false,
    logId: null
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLogs = () => {
    // For guests, use localStorage data
    if (user?.isGuest || user?.type === 'guest') {
      const guestLog = localStorage.getItem('guestNutritionLog');
      if (guestLog) {
        try {
          const parsed = JSON.parse(guestLog);
          // Convert daily log to history format
          const historyEntry = {
            id: 'guest-log',
            date: parsed.date || new Date().toISOString(),
            foods: parsed.entries || [],
            notes: 'Guest session log'
          };
          setLogs([historyEntry]);
        } catch (e) {
          setLogs([]);
        }
      } else {
        setLogs([]);
      }
      setLoading(false);
      return;
    }

    // For registered users, fetch from API
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    
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
  }, [user]);

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmModal({ isOpen: true, logId: id });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmModal.logId) return;
    
    setIsDeleting(true);
    
    try {
      // For guests, clear localStorage
      if (user?.isGuest || user?.type === 'guest') {
        localStorage.removeItem('guestNutritionLog');
        setLogs([]);
        toast.success('Nutrition log deleted successfully');
        setDeleteConfirmModal({ isOpen: false, logId: null });
        return;
      }
      
      // For registered users, call API
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const res = await fetch(`/api/nutrition-log/${deleteConfirmModal.logId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        toast.success('Nutrition log deleted successfully');
        setLogs(logs => logs.filter(l => l.id !== deleteConfirmModal.logId));
      } else {
        toast.error('Failed to delete nutrition log. Please try again.');
      }
    } catch (error) {
      toast.error('Failed to delete nutrition log. Please try again.');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmModal({ isOpen: false, logId: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmModal({ isOpen: false, logId: null });
  };

  if (loading) return <div>Loading nutrition history...</div>;

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4 text-white">Nutrition History</h2>
      {logs.length === 0 && <div className="text-gray-400">No nutrition logs yet.</div>}
      {logs.map(log => (
        <div key={log.id} className="border border-gray-800 rounded p-4 mb-4 bg-gray-900 shadow">
          <div className="flex justify-between items-center mb-2">
            <div className="font-semibold text-white">{new Date(log.date).toLocaleString()}</div>
            <div className="space-x-2">
              {!user?.isGuest && !user?.type === 'guest' && (
                <button onClick={() => setEditingLog(log)} className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded">Edit</button>
              )}
              <button onClick={() => handleDeleteClick(log.id)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded">Delete</button>
            </div>
          </div>
          <div className="mb-2">
            {log.foods && log.foods.map((food, idx) => (
              <div key={idx} className="text-sm text-gray-300">
                {food.name} - {food.calories} cal, {food.protein}g P, {food.carbs}g C, {food.fat}g F
              </div>
            ))}
          </div>
          <div className="text-gray-400 text-sm">Notes: {log.notes}</div>
        </div>
      ))}
      {editingLog && !user?.isGuest && user?.type !== 'guest' && (
        <EditNutritionLogModal log={editingLog} onClose={() => setEditingLog(null)} onSave={fetchLogs} />
      )}
      
      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Nutrition Log"
        message="Are you sure you want to delete this nutrition log? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
} 