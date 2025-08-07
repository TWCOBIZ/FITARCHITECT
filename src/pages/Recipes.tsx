import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

interface Recipe {
  id: number
  name: string
  description?: string
  category: string
  difficulty: string
  prepTime: number
  cookTime: number
  servings: number
  ingredients: any[]
  instructions: string[]
  nutrition?: any
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

const Recipes: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [showGenerateForm, setShowGenerateForm] = useState(false)

  // Form state for creating/editing recipes
  const [recipeForm, setRecipeForm] = useState({
    name: '',
    description: '',
    category: 'dinner',
    difficulty: 'medium',
    prepTime: 30,
    cookTime: 0,
    servings: 4,
    ingredients: [{ name: '', quantity: 1, unit: 'cup' }],
    instructions: ['']
  })

  // Form state for generating recipes
  const [generateForm, setGenerateForm] = useState({
    category: 'dinner',
    difficulty: 'medium',
    prepTime: 30,
    ingredients: [],
    dietaryRestrictions: [],
    cuisineType: 'any'
  })

  useEffect(() => {
    // Redirect guests to registration
    if (user && (user.isGuest || user.type === 'guest')) {
      navigate('/register', { 
        state: { 
          from: '/recipes', 
          message: 'Create a free account to access recipe management.' 
        } 
      });
      return;
    }

    if (user && !user.isGuest && user.type !== 'guest') {
      loadRecipes();
    }
  }, [user, navigate]);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/recipes');
      setRecipes(response.data.recipes);
    } catch (err: any) {
      setError('Failed to load recipes');
      console.error('Failed to load recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecipe = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/recipes/generate', generateForm);
      const newRecipe = response.data;
      setRecipes([newRecipe, ...recipes]);
      setSelectedRecipe(newRecipe);
      setShowGenerateForm(false);
      
      const event = new CustomEvent('show-toast', {
        detail: { message: 'Recipe generated successfully!', type: 'success' }
      });
      window.dispatchEvent(event);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecipe = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/recipes', recipeForm);
      const newRecipe = response.data;
      setRecipes([newRecipe, ...recipes]);
      setSelectedRecipe(newRecipe);
      setShowCreateForm(false);
      resetRecipeForm();
      
      const event = new CustomEvent('show-toast', {
        detail: { message: 'Recipe created successfully!', type: 'success' }
      });
      window.dispatchEvent(event);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipe = async (recipeId: number) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    
    try {
      await api.delete(`/api/recipes/${recipeId}`);
      setRecipes(recipes.filter(r => r.id !== recipeId));
      if (selectedRecipe?.id === recipeId) {
        setSelectedRecipe(null);
      }
      
      const event = new CustomEvent('show-toast', {
        detail: { message: 'Recipe deleted successfully!', type: 'success' }
      });
      window.dispatchEvent(event);
    } catch (err: any) {
      console.error('Failed to delete recipe:', err);
      const event = new CustomEvent('show-toast', {
        detail: { message: 'Failed to delete recipe', type: 'error' }
      });
      window.dispatchEvent(event);
    }
  };

  const handleDuplicateRecipe = async (recipeId: number) => {
    try {
      const response = await api.post(`/api/recipes/${recipeId}/duplicate`);
      const duplicatedRecipe = response.data;
      setRecipes([duplicatedRecipe, ...recipes]);
      
      const event = new CustomEvent('show-toast', {
        detail: { message: 'Recipe duplicated successfully!', type: 'success' }
      });
      window.dispatchEvent(event);
    } catch (err: any) {
      console.error('Failed to duplicate recipe:', err);
      const event = new CustomEvent('show-toast', {
        detail: { message: 'Failed to duplicate recipe', type: 'error' }
      });
      window.dispatchEvent(event);
    }
  };

  const resetRecipeForm = () => {
    setRecipeForm({
      name: '',
      description: '',
      category: 'dinner',
      difficulty: 'medium',
      prepTime: 30,
      cookTime: 0,
      servings: 4,
      ingredients: [{ name: '', quantity: 1, unit: 'cup' }],
      instructions: ['']
    });
  };

  const addIngredient = () => {
    setRecipeForm({
      ...recipeForm,
      ingredients: [...recipeForm.ingredients, { name: '', quantity: 1, unit: 'cup' }]
    });
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const ingredients = [...recipeForm.ingredients];
    ingredients[index] = { ...ingredients[index], [field]: value };
    setRecipeForm({ ...recipeForm, ingredients });
  };

  const removeIngredient = (index: number) => {
    if (recipeForm.ingredients.length > 1) {
      const ingredients = recipeForm.ingredients.filter((_, i) => i !== index);
      setRecipeForm({ ...recipeForm, ingredients });
    }
  };

  const addInstruction = () => {
    setRecipeForm({
      ...recipeForm,
      instructions: [...recipeForm.instructions, '']
    });
  };

  const updateInstruction = (index: number, value: string) => {
    const instructions = [...recipeForm.instructions];
    instructions[index] = value;
    setRecipeForm({ ...recipeForm, instructions });
  };

  const removeInstruction = (index: number) => {
    if (recipeForm.instructions.length > 1) {
      const instructions = recipeForm.instructions.filter((_, i) => i !== index);
      setRecipeForm({ ...recipeForm, instructions });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      breakfast: '🍳',
      lunch: '🥗',
      dinner: '🍽️',
      snack: '🍪',
      dessert: '🍰',
      'side-dish': '🥖'
    };
    return icons[category as keyof typeof icons] || '🍽️';
  };

  if (loading && recipes.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-xl">Loading recipes...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Recipe Collection</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setShowGenerateForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
            >
              🤖 Generate Recipe
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold"
            >
              ➕ Create Recipe
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recipe List */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold mb-4">My Recipes ({recipes.length})</h2>
            {recipes.length === 0 ? (
              <div className="text-center text-gray-400 p-8">
                <div className="text-4xl mb-4">👨‍🍳</div>
                <p>No recipes yet!</p>
                <p className="text-sm">Create or generate your first recipe to get started.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {recipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedRecipe?.id === recipe.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                    onClick={() => setSelectedRecipe(recipe)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{getCategoryIcon(recipe.category)} {recipe.name}</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateRecipe(recipe.id);
                          }}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                          title="Duplicate"
                        >
                          📋
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRecipe(recipe.id);
                          }}
                          className="text-red-400 hover:text-red-300 text-sm"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{recipe.description}</p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span className={getDifficultyColor(recipe.difficulty)}>{recipe.difficulty}</span>
                      <span>{recipe.prepTime + recipe.cookTime} min</span>
                      <span>{recipe.servings} servings</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recipe Details */}
          <div className="lg:col-span-2">
            {selectedRecipe ? (
              <div className="bg-gray-900 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">
                      {getCategoryIcon(selectedRecipe.category)} {selectedRecipe.name}
                    </h2>
                    <p className="text-gray-400 mb-4">{selectedRecipe.description}</p>
                  </div>
                  {selectedRecipe.imageUrl && (
                    <img
                      src={selectedRecipe.imageUrl}
                      alt={selectedRecipe.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-lg font-semibold">{selectedRecipe.prepTime}m</div>
                    <div className="text-sm text-gray-400">Prep Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{selectedRecipe.cookTime}m</div>
                    <div className="text-sm text-gray-400">Cook Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{selectedRecipe.servings}</div>
                    <div className="text-sm text-gray-400">Servings</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-semibold ${getDifficultyColor(selectedRecipe.difficulty)}`}>
                      {selectedRecipe.difficulty}
                    </div>
                    <div className="text-sm text-gray-400">Difficulty</div>
                  </div>
                </div>

                {/* Nutrition Info */}
                {selectedRecipe.nutrition && (
                  <div className="mb-6 p-4 bg-black rounded-lg">
                    <h3 className="font-semibold mb-3">Nutrition (per serving)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>Calories: <span className="font-semibold">{Math.round(selectedRecipe.nutrition.calories / selectedRecipe.servings)}</span></div>
                      <div>Protein: <span className="font-semibold">{Math.round(selectedRecipe.nutrition.protein / selectedRecipe.servings)}g</span></div>
                      <div>Carbs: <span className="font-semibold">{Math.round(selectedRecipe.nutrition.carbs / selectedRecipe.servings)}g</span></div>
                      <div>Fat: <span className="font-semibold">{Math.round(selectedRecipe.nutrition.fat / selectedRecipe.servings)}g</span></div>
                    </div>
                  </div>
                )}

                {/* Ingredients */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Ingredients</h3>
                  <ul className="space-y-2">
                    {selectedRecipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex justify-between">
                        <span>{ingredient.name}</span>
                        <span className="text-gray-400">{ingredient.quantity} {ingredient.unit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Instructions */}
                <div>
                  <h3 className="font-semibold mb-3">Instructions</h3>
                  <ol className="space-y-3">
                    {selectedRecipe.instructions.map((instruction, index) => (
                      <li key={index} className="flex">
                        <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">
                          {index + 1}
                        </span>
                        <span>{instruction}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-lg p-6 text-center text-gray-400">
                <div className="text-4xl mb-4">🍽️</div>
                <p>Select a recipe to view details</p>
                <p className="text-sm">Or create a new recipe to get started!</p>
              </div>
            )}
          </div>
        </div>

        {/* Generate Recipe Modal */}
        {showGenerateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Generate Recipe with AI</h3>
                <button
                  onClick={() => setShowGenerateForm(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <select
                    value={generateForm.category}
                    onChange={(e) => setGenerateForm({ ...generateForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                    <option value="dessert">Dessert</option>
                    <option value="side-dish">Side Dish</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Difficulty</label>
                  <select
                    value={generateForm.difficulty}
                    onChange={(e) => setGenerateForm({ ...generateForm, difficulty: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Prep Time (minutes)</label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={generateForm.prepTime}
                    onChange={(e) => setGenerateForm({ ...generateForm, prepTime: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Cuisine Type</label>
                  <select
                    value={generateForm.cuisineType}
                    onChange={(e) => setGenerateForm({ ...generateForm, cuisineType: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg"
                  >
                    <option value="any">Any</option>
                    <option value="italian">Italian</option>
                    <option value="mexican">Mexican</option>
                    <option value="asian">Asian</option>
                    <option value="mediterranean">Mediterranean</option>
                    <option value="american">American</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setShowGenerateForm(false)}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateRecipe}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                  >
                    {loading ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Recipe Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Create New Recipe</h3>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    resetRecipeForm();
                  }}
                  className="text-gray-400 hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipe Name *</label>
                  <input
                    type="text"
                    value={recipeForm.name}
                    onChange={(e) => setRecipeForm({ ...recipeForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg"
                    placeholder="Enter recipe name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={recipeForm.description}
                    onChange={(e) => setRecipeForm({ ...recipeForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg h-20"
                    placeholder="Brief description of the recipe"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <select
                      value={recipeForm.category}
                      onChange={(e) => setRecipeForm({ ...recipeForm, category: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg"
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snack">Snack</option>
                      <option value="dessert">Dessert</option>
                      <option value="side-dish">Side Dish</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Difficulty</label>
                    <select
                      value={recipeForm.difficulty}
                      onChange={(e) => setRecipeForm({ ...recipeForm, difficulty: e.target.value })}
                      className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Prep Time (min)</label>
                    <input
                      type="number"
                      min="1"
                      value={recipeForm.prepTime}
                      onChange={(e) => setRecipeForm({ ...recipeForm, prepTime: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Cook Time (min)</label>
                    <input
                      type="number"
                      min="0"
                      value={recipeForm.cookTime}
                      onChange={(e) => setRecipeForm({ ...recipeForm, cookTime: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Servings</label>
                    <input
                      type="number"
                      min="1"
                      value={recipeForm.servings}
                      onChange={(e) => setRecipeForm({ ...recipeForm, servings: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg"
                    />
                  </div>
                </div>

                {/* Ingredients */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium">Ingredients *</label>
                    <button
                      type="button"
                      onClick={addIngredient}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      + Add Ingredient
                    </button>
                  </div>
                  {recipeForm.ingredients.map((ingredient, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Ingredient name"
                        value={ingredient.name}
                        onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 bg-black border border-gray-700 rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={ingredient.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value))}
                        className="w-20 px-3 py-2 bg-black border border-gray-700 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Unit"
                        value={ingredient.unit}
                        onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                        className="w-20 px-3 py-2 bg-black border border-gray-700 rounded-lg"
                      />
                      {recipeForm.ingredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIngredient(index)}
                          className="text-red-400 hover:text-red-300 px-2"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Instructions */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium">Instructions *</label>
                    <button
                      type="button"
                      onClick={addInstruction}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      + Add Step
                    </button>
                  </div>
                  {recipeForm.instructions.map((instruction, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mt-2">
                        {index + 1}
                      </span>
                      <textarea
                        placeholder="Describe this step"
                        value={instruction}
                        onChange={(e) => updateInstruction(index, e.target.value)}
                        className="flex-1 px-3 py-2 bg-black border border-gray-700 rounded-lg h-16"
                      />
                      {recipeForm.instructions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeInstruction(index)}
                          className="text-red-400 hover:text-red-300 px-2"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      resetRecipeForm();
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateRecipe}
                    disabled={loading || !recipeForm.name.trim()}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Recipe'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Recipes