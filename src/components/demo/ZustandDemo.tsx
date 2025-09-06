import React, { useEffect } from 'react';
import { useAuthStore, useWorkoutStore, useUIStore, showSuccessNotification, showErrorNotification } from '../../stores';

export const ZustandDemo: React.FC = () => {
  const {
    user,
    isLoading: authLoading,
    login,
    isProfileComplete,
    hasFeatureAccess
  } = useAuthStore();
  
  const {
    currentPlan,
    isGenerating,
    generationProgress,
    generationMessage,
    generationError,
    canGenerate,
    remainingGenerations,
    generateWorkout,
    checkGenerationLimits
  } = useWorkoutStore();
  
  const { theme, setTheme, setLoading } = useUIStore();
  
  useEffect(() => {
    // Check generation limits on component mount if authenticated
    if (user) {
      checkGenerationLimits().catch(console.warn);
    }
  }, [user, checkGenerationLimits]);
  
  const handleDemoLogin = async () => {
    try {
      setLoading(true, 'Logging in...');
      await login('demo@fitarchitect.com', 'demo123');
      showSuccessNotification('Success', 'Logged in successfully!');
    } catch (error: any) {
      showErrorNotification('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleGenerateWorkout = async () => {
    try {
      const preferences = {
        fitnessLevel: 'beginner' as const,
        goals: ['strength', 'endurance'],
        equipment: ['bodyweight'],
        duration: 30,
        daysPerWeek: 3
      };
      
      const plan = await generateWorkout(preferences);
      showSuccessNotification('Workout Generated!', `Created "${plan.name}" with ${plan.workouts?.length || 0} workouts`);
    } catch (error: any) {
      showErrorNotification('Generation Failed', error.message);
    }
  };
  
  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Zustand State Management Demo</h1>
        
        {/* Theme Toggle */}
        <div className="mb-6">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Switch to {theme === 'dark' ? 'Light' : 'Dark'} Theme
          </button>
        </div>
        
        {/* Authentication Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication State</h2>
          
          {!user ? (
            <div>
              <p className="mb-4 text-gray-300">Not logged in</p>
              <button
                onClick={handleDemoLogin}
                disabled={authLoading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg"
              >
                {authLoading ? 'Logging in...' : 'Demo Login'}
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-2"><strong>User:</strong> {user.name} ({user.email})</p>
              <p className="mb-2"><strong>Tier:</strong> {user.tier}</p>
              <p className="mb-2"><strong>Profile Complete:</strong> {isProfileComplete() ? '✅ Yes' : '❌ No'}</p>
              <p className="mb-4"><strong>Workout Access:</strong> {hasFeatureAccess('workout-generation') ? '✅ Yes' : '❌ No'}</p>
            </div>
          )}
        </div>
        
        {/* Workout Generation Section */}
        {user && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Workout Generation</h2>
            
            <div className="mb-4">
              <p className="mb-2"><strong>Can Generate:</strong> {canGenerate ? '✅ Yes' : '❌ No'}</p>
              <p className="mb-2"><strong>Remaining Generations:</strong> {remainingGenerations}</p>
            </div>
            
            {isGenerating && (
              <div className="mb-4">
                <p className="mb-2 text-blue-400">{generationMessage}</p>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-400 mt-1">{generationProgress}% complete</p>
              </div>
            )}
            
            {generationError && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded">
                <p className="text-red-300">{generationError}</p>
              </div>
            )}
            
            {currentPlan && (
              <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded">
                <p className="text-green-300">
                  <strong>Latest Plan:</strong> {currentPlan.name}
                </p>
                <p className="text-sm text-gray-400">
                  {currentPlan.workouts?.length || 0} workouts, {currentPlan.duration} min each
                </p>
              </div>
            )}
            
            <button
              onClick={handleGenerateWorkout}
              disabled={!canGenerate || isGenerating}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg"
            >
              {isGenerating ? 'Generating...' : 'Generate Demo Workout'}
            </button>
          </div>
        )}
        
        {/* API Integration Test */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Backend Integration Status</h2>
          
          <div className="space-y-2">
            <p><strong>Backend URL:</strong> {import.meta.env.VITE_API_URL || 'http://localhost:3001'}</p>
            <p><strong>Auth Store:</strong> ✅ Configured</p>
            <p><strong>Workout Store:</strong> ✅ Configured</p>
            <p><strong>UI Store:</strong> ✅ Configured</p>
            <p><strong>Modular Routes:</strong> ✅ Implemented</p>
            <p><strong>Error Handling:</strong> ✅ Centralized</p>
          </div>
        </div>
      </div>
    </div>
  );
};