import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'

interface StreamlinedWorkoutGeneratorProps {
  onGenerate: (params: WorkoutParams) => void
  onClose: () => void
  workoutHistory?: any[]
}

interface WorkoutParams {
  fitnessGoal: string
  experienceLevel: string
  equipment: string[]
  workoutDays: number
  timePerWorkout: number
}

interface UserProfileData {
  fitnessGoals?: string[]
  fitnessLevel?: string
  availableEquipment?: string[]
  daysPerWeek?: number
  preferredWorkoutDuration?: number
}

// Helper function to calculate profile completeness
function calculateProfileCompleteness(profileData: UserProfileData): number {
  const requiredFields = [
    'fitnessGoals',
    'fitnessLevel', 
    'availableEquipment',
    'daysPerWeek',
    'preferredWorkoutDuration'
  ];
  
  let completedFields = 0;
  
  requiredFields.forEach(field => {
    const value = profileData[field as keyof UserProfileData];
    if (value && (Array.isArray(value) ? value.length > 0 : true)) {
      completedFields++;
    }
  });
  
  return (completedFields / requiredFields.length) * 100;
}

const StreamlinedWorkoutGenerator: React.FC<StreamlinedWorkoutGeneratorProps> = ({
  onGenerate,
  onClose,
  workoutHistory = []
}) => {
  const { user } = useAuth()
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Customization form state (only used if user chooses to customize)
  const [customGoal, setCustomGoal] = useState('')
  const [customEquipment, setCustomEquipment] = useState<string[]>([])
  const [customDuration, setCustomDuration] = useState(45)
  const [customDays, setCustomDays] = useState(3)

  // Extract profile data with safe fallbacks - using backend schema
  const profileData: UserProfileData = {
    fitnessGoals: user?.fitnessGoals || [],
    fitnessLevel: user?.activityLevel || 'beginner',
    availableEquipment: user?.equipmentAvailability || ['bodyweight'],
    daysPerWeek: user?.daysPerWeek || 3,
    preferredWorkoutDuration: typeof user?.preferredWorkoutDuration === 'string' 
      ? parseInt((user.preferredWorkoutDuration as string).replace('min', '') || '45') 
      : (user?.preferredWorkoutDuration as number) || 45
  }

  // Check profile completeness
  const profileCompleteness = calculateProfileCompleteness(profileData)
  const hasWorkoutHistory = workoutHistory.length >= 3
  const shouldShowQuickGenerate = profileCompleteness >= 0.8 || hasWorkoutHistory

  // Initialize custom form with profile data
  useEffect(() => {
    setCustomGoal(profileData.fitnessGoals?.[0] || 'strength')
    setCustomEquipment(profileData.availableEquipment || ['bodyweight'])
    setCustomDuration(profileData.preferredWorkoutDuration || 45)
    setCustomDays(Math.max(3, Math.min(6, profileData.daysPerWeek || 3))) // Enforce 3-6 range
  }, [user, profileData.fitnessGoals, profileData.availableEquipment, profileData.preferredWorkoutDuration, profileData.daysPerWeek])

  const handleQuickGenerate = async () => {
    if (isGenerating) return; // Prevent double-clicks
    
    setIsGenerating(true)
    try {
      const params: WorkoutParams = {
        fitnessGoal: profileData.fitnessGoals?.[0] || 'strength',
        experienceLevel: profileData.fitnessLevel || 'beginner',
        equipment: profileData.availableEquipment || ['bodyweight'],
        workoutDays: Math.max(3, Math.min(6, profileData.daysPerWeek || 3)), // Enforce 3-6 range
        timePerWorkout: profileData.preferredWorkoutDuration || 45
      }
      
      await onGenerate(params)
      toast.success('🚀 Workout generated using your profile!', {
        duration: 3000
      })
    } catch (error: any) {
      console.error('Error in quick generate:', error);
      
      let errorMessage = 'Failed to generate workout. Please try again.';
      if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      toast.error(errorMessage, {
        duration: 5000
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCustomGenerate = async () => {
    if (isGenerating) return; // Prevent double-clicks
    
    setIsGenerating(true)
    try {
      const params: WorkoutParams = {
        fitnessGoal: customGoal,
        experienceLevel: profileData.fitnessLevel || 'beginner',
        equipment: customEquipment,
        workoutDays: customDays, // Use custom selected days
        timePerWorkout: customDuration
      }
      
      await onGenerate(params)
      toast.success('🎯 Custom workout generated!', {
        duration: 3000
      })
    } catch (error: any) {
      console.error('Error in custom generate:', error);
      
      let errorMessage = 'Failed to generate custom workout. Please try again.';
      if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      toast.error(errorMessage, {
        duration: 5000
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleEquipment = (equipment: string) => {
    setCustomEquipment(prev => 
      prev.includes(equipment) 
        ? prev.filter(e => e !== equipment)
        : [...prev, equipment]
    )
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-gray-900 to-black border border-blue-500/20 rounded-3xl max-w-2xl w-full shadow-2xl"
      >
        {/* Header */}
        <div className="p-8 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                🚀 Instant Workout Generation
              </h2>
              <p className="text-gray-400">
                {shouldShowQuickGenerate 
                  ? 'Generate instantly using your profile, or customize if needed'
                  : 'Quick setup - maximum 4 simple choices'
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-full"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {!showCustomForm ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Profile Summary */}
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Your Profile</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Goal:</span>
                      <span className="text-white ml-2">{profileData.fitnessGoals?.[0] || 'Strength'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Level:</span>
                      <span className="text-white ml-2">{profileData.fitnessLevel || 'Beginner'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Equipment:</span>
                      <span className="text-white ml-2">{profileData.availableEquipment?.join(', ') || 'Bodyweight'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Duration:</span>
                      <span className="text-white ml-2">{profileData.preferredWorkoutDuration || 45} min</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                  {shouldShowQuickGenerate && (
                    <motion.button
                      onClick={handleQuickGenerate}
                      disabled={isGenerating}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isGenerating ? (
                        <>
                          <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <span>⚡</span>
                          <span>Quick Generate</span>
                          <span className="bg-white/20 px-2 py-1 rounded-lg text-sm font-normal">0 seconds</span>
                        </>
                      )}
                    </motion.button>
                  )}

                  {/* 🎯 HICK'S LAW FIX: Hide customize option for complete profiles */}
                  {profileCompleteness < 80 && (
                    <motion.button
                      onClick={() => setShowCustomForm(true)}
                      className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-200 flex items-center justify-center gap-3"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span>🎯</span>
                      <span>Customize</span>
                      <span className="bg-white/10 px-2 py-1 rounded-lg text-sm font-normal">Max 4 choices</span>
                    </motion.button>
                  )}
                  
                  {/* Show profile completeness message for complete profiles */}
                  {profileCompleteness >= 80 && (
                    <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center">
                      <p className="text-green-400 font-medium">
                        ✅ Profile Complete ({Math.round(profileCompleteness)}%)
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        Generating with your personalized preferences
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setShowCustomForm(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h3 className="text-xl font-bold text-white">Quick Customization</h3>
                </div>

                {/* Choice 1: Goal Confirmation (only if multiple goals or goal unclear) */}
                {profileData.fitnessGoals && profileData.fitnessGoals.length > 1 && (
                  <div>
                    <label className="block text-lg font-semibold text-white mb-3">
                      1. Your primary goal today?
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {profileData.fitnessGoals.slice(0, 4).map(goal => (
                        <button
                          key={goal}
                          onClick={() => setCustomGoal(goal)}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            customGoal === goal
                              ? 'border-blue-500 bg-blue-900/30'
                              : 'border-gray-700 bg-black/50 hover:border-gray-600'
                          }`}
                        >
                          <div className="font-medium text-white capitalize">{goal.replace('-', ' ')}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Choice 2: Equipment Check */}
                <div>
                  <label className="block text-lg font-semibold text-white mb-3">
                    2. Available equipment today?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['bodyweight', 'dumbbells', 'barbell', 'resistance bands', 'gym membership'].map(equipment => (
                      <button
                        key={equipment}
                        onClick={() => toggleEquipment(equipment)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          customEquipment.includes(equipment)
                            ? 'border-blue-500 bg-blue-900/30'
                            : 'border-gray-700 bg-black/50 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white capitalize">{equipment.replace('-', ' ')}</span>
                          {customEquipment.includes(equipment) && (
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Choice 3: Workout Days Selection */}
                <div>
                  <label className="block text-lg font-semibold text-white mb-3">
                    3. How many days per week? <span className="text-gray-400 text-base">(Your usual: {profileData.daysPerWeek} days)</span>
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {[3, 4, 5, 6].map(days => (
                      <button
                        key={days}
                        onClick={() => setCustomDays(days)}
                        className={`p-4 rounded-xl border-2 transition-all text-center ${
                          customDays === days
                            ? 'border-blue-500 bg-blue-900/30'
                            : 'border-gray-700 bg-black/50 hover:border-gray-600'
                        }`}
                      >
                        <div className="font-bold text-2xl text-white mb-1">{days}</div>
                        <div className="text-sm text-gray-400">days/week</div>
                        {days === profileData.daysPerWeek && (
                          <div className="text-xs text-blue-400 mt-1">Usual</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Choice 4: Time Selection */}
                <div>
                  <label className="block text-lg font-semibold text-white mb-3">
                    4. How long today? <span className="text-gray-400 text-base">(Your usual: {profileData.preferredWorkoutDuration}min)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[30, 45, 60].map(duration => (
                      <button
                        key={duration}
                        onClick={() => setCustomDuration(duration)}
                        className={`p-4 rounded-xl border-2 transition-all text-center ${
                          customDuration === duration
                            ? 'border-blue-500 bg-blue-900/30'
                            : 'border-gray-700 bg-black/50 hover:border-gray-600'
                        }`}
                      >
                        <div className="font-bold text-2xl text-white mb-1">{duration}</div>
                        <div className="text-sm text-gray-400">minutes</div>
                        {duration === profileData.preferredWorkoutDuration && (
                          <div className="text-xs text-blue-400 mt-1">Usual</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <motion.button
                  onClick={handleCustomGenerate}
                  disabled={isGenerating || customEquipment.length === 0 || customDays < 3 || customDays > 6}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 flex items-center justify-center gap-3"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <span>🎯</span>
                      <span>Generate Custom Workout</span>
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

export default StreamlinedWorkoutGenerator