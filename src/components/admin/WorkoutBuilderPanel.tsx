import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '../../services/api';
import ConfirmationModal from '../common/ConfirmationModal';
import { WorkoutDurationService } from '../../services/workoutDurationService';
import { ExerciseType } from '../../types/workout';

interface Exercise {
  id: string;
  name: string;
  description: string;
  muscleGroups: string[];
  equipment: string[];
  difficulty: string;
  type?: ExerciseType;
  instructions: string[];
  imageUrl?: string;
  gifPath?: string;
}

interface WorkoutExercise {
  exercise: Exercise;
  sets: number;
  reps: number;
  restTime: number;
  weight?: number;
  notes?: string;
  order: number;
}

interface WorkoutPlan {
  id?: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  exercises: WorkoutExercise[];
  targetMuscleGroups: string[];
  equipment: string[];
  type: 'strength' | 'cardio' | 'flexibility' | 'mixed';
}

const WorkoutBuilderPanel: React.FC = () => {
  // State
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan>({
    name: '',
    description: '',
    difficulty: 'intermediate',
    duration: 45,
    exercises: [],
    targetMuscleGroups: [],
    equipment: [],
    type: 'strength'
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Exercise filters
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exerciseTypeFilter, setExerciseTypeFilter] = useState<string>('all');
  const [muscleCroupFilter, setMuscleGroupFilter] = useState('all');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  
  // Drag and drop
  const [draggedExercise, setDraggedExercise] = useState<Exercise | null>(null);
  const [draggedWorkoutExercise, setDraggedWorkoutExercise] = useState<WorkoutExercise | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Modals
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<WorkoutExercise | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  
  // Refs
  const workoutAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/admin/exercises');
      // Handle both array and paginated response formats
      const exercisesData = Array.isArray(response.data) 
        ? response.data 
        : response.data.exercises || [];
      setExercises(exercisesData);
    } catch (err: any) {
      setError('Failed to load exercises');
      toast.error('Failed to load exercises');
      // Ensure exercises is always an array even on error
      setExercises([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter exercises with safety guard
  const filteredExercises = (exercises || []).filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase());
    const matchesType = exerciseTypeFilter === 'all' || exercise.type === exerciseTypeFilter;
    const matchesMuscle = muscleCroupFilter === 'all' || exercise.muscleGroups.includes(muscleCroupFilter);
    const matchesEquipment = equipmentFilter === 'all' || exercise.equipment.includes(equipmentFilter);
    
    return matchesSearch && matchesType && matchesMuscle && matchesEquipment;
  });

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, exercise: Exercise) => {
    setDraggedExercise(exercise);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleWorkoutDragStart = (e: React.DragEvent, workoutExercise: WorkoutExercise) => {
    setDraggedWorkoutExercise(workoutExercise);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = draggedExercise ? 'copy' : 'move';
    setDragOverIndex(index !== undefined ? index : null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex?: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (draggedExercise) {
      // Adding new exercise from library
      const newWorkoutExercise: WorkoutExercise = {
        exercise: draggedExercise,
        sets: getDefaultSets(draggedExercise.type, workoutPlan.difficulty),
        reps: getDefaultReps(draggedExercise.type, workoutPlan.difficulty),
        restTime: WorkoutDurationService.getRecommendedRestTime(
          draggedExercise.type || ExerciseType.STRENGTH, 
          workoutPlan.duration
        ),
        order: dropIndex !== undefined ? dropIndex : workoutPlan.exercises.length
      };
      
      const newExercises = [...workoutPlan.exercises];
      if (dropIndex !== undefined) {
        newExercises.splice(dropIndex, 0, newWorkoutExercise);
      } else {
        newExercises.push(newWorkoutExercise);
      }
      
      // Update order for all exercises
      newExercises.forEach((ex, idx) => ex.order = idx);
      
      setWorkoutPlan({
        ...workoutPlan,
        exercises: newExercises
      });
      
      toast.success(`Added ${draggedExercise.name} to workout`);
      
    } else if (draggedWorkoutExercise && dropIndex !== undefined) {
      // Reordering existing exercises
      const currentIndex = workoutPlan.exercises.findIndex(ex => ex.exercise.id === draggedWorkoutExercise.exercise.id);
      const newExercises = [...workoutPlan.exercises];
      
      // Remove from current position
      newExercises.splice(currentIndex, 1);
      
      // Insert at new position
      const adjustedDropIndex = dropIndex > currentIndex ? dropIndex - 1 : dropIndex;
      newExercises.splice(adjustedDropIndex, 0, draggedWorkoutExercise);
      
      // Update order
      newExercises.forEach((ex, idx) => ex.order = idx);
      
      setWorkoutPlan({
        ...workoutPlan,
        exercises: newExercises
      });
    }
    
    setDraggedExercise(null);
    setDraggedWorkoutExercise(null);
  };

  const getDefaultSets = (type?: ExerciseType, difficulty?: string): number => {
    if (type === ExerciseType.WARMUP || type === ExerciseType.COOLDOWN) return 1;
    if (type === ExerciseType.CARDIO) return 3;
    return difficulty === 'beginner' ? 2 : difficulty === 'advanced' ? 4 : 3;
  };

  const getDefaultReps = (type?: ExerciseType, difficulty?: string): number => {
    if (type === ExerciseType.WARMUP) return 8;
    if (type === ExerciseType.COOLDOWN || type === ExerciseType.FLEXIBILITY) return 30; // seconds
    if (type === ExerciseType.CARDIO) return 45; // seconds
    return difficulty === 'beginner' ? 8 : difficulty === 'advanced' ? 12 : 10;
  };

  const removeExercise = (exerciseId: string) => {
    const newExercises = workoutPlan.exercises
      .filter(ex => ex.exercise.id !== exerciseId)
      .map((ex, idx) => ({ ...ex, order: idx }));
    
    setWorkoutPlan({
      ...workoutPlan,
      exercises: newExercises
    });
    
    toast.success('Exercise removed from workout');
  };

  const calculateDuration = (): number => {
    return WorkoutDurationService.calculateWorkoutDuration(workoutPlan.exercises);
  };

  const saveWorkout = async () => {
    if (!workoutPlan.name.trim()) {
      toast.error('Please enter a workout name');
      return;
    }
    
    if (workoutPlan.exercises.length === 0) {
      toast.error('Please add at least one exercise');
      return;
    }
    
    setSaving(true);
    try {
      const calculatedDuration = calculateDuration();
      const workoutToSave = {
        ...workoutPlan,
        duration: calculatedDuration,
        targetMuscleGroups: [...new Set(workoutPlan.exercises.flatMap(ex => ex.exercise.muscleGroups))],
        equipment: [...new Set(workoutPlan.exercises.flatMap(ex => ex.exercise.equipment))]
      };
      
      await api.post('/api/admin/workout-templates', workoutToSave);
      toast.success('Workout saved successfully!');
      
      // Reset form
      setWorkoutPlan({
        name: '',
        description: '',
        difficulty: 'intermediate',
        duration: 45,
        exercises: [],
        targetMuscleGroups: [],
        equipment: [],
        type: 'strength'
      });
      
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save workout');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading exercises...</p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-hidden">
      <div className="flex h-full gap-6">
        {/* Exercise Library Sidebar */}
        <div className="w-1/3 bg-gray-800 rounded-lg flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Exercise Library</h3>
            
            {/* Exercise Filters */}
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search exercises..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 text-sm"
              />
              
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={exerciseTypeFilter}
                  onChange={(e) => setExerciseTypeFilter(e.target.value)}
                  className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                >
                  <option value="all">All Types</option>
                  <option value={ExerciseType.WARMUP}>Warmup</option>
                  <option value={ExerciseType.STRENGTH}>Strength</option>
                  <option value={ExerciseType.CARDIO}>Cardio</option>
                  <option value={ExerciseType.COOLDOWN}>Cooldown</option>
                </select>
                
                <select
                  value={muscleCroupFilter}
                  onChange={(e) => setMuscleGroupFilter(e.target.value)}
                  className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                >
                  <option value="all">All Muscles</option>
                  <option value="chest">Chest</option>
                  <option value="back">Back</option>
                  <option value="shoulders">Shoulders</option>
                  <option value="arms">Arms</option>
                  <option value="legs">Legs</option>
                  <option value="core">Core</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Exercise List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {filteredExercises.map((exercise) => (
                <div
                  key={exercise.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, exercise)}
                  className="p-3 bg-gray-700 rounded cursor-move hover:bg-gray-600 transition-colors border border-gray-600 hover:border-blue-500"
                >
                  <div className="flex items-center gap-3">
                    {exercise.gifPath && (
                      <img
                        src={exercise.gifPath}
                        alt={exercise.name}
                        className="w-8 h-8 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {exercise.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-gray-600 text-gray-300 rounded">
                          {exercise.type || 'strength'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {exercise.muscleGroups.slice(0, 2).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredExercises.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  No exercises match the current filters
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Workout Builder Main Area */}
        <div className="flex-1 bg-gray-800 rounded-lg flex flex-col">
          {/* Workout Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Workout Name"
                value={workoutPlan.name}
                onChange={(e) => setWorkoutPlan({ ...workoutPlan, name: e.target.value })}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
              />
              
              <select
                value={workoutPlan.difficulty}
                onChange={(e) => setWorkoutPlan({ ...workoutPlan, difficulty: e.target.value as any })}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            
            <textarea
              placeholder="Workout Description"
              value={workoutPlan.description}
              onChange={(e) => setWorkoutPlan({ ...workoutPlan, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 resize-none"
              rows={2}
            />
            
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-400">
                <span>Estimated Duration: {calculateDuration()} minutes</span>
                <span className="ml-4">Exercises: {workoutPlan.exercises.length}</span>
              </div>
              
              <button
                onClick={saveWorkout}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>💾 Save Workout</>
                )}
              </button>
            </div>
          </div>

          {/* Workout Exercises */}
          <div 
            ref={workoutAreaRef}
            className="flex-1 p-6 overflow-y-auto"
            onDragOver={(e) => handleDragOver(e)}
            onDrop={(e) => handleDrop(e)}
          >
            {workoutPlan.exercises.length === 0 ? (
              <div className="text-center text-gray-400 py-16">
                <div className="text-6xl mb-4">🏗️</div>
                <h3 className="text-xl font-medium mb-2">Start Building Your Workout</h3>
                <p>Drag exercises from the library to create your workout</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workoutPlan.exercises.map((workoutExercise, index) => (
                  <div key={`${workoutExercise.exercise.id}-${index}`}>
                    {/* Drop zone above exercise */}
                    <div
                      className={`h-2 transition-all ${
                        dragOverIndex === index ? 'bg-blue-500 h-8 rounded' : ''
                      }`}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                    />
                    
                    {/* Exercise Card */}
                    <div
                      draggable
                      onDragStart={(e) => handleWorkoutDragStart(e, workoutExercise)}
                      className="p-4 bg-gray-700 rounded-lg border border-gray-600 hover:border-blue-500 transition-colors cursor-move"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-gray-400 font-mono text-sm">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          
                          {workoutExercise.exercise.gifPath && (
                            <img
                              src={workoutExercise.exercise.gifPath}
                              alt={workoutExercise.exercise.name}
                              className="w-12 h-12 object-cover rounded border border-gray-600"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                          
                          <div>
                            <div className="text-white font-medium">
                              {workoutExercise.exercise.name}
                            </div>
                            <div className="text-sm text-gray-400">
                              {workoutExercise.sets} sets × {workoutExercise.reps} reps
                              {workoutExercise.restTime && (
                                <span> • {workoutExercise.restTime}s rest</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingExercise(workoutExercise)}
                            className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                            title="Edit exercise parameters"
                          >
                            ✏️
                          </button>
                          
                          <button
                            onClick={() => removeExercise(workoutExercise.exercise.id)}
                            className="p-2 text-red-400 hover:text-red-300 transition-colors"
                            title="Remove exercise"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Final drop zone */}
                <div
                  className={`h-8 transition-all border-2 border-dashed rounded ${
                    dragOverIndex === null && draggedExercise
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-gray-600'
                  }`}
                  onDragOver={(e) => handleDragOver(e)}
                  onDrop={(e) => handleDrop(e)}
                >
                  {draggedExercise && (
                    <div className="flex items-center justify-center h-full text-blue-400 text-sm">
                      Drop here to add to end
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exercise Edit Modal */}
      {editingExercise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">
              Edit {editingExercise.exercise.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Sets</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editingExercise.sets}
                  onChange={(e) => setEditingExercise({
                    ...editingExercise,
                    sets: parseInt(e.target.value) || 1
                  })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Reps</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={editingExercise.reps}
                  onChange={(e) => setEditingExercise({
                    ...editingExercise,
                    reps: parseInt(e.target.value) || 1
                  })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Rest Time (seconds)</label>
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={editingExercise.restTime}
                  onChange={(e) => setEditingExercise({
                    ...editingExercise,
                    restTime: parseInt(e.target.value) || 0
                  })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Notes (optional)</label>
                <textarea
                  value={editingExercise.notes || ''}
                  onChange={(e) => setEditingExercise({
                    ...editingExercise,
                    notes: e.target.value
                  })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white resize-none"
                  rows={2}
                  placeholder="Add exercise-specific notes..."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingExercise(null)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={() => {
                  const updatedExercises = workoutPlan.exercises.map(ex =>
                    ex.exercise.id === editingExercise.exercise.id ? editingExercise : ex
                  );
                  setWorkoutPlan({ ...workoutPlan, exercises: updatedExercises });
                  setEditingExercise(null);
                  toast.success('Exercise updated');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
};

export default WorkoutBuilderPanel;