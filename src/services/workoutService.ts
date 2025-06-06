import { WorkoutPlan, Workout, WorkoutExercise, WorkoutLog } from '../types/workout'
import { UserProfile } from '../types/user'
import { wgerService } from './wgerService'
import { openaiService } from './openaiService'
import { Exercise } from '../types/workout'
import { mapWgerExerciseToCanonical } from './wgerService'

export class WorkoutService {
  private static instance: WorkoutService
  private currentPlan: WorkoutPlan | null = null
  private workoutLogs: WorkoutLog[] = []
  private planCache: Map<string, WorkoutPlan> = new Map()

  private constructor() {
    // Load saved data from localStorage
    const savedPlan = localStorage.getItem('currentWorkoutPlan')
    const savedLogs = localStorage.getItem('workoutLogs')
    const savedCache = localStorage.getItem('workoutPlanCache')
    
    if (savedPlan) {
      this.currentPlan = JSON.parse(savedPlan)
    }
    if (savedLogs) {
      this.workoutLogs = JSON.parse(savedLogs)
    }
    if (savedCache) {
      this.planCache = new Map(JSON.parse(savedCache))
    }
  }

  static getInstance(): WorkoutService {
    if (!WorkoutService.instance) {
      WorkoutService.instance = new WorkoutService()
    }
    return WorkoutService.instance
  }

  async generateComprehensiveWorkoutPlan(userProfile: any): Promise<WorkoutPlan> {
    try {
      // Step 1: Generate the base workout plan with OpenAI
      const workoutPlan = await openaiService.generateWorkoutPlan(userProfile, [])
      
      // Step 2: Try to enrich with wger, but continue even if it fails
      let enrichedPlan
      try {
        enrichedPlan = await this.enrichWorkoutPlanWithWgerData(workoutPlan, userProfile)
      } catch (wgerError) {
        console.error('wger API error, continuing with OpenAI only:', wgerError)
        enrichedPlan = workoutPlan
      }
      
      // Step 3: Fill in missing information with OpenAI
      const completePlan = await this.fillMissingInformation(enrichedPlan)
      // Enforce 3-week progression
      const finalPlan = this.enforceThreeWeekProgression(completePlan)
      return finalPlan
    } catch (error) {
      console.error('Critical error generating workout plan:', error)
      throw error
    }
  }

  private async enrichWorkoutPlanWithWgerData(workoutPlan: any, userProfile: any): Promise<any> {
    // Process each workout in the plan
    for (const week of workoutPlan.weeks) {
      for (const day of week.days) {
        for (const exerciseIndex in day.exercises) {
          const exercise = day.exercises[exerciseIndex]
          try {
            // Fetch all exercises and filter by name
            const wgerExercises = await wgerService.fetchExercises({
              muscles: [],
              equipment: userProfile && userProfile.availableEquipment ? userProfile.availableEquipment : []
            })
            const wgerExercise = wgerExercises.find((ex) => ex.name.toLowerCase() === exercise.name.toLowerCase())
            if (wgerExercise) {
              // Map WGER Exercise to canonical Exercise type
              const canonicalExercise = mapWgerExerciseToCanonical(wgerExercise);
              day.exercises[exerciseIndex] = {
                ...exercise,
                ...canonicalExercise
              }
            }
            // If no match is found, leave the exercise as is for now
          } catch (error) {
            console.error(`Error enriching exercise ${exercise.name}:`, error)
            // Continue with the next exercise
          }
        }
      }
    }
    return workoutPlan
  }

