import React, { useState, useEffect } from 'react'
import { FoodEntry } from '../../types/nutrition'
import { openFoodFactsService } from '../../services/openFoodFactsService'

interface ManualFoodEntryProps {
  onSubmit: (entry: FoodEntry) => void
  onCancel: () => void
}

interface ValidationErrors {
  name?: string
  calories?: string
  protein?: string
  carbs?: string
  fat?: string
  servingSize?: string
  servingUnit?: string
}

interface SearchFilters {
  minCalories?: number
  maxCalories?: number
  minProtein?: number
  maxProtein?: number
  category?: string
  sortBy?: 'name' | 'calories' | 'protein' | 'carbs' | 'fat'
  sortOrder?: 'asc' | 'desc'
  dietaryRestrictions?: string[]
  allergens?: string[]
}

interface FilterPreset {
  id: string
  name: string
  filters: SearchFilters
}

const CATEGORIES = [
  'All',
  'Fruits',
  'Vegetables',
  'Meat',
  'Dairy',
  'Grains',
  'Snacks',
  'Beverages',
  'Seafood',
  'Nuts & Seeds',
  'Legumes',
  'Herbs & Spices',
  'Condiments',
  'Bakery',
  'Canned Goods',
  'Frozen Foods',
  'Breakfast',
  'Desserts',
  'Supplements'
]

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'calories', label: 'Calories' },
  { value: 'protein', label: 'Protein' },
  { value: 'carbs', label: 'Carbs' },
  { value: 'fat', label: 'Fat' }
]

const MAX_VALUES = {
  calories: 2000,
  protein: 100,
  carbs: 300,
  fat: 100,
  servingSize: 1000
}

const DIETARY_RESTRICTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Keto',
  'Paleo',
  'Low-Carb',
  'Low-Fat',
  'High-Protein',
  'Halal',
  'Kosher'
]

const ALLERGENS = [
  'Peanuts',
  'Tree Nuts',
  'Milk',
  'Eggs',
  'Soy',
  'Wheat',
  'Fish',
  'Shellfish',
  'Sesame'
]

