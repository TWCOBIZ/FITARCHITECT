import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import { gsap } from 'gsap'
import { useWorkout } from '../contexts/WorkoutContext'
import { useAuth } from '../contexts/AuthContext'
import { WorkoutPlan, Workout, Exercise, WorkoutExercise } from '../types/workout'
import WorkoutPlans from '../components/workout/WorkoutPlans'
import WorkoutTracker from '../components/workout/WorkoutTracker'
import WorkoutHistory from '../components/workout/WorkoutHistory'
import WorkoutAnalytics from '../components/workout/WorkoutAnalytics'
import WorkoutPlanCustomizer from '../components/workout/WorkoutPlanCustomizer'
import WeeklyProgramView from '../components/workout/WeeklyProgramView'
import StreamlinedWorkoutGenerator from '../components/workout/StreamlinedWorkoutGenerator'
import ProgramTimeline from '../components/workout/ProgramTimeline'
import { useNavigate, useLocation } from 'react-router-dom'
import { isProfileComplete } from '../utils/profile'
import { canGenerateFreeWorkout, workoutService } from '../services/workoutService'
import { isTestUser } from '../utils/testUsers'
import { logger } from '../utils/logger'
import { useWorkoutPlans, useSaveWorkoutPlan, useDeleteWorkoutPlan, useCompleteWorkoutPlan } from '../hooks/useWorkoutPlans'
import { COMPREHENSIVE_EXERCISE_DATABASE, ComprehensiveExercise } from '../data/comprehensiveExerciseDatabase'
import ExerciseServiceDiagnostic from '../components/workout/ExerciseServiceDiagnostic'
// intelligentWorkoutService consolidated into workoutService

type Tab = 'today' | 'plan' | 'progress'

// AI-generated plan structure (can have either weeks-based or workouts-based)
export interface AIGeneratedPlan {
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

// Helper function to calculate profile completeness
function calculateProfileCompleteness(user: any): number {
  if (!user) return 0;
  
  // Test users always get 100% completeness
  if (isTestUser(user.email)) return 100;
  
  // Map to actual database schema fields from UserProfile
  const requiredFields = [
    'fitnessGoals',          // String[] - exists in schema
    'activityLevel',         // String - maps to fitnessLevel
    'equipmentAvailability', // String - maps to availableEquipment  
    'preferredWorkoutDuration', // String - exists in schema
    'height'                 // Float - basic profile completion
  ];
  
  let completedFields = 0;
  
  requiredFields.forEach(field => {
    const value = user[field];
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value) && value.length > 0) {
        completedFields++;
      } else if (!Array.isArray(value)) {
        completedFields++;
      }
    }
  });
  
  logger.workout.debug('Profile completeness check', {
    user: user,
    requiredFields,
    completedFields,
    percentage: (completedFields / requiredFields.length) * 100
  });
  
  return (completedFields / requiredFields.length) * 100;
}

// Helper function to get today's workout from active plan
function getTodaysWorkout(activePlan: any) {
  if (!activePlan?.weeks || activePlan.weeks.length === 0) return null;
  
  // Simple logic: find first incomplete workout in current week
  const currentWeek = activePlan.weeks[0]; // Start with first week
  if (!currentWeek?.days) return null;
  
  const todaysDay = currentWeek.days.find((day: any) => {
    return day.exercises && day.exercises.length > 0 && !day.isCompleted;
  });
  
  if (!todaysDay) return null;
  
  // Convert day format to workout format for tracker
  const todaysWorkout = {
    id: todaysDay.id || `week-${currentWeek.weekNumber}-day-${todaysDay.dayNumber}`,
    name: todaysDay.name || `Day ${todaysDay.dayNumber} Workout`,
    description: todaysDay.description || 'Workout session',
    type: 'strength' as const,
    difficulty: activePlan.difficulty || 'beginner',
    duration: todaysDay.duration || 45,
    exercises: todaysDay.exercises,
    targetMuscleGroups: todaysDay.targetMuscleGroups || activePlan.targetMuscleGroups || [],
    equipment: [...new Set(todaysDay.exercises?.flatMap((ex: any) => 
      ex.exercise?.equipment || ex.equipment || []
    ) || [])],
    caloriesBurned: todaysDay.caloriesBurned || 200,
    dayNumber: todaysDay.dayNumber,
    weekNumber: currentWeek.weekNumber
  };
  
  logger.workout.debug('Today\'s workout prepared', todaysWorkout);
  return todaysWorkout;
}

// Helper function to convert weeks[] structure to workouts[] for backend
function convertWeeksToWorkouts(plan: any) {
  if (plan.workouts) {
    // Already in workouts format
    return plan;
  }
  
  if (plan.weeks) {
    // Convert weeks[] to workouts[]
    const workouts = plan.weeks.flatMap((week: any) => 
      week.days?.filter((day: any) => day.exercises && day.exercises.length > 0)
        .map((day: any) => ({
          id: day.id || `week-${week.weekNumber}-day-${day.dayNumber}`,
          name: day.name || `Week ${week.weekNumber}, Day ${day.dayNumber}`,
          description: day.description || 'Workout session',
          type: 'strength',
          difficulty: plan.difficulty || 'beginner',
          duration: 45,
          exercises: day.exercises,
          targetMuscleGroups: plan.targetMuscleGroups || [],
          equipment: [...new Set(day.exercises.flatMap((ex: any) => 
            ex.exercise?.equipment || ex.equipment || []
          ))],
          caloriesBurned: 200,
          createdAt: new Date(),
          updatedAt: new Date()
        })) || []
    );
    
    return {
      ...plan,
      workouts,
      // Remove weeks to avoid confusion
      weeks: undefined
    };
  }
  
  return plan;
}

// Smart workout generation using existing profile data with workoutService
async function generateWorkoutFromProfile(user: any, selectedGoal: string, createIntelligentWorkoutPlan: any, saveWorkoutPlan: any, animateTabTransition: any, setGenerationProgress?: (progress: number) => void) {
  let comprehensivePlan = null;
  
  try {
    if (!user) throw new Error('User not found');
    
    // Reset progress
    if (setGenerationProgress) setGenerationProgress(0);
    
    // Create comprehensive user profile for workoutService
    const userProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      fitnessGoals: user.fitnessGoals || [selectedGoal],
      activityLevel: user.activityLevel || 'beginner',
      equipmentAvailability: user.equipmentAvailability || 'bodyweight',
      preferredWorkoutDuration: user.preferredWorkoutDuration || '45',
      height: user.height,
      weight: user.weight,
      age: user.age,
      injuryHistory: user.injuryHistory,
      healthConditions: user.healthConditions
    };
    
    logger.workout.info('Generating comprehensive workout with profile data', {
      user: userProfile,
      selectedGoal
    });
    
    // Real progress tracking - no artificial delays
    if (setGenerationProgress) {
      setGenerationProgress(20);
      logger.workout.debug('Analyzing fitness profile');
    }
    
    // Use workoutService.generateComprehensiveWorkoutPlan for intelligent features
    if (setGenerationProgress) setGenerationProgress(50);
    comprehensivePlan = await workoutService.generateComprehensiveWorkoutPlan(userProfile);
    
    if (setGenerationProgress) {
      setGenerationProgress(85);
      logger.workout.debug('Finalizing workout plan');
    }
    
    // The plan already includes intelligent features (injury prevention, progressive overload, etc.)
    logger.workout.info('Generated comprehensive plan', comprehensivePlan);
    
    // Save the plan with weeks[] structure preserved
    logger.workout.debug('Saving comprehensive plan with weeks[] structure', comprehensivePlan);
    await saveWorkoutPlan(comprehensivePlan);
    
    if (setGenerationProgress) {
      setGenerationProgress(100);
      logger.workout.info('Workout plan generation completed');
    }
    
    // Activate the plan and navigate
    // Note: saveWorkoutPlan already sets the plan as active via setActivePlan
    logger.workout.info('Transitioning to current workout view');
    
    // Ensure loading state is cleared before transition
    if (setGenerationProgress) {
      setGenerationProgress(0);
    }
    
    // Wait longer for React state updates to propagate before tab transition
    setTimeout(() => {
      animateTabTransition('current');
      logger.workout.info('Tab transition completed - activePlan should be set');
    }, 300); // Increased delay to ensure state propagation
    
    return comprehensivePlan;
    
  } catch (error) {
    logger.workout.error('Error in generateWorkoutFromProfile', error);
    
    // Reset progress on error
    if (setGenerationProgress) {
      setGenerationProgress(0);
    }
    
    // Re-throw to let caller handle
    throw error;
    
  } finally {
    // Ensure progress is cleared even if there's an error
    logger.workout.debug('Workout generation process completed');
  }
}

const defaultPlans: DefaultPlan[] = [
  {
    key: 'lose-weight',
    title: 'Lose Weight',
    description: 'A balanced program focused on fat loss, cardio, and full-body strength.',
    weeks: 3,
    details: [
      'Push-ups, Squats, Planks',
      'Burpees, Mountain Climbers',
      'Progressive intensity tracking',
      'Calorie burn optimization',
    ],
  },
  {
    key: 'build-muscle',
    title: 'Build Muscle',
    description: 'A hypertrophy-focused split for muscle growth and strength.',
    weeks: 3,
    details: [
      'Push-ups, Pull-ups, Dips',
      'Squats, Lunges, Deadlifts',
      'Progressive rep increases',
      'Muscle group rotation',
    ],
  },
  {
    key: 'increase-endurance',
    title: 'Increase Endurance',
    description: 'A program to boost cardiovascular and muscular endurance.',
    weeks: 3,
    details: [
      'Running in Place, Jumping Jacks',
      'High Knees, Butt Kicks',
      'Cardio intervals and pacing',
      'Endurance progression tracking',
    ],
  },
];

// Helper to get warm-up exercises
function getWarmUpExercises(): ComprehensiveExercise[] {
  // Create warm-up exercises from available bodyweight exercises
  return COMPREHENSIVE_EXERCISE_DATABASE.filter(ex => 
    ex.equipment.includes('bodyweight') && 
    (ex.category === 'fullbody' || ex.category === 'cardio') &&
    ex.difficulty === 'beginner'
  ).slice(0, 2); // Take 2 warm-up exercises
}

// Helper to get cool-down exercises  
function getCoolDownExercises(): ComprehensiveExercise[] {
  // For cool-down, we'll use core and bodyweight exercises
  return COMPREHENSIVE_EXERCISE_DATABASE.filter(ex => 
    ex.equipment.includes('bodyweight') && 
    ex.category === 'core' &&
    ex.difficulty === 'beginner'
  ).slice(0, 2); // Take 2 cool-down exercises
}

// Helper to get real exercises from the comprehensive database
function getExercisesForGoal(goal: string, count: number = 4): ComprehensiveExercise[] {
  const goalExerciseMap = {
    'lose-weight': ['cardio', 'fullbody', 'core'],
    'build-muscle': ['push', 'pull', 'legs'],
    'increase-endurance': ['cardio', 'fullbody', 'legs']
  };
  
  const categories = goalExerciseMap[goal as keyof typeof goalExerciseMap] || ['fullbody'];
  const exercises = COMPREHENSIVE_EXERCISE_DATABASE.filter(ex => 
    categories.includes(ex.category) && ex.difficulty === 'beginner'
  );
  
  // Return a mix of exercises, ensuring variety
  const selected: ComprehensiveExercise[] = [];
  for (const category of categories) {
    const categoryExercises = exercises.filter(ex => ex.category === category);
    if (categoryExercises.length > 0) {
      selected.push(categoryExercises[0]); // Take first from each category
    }
  }
  
  // Fill remaining slots with random exercises
  while (selected.length < count && exercises.length > selected.length) {
    const remaining = exercises.filter(ex => !selected.includes(ex));
    if (remaining.length > 0) {
      selected.push(remaining[Math.floor(Math.random() * remaining.length)]);
    } else {
      break;
    }
  }
  
  return selected.slice(0, count);
}

// Helper to create intelligent workout plan using the IntelligentWorkoutService
async function createIntelligentWorkoutPlan(plan: DefaultPlan, user: any): Promise<AIGeneratedPlan> {
  const now = new Date();
  
  // Map plan goals to user profile
  const userGoals = [plan.key];
  const userProfile = {
    fitnessLevel: 'beginner',
    goals: userGoals,
    availableEquipment: ['bodyweight'],
    injuryHistory: [],
    experienceLevel: 'beginner'
  };

  // Get real exercises from comprehensive database for base workout
  const mainExercises = getExercisesForGoal(plan.key, 4);
  
  // Create base workout structure
  const baseWorkout = {
    id: `${plan.key}-base`,
    name: plan.title,
    description: plan.description,
    duration: 45,
    exercises: mainExercises.map((exercise) => ({
      exercise: {
        id: exercise.id,
        name: exercise.name,
        description: exercise.description,
        muscleGroups: exercise.muscleGroups,
        equipment: exercise.equipment,
        difficulty: exercise.difficulty,
        instructions: exercise.instructions,
        videoUrl: exercise.videoUrl || '',
        imageUrl: exercise.imageUrl || ''
      },
      sets: 3,
      reps: 10,
      restTime: 60,
      notes: exercise.formCues?.[0] || 'Focus on proper form'
    }))
  };

  // Apply injury prevention adaptations
  const injuryAdaptation = await workoutService.adaptForInjuryPrevention(
    baseWorkout,
    userProfile,
    userProfile.injuryHistory
  );

  // Generate 3-week progressive structure
  const weeks = [];
  for (let weekNum = 1; weekNum <= 3; weekNum++) {
    const progressionLevel = weekNum * 2; // Scale 2, 4, 6 for progressive difficulty
    
    const progressiveWorkout = await workoutService.generateProgressiveWorkout(
      injuryAdaptation.adaptedWorkout,
      progressionLevel,
      userGoals
    );

    // Create week structure with 3 workout days
    const weekDays = [];
    for (let dayNum = 1; dayNum <= 7; dayNum++) {
      if ([1, 3, 5].includes(dayNum)) { // Mon, Wed, Fri
        const dayWorkout = JSON.parse(JSON.stringify(progressiveWorkout));
        dayWorkout.name = `${plan.title} - Week ${weekNum}, Day ${Math.ceil(dayNum/2)}`;
        
        // Add warm-up exercises
        const warmUpExercises = getWarmUpExercises();
        const coolDownExercises = getCoolDownExercises();
        
        weekDays.push({
          dayNumber: dayNum,
          name: dayWorkout.name,
          description: `${plan.title} workout - Week ${weekNum} progression`,
          exercises: [
            // Warm-up phase
            ...warmUpExercises.map((exercise) => ({
              exercise: {
                id: exercise.id,
                name: exercise.name,
                description: `Warm-up: ${exercise.description}`,
                muscleGroups: exercise.muscleGroups,
                equipment: exercise.equipment,
                difficulty: exercise.difficulty,
                instructions: exercise.instructions,
                videoUrl: exercise.videoUrl || '',
                imageUrl: exercise.imageUrl || ''
              },
              sets: 1,
              reps: 8,
              restTime: 30,
              notes: 'Light warm-up movement'
            })),
            // Main workout
            ...dayWorkout.exercises,
            // Cool-down phase  
            ...coolDownExercises.map((exercise) => ({
              exercise: {
                id: exercise.id,
                name: exercise.name,
                description: `Cool-down: ${exercise.description}`,
                muscleGroups: exercise.muscleGroups,
                equipment: exercise.equipment,
                difficulty: exercise.difficulty,
                instructions: exercise.instructions,
                videoUrl: exercise.videoUrl || '',
                imageUrl: exercise.imageUrl || ''
              },
              sets: 1,
              reps: 12,
              restTime: 20,
              notes: 'Gentle recovery movement'
            }))
          ]
        });
      } else {
        // Rest days
        weekDays.push({
          dayNumber: dayNum,
          name: `Rest Day`,
          description: 'Recovery and light activity',
          exercises: []
        });
      }
    }

    weeks.push({
      weekNumber: weekNum,
      days: weekDays
    });
  }

  return {
    id: `intelligent-${plan.key}-${Date.now()}`,
    name: `AI-Powered ${plan.title}`,
    description: `Intelligent ${plan.description} with progressive overload and injury prevention`,
    duration: 3,
    weeks: weeks,
    targetMuscleGroups: mainExercises.flatMap(ex => ex.muscleGroups),
    difficulty: 'beginner',
    createdAt: now,
    updatedAt: now
  };
}

// Helper to convert default plan to valid WorkoutPlan (fallback)
function defaultPlanToWorkoutPlan(plan: DefaultPlan): AIGeneratedPlan {
  const now = new Date();
  // Infer muscle groups from title
  let targetMuscleGroups: string[] = [];
  if (plan.key === 'lose-weight') targetMuscleGroups = ['fullBody', 'cardio'];
  if (plan.key === 'build-muscle') targetMuscleGroups = ['upper', 'lower', 'fullBody'];
  if (plan.key === 'increase-endurance') targetMuscleGroups = ['cardio', 'legs', 'core'];
  // Get real exercises from the comprehensive database
  const mainExercises = getExercisesForGoal(plan.key, 4);
  const warmUpExercises = getWarmUpExercises();
  const coolDownExercises = getCoolDownExercises();
  
  // Create workouts for the 3-week program (3 different workouts)
  const workouts: Workout[] = Array.from({ length: 3 }, (_, i) => {
    // Rotate main exercises for variety across different days
    const dayMainExercises = mainExercises.slice((i * 2) % mainExercises.length).concat(
      mainExercises.slice(0, (i * 2) % mainExercises.length)
    ).slice(0, 3);
    
    // Create complete workout with phases
    const allExercises = [
      // WARM-UP PHASE
      ...warmUpExercises.map((exercise) => ({
        exercise: {
          id: exercise.id,
          name: exercise.name,
          description: `Warm-up - ${exercise.description}`,
          muscleGroups: exercise.muscleGroups,
          equipment: exercise.equipment,
          difficulty: exercise.difficulty,
          instructions: exercise.instructions,
          videoUrl: exercise.videoUrl || '',
          imageUrl: exercise.imageUrl || ''
        },
        sets: 1,
        reps: 10,
        restTime: 30,
        notes: '🔥 Warm-up: Light movement to prepare'
      })),
      
      // MAIN WORKOUT PHASE  
      ...dayMainExercises.map((exercise) => ({
        exercise: {
          id: exercise.id,
          name: exercise.name,
          description: exercise.description,
          muscleGroups: exercise.muscleGroups,
          equipment: exercise.equipment,
          difficulty: exercise.difficulty,
          instructions: exercise.instructions,
          videoUrl: exercise.videoUrl || '',
          imageUrl: exercise.imageUrl || ''
        },
        sets: exercise.category === 'cardio' ? 1 : 3,
        reps: exercise.category === 'cardio' ? 30 : (10 + i * 2), // Progressive overload
        restTime: exercise.category === 'cardio' ? 30 : 60,
        notes: exercise.formCues?.[0] || '💪 Main: Focus on proper form'
      })),
      
      // COOL-DOWN PHASE
      ...coolDownExercises.map((exercise) => ({
        exercise: {
          id: exercise.id,
          name: exercise.name,
          description: `Cool-down - ${exercise.description}`,
          muscleGroups: exercise.muscleGroups,
          equipment: exercise.equipment,
          difficulty: exercise.difficulty,
          instructions: exercise.instructions,
          videoUrl: exercise.videoUrl || '',
          imageUrl: exercise.imageUrl || ''
        },
        sets: 1,
        reps: 15,
        restTime: 20,
        notes: '🧘 Cool-down: Gentle recovery movement'
      }))
    ];
    
    return {
      id: `${plan.key}-workout-${i+1}`,
      name: `${plan.title} - Day ${i+1}`,
      description: `${plan.title} focused workout with warm-up, main exercises, and cool-down`,
      type: plan.key === 'increase-endurance' ? 'cardio' as const : 'strength' as const,
      difficulty: 'beginner' as const,
      duration: 45,
      exercises: allExercises,
      targetMuscleGroups: targetMuscleGroups as any,
      equipment: [...new Set(allExercises.flatMap(ex => ex.exercise.equipment))] as any,
      caloriesBurned: 200 + (i * 50), // Progressive calorie burn
      createdAt: now,
      updatedAt: now
    };
  });
  return {
    id: `${plan.key}-${Date.now()}`,
    name: plan.title,
    description: plan.description,
    duration: plan.weeks,
    workouts: workouts,
    targetMuscleGroups,
    difficulty: 'beginner',
    createdAt: now,
    updatedAt: now
  };
}

const WorkoutPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('today')
  const { currentWorkout, activePlan, setActivePlan, setTrackingWorkout, getTodaysWorkout, completeWorkout, saveWorkoutPlan } = useWorkout()
  const { user } = useAuth()
  const [selectedDefault, setSelectedDefault] = useState<string | null>(null);
  const [customizingPlan, setCustomizingPlan] = useState<AIGeneratedPlan | null>(null);
  const [showStreamlinedGenerator, setShowStreamlinedGenerator] = useState(false);
  const [showInlineWorkout, setShowInlineWorkout] = useState(false);
  const [aiLoading, setAILoading] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);
  const [freeGenerationsRemaining, setFreeGenerationsRemaining] = useState<number>(0);
  const [freeDaysRemaining, setFreeDaysRemaining] = useState<number>(0);
  const [currentPlanViewMode, setCurrentPlanViewMode] = useState<'timeline' | 'weekly'>('timeline');
  const [canUseFreeGeneration, setCanUseFreeGeneration] = useState<boolean>(false);
  const [showProfileIncompleteModal, setShowProfileIncompleteModal] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [pendingGoalSelection, setPendingGoalSelection] = useState<string | null>(null);
  const [profileCompleteness, setProfileCompleteness] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // TanStack Query hooks
  const { data: workoutPlans = [], isLoading: plansLoading, error: plansError } = useWorkoutPlans()
  const saveWorkoutPlanMutation = useSaveWorkoutPlan()
  const deleteWorkoutPlanMutation = useDeleteWorkoutPlan()
  const completeWorkoutPlanMutation = useCompleteWorkoutPlan()

  const tabs: { id: Tab; label: string; description: string }[] = [
    { id: 'today', label: 'Today', description: 'Current workout & progress' },
    { id: 'plan', label: 'Plan', description: 'Browse & generate workouts' },
    { id: 'progress', label: 'Progress', description: 'History & analytics' }
  ]

  // Enhanced GSAP animation for tab transitions with cleanup
  const animateTabTransition = (newTab: Tab) => {
    if (contentRef.current) {
      // Kill any existing animations to prevent conflicts
      gsap.killTweensOf(contentRef.current);
      
      gsap.to(contentRef.current, {
        opacity: 0,
        duration: 0.15,
        ease: "power2.out",
        onComplete: () => {
          setActiveTab(newTab)
          // Ensure element still exists before animating back
          if (contentRef.current) {
            gsap.to(contentRef.current, {
              opacity: 1,
              duration: 0.15,
              ease: "power2.in"
            })
          }
        }
      })
    } else {
      setActiveTab(newTab)
    }
  }
  
  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      if (contentRef.current) {
        gsap.killTweensOf(contentRef.current);
      }
    };
  }, []);

  // Set activePlan from workoutPlans when they load
  useEffect(() => {
    if (workoutPlans.length > 0 && !activePlan) {
      const activeWorkoutPlan = workoutPlans.find(p => !p.completed);
      if (activeWorkoutPlan) {
        console.log('Setting active plan from workoutPlans:', activeWorkoutPlan);
        setActivePlan(activeWorkoutPlan);
      }
    }
  }, [workoutPlans, activePlan, setActivePlan]);

  useEffect(() => {
    // Load free trial status for free tier users
    if ((user as any)?.tier === 'free' && user?.parqCompleted && !isTestUser(user?.email)) {
      canGenerateFreeWorkout(user).then(result => {
        setCanUseFreeGeneration(result.canGenerate);
        setFreeGenerationsRemaining(result.remaining);
        setFreeDaysRemaining(result.daysRemaining);
      });
    }
  }, [user?.tier, user?.parqCompleted, user?.email]);

  // Real-time profile completeness tracking
  useEffect(() => {
    if (user) {
      const completeness = calculateProfileCompleteness(user);
      setProfileCompleteness(completeness);
      console.log('Profile completeness updated:', completeness, '%');
    }
  }, [user]);

  // Handle return from profile completion with pending goal
  useEffect(() => {
    // Check for navigation state from profile completion
    const goalFromProfile = location.state?.goal;
    const profileCompleted = location.state?.profileCompleted;
    const autoGenerate = location.state?.autoGenerate;
    
    if (goalFromProfile && profileCompleted === true && autoGenerate === true) {
      console.log('Returning from profile completion with goal:', goalFromProfile);
      setPendingGoalSelection(goalFromProfile);
      
      // Clear state by replacing with clean navigation
      navigate('/workouts', { replace: true, state: null });
      
      // Wait a moment for user state to update, then auto-generate
      setTimeout(() => {
        handleAutoGenerateAfterProfile(goalFromProfile);
      }, 1000); // Slightly longer delay to ensure user context updates
    }
  }, [location.state, navigate]);

  // Auto-generate workout after profile completion
  const handleAutoGenerateAfterProfile = async (goal: string) => {
    const currentCompleteness = calculateProfileCompleteness(user);
    console.log('Auto-generating after profile completion. Completeness:', currentCompleteness);
    
    if (currentCompleteness >= 80) {
      toast.success(`Profile completed! Generating your ${goal.replace('-', ' ')} workout...`);
      try {
        setAILoading(true);
        setGenerationProgress(0);
        setSelectedDefault(goal);
        
        await generateWorkoutFromProfile(
          user, 
          goal, 
          createIntelligentWorkoutPlan, 
          saveWorkoutPlan, 
          animateTabTransition,
          setGenerationProgress
        );
        
        toast.success('🧠 Your AI-optimized workout is ready! Injury prevention & progressive overload applied.');
        setSelectedDefault(null);
        setPendingGoalSelection(null);
      } catch (error) {
        console.error('Error generating workout after profile completion:', error);
        toast.error('Failed to generate workout. Please try again.');
      } finally {
        setAILoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isProfileComplete(user)) {
      navigate('/profile', { state: { from: location.pathname } });
    }
  }, [user, navigate, location]);

  const handleSelectDefault = async (key: string) => {
    // Prevent double clicks and race conditions
    if (aiLoading || selectedDefault === key) {
      return;
    }
    
    // Use real-time profile completeness state
    console.log('Goal selected:', key, 'Profile completeness:', profileCompleteness);
    
    if (profileCompleteness >= 80) {
      // Complete profile: Nike Training Club style - immediate generation
      try {
        setAILoading(true);
        setAIError(null); // Clear any previous errors
        setGenerationProgress(0); // Reset progress
        setSelectedDefault(key); // Set for loading state display
        
        const motivationalMessage = getMotivationalMessage(key);
        toast.loading(motivationalMessage, { id: 'workout-generation' });
        
        await generateWorkoutFromProfile(
          user, 
          key, 
          createIntelligentWorkoutPlan, 
          saveWorkoutPlan, 
          animateTabTransition,
          setGenerationProgress
        );
        
        toast.success('🧠 Your AI-optimized workout is ready! Injury prevention & progressive overload applied.', { id: 'workout-generation' });
        
        // Clear selection since we've generated the plan
        setSelectedDefault(null);
        
      } catch (error: any) {
        console.error('Error generating comprehensive workout:', error);
        
        // Enhanced error handling
        let errorMessage = 'Failed to generate workout. Please try again.';
        if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.response?.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        }
        
        setAIError(errorMessage);
        toast.error(errorMessage, { id: 'workout-generation', duration: 6000 });
        setSelectedDefault(null);
      } finally {
        setAILoading(false);
      }
    } else {
      // Incomplete profile: Save goal selection and redirect to profile completion
      console.log('Profile incomplete, redirecting to profile with goal:', key);
      setPendingGoalSelection(key);
      setSelectedDefault(key);
      setShowProfileIncompleteModal(true);
    }
  };

  // Get intelligent messaging based on goal
  const getMotivationalMessage = (goal: string): string => {
    const messages = {
      'build-muscle': '🧠 FitArchitect AI analyzing your muscle-building profile...',
      'lose-weight': '🔥 Applying intelligent fat-burning protocols...',
      'increase-endurance': '⚡ Optimizing your endurance training with AI...'
    };
    return messages[goal as keyof typeof messages] || '🚀 FitArchitect AI crafting your personalized workout...';
  };

  // Nike Training Club Style Loading Component
  const NikeStyleLoadingIndicator = ({ goal, progress }: { goal: string, progress: number }) => {
    const goalData = {
      'build-muscle': {
        emoji: '🧠',
        title: 'FitArchitect AI: Muscle Building',
        color: 'from-red-600 to-orange-600',
        message: 'Generating your personalized muscle-building plan...'
      },
      'lose-weight': {
        emoji: '🧠',
        title: 'FitArchitect AI: Fat Burning',
        color: 'from-orange-600 to-yellow-600',
        message: 'Creating your optimized fat-burning workout...'
      },
      'increase-endurance': {
        emoji: '🧠',
        title: 'FitArchitect AI: Endurance Training',
        color: 'from-blue-600 to-cyan-600',
        message: 'Designing your endurance improvement program...'
      }
    };

    const data = goalData[goal as keyof typeof goalData] || goalData['build-muscle'];

    // No fake intervals - progress is controlled by real generation progress

    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className={`bg-gradient-to-r ${data.color} rounded-3xl p-12 text-center max-w-lg w-full mx-4 shadow-2xl`}>
          {/* Goal Icon */}
          <div className="text-8xl mb-6 animate-pulse">
            {data.emoji}
          </div>
          
          {/* Title */}
          <h2 className="text-3xl font-bold text-white mb-8">
            {data.title}
          </h2>
          
          {/* Progress Circle */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-white/20"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-white"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${progress}, 100`}
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="text-2xl font-bold">{Math.round(progress)}%</div>
              </div>
            </div>
          </div>
          
          {/* Simple Message */}
          <div className="bg-white/20 rounded-lg p-4 mb-6">
            <p className="text-white text-lg font-semibold">
              {data.message}
            </p>
          </div>
          
          {/* Premium Positioning Text */}
          <div className="text-center">
            <p className="text-white/90 text-sm mb-2">
              Our AI is working with advanced algorithms to create your perfect workout
            </p>
            <p className="text-white/70 text-xs">
              ✨ Powered by FitArchitect's proprietary fitness intelligence engine
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Profile Incomplete Modal
  const ProfileIncompleteModal = () => {
    const missingFields = getMissingProfileFields(user);
    
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-700">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Complete Your Profile</h3>
            <p className="text-gray-400">We need a few more details to create your perfect workout</p>
          </div>
          
          <div className="space-y-3 mb-6">
            <h4 className="text-white font-semibold">Missing Information:</h4>
            {missingFields.map((field, index) => (
              <div key={index} className="flex items-center gap-3 text-gray-300">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>{field}</span>
              </div>
            ))}
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => {
                setShowProfileIncompleteModal(false);
                // Navigate to profile with goal parameter for seamless return flow
                navigate('/profile', { 
                  state: { 
                    from: location.pathname,
                    pendingGoal: pendingGoalSelection,
                    returnTo: 'workouts'
                  } 
                });
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Complete Profile & Generate Workout
            </button>
            <button
              onClick={() => {
                setShowProfileIncompleteModal(false);
                setSelectedDefault(null);
                setPendingGoalSelection(null);
              }}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Get missing profile fields
  const getMissingProfileFields = (user: any): string[] => {
    const fields = [
      { key: 'fitnessGoals', label: 'Fitness Goals' },
      { key: 'activityLevel', label: 'Activity Level' },
      { key: 'equipmentAvailability', label: 'Available Equipment' },
      { key: 'preferredWorkoutDuration', label: 'Workout Duration' },
      { key: 'height', label: 'Height' }
    ];
    
    return fields
      .filter(field => !user?.[field.key] || (Array.isArray(user[field.key]) && user[field.key].length === 0))
      .map(field => field.label);
  };

  const handleStartDefault = async () => {
    if (!selectedPlan) return;
    
    try {
      setAILoading(true);
      // Use intelligent workout service to create AI-powered plan
      const intelligentPlan = await createIntelligentWorkoutPlan(selectedPlan, user);
      
      // 🎯 HICK'S LAW FIX: Auto-save for complete profiles (skip customization)
      const profileCompleteness = calculateProfileCompleteness(user);
      if (profileCompleteness >= 80) {
        console.log('🚀 Profile complete (', profileCompleteness, '%) - Auto-saving pre-selected plan');
        toast.success('🎉 Workout plan generated and activated!');
        
        // Auto-save and activate the plan immediately
        console.log('Saving plan with weeks[] structure:', intelligentPlan);
        await saveWorkoutPlan({ ...intelligentPlan, weeks: intelligentPlan.weeks || [] } as import('../contexts/WorkoutContext').AIGeneratedPlan);
        setSelectedDefault(null);
        animateTabTransition('current');
      } else {
        console.log('📝 Profile incomplete (', profileCompleteness, '%) - Showing customization');
        setCustomizingPlan(intelligentPlan);
      }
    } catch (error) {
      console.error('Error creating intelligent workout plan:', error);
      // Fallback to basic plan
      const fallbackPlan = defaultPlanToWorkoutPlan(selectedPlan);
      
      // Apply same profile logic to fallback
      const profileCompleteness = calculateProfileCompleteness(user);
      if (profileCompleteness >= 80) {
        console.log('🚀 Profile complete - Auto-saving fallback plan');
        toast.success('🎉 Workout plan activated!');
        
        console.log('Saving fallback plan with weeks[] structure:', fallbackPlan);
        await saveWorkoutPlan({ ...fallbackPlan, weeks: fallbackPlan.weeks || [] } as import('../contexts/WorkoutContext').AIGeneratedPlan);
        setSelectedDefault(null);
        animateTabTransition('current');
      } else {
        setCustomizingPlan(fallbackPlan);
        toast.error('Using basic plan - AI features temporarily unavailable');
      }
    } finally {
      setAILoading(false);
    }
  };

  const handleSaveCustomizedPlan = async (plan: AIGeneratedPlan) => {
    try {
      console.log('Saving customized plan with weeks[] structure:', plan);
      await saveWorkoutPlan({ ...plan, weeks: plan.weeks || [] } as import('../contexts/WorkoutContext').AIGeneratedPlan);
      setCustomizingPlan(null);
      setSelectedDefault(null);
      animateTabTransition('current');
    } catch (error) {
      // Error handling is done in the mutation
      console.error('Error saving customized plan:', error);
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

  const handleStreamlinedGenerate = async (params: any) => {
    setAILoading(true);
    setAIError(null);
    setGenerationProgress(0);
    
    // Enhanced timeout with better error handling
    const timeoutId = setTimeout(() => {
      console.error('Workout generation timeout after 45 seconds');
      setAILoading(false);
      setGenerationProgress(0);
      setAIError('Workout generation is taking longer than expected. Please check your internet connection and try again.');
      setShowStreamlinedGenerator(false);
      toast.error('Generation timeout. Please check your connection and try again.', {
        duration: 6000
      });
    }, 45000); // Increased to 45 seconds for better reliability
    
    try {
      // Provide immediate feedback
      toast.loading('Generating your personalized workout plan...', { id: 'workout-generation' });
      
      // 🔧 DEPLOYMENT FIX: Use same data structure as pre-selected plans
      // Create a DefaultPlan-like object from StreamlinedWorkoutGenerator params
      const defaultPlanFromParams: DefaultPlan = {
        key: params.fitnessGoal,
        title: `AI ${params.fitnessGoal.charAt(0).toUpperCase() + params.fitnessGoal.slice(1)} Plan`,
        description: `Personalized ${params.fitnessGoal} workout plan tailored to your preferences`,
        weeks: 3,
        details: [
          `${params.workoutDays}x/week schedule`,
          `${params.timePerWorkout} minute sessions`,
          `${params.experienceLevel} level progression`,
          `Equipment: ${params.equipment.join(', ')}`
        ]
      };

      // ✨ USE SAME INTELLIGENT WORKFLOW AS PRE-SELECTED PLANS
      // This ensures weeks[] structure that WeeklyProgramView expects
      console.log('🚀 Generating intelligent workout with weeks[] structure...');
      
      // Use the same generation function with progress tracking
      await generateWorkoutFromProfile(
        user,
        params.fitnessGoal,
        createIntelligentWorkoutPlan,
        saveWorkoutPlan,
        animateTabTransition,
        setGenerationProgress
      );
      
      console.log('✅ Workout generation completed successfully');
      toast.success('🎉 Workout plan generated and activated!', { id: 'workout-generation' });
      setShowStreamlinedGenerator(false);
      
      // Auto-transition to current plan
      setTimeout(() => {
        animateTabTransition('today');
      }, 500);
      
      // Log final state for debugging
      console.log('Final state check:', {
        activeTab,
        activePlan: !!activePlan,
        workoutPlansCount: workoutPlans?.length || 0
      });
      
    } catch (err: any) {
      console.error('Error generating intelligent workout:', err);
      
      // Enhanced error messaging based on error type
      let errorMessage = 'Could not generate workout plan. Please try again later.';
      if (err.name === 'NetworkError' || err.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Authentication expired. Please refresh the page and login again.';
      }
      
      setAIError(errorMessage);
      setShowStreamlinedGenerator(false);
      toast.error(errorMessage, { id: 'workout-generation', duration: 6000 });
      
    } finally {
      // Clear timeout and reset state
      clearTimeout(timeoutId);
      setAILoading(false);
      setGenerationProgress(0);
    }
  };

  // Allow test user to always generate AI workouts
  const canGenerateAI = isTestUser(user?.email) ? true : user?.parqCompleted;
  
  const handleGenerateAIClick = async () => {
    // Add immediate visual feedback
    setAILoading(true);
    setError(null);
    
    try {
      // Clear any existing error states
      setAIError(null);
      
      // Provide immediate user feedback
      toast.loading('Checking your access...', { id: 'generation-check' });
      
      if (!canGenerateAI && !isTestUser(user?.email)) {
        toast.error('Please complete the PAR-Q health assessment to unlock AI workout generation.', {
          id: 'generation-check',
          duration: 5000
        });
        return;
      }
      
      // For free users who completed PAR-Q, check if they have trial time left
      if ((user as any)?.tier === 'free' && !isTestUser(user?.email)) {
        toast.loading('Verifying your free trial status...', { id: 'generation-check' });
        
        try {
          const freeCheck = await canGenerateFreeWorkout(user);
          if (!freeCheck.canGenerate) {
            toast.error('Your 3-day free trial has expired. Upgrade to Basic plan for unlimited workout generation!', {
              id: 'generation-check',
              duration: 6000
            });
            navigate('/pricing');
            return;
          }
          setFreeGenerationsRemaining(freeCheck.remaining);
          setFreeDaysRemaining(freeCheck.daysRemaining);
          
          toast.success(`${freeCheck.remaining} free generations remaining!`, {
            id: 'generation-check',
            duration: 2000
          });
        } catch (trialError) {
          console.error('Error checking free trial status:', trialError);
          toast.error('Unable to verify trial status. Please try again or contact support.', {
            id: 'generation-check',
            duration: 5000
          });
          return;
        }
      } else {
        toast.dismiss('generation-check');
      }
      
      // Success: Show the generator
      setShowStreamlinedGenerator(true);
      
    } catch (error) {
      console.error('Error in handleGenerateAIClick:', error);
      toast.error('Something went wrong. Please try again.', {
        id: 'generation-check',
        duration: 4000
      });
      setAIError('Failed to initialize workout generation. Please refresh and try again.');
    } finally {
      setAILoading(false);
    }
  };


  const handleStartWorkoutTracker = (workout: any) => {
    setTrackingWorkout(workout);
    animateTabTransition('tracker');
  };

  // Handler for inline workout from WeeklyProgramView
  const handleStartInlineWorkout = (workout: any) => {
    console.log('🎯 Starting inline workout from WeeklyProgramView with:', workout);
    setTrackingWorkout(workout);
    setShowInlineWorkout(true);
  };


  // Inline workout session handlers
  const handleStartFreeleticsSession = (workout: any) => {
    console.log('🎯 Starting inline workout session with:', workout);
    console.log('Workout structure:', {
      id: workout?.id,
      name: workout?.name,
      exercises: workout?.exercises?.length,
      firstExercise: workout?.exercises?.[0]
    });
    
    // Ensure workout has required structure
    if (!workout || !workout.exercises || workout.exercises.length === 0) {
      console.error('❌ Invalid workout structure:', workout);
      toast.error('Unable to start workout - invalid workout data');
      return;
    }
    
    // Set the tracking workout and show inline workout (no tab switching)
    setTrackingWorkout(workout);
    setShowInlineWorkout(true);
    
    // Log state after setting
    console.log('✅ Inline workout session started:', {
      workoutSet: !!workout,
      showInlineWorkout: true
    });
  };

  // Function to exit inline workout and return to current plan view
  const handleExitInlineWorkout = () => {
    setShowInlineWorkout(false);
    setTrackingWorkout(null);
    console.log('✅ Exited inline workout, returning to current plan view');
  };



  // AUTOMATIC PLATEAU DETECTION (Background Intelligence)
  const checkForPlateauAndAdapt = async (planId: string) => {
    if (!user) return;
    
    try {
      // Plateau detection now runs automatically via unified workoutService
      const plateauAnalysis = await workoutService.detectPlateauAndRecommendChanges(user.id);
      
      if (plateauAnalysis.plateauDetected) {
        // Show intelligent insights proactively
        toast((t) => (
          <div className="max-w-md">
            <p className="font-semibold text-blue-600 mb-2">
              🧠 Smart Adaptation - {plateauAnalysis.plateauType} plateau detected
            </p>
            <p className="text-sm text-gray-600 mb-3">
              We've automatically adjusted your routine: {plateauAnalysis.recommendations.slice(0, 2).join(', ')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Modifications are already applied automatically
                  console.log('✅ Auto-applied workout modifications:', plateauAnalysis.workoutModifications);
                  toast.dismiss(t.id);
                  toast.success('🚀 Your workout has been intelligently adapted!');
                }}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                ✅ Applied Automatically
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
              >
                Got It
              </button>
            </div>
          </div>
        ), { duration: 8000 });
      } else {
        // Show positive feedback for good progress
        toast.success('💪 Great progress! Your routine is optimally challenging.');
      }
    } catch (error) {
      console.log('Auto-plateau detection running in background');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'plan':
        if (customizingPlan) {
          // Plans now use standardized weeks structure - no conversion needed
          const isValidPlan = customizingPlan && typeof customizingPlan === 'object' && customizingPlan.id;
          if (!isValidPlan) {
            return (
              <div className="bg-gray-900 border border-red-700 rounded-xl shadow-lg p-8 mb-8 text-center">
                <h2 className="text-2xl font-bold mb-4 text-red-400">Error</h2>
                <div className="text-gray-300 text-lg">Failed to generate a valid workout plan. Please try again or adjust your inputs.</div>
                <button className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" onClick={() => setCustomizingPlan(null)}>Back</button>
              </div>
            );
          }
          
          // Debug the plan structure
          logger.workout.debug('Customizing plan data', customizingPlan);
          return <WorkoutPlanCustomizer plan={customizingPlan as any} onSave={handleSaveCustomizedPlan} onCancel={() => setCustomizingPlan(null)} />;
        }
        return (
          <>
            <div className="mb-8">
              <button
                className={`w-full md:w-auto ${aiLoading 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600'
                } text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 font-semibold text-lg`}
                onClick={handleGenerateAIClick}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <>
                    <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Checking Access...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate AI-Powered Workout Plan
                    <span className="bg-white/20 px-2 py-1 rounded-lg text-sm font-normal">Personalized</span>
                  </>
                )}
              </button>
              <p className="text-gray-400 text-sm mt-2 text-center md:text-left">
                Get a workout plan tailored specifically to your goals, experience level, and available equipment
              </p>
              {aiError && (
                <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{aiError}</p>
                </div>
              )}
            </div>
            {!canGenerateAI && !isTestUser(user?.email) && (
              <div className="mb-4 text-yellow-600 font-semibold bg-yellow-900/20 border border-yellow-600 rounded p-3">
                Complete the PAR-Q health assessment to unlock your 3-day free workout generation trial.
              </div>
            )}
            {canGenerateAI && (user as any)?.tier === 'free' && !isTestUser(user?.email) && freeDaysRemaining > 0 && (
              <div className="mb-4 text-blue-600 font-semibold bg-blue-900/20 border border-blue-600 rounded p-3">
                🎉 Free Trial: {freeDaysRemaining} days remaining for unlimited AI workout generation!
              </div>
            )}
            {canGenerateAI && (user as any)?.tier === 'free' && !isTestUser(user?.email) && freeDaysRemaining === 0 && (
              <div className="mb-4 text-red-600 font-semibold bg-red-900/20 border border-red-600 rounded p-3">
                Your 3-day free trial has expired. <a href="/pricing" className="underline">Upgrade to Basic</a> for unlimited workout generation.
              </div>
            )}
            {showStreamlinedGenerator && (
              <StreamlinedWorkoutGenerator
                onGenerate={handleStreamlinedGenerate}
                onClose={() => setShowStreamlinedGenerator(false)}
                workoutHistory={workoutPlans}
              />
            )}
            <h2 className="text-2xl font-bold mb-2 mt-8">Choose Your Goal</h2>
            <p className="text-gray-400 mb-8">Select your fitness goal for AI-powered workout generation with injury prevention & progressive overload</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {defaultPlans.map((plan) => {
                const goalEmojis = {
                  'build-muscle': '💪',
                  'lose-weight': '🔥',
                  'increase-endurance': '⚡'
                };
                const goalColors = {
                  'build-muscle': 'from-red-600 to-orange-600',
                  'lose-weight': 'from-orange-600 to-yellow-600',
                  'increase-endurance': 'from-blue-600 to-cyan-600'
                };
                
                return (
                  <motion.div
                    key={plan.key}
                    whileHover={aiLoading ? {} : { scale: 1.03 }}
                    whileTap={aiLoading ? {} : { scale: 0.98 }}
                    className={`relative overflow-hidden transition-all duration-300 rounded-xl shadow-lg border-2 group
                      ${aiLoading 
                        ? 'cursor-not-allowed opacity-60' 
                        : 'cursor-pointer hover:border-gray-600 hover:bg-gray-800'
                      }
                      ${selectedDefault === plan.key && aiLoading
                        ? 'border-blue-500 bg-gradient-to-br ' + goalColors[plan.key as keyof typeof goalColors]
                        : selectedDefault === plan.key
                        ? 'border-white bg-gradient-to-br ' + goalColors[plan.key as keyof typeof goalColors]
                        : 'border-gray-700 bg-gray-900'}`}
                    onClick={() => !aiLoading && handleSelectDefault(plan.key)}
                    tabIndex={aiLoading ? -1 : 0}
                    aria-label={`Select ${plan.title} plan`}
                    aria-disabled={aiLoading}
                  >
                    {/* Goal Icon */}
                    <div className="text-center p-6">
                      <div className="text-5xl mb-4">
                        {goalEmojis[plan.key as keyof typeof goalEmojis]}
                      </div>
                      
                      {/* Title */}
                      <h3 className="text-xl font-bold mb-3 text-white flex items-center justify-center gap-2">
                        {plan.title}
                        {selectedDefault === plan.key && aiLoading && (
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                      </h3>
                      
                      {/* Description */}
                      <p className="text-gray-300 mb-4 text-sm leading-relaxed">{plan.description}</p>
                      
                      {/* Features */}
                      <div className="space-y-2 mb-4">
                        {plan.details.slice(0, 2).map((detail, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                            <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                        <span className="text-xs text-gray-500">{plan.weeks} weeks</span>
                        {profileCompleteness >= 80 ? (
                          <span className="text-xs text-green-400 font-semibold flex items-center gap-1">
                            🧠 AI Ready
                          </span>
                        ) : (
                          <span className="text-xs text-orange-400 font-semibold flex items-center gap-1">
                            📝 Profile Setup
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Hover overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${goalColors[plan.key as keyof typeof goalColors]} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                  </motion.div>
                );
              })}
            </div>
            
            {/* Nike Training Club Style Loading */}
            {aiLoading && generationProgress > 0 && (
              <NikeStyleLoadingIndicator 
                goal={selectedDefault || 'build-muscle'}
                progress={generationProgress}
              />
            )}
            
            {/* Profile completion indicator for complete profiles */}
            {profileCompleteness >= 80 && !aiLoading && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-green-400 font-semibold">FitArchitect AI Ready</h3>
                    <p className="text-green-300 text-sm">Your profile is optimized for intelligent workout generation with injury prevention & progressive overload</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Saved Workout Plans */}
            <WorkoutPlans 
              workoutPlans={workoutPlans}
              onDelete={handleDeletePlan}
              onMarkComplete={handleMarkComplete}
            />
          </>
        );
        break;
      
      case 'today':
        // Premium UI for Current Plan - Nike Training Club Style
        if (activePlan && (activePlan.weeks || activePlan.workouts)) {
          console.log('Current Plan tab - Active plan found:', activePlan);
          const todaysWorkout = getTodaysWorkout(activePlan);
          
          // Show inline workout if activated
          if (showInlineWorkout) {
            return (
              <div>
                {/* Back to Plan Button */}
                <div className="mb-6">
                  <button
                    onClick={handleExitInlineWorkout}
                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Plan
                  </button>
                </div>
                
                {/* Inline WorkoutTracker */}
                <WorkoutTracker />
              </div>
            );
          }
          
          return (
            <div>
              {/* Vertical Stack Layout - All Screen Sizes */}
              <div className="space-y-8 lg:space-y-12">
                {/* Today's Workout Hero Section - Full Width */}
                {todaysWorkout && (
                  <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-100 text-sm font-semibold uppercase tracking-wide">Today's Workout</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {todaysWorkout.name || `Today's Workout`}
                    </h2>
                    <p className="text-green-100 mb-4">
                      {todaysWorkout.exercises?.length || 0} exercises • Est. 45 min
                    </p>
                    
                    {/* Start Workout Button - Full Width at Bottom */}
                    <button
                      onClick={() => handleStartFreeleticsSession(todaysWorkout)}
                      className="w-full bg-white text-green-600 hover:bg-green-50 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 min-h-[56px]"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      START WORKOUT
                    </button>
                  </div>
                )}

                {/* AI Generated Workout Plan - Full Width */}
                <div className="bg-gradient-to-r from-purple-900 to-blue-900 rounded-xl p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div>
                      <h2 className="text-xl lg:text-2xl font-bold text-white mb-2">
                        🧠 {activePlan.name}
                      </h2>
                      <p className="text-purple-200 text-sm lg:text-base">
                        AI-powered with adaptive progression
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Program Timeline - Full Width with Enhanced Container */}
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl lg:text-2xl font-bold text-white mb-2">
                          Program Timeline
                        </h3>
                        <p className="text-gray-400">
                          Track your 3-week progression and workout schedule
                        </p>
                      </div>
                      
                      {/* View Toggle */}
                      <div className="bg-white/10 rounded-lg p-1 flex">
                        <button
                          onClick={() => setCurrentPlanViewMode('timeline')}
                          className={`px-2 py-2 sm:px-4 sm:py-3 md:px-3 md:py-1 rounded-md text-xs sm:text-base md:text-sm font-medium transition-colors min-h-[44px] sm:min-h-[48px] md:min-h-[44px] flex items-center justify-center ${
                            currentPlanViewMode === 'timeline'
                              ? 'bg-white text-gray-900'
                              : 'text-white hover:bg-white/10'
                          }`}
                        >
                          Timeline
                        </button>
                        <button
                          onClick={() => setCurrentPlanViewMode('weekly')}
                          className={`px-2 py-2 sm:px-4 sm:py-3 md:px-3 md:py-1 rounded-md text-xs sm:text-base md:text-sm font-medium transition-colors min-h-[44px] sm:min-h-[48px] md:min-h-[44px] flex items-center justify-center ${
                            currentPlanViewMode === 'weekly'
                              ? 'bg-white text-gray-900'
                              : 'text-white hover:bg-white/10'
                          }`}
                        >
                          Weekly
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Conditional View Based on Mode */}
                  {currentPlanViewMode === 'timeline' ? (
                    <ProgramTimeline 
                      activePlan={activePlan}
                      onWorkoutSelect={(workout, weekIndex, dayIndex) => {
                        console.log('Selected workout from timeline:', workout, 'Week:', weekIndex, 'Day:', dayIndex);
                        handleStartInlineWorkout(workout);
                      }}
                    />
                  ) : (
                    <WeeklyProgramView 
                      activePlan={activePlan}
                      onStartWorkout={handleStartInlineWorkout}
                      onStartSession={handleStartInlineWorkout}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        } else {
          // Fallback: no active plan
          console.log('Current Plan tab - No active plan found. Active plan:', activePlan);
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
                  No active workout plan found. Generate an AI-powered plan or choose from our curated workouts to see your program here.
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
        }
        break;
        
      case 'progress':
        return (
          <div className="space-y-8">
            {/* Progress Overview */}
            <div className="bg-gradient-to-r from-purple-900 to-blue-900 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-2">Your Progress</h2>
              <p className="text-purple-200">Track your fitness journey with detailed analytics and workout history</p>
            </div>
            
            {/* Combined Analytics and History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white">Analytics</h3>
                <WorkoutAnalytics />
              </div>
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white">Recent Workouts</h3>
                <WorkoutHistory />
              </div>
            </div>
          </div>
          );
        break;
        
      default:
        return null;
    }
  }

  return (
    <>
      <div className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto bg-black rounded-lg border border-gray-800 p-8">
          <h1 className="text-3xl font-bold mb-2">Workouts</h1>
          <p className="text-gray-400 mb-8">Track your fitness journey and achieve your goals</p>
          {/* Tabs */}
          <div className="flex gap-2 mb-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`px-3 py-2 sm:px-6 sm:py-3 md:px-4 md:py-2 rounded font-semibold transition-colors focus:outline-none min-h-[44px] sm:min-h-[48px] md:min-h-[44px] flex items-center justify-center text-sm sm:text-base md:text-sm ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
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



      {/* Profile Incomplete Modal */}
      {showProfileIncompleteModal && <ProfileIncompleteModal />}
      
      {/* Exercise Service Diagnostic */}
      <ExerciseServiceDiagnostic />
    </>
  )
}

export default WorkoutPage