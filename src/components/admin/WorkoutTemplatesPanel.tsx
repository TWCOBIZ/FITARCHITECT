import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaPlus, FaEdit, FaTrash, FaCopy, FaPlay, FaExclamationTriangle, FaDownload } from 'react-icons/fa'
import { toast } from 'react-hot-toast'
import { api } from '../../services/api'
import ConfirmationModal from '../common/ConfirmationModal'

interface WorkoutTemplate {
  id: string
  name: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration: number
  targetMuscleGroups: string[]
  equipment: string[]
  exercises: TemplateExercise[]
  isPublic: boolean
  createdBy: string
  createdAt: string
  usageCount: number
}

interface TemplateExercise {
  id: string
  name: string
  sets: number
  reps: number | string
  restTime: number
  notes?: string
  muscleGroups: string[]
  equipment: string[]
  order: number
}

const WorkoutTemplatesPanel: React.FC = () => {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')
  const [filterMuscleGroup, setFilterMuscleGroup] = useState<string>('all')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null)
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    difficulty: 'beginner' as const,
    duration: 30,
    targetMuscleGroups: [] as string[],
    equipment: [] as string[],
    exercises: [] as TemplateExercise[],
    isPublic: true
  })

  // Available options
  const muscleGroups = [
    'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core', 'glutes', 'calves', 'forearms'
  ]
  
  const equipmentOptions = [
    'bodyweight', 'dumbbells', 'barbell', 'resistance_bands', 'cable_machine', 
    'pull_up_bar', 'kettlebell', 'medicine_ball', 'bench', 'squat_rack'
  ]

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/admin/workout-templates')
      setTemplates(response.data)
      setError(null)
    } catch (error) {
      console.error('Failed to fetch workout templates:', error)
      setError('Failed to load workout templates')
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDifficulty = filterDifficulty === 'all' || template.difficulty === filterDifficulty
    const matchesMuscleGroup = filterMuscleGroup === 'all' || 
                              template.targetMuscleGroups.includes(filterMuscleGroup)
    
    return matchesSearch && matchesDifficulty && matchesMuscleGroup
  })

  const openTemplateModal = (template?: WorkoutTemplate) => {
    if (template) {
      setEditingTemplate(template)
      setTemplateForm({
        name: template.name,
        description: template.description,
        difficulty: template.difficulty,
        duration: template.duration,
        targetMuscleGroups: [...template.targetMuscleGroups],
        equipment: [...template.equipment],
        exercises: [...template.exercises],
        isPublic: template.isPublic
      })
    } else {
      setEditingTemplate(null)
      setTemplateForm({
        name: '',
        description: '',
        difficulty: 'beginner',
        duration: 30,
        targetMuscleGroups: [],
        equipment: [],
        exercises: [],
        isPublic: true
      })
    }
    setShowTemplateModal(true)
  }

  const closeTemplateModal = () => {
    setShowTemplateModal(false)
    setEditingTemplate(null)
    setTemplateForm({
      name: '',
      description: '',
      difficulty: 'beginner',
      duration: 30,
      targetMuscleGroups: [],
      equipment: [],
      exercises: [],
      isPublic: true
    })
  }

  const handleSaveTemplate = async () => {
    try {
      setIsProcessing(true)
      
      if (editingTemplate) {
        await api.put(`/api/admin/workout-templates/${editingTemplate.id}`, templateForm)
        toast.success('Template updated successfully')
      } else {
        await api.post('/api/admin/workout-templates', templateForm)
        toast.success('Template created successfully')
      }
      
      await fetchTemplates()
      closeTemplateModal()
    } catch (error) {
      console.error('Failed to save template:', error)
      toast.error('Failed to save template')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteTemplate = (template: WorkoutTemplate) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Workout Template',
      message: `Are you sure you want to delete "${template.name}"? This action cannot be undone and will affect any users currently using this template.`,
      onConfirm: async () => {
        setIsProcessing(true)
        try {
          await api.delete(`/api/admin/workout-templates/${template.id}`)
          toast.success('Template deleted successfully')
          await fetchTemplates()
        } catch (error) {
          console.error('Failed to delete template:', error)
          toast.error('Failed to delete template')
        } finally {
          setIsProcessing(false)
          setConfirmModal(null)
        }
      }
    })
  }

  const handleDuplicateTemplate = async (template: WorkoutTemplate) => {
    try {
      const duplicatedTemplate = {
        ...template,
        name: `${template.name} (Copy)`,
        id: undefined
      }
      
      await api.post('/api/admin/workout-templates', duplicatedTemplate)
      toast.success('Template duplicated successfully')
      await fetchTemplates()
    } catch (error) {
      console.error('Failed to duplicate template:', error)
      toast.error('Failed to duplicate template')
    }
  }

  const handleTogglePublic = async (template: WorkoutTemplate) => {
    try {
      await api.patch(`/api/admin/workout-templates/${template.id}`, {
        isPublic: !template.isPublic
      })
      toast.success(`Template ${template.isPublic ? 'made private' : 'made public'}`)
      await fetchTemplates()
    } catch (error) {
      console.error('Failed to toggle template visibility:', error)
      toast.error('Failed to update template visibility')
    }
  }

  const addExerciseToTemplate = () => {
    const newExercise: TemplateExercise = {
      id: `temp-${Date.now()}`,
      name: '',
      sets: 3,
      reps: 10,
      restTime: 60,
      notes: '',
      muscleGroups: [],
      equipment: [],
      order: templateForm.exercises.length
    }
    
    setTemplateForm(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise]
    }))
  }

  const removeExerciseFromTemplate = (exerciseId: string) => {
    setTemplateForm(prev => ({
      ...prev,
      exercises: prev.exercises.filter(ex => ex.id !== exerciseId)
    }))
  }

  const updateExercise = (exerciseId: string, updates: Partial<TemplateExercise>) => {
    setTemplateForm(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, ...updates } : ex
      )
    }))
  }

  const handleArrayToggle = (array: string[], value: string, setter: (arr: string[]) => void) => {
    if (array.includes(value)) {
      setter(array.filter(item => item !== value))
    } else {
      setter([...array, value])
    }
  }

  const handleImportWgerWorkouts = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Import WGER Workouts',
      message: 'This will download and import up to 200 workout templates from the WGER database. This process may take several minutes. Continue?',
      onConfirm: async () => {
        setIsImporting(true)
        try {
          const loadingToast = toast.loading('Importing workouts from WGER...')
          const response = await api.post('/api/admin/import-wger-workouts', { limit: 200 })
          toast.dismiss(loadingToast)
          toast.success(`Successfully imported ${response.data.imported} workouts from WGER`)
          await fetchTemplates()
        } catch (error: any) {
          console.error('Failed to import WGER workouts:', error)
          toast.error(error.response?.data?.error || 'Failed to import WGER workouts')
        } finally {
          setIsImporting(false)
          setConfirmModal(null)
        }
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
        <div className="flex items-center">
          <FaExclamationTriangle className="text-red-400 mr-3" />
          <div>
            <h3 className="text-red-400 font-medium">Error Loading Templates</h3>
            <p className="text-red-300 text-sm mt-1">{error}</p>
            <button
              onClick={fetchTemplates}
              className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Workout Templates</h1>
          <p className="text-gray-400">Manage pre-built workout templates for users</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleImportWgerWorkouts}
            disabled={isImporting}
            className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium"
          >
            <FaDownload className="mr-2" />
            {isImporting ? 'Importing...' : 'Import from WGER'}
          </button>
          <button
            onClick={() => openTemplateModal()}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium"
          >
            <FaPlus className="mr-2" />
            Create Template
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search templates..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Difficulties</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Muscle Group</label>
            <select
              value={filterMuscleGroup}
              onChange={(e) => setFilterMuscleGroup(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Muscle Groups</option>
              {muscleGroups.map(muscle => (
                <option key={muscle} value={muscle}>{muscle.charAt(0).toUpperCase() + muscle.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <div className="text-sm text-gray-400">
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-lg border border-gray-700 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">{template.name}</h3>
                <p className="text-gray-400 text-sm line-clamp-2">{template.description}</p>
              </div>
              <div className="flex items-center ml-2">
                {template.isPublic ? (
                  <span className="px-2 py-1 bg-green-900/50 text-green-400 text-xs rounded">Public</span>
                ) : (
                  <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">Private</span>
                )}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Difficulty:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  template.difficulty === 'beginner' ? 'bg-green-900/50 text-green-400' :
                  template.difficulty === 'intermediate' ? 'bg-yellow-900/50 text-yellow-400' :
                  'bg-red-900/50 text-red-400'
                }`}>
                  {template.difficulty}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Duration:</span>
                <span className="text-white">{template.duration} min</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Exercises:</span>
                <span className="text-white">{template.exercises.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Usage:</span>
                <span className="text-white">{template.usageCount} times</span>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-1">Target Muscles:</div>
              <div className="flex flex-wrap gap-1">
                {template.targetMuscleGroups.slice(0, 3).map(muscle => (
                  <span key={muscle} className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">
                    {muscle}
                  </span>
                ))}
                {template.targetMuscleGroups.length > 3 && (
                  <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                    +{template.targetMuscleGroups.length - 3}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openTemplateModal(template)}
                  className="p-2 text-blue-400 hover:bg-blue-900/20 rounded"
                  title="Edit Template"
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => handleDuplicateTemplate(template)}
                  className="p-2 text-green-400 hover:bg-green-900/20 rounded"
                  title="Duplicate Template"
                >
                  <FaCopy />
                </button>
                <button
                  onClick={() => handleTogglePublic(template)}
                  className="p-2 text-yellow-400 hover:bg-yellow-900/20 rounded"
                  title={template.isPublic ? 'Make Private' : 'Make Public'}
                >
                  <FaPlay />
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template)}
                  className="p-2 text-red-400 hover:bg-red-900/20 rounded"
                  title="Delete Template"
                >
                  <FaTrash />
                </button>
              </div>
              <div className="text-xs text-gray-400">
                {new Date(template.createdAt).toLocaleDateString()}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No workout templates found</p>
          <button
            onClick={() => openTemplateModal()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
          >
            Create Your First Template
          </button>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h2>
              <button
                onClick={closeTemplateModal}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Template Name</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter template name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Duration (minutes)</label>
                  <input
                    type="number"
                    value={templateForm.duration}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="5"
                    max="180"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe this workout template"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
                  <select
                    value={templateForm.difficulty}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, difficulty: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={templateForm.isPublic}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-gray-300">Make template public</span>
                  </label>
                </div>
              </div>

              {/* Target Muscle Groups */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Target Muscle Groups</label>
                <div className="flex flex-wrap gap-2">
                  {muscleGroups.map(muscle => (
                    <button
                      key={muscle}
                      type="button"
                      onClick={() => handleArrayToggle(
                        templateForm.targetMuscleGroups,
                        muscle,
                        (arr) => setTemplateForm(prev => ({ ...prev, targetMuscleGroups: arr }))
                      )}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        templateForm.targetMuscleGroups.includes(muscle)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Required Equipment */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Required Equipment</label>
                <div className="flex flex-wrap gap-2">
                  {equipmentOptions.map(equipment => (
                    <button
                      key={equipment}
                      type="button"
                      onClick={() => handleArrayToggle(
                        templateForm.equipment,
                        equipment,
                        (arr) => setTemplateForm(prev => ({ ...prev, equipment: arr }))
                      )}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        templateForm.equipment.includes(equipment)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {equipment.replace('_', ' ').charAt(0).toUpperCase() + equipment.replace('_', ' ').slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exercises */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-300">Exercises</label>
                  <button
                    type="button"
                    onClick={addExerciseToTemplate}
                    className="flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-sm"
                  >
                    <FaPlus className="mr-1" />
                    Add Exercise
                  </button>
                </div>
                
                <div className="space-y-4">
                  {templateForm.exercises.map((exercise, index) => (
                    <div key={exercise.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-300">Exercise {index + 1}</span>
                        <button
                          onClick={() => removeExerciseFromTemplate(exercise.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <FaTrash />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <input
                          type="text"
                          placeholder="Exercise name"
                          value={exercise.name}
                          onChange={(e) => updateExercise(exercise.id, { name: e.target.value })}
                          className="px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Notes (optional)"
                          value={exercise.notes || ''}
                          onChange={(e) => updateExercise(exercise.id, { notes: e.target.value })}
                          className="px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Sets</label>
                          <input
                            type="number"
                            value={exercise.sets}
                            onChange={(e) => updateExercise(exercise.id, { sets: parseInt(e.target.value) || 0 })}
                            className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Reps</label>
                          <input
                            type="text"
                            value={exercise.reps}
                            onChange={(e) => updateExercise(exercise.id, { reps: e.target.value })}
                            placeholder="10 or 8-12"
                            className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Rest (sec)</label>
                          <input
                            type="number"
                            value={exercise.restTime}
                            onChange={(e) => updateExercise(exercise.id, { restTime: parseInt(e.target.value) || 0 })}
                            className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeTemplateModal}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={isProcessing || !templateForm.name.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Saving...' : (editingTemplate ? 'Update Template' : 'Create Template')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(null)}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          type="danger"
          isLoading={isProcessing}
        />
      )}
    </div>
  )
}

export default WorkoutTemplatesPanel