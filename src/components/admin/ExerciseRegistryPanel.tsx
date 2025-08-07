/**
 * Admin Exercise Registry Management Panel
 * 
 * This panel provides admin interface for managing the unified exercise registry,
 * including viewing registry stats, adding new exercises, and managing mappings.
 */

import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { 
  EXERCISE_REGISTRY, 
  ExerciseDefinition, 
  getRegistryStats, 
  getAvailableCategories,
  getAvailableMuscleGroups,
  getAvailableEquipment,
  getExercisesByCategory
} from '../../data/exerciseRegistry'
import { 
  smartExerciseLookup, 
  validateExerciseName, 
  getNameMappingStats,
  normalizeExerciseName,
  toStandardizedKey
} from '../../utils/exerciseNameUtils'
import { logger } from '../../utils/logger'
import ConfirmationModal from '../common/ConfirmationModal'

interface RegistryStats {
  totalExercises: number
  exercisesWithGifs: number
  gifCoverage: string
  categories: number
  categoryBreakdown: Record<string, number>
}

interface NameMappingStats {
  registrySize: number
  commonMappings: number
  totalAlternatives: number
  totalLookupVariations: number
}

const ExerciseRegistryPanel: React.FC = () => {
  // State
  const [registryStats, setRegistryStats] = useState<RegistryStats | null>(null)
  const [mappingStats, setMappingStats] = useState<NameMappingStats | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredExercises, setFilteredExercises] = useState<ExerciseDefinition[]>([])
  
  // Modals and forms
  const [showTestLookup, setShowTestLookup] = useState(false)
  const [testExerciseName, setTestExerciseName] = useState('')
  const [testResults, setTestResults] = useState<any>(null)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [newExercise, setNewExercise] = useState<Partial<ExerciseDefinition>>({
    name: '',
    description: '',
    category: 'strength',
    muscleGroups: [],
    equipment: ['bodyweight'],
    difficulty: 'intermediate',
    instructions: [''],
    source: 'manual'
  })
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  } | null>(null)

  useEffect(() => {
    loadRegistryData().catch(error => {
      console.error('Failed to initialize registry panel:', error)
    })
  }, [])

  useEffect(() => {
    filterExercises()
  }, [selectedCategory, searchTerm])

  const loadRegistryData = async () => {
    try {
      // getRegistryStats is now async due to UnifiedGifRegistry integration
      const stats = await getRegistryStats()
      const nameStats = getNameMappingStats()
      
      setRegistryStats(stats)
      setMappingStats(nameStats)
      
      logger.workout.info('Loaded registry statistics', { stats, nameStats })
    } catch (error) {
      logger.workout.error('Failed to load registry data', error)
      toast.error('Failed to load registry statistics')
      
      // Set empty state to prevent crashes
      setRegistryStats({
        totalExercises: 0,
        exercisesWithGifs: 0,
        gifCoverage: '0%',
        categories: 0,
        categoryBreakdown: {}
      })
      setMappingStats({
        registrySize: 0,
        commonMappings: 0,
        totalAlternatives: 0,
        totalLookupVariations: 0
      })
    }
  }

  const filterExercises = () => {
    let exercises = Object.values(EXERCISE_REGISTRY)
    
    // Filter by category
    if (selectedCategory !== 'all') {
      exercises = exercises.filter(ex => ex.category === selectedCategory)
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      exercises = exercises.filter(ex => 
        ex.name.toLowerCase().includes(term) ||
        ex.description.toLowerCase().includes(term) ||
        ex.muscleGroups.some(mg => mg.toLowerCase().includes(term)) ||
        ex.alternatives?.some(alt => alt.toLowerCase().includes(term))
      )
    }
    
    setFilteredExercises(exercises.sort((a, b) => a.name.localeCompare(b.name)))
  }

  const handleTestLookup = () => {
    if (!testExerciseName.trim()) {
      toast.error('Please enter an exercise name to test')
      return
    }

    try {
      // Test smart lookup
      const lookupResult = smartExerciseLookup(testExerciseName)
      
      // Test validation
      const validation = validateExerciseName(testExerciseName)
      
      setTestResults({
        inputName: testExerciseName,
        normalizedName: normalizeExerciseName(testExerciseName),
        standardizedKey: toStandardizedKey(normalizeExerciseName(testExerciseName)),
        lookupResult,
        validation,
        timestamp: new Date().toLocaleTimeString()
      })
      
      if (lookupResult) {
        toast.success(`Found: ${lookupResult.name}`)
      } else {
        toast.warning('No match found in registry')
      }
      
    } catch (error) {
      logger.workout.error('Test lookup failed', error)
      toast.error('Test lookup failed')
      setTestResults({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  const handleAddExercise = () => {
    // Validate required fields
    if (!newExercise.name || !newExercise.description) {
      toast.error('Name and description are required')
      return
    }

    try {
      const standardizedName = toStandardizedKey(normalizeExerciseName(newExercise.name))
      
      // Check if exercise already exists
      if (EXERCISE_REGISTRY[standardizedName]) {
        toast.error('Exercise with this name already exists in registry')
        return
      }

      // Create complete exercise definition
      const exerciseDefinition: ExerciseDefinition = {
        ...newExercise,
        standardizedName,
        muscleGroups: newExercise.muscleGroups || [],
        equipment: newExercise.equipment || ['bodyweight'],
        instructions: newExercise.instructions?.filter(i => i.trim()) || [],
        source: 'manual'
      } as ExerciseDefinition

      // Note: In a real implementation, this would save to the backend
      // For now, we just show what would be created
      console.log('Would create exercise:', exerciseDefinition)
      
      toast.success(`Exercise "${newExercise.name}" would be added to registry`)
      toast.info('Note: This is a demo. In production, this would save to the database.')
      
      // Reset form
      setNewExercise({
        name: '',
        description: '',
        category: 'strength',
        muscleGroups: [],
        equipment: ['bodyweight'],
        difficulty: 'intermediate',
        instructions: [''],
        source: 'manual'
      })
      setShowAddExercise(false)
      
    } catch (error) {
      logger.workout.error('Failed to add exercise', error)
      toast.error('Failed to add exercise')
    }
  }

  if (!registryStats || !mappingStats || !registryStats.categoryBreakdown) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading registry data...</p>
        {!registryStats && <p className="text-xs text-gray-500 mt-2">Waiting for registry stats...</p>}
        {!mappingStats && <p className="text-xs text-gray-500 mt-2">Waiting for mapping stats...</p>}
        {registryStats && !registryStats.categoryBreakdown && <p className="text-xs text-gray-500 mt-2">Loading category breakdown...</p>}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-white">Exercise Registry Management</h2>
          <p className="text-gray-400 mt-1">
            Unified exercise name mapping system with O(1) lookup performance
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowTestLookup(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            🧪 Test Lookup
          </button>
          
          <button
            onClick={() => setShowAddExercise(true)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            ➕ Add Exercise
          </button>
          
          <button
            onClick={loadRegistryData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Registry Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">{registryStats.totalExercises}</div>
          <div className="text-sm text-gray-400">Total Exercises</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{registryStats.exercisesWithGifs}</div>
          <div className="text-sm text-gray-400">With GIFs ({registryStats.gifCoverage})</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-400">{mappingStats.totalLookupVariations}</div>
          <div className="text-sm text-gray-400">Total Name Variations</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">{registryStats.categories}</div>
          <div className="text-sm text-gray-400">Exercise Categories</div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4">Category Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(registryStats.categoryBreakdown || {}).map(([category, count]) => (
            <div key={category} className="text-center">
              <div className="text-lg font-semibold text-white">{count}</div>
              <div className="text-sm text-gray-400 capitalize">{category}</div>
            </div>
          ))}
          {Object.keys(registryStats.categoryBreakdown || {}).length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-4">
              No categories found
            </div>
          )}
        </div>
      </div>

      {/* Exercise Browser */}
      <div className="bg-gray-800 rounded-lg">
        <div className="p-4 border-b border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-white">Exercise Registry Browser</h3>
            <div className="text-sm text-gray-400">
              {filteredExercises.length} of {registryStats.totalExercises} exercises
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search exercises..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {getAvailableCategories().map(cat => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Exercise List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredExercises.map((exercise) => (
            <div key={exercise.standardizedName} className="p-4 border-b border-gray-700 hover:bg-gray-700/50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-white">{exercise.name}</h4>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      exercise.category === 'warmup' ? 'bg-yellow-900 text-yellow-300' :
                      exercise.category === 'strength' ? 'bg-blue-900 text-blue-300' :
                      exercise.category === 'cardio' ? 'bg-red-900 text-red-300' :
                      exercise.category === 'cooldown' ? 'bg-purple-900 text-purple-300' :
                      'bg-gray-600 text-gray-300'
                    }`}>
                      {exercise.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      exercise.difficulty === 'beginner' ? 'bg-green-900 text-green-300' :
                      exercise.difficulty === 'intermediate' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-red-900 text-red-300'
                    }`}>
                      {exercise.difficulty}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-400 mb-2">{exercise.description}</p>
                  
                  <div className="flex flex-wrap gap-2 text-xs">
                    <div className="text-gray-500">
                      <strong>Muscles:</strong> {exercise.muscleGroups.join(', ')}
                    </div>
                    <div className="text-gray-500">
                      <strong>Equipment:</strong> {exercise.equipment.join(', ')}
                    </div>
                    {exercise.alternatives && (
                      <div className="text-gray-500">
                        <strong>Alternatives:</strong> {exercise.alternatives.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {exercise.gifPath && (
                    <div className="w-12 h-12 bg-gray-700 rounded border flex items-center justify-center">
                      <span className="text-xs text-green-400">GIF</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    {exercise.source}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test Lookup Modal */}
      {showTestLookup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Test Exercise Lookup</h3>
              <button
                onClick={() => {
                  setShowTestLookup(false)
                  setTestExerciseName('')
                  setTestResults(null)
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Exercise Name to Test
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testExerciseName}
                    onChange={(e) => setTestExerciseName(e.target.value)}
                    placeholder="e.g., push up, arm circle, jumping jack"
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleTestLookup()}
                  />
                  <button
                    onClick={handleTestLookup}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Test
                  </button>
                </div>
              </div>
              
              {testResults && (
                <div className="bg-gray-900 rounded p-4">
                  <h4 className="font-medium text-white mb-3">Test Results ({testResults.timestamp})</h4>
                  
                  {testResults.error ? (
                    <div className="text-red-400">Error: {testResults.error}</div>
                  ) : (
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <strong className="text-gray-300">Input:</strong>
                          <div className="text-gray-400">"{testResults.inputName}"</div>
                        </div>
                        <div>
                          <strong className="text-gray-300">Normalized:</strong>
                          <div className="text-gray-400">"{testResults.normalizedName}"</div>
                        </div>
                      </div>
                      
                      <div>
                        <strong className="text-gray-300">Registry Key:</strong>
                        <div className="text-gray-400 font-mono">{testResults.standardizedKey}</div>
                      </div>
                      
                      {testResults.lookupResult ? (
                        <div className="border border-green-700 rounded p-3 bg-green-900/20">
                          <div className="text-green-400 font-medium mb-2">✅ Match Found</div>
                          <div><strong>Name:</strong> {testResults.lookupResult.name}</div>
                          <div><strong>Category:</strong> {testResults.lookupResult.category}</div>
                          <div><strong>Description:</strong> {testResults.lookupResult.description}</div>
                          {testResults.lookupResult.gifPath && (
                            <div><strong>GIF:</strong> {testResults.lookupResult.gifPath}</div>
                          )}
                        </div>
                      ) : (
                        <div className="border border-red-700 rounded p-3 bg-red-900/20">
                          <div className="text-red-400 font-medium mb-2">❌ No Match</div>
                          {testResults.validation.suggestions.length > 0 && (
                            <div>
                              <strong>Suggestions:</strong>
                              <ul className="list-disc list-inside mt-1 text-gray-400">
                                {testResults.validation.suggestions.map((suggestion: string, i: number) => (
                                  <li key={i}>{suggestion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Exercise Modal */}
      {showAddExercise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Add New Exercise</h3>
              <button
                onClick={() => setShowAddExercise(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
                  <input
                    type="text"
                    value={newExercise.name || ''}
                    onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                  <select
                    value={newExercise.category || 'strength'}
                    onChange={(e) => setNewExercise({ ...newExercise, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {getAvailableCategories().map(cat => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
                <textarea
                  value={newExercise.description || ''}
                  onChange={(e) => setNewExercise({ ...newExercise, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">GIF Path (optional)</label>
                <input
                  type="text"
                  value={newExercise.gifPath || ''}
                  onChange={(e) => setNewExercise({ ...newExercise, gifPath: e.target.value })}
                  placeholder="/exercise-gifs/category/exercise-name.gif"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="text-sm text-gray-400">
                <strong>Note:</strong> This is a demo interface. In production, exercises would be saved to the database and require server-side validation.
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={() => setShowAddExercise(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleAddExercise}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Add Exercise
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
  )
}

export default ExerciseRegistryPanel