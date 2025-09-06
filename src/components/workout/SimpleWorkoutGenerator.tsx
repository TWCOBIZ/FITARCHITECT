import React, { useState, useEffect } from 'react';
import { useWorkoutStore, useAuthStore, showErrorNotification, showSuccessNotification } from '../../stores';
import { LoadingButton } from '../common/LoadingOverlay';
import { FeatureErrorBoundary } from '../common/FeatureErrorBoundary';

interface WorkoutPreferences {
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  equipment: string[];
  duration: number;
  daysPerWeek: number;
}

export const SimpleWorkoutGenerator: React.FC = () => {
  const { 
    generateWorkout, 
    isGenerating, 
    generationProgress, 
    generationMessage, 
    generationError,
    canGenerate,
    remainingGenerations,
    currentPlan,
    checkGenerationLimits
  } = useWorkoutStore();
  
  const { user, hasFeatureAccess, isProfileComplete } = useAuthStore();
  
  const [preferences, setPreferences] = useState<WorkoutPreferences>({
    fitnessLevel: 'beginner',
    goals: ['strength'],
    equipment: ['bodyweight'],
    duration: 30,
    daysPerWeek: 3
  });
  
  useEffect(() => {
    if (user) {
      checkGenerationLimits();
    }
  }, [user, checkGenerationLimits]);
  
  const handleGenerate = async () => {
    if (!canGenerate) {
      showErrorNotification(
        'Generation Limit Reached',
        `You have ${remainingGenerations} generations remaining today. Upgrade for unlimited access.`
      );
      return;
    }
    
    if (!isProfileComplete()) {
      showErrorNotification(
        'Profile Incomplete',
        'Please complete your fitness profile before generating workouts.'
      );
      return;
    }
    
    try {
      await generateWorkout(preferences);
      showSuccessNotification(
        'Workout Generated!',
        'Your personalized workout is ready.'
      );
    } catch (error: any) {
      showErrorNotification(
        'Generation Failed',
        error.message || 'Unable to generate workout. Please try again.'
      );
    }
  };
  
  const canAccessFeature = hasFeatureAccess('workout-generation');
  
  if (!user) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-400 mb-4">Please log in to generate workouts</p>
        <a href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Sign In
        </a>
      </div>
    );
  }
  
  if (!canAccessFeature) {
    return (
      <div className="text-center p-8 bg-gray-800 rounded-lg">
        <div className="mb-4">
          <svg className="h-12 w-12 text-gray-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-gray-400 mb-4">Workout generation requires a subscription</p>
        <a href="/pricing" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          View Plans
        </a>
      </div>
    );
  }
  
  return (
    <FeatureErrorBoundary featureName="Workout Generator">
      <div className="max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Generate Your Workout</h2>
          <p className="text-gray-400">
            Create a personalized workout plan based on your preferences
          </p>
          
          {!canGenerate && (
            <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-700 rounded">
              <p className="text-yellow-300 text-sm">
                ⚠️ Generation limit reached. You have {remainingGenerations} remaining today.
              </p>
            </div>
          )}
        </div>
        
        {/* Preferences Form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-white font-medium mb-2">Fitness Level</label>
            <select
              value={preferences.fitnessLevel}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                fitnessLevel: e.target.value as any
              }))}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          
          <div>
            <label className="block text-white font-medium mb-2">Primary Goals</label>
            <div className="flex flex-wrap gap-2">
              {['strength', 'endurance', 'weight-loss', 'muscle-gain', 'flexibility'].map(goal => (
                <button
                  key={goal}
                  onClick={() => {
                    setPreferences(prev => ({
                      ...prev,
                      goals: prev.goals.includes(goal)
                        ? prev.goals.filter(g => g !== goal)
                        : [...prev.goals, goal]
                    }));
                  }}
                  className={`px-3 py-1 rounded-full text-sm capitalize ${
                    preferences.goals.includes(goal)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {goal.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-white font-medium mb-2">
              Workout Duration: {preferences.duration} minutes
            </label>
            <input
              type="range"
              min="15"
              max="90"
              step="15"
              value={preferences.duration}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                duration: parseInt(e.target.value)
              }))}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500 mt-1">
              <span>15 min</span>
              <span>90 min</span>
            </div>
          </div>
        </div>
        
        {/* Generation Progress */}
        {isGenerating && (
          <div className="mb-6">
            <p className="text-blue-400 mb-2">{generationMessage}</p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 mt-1">{generationProgress}% complete</p>
          </div>
        )}
        
        {/* Error Display */}
        {generationError && (
          <div className="mb-6 p-3 bg-red-900/50 border border-red-700 rounded">
            <p className="text-red-300">{generationError}</p>
          </div>
        )}
        
        {/* Current Plan Display */}
        {currentPlan && (
          <div className="mb-6 p-4 bg-green-900/50 border border-green-700 rounded">
            <h3 className="text-green-300 font-medium mb-2">✅ Latest Workout Plan</h3>
            <p className="text-white font-medium">{currentPlan.name}</p>
            <p className="text-gray-300 text-sm">{currentPlan.description}</p>
            <div className="mt-2 text-sm text-gray-400">
              <span>{currentPlan.workouts?.length || 0} workouts</span>
              <span className="mx-2">•</span>
              <span>{currentPlan.duration} minutes each</span>
              <span className="mx-2">•</span>
              <span className="capitalize">{currentPlan.difficulty}</span>
            </div>
          </div>
        )}
        
        {/* Generate Button */}
        <LoadingButton
          isLoading={isGenerating}
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          loadingText="Generating your workout..."
        >
          Generate Workout Plan
        </LoadingButton>
        
        <p className="text-center text-gray-500 text-sm mt-3">
          Powered by AI • {remainingGenerations} generations remaining today
        </p>
      </div>
    </FeatureErrorBoundary>
  );
};