  private async fillMissingInformation(workoutPlan: any): Promise<any> {
    // Collect all exercises that need supplemental information
    const exercisesNeedingInfo = []
    const exerciseIndices: Record<string, number> = {} // To track positions for updating later
    
    // First pass: collect all exercises needing AI descriptions
    for (const weekIndex in workoutPlan.weeks) {
      for (const dayIndex in workoutPlan.weeks[weekIndex].days) {
        for (const exerciseIndex in workoutPlan.weeks[weekIndex].days[dayIndex].exercises) {
          const exercise = workoutPlan.weeks[weekIndex].days[dayIndex].exercises[exerciseIndex]
          
          // Only collect exercises that are missing descriptions
          if (!exercise.description || exercise.description.trim() === '') {
            const muscleGroup = this.determineMuscleGroup(exercise)
            exercisesNeedingInfo.push({
              name: exercise.name,
              muscleGroup,
              type: 'description'
            })
            
            // Store the position for updating later
            const position = `${weekIndex}-${dayIndex}-${exerciseIndex}-description`
            exerciseIndices[position] = exercisesNeedingInfo.length - 1
          }
          
          // Check if we need form descriptions (no images)
          if (!exercise.images || exercise.images.length === 0) {
            exercisesNeedingInfo.push({
              name: exercise.name,
              muscleGroup: this.determineMuscleGroup(exercise),
              type: 'form'
            })
            
            // Store the position for updating later
            const position = `${weekIndex}-${dayIndex}-${exerciseIndex}-form`
            exerciseIndices[position] = exercisesNeedingInfo.length - 1
          }
        }
      }
    }
    
    // If we have exercises needing info, batch process them
    if (exercisesNeedingInfo.length > 0) {
      // Process in batches to minimize API calls - max 10 exercises per batch
      const batchSize = 10
      const results = []
      
      for (let i = 0; i < exercisesNeedingInfo.length; i += batchSize) {
        const batch = exercisesNeedingInfo.slice(i, i + batchSize)
        
        try {
          // Make a single API call for the batch
          const batchResults = await this.processBatchExerciseInfo(batch)
          results.push(...batchResults)
        } catch (error) {
          console.error('Error processing batch exercise info:', error)
          // Fill with placeholder for this batch
          const placeholders = Array(batch.length).fill("Information not available")
          results.push(...placeholders)
        }
      }
      
      // Second pass: update the workout plan with the results
      for (const weekIndex in workoutPlan.weeks) {
        for (const dayIndex in workoutPlan.weeks[weekIndex].days) {
          for (const exerciseIndex in workoutPlan.weeks[weekIndex].days[dayIndex].exercises) {
            const exercise = workoutPlan.weeks[weekIndex].days[dayIndex].exercises[exerciseIndex]
            
            // Update description if needed
            const descPosition = `${weekIndex}-${dayIndex}-${exerciseIndex}-description`
            if (descPosition in exerciseIndices) {
              const resultIndex = exerciseIndices[descPosition]
              workoutPlan.weeks[weekIndex].days[dayIndex].exercises[exerciseIndex] = {
                ...exercise,
                description: results[resultIndex] || "Description unavailable",
                source: 'openai'
              }
            }
            
            // Update form description if needed
            const formPosition = `${weekIndex}-${dayIndex}-${exerciseIndex}-form`
            if (formPosition in exerciseIndices) {
              const resultIndex = exerciseIndices[formPosition]
              workoutPlan.weeks[weekIndex].days[dayIndex].exercises[exerciseIndex] = {
                ...workoutPlan.weeks[weekIndex].days[dayIndex].exercises[exerciseIndex],
                formVisualDescription: results[resultIndex] || "Form description unavailable"
              }
            }
          }
        }
      }
    }
    
    return workoutPlan
  }

  private async processBatchExerciseInfo(exercises: any[]): Promise<string[]> {
    // Use openaiService.supplementExerciseInfo for each exercise in the batch
    try {
      const results: string[] = []
      for (const ex of exercises) {
        const info = await openaiService.supplementExerciseInfo(ex.name, ex.muscleGroup)
        results.push(info)
      }
      return results
    } catch (error) {
      console.error('Error in batch processing exercise info:', error)
      throw error
    }
  }

  private determineMuscleGroup(exercise: Exercise): string {
    // Logic to determine the primary muscle group targeted
    if (exercise.muscleGroups && exercise.muscleGroups.length > 0) {
      return exercise.muscleGroups[0]
    }
    // Simple keyword matching as fallback
    const name = exercise.name.toLowerCase()
    if (name.includes('chest') || name.includes('bench') || name.includes('pec')) return 'chest'
    if (name.includes('shoulder') || name.includes('press') || name.includes('delt')) return 'shoulders'
    if (name.includes('back') || name.includes('row') || name.includes('pull')) return 'back'
    if (name.includes('leg') || name.includes('squat') || name.includes('lunge')) return 'legs'
    if (name.includes('bicep') || name.includes('curl')) return 'biceps'
    if (name.includes('tricep') || name.includes('extension')) return 'triceps'
    if (name.includes('abs') || name.includes('core') || name.includes('crunch')) return 'core'
    return 'fullBody'
  }

  async generateWorkoutPlan(userProfile: UserProfile): Promise<WorkoutPlan> {
    // Check cache first
    const cacheKey = this.generateCacheKey(userProfile)
    const cachedPlan = this.planCache.get(cacheKey)
    if (cachedPlan) {
      return cachedPlan
    }

    try {
      // Step 1: Fetch exercises from WGER
      const wgerExercises = await wgerService.fetchExercises({
        muscles: [],
        equipment: userProfile && userProfile.availableEquipment ? userProfile.availableEquipment : []
      })
      // Map WGER exercises to canonical Exercise objects
      const exercises: Exercise[] = wgerExercises.map(mapWgerExerciseToCanonical)
      // Map canonical UserProfile to OpenAI UserProfile
      const allowedGoals = ['strength', 'weight-loss', 'endurance'] as const;
      type FitnessGoal = typeof allowedGoals[number];
      const fitnessGoal: FitnessGoal = (userProfile.goals && allowedGoals.includes(userProfile.goals[0] as FitnessGoal) ? userProfile.goals[0] : 'strength') as FitnessGoal;
      const openaiUserProfile = {
        fitnessGoal,
        experienceLevel: userProfile.fitnessLevel,
        targetMuscles: userProfile.goals || [],
        equipment: userProfile.availableEquipment || [],
        workoutDays: userProfile.daysPerWeek,
        timePerWorkout: userProfile.preferredWorkoutDuration
      }
      // Map canonical Exercise[] to OpenAI Exercise[]
      const openaiExercises = exercises.map(e => ({
        id: Number(e.id),
        name: e.name,
        description: e.description,
        muscles: e.muscleGroups ? e.muscleGroups.map(m => m.toString()) : [],
        equipment: e.equipment ? e.equipment.map(eq => eq.toString()) : [],
        difficulty: e.difficulty,
        instructions: e.instructions,
        videoUrl: e.videoUrl,
        imageUrl: e.imageUrl
      }))
      // Step 2: Generate workout plan with GPT
      const workoutPlanText = await openaiService.generateWorkoutPlan(openaiUserProfile, openaiExercises)
      // Step 3: Parse and structure the workout plan
      const workoutPlan = this.parseWorkoutPlan(workoutPlanText, exercises)
      // Step 4: Cache the result
      this.planCache.set(cacheKey, workoutPlan)
      this.saveCache()
      // Enforce 3-week progression
      const finalPlan = this.enforceThreeWeekProgression(workoutPlan)
      return finalPlan
    } catch (error) {
      console.error('Error generating workout plan:', error)
      return this.getFallbackWorkoutPlan()
    }
  }

  private generateCacheKey(userProfile: UserProfile): string {
    return JSON.stringify({
      goals: userProfile.goals.join(','),
      level: userProfile.fitnessLevel,
      equipment: userProfile.availableEquipment.sort(),
      days: userProfile.daysPerWeek,
      time: userProfile.preferredWorkoutDuration
    })
  }

