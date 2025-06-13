import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import { gsap } from 'gsap'
import { useWorkout, AIGeneratedPlan } from '../contexts/WorkoutContext'
import { useAuth } from '../contexts/AuthContext'
import { WorkoutPlan, Workout, Exercise, WorkoutExercise } from '../types/workout'
import { User } from '../types'
import WorkoutPlans from '../components/workout/WorkoutPlans'
import WorkoutTracker from '../components/workout/WorkoutTracker'
import WorkoutHistory from '../components/workout/WorkoutHistory'
import WorkoutAnalytics from '../components/workout/WorkoutAnalytics'
import WorkoutPlanCustomizer from '../components/workout/WorkoutPlanCustomizer'
import { useNavigate, useLocation } from 'react-router-dom'
import { isProfileComplete } from '../utils/profile'
import { workoutService, generateWorkoutPlanWithRetry, canGenerateFreeWorkout } from '../services/workoutService'
import { useWorkoutPlans, useSaveWorkoutPlan, useDeleteWorkoutPlan, useCompleteWorkoutPlan } from '../hooks/useWorkoutPlans'

type Tab = 'plans' | 'current' | 'tracker' | 'history' | 'analytics'

// AI-generated plan structure (can have either weeks-based or workouts-based)
interface AIGeneratedPlan {
  id: string
  name: string
  description: string
  duration: number
  workouts?: Workout[]
  weeks?: WeekStructure[]
  targetMuscleGroups: string[]
  difficulty: string
  createdAt: Date | string
  updatedAt: Date | string
}

interface WeekStructure {
  weekNumber: number
  days: DayStructure[]
}

interface DayStructure {
  dayNumber: number
  exercises: any[]
  name?: string
  description?: string
}

interface DefaultPlan {
  key: string
  title: string
  description: string
  weeks: number
  details: string[]
}

const defaultPlans: DefaultPlan[] = [
  {
    key: 'lose-weight',
    title: 'Lose Weight',
    description: 'A balanced program focused on fat loss, cardio, and full-body strength.',
    weeks: 3,
    details: [
      '3x/week full-body strength',
      '2x/week HIIT cardio',
      'Daily step goal',
      'Progressive overload and calorie deficit tips',
    ],
  },
  {
    key: 'build-muscle',
    title: 'Build Muscle',
    description: 'A hypertrophy-focused split for muscle growth and strength.',
    weeks: 3,
    details: [
      '4x/week upper/lower split',
      'Accessory isolation work',
      'Progressive overload',
      'Nutrition for muscle gain',
    ],
  },
  {
    key: 'increase-endurance',
    title: 'Increase Endurance',
    description: 'A program to boost cardiovascular and muscular endurance.',
    weeks: 3,
    details: [
      '3x/week running/cycling',
      '2x/week circuit training',
      'Mobility and recovery focus',
      'Endurance nutrition guidance',
    ],
  },
];

// Helper to convert default plan to valid WorkoutPlan
function defaultPlanToWorkoutPlan(plan: DefaultPlan): AIGeneratedPlan {
  const now = new Date();
  // Infer muscle groups from title
  let targetMuscleGroups: string[] = [];
  if (plan.key === 'lose-weight') targetMuscleGroups = ['fullBody', 'cardio'];
  if (plan.key === 'build-muscle') targetMuscleGroups = ['upper', 'lower', 'fullBody'];
  if (plan.key === 'increase-endurance') targetMuscleGroups = ['cardio', 'legs', 'core'];
  // Create workouts for the 3-week program (3 different workouts)
  const workouts: Workout[] = Array.from({ length: 3 }, (_, i) => ({
    id: `${plan.key}-workout-${i+1}`,
    name: `${plan.title} - Day ${i+1}`,
    description: plan.details.join(', '),
    type: 'strength' as const,
    difficulty: 'beginner' as const,
    duration: 45,
    exercises: plan.details.map((d: string, idx: number) => ({
      exercise: {
        id: `${plan.key}-ex${idx+1}`,
        name: d.split(' ')[0] || `Exercise ${idx + 1}`,
        description: d,
        muscleGroups: targetMuscleGroups as any,
        equipment: ['bodyweight'] as any,
        difficulty: 'beginner' as const,
        instructions: [d],
        videoUrl: '',
        imageUrl: ''
      },
      sets: 3,
      reps: 10,
      restTime: 60
    })),
    targetMuscleGroups: targetMuscleGroups as any,
    equipment: ['bodyweight'] as any,
    caloriesBurned: 200,
    createdAt: now,
    updatedAt: now
  }));
  return {
    id: `${plan.key}-${Date.now()}`,
    name: plan.title,
    description: plan.description,
    duration: plan.weeks,
    workouts,
    targetMuscleGroups,
    difficulty: 'beginner',
    createdAt: now,
    updatedAt: now
  };
}

const WorkoutPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('plans')
  const { currentWorkout, activePlan, setActivePlan, getTodaysWorkout } = useWorkout()
  const { user } = useAuth()
  const [selectedDefault, setSelectedDefault] = useState<string | null>(null);
  const [customizingPlan, setCustomizingPlan] = useState<AIGeneratedPlan | null>(null);
  const [showAIGenerate, setShowAIGenerate] = useState(false);
  const [aiForm, setAIForm] = useState({
    fitnessGoal: 'strength',
    equipment: [] as string[],
    workoutDays: 3,
    timePerWorkout: 45,
    experienceLevel: 'beginner',
  });
  const [aiLoading, setAILoading] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);
  const [freeGenerationsRemaining, setFreeGenerationsRemaining] = useState<number>(0);
  const [freeDaysRemaining, setFreeDaysRemaining] = useState<number>(0);
  const [canUseFreeGeneration, setCanUseFreeGeneration] = useState<boolean>(false);
  const aiFormRef = useRef<HTMLFormElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // TanStack Query hooks
  const { data: workoutPlans = [], isLoading: plansLoading, error: plansError } = useWorkoutPlans()
  const saveWorkoutPlanMutation = useSaveWorkoutPlan()
  const deleteWorkoutPlanMutation = useDeleteWorkoutPlan()
  const completeWorkoutPlanMutation = useCompleteWorkoutPlan()

  const tabs: { id: Tab; label: string }[] = [
    { id: 'plans', label: 'Workout Plans' },
    { id: 'current', label: 'Current Plan' },
    { id: 'tracker', label: 'Workout Tracker' },
    { id: 'history', label: 'History' },
    { id: 'analytics', label: 'Analytics' }
  ]

  // GSAP animation for tab transitions
  const animateTabTransition = (newTab: Tab) => {
    if (contentRef.current) {
      gsap.to(contentRef.current, {
        opacity: 0,
        duration: 0.15,
        ease: "power2.out",
        onComplete: () => {
          setActiveTab(newTab)
          gsap.to(contentRef.current, {
            opacity: 1,
            duration: 0.15,
            ease: "power2.in"
          })
        }
      })
    } else {
      setActiveTab(newTab)
    }
  }

  // Set activePlan from workoutPlans when they load
  useEffect(() => {
    if (workoutPlans.length > 0 && !activePlan) {
      const activeWorkoutPlan = workoutPlans.find(p => !p.completed);
      if (activeWorkoutPlan) {
        setActivePlan(activeWorkoutPlan);
      }
    }
  }, [workoutPlans, activePlan, setActivePlan]);

  useEffect(() => {
    // Load free trial status for free tier users
    if (user?.tier === 'free' && user?.parqCompleted && user?.email !== 'nepacreativeagency@icloud.com') {
      canGenerateFreeWorkout(user).then(result => {
        setCanUseFreeGeneration(result.canGenerate);
        setFreeGenerationsRemaining(result.remaining);
        setFreeDaysRemaining(result.daysRemaining);
      });
    }
  }, [user?.tier, user?.parqCompleted, user?.email]);

  useEffect(() => {
    if (!isProfileComplete(user)) {
      navigate('/profile', { state: { from: location.pathname } });
    }
  }, [user, navigate, location]);

  const handleSelectDefault = (key: string) => {
    setSelectedDefault(key);
  };

  const handleStartDefault = () => {
    if (!selectedPlan) return;
    // Transform to valid WorkoutPlan
    const validPlan = defaultPlanToWorkoutPlan(selectedPlan);
    setCustomizingPlan(validPlan);
  };

  const handleSaveCustomizedPlan = async (plan: AIGeneratedPlan) => {
    try {
      const savedPlan = await saveWorkoutPlanMutation.mutateAsync(plan);
      setActivePlan(savedPlan); // Set as active plan
      setCustomizingPlan(null);
      setSelectedDefault(null);
      animateTabTransition('current');
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      await deleteWorkoutPlanMutation.mutateAsync(id);
      // If deleted plan was active, clear it
      if (activePlan?.id === id) {
        const remainingPlans = workoutPlans.filter(plan => plan.id !== id);
        const newActivePlan = remainingPlans.find(p => !p.completed);
        setActivePlan(newActivePlan || null);
      }
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      await completeWorkoutPlanMutation.mutateAsync(id);
      // If completed plan was active, find new active plan
      if (activePlan?.id === id) {
        const remainingPlans = workoutPlans.filter(plan => plan.id !== id || !plan.completed);
        const newActivePlan = remainingPlans.find(p => !p.completed);
        setActivePlan(newActivePlan || null);
      }
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const selectedPlan = defaultPlans.find((p) => p.key === selectedDefault);

  const handleAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAILoading(true);
    setAIError(null);
    try {
      const plan = await generateWorkoutPlanWithRetry(aiForm);
      setCustomizingPlan(plan);
      setShowAIGenerate(false);
    } catch (err) {
      setAIError('Could not generate workout plan after several attempts. Please try again later.');
      // Optionally: toast.error('Could not generate workout plan after several attempts. Please try again later.');
    } finally {
      setAILoading(false);
    }
  };

  // Allow test user to always generate AI workouts
  const canGenerateAI = user?.email === 'nepacreativeagency@icloud.com' ? true : user?.parqCompleted;
  
  const handleGenerateAIClick = async () => {
    if (!canGenerateAI && user?.email !== 'nepacreativeagency@icloud.com') {
      // Redirect to PAR-Q form with return path
      navigate('/parq', { state: { from: location.pathname } });
      return;
    }
    
    // For free users who completed PAR-Q, check if they have trial time left
    if (user?.tier === 'free' && user?.email !== 'nepacreativeagency@icloud.com') {
      const freeCheck = await canGenerateFreeWorkout(user);
      if (!freeCheck.canGenerate) {
        toast.error('Your 3-day free trial has expired. Upgrade to Basic plan for unlimited workout generation!');
        navigate('/pricing');
        return;
      }
      setFreeGenerationsRemaining(freeCheck.remaining);
      setFreeDaysRemaining(freeCheck.daysRemaining);
    }
    
    setShowAIGenerate(true);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'plans':
        if (customizingPlan) {
          // Convert plan to proper workouts structure if needed
          let planForCustomizer = customizingPlan;
          
          // If plan has weeks structure, convert to workouts structure
          if (customizingPlan.weeks && Array.isArray(customizingPlan.weeks) && (!customizingPlan.workouts || !Array.isArray(customizingPlan.workouts))) {
            // Convert weeks structure to workouts array
            const workouts: Workout[] = [];
            customizingPlan.weeks.forEach((week: any) => {
              if (week.days && Array.isArray(week.days)) {
                week.days.forEach((day: any, dayIndex: number) => {
                  if (day.exercises && Array.isArray(day.exercises)) {
                    const workout: Workout = {
                      id: `${customizingPlan.id}-week${week.weekNumber || 1}-day${dayIndex + 1}`,
                      name: day.name || `Week ${week.weekNumber || 1}, Day ${dayIndex + 1}`,
                      description: day.description || '',
                      type: 'strength' as const,
                      difficulty: customizingPlan.difficulty as any || 'beginner',
                      duration: 45,
                      exercises: day.exercises.map((ex: any) => ({
                        exercise: ex.exercise || ex,
                        sets: ex.sets || 3,
                        reps: ex.reps || 10,
                        restTime: ex.restTime || 60
                      })),
                      targetMuscleGroups: customizingPlan.targetMuscleGroups as any || [],
                      equipment: [],
                      caloriesBurned: 0,
                      createdAt: new Date(customizingPlan.createdAt),
                      updatedAt: new Date(customizingPlan.updatedAt)
                    };
                    workouts.push(workout);
                  }
                });
              }
            });
            
            planForCustomizer = {
              ...customizingPlan,
              workouts
            };
          }
          
          // Type check: must be an object with id, name, workouts, etc.
          const isValidPlan = planForCustomizer && typeof planForCustomizer === 'object' && planForCustomizer.id && planForCustomizer.workouts && Array.isArray(planForCustomizer.workouts);
          if (!isValidPlan) {
            return (
              <div className="bg-gray-900 border border-red-700 rounded-xl shadow-lg p-8 mb-8 text-center">
                <h2 className="text-2xl font-bold mb-4 text-red-400">Error</h2>
                <div className="text-gray-300 text-lg">Failed to generate a valid workout plan. Please try again or adjust your inputs.</div>
                <button className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" onClick={() => setCustomizingPlan(null)}>Back</button>
              </div>
            );
          }
          return <WorkoutPlanCustomizer plan={planForCustomizer} onSave={handleSaveCustomizedPlan} onCancel={() => setCustomizingPlan(null)} />;
        }
        return (
          <>
            <div className="mb-8">
              <button
                className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 font-semibold text-lg"
                onClick={handleGenerateAIClick}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate AI-Powered Workout Plan
                <span className="bg-white/20 px-2 py-1 rounded-lg text-sm font-normal">Personalized</span>
              </button>
              <p className="text-gray-400 text-sm mt-2 text-center md:text-left">
                Get a workout plan tailored specifically to your goals, experience level, and available equipment
              </p>
            </div>
            {!canGenerateAI && user?.email !== 'nepacreativeagency@icloud.com' && (
              <div className="mb-4 text-yellow-600 font-semibold bg-yellow-900/20 border border-yellow-600 rounded p-3">
                Complete the PAR-Q health assessment to unlock your 3-day free workout generation trial.
              </div>
            )}
            {canGenerateAI && user?.tier === 'free' && user?.email !== 'nepacreativeagency@icloud.com' && freeDaysRemaining > 0 && (
              <div className="mb-4 text-blue-600 font-semibold bg-blue-900/20 border border-blue-600 rounded p-3">
                🎉 Free Trial: {freeDaysRemaining} days remaining for unlimited AI workout generation!
              </div>
            )}
            {canGenerateAI && user?.tier === 'free' && user?.email !== 'nepacreativeagency@icloud.com' && freeDaysRemaining === 0 && (
              <div className="mb-4 text-red-600 font-semibold bg-red-900/20 border border-red-600 rounded p-3">
                Your 3-day free trial has expired. <a href="/pricing" className="underline">Upgrade to Basic</a> for unlimited workout generation.
              </div>
            )}
            {showAIGenerate && (
              <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                  <form ref={aiFormRef} onSubmit={handleAIGenerate} className="p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-3xl font-bold text-white mb-2">Create Your Workout Plan</h2>
                        <p className="text-gray-400">Tell us about your fitness goals and we'll create a personalized plan just for you.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAIGenerate(false)}
                        className="text-gray-400 hover:text-white transition-colors p-2"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                      {/* Left Column */}
                      <div className="space-y-6">
                        {/* Primary Goal */}
                        <div>
                          <label className="block text-lg font-semibold text-white mb-3">What's your primary fitness goal?</label>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { value: 'strength', label: 'Build Strength', icon: '💪', desc: 'Increase muscle strength and power' },
                              { value: 'weight-loss', label: 'Lose Weight', icon: '🔥', desc: 'Burn calories and reduce body fat' },
                              { value: 'muscle gain', label: 'Build Muscle', icon: '🏗️', desc: 'Increase muscle size and mass' },
                              { value: 'endurance', label: 'Improve Endurance', icon: '🏃', desc: 'Boost cardiovascular fitness' }
                            ].map(goal => (
                              <button
                                key={goal.value}
                                type="button"
                                onClick={() => setAIForm(f => ({ ...f, fitnessGoal: goal.value }))}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${
                                  aiForm.fitnessGoal === goal.value
                                    ? 'border-blue-500 bg-blue-900/20 text-white'
                                    : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                                }`}
                              >
                                <div className="text-2xl mb-2">{goal.icon}</div>
                                <div className="font-semibold text-sm">{goal.label}</div>
                                <div className="text-xs text-gray-400 mt-1">{goal.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Experience Level */}
                        <div>
                          <label className="block text-lg font-semibold text-white mb-3">What's your experience level?</label>
                          <div className="space-y-2">
                            {[
                              { value: 'beginner', label: 'Beginner', desc: 'New to working out or returning after a long break' },
                              { value: 'intermediate', label: 'Intermediate', desc: 'Working out regularly for 6+ months' },
                              { value: 'advanced', label: 'Advanced', desc: 'Experienced lifter with 2+ years of training' }
                            ].map(level => (
                              <button
                                key={level.value}
                                type="button"
                                onClick={() => setAIForm(f => ({ ...f, experienceLevel: level.value }))}
                                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                                  aiForm.experienceLevel === level.value
                                    ? 'border-blue-500 bg-blue-900/20 text-white'
                                    : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                                }`}
                              >
                                <div className="font-semibold">{level.label}</div>
                                <div className="text-sm text-gray-400 mt-1">{level.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Workout Frequency */}
                        <div>
                          <label className="block text-lg font-semibold text-white mb-3">How many days per week can you work out?</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[2, 3, 4, 5, 6, 7].map(days => (
                              <button
                                key={days}
                                type="button"
                                onClick={() => setAIForm(f => ({ ...f, workoutDays: days }))}
                                className={`p-3 rounded-xl border-2 transition-all text-center ${
                                  aiForm.workoutDays === days
                                    ? 'border-blue-500 bg-blue-900/20 text-white'
                                    : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                                }`}
                              >
                                <div className="font-bold text-lg">{days}</div>
                                <div className="text-xs">day{days > 1 ? 's' : ''}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-6">
                        {/* Session Duration */}
                        <div>
                          <label className="block text-lg font-semibold text-white mb-3">How long can you work out each session?</label>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { value: 30, label: '30 min', desc: 'Quick & efficient' },
                              { value: 45, label: '45 min', desc: 'Balanced approach' },
                              { value: 60, label: '60 min', desc: 'Comprehensive' },
                              { value: 90, label: '90 min', desc: 'Extended session' }
                            ].map(duration => (
                              <button
                                key={duration.value}
                                type="button"
                                onClick={() => setAIForm(f => ({ ...f, timePerWorkout: duration.value }))}
                                className={`p-3 rounded-xl border-2 transition-all text-center ${
                                  aiForm.timePerWorkout === duration.value
                                    ? 'border-blue-500 bg-blue-900/20 text-white'
                                    : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                                }`}
                              >
                                <div className="font-bold">{duration.label}</div>
                                <div className="text-xs text-gray-400">{duration.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Equipment */}
                        <div>
                          <label className="block text-lg font-semibold text-white mb-3">What equipment do you have access to?</label>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {[
                              { value: 'bodyweight', label: 'Bodyweight Only', icon: '🤸', desc: 'No equipment needed' },
                              { value: 'dumbbells', label: 'Dumbbells', icon: '🏋️', desc: 'Adjustable or fixed weights' },
                              { value: 'barbell', label: 'Barbell & Plates', icon: '🏋️', desc: 'Olympic or standard barbell' },
                              { value: 'resistance bands', label: 'Resistance Bands', icon: '🎗️', desc: 'Loop or tube bands' },
                              { value: 'pull-up bar', label: 'Pull-up Bar', icon: '🔗', desc: 'Doorway or wall-mounted' },
                              { value: 'bench', label: 'Weight Bench', icon: '🛏️', desc: 'Adjustable or flat bench' },
                              { value: 'gym membership', label: 'Full Gym Access', icon: '🏢', desc: 'Commercial gym equipment' }
                            ].map(eq => (
                              <label key={eq.value} className="flex items-center gap-3 p-3 rounded-xl border border-gray-700 bg-gray-800 hover:bg-gray-750 transition-colors cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={aiForm.equipment.includes(eq.value)}
                                  onChange={e => setAIForm(f => ({
                                    ...f,
                                    equipment: e.target.checked 
                                      ? [...f.equipment, eq.value] 
                                      : f.equipment.filter(x => x !== eq.value)
                                  }))}
                                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                                />
                                <div className="text-2xl">{eq.icon}</div>
                                <div className="flex-1">
                                  <div className="font-semibold text-white text-sm">{eq.label}</div>
                                  <div className="text-xs text-gray-400">{eq.desc}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Error Display */}
                    {aiError && (
                      <div className="mt-6 p-4 bg-red-900/20 border border-red-700 rounded-xl">
                        <div className="flex items-center gap-2 text-red-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="font-semibold">{aiError}</span>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-700">
                      <button
                        type="button"
                        onClick={() => setShowAIGenerate(false)}
                        className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={aiLoading || aiForm.equipment.length === 0}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
                      >
                        {aiLoading ? (
                          <>
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating Your Plan...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Generate My Workout Plan
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            <h2 className="text-xl font-semibold mb-4 mt-8">Choose a Goal</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {defaultPlans.map((plan) => (
                <div
                  key={plan.key}
                  className={`transition cursor-pointer rounded-lg p-6 shadow hover:shadow-lg border-2 
                    ${selectedDefault === plan.key
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-gray-800 bg-gray-900 hover:bg-gray-800'}`}
                  onClick={() => handleSelectDefault(plan.key)}
                  tabIndex={0}
                  aria-label={`Select ${plan.title} plan`}
                >
                  <h3 className="text-lg font-bold mb-2 text-white">{plan.title}</h3>
                  <p className="mb-2 text-gray-300">{plan.description}</p>
                  <ul className="text-sm text-gray-400 list-disc pl-5">
                    {plan.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                  <div className="mt-4 text-xs text-gray-500">{plan.weeks} weeks</div>
                </div>
              ))}
            </div>
            {selectedDefault && (
              <div className="flex justify-center mb-8">
                <button
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-black"
                  onClick={handleStartDefault}
                >
                  Start Plan
                </button>
              </div>
            )}
          </>
        );
      case 'current':
        // Today's Workout Panel - use activePlan from context
        if (activePlan) {
          // Get today's workout from context
          const today = getTodaysWorkout(activePlan);
          
          if (today) {
            return (
              <div className="space-y-8">
                {/* Today's Workout Section */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-6 md:p-8 mb-8">
                  {/* Workout Header */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl md:text-3xl font-bold text-white">Today's Workout</h2>
                      <div className="bg-black/50 rounded-full px-4 py-2">
                        <span className="text-blue-400 text-sm font-semibold">
                          {today.exercises?.length || 0} exercises
                        </span>
                      </div>
                    </div>
                    <h3 className="text-lg md:text-xl text-gray-300 font-medium mb-2">
                      {activePlan.name}
                    </h3>
                    <p className="text-gray-400 text-sm md:text-base">
                      {today.name} • {today.duration || 45} minutes • {today.difficulty || 'Intermediate'}
                    </p>
                  </div>
                  
                  {/* Exercises Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {today.exercises && today.exercises.length > 0 ? (
                      today.exercises.map((workoutEx: any, idx: number) => {
                        // Handle both data structures: direct exercise data and WorkoutExercise format
                        const exercise = workoutEx.exercise || workoutEx;
                        const sets = workoutEx.sets || 3;
                        const reps = workoutEx.reps || 10;
                        const restTime = workoutEx.restTime || 60;
                        
                        return (
                          <div key={idx} className="bg-black border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-600 transition-all duration-300 hover:shadow-xl">
                            {/* Exercise Image Placeholder */}
                            <div className="relative h-48 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 flex flex-col items-center justify-center">
                                <div className="text-center">
                                  <svg className="w-12 h-12 text-white mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  <div className="text-white">
                                    <div className="text-xs font-medium uppercase tracking-wider opacity-90">
                                      Exercise
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Exercise Content */}
                            <div className="p-6">
                              {/* Exercise Name */}
                              <h3 className="text-xl font-bold text-white mb-3 leading-tight">
                                {exercise.name || `Exercise ${idx + 1}`}
                              </h3>
                              
                              {/* Sets & Reps - Prominent Display */}
                              <div className="mb-4">
                                <div className="text-2xl font-black text-white mb-1">
                                  {sets} × {reps}
                                </div>
                                <div className="text-gray-400 text-sm">
                                  {restTime}s rest between sets
                                </div>
                              </div>
                              
                              {/* Exercise Description */}
                              {exercise.description && (
                                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                                  {exercise.description}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-gray-400 col-span-2 text-center py-8">
                        <div className="text-lg mb-2">No exercises available</div>
                        <div className="text-sm">Generate a workout plan to see your daily exercises here!</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }
        }
        
        // Fallback: no active plan or no days
        return (
          <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-6 md:p-8 mb-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-800 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">Ready to Get Started?</h2>
              <p className="text-gray-400 text-base md:text-lg mb-6 leading-relaxed">
                No active workout plan found. Generate an AI-powered plan or choose from our curated workouts to see your daily exercises here.
              </p>
              <button
                onClick={() => animateTabTransition('plans')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors duration-200"
              >
                Browse Workout Plans
              </button>
            </div>
          </div>
        );
      case 'tracker':
        if (!currentWorkout && !activePlan) {
          return (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-white mb-4">No Active Workout</h2>
              <p className="text-gray-400 mb-6">Start a workout from your current plan to begin tracking.</p>
              <button
                onClick={() => animateTabTransition('plans')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Workout Plans
              </button>
            </div>
          )
        }
        return <WorkoutTracker />
      case 'history':
        return <WorkoutHistory />
      case 'analytics':
        return <WorkoutAnalytics />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto bg-black rounded-lg border border-gray-800 p-8">
        <h1 className="text-3xl font-bold mb-2">Workouts</h1>
        <p className="text-gray-400 mb-8">Track your fitness journey and achieve your goals</p>
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`px-4 py-2 rounded font-semibold transition-colors focus:outline-none ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              onClick={() => animateTabTransition(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Main Panel Content with GSAP animation ref */}
        <div ref={contentRef} className="bg-black rounded-lg border border-gray-800 p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default WorkoutPage