const ManualFoodEntry: React.FC<ManualFoodEntryProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Partial<FoodEntry>>({
    name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    servingSize: '100',
    servingUnit: 'g'
  })

  const [errors, setErrors] = useState<ValidationErrors>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FoodEntry[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [frequentFoods, setFrequentFoods] = useState<FoodEntry[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({})
  const [editingFrequentFood, setEditingFrequentFood] = useState<FoodEntry | null>(null)
  const [showSavePreset, setShowSavePreset] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [savedPresets, setSavedPresets] = useState<FilterPreset[]>([])

  useEffect(() => {
    // Load frequent foods from localStorage
    const savedFoods = localStorage.getItem('frequentFoods')
    if (savedFoods) {
      setFrequentFoods(JSON.parse(savedFoods))
    }
  }, [])

  useEffect(() => {
    // Load saved presets from localStorage
    const savedPresets = localStorage.getItem('filterPresets')
    if (savedPresets) {
      setSavedPresets(JSON.parse(savedPresets))
    }
  }, [])

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {}
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Food name is required'
    }
    
    if (formData.calories === undefined || formData.calories < 0) {
      newErrors.calories = 'Calories must be a positive number'
    } else if (formData.calories > MAX_VALUES.calories) {
      newErrors.calories = `Calories cannot exceed ${MAX_VALUES.calories}`
    }
    
    if (formData.protein === undefined || formData.protein < 0) {
      newErrors.protein = 'Protein must be a positive number'
    } else if (formData.protein > MAX_VALUES.protein) {
      newErrors.protein = `Protein cannot exceed ${MAX_VALUES.protein}g`
    }
    
    if (formData.carbs === undefined || formData.carbs < 0) {
      newErrors.carbs = 'Carbs must be a positive number'
    } else if (formData.carbs > MAX_VALUES.carbs) {
      newErrors.carbs = `Carbs cannot exceed ${MAX_VALUES.carbs}g`
    }
    
    if (formData.fat === undefined || formData.fat < 0) {
      newErrors.fat = 'Fat must be a positive number'
    } else if (formData.fat > MAX_VALUES.fat) {
      newErrors.fat = `Fat cannot exceed ${MAX_VALUES.fat}g`
    }
    
    if (!formData.servingSize || Number(formData.servingSize) <= 0) {
      newErrors.servingSize = 'Serving size must be a positive number'
    } else if (Number(formData.servingSize) > MAX_VALUES.servingSize) {
      newErrors.servingSize = `Serving size cannot exceed ${MAX_VALUES.servingSize}`
    }
    
    if (!formData.servingUnit?.trim()) {
      newErrors.servingUnit = 'Serving unit is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      const entry = formData as FoodEntry
      onSubmit(entry)
      
      // Save to frequent foods
      const updatedFrequentFoods = [entry, ...frequentFoods.slice(0, 9)]
      setFrequentFoods(updatedFrequentFoods)
      localStorage.setItem('frequentFoods', JSON.stringify(updatedFrequentFoods))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'name' ? value : Number(value)
    }))
    // Clear error when user starts typing
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSavePreset = () => {
    if (!presetName.trim()) return

    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      filters: { ...filters }
    }

    const updatedPresets = [...savedPresets, newPreset]
    setSavedPresets(updatedPresets)
    localStorage.setItem('filterPresets', JSON.stringify(updatedPresets))
    setPresetName('')
    setShowSavePreset(false)
  }

  const handleLoadPreset = (preset: FilterPreset) => {
    setFilters(preset.filters)
  }

  const handleDeletePreset = (presetId: string) => {
    const updatedPresets = savedPresets.filter(preset => preset.id !== presetId)
    setSavedPresets(updatedPresets)
    localStorage.setItem('filterPresets', JSON.stringify(updatedPresets))
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const results = await openFoodFactsService.searchFood(query)
      // Apply filters
      const filteredResults = results.filter(food => {
        // Basic nutritional filters
        if (filters.minCalories && food.calories < filters.minCalories) return false
        if (filters.maxCalories && food.calories > filters.maxCalories) return false
        if (filters.minProtein && food.protein < filters.minProtein) return false
        if (filters.maxProtein && food.protein > filters.maxProtein) return false
        if (filters.category && filters.category !== 'All' && !food.name.toLowerCase().includes(filters.category.toLowerCase())) return false
        
        // Dietary restrictions filter
        if (filters.dietaryRestrictions?.length) {
          const hasAllRestrictions = filters.dietaryRestrictions.every(restriction => 
            food.dietaryRestrictions?.includes(restriction)
          )
          if (!hasAllRestrictions) return false
        }
        
        // Allergens filter
        if (filters.allergens?.length) {
          const hasAnyAllergen = filters.allergens.some(allergen => 
            food.allergens?.includes(allergen)
          )
          if (hasAnyAllergen) return false
        }
        
        return true
      })

      // Apply sorting
      if (filters.sortBy) {
        filteredResults.sort((a, b) => {
          const aValue = a[filters.sortBy as keyof FoodEntry]
          const bValue = b[filters.sortBy as keyof FoodEntry]
          
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return filters.sortOrder === 'desc' 
              ? bValue.localeCompare(aValue)
              : aValue.localeCompare(bValue)
          }
          
          const aNum = Number(aValue)
          const bNum = Number(bValue)
          return filters.sortOrder === 'desc' ? bNum - aNum : aNum - bNum
        })
      }

      setSearchResults(filteredResults)
    } catch (error) {
      console.error('Error searching foods:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectFood = (food: FoodEntry) => {
    setFormData(food)
    setSearchResults([])
    setSearchQuery('')
  }

  const handleRemoveFrequentFood = (index: number) => {
    const updatedFoods = frequentFoods.filter((_, i) => i !== index)
    setFrequentFoods(updatedFoods)
    localStorage.setItem('frequentFoods', JSON.stringify(updatedFoods))
  }

  const handleEditFrequentFood = (food: FoodEntry) => {
    setEditingFrequentFood(food)
    setFormData(food)
  }

  const handleUpdateFrequentFood = () => {
    if (editingFrequentFood && validateForm()) {
      const updatedFoods = frequentFoods.map(food => 
        food === editingFrequentFood ? formData as FoodEntry : food
      )
      setFrequentFoods(updatedFoods)
      localStorage.setItem('frequentFoods', JSON.stringify(updatedFoods))
      setEditingFrequentFood(null)
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <h2 className="text-2xl font-semibold mb-4">Add Food</h2>
      
      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <label htmlFor="search" className="block text-sm font-medium text-gray-400">
            Search Common Foods
          </label>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-blue-500 hover:text-blue-400"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {/* Search Filters */}
        {showFilters && (
          <div className="bg-gray-800 rounded-lg p-4 mb-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Calories Range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minCalories || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, minCalories: Number(e.target.value) }))}
                    className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxCalories || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxCalories: Number(e.target.value) }))}
                    className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Protein Range (g)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minProtein || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, minProtein: Number(e.target.value) }))}
                    className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxProtein || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxProtein: Number(e.target.value) }))}
                    className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Category</label>
                <select
                  value={filters.category || 'All'}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm"
                >
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Sort By</label>
                <div className="flex gap-2">
                  <select
                    value={filters.sortBy || 'name'}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as SearchFilters['sortBy'] }))}
                    className="flex-1 bg-gray-700 text-white rounded px-2 py-1 text-sm"
                  >
                    {SORT_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setFilters(prev => ({ 
                      ...prev, 
                      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
                    }))}
                    className="bg-gray-700 text-white rounded px-2 py-1 text-sm hover:bg-gray-600 transition-colors"
                  >
                    {filters.sortOrder === 'desc' ? '↓' : '↑'}
                  </button>
                </div>
              </div>
            </div>

            {/* Dietary Restrictions */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Dietary Restrictions</label>
              <div className="flex flex-wrap gap-2">
                {DIETARY_RESTRICTIONS.map(restriction => (
                  <button
                    key={restriction}
                    onClick={() => {
                      const current = filters.dietaryRestrictions || []
                      const updated = current.includes(restriction)
                        ? current.filter(r => r !== restriction)
                        : [...current, restriction]
                      setFilters(prev => ({ ...prev, dietaryRestrictions: updated }))
                    }}
                    className={`px-2 py-1 rounded text-sm transition-colors ${
                      filters.dietaryRestrictions?.includes(restriction)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {restriction}
                  </button>
                ))}
              </div>
            </div>

            {/* Allergens */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Allergens to Avoid</label>
              <div className="flex flex-wrap gap-2">
                {ALLERGENS.map(allergen => (
                  <button
                    key={allergen}
                    onClick={() => {
                      const current = filters.allergens || []
                      const updated = current.includes(allergen)
                        ? current.filter(a => a !== allergen)
                        : [...current, allergen]
                      setFilters(prev => ({ ...prev, allergens: updated }))
                    }}
                    className={`px-2 py-1 rounded text-sm transition-colors ${
                      filters.allergens?.includes(allergen)
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {allergen}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Presets */}
            <div className="border-t border-gray-700 pt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-400">Saved Filter Presets</label>
                <button
                  onClick={() => setShowSavePreset(!showSavePreset)}
                  className="text-sm text-blue-500 hover:text-blue-400"
                >
                  {showSavePreset ? 'Cancel' : 'Save Current Filters'}
                </button>
              </div>

              {showSavePreset && (
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Enter preset name"
                    className="flex-1 bg-gray-700 text-white rounded px-2 py-1 text-sm"
                  />
                  <button
                    onClick={handleSavePreset}
                    disabled={!presetName.trim()}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              )}

              {savedPresets.length > 0 && (
                <div className="space-y-2">
                  {savedPresets.map(preset => (
                    <div key={preset.id} className="flex items-center justify-between bg-gray-700 rounded px-3 py-2">
                      <button
                        onClick={() => handleLoadPreset(preset)}
                        className="text-sm text-gray-300 hover:text-white"
                      >
                        {preset.name}
                      </button>
                      <button
                        onClick={() => handleDeletePreset(preset.id)}
                        className="text-red-500 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="relative">
          <input
            type="text"
            id="search"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search for a food..."
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {isSearching && (
            <div className="absolute right-3 top-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
        
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-gray-800 rounded-lg max-h-48 overflow-y-auto">
            {searchResults.map((food, index) => (
              <button
                key={index}
                onClick={() => handleSelectFood(food)}
                className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors"
              >
                <div className="font-medium">{food.name}</div>
                <div className="text-sm text-gray-400">
                  {food.calories} cal | {food.protein}g protein | {food.carbs}g carbs | {food.fat}g fat
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Frequent Foods */}
      {frequentFoods.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Frequently Used Foods</h3>
          <div className="grid grid-cols-2 gap-2">
            {frequentFoods.map((food, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-2 relative group">
                <button
                  onClick={() => handleSelectFood(food)}
                  className="w-full text-left"
                >
                  <div className="font-medium truncate">{food.name}</div>
                  <div className="text-sm text-gray-400">{food.calories} cal</div>
                </button>
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditFrequentFood(food)}
                    className="text-blue-500 hover:text-blue-400 mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRemoveFrequentFood(index)}
                    className="text-red-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">
            Food Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className={`w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'ring-2 ring-red-500' : ''
            }`}
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="calories" className="block text-sm font-medium text-gray-400 mb-1">
              Calories
            </label>
            <input
              type="number"
              id="calories"
              name="calories"
              value={formData.calories}
              onChange={handleChange}
              required
              min="0"
              max={MAX_VALUES.calories}
              className={`w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.calories ? 'ring-2 ring-red-500' : ''
              }`}
            />
            {errors.calories && <p className="mt-1 text-sm text-red-500">{errors.calories}</p>}
          </div>

          <div>
            <label htmlFor="protein" className="block text-sm font-medium text-gray-400 mb-1">
              Protein (g)
            </label>
            <input
              type="number"
              id="protein"
              name="protein"
              value={formData.protein}
              onChange={handleChange}
              required
              min="0"
              max={MAX_VALUES.protein}
              step="0.1"
              className={`w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.protein ? 'ring-2 ring-red-500' : ''
              }`}
            />
            {errors.protein && <p className="mt-1 text-sm text-red-500">{errors.protein}</p>}
          </div>

          <div>
            <label htmlFor="carbs" className="block text-sm font-medium text-gray-400 mb-1">
              Carbs (g)
            </label>
            <input
              type="number"
              id="carbs"
              name="carbs"
              value={formData.carbs}
              onChange={handleChange}
              required
              min="0"
              max={MAX_VALUES.carbs}
              step="0.1"
              className={`w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.carbs ? 'ring-2 ring-red-500' : ''
              }`}
            />
            {errors.carbs && <p className="mt-1 text-sm text-red-500">{errors.carbs}</p>}
          </div>

          <div>
            <label htmlFor="fat" className="block text-sm font-medium text-gray-400 mb-1">
              Fat (g)
            </label>
            <input
              type="number"
              id="fat"
              name="fat"
              value={formData.fat}
              onChange={handleChange}
              required
              min="0"
              max={MAX_VALUES.fat}
              step="0.1"
              className={`w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.fat ? 'ring-2 ring-red-500' : ''
              }`}
            />
            {errors.fat && <p className="mt-1 text-sm text-red-500">{errors.fat}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="servingSize" className="block text-sm font-medium text-gray-400 mb-1">
              Serving Size
            </label>
            <input
              type="number"
              id="servingSize"
              name="servingSize"
              value={formData.servingSize}
              onChange={handleChange}
              required
              min="0"
              max={MAX_VALUES.servingSize}
              step="0.1"
              className={`w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.servingSize ? 'ring-2 ring-red-500' : ''
              }`}
            />
            {errors.servingSize && <p className="mt-1 text-sm text-red-500">{errors.servingSize}</p>}
          </div>

          <div>
            <label htmlFor="servingUnit" className="block text-sm font-medium text-gray-400 mb-1">
              Serving Unit
            </label>
            <input
              type="text"
              id="servingUnit"
              name="servingUnit"
              value={formData.servingUnit}
              onChange={handleChange}
              required
              className={`w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.servingUnit ? 'ring-2 ring-red-500' : ''
              }`}
            />
            {errors.servingUnit && <p className="mt-1 text-sm text-red-500">{errors.servingUnit}</p>}
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          {editingFrequentFood ? (
            <button
              type="button"
              onClick={handleUpdateFrequentFood}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Update Food
            </button>
          ) : (
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Food
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default ManualFoodEntry 