  private parseWorkoutPlan(planText: string, exercises: Exercise[]): WorkoutPlan {
    // Implementation of parsing the GPT response into a structured workout plan
    // This is a simplified version - you might want to make this more robust
    const lines = planText.split('\n')
    const plan: WorkoutPlan = {
      id: Date.now().toString(),
      name: 'Generated Workout Plan',
      description: 'AI-generated personalized workout plan',
      duration: 3, // weeks
      workouts: [],
      targetMuscleGroups: [],
      difficulty: 'intermediate',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    let currentDay = 0
    let currentWorkout: Workout | null = null

    for (const line of lines) {
      if (line.startsWith('[') && line.includes('Day')) {
        if (currentWorkout) {
          plan.workouts.push(currentWorkout)
        }
        currentDay++
        currentWorkout = {
          id: `${plan.id}-${currentDay}`,
          name: `Day ${currentDay}`,
          description: '',
          type: 'strength',
          difficulty: 'intermediate',
          duration: 45,
          exercises: [],
          targetMuscleGroups: [],
          equipment: [],
          caloriesBurned: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      } else if (line.startsWith('-') && currentWorkout) {
        const exerciseMatch = line.match(/- (.+?) \((\d+) sets x (\d+) reps\)/)
        if (exerciseMatch) {
          const [_, name, sets, reps] = exerciseMatch
          const exercise = exercises.find(e => e.name.toLowerCase() === name.toLowerCase())
          if (exercise) {
            const canonicalExercise = {
              ...exercise,
              muscleGroups: exercise.muscleGroups || []
            }
            const workoutExercise: WorkoutExercise = {
              exercise: canonicalExercise,
              sets: parseInt(sets),
              reps: parseInt(reps),
              restTime: 60
            }
            currentWorkout.exercises.push(workoutExercise)
          }
        }
      }
    }

    if (currentWorkout) {
      plan.workouts.push(currentWorkout)
    }

    return plan
  }

  private getFallbackWorkoutPlan(): WorkoutPlan {
    // Use canonical Exercise and WorkoutExercise shapes
    const pushUps: Exercise = {
      id: 'push-ups',
      name: 'Push-ups',
      description: 'A bodyweight exercise for chest and triceps.',
      muscleGroups: ['chest', 'triceps'],
      equipment: ['bodyweight'],
      difficulty: 'beginner',
      instructions: ['Start in a plank position', 'Lower your body', 'Push back up'],
      videoUrl: '',
      imageUrl: ''
    }
    const squats: Exercise = {
      id: 'squats',
      name: 'Squats',
      description: 'A bodyweight exercise for legs.',
      muscleGroups: ['legs'],
      equipment: ['bodyweight'],
      difficulty: 'beginner',
      instructions: ['Stand with feet shoulder-width apart', 'Lower hips', 'Return to standing'],
      videoUrl: '',
      imageUrl: ''
    }
    return {
      id: 'fallback',
      name: 'Basic Full Body Workout',
      description: 'A simple full body workout for beginners',
      duration: 1,
      workouts: [
        {
          id: 'fallback-1',
          name: 'Full Body Workout',
          description: 'Basic full body workout',
          type: 'strength',
          difficulty: 'beginner',
          duration: 45,
          exercises: [
            {
              exercise: pushUps,
              sets: 3,
              reps: 10,
              restTime: 60
            },
            {
              exercise: squats,
              sets: 3,
              reps: 12,
              restTime: 60
            }
          ],
          targetMuscleGroups: ['chest', 'legs'],
          equipment: ['bodyweight'],
          caloriesBurned: 200,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      targetMuscleGroups: ['chest', 'legs'],
      difficulty: 'beginner',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  private saveCache() {
    localStorage.setItem('workoutPlanCache', JSON.stringify(Array.from(this.planCache.entries())))
  }

  getCurrentPlan(): WorkoutPlan | null {
    return this.currentPlan
  }

  endCurrentPlan(): void {
    this.currentPlan = null
    localStorage.removeItem('currentWorkoutPlan')
  }

  logWorkout(workoutId: string, exercises: WorkoutLog['exercises'], notes?: string): void {
    const log: WorkoutLog = {
      id: Date.now().toString(),    // TODO: Replace with actual user ID from auth
      userId: 'current-user', // Replace with actual user ID
      workoutId,
      date: new Date(),
      exercises,
      duration: 0, // Calculate based on exercises      
      notes,
      rating: 0,
      completed: true
    }

    this.workoutLogs.push(log)
    localStorage.setItem('workoutLogs', JSON.stringify(this.workoutLogs))
  }

  getWorkoutLogs(): WorkoutLog[] {
    return this.workoutLogs
  }

  getWorkoutTips(workoutId: string): string[] {
    // Get tips for specific workout
    const workout = this.currentPlan?.workouts.find(w => w.id === workoutId)
    if (!workout) return []

    return workout.exercises.map(exercise => {
      return `Tip for ${exercise.exercise.name}: ${exercise.notes || 'Focus on proper form and controlled movements.'}`
    })
  }

  getProgress(): {
    completedWorkouts: number
    totalWorkouts: number
    averageRating: number
    streak: number
  } {
    const completedWorkouts = this.workoutLogs.filter(log => log.completed).length
    const totalWorkouts = this.currentPlan?.workouts.length || 0
    const ratings = this.workoutLogs.map(log => log.rating).filter((r): r is number => typeof r === 'number')
    const averageRating = ratings.length > 0 ? ratings.reduce((acc, r) => acc + r, 0) / ratings.length : 0

    // Calculate streak
    let streak = 0
    const today = new Date()
    const sortedLogs = [...this.workoutLogs].sort((a, b) => b.date.getTime() - a.date.getTime())
    
    for (const log of sortedLogs) {
      const logDate = new Date(log.date)
      const daysDiff = Math.floor((today.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff === streak) {
        streak++
      } else {
        break
      }
    }

    return {
      completedWorkouts,
      totalWorkouts,
      averageRating,
      streak
    }
  }

  // Utility to enforce 3-week progressive overload
  private enforceThreeWeekProgression(plan: any) {
    if (!plan.weeks || !Array.isArray(plan.weeks)) return plan;
    // If fewer than 3 weeks, repeat and increment
    while (plan.weeks.length < 3) {
      const lastWeek = plan.weeks[plan.weeks.length - 1];
      // Deep clone and increment sets/reps for progressive overload
      const newWeek = JSON.parse(JSON.stringify(lastWeek));
      newWeek.weekNumber = plan.weeks.length + 1;
      newWeek.days = newWeek.days.map((day: any) => ({
        ...day,
        exercises: day.exercises.map((ex: any) => ({
          ...ex,
          sets: (ex.sets || 3) + 1,
          reps: (ex.reps || 10) + 2,
        })),
      }));
      plan.weeks.push(newWeek);
    }
    // If more than 3 weeks, trim
    if (plan.weeks.length > 3) {
      plan.weeks = plan.weeks.slice(0, 3);
    }
    // Optionally, increment sets/reps for week 2 and 3 if not already
    for (let i = 1; i < 3; i++) {
      plan.weeks[i].days = plan.weeks[i].days.map((day: any) => ({
        ...day,
        exercises: day.exercises.map((ex: any) => ({
          ...ex,
          sets: (ex.sets || 3) + i,
          reps: (ex.reps || 10) + i * 2,
        })),
      }));
    }
    return plan;
  }
}

export const workoutService = WorkoutService.getInstance();

// Add a generic retry wrapper for API calls
export async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries - 1) await new Promise(res => setTimeout(res, delay * (i + 1)));
    }
  }
  throw lastError;
}

// Wrap the main workout generation function with retry logic
export async function generateWorkoutPlanWithRetry(userProfile: any, exercises: any[]) {
  console.log('[WorkoutGen] generateWorkoutPlanWithRetry called', { userProfile, exercises });
  return retry(() => openaiService.generateWorkoutPlan(userProfile, exercises), 3, 1000);
}

// Diagnostic function to test all requirements for workout generation
export async function diagnoseWorkoutGeneration(user: any, userProfile: any) {
  const results: any = {};
  // 1. Check environment variables
  results.openaiApiKey = !!import.meta.env.VITE_OPENAI_API_KEY;
  results.wgerApiKey = !!import.meta.env.VITE_WGER_API_KEY;
  results.wgerApiToken = !!import.meta.env.VITE_WGER_API_TOKEN;
  results.wgerApiUrl = !!import.meta.env.VITE_WGER_API_URL;

  // 2. Check user authentication
  results.isAuthenticated = !!user?.id;
  results.email = user?.email;

  // 3. Check PAR-Q completion
  results.parqCompleted = user?.parqCompleted || userProfile?.parqCompleted;

  // 4. Check profile completeness
  results.profileComplete = !!userProfile && !!userProfile.fitnessLevel && !!userProfile.goals && userProfile.goals.length > 0 && !!userProfile.availableEquipment && userProfile.availableEquipment.length > 0 && !!userProfile.daysPerWeek && !!userProfile.preferredWorkoutDuration;

  // 5. Test WGER API fetch
  try {
    const exercises = await wgerService.fetchExercises({ muscles: [], equipment: userProfile?.availableEquipment || [] });
    results.wgerFetch = exercises && exercises.length > 0;
  } catch (e) {
    results.wgerFetch = false;
    results.wgerFetchError = e;
  }

  // 6. Test OpenAI API call (dry run)
  try {
    const dummyExercises = [{
      id: 'push-ups',
      name: 'Push-ups',
      description: 'A bodyweight exercise for chest and triceps.',
      muscleGroups: ['chest'],
      muscles: ['chest'],
      equipment: ['bodyweight'],
      difficulty: 'beginner',
      instructions: ['Start in a plank position', 'Lower your body', 'Push back up'],
      videoUrl: '',
      imageUrl: ''
    }];
    await openaiService.generateWorkoutPlan({
      fitnessGoal: 'strength',
      experienceLevel: 'beginner',
      targetMuscles: ['chest'],
      equipment: ['bodyweight'],
      workoutDays: 3,
      timePerWorkout: 30
    }, dummyExercises);
    results.openaiCall = true;
  } catch (e) {
    results.openaiCall = false;
    results.openaiCallError = e;
  }

  // 7. Return diagnostic report
  console.log('[WorkoutGen] Diagnostic results:', results);
  return results;
} 