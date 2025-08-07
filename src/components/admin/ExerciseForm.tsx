import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, MinusIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

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
  isActive: boolean;
}

interface ExerciseCategories {
  categories: string[];
  difficulties: string[];
  muscleGroups: string[];
  equipment: string[];
}

interface ExerciseFormProps {
  exercise?: Exercise | null;
  categories: ExerciseCategories | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const ExerciseForm: React.FC<ExerciseFormProps> = ({
  exercise,
  categories,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    muscleGroups: [] as string[],
    equipment: [] as string[],
    difficulty: '',
    instructions: [''],
    tips: [''],
    imageUrl: '',
    videoUrl: '',
    isActive: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form data when editing
  useEffect(() => {
    if (exercise) {
      setFormData({
        name: exercise.name,
        description: exercise.description,
        category: exercise.category,
        muscleGroups: exercise.muscleGroups,
        equipment: exercise.equipment,
        difficulty: exercise.difficulty,
        instructions: exercise.instructions.length > 0 ? exercise.instructions : [''],
        tips: exercise.tips.length > 0 ? exercise.tips : [''],
        imageUrl: exercise.imageUrl || '',
        videoUrl: exercise.videoUrl || '',
        isActive: exercise.isActive
      });
    }
  }, [exercise]);

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.muscleGroups.length === 0) {
      newErrors.muscleGroups = 'At least one muscle group is required';
    }

    if (formData.equipment.length === 0) {
      newErrors.equipment = 'At least one equipment type is required';
    }

    if (!formData.difficulty) {
      newErrors.difficulty = 'Difficulty is required';
    }

    const validInstructions = formData.instructions.filter(inst => inst.trim());
    if (validInstructions.length === 0) {
      newErrors.instructions = 'At least one instruction is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Clean up empty strings
      const submitData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
        instructions: formData.instructions.filter(inst => inst.trim()),
        tips: formData.tips.filter(tip => tip.trim()),
        imageUrl: formData.imageUrl.trim() || null,
        videoUrl: formData.videoUrl.trim() || null
      };

      await onSubmit(submitData);
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle muscle group selection
  const handleMuscleGroupToggle = (muscleGroup: string) => {
    const updatedGroups = formData.muscleGroups.includes(muscleGroup)
      ? formData.muscleGroups.filter(mg => mg !== muscleGroup)
      : [...formData.muscleGroups, muscleGroup];
    
    handleInputChange('muscleGroups', updatedGroups);
  };

  // Handle equipment selection
  const handleEquipmentToggle = (equipmentItem: string) => {
    const updatedEquipment = formData.equipment.includes(equipmentItem)
      ? formData.equipment.filter(eq => eq !== equipmentItem)
      : [...formData.equipment, equipmentItem];
    
    handleInputChange('equipment', updatedEquipment);
  };

  // Handle instructions array
  const handleInstructionsChange = (index: number, value: string) => {
    const updatedInstructions = [...formData.instructions];
    updatedInstructions[index] = value;
    handleInputChange('instructions', updatedInstructions);
  };

  const addInstruction = () => {
    handleInputChange('instructions', [...formData.instructions, '']);
  };

  const removeInstruction = (index: number) => {
    if (formData.instructions.length > 1) {
      const updatedInstructions = formData.instructions.filter((_, i) => i !== index);
      handleInputChange('instructions', updatedInstructions);
    }
  };

  // Handle tips array
  const handleTipsChange = (index: number, value: string) => {
    const updatedTips = [...formData.tips];
    updatedTips[index] = value;
    handleInputChange('tips', updatedTips);
  };

  const addTip = () => {
    handleInputChange('tips', [...formData.tips, '']);
  };

  const removeTip = (index: number) => {
    if (formData.tips.length > 1) {
      const updatedTips = formData.tips.filter((_, i) => i !== index);
      handleInputChange('tips', updatedTips);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">
            {exercise ? 'Edit Exercise' : 'Create Exercise'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Exercise Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 bg-gray-800 text-white rounded border ${
                  errors.name ? 'border-red-500' : 'border-gray-600'
                } focus:border-blue-500 focus:outline-none`}
                placeholder="e.g., Push-ups"
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className={`w-full px-3 py-2 bg-gray-800 text-white rounded border ${
                  errors.category ? 'border-red-500' : 'border-gray-600'
                } focus:border-blue-500 focus:outline-none`}
              >
                <option value="">Select category</option>
                {categories?.categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
              {errors.category && <p className="text-red-400 text-sm mt-1">{errors.category}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 bg-gray-800 text-white rounded border ${
                errors.description ? 'border-red-500' : 'border-gray-600'
              } focus:border-blue-500 focus:outline-none`}
              placeholder="Describe the exercise and its benefits..."
            />
            {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Difficulty *
            </label>
            <select
              value={formData.difficulty}
              onChange={(e) => handleInputChange('difficulty', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-800 text-white rounded border ${
                errors.difficulty ? 'border-red-500' : 'border-gray-600'
              } focus:border-blue-500 focus:outline-none`}
            >
              <option value="">Select difficulty</option>
              {categories?.difficulties.map(diff => (
                <option key={diff} value={diff}>
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </option>
              ))}
            </select>
            {errors.difficulty && <p className="text-red-400 text-sm mt-1">{errors.difficulty}</p>}
          </div>

          {/* Muscle Groups */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Muscle Groups * ({formData.muscleGroups.length} selected)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-40 overflow-y-auto bg-gray-800 p-3 rounded border border-gray-600">
              {categories?.muscleGroups.map(mg => (
                <label key={mg} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.muscleGroups.includes(mg)}
                    onChange={() => handleMuscleGroupToggle(mg)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">
                    {mg.charAt(0).toUpperCase() + mg.slice(1)}
                  </span>
                </label>
              ))}
            </div>
            {errors.muscleGroups && <p className="text-red-400 text-sm mt-1">{errors.muscleGroups}</p>}
          </div>

          {/* Equipment */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Equipment * ({formData.equipment.length} selected)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-40 overflow-y-auto bg-gray-800 p-3 rounded border border-gray-600">
              {categories?.equipment.map(eq => (
                <label key={eq} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.equipment.includes(eq)}
                    onChange={() => handleEquipmentToggle(eq)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">
                    {eq.charAt(0).toUpperCase() + eq.slice(1)}
                  </span>
                </label>
              ))}
            </div>
            {errors.equipment && <p className="text-red-400 text-sm mt-1">{errors.equipment}</p>}
          </div>

          {/* Instructions */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-300">
                Instructions *
              </label>
              <button
                type="button"
                onClick={addInstruction}
                className="flex items-center gap-1 px-2 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add Step
              </button>
            </div>
            <div className="space-y-2">
              {formData.instructions.map((instruction, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={instruction}
                      onChange={(e) => handleInstructionsChange(index, e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                      placeholder={`Step ${index + 1}...`}
                    />
                  </div>
                  {formData.instructions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeInstruction(index)}
                      className="px-2 py-2 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {errors.instructions && <p className="text-red-400 text-sm mt-1">{errors.instructions}</p>}
          </div>

          {/* Tips */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-300">
                Tips (optional)
              </label>
              <button
                type="button"
                onClick={addTip}
                className="flex items-center gap-1 px-2 py-1 text-sm bg-green-600 hover:bg-green-700 rounded text-white transition-colors"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add Tip
              </button>
            </div>
            <div className="space-y-2">
              {formData.tips.map((tip, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={tip}
                      onChange={(e) => handleTipsChange(index, e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                      placeholder={`Tip ${index + 1}...`}
                    />
                  </div>
                  {formData.tips.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTip(index)}
                      className="px-2 py-2 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Media URLs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Image URL (optional)
              </label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Video URL (optional)
              </label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => handleInputChange('videoUrl', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">
                Exercise is active (available for workout generation)
              </span>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500 rounded text-white transition-colors"
            >
              {isSubmitting ? 'Saving...' : (exercise ? 'Update Exercise' : 'Create Exercise')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExerciseForm;