import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '../../services/api';
import ConfirmationModal from '../common/ConfirmationModal';
import ExerciseForm from './ExerciseForm';

interface Exercise {
  id: string;
  name: string;
  description: string;
  category: string;
  muscleGroups: string[];
  equipment: string[];
  difficulty: string;
  instructions: string[];
  tips: string[];
  imageUrl?: string;
  videoUrl?: string;
  isCustom: boolean;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface ExerciseCategories {
  categories: string[];
  difficulties: string[];
  muscleGroups: string[];
  equipment: string[];
}

const CustomExercisesPanel: React.FC = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [categories, setCategories] = useState<ExerciseCategories | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [muscleGroupFilter, setMuscleGroupFilter] = useState('all');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [isCustomFilter, setIsCustomFilter] = useState('all');
  const [isActiveFilter, setIsActiveFilter] = useState('true');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;
  
  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  // Fetch exercises with filters
  const fetchExercises = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        isActive: isActiveFilter
      });
      
      if (search) params.append('search', search);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (difficultyFilter !== 'all') params.append('difficulty', difficultyFilter);
      if (muscleGroupFilter !== 'all') params.append('muscleGroup', muscleGroupFilter);
      if (equipmentFilter !== 'all') params.append('equipment', equipmentFilter);
      if (isCustomFilter !== 'all') params.append('isCustom', isCustomFilter);

      const response = await api.get(`/api/admin/exercises?${params}`);
      
      setExercises(response.data.exercises);
      setTotalPages(response.data.pagination.pages);
      setTotalCount(response.data.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch exercises');
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories and metadata
  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/admin/exercises/categories');
      setCategories(response.data);
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchExercises();
  }, [currentPage, search, categoryFilter, difficultyFilter, muscleGroupFilter, equipmentFilter, isCustomFilter, isActiveFilter]);

  // Handle create new exercise
  const handleCreate = () => {
    setEditingExercise(null);
    setShowForm(true);
  };

  // Handle edit exercise
  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setShowForm(true);
  };

  // Handle form submission
  const handleFormSubmit = async (data: any) => {
    try {
      if (editingExercise) {
        await api.put(`/api/admin/exercises/${editingExercise.id}`, data);
        toast.success('Exercise updated successfully');
      } else {
        await api.post('/api/admin/exercises', data);
        toast.success('Exercise created successfully');
      }
      
      setShowForm(false);
      setEditingExercise(null);
      await fetchExercises();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save exercise');
    }
  };

  // Handle delete exercise
  const handleDelete = (exercise: Exercise) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Exercise',
      message: `Are you sure you want to delete "${exercise.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await api.delete(`/api/admin/exercises/${exercise.id}`);
          toast.success('Exercise deleted successfully');
          await fetchExercises();
        } catch (err: any) {
          toast.error(err.response?.data?.error || 'Failed to delete exercise');
        } finally {
          setIsProcessing(false);
          setConfirmModal(null);
        }
      }
    });
  };

  // Handle import static exercises
  const handleImport = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Import Default Exercises',
      message: 'This will import all default exercises from the static database. Existing exercises will be skipped. Continue?',
      onConfirm: async () => {
        setImportLoading(true);
        setIsProcessing(true);
        try {
          const response = await api.post('/api/admin/exercises/import');
          toast.success(`Import completed: ${response.data.imported} imported, ${response.data.skipped} skipped`);
          if (response.data.errors.length > 0) {
            console.error('Import errors:', response.data.errors);
          }
          await fetchExercises();
        } catch (err: any) {
          toast.error(err.response?.data?.error || 'Failed to import exercises');
        } finally {
          setImportLoading(false);
          setIsProcessing(false);
          setConfirmModal(null);
        }
      }
    });
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Clear filters
  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setDifficultyFilter('all');
    setMuscleGroupFilter('all');
    setEquipmentFilter('all');
    setIsCustomFilter('all');
    setCurrentPage(1);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Exercise Management</h2>
          <p className="text-gray-400 mt-1">Manage custom exercises for workout generation</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleImport}
            disabled={importLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500 rounded text-white font-semibold transition-colors"
          >
            {importLoading ? 'Importing...' : 'Import Defaults'}
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white font-semibold transition-colors"
          >
            Create Exercise
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories?.categories.map(cat => (
              <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
            ))}
          </select>

          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Difficulties</option>
            {categories?.difficulties.map(diff => (
              <option key={diff} value={diff}>{diff.charAt(0).toUpperCase() + diff.slice(1)}</option>
            ))}
          </select>

          <select
            value={muscleGroupFilter}
            onChange={(e) => setMuscleGroupFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Muscle Groups</option>
            {categories?.muscleGroups.map(mg => (
              <option key={mg} value={mg}>{mg.charAt(0).toUpperCase() + mg.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <select
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Equipment</option>
            {categories?.equipment.map(eq => (
              <option key={eq} value={eq}>{eq.charAt(0).toUpperCase() + eq.slice(1)}</option>
            ))}
          </select>

          <select
            value={isCustomFilter}
            onChange={(e) => setIsCustomFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="true">Custom Only</option>
            <option value="false">Default Only</option>
          </select>

          <select
            value={isActiveFilter}
            onChange={(e) => setIsActiveFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
            <option value="all">All Status</option>
          </select>
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={clearFilters}
            className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear Filters
          </button>
          <span className="text-sm text-gray-400">
            {totalCount} exercise{totalCount !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>

      {/* Exercise List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchExercises}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
          >
            Retry
          </button>
        </div>
      ) : exercises.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No exercises found</p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
          >
            Create First Exercise
          </button>
        </div>
      ) : (
        <>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Difficulty</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Muscle Groups</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Equipment</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {exercises.map((exercise) => (
                    <tr key={exercise.id} className="hover:bg-gray-700 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-white font-medium">{exercise.name}</p>
                          <p className="text-gray-400 text-sm truncate max-w-xs" title={exercise.description}>
                            {exercise.description}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded bg-blue-600 text-white">
                          {exercise.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${
                          exercise.difficulty === 'beginner' ? 'bg-green-600' :
                          exercise.difficulty === 'intermediate' ? 'bg-yellow-600' :
                          'bg-red-600'
                        } text-white`}>
                          {exercise.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {exercise.muscleGroups.slice(0, 2).map((mg, idx) => (
                            <span key={idx} className="px-1 py-0.5 text-xs bg-gray-600 text-gray-300 rounded">
                              {mg}
                            </span>
                          ))}
                          {exercise.muscleGroups.length > 2 && (
                            <span className="px-1 py-0.5 text-xs bg-gray-600 text-gray-300 rounded">
                              +{exercise.muscleGroups.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {exercise.equipment.slice(0, 2).map((eq, idx) => (
                            <span key={idx} className="px-1 py-0.5 text-xs bg-gray-600 text-gray-300 rounded">
                              {eq}
                            </span>
                          ))}
                          {exercise.equipment.length > 2 && (
                            <span className="px-1 py-0.5 text-xs bg-gray-600 text-gray-300 rounded">
                              +{exercise.equipment.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${
                          exercise.isCustom ? 'bg-purple-600' : 'bg-gray-600'
                        } text-white`}>
                          {exercise.isCustom ? 'Custom' : 'Default'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${
                          exercise.isActive ? 'bg-green-600' : 'bg-red-600'
                        } text-white`}>
                          {exercise.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(exercise)}
                            className="px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 rounded text-white transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(exercise)}
                            className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded text-white transition-colors"
              >
                Previous
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-2 rounded transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-white'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded text-white transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Exercise Form Modal */}
      {showForm && (
        <ExerciseForm
          exercise={editingExercise}
          categories={categories}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingExercise(null);
          }}
        />
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(null)}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          type="warning"
          isLoading={isProcessing}
        />
      )}
    </div>
  );
};

export default CustomExercisesPanel;