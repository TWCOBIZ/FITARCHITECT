import { WorkoutPlan, Workout, WorkoutExercise, WorkoutLog } from '../types/workout'
import { UserProfile } from '../types/user'
import { wgerService } from './wgerService'
import { api } from './api'
import { Exercise } from '../types/workout'
import { logger } from '../utils/logger'
import { WorkoutDurationService } from './workoutDurationService'
import { WorkoutTemplateService } from './workoutTemplateService'

// Intelligent workout interfaces (from intelligentWorkoutService)
interface UserFeedback {
  workoutId: string
  completionRate: number // 0-100%
  difficultyRating: number // 1-5
  timeToComplete: number // minutes
  injuryReports?: string[]
  equipmentIssues?: string[]
  notes?: string
  rating?: number
}

interface PerformanceMetrics {
  strengthProgress: number[]
  completionRates: number[]
  difficultyRatings: number[]
  timeToCompletion: number[]
  consistencyScore: number
}

interface AdaptationResult {
  adaptedWorkout: any
  adaptationReasons: string[]
  progressionNotes: string[]
  difficultyAdjustment: number
  timeAdjustment: number
}

export class WorkoutService {
  private static instance: WorkoutService
  private currentPlan: WorkoutPlan | null = null
  private workoutLogs: WorkoutLog[] = []
  private planCache: Map<string, WorkoutPlan> = new Map()
  
  // Intelligent workout features
  private userFeedbackHistory: Map<string, UserFeedback[]> = new Map()
  private performanceCache: Map<string, PerformanceMetrics> = new Map()
  private autoIntelligenceEnabled: boolean = true

  private constructor() {
    logger.workout.info('Initializing WorkoutService');
    
    // Verify storage integrity before loading
    if (!this.verifyStorageIntegrity()) {
      logger.workout.warn('Storage integrity issues detected, repairing');
      this.repairStorage();
    }
    
    try {
      // Load saved data from localStorage with enhanced error handling
      this.loadFromLocalStorage();
      
      // Initialize performance monitoring
      this.initializePerformanceMonitoring();
      
      logger.workout.info('WorkoutService initialized successfully', {
        hasPlan: !!this.currentPlan,
        cacheSize: this.planCache.size,
        logsCount: this.workoutLogs.length
      });
      
    } catch (error) {
      logger.workout.error('Failed to initialize WorkoutService', error);
      this.repairStorage(); // Emergency repair
    }
  }

  private loadFromLocalStorage(): void {
    try {
      // Load current workout plan with metadata support
      const savedPlan = localStorage.getItem('currentWorkoutPlan');
      if (savedPlan) {
        const planData = JSON.parse(savedPlan);
        // Handle both old format (direct plan) and new format (with metadata)
        this.currentPlan = planData.plan || planData;
        
        if (planData.savedAt) {
          logger.workout.debug(`Loaded plan saved at: ${planData.savedAt}`);
        }
      }
      
      // Load workout logs
      const savedLogs = localStorage.getItem('workoutLogs');
      if (savedLogs) {
        this.workoutLogs = JSON.parse(savedLogs);
      }
      
      // Load cache with enhanced format support
      const savedCache = localStorage.getItem('workoutPlanCache');
      if (savedCache) {
        const cacheData = JSON.parse(savedCache);
        // Handle both old format (array) and new format (with metadata)
        const entries = cacheData.entries || cacheData;
        this.planCache = new Map(entries);
        
        if (cacheData.savedAt) {
          logger.workout.debug(`Loaded cache with ${this.planCache.size} entries, saved at: ${cacheData.savedAt}`);
        }
      }
      
    } catch (error) {
      logger.workout.error('Error loading from localStorage', error);
      throw error;
    }
  }

  private initializePerformanceMonitoring(): void {
    try {
      // Set up performance tracking
      this.setupAPIPerformanceTracking();
      
      // Initialize error reporting
      this.setupErrorReporting();
      
      logger.workout.debug('Performance monitoring initialized');
    } catch (error) {
      logger.workout.warn('Failed to initialize performance monitoring', error);
    }
  }

  private setupAPIPerformanceTracking(): void {
    // Track API call performance for debugging
    if (typeof window !== 'undefined') {
      (window as any).workoutServicePerformance = {
        apiCalls: [],
        addCall: (operation: string, duration: number, success: boolean) => {
          const calls = (window as any).workoutServicePerformance.apiCalls;
          calls.push({
            operation,
            duration,
            success,
            timestamp: new Date().toISOString()
          });
          
          // Keep only last 100 calls
          if (calls.length > 100) {
            calls.splice(0, calls.length - 100);
          }
        },
        getStats: () => {
          const calls = (window as any).workoutServicePerformance.apiCalls;
          return {
            totalCalls: calls.length,
            successRate: calls.filter((c: any) => c.success).length / calls.length,
            averageDuration: calls.reduce((sum: number, c: any) => sum + c.duration, 0) / calls.length,
            recentCalls: calls.slice(-10)
          };
        }
      };
    }
  }

  private setupErrorReporting(): void {
    // Set up centralized error reporting for production debugging
    if (typeof window !== 'undefined') {
      (window as any).workoutServiceErrors = {
        errors: [],
        addError: (operation: string, error: any, context: any = {}) => {
          const errorData = {
            operation,
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name
            },
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          };
          
          const errors = (window as any).workoutServiceErrors.errors;
          errors.push(errorData);
          
          // Keep only last 50 errors
          if (errors.length > 50) {
            errors.splice(0, errors.length - 50);
          }
          
          // Log to console for development
          logger.workout.error('WorkoutService Error', errorData);
        },
        getErrors: () => (window as any).workoutServiceErrors.errors,
        clearErrors: () => {
          (window as any).workoutServiceErrors.errors = [];
        }
      };
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
      // Step 1: Generate the base workout plan via API
      const response = await api.post('/api/workout-plans/generate', { userProfile })
      const workoutPlan = response.data
      
      // Step 2: Try to enrich with wger, but continue even if it fails
      let enrichedPlan
      try {
        enrichedPlan = await this.enrichWorkoutPlanWithWgerData(workoutPlan)
      } catch (wgerError) {
        logger.workout.warn('WGER API error, continuing with OpenAI only', wgerError)
        enrichedPlan = workoutPlan
      }
      
      // Step 3: Fill in missing information with OpenAI
      const completePlan = await this.fillMissingInformation(enrichedPlan, userProfile.experienceLevel || userProfile.fitnessLevel)
      
      // Step 4: Validate and enhance exercise variety
      const varietyEnhancedPlan = this.validateAndEnhanceExerciseVariety(completePlan)
      
      // Step 5: AUTOMATIC INTELLIGENT ADAPTATIONS (NEW)
      let intelligentPlan = varietyEnhancedPlan
      if (this.autoIntelligenceEnabled) {
        intelligentPlan = await this.autoApplyIntelligentAdaptations(varietyEnhancedPlan, userProfile)
      }
      
      // Step 6: Enforce standardized 3-phase workout structure
      const structuredPlan = this.enforceThreePhaseWorkoutStructure(intelligentPlan)
      
      // Step 7: Enforce 3-week progression with intelligent progression
      const finalPlan = this.enforceThreeWeekProgression(structuredPlan)
      
      // Step 8: Save to localStorage and sync with context
      await this.saveWorkoutPlanAndSync(finalPlan)
      
      return finalPlan
    } catch (error) {
      logger.workout.error('Critical error generating workout plan', error)
      
      // Report error to centralized system
      this.reportError('generateComprehensiveWorkoutPlan', error, { userProfile });
      
      throw error
    }
  }

  private async enrichWorkoutPlanWithWgerData(workoutPlan: any): Promise<any> {
    logger.workout.debug('Enriching workout plan with WGER exercise data');
    const startTime = Date.now();
    let enrichmentStats = { processed: 0, enriched: 0, fallback: 0, errors: 0 };
    
    try {
      // Handle both data structures: workouts array (from OpenAI) or weeks structure (legacy)
      if (workoutPlan.workouts && Array.isArray(workoutPlan.workouts)) {
        await this.enrichWorkoutsStructure(workoutPlan.workouts, enrichmentStats);
      } else if (workoutPlan.weeks && Array.isArray(workoutPlan.weeks)) {
        await this.enrichWeeksStructure(workoutPlan.weeks, enrichmentStats);
      }
      
      // Log enrichment results
      logger.workout.info('WGER enrichment completed', {
        totalTime: Date.now() - startTime,
        stats: enrichmentStats
      });
      
      return workoutPlan;
    } catch (error) {
      logger.workout.error('WGER enrichment failed', error);
      this.reportError('enrichWorkoutPlanWithWgerData', error, { 
        workoutCount: workoutPlan.workouts?.length,
        weekCount: workoutPlan.weeks?.length 
      });
      throw error;
    }
  }

  private async enrichWorkoutsStructure(workouts: any[], stats: any): Promise<void> {
    for (const workout of workouts) {
      if (workout.exercises && Array.isArray(workout.exercises)) {
        await this.enrichExercisesArray(workout.exercises, stats);
      }
    }
  }

  private async enrichWeeksStructure(weeks: any[], stats: any): Promise<void> {
    for (const week of weeks) {
      if (week.days && Array.isArray(week.days)) {
        for (const day of week.days) {
          if (day.exercises && Array.isArray(day.exercises)) {
            await this.enrichExercisesArray(day.exercises, stats);
          }
        }
      }
    }
  }

  private async enrichExercisesArray(exercises: any[], stats: any): Promise<void> {
    for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex++) {
      const workoutExercise = exercises[exerciseIndex];
      const exercise = workoutExercise.exercise || workoutExercise;
      stats.processed++;
      
      try {
        // Use retry wrapper for WGER API calls
        const wgerExercise = await retry(
          () => wgerService.searchExerciseByName(exercise.name),
          2, 500,
          `WGER search for "${exercise.name}"`
        );
        
        if (wgerExercise) {
          logger.workout.debug(`WGER match found: ${wgerExercise.name}`);
          
          // Map WGER Exercise to canonical Exercise type with validation
          const canonicalExercise = this.createCanonicalExercise(wgerExercise);
          
          // Update the exercise in the workout structure
          if (workoutExercise.exercise) {
            exercises[exerciseIndex].exercise = {
              ...workoutExercise.exercise,
              ...canonicalExercise
            };
          } else {
            exercises[exerciseIndex] = {
              ...workoutExercise,
              exercise: canonicalExercise,
              sets: workoutExercise.sets || 3,
              reps: workoutExercise.reps || 10,
              restTime: workoutExercise.restTime || 60
            };
          }
          
          stats.enriched++;
        } else {
          // Create fallback exercise structure
          exercises[exerciseIndex] = this.createFallbackExercise(exercise, workoutExercise);
          stats.fallback++;
          logger.workout.debug(`No WGER match for "${exercise.name}", using fallback`);
        }
      } catch (error) {
        logger.workout.error(`Error enriching exercise "${exercise.name}"`, error);
        
        // Provide error fallback
        exercises[exerciseIndex] = this.createErrorExercise(exercise, workoutExercise);
        stats.errors++;
      }
    }
  }

  private createCanonicalExercise(wgerExercise: any): Exercise {
    const validMuscleGroups = ['chest','back','shoulders','biceps','triceps','legs','core','fullBody'];
    const validEquipment = ['barbell','dumbbell','kettlebell','machine','cable','bodyweight','resistanceBand','medicineBall','stabilityBall','foamRoller'];
    
    return {
      id: String(wgerExercise.id),
      name: wgerExercise.name,
      description: wgerExercise.description || '',
      muscleGroups: wgerExercise.muscles ? 
        wgerExercise.muscles
          .map((m: any) => String(m))
          .filter((m: string) => validMuscleGroups.includes(m.toLowerCase())) as any 
        : ['fullBody'],
      equipment: wgerExercise.equipment ? 
        wgerExercise.equipment
          .map((e: any) => String(e))
          .filter((e: string) => validEquipment.includes(e.toLowerCase())) as any 
        : ['bodyweight'],
      difficulty: (wgerExercise.difficulty === 'beginner' || wgerExercise.difficulty === 'intermediate' || wgerExercise.difficulty === 'advanced') ? 
        wgerExercise.difficulty : 'intermediate',
      instructions: wgerExercise.instructions || [],
      imageUrl: wgerExercise.imageUrl,
      videoUrl: wgerExercise.videoUrl,
    };
  }

  private createFallbackExercise(exercise: any, workoutExercise: any): any {
    const exerciseName = exercise.name || workoutExercise.name || 'Exercise';
    
    return {
      ...exercise,
      exercise: {
        id: `fallback-${Date.now()}-${Math.random()}`,
        name: exerciseName,
        description: `${exerciseName} - Focus on proper form and controlled movement`,
        muscleGroups: exercise.muscleGroups || ['fullBody'],
        equipment: exercise.equipment || ['bodyweight'],
        difficulty: exercise.difficulty || 'beginner',
        instructions: [
          'Set up in the starting position',
          'Perform the movement with control',
          'Return to starting position',
          'Maintain proper form throughout'
        ],
        imageUrl: undefined,
        videoUrl: undefined
      },
      sets: workoutExercise.sets || 3,
      reps: workoutExercise.reps || 10,
      restTime: workoutExercise.restTime || 60
    };
  }

  private createErrorExercise(exercise: any, workoutExercise: any): any {
    const exerciseName = exercise.name || workoutExercise.name || 'Exercise';
    
    return {
      ...exercise,
      exercise: {
        id: `error-${Date.now()}-${Math.random()}`,
        name: exerciseName,
        description: `${exerciseName} - Exercise data temporarily unavailable`,
        muscleGroups: exercise.muscleGroups || ['fullBody'],
        equipment: exercise.equipment || ['bodyweight'],
        difficulty: exercise.difficulty || 'beginner',
        instructions: [
          'Set up in the starting position',
          'Perform the movement with control',
          'Return to starting position'
        ],
        imageUrl: undefined,
        videoUrl: undefined
      },
      sets: workoutExercise.sets || 3,
      reps: workoutExercise.reps || 10,
      restTime: workoutExercise.restTime || 60
    };
  }

  // Validate minimum workouts per week
  private validateMinimumWorkoutsPerWeek(workoutPlan: any): { plan: any; enhanced: boolean } {
    const MIN_WORKOUTS_PER_WEEK = 3;
    const enhancedPlan = JSON.parse(JSON.stringify(workoutPlan));
    let planWasEnhanced = false;

    try {
      logger.workout.debug('Validating minimum workouts per week', { minRequired: MIN_WORKOUTS_PER_WEEK });

      if (!enhancedPlan.weeks || !Array.isArray(enhancedPlan.weeks)) {
        logger.workout.warn('No weeks structure found for workout validation');
        return { plan: workoutPlan, enhanced: false };
      }

      enhancedPlan.weeks.forEach((week: any, weekIndex: number) => {
        if (!week.days || !Array.isArray(week.days)) {
          logger.workout.warn(`Week ${weekIndex + 1} has no days structure`);
          return;
        }

        // Count non-rest day workouts
        const workoutDays = week.days.filter((day: any) => !day.isRestDay && day.exercises && day.exercises.length > 0);
        const workoutCount = workoutDays.length;

        logger.workout.debug(`Week ${weekIndex + 1} has ${workoutCount} workout days`);

        if (workoutCount < MIN_WORKOUTS_PER_WEEK) {
          const neededWorkouts = MIN_WORKOUTS_PER_WEEK - workoutCount;
          logger.workout.info(`Week ${weekIndex + 1} needs ${neededWorkouts} additional workouts`);

          // Add additional workouts by creating variations of existing ones
          for (let i = 0; i < neededWorkouts; i++) {
            if (workoutDays.length === 0) {
              // If no workout days exist, create a basic workout
              const basicWorkout = this.createBasicWorkout(weekIndex + 1, week.days.length + 1 + i);
              week.days.push(basicWorkout);
            } else {
              // Create variation of existing workout
              const baseWorkout = workoutDays[i % workoutDays.length];
              const variationWorkout = this.createVariationWorkout(baseWorkout, weekIndex + 1, week.days.length + 1 + i);
              week.days.push(variationWorkout);
            }
            planWasEnhanced = true;
          }

          logger.workout.info(`Enhanced week ${weekIndex + 1} with ${neededWorkouts} additional workouts`);
        }
      });

      return { plan: enhancedPlan, enhanced: planWasEnhanced };

    } catch (error) {
      logger.workout.error('Error validating minimum workouts per week', error);
      return { plan: workoutPlan, enhanced: false };
    }
  }

  // Create a basic workout when no workouts exist
  private createBasicWorkout(weekNumber: number, dayNumber: number): any {
    return {
      dayNumber,
      name: `Workout Day ${dayNumber}`,
      description: `Week ${weekNumber} workout`,
      type: 'strength',
      difficulty: 'beginner',
      duration: 45,
      isRestDay: false,
      exercises: [
        {
          exercise: {
            id: 'basic-squats',
            name: 'Squats',
            description: 'Fundamental lower body exercise',
            muscleGroups: ['legs'],
            equipment: ['bodyweight'],
            difficulty: 'beginner',
            instructions: ['Stand with feet shoulder-width apart', 'Lower hips back and down', 'Return to standing position']
          },
          sets: 3,
          reps: 12,
          restTime: 60,
          notes: 'Keep your back straight and chest up'
        },
        {
          exercise: {
            id: 'basic-pushups',
            name: 'Push-ups',
            description: 'Upper body pushing exercise',
            muscleGroups: ['chest', 'triceps'],
            equipment: ['bodyweight'],
            difficulty: 'beginner',
            instructions: ['Start in plank position', 'Lower body to ground', 'Push back up to starting position']
          },
          sets: 3,
          reps: 10,
          restTime: 60,
          notes: 'Keep elbows at 45-degree angle'
        }
      ],
      targetMuscleGroups: ['legs', 'chest', 'triceps'],
      equipment: ['bodyweight']
    };
  }

  // Create a variation of an existing workout
  private createVariationWorkout(baseWorkout: any, weekNumber: number, dayNumber: number): any {
    const variation = JSON.parse(JSON.stringify(baseWorkout));
    
    // Modify the workout to make it a variation
    variation.dayNumber = dayNumber;
    variation.name = `${baseWorkout.name || 'Workout'} - Variation ${dayNumber}`;
    variation.description = `Week ${weekNumber} variation workout`;
    
    // Apply slight modifications to exercises (increase reps by 10-20%)
    if (variation.exercises && Array.isArray(variation.exercises)) {
      variation.exercises = variation.exercises.map((exercise: any) => ({
        ...exercise,
        reps: exercise.reps ? Math.ceil(exercise.reps * 1.1) : exercise.reps,
        sets: exercise.sets || 3
      }));
    }

    return variation;
  }

  // Exercise variety validation and enhancement
  private validateAndEnhanceExerciseVariety(workoutPlan: any): any {
    try {
      let planNeedsEnhancement = false;
      
      // Step 1: Validate minimum workouts per week
      const workoutValidationResult = this.validateMinimumWorkoutsPerWeek(workoutPlan);
      let validatedPlan = workoutValidationResult.plan;
      if (workoutValidationResult.enhanced) {
        planNeedsEnhancement = true;
        logger.workout.info('Plan enhanced with additional workouts to meet minimum requirement');
      }
      
      // Step 2: Analyze exercise variety
      const varietyReport = this.analyzeExerciseVariety(validatedPlan);
      
      logger.workout.debug('Exercise variety analysis', varietyReport);
      
      // Check for problematic patterns
      if (varietyReport.repetitiveExercises.length > 0) {
        logger.workout.warn('Repetitive exercises detected', varietyReport.repetitiveExercises);
        planNeedsEnhancement = true;
      }
      
      if (varietyReport.muscleGroupGaps.length > 0) {
        logger.workout.warn('Muscle group gaps detected', varietyReport.muscleGroupGaps);
        planNeedsEnhancement = true;
      }
      
      if (varietyReport.diversityScore < 0.6) {
        logger.workout.warn('Low exercise diversity score', varietyReport.diversityScore);
        planNeedsEnhancement = true;
      }
      
      // Enhance plan if needed
      if (planNeedsEnhancement) {
        return this.enhanceExerciseVariety(validatedPlan, varietyReport);
      }
      
      logger.workout.debug('Exercise variety validation passed');
      return validatedPlan;
      
    } catch (error) {
      logger.workout.error('Exercise variety validation failed', error);
      return workoutPlan; // Return original plan if validation fails
    }
  }

  private analyzeExerciseVariety(plan: any): {
    totalExercises: number;
    uniqueExercises: number;
    repetitiveExercises: string[];
    muscleGroupDistribution: Record<string, number>;
    muscleGroupGaps: string[];
    diversityScore: number;
    equipmentVariety: string[];
  } {
    const exerciseNames = new Set<string>();
    const exerciseCounts: Record<string, number> = {};
    const muscleGroupCounts: Record<string, number> = {};
    const equipmentTypes = new Set<string>();
    let totalExercises = 0;
    
    // Extract all exercises from plan
    const exercises = this.extractAllExercises(plan);
    
    for (const exercise of exercises) {
      const exerciseData = exercise.exercise || exercise;
      const name = exerciseData.name?.toLowerCase() || 'unknown';
      
      totalExercises++;
      exerciseNames.add(name);
      exerciseCounts[name] = (exerciseCounts[name] || 0) + 1;
      
      // Track muscle groups
      if (exerciseData.muscleGroups) {
        for (const muscle of exerciseData.muscleGroups) {
          muscleGroupCounts[muscle] = (muscleGroupCounts[muscle] || 0) + 1;
        }
      }
      
      // Track equipment
      if (exerciseData.equipment) {
        for (const equip of exerciseData.equipment) {
          equipmentTypes.add(equip);
        }
      }
    }
    
    // Find repetitive exercises (appearing more than 3 times)
    const repetitiveExercises = Object.entries(exerciseCounts)
      .filter(([_, count]) => count > 3)
      .map(([name, _]) => name);
    
    // Find muscle group gaps
    const expectedMuscleGroups = ['chest', 'back', 'shoulders', 'legs', 'core'];
    const muscleGroupGaps = expectedMuscleGroups.filter(
      muscle => !muscleGroupCounts[muscle] || muscleGroupCounts[muscle] < 1
    );
    
    // Calculate diversity score (0-1)
    const uniqueRatio = exerciseNames.size / Math.max(totalExercises, 1);
    const muscleGroupCoverage = (expectedMuscleGroups.length - muscleGroupGaps.length) / expectedMuscleGroups.length;
    const diversityScore = (uniqueRatio * 0.6) + (muscleGroupCoverage * 0.4);
    
    return {
      totalExercises,
      uniqueExercises: exerciseNames.size,
      repetitiveExercises,
      muscleGroupDistribution: muscleGroupCounts,
      muscleGroupGaps,
      diversityScore,
      equipmentVariety: Array.from(equipmentTypes)
    };
  }

  private extractAllExercises(plan: any): any[] {
    const exercises: any[] = [];
    
    if (plan.workouts && Array.isArray(plan.workouts)) {
      for (const workout of plan.workouts) {
        if (workout.exercises && Array.isArray(workout.exercises)) {
          exercises.push(...workout.exercises);
        }
      }
    }
    
    if (plan.weeks && Array.isArray(plan.weeks)) {
      for (const week of plan.weeks) {
        if (week.days && Array.isArray(week.days)) {
          for (const day of week.days) {
            if (day.exercises && Array.isArray(day.exercises)) {
              exercises.push(...day.exercises);
            }
          }
        }
      }
    }
    
    return exercises;
  }

  private enhanceExerciseVariety(plan: any, varietyReport: any): any {
    logger.workout.debug('Enhancing exercise variety');
    const enhancedPlan = JSON.parse(JSON.stringify(plan));
    
    // Replace repetitive exercises with alternatives
    if (varietyReport.repetitiveExercises.length > 0) {
      this.replaceRepetitiveExercises(enhancedPlan, varietyReport.repetitiveExercises);
    }
    
    // Add exercises for missing muscle groups
    if (varietyReport.muscleGroupGaps.length > 0) {
      this.addMissingMuscleGroupExercises(enhancedPlan, varietyReport.muscleGroupGaps);
    }
    
    // Ensure minimum exercise variety
    this.ensureMinimumVariety(enhancedPlan);
    
    logger.workout.info('Exercise variety enhanced');
    return enhancedPlan;
  }

  private replaceRepetitiveExercises(plan: any, repetitiveExercises: string[]): void {
    const alternativeExercises = this.getAlternativeExercises();
    
    // Process all exercise locations
    this.processAllExercises(plan, (exercise, location) => {
      const exerciseData = exercise.exercise || exercise;
      const exerciseName = exerciseData.name?.toLowerCase();
      
      if (repetitiveExercises.includes(exerciseName)) {
        // Find alternative for the same muscle groups
        const alternatives = alternativeExercises.filter(alt => 
          alt.muscleGroups.some(muscle => exerciseData.muscleGroups?.includes(muscle))
        );
        
        if (alternatives.length > 0) {
          const randomAlt = alternatives[Math.floor(Math.random() * alternatives.length)];
          logger.workout.debug(`Replacing repetitive "${exerciseName}" with "${randomAlt.name}"`);
          
          if (exercise.exercise) {
            exercise.exercise = { ...exercise.exercise, ...randomAlt };
          } else {
            Object.assign(exercise, randomAlt);
          }
        }
      }
    });
  }

  private addMissingMuscleGroupExercises(plan: any, missingMuscleGroups: string[]): void {
    const muscleGroupExercises = this.getMuscleGroupExercises();
    
    // Add one exercise for each missing muscle group to the first workout/day
    for (const muscleGroup of missingMuscleGroups) {
      const exercises = muscleGroupExercises[muscleGroup];
      if (exercises && exercises.length > 0) {
        const exercise = exercises[Math.floor(Math.random() * exercises.length)];
        this.addExerciseToFirstWorkout(plan, exercise);
        logger.workout.debug(`Added "${exercise.name}" for missing muscle group: ${muscleGroup}`);
      }
    }
  }

  private ensureMinimumVariety(plan: any): void {
    // Ensure each workout has at least 3 different exercise types
    this.processAllWorkouts(plan, (exercises) => {
      const uniqueTypes = new Set(exercises.map((ex: any) => {
        const exerciseData = ex.exercise || ex;
        return exerciseData.muscleGroups?.[0] || 'unknown';
      }));
      
      if (uniqueTypes.size < 3) {
        logger.workout.warn('Workout has low variety, attempting to enhance');
        // Add variety if possible
      }
    });
  }

  private processAllExercises(plan: any, callback: (exercise: any, location: string) => void): void {
    if (plan.workouts && Array.isArray(plan.workouts)) {
      plan.workouts.forEach((workout: any, workoutIndex: number) => {
        if (workout.exercises && Array.isArray(workout.exercises)) {
          workout.exercises.forEach((exercise: any, exerciseIndex: number) => {
            callback(exercise, `workout-${workoutIndex}-exercise-${exerciseIndex}`);
          });
        }
      });
    }
    
    if (plan.weeks && Array.isArray(plan.weeks)) {
      plan.weeks.forEach((week: any, weekIndex: number) => {
        if (week.days && Array.isArray(week.days)) {
          week.days.forEach((day: any, dayIndex: number) => {
            if (day.exercises && Array.isArray(day.exercises)) {
              day.exercises.forEach((exercise: any, exerciseIndex: number) => {
                callback(exercise, `week-${weekIndex}-day-${dayIndex}-exercise-${exerciseIndex}`);
              });
            }
          });
        }
      });
    }
  }

  private processAllWorkouts(plan: any, callback: (exercises: any[]) => void): void {
    if (plan.workouts && Array.isArray(plan.workouts)) {
      plan.workouts.forEach((workout: any) => {
        if (workout.exercises && Array.isArray(workout.exercises)) {
          callback(workout.exercises);
        }
      });
    }
    
    if (plan.weeks && Array.isArray(plan.weeks)) {
      plan.weeks.forEach((week: any) => {
        if (week.days && Array.isArray(week.days)) {
          week.days.forEach((day: any) => {
            if (day.exercises && Array.isArray(day.exercises)) {
              callback(day.exercises);
            }
          });
        }
      });
    }
  }

  private addExerciseToFirstWorkout(plan: any, exercise: any): void {
    if (plan.workouts && plan.workouts.length > 0 && plan.workouts[0].exercises) {
      plan.workouts[0].exercises.push({
        exercise,
        sets: 3,
        reps: 10,
        restTime: 60
      });
    } else if (plan.weeks && plan.weeks.length > 0 && plan.weeks[0].days.length > 0) {
      const firstDay = plan.weeks[0].days[0];
      if (firstDay.exercises) {
        firstDay.exercises.push({
          exercise,
          sets: 3,
          reps: 10,
          restTime: 60
        });
      }
    }
  }

  private getAlternativeExercises(): any[] {
    return [
      {
        id: 'alt-pushup',
        name: 'Incline Push-ups',
        muscleGroups: ['chest', 'triceps'],
        equipment: ['bodyweight'],
        difficulty: 'beginner',
        description: 'Modified push-ups performed on an incline',
        instructions: ['Place hands on elevated surface', 'Lower chest toward surface', 'Push back up']
      },
      {
        id: 'alt-squat',
        name: 'Goblet Squats',
        muscleGroups: ['legs'],
        equipment: ['dumbbell'],
        difficulty: 'intermediate',
        description: 'Squats performed while holding a weight',
        instructions: ['Hold weight at chest', 'Squat down', 'Return to standing']
      },
      // Add more alternatives as needed
    ];
  }

  private getMuscleGroupExercises(): Record<string, any[]> {
    return {
      chest: [
        {
          id: 'chest-1',
          name: 'Push-ups',
          muscleGroups: ['chest', 'triceps'],
          equipment: ['bodyweight'],
          difficulty: 'beginner',
          description: 'Classic chest exercise',
          instructions: ['Start in plank', 'Lower chest', 'Push up']
        }
      ],
      back: [
        {
          id: 'back-1',
          name: 'Superman',
          muscleGroups: ['back'],
          equipment: ['bodyweight'],
          difficulty: 'beginner',
          description: 'Back strengthening exercise',
          instructions: ['Lie face down', 'Lift chest and legs', 'Hold and lower']
        }
      ],
      legs: [
        {
          id: 'legs-1',
          name: 'Squats',
          muscleGroups: ['legs'],
          equipment: ['bodyweight'],
          difficulty: 'beginner',
          description: 'Fundamental leg exercise',
          instructions: ['Stand with feet apart', 'Lower hips', 'Return to standing']
        }
      ],
      core: [
        {
          id: 'core-1',
          name: 'Plank',
          muscleGroups: ['core'],
          equipment: ['bodyweight'],
          difficulty: 'beginner',
          description: 'Core stabilization exercise',
          instructions: ['Hold plank position', 'Keep body straight', 'Breathe steadily']
        }
      ],
      shoulders: [
        {
          id: 'shoulders-1',
          name: 'Pike Push-ups',
          muscleGroups: ['shoulders'],
          equipment: ['bodyweight'],
          difficulty: 'intermediate',
          description: 'Bodyweight shoulder exercise',
          instructions: ['Start in downward dog', 'Lower head toward ground', 'Push back up']
        }
      ]
    };
  }

  private async fillMissingInformation(workoutPlan: any, userExperienceLevel?: string): Promise<any> {
    // Collect all exercises that need supplemental information
    const exercisesNeedingInfo = []
    const exerciseIndices: Record<string, number> = {} // To track positions for updating later
    
    // First pass: collect all exercises needing AI descriptions
    for (const weekIndex in workoutPlan.weeks) {
      for (const dayIndex in workoutPlan.weeks[weekIndex].days) {
        for (const exerciseIndex in workoutPlan.weeks[weekIndex].days[dayIndex].exercises) {
          const exercise = workoutPlan.weeks[weekIndex].days[dayIndex].exercises[exerciseIndex]
          const actualExercise = exercise.exercise || exercise
          
          // Only collect exercises that are missing descriptions
          if (!actualExercise.description || actualExercise.description.trim() === '' || actualExercise.description === 'No description available') {
            const muscleGroup = this.determineMuscleGroup(exercise)
            exercisesNeedingInfo.push({
              name: actualExercise.name || exercise.name,
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
          const batchResults = await this.processBatchExerciseInfo(batch, userExperienceLevel)
          results.push(...batchResults)
        } catch (error) {
          logger.workout.error('Error processing batch exercise info', error)
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
              const enhancedDescription = results[resultIndex] || "Description unavailable"
              
              // Handle nested exercise structure properly
              if (exercise.exercise) {
                workoutPlan.weeks[weekIndex].days[dayIndex].exercises[exerciseIndex] = {
                  ...exercise,
                  exercise: {
                    ...exercise.exercise,
                    description: enhancedDescription
                  },
                  source: 'openai'
                }
              } else {
                workoutPlan.weeks[weekIndex].days[dayIndex].exercises[exerciseIndex] = {
                  ...exercise,
                  description: enhancedDescription,
                  source: 'openai'
                }
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

  private async processBatchExerciseInfo(exercises: any[], userExperienceLevel?: string): Promise<string[]> {
    try {
      // Group exercises by type to optimize API calls
      const descriptionExercises = exercises.filter(ex => ex.type === 'description');
      const formExercises = exercises.filter(ex => ex.type === 'form');
      
      const results: string[] = [];
      
      // Process description exercises in batches
      if (descriptionExercises.length > 0) {
        try {
          const exerciseData = descriptionExercises.map(ex => ({
            name: ex.name,
            muscleGroups: [ex.muscleGroup],
            equipment: ['bodyweight'], // Default equipment
            difficulty: 'intermediate'
          }));

          const response = await api.post('/api/exercise-info', {
            exercises: exerciseData,
            userExperienceLevel: userExperienceLevel || 'beginner'
          });

          const exerciseInfo = response.data.exercises;
          
          // Create comprehensive descriptions combining all the OpenAI data
          descriptionExercises.forEach((exercise, index) => {
            const info = exerciseInfo[index];
            if (info) {
              const description = `${info.description}

🎯 **Form Cues:**
${info.formCues.map((cue: string) => `• ${cue}`).join('\n')}

⚠️ **Safety Tips:**
${info.safetyTips.map((tip: string) => `• ${tip}`).join('\n')}

💪 **Muscle Activation:**
${info.muscleActivation}

📈 **Difficulty Adaptations:**
${info.difficultyAdaptations.map((adaptation: string) => `• ${adaptation}`).join('\n')}`;
              
              results[exercises.indexOf(exercise)] = description;
            } else {
              results[exercises.indexOf(exercise)] = this.getFallbackDescription(exercise.name, exercise.muscleGroup);
            }
          });
        } catch (apiError) {
          logger.workout.warn('API call failed, using enhanced fallbacks', apiError);
          // Enhanced fallback for description exercises
          descriptionExercises.forEach(exercise => {
            results[exercises.indexOf(exercise)] = this.getFallbackDescription(exercise.name, exercise.muscleGroup);
          });
        }
      }
      
      // Process form exercises with detailed form cues
      if (formExercises.length > 0) {
        formExercises.forEach(exercise => {
          const formDescription = this.getDetailedFormCues(exercise.name, exercise.muscleGroup);
          results[exercises.indexOf(exercise)] = formDescription;
        });
      }
      
      // Fill any remaining slots with default information
      for (let i = 0; i < exercises.length; i++) {
        if (!results[i]) {
          results[i] = this.getFallbackDescription(exercises[i].name, exercises[i].muscleGroup);
        }
      }
      
      return results;
    } catch (error) {
      logger.workout.error('Error in batch processing exercise info', error);
      // Return enhanced fallback descriptions
      return exercises.map(exercise => this.getFallbackDescription(exercise.name, exercise.muscleGroup || 'general'));
    }
  }

  private getFallbackDescription(exerciseName: string, muscleGroup: string): string {
    // Enhanced fallback descriptions for common exercises
    const commonDescriptions: Record<string, string> = {
      'push-ups': `Push-ups are a fundamental bodyweight exercise that targets your chest, shoulders, and triceps. This compound movement builds upper body strength while engaging your core for stability.

🎯 **Form Cues:**
• Start in a plank position with hands shoulder-width apart
• Keep your body in a straight line from head to heels
• Lower until your chest nearly touches the floor
• Push back up while maintaining core engagement

⚠️ **Safety Tips:**
• Avoid letting your hips sag or pike up
• Keep your head in neutral position
• Start with modified versions if needed

💪 **Muscle Activation:**
Primary: Chest, anterior deltoids, triceps
Secondary: Core stabilizers, serratus anterior

📈 **Progression:**
• Beginner: Wall push-ups or knee push-ups
• Intermediate: Standard push-ups
• Advanced: Decline push-ups or single-arm variations`,

      'squats': `Squats are the king of lower body exercises, targeting your quadriceps, glutes, and hamstrings. This fundamental movement pattern is essential for functional strength and athletic performance.

🎯 **Form Cues:**
• Stand with feet shoulder-width apart, toes slightly outward
• Initiate the movement by sitting back with your hips
• Keep your chest up and core engaged throughout
• Descend until thighs are parallel to the floor

⚠️ **Safety Tips:**
• Keep your knees tracking over your toes
• Maintain a neutral spine throughout the movement
• Don't let your knees cave inward

💪 **Muscle Activation:**
Primary: Quadriceps, glutes, hamstrings
Secondary: Core stabilizers, calves

📈 **Progression:**
• Beginner: Bodyweight squats with chair assist
• Intermediate: Full range bodyweight squats
• Advanced: Jump squats or single-leg pistol squats`,

      'lunges': `Lunges are excellent unilateral exercises that develop single-leg strength, balance, and coordination. They target the entire lower body while challenging your stability.

🎯 **Form Cues:**
• Step forward with one leg, lowering your hips until both knees are bent at 90°
• Keep your front knee over your ankle, not pushed out past your toes
• Keep your torso upright with core engaged
• Push back to the starting position through your front heel

⚠️ **Safety Tips:**
• Avoid letting your front knee drift inward
• Don't let your back knee crash into the ground
• Start with shorter steps if you're new to lunges

💪 **Muscle Activation:**
Primary: Quadriceps, glutes, hamstrings
Secondary: Core stabilizers, calves

📈 **Progression:**
• Beginner: Stationary lunges with support
• Intermediate: Forward/reverse lunges
• Advanced: Walking lunges or jumping lunges`,

      'plank': `Planks are an isometric core exercise that builds strength and endurance in your entire core musculature. This static hold improves postural stability and transfers to all other movements.

🎯 **Form Cues:**
• Start in a forearm plank position with elbows under shoulders
• Keep your body in a straight line from head to heels
• Engage your core by pulling your belly button toward your spine
• Breathe steadily while maintaining the position

⚠️ **Safety Tips:**
• Avoid sagging hips or piking up your butt
• Don't hold your breath during the hold
• Stop if you feel strain in your lower back

💪 **Muscle Activation:**
Primary: Rectus abdominis, transverse abdominis, obliques
Secondary: Shoulders, glutes, back stabilizers

📈 **Progression:**
• Beginner: Knee plank or incline plank
• Intermediate: Standard forearm plank
• Advanced: Single-arm/leg plank variations`
    };

    const exerciseKey = exerciseName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    if (commonDescriptions[exerciseKey]) {
      return commonDescriptions[exerciseKey];
    }

    // Generic fallback with muscle group information
    return `${exerciseName} is an effective ${muscleGroup} exercise that helps build strength and improve fitness. This movement targets the ${muscleGroup} muscles and contributes to overall functional strength.

🎯 **Form Cues:**
• Maintain proper posture throughout the movement
• Control the movement on both lifting and lowering phases
• Breathe steadily - exhale on exertion, inhale on return
• Keep core engaged for stability and support

⚠️ **Safety Tips:**
• Start with lighter resistance and focus on form first
• Stop if you feel sharp pain or discomfort
• Warm up properly before beginning the exercise

💪 **Muscle Activation:**
This exercise promotes balanced muscle development in the ${muscleGroup} area and supports functional movement patterns.

📈 **Progression:**
• Beginner: Focus on learning proper form with reduced intensity
• Intermediate: Full range of motion with appropriate challenge
• Advanced: Add complexity, resistance, or tempo variations`;
  }

  private getDetailedFormCues(exerciseName: string, muscleGroup: string): string {
    return `**Form Guidance for ${exerciseName}:**

🎯 **Setup:**
• Position yourself correctly for optimal muscle engagement
• Ensure proper alignment before beginning the movement
• Check that your equipment (if any) is secure and appropriate

🎯 **Execution:**
• Move with control through the full range of motion
• Focus on the targeted ${muscleGroup} muscles during the movement
• Maintain proper breathing pattern throughout

🎯 **Completion:**
• Return to starting position with the same control
• Maintain good posture between repetitions
• Rest appropriately between sets for recovery

⚠️ **Common Mistakes to Avoid:**
• Using momentum instead of controlled movement
• Sacrificing form for speed or heavier resistance
• Neglecting proper breathing during the exercise

💡 **Pro Tips:**
• Visualize the target muscles working during the movement
• Start conservatively and gradually increase intensity
• Focus on quality over quantity in your repetitions`;
  }

  private determineMuscleGroup(exercise: any): string {
    // Handle nested structure from OpenAI service (exercise.exercise.name)
    const actualExercise = exercise.exercise || exercise;
    
    // Logic to determine the primary muscle group targeted
    if (actualExercise.muscleGroups && actualExercise.muscleGroups.length > 0) {
      return actualExercise.muscleGroups[0]
    }
    
    // Simple keyword matching as fallback
    const name = actualExercise.name;
    if (!name || typeof name !== 'string') {
      return 'fullBody'; // Safe fallback when name is missing
    }
    
    const lowerName = name.toLowerCase();
    if (lowerName.includes('chest') || lowerName.includes('bench') || lowerName.includes('pec')) return 'chest'
    if (lowerName.includes('shoulder') || lowerName.includes('press') || lowerName.includes('delt')) return 'shoulders'
    if (lowerName.includes('back') || lowerName.includes('row') || lowerName.includes('pull')) return 'back'
    if (lowerName.includes('leg') || lowerName.includes('squat') || lowerName.includes('lunge')) return 'legs'
    if (lowerName.includes('bicep') || lowerName.includes('curl')) return 'biceps'
    if (lowerName.includes('tricep') || lowerName.includes('extension')) return 'triceps'
    if (lowerName.includes('abs') || lowerName.includes('core') || lowerName.includes('crunch')) return 'core'
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
        muscles: [], // No direct mapping from UserProfile, so leave empty or infer from goals if needed
        equipment: userProfile.availableEquipment
      })
      // Map WGER exercises to canonical Exercise objects
      const validMuscleGroups = ['chest','back','shoulders','biceps','triceps','legs','core','fullBody']
      const validEquipment = ['barbell','dumbbell','kettlebell','machine','cable','bodyweight','resistanceBand','medicineBall','stabilityBall','foamRoller']
      const exercises: Exercise[] = wgerExercises.map(wgerExercise => ({
        id: String(wgerExercise.id),
        name: wgerExercise.name,
        description: wgerExercise.description || '',
        muscleGroups: wgerExercise.muscles ? wgerExercise.muscles.map(String).filter((m: string) => validMuscleGroups.includes(m.toLowerCase())) as any : [],
        equipment: wgerExercise.equipment ? wgerExercise.equipment.filter((e: string) => validEquipment.includes(e.toLowerCase())) as any : [],
        difficulty: (wgerExercise.difficulty === 'beginner' || wgerExercise.difficulty === 'intermediate' || wgerExercise.difficulty === 'advanced') ? wgerExercise.difficulty : 'intermediate',
        instructions: wgerExercise.instructions || [],
      }))
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
      // Step 2: Generate workout plan via API
      const response = await api.post('/api/workout-plans/generate', { userProfile: openaiUserProfile })
      let workoutPlan = response.data
      
      // Step 3: Apply workout structure validation and duration enforcement
      if (workoutPlan.weeks && Array.isArray(workoutPlan.weeks)) {
        workoutPlan.weeks = workoutPlan.weeks.map((week: any) => {
          if (week.days && Array.isArray(week.days)) {
            week.days = week.days.map((day: any) => {
              if (day.exercises && !day.isRestDay) {
                // Convert to Workout format for processing
                const dayWorkout: Workout = {
                  id: day.workoutId || `day-${Date.now()}`,
                  name: day.name || 'Daily Workout',
                  description: day.description || '',
                  type: day.type || 'strength',
                  difficulty: day.difficulty || userProfile.fitnessLevel,
                  duration: userProfile.preferredWorkoutDuration || 45,
                  exercises: day.exercises,
                  targetMuscleGroups: day.targetMuscleGroups || [],
                  equipment: userProfile.availableEquipment || [],
                  createdAt: new Date(),
                  updatedAt: new Date()
                }

                // Apply structure enforcement and duration validation
                const structuredWorkout = WorkoutTemplateService.enforceWorkoutStructure(
                  dayWorkout, 
                  userProfile.preferredWorkoutDuration || 45
                )

                // Validate and adjust duration
                const validatedWorkout = WorkoutDurationService.adjustWorkoutForDuration(
                  structuredWorkout,
                  userProfile.preferredWorkoutDuration || 45
                )

                // Update the day with processed workout
                return {
                  ...day,
                  exercises: validatedWorkout.exercises,
                  duration: validatedWorkout.duration,
                  targetMuscleGroups: validatedWorkout.targetMuscleGroups,
                  equipment: validatedWorkout.equipment
                }
              }
              return day
            })
          }
          return week
        })
      }
      
      // Step 4: Cache the structured result
      this.planCache.set(cacheKey, workoutPlan)
      this.saveCache()
      
      // Step 5: Enforce 3-week progression
      const finalPlan = this.enforceThreeWeekProgression(workoutPlan)
      return finalPlan
    } catch (error) {
      logger.workout.error('Error generating workout plan', error)
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
      weeks: [],
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
          plan.workouts?.push(currentWorkout)
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
      plan.workouts?.push(currentWorkout)
    }

    return plan
  }

  private getFallbackWorkoutPlan(): WorkoutPlan {
    // Define exercises for different workout days
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
    
    const lunges: Exercise = {
      id: 'lunges',
      name: 'Lunges',
      description: 'A bodyweight exercise for legs and glutes.',
      muscleGroups: ['legs', 'glutes'],
      equipment: ['bodyweight'],
      difficulty: 'beginner',
      instructions: ['Step forward into lunge position', 'Lower back knee', 'Return to start'],
      videoUrl: '',
      imageUrl: ''
    }
    
    const plank: Exercise = {
      id: 'plank',
      name: 'Plank',
      description: 'A core strengthening exercise.',
      muscleGroups: ['core'],
      equipment: ['bodyweight'],
      difficulty: 'beginner',
      instructions: ['Hold plank position', 'Keep body straight', 'Engage core'],
      videoUrl: '',
      imageUrl: ''
    }

    // Create 3-week progressive program with 3 workouts per week (Monday, Wednesday, Friday pattern)
    const weeks = [];
    
    for (let weekNum = 1; weekNum <= 3; weekNum++) {
      const week = {
        weekNumber: weekNum,
        days: [
          // Monday - Upper Body Focus
          {
            dayNumber: 1,
            name: `Week ${weekNum} - Upper Body`,
            description: 'Upper body strength training',
            exercises: [
              {
                exercise: pushUps,
                sets: 2 + weekNum,
                reps: 8 + (weekNum * 2),
                restTime: 60
              },
              {
                exercise: plank,
                sets: 2,
                reps: 1,
                restTime: 30
              }
            ],
            isRestDay: false,
            workoutId: `fallback-week${weekNum}-day1`
          },
          // Tuesday - Rest Day
          {
            dayNumber: 2,
            name: 'Rest Day',
            description: 'Recovery day - light stretching or walking recommended',
            exercises: [],
            isRestDay: true,
            workoutId: `fallback-week${weekNum}-rest1`
          },
          // Wednesday - Lower Body Focus
          {
            dayNumber: 3,
            name: `Week ${weekNum} - Lower Body`,
            description: 'Lower body strength training',
            exercises: [
              {
                exercise: squats,
                sets: 2 + weekNum,
                reps: 10 + (weekNum * 2),
                restTime: 60
              },
              {
                exercise: lunges,
                sets: 2 + weekNum,
                reps: 8 + weekNum,
                restTime: 60
              }
            ],
            isRestDay: false,
            workoutId: `fallback-week${weekNum}-day3`
          },
          // Thursday - Rest Day
          {
            dayNumber: 4,
            name: 'Rest Day',
            description: 'Recovery day - light stretching or walking recommended',
            exercises: [],
            isRestDay: true,
            workoutId: `fallback-week${weekNum}-rest2`
          },
          // Friday - Full Body
          {
            dayNumber: 5,
            name: `Week ${weekNum} - Full Body`,
            description: 'Full body circuit training',
            exercises: [
              {
                exercise: pushUps,
                sets: 2 + weekNum,
                reps: 6 + (weekNum * 2),
                restTime: 45
              },
              {
                exercise: squats,
                sets: 2 + weekNum,
                reps: 8 + (weekNum * 2),
                restTime: 45
              },
              {
                exercise: plank,
                sets: 2,
                reps: 1,
                restTime: 30
              }
            ],
            isRestDay: false,
            workoutId: `fallback-week${weekNum}-day5`
          },
          // Weekend - Rest Days
          {
            dayNumber: 6,
            name: 'Rest Day',
            description: 'Recovery day - light stretching or walking recommended',
            exercises: [],
            isRestDay: true,
            workoutId: `fallback-week${weekNum}-rest3`
          },
          {
            dayNumber: 7,
            name: 'Rest Day',
            description: 'Recovery day - light stretching or walking recommended',
            exercises: [],
            isRestDay: true,
            workoutId: `fallback-week${weekNum}-rest4`
          }
        ]
      };
      weeks.push(week);
    }

    return {
      id: 'fallback',
      name: '3-Week Beginner Program',
      description: 'A progressive 3-week bodyweight program with Monday/Wednesday/Friday workouts',
      duration: 3,
      weeks,
      workouts: [], // Will be populated by transformation function
      targetMuscleGroups: ['chest', 'legs', 'core'],
      difficulty: 'beginner',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  // Enhanced localStorage synchronization with WorkoutContext
  private async saveWorkoutPlanAndSync(plan: WorkoutPlan): Promise<void> {
    try {
      logger.workout.debug('Saving workout plan and syncing with context');
      
      // Set as current plan
      this.currentPlan = plan;
      
      // Save to localStorage with metadata
      const planData = {
        plan,
        savedAt: new Date().toISOString(),
        version: '1.0',
        source: 'comprehensive-generation'
      };
      
      localStorage.setItem('currentWorkoutPlan', JSON.stringify(planData));
      localStorage.setItem('lastWorkoutPlan', JSON.stringify(plan)); // Emergency fallback
      
      // Update cache
      const cacheKey = this.generateCacheKeyFromPlan(plan);
      this.planCache.set(cacheKey, plan);
      this.saveCache();
      
      // Trigger context sync (if WorkoutContext is available)
      await this.syncWithWorkoutContext(plan);
      
      logger.workout.info('Workout plan saved and synced successfully', {
        planId: plan.id,
        workoutCount: plan.workouts?.length || 0,
        weekCount: plan.weeks?.length || 0
      });
      
    } catch (error) {
      logger.workout.error('Failed to save workout plan', error);
      // Don't throw error as this shouldn't break plan generation
    }
  }

  private generateCacheKeyFromPlan(plan: WorkoutPlan): string {
    return `plan-${plan.difficulty}-${plan.targetMuscleGroups.join(',')}-${plan.duration}w`;
  }

  private async syncWithWorkoutContext(plan: WorkoutPlan): Promise<void> {
    try {
      // Attempt to sync with WorkoutContext if it exists in the global scope
      if (typeof window !== 'undefined' && (window as any).workoutContextSync) {
        await (window as any).workoutContextSync(plan);
        logger.workout.debug('Synced with WorkoutContext');
      }
      
      // Dispatch custom event for context listeners
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('workoutPlanGenerated', {
          detail: { plan }
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      logger.workout.warn('Failed to sync with WorkoutContext', error);
    }
  }

  // Enhanced cache management
  private saveCache() {
    try {
      const cacheData = {
        entries: Array.from(this.planCache.entries()),
        savedAt: new Date().toISOString(),
        size: this.planCache.size
      };
      
      localStorage.setItem('workoutPlanCache', JSON.stringify(cacheData));
      
      // Clean up old cache entries if cache is getting too large
      if (this.planCache.size > 50) {
        this.cleanupCache();
      }
    } catch (error) {
      logger.workout.warn('Failed to save cache', error);
    }
  }

  private cleanupCache(): void {
    logger.workout.debug('Cleaning up workout plan cache');
    
    // Keep only the 25 most recent entries
    const entries = Array.from(this.planCache.entries());
    this.planCache.clear();
    
    // Re-add the most recent 25 entries
    const recentEntries = entries.slice(-25);
    for (const [key, value] of recentEntries) {
      this.planCache.set(key, value);
    }
    
    logger.workout.debug(`Cache cleaned up: ${entries.length} -> ${this.planCache.size} entries`);
  }

  // Verify localStorage data integrity
  private verifyStorageIntegrity(): boolean {
    try {
      const currentPlan = localStorage.getItem('currentWorkoutPlan');
      const cache = localStorage.getItem('workoutPlanCache');
      const logs = localStorage.getItem('workoutLogs');
      
      // Basic JSON validation
      if (currentPlan) JSON.parse(currentPlan);
      if (cache) JSON.parse(cache);
      if (logs) JSON.parse(logs);
      
      return true;
    } catch (error) {
      logger.workout.error('Storage integrity check failed', error);
      return false;
    }
  }

  // Repair corrupted storage
  private repairStorage(): void {
    try {
      // Clear corrupted data
      localStorage.removeItem('currentWorkoutPlan');
      localStorage.removeItem('workoutPlanCache');
      localStorage.removeItem('workoutLogs');
      
      // Reset internal state
      this.currentPlan = null;
      this.planCache.clear();
      this.workoutLogs = [];
      
      // Storage repaired successfully
    } catch (error) {
      logger.workout.error('Failed to repair storage:', error);
    }
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
      id: Date.now().toString(),
      userId: 'current-user', // Replace with actual user ID
      planId: '',
      workoutId,
      date: new Date(),
      exercises,
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

  // Enforce standardized 3-phase workout structure for consistent progression
  private enforceThreePhaseWorkoutStructure(plan: any): any {
    try {
      logger.workout.info('🏗️ Enforcing standardized 3-phase workout structure...');
      
      if (!plan.weeks || !Array.isArray(plan.weeks)) {
        logger.workout.warn('No weeks structure found, cannot enforce 3-phase structure');
        return plan;
      }

      const structuredPlan = JSON.parse(JSON.stringify(plan));
      let totalWorkoutsModified = 0;

      structuredPlan.weeks.forEach((week: any, weekIndex: number) => {
        if (!week.days || !Array.isArray(week.days)) return;

        week.days.forEach((day: any, dayIndex: number) => {
          if (day.isRestDay || !day.exercises || !Array.isArray(day.exercises) || day.exercises.length === 0) {
            return; // Skip rest days and days without exercises
          }

          // Analyze current workout structure
          const currentStructure = this.analyzeWorkoutPhases(day.exercises);
          
          if (!this.hasValidThreePhaseStructure(currentStructure)) {
            logger.workout.info(`Restructuring Week ${weekIndex + 1}, Day ${dayIndex + 1} to 3-phase format`);
            day.exercises = this.restructureToThreePhases(day.exercises, day.targetMuscleGroups || plan.targetMuscleGroups);
            day.description = `${day.description || day.name} - 3-phase structured workout`;
            totalWorkoutsModified++;
          }
        });
      });

      logger.workout.info(`3-phase structure enforcement completed. Modified ${totalWorkoutsModified} workouts.`);
      return structuredPlan;

    } catch (error) {
      logger.workout.error('Failed to enforce 3-phase structure', error);
      return plan; // Return original plan if enforcement fails
    }
  }

  // Analyze existing workout to determine phase distribution
  private analyzeWorkoutPhases(exercises: any[]): { warmup: number; main: number; cooldown: number } {
    const phases = { warmup: 0, main: 0, cooldown: 0 };
    
    exercises.forEach(exercise => {
      const phase = exercise.phase || this.inferExercisePhase(exercise);
      if (phases.hasOwnProperty(phase)) {
        phases[phase as keyof typeof phases]++;
      }
    });

    return phases;
  }

  // Infer exercise phase based on exercise characteristics
  private inferExercisePhase(exercise: any): string {
    const exerciseData = exercise.exercise || exercise;
    const name = exerciseData.name?.toLowerCase() || '';
    const muscleGroups = exerciseData.muscleGroups || [];
    const sets = exercise.sets || 0;
    const reps = exercise.reps || 0;

    // Warmup indicators
    if (name.includes('warm') || name.includes('circle') || name.includes('swing') || 
        name.includes('march') || (sets <= 2 && reps <= 12)) {
      return 'warmup';
    }

    // Cooldown indicators  
    if (name.includes('stretch') || name.includes('cool') || name.includes('relax') ||
        muscleGroups.includes('flexibility') || (sets <= 2 && reps >= 15)) {
      return 'cooldown';
    }

    // Default to main phase
    return 'main';
  }

  // Check if workout has valid 3-phase structure
  private hasValidThreePhaseStructure(phases: { warmup: number; main: number; cooldown: number }): boolean {
    return phases.warmup >= 2 && phases.warmup <= 3 &&
           phases.main >= 4 && phases.main <= 6 &&
           phases.cooldown >= 2 && phases.cooldown <= 3;
  }

  // Restructure exercises to follow 3-phase template
  private restructureToThreePhases(exercises: any[], targetMuscleGroups: string[] = []): any[] {
    const restructured: any[] = [];
    const existingExercises = [...exercises];

    // PHASE 1: Mobility Warm-up (2-3 exercises)
    const warmupExercises = this.createWarmupExercises(targetMuscleGroups);
    restructured.push(...warmupExercises);

    // PHASE 2: Active Muscle Engagement (4-6 exercises)
    // Use existing main exercises, supplementing if needed
    const mainExercises = existingExercises.filter(ex => {
      const phase = ex.phase || this.inferExercisePhase(ex);
      return phase === 'main';
    });

    // Ensure we have 4-6 main exercises
    const adjustedMainExercises = this.adjustMainExerciseCount(mainExercises, targetMuscleGroups);
    adjustedMainExercises.forEach(ex => {
      ex.phase = 'main';
      if (!ex.notes?.includes('Main phase')) {
        ex.notes = `Main phase - ${ex.notes || 'focus on proper form'}`;
      }
    });
    restructured.push(...adjustedMainExercises);

    // PHASE 3: Cooldown (2-3 exercises)
    const cooldownExercises = this.createCooldownExercises(targetMuscleGroups);
    restructured.push(...cooldownExercises);

    return restructured;
  }

  // Create warmup exercises for 3-phase structure
  private createWarmupExercises(targetMuscleGroups: string[] = []): any[] {
    const warmupExercises = [
      {
        exercise: {
          id: 'dynamic-warmup-1',
          name: 'Arm Circles',
          description: 'Dynamic shoulder mobility preparation',
          muscleGroups: ['shoulders'],
          equipment: ['bodyweight'],
          difficulty: 'beginner',
          instructions: ['Stand with arms extended', 'Make small circles, gradually increasing size', 'Reverse direction halfway through']
        },
        sets: 2,
        reps: 10,
        restTime: 30,
        notes: 'Warm-up phase - prepare shoulders and arms',
        phase: 'warmup'
      },
      {
        exercise: {
          id: 'dynamic-warmup-2', 
          name: 'Walking Lunge',
          description: 'Dynamic hip and leg mobility preparation',
          muscleGroups: ['legs', 'hips'],
          equipment: ['bodyweight'],
          difficulty: 'beginner',
          instructions: ['Hold wall for support', 'Swing leg forward and back', 'Control the movement']
        },
        sets: 2,
        reps: 8,
        restTime: 30,
        notes: 'Warm-up phase - prepare hips and legs',
        phase: 'warmup'
      }
    ];

    // Add targeted warmup if specific muscle groups are focused
    if (targetMuscleGroups.includes('core') || targetMuscleGroups.includes('abs')) {
      warmupExercises.push({
        exercise: {
          id: 'dynamic-warmup-3',
          name: 'Torso Twists',
          description: 'Dynamic core and spine mobility',
          muscleGroups: ['core'],
          equipment: ['bodyweight'],
          difficulty: 'beginner',
          instructions: ['Stand with arms crossed', 'Rotate torso left and right', 'Keep hips facing forward']
        },
        sets: 2,
        reps: 10,
        restTime: 30,
        notes: 'Warm-up phase - prepare core and spine',
        phase: 'warmup'
      });
    }

    return warmupExercises.slice(0, 3); // Limit to 3 exercises max
  }

  // Adjust main exercise count to fit 4-6 range
  private adjustMainExerciseCount(mainExercises: any[], targetMuscleGroups: string[] = []): any[] {
    if (mainExercises.length >= 4 && mainExercises.length <= 6) {
      return mainExercises; // Already in correct range
    }

    if (mainExercises.length < 4) {
      // Add exercises to reach minimum of 4
      const additionalNeeded = 4 - mainExercises.length;
      const additionalExercises = this.createAdditionalMainExercises(additionalNeeded, targetMuscleGroups);
      return [...mainExercises, ...additionalExercises];
    }

    if (mainExercises.length > 6) {
      // Trim to maximum of 6, keeping most important exercises
      return this.prioritizeMainExercises(mainExercises).slice(0, 6);
    }

    return mainExercises;
  }

  // Create additional main exercises when needed
  private createAdditionalMainExercises(count: number, targetMuscleGroups: string[] = []): any[] {
    const basicExercises = [
      {
        exercise: {
          id: 'basic-squat',
          name: 'Bodyweight Squats',
          description: 'Fundamental lower body compound movement',
          muscleGroups: ['legs', 'glutes'],
          equipment: ['bodyweight'],
          difficulty: 'beginner',
          instructions: ['Stand with feet shoulder-width apart', 'Lower hips back and down', 'Return to standing']
        },
        sets: 3,
        reps: 12,
        restTime: 60,
        notes: 'Main phase - compound lower body movement',
        phase: 'main'
      },
      {
        exercise: {
          id: 'basic-pushup',
          name: 'Push-Ups',
          description: 'Fundamental upper body compound movement',
          muscleGroups: ['chest', 'shoulders', 'triceps'],
          equipment: ['bodyweight'],
          difficulty: 'beginner',
          instructions: ['Start in plank position', 'Lower body to ground', 'Push back up']
        },
        sets: 3,
        reps: 10,
        restTime: 60,
        notes: 'Main phase - compound upper body movement',
        phase: 'main'
      },
      {
        exercise: {
          id: 'basic-plank',
          name: 'Plank Hold',
          description: 'Core stability and strength',
          muscleGroups: ['core', 'abs'],
          equipment: ['bodyweight'],
          difficulty: 'beginner',
          instructions: ['Start in forearm plank', 'Keep body straight', 'Hold position']
        },
        sets: 3,
        reps: 30,
        restTime: 60,
        notes: 'Main phase - core stability',
        phase: 'main'
      }
    ];

    return basicExercises.slice(0, count);
  }

  // Prioritize most important main exercises
  private prioritizeMainExercises(exercises: any[]): any[] {
    return exercises.sort((a, b) => {
      const aExercise = a.exercise || a;
      const bExercise = b.exercise || b;
      
      // Prioritize compound movements
      const aCompound = this.isCompoundMovement(aExercise);
      const bCompound = this.isCompoundMovement(bExercise);
      
      if (aCompound && !bCompound) return -1;
      if (!aCompound && bCompound) return 1;
      
      // Prioritize by muscle group count (more muscle groups = higher priority)
      const aMuscles = aExercise.muscleGroups?.length || 0;
      const bMuscles = bExercise.muscleGroups?.length || 0;
      
      return bMuscles - aMuscles;
    });
  }

  // Check if exercise is a compound movement
  private isCompoundMovement(exercise: any): boolean {
    const name = exercise.name?.toLowerCase() || '';
    const muscleGroups = exercise.muscleGroups || [];
    
    // Common compound movement indicators
    const compoundIndicators = ['squat', 'deadlift', 'push-up', 'pull-up', 'lunge', 'burpee', 'thruster'];
    const hasCompoundName = compoundIndicators.some(indicator => name.includes(indicator));
    
    // Or exercises that target multiple muscle groups
    const targetsMultipleGroups = muscleGroups.length >= 2;
    
    return hasCompoundName || targetsMultipleGroups;
  }

  // Create cooldown exercises for 3-phase structure
  private createCooldownExercises(targetMuscleGroups: string[] = []): any[] {
    const cooldownExercises = [
      {
        exercise: {
          id: 'cooldown-stretch-1',
          name: 'Hamstring Stretch',
          description: 'Static hamstring and posterior chain flexibility',
          muscleGroups: ['hamstrings', 'calves'],
          equipment: ['bodyweight'],
          difficulty: 'beginner',
          instructions: ['Sit with one leg extended', 'Reach toward toes', 'Hold stretch']
        },
        sets: 2,
        reps: 30,
        restTime: 30,
        notes: 'Cooldown phase - hold for 30 seconds each side',
        phase: 'cooldown'
      },
      {
        exercise: {
          id: 'cooldown-stretch-2',
          name: 'Chest Stretch',
          description: 'Static chest and shoulder flexibility',
          muscleGroups: ['chest', 'shoulders'],
          equipment: ['bodyweight'],
          difficulty: 'beginner',
          instructions: ['Stand in doorway', 'Place arm against frame', 'Step forward to stretch']
        },
        sets: 2,
        reps: 30,
        restTime: 30,
        notes: 'Cooldown phase - hold for 30 seconds each arm',
        phase: 'cooldown'
      }
    ];

    // Add core-specific cooldown if core was targeted
    if (targetMuscleGroups.includes('core') || targetMuscleGroups.includes('abs')) {
      cooldownExercises.push({
        exercise: {
          id: 'cooldown-stretch-3',
          name: 'Cat-Cow Stretch',
          description: 'Spinal mobility and core release',
          muscleGroups: ['core', 'back'],
          equipment: ['bodyweight'],
          difficulty: 'beginner',
          instructions: ['Start on hands and knees', 'Arch and round spine alternately', 'Move slowly and controlled']
        },
        sets: 2,
        reps: 10,
        restTime: 30,
        notes: 'Cooldown phase - gentle spinal mobility',
        phase: 'cooldown'
      });
    }

    return cooldownExercises.slice(0, 3); // Limit to 3 exercises max
  }

  // Enhanced 3-week progressive overload with proper validation and muscle group targeting
  private enforceThreeWeekProgression(plan: any): any {
    try {
      console.log('📈 Applying 3-week progressive overload...');
      
      // Handle both plan structures: weeks array or workouts array
      if (plan.weeks && Array.isArray(plan.weeks)) {
        return this.applyProgressionToWeeks(plan);
      } else if (plan.workouts && Array.isArray(plan.workouts)) {
        return this.convertWorkoutsToWeeksProgression(plan);
      } else {
        console.warn('⚠️ No valid structure found for progression, returning original plan');
        return plan;
      }
    } catch (error) {
      console.error('❌ Error applying 3-week progression:', error);
      return plan; // Return original plan if progression fails
    }
  }

  private applyProgressionToWeeks(plan: any): any {
    const progressedPlan = JSON.parse(JSON.stringify(plan));
    
    // Ensure we have exactly 3 weeks
    while (progressedPlan.weeks.length < 3) {
      const lastWeek = progressedPlan.weeks[progressedPlan.weeks.length - 1];
      if (!lastWeek) break; // Safety check
      
      const newWeek = this.createProgressedWeek(lastWeek, progressedPlan.weeks.length + 1);
      progressedPlan.weeks.push(newWeek);
    }
    
    // Trim to exactly 3 weeks if more exist
    if (progressedPlan.weeks.length > 3) {
      progressedPlan.weeks = progressedPlan.weeks.slice(0, 3);
    }
    
    // Apply progressive overload across the 3 weeks
    progressedPlan.weeks = progressedPlan.weeks.map((week: any, weekIndex: number) => {
      const progressionMultiplier = weekIndex + 1; // Week 1 = 1x, Week 2 = 2x, Week 3 = 3x
      
      return {
        ...week,
        weekNumber: weekIndex + 1,
        days: week.days.map((day: any) => ({
          ...day,
          exercises: day.exercises.map((exercise: any) => 
            this.applyExerciseProgression(exercise, progressionMultiplier, weekIndex)
          )
        }))
      };
    });
    
    console.log(`✅ Applied 3-week progression: ${progressedPlan.weeks.length} weeks generated`);
    return progressedPlan;
  }

  private convertWorkoutsToWeeksProgression(plan: any): any {
    const progressedPlan = JSON.parse(JSON.stringify(plan));
    
    // Convert workouts array to 3-week progression with proper rest day scheduling
    if (!progressedPlan.workouts || progressedPlan.workouts.length === 0) {
      console.warn('⚠️ No workouts found to convert to weeks progression');
      return progressedPlan;
    }
    
    // Create 3 weeks from the available workouts with every-other-day pattern
    progressedPlan.weeks = [];
    
    for (let weekNum = 1; weekNum <= 3; weekNum++) {
      const week = {
        weekNumber: weekNum,
        days: this.createWeeklySchedule(progressedPlan.workouts, weekNum)
      };
      
      progressedPlan.weeks.push(week);
    }
    
    console.log(`✅ Converted ${progressedPlan.workouts.length} workouts to 3-week progression with rest days`);
    return progressedPlan;
  }

  // Helper function to create weekly schedule with proper rest days
  private createWeeklySchedule(workouts: any[], weekNumber: number): any[] {
    const days = [];
    const workoutDays = [1, 3, 5]; // Monday, Wednesday, Friday pattern
    const restDays = [2, 4, 6, 7]; // Tuesday, Thursday, Saturday, Sunday
    
    // Add workout days
    workoutDays.forEach((dayNum, workoutIndex) => {
      if (workoutIndex < workouts.length) {
        const workout = workouts[workoutIndex];
        days.push({
          dayNumber: dayNum,
          name: `Week ${weekNumber} - ${workout.name || `Workout ${workoutIndex + 1}`}`,
          description: workout.description || `Workout ${workoutIndex + 1} for week ${weekNumber}`,
          exercises: workout.exercises.map((exercise: any) => 
            this.applyExerciseProgression(exercise, weekNumber, weekNumber - 1)
          ),
          isRestDay: false,
          workoutId: `workout-week${weekNumber}-day${dayNum}`,
          type: workout.type || 'strength',
          difficulty: workout.difficulty || 'intermediate',
          duration: workout.duration || 45,
          targetMuscleGroups: workout.targetMuscleGroups || [],
          equipment: workout.equipment || ['bodyweight']
        });
      }
    });
    
    // Add rest days
    restDays.forEach(dayNum => {
      days.push({
        dayNumber: dayNum,
        name: 'Rest Day',
        description: 'Recovery day - light stretching or walking recommended',
        exercises: [],
        isRestDay: true,
        workoutId: `rest-week${weekNumber}-day${dayNum}`,
        type: 'rest',
        difficulty: 'beginner',
        duration: 0
      });
    });
    
    // Sort days by day number
    return days.sort((a, b) => a.dayNumber - b.dayNumber);
  }

  private createProgressedWeek(baseWeek: any, weekNumber: number): any {
    const newWeek = JSON.parse(JSON.stringify(baseWeek));
    newWeek.weekNumber = weekNumber;
    
    // Apply progression to all exercises in the week
    newWeek.days = newWeek.days.map((day: any) => ({
      ...day,
      exercises: day.exercises.map((exercise: any) => 
        this.applyExerciseProgression(exercise, weekNumber, weekNumber - 1)
      )
    }));
    
    return newWeek;
  }

  private applyExerciseProgression(exercise: any, progressionMultiplier: number, weekIndex: number): any {
    const progressedExercise = JSON.parse(JSON.stringify(exercise));
    
    // Base values with safe defaults
    const baseSets = exercise.sets || 3;
    const baseReps = exercise.reps || 10;
    const baseRestTime = exercise.restTime || 60;
    
    // Progressive overload formulas based on week
    switch (weekIndex) {
      case 0: // Week 1 - Base week
        progressedExercise.sets = baseSets;
        progressedExercise.reps = baseReps;
        progressedExercise.restTime = baseRestTime;
        break;
        
      case 1: // Week 2 - Increase volume
        progressedExercise.sets = Math.min(baseSets + 1, 6); // Cap at 6 sets
        progressedExercise.reps = Math.min(baseReps + 2, 20); // Cap at 20 reps
        progressedExercise.restTime = Math.max(baseRestTime - 5, 30); // Min 30 seconds rest
        break;
        
      case 2: // Week 3 - Peak week
        progressedExercise.sets = Math.min(baseSets + 2, 6); // Cap at 6 sets
        progressedExercise.reps = Math.min(baseReps + 4, 25); // Cap at 25 reps
        progressedExercise.restTime = Math.max(baseRestTime - 10, 30); // Min 30 seconds rest
        break;
        
      default: // Fallback for any additional weeks
        progressedExercise.sets = Math.min(baseSets + weekIndex, 6);
        progressedExercise.reps = Math.min(baseReps + (weekIndex * 2), 25);
        progressedExercise.restTime = Math.max(baseRestTime - (weekIndex * 5), 30);
    }
    
    // Add progression notes for user guidance
    if (weekIndex > 0) {
      const progressionNote = this.generateProgressionNote(weekIndex + 1, baseSets, baseReps);
      progressedExercise.progressionNote = progressionNote;
    }
    
    return progressedExercise;
  }

  private generateProgressionNote(weekNumber: number, originalSets: number, originalReps: number): string {
    switch (weekNumber) {
      case 2:
        return `📈 Week 2: Increased volume from ${originalSets}x${originalReps} - focus on maintaining good form`;
      case 3:
        return `🔥 Week 3: Peak intensity from ${originalSets}x${originalReps} - push your limits safely`;
      default:
        return `💪 Progressive overload applied - challenge yourself while maintaining proper form`;
    }
  }

  // ============================================================================
  // INTELLIGENT WORKOUT FEATURES (Consolidated from intelligentWorkoutService)
  // ============================================================================

  /**
   * Auto-applies intelligent adaptations to workout plans (AUTOMATIC)
   */
  private async autoApplyIntelligentAdaptations(workoutPlan: any, userProfile: any): Promise<any> {
    try {
      console.log('🧠 Auto-applying intelligent adaptations...')
      
      // Apply injury prevention automatically
      const injuryAdaptedPlan = await this.adaptForInjuryPrevention(
        workoutPlan,
        userProfile,
        userProfile.injuryHistory || []
      )
      
      // Apply progressive overload to each workout
      let enhancedPlan = { ...injuryAdaptedPlan.adaptedWorkout }
      
      if (enhancedPlan.workouts && Array.isArray(enhancedPlan.workouts)) {
        for (let i = 0; i < enhancedPlan.workouts.length; i++) {
          const progressionLevel = Math.min(i + 2, 6) // Progressive difficulty 2-6
          enhancedPlan.workouts[i] = await this.generateProgressiveWorkout(
            enhancedPlan.workouts[i],
            progressionLevel,
            userProfile.goals || []
          )
        }
      }
      
      // Add intelligent metadata
      enhancedPlan.intelligentFeatures = {
        injuryPrevention: true,
        progressiveOverload: true,
        autoAdaptations: true,
        adaptationReasons: injuryAdaptedPlan.modifications,
        warmupRecommendations: injuryAdaptedPlan.warmupRecommendations,
        cooldownRecommendations: injuryAdaptedPlan.cooldownRecommendations
      }
      
      console.log('✅ Intelligent adaptations applied automatically')
      return enhancedPlan
      
    } catch (error) {
      console.error('Error applying intelligent adaptations:', error)
      return workoutPlan // Fallback to original plan
    }
  }

  /**
   * Adapts workout for injury prevention (AUTOMATIC)
   */
  async adaptForInjuryPrevention(
    workout: any,
    userProfile: any,
    injuryHistory?: string[]
  ): Promise<{
    adaptedWorkout: any
    modifications: string[]
    warmupRecommendations: string[]
    cooldownRecommendations: string[]
  }> {
    const adaptedWorkout = JSON.parse(JSON.stringify(workout))
    const modifications: string[] = []
    
    // Process both data structures: workouts array or weeks structure
    const workoutsToProcess = adaptedWorkout.workouts || 
      (adaptedWorkout.weeks ? adaptedWorkout.weeks.flatMap((w: any) => w.days.flatMap((d: any) => ({ exercises: d.exercises }))) : [])
    
    for (const workoutItem of workoutsToProcess) {
      if (!workoutItem.exercises) continue
      
      for (let i = 0; i < workoutItem.exercises.length; i++) {
        const exercise = workoutItem.exercises[i]
        const exerciseData = exercise.exercise || exercise
        
        try {
          // Use default injury modifications
          const exerciseGuidance = {
            injuryModifications: ['Reduce range of motion', 'Use lighter weight', 'Modify tempo'],
            formCues: ['Focus on proper form', 'Control the movement', 'Don\'t sacrifice form for weight'],
            commonMistakes: []
          }

          // Apply injury-specific modifications
          if (injuryHistory?.some(injury => 
            exerciseData?.muscleGroups?.some((muscle: string) => 
              injury.toLowerCase().includes(muscle.toLowerCase())
            )
          )) {
            // Reduce intensity for injury-prone areas
            exercise.sets = Math.max((exercise.sets || 3) - 1, 1)
            exercise.reps = Math.ceil((exercise.reps || 10) * 0.8)
            exercise.notes = `🩹 Modified for injury prevention: ${exerciseGuidance.injuryModifications.join(', ')}`
            modifications.push(`Modified ${exerciseData?.name || exercise.name} for injury prevention`)
          }

          // Add form cues automatically to prevent common mistakes
          exercise.formCues = exerciseGuidance.formCues || ['Focus on proper form']
          exercise.commonMistakes = exerciseGuidance.commonMistakes || []
          
        } catch (error) {
          console.error(`Error applying injury prevention for ${exerciseData?.name}:`, error)
          // Add basic form cues as fallback
          exercise.formCues = ['Focus on proper form', 'Control the movement']
        }
      }
    }

    return {
      adaptedWorkout,
      modifications,
      warmupRecommendations: [
        '🔥 Dynamic stretching for target muscle groups',
        '⚡ Light cardio for 5-10 minutes',
        '🎯 Joint mobility exercises',
        '💪 Activation exercises for working muscles'
      ],
      cooldownRecommendations: [
        '🧘 Static stretching for worked muscles',
        '🎳 Foam rolling for muscle recovery',
        '💨 Deep breathing for stress relief',
        '❄️ Cool down with light walking'
      ]
    }
  }

  /**
   * Generates progressive workout with intelligent overload (AUTOMATIC)
   */
  async generateProgressiveWorkout(
    baseWorkout: any,
    progressionLevel: number, // 1-10 scale
    userGoals: string[]
  ): Promise<any> {
    const progressiveWorkout = JSON.parse(JSON.stringify(baseWorkout))

    if (!progressiveWorkout.exercises) return progressiveWorkout

    // Apply progressive overload principles
    progressiveWorkout.exercises = progressiveWorkout.exercises.map((exercise: any) => {
      const progressedExercise = { ...exercise }

      // Increase intensity based on progression level
      if (progressionLevel <= 3) {
        // Beginner progression: increase reps
        progressedExercise.reps = Math.ceil((exercise.reps || 10) * (1 + progressionLevel * 0.1))
      } else if (progressionLevel <= 6) {
        // Intermediate progression: increase sets and reps
        progressedExercise.sets = Math.min((exercise.sets || 3) + 1, 5)
        progressedExercise.reps = Math.ceil((exercise.reps || 10) * (1 + progressionLevel * 0.05))
      } else {
        // Advanced progression: focus on intensity and complexity
        progressedExercise.sets = Math.min((exercise.sets || 3) + 1, 6)
        progressedExercise.reps = Math.ceil((exercise.reps || 10) * 1.2)
        progressedExercise.restTime = Math.max((exercise.restTime || 60) - 10, 30)
      }

      return progressedExercise
    })

    // Add progression notes
    progressiveWorkout.progressionNotes = [
      `📈 Progression level ${progressionLevel}/10`,
      '🎯 Focus on proper form as intensity increases',
      '⚠️ Monitor fatigue and adjust if needed'
    ]

    return progressiveWorkout
  }

  /**
   * Adapts workout based on user feedback (AUTOMATIC)
   */
  async adaptWorkoutBasedOnFeedback(
    userId: string, 
    currentWorkout: any, 
    feedback: UserFeedback
  ): Promise<AdaptationResult> {
    // Store feedback for pattern analysis
    this.storeFeedback(userId, feedback)
    
    // Get historical performance
    const metrics = this.calculatePerformanceMetrics(userId)
    
    // Detect if adaptation is needed
    const adaptationNeeded = this.shouldAdaptWorkout(feedback, metrics)
    
    if (!adaptationNeeded) {
      return {
        adaptedWorkout: currentWorkout,
        adaptationReasons: ['✅ Performance within optimal range'],
        progressionNotes: ['Continue with current routine'],
        difficultyAdjustment: 0,
        timeAdjustment: 0
      }
    }

    // Apply rule-based adaptations
    const ruleBasedAdaptation = this.applyRuleBasedAdaptations(currentWorkout, feedback, metrics)

    // Try AI-based adaptations
    let aiAdaptation
    try {
      aiAdaptation = await api.post('/workout-adaptation', {
        feedback: {
          completionRate: feedback.completionRate,
          difficultyRating: feedback.difficultyRating,
          timeConstraints: feedback.timeToComplete,
          equipmentChanges: feedback.equipmentIssues,
          injuryReports: feedback.injuryReports
        },
        currentWorkout
      }).then(res => res.data)
    } catch (error) {
      aiAdaptation = {
        adaptationReasons: ['🤖 AI analysis unavailable, using rule-based adaptations'],
        workoutModifications: {},
        progressionNotes: ['Focus on proper form and consistency']
      }
    }

    // Combine AI and rule-based adaptations
    return this.combineAdaptations(aiAdaptation, ruleBasedAdaptation)
  }

  /**
   * Detects plateaus and recommends changes (AUTOMATIC)
   */
  async detectPlateauAndRecommendChanges(userId: string): Promise<{
    plateauDetected: boolean
    plateauType: 'strength' | 'endurance' | 'motivation' | 'none'
    recommendations: string[]
    workoutModifications: any
  }> {
    const metrics = this.calculatePerformanceMetrics(userId)
    const workoutHistory = this.getFeedbackHistory(userId)

    // Detect plateau patterns
    const strengthPlateau = this.detectStrengthPlateau(metrics)
    const motivationPlateau = this.detectMotivationPlateau(metrics)
    const endurancePlateau = this.detectEndurancePlateau(metrics)

    if (!strengthPlateau && !motivationPlateau && !endurancePlateau) {
      return {
        plateauDetected: false,
        plateauType: 'none',
        recommendations: ['Continue with current routine'],
        workoutModifications: {}
      }
    }

    // Use AI for detailed analysis
    let aiAnalysis
    try {
      aiAnalysis = await api.post('/plateau-detection', {
        workoutHistory,
        performanceMetrics: metrics
      }).then(res => res.data)
    } catch (error) {
      aiAnalysis = {
        recommendations: ['🔄 Vary your routine', '⚡ Adjust intensity', '📈 Focus on progressive overload'],
        workoutModifications: {}
      }
    }

    // Determine primary plateau type
    let plateauType: 'strength' | 'endurance' | 'motivation' = 'strength'
    if (motivationPlateau) plateauType = 'motivation'
    else if (endurancePlateau) plateauType = 'endurance'

    return {
      plateauDetected: true,
      plateauType,
      recommendations: aiAnalysis.recommendations,
      workoutModifications: aiAnalysis.workoutModifications
    }
  }

  /**
   * Generates exercise alternatives automatically when needed
   */
  async generateExerciseAlternatives(
    exercise: any,
    reason: 'equipment' | 'injury' | 'difficulty' | 'plateau',
    context: {
      availableEquipment?: string[]
      injuryAreas?: string[]
      currentDifficulty?: string
      targetDifficulty?: string
    }
  ): Promise<{
    alternatives: any[]
    reasoning: string[]
    progressionPath?: string[]
  }> {
    try {
      // Get alternatives from WGER based on muscle groups
      const wgerAlternatives = await wgerService.fetchExercises({
        muscles: exercise.muscleGroups || [],
        equipment: context.availableEquipment || [],
        limit: 10
      })

      // Use default alternatives
      const aiAlternatives = { 
        progressiveAdjustments: [
          'Reduce weight or use bodyweight variation',
          'Increase weight or add tempo variation',
          'Add pause at peak contraction'
        ] 
      }

      // Filter and rank alternatives based on context
      const rankedAlternatives = this.rankExerciseAlternatives(
        wgerAlternatives,
        exercise,
        reason,
        context
      )

      return {
        alternatives: rankedAlternatives.slice(0, 5),
        reasoning: this.generateAlternativeReasonings(reason, context),
        progressionPath: aiAlternatives.progressiveAdjustments
      }
    } catch (error) {
      console.error('Error generating exercise alternatives:', error)
      return {
        alternatives: [],
        reasoning: ['Unable to generate alternatives at this time'],
        progressionPath: []
      }
    }
  }

  /**
   * Automatically collect workout feedback after session completion
   */
  async autoCollectWorkoutFeedback(userId: string, workoutId: string, sessionData: {
    completionRate: number
    duration: number
    exercises: any[]
    notes?: string
    rating?: number
  }): Promise<void> {
    const feedback: UserFeedback = {
      workoutId,
      completionRate: sessionData.completionRate,
      difficultyRating: sessionData.rating || 3,
      timeToComplete: sessionData.duration,
      injuryReports: [],
      equipmentIssues: [],
      notes: sessionData.notes || '',
      rating: sessionData.rating || 3
    }

    // Store feedback
    this.storeFeedback(userId, feedback)

    // Automatically adapt next workout if needed
    try {
      const currentWorkout = this.getCurrentPlan()?.workouts?.[0]
      if (currentWorkout) {
        const adaptation = await this.adaptWorkoutBasedOnFeedback(userId, currentWorkout, feedback)
        
        if (adaptation.adaptationReasons.length > 0) {
          console.log('🧠 Auto-adapted next workout based on feedback:', adaptation.adaptationReasons)
        }
      }
    } catch (error) {
      console.error('Error auto-adapting workout:', error)
    }

    // Check for plateaus automatically
    try {
      const plateauAnalysis = await this.detectPlateauAndRecommendChanges(userId)
      if (plateauAnalysis.plateauDetected) {
        console.log(`🔄 Plateau detected (${plateauAnalysis.plateauType}):`, plateauAnalysis.recommendations)
      }
    } catch (error) {
      console.error('Error detecting plateau:', error)
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private validateWorkoutPlan(plan: WorkoutPlan): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check basic structure
    if (!plan || !plan.weeks) {
      errors.push('Invalid workout plan structure');
      return { isValid: false, errors };
    }
    
    // Check each week has days
    for (const week of plan.weeks) {
      if (!week.days || week.days.length === 0) {
        errors.push('Week has no workout days');
      }
      
      // Check each day has exercises
      for (const day of week.days) {
        if (!day.exercises || day.exercises.length === 0) {
          errors.push('Workout day has no exercises');
        }
        
        // Check exercise structure
        for (const exercise of day.exercises) {
          if (!exercise.name && !exercise.exercise?.name) {
            errors.push('Exercise missing name');
          }
          if (!exercise.sets && !exercise.reps) {
            errors.push('Exercise missing sets or reps');
          }
        }
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  private async fixWorkoutPlanIssues(plan: WorkoutPlan, errors: string[]): Promise<WorkoutPlan> {
    let fixedPlan = { ...plan };
    
    try {
      // If weeks are missing, create basic structure
      if (!fixedPlan.weeks || fixedPlan.weeks.length === 0) {
        fixedPlan.weeks = [
          {
            weekNumber: 1,
            days: []
          }
        ];
      }
      
      // Fix weeks with no days
      for (let weekIndex = 0; weekIndex < fixedPlan.weeks.length; weekIndex++) {
        const week = fixedPlan.weeks[weekIndex];
        if (!week.days || week.days.length === 0) {
          week.days = [
            {
              dayNumber: 1,
              name: 'Full Body Workout',
              exercises: []
            }
          ];
        }
        
        // Fix days with no exercises
        for (let dayIndex = 0; dayIndex < week.days.length; dayIndex++) {
          const day = week.days[dayIndex];
          if (!day.exercises || day.exercises.length === 0) {
            day.exercises = [
              {
                name: 'Push-ups',
                sets: 3,
                reps: 10,
                restTime: 60,
                notes: 'Basic bodyweight exercise'
              },
              {
                name: 'Squats',
                sets: 3,
                reps: 12,
                restTime: 60,
                notes: 'Basic lower body exercise'
              }
            ];
          }
          
          // Fix exercises with missing data
          for (let exerciseIndex = 0; exerciseIndex < day.exercises.length; exerciseIndex++) {
            const exercise = day.exercises[exerciseIndex];
            if (!exercise.name && !exercise.exercise?.name) {
              exercise.name = 'Basic Exercise';
            }
            if (!exercise.sets) {
              exercise.sets = 3;
            }
            if (!exercise.reps) {
              exercise.reps = 10;
            }
            if (!exercise.restTime) {
              exercise.restTime = 60;
            }
          }
        }
      }
      
      return fixedPlan;
    } catch (error) {
      console.error('Error fixing workout plan:', error);
      return plan; // Return original if fixing fails
    }
  }

  private async getEmergencyFallbackPlan(userProfile?: UserProfile): Promise<WorkoutPlan> {
    // Return a basic, guaranteed-working workout plan
    return {
      id: `emergency-${Date.now()}`,
      name: 'Emergency Workout Plan',
      description: 'Basic full-body workout plan for when other generation methods fail',
      weeks: [
        {
          weekNumber: 1,
          days: [
            {
              dayNumber: 1,
              name: 'Full Body Day 1',
              exercises: [
                {
                  name: 'Push-ups',
                  sets: 3,
                  reps: 10,
                  restTime: 60,
                  notes: 'Bodyweight chest exercise'
                },
                {
                  name: 'Squats',
                  sets: 3,
                  reps: 12,
                  restTime: 60,
                  notes: 'Bodyweight leg exercise'
                },
                {
                  name: 'Plank',
                  sets: 3,
                  reps: 30,
                  restTime: 45,
                  notes: 'Core stability exercise'
                }
              ]
            }
          ]
        },
        {
          weekNumber: 2,
          days: [
            {
              dayNumber: 1,
              name: 'Full Body Day 1',
              exercises: [
                {
                  name: 'Push-ups',
                  sets: 3,
                  reps: 12,
                  restTime: 60,
                  notes: 'Increased reps for progression'
                },
                {
                  name: 'Squats',
                  sets: 3,
                  reps: 15,
                  restTime: 60,
                  notes: 'Increased reps for progression'
                },
                {
                  name: 'Plank',
                  sets: 3,
                  reps: 35,
                  restTime: 45,
                  notes: 'Increased hold time'
                }
              ]
            }
          ]
        },
        {
          weekNumber: 3,
          days: [
            {
              dayNumber: 1,
              name: 'Full Body Day 1',
              exercises: [
                {
                  name: 'Push-ups',
                  sets: 4,
                  reps: 12,
                  restTime: 60,
                  notes: 'Added extra set'
                },
                {
                  name: 'Squats',
                  sets: 4,
                  reps: 15,
                  restTime: 60,
                  notes: 'Added extra set'
                },
                {
                  name: 'Plank',
                  sets: 3,
                  reps: 40,
                  restTime: 45,
                  notes: 'Extended hold time'
                }
              ]
            }
          ]
        }
      ],
      difficulty: 'beginner',
      estimatedDuration: 30,
      equipment: ['bodyweight'],
      createdAt: new Date(),
      source: 'emergency_fallback'
    };
  }

  private storeFeedback(userId: string, feedback: UserFeedback): void {
    if (!this.userFeedbackHistory.has(userId)) {
      this.userFeedbackHistory.set(userId, [])
    }
    
    const userFeedback = this.userFeedbackHistory.get(userId)!
    userFeedback.push(feedback)
    
    // Keep only last 20 feedback entries
    if (userFeedback.length > 20) {
      userFeedback.splice(0, userFeedback.length - 20)
    }
  }

  private calculatePerformanceMetrics(userId: string): PerformanceMetrics {
    const feedback = this.getFeedbackHistory(userId)
    
    if (feedback.length === 0) {
      return {
        strengthProgress: [],
        completionRates: [],
        difficultyRatings: [],
        timeToCompletion: [],
        consistencyScore: 0
      }
    }

    return {
      strengthProgress: feedback.map(f => f.rating || 0),
      completionRates: feedback.map(f => f.completionRate),
      difficultyRatings: feedback.map(f => f.difficultyRating),
      timeToCompletion: feedback.map(f => f.timeToComplete),
      consistencyScore: this.calculateConsistencyScore(feedback)
    }
  }

  private shouldAdaptWorkout(feedback: UserFeedback, metrics: PerformanceMetrics): boolean {
    // Check if completion rate is consistently low
    if (feedback.completionRate < 70) return true
    
    // Check if difficulty is too high/low
    if (feedback.difficultyRating <= 1 || feedback.difficultyRating >= 5) return true
    
    // Check for injury reports
    if (feedback.injuryReports && feedback.injuryReports.length > 0) return true
    
    // Check for equipment issues
    if (feedback.equipmentIssues && feedback.equipmentIssues.length > 0) return true
    
    // Check for plateau patterns in metrics
    if (metrics.consistencyScore < 0.5) return true
    
    return false
  }

  private applyRuleBasedAdaptations(
    workout: any, 
    feedback: UserFeedback, 
    metrics: PerformanceMetrics
  ): Partial<AdaptationResult> {
    const adaptations: any = { ...workout }
    const reasons: string[] = []
    let difficultyAdjustment = 0
    let timeAdjustment = 0

    // Rule 1: Low completion rate -> reduce volume
    if (feedback.completionRate < 70) {
      if (adaptations.exercises) {
        adaptations.exercises = adaptations.exercises.map((ex: any) => ({
          ...ex,
          sets: Math.max((ex.sets || 3) - 1, 1)
        }))
      }
      reasons.push('📉 Reduced sets due to low completion rate')
      difficultyAdjustment = -0.5
    }

    // Rule 2: Too easy -> increase intensity
    if (feedback.difficultyRating <= 2) {
      if (adaptations.exercises) {
        adaptations.exercises = adaptations.exercises.map((ex: any) => ({
          ...ex,
          reps: (ex.reps || 10) + 2,
          sets: Math.min((ex.sets || 3) + 1, 5)
        }))
      }
      reasons.push('📈 Increased intensity due to low difficulty rating')
      difficultyAdjustment = 0.5
    }

    // Rule 3: Too hard -> reduce intensity
    if (feedback.difficultyRating >= 4.5) {
      if (adaptations.exercises) {
        adaptations.exercises = adaptations.exercises.map((ex: any) => ({
          ...ex,
          reps: Math.max((ex.reps || 10) - 2, 5),
          restTime: (ex.restTime || 60) + 15
        }))
      }
      reasons.push('📉 Reduced intensity due to high difficulty rating')
      difficultyAdjustment = -0.5
    }

    // Rule 4: Time constraints -> prioritize compound movements
    if (feedback.timeToComplete > (workout.duration || 45) * 1.2) {
      if (adaptations.exercises) {
        adaptations.exercises = adaptations.exercises.map((ex: any) => ({
          ...ex,
          restTime: Math.max((ex.restTime || 60) - 10, 30)
        }))
      }
      reasons.push('⏱️ Reduced rest time due to time constraints')
      timeAdjustment = -10
    }

    return {
      adaptedWorkout: adaptations,
      adaptationReasons: reasons,
      difficultyAdjustment,
      timeAdjustment
    }
  }

  private combineAdaptations(
    aiAdaptation: any, 
    ruleAdaptation: Partial<AdaptationResult>
  ): AdaptationResult {
    return {
      adaptedWorkout: ruleAdaptation.adaptedWorkout || aiAdaptation.adaptedWorkout,
      adaptationReasons: [
        ...(aiAdaptation.adaptationReasons || []),
        ...(ruleAdaptation.adaptationReasons || [])
      ],
      progressionNotes: [
        ...(aiAdaptation.progressionNotes || []),
        '🤖 System applied rule-based optimizations'
      ],
      difficultyAdjustment: ruleAdaptation.difficultyAdjustment || 0,
      timeAdjustment: ruleAdaptation.timeAdjustment || 0
    }
  }

  private rankExerciseAlternatives(
    alternatives: any[],
    originalExercise: any,
    reason: string,
    context: any
  ): any[] {
    return alternatives
      .filter(alt => alt.id !== originalExercise.id)
      .map(alt => ({
        ...alt,
        relevanceScore: this.calculateRelevanceScore(alt, originalExercise, reason, context)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  private calculateRelevanceScore(
    alternative: any,
    original: any,
    reason: string,
    context: any
  ): number {
    let score = 0

    // Base score for muscle group overlap
    const muscleOverlap = this.calculateMuscleOverlap(alternative.muscles, original.muscleGroups)
    score += muscleOverlap * 10

    // Adjust for reason-specific factors
    switch (reason) {
      case 'equipment':
        if (context.availableEquipment?.some((eq: string) => alternative.equipment.includes(eq))) {
          score += 5
        }
        break
      case 'difficulty':
        if (alternative.difficulty === context.targetDifficulty) {
          score += 5
        }
        break
      case 'injury':
        // Prefer bodyweight or low-impact alternatives
        if (alternative.equipment.includes('bodyweight')) {
          score += 3
        }
        break
    }

    return score
  }

  private calculateMuscleOverlap(muscles1: string[], muscles2: string[]): number {
    if (!muscles1 || !muscles2) return 0
    
    const overlap = muscles1.filter(m1 => 
      muscles2.some(m2 => m1.toLowerCase().includes(m2.toLowerCase()) || m2.toLowerCase().includes(m1.toLowerCase()))
    )
    
    return overlap.length / Math.max(muscles1.length, muscles2.length)
  }

  private generateAlternativeReasonings(reason: string, context: any): string[] {
    switch (reason) {
      case 'equipment':
        return [
          '🔧 Alternative exercises using available equipment',
          '💪 Maintains similar muscle activation patterns',
          '⚙️ Adjusted for equipment limitations'
        ]
      case 'injury':
        return [
          '🩹 Modified exercises to avoid injury-prone movements',
          '🛡️ Reduced impact while maintaining effectiveness',
          '🎯 Focus on safe range of motion'
        ]
      case 'difficulty':
        return [
          '⚖️ Adjusted difficulty to match current fitness level',
          '📈 Progressive exercise selection',
          '🎯 Maintains training stimulus'
        ]
      case 'plateau':
        return [
          '🔄 Varied exercises to overcome adaptation',
          '🧠 Different movement patterns for muscle confusion',
          '✨ Enhanced training variety'
        ]
      default:
        return ['🔄 General exercise alternatives provided']
    }
  }

  private detectStrengthPlateau(metrics: PerformanceMetrics): boolean {
    if (metrics.strengthProgress.length < 4) return false
    
    const recent = metrics.strengthProgress.slice(-4)
    const progressVariance = this.calculateVariance(recent)
    
    return progressVariance < 0.1 // Very low variance indicates plateau
  }

  private detectMotivationPlateau(metrics: PerformanceMetrics): boolean {
    if (metrics.completionRates.length < 3) return false
    
    const recent = metrics.completionRates.slice(-3)
    const averageCompletion = recent.reduce((sum, rate) => sum + rate, 0) / recent.length
    
    return averageCompletion < 60 // Consistently low completion
  }

  private detectEndurancePlateau(metrics: PerformanceMetrics): boolean {
    if (metrics.timeToCompletion.length < 3) return false
    
    const recent = metrics.timeToCompletion.slice(-3)
    const timeVariance = this.calculateVariance(recent)
    
    return timeVariance < 5 // Very consistent times might indicate plateau
  }

  private calculateConsistencyScore(feedback: UserFeedback[]): number {
    if (feedback.length === 0) return 0
    
    const completionRates = feedback.map(f => f.completionRate)
    const averageCompletion = completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length
    
    return averageCompletion / 100
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length
  }

  private getFeedbackHistory(userId: string): UserFeedback[] {
    return this.userFeedbackHistory.get(userId) || []
  }

  // Centralized error reporting
  private reportError(operation: string, error: any, context: any = {}): void {
    try {
      if (typeof window !== 'undefined' && (window as any).workoutServiceErrors) {
        (window as any).workoutServiceErrors.addError(operation, error, context);
      }
      
      // Track API performance if this was an API-related error
      if (typeof window !== 'undefined' && (window as any).workoutServicePerformance) {
        (window as any).workoutServicePerformance.addCall(operation, 0, false);
      }
    } catch (reportingError) {
      console.warn('⚠️ Failed to report error:', reportingError);
    }
  }

  // Performance tracking wrapper for API calls
  private async trackPerformance<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    let success = false;
    
    try {
      const result = await fn();
      success = true;
      return result;
    } catch (error) {
      this.reportError(operation, error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      
      if (typeof window !== 'undefined' && (window as any).workoutServicePerformance) {
        (window as any).workoutServicePerformance.addCall(operation, duration, success);
      }
    }
  }

  // Production-ready end-to-end flow test
  async testCompleteUserFlow(testUserProfile: any = null): Promise<{
    success: boolean;
    results: any;
    errors: any[];
    performance: any;
  }> {
    console.log('🧪 Starting comprehensive end-to-end workout generation test...');
    
    const testProfile = testUserProfile || {
      experienceLevel: 'intermediate',
      fitnessLevel: 'intermediate',
      goals: ['strength', 'weight-loss'],
      availableEquipment: ['bodyweight', 'dumbbell'],
      daysPerWeek: 3,
      preferredWorkoutDuration: 45,
      injuryHistory: []
    };
    
    const testResults = {
      success: false,
      results: {} as any,
      errors: [] as any[],
      performance: {} as any
    };
    
    const startTime = Date.now();
    
    try {
      console.log('📋 Test 1: Checking free workout generation limits...');
      const freeCheck = await canGenerateFreeWorkout(testProfile);
      testResults.results.freeCheck = freeCheck;
      
      if (!freeCheck.canGenerate) {
        console.log('⚠️ Free generation limit reached, but continuing test...');
      }
      
      console.log('📋 Test 2: Generating comprehensive workout plan...');
      const plan = await this.generateComprehensiveWorkoutPlan(testProfile);
      testResults.results.plan = {
        id: plan.id,
        name: plan.name,
        workoutCount: plan.workouts?.length || 0,
        weekCount: plan.weeks?.length || 0,
        hasExercises: this.validatePlanHasExercises(plan)
      };
      
      console.log('📋 Test 3: Validating plan structure...');
      const validation = workoutService.validateWorkoutPlan(plan);
      testResults.results.validation = validation;
      
      if (!validation.isValid) {
        testResults.errors.push('Plan validation failed: ' + validation.errors.join(', '));
      }
      
      console.log('📋 Test 4: Testing variety analysis...');
      const varietyReport = this.analyzeExerciseVariety(plan);
      testResults.results.variety = varietyReport;
      
      console.log('📋 Test 5: Testing localStorage persistence...');
      const storageTest = this.testStoragePersistence(plan);
      testResults.results.storage = storageTest;
      
      console.log('📋 Test 6: Testing plan retrieval...');
      const retrievedPlan = this.getCurrentPlan();
      testResults.results.retrieval = {
        success: !!retrievedPlan,
        matches: retrievedPlan?.id === plan.id
      };
      
      console.log('📋 Test 7: Testing workout logging...');
      this.logWorkout('test-workout', [
        {
          exerciseId: 'test-exercise',
          sets: 3,
          reps: 10,
          weight: 0,
          restTime: 60,
          notes: 'Test workout log entry'
        }
      ], 'End-to-end test workout');
      
      const logs = this.getWorkoutLogs();
      testResults.results.logging = {
        success: logs.length > 0,
        lastLogId: logs[logs.length - 1]?.id
      };
      
      console.log('📋 Test 8: Testing progress tracking...');
      const progress = this.getProgress();
      testResults.results.progress = progress;
      
      // Collect performance metrics
      if (typeof window !== 'undefined' && (window as any).workoutServicePerformance) {
        testResults.performance = (window as any).workoutServicePerformance.getStats();
      }
      
      testResults.success = testResults.errors.length === 0;
      
      const totalTime = Date.now() - startTime;
      console.log(`${testResults.success ? '✅' : '❌'} End-to-end test completed in ${totalTime}ms`, {
        success: testResults.success,
        errorCount: testResults.errors.length,
        performance: testResults.performance
      });
      
    } catch (error) {
      console.error('❌ End-to-end test failed:', error);
      testResults.errors.push(error.message);
      this.reportError('testCompleteUserFlow', error, { testProfile });
    }
    
    return testResults;
  }

  private validatePlanHasExercises(plan: WorkoutPlan): boolean {
    if (plan.workouts && plan.workouts.length > 0) {
      return plan.workouts.some(workout => 
        workout.exercises && workout.exercises.length > 0
      );
    }
    
    if (plan.weeks && plan.weeks.length > 0) {
      return plan.weeks.some(week => 
        week.days.some(day => 
          day.exercises && day.exercises.length > 0
        )
      );
    }
    
    return false;
  }

  private testStoragePersistence(plan: WorkoutPlan): { save: boolean; load: boolean } {
    try {
      // Test saving
      const testKey = 'test-workout-plan';
      localStorage.setItem(testKey, JSON.stringify(plan));
      
      // Test loading
      const loaded = localStorage.getItem(testKey);
      const parsed = loaded ? JSON.parse(loaded) : null;
      
      // Cleanup
      localStorage.removeItem(testKey);
      
      return {
        save: true,
        load: parsed?.id === plan.id
      };
    } catch (error) {
      return { save: false, load: false };
    }
  }

  // Public method to get performance metrics for monitoring
  getPerformanceMetrics(): any {
    if (typeof window !== 'undefined' && (window as any).workoutServicePerformance) {
      return (window as any).workoutServicePerformance.getStats();
    }
    return null;
  }

  // Public method to get error history for debugging
  getErrorHistory(): any[] {
    if (typeof window !== 'undefined' && (window as any).workoutServiceErrors) {
      return (window as any).workoutServiceErrors.getErrors();
    }
    return [];
  }

  // Clear error history
  clearErrorHistory(): void {
    if (typeof window !== 'undefined' && (window as any).workoutServiceErrors) {
      (window as any).workoutServiceErrors.clearErrors();
    }
  }

  // Generate contextual workout names using AI
  async generateWorkoutNames(planGoal: string, numberOfWorkouts: number, workoutTypes: string[] = []): Promise<string[]> {
    try {
      logger.workout.info(`Generating ${numberOfWorkouts} workout names for goal: ${planGoal}`);
      
      const response = await api.post('/api/generate-workout-names', {
        planGoal,
        numberOfWorkouts,
        workoutTypes
      });

      if (response.data.success && Array.isArray(response.data.workoutNames)) {
        logger.workout.info(`Successfully generated ${response.data.workoutNames.length} workout names`);
        return response.data.workoutNames;
      } else {
        throw new Error('Invalid response format from workout names API');
      }
    } catch (error) {
      logger.workout.error('Error generating workout names, using fallback', error);
      return this.getFallbackWorkoutNames(planGoal, numberOfWorkouts);
    }
  }

  // Fallback workout names for when API fails
  private getFallbackWorkoutNames(planGoal: string, numberOfWorkouts: number): string[] {
    const fallbackNames: Record<string, string[]> = {
      'strength': [
        'Power Builder Session',
        'Strength Foundation Day',
        'Muscle Forge Workout',
        'Iron Will Training',
        'Heavy Hitter Session',
        'Strength Sculptor',
        'Power Development Day'
      ],
      'endurance': [
        'Endurance Builder Day',
        'Cardio Power Session', 
        'Stamina Surge Workout',
        'Distance Destroyer',
        'Aerobic Capacity Builder',
        'Endurance Engine',
        'Cardio Crusher'
      ],
      'weight-loss': [
        'Fat Burn Blast',
        'Metabolic Meltdown',
        'Calorie Crusher Session',
        'Lean Body Builder',
        'Fat Loss Accelerator',
        'Metabolic Booster',
        'Body Sculptor Workout'
      ],
      'hiit': [
        'HIIT Power Session',
        'Interval Intensity',
        'High Energy Blast',
        'Tabata Torch',
        'Interval Inferno',
        'HIIT Hammer',
        'Sprint & Sweat'
      ],
      'flexibility': [
        'Flexibility Flow',
        'Mobility Master',
        'Stretch & Strengthen',
        'Recovery Flow Session',
        'Flexibility Builder',
        'Movement Medicine',
        'Mobility Restoration'
      ]
    };

    // Find the best matching category
    const goalLower = planGoal.toLowerCase();
    let category = 'strength'; // default
    
    for (const [key, _] of Object.entries(fallbackNames)) {
      if (goalLower.includes(key)) {
        category = key;
        break;
      }
    }

    const availableNames = fallbackNames[category] || fallbackNames['strength'];
    const names = [];
    
    for (let i = 0; i < numberOfWorkouts; i++) {
      if (i < availableNames.length) {
        names.push(availableNames[i]);
      } else {
        names.push(`${availableNames[i % availableNames.length]} ${Math.floor(i / availableNames.length) + 1}`);
      }
    }
    
    logger.workout.info(`Using fallback workout names for goal "${planGoal}" (category: ${category})`);
    return names;
  }
}

export const workoutService = WorkoutService.getInstance();

// Production-ready retry wrapper with comprehensive error handling
export async function retry<T>(
  fn: () => Promise<T>, 
  retries = 3, 
  delay = 1000,
  operation = 'API call'
): Promise<T> {
  let lastError: any;
  const startTime = Date.now();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      
      // Log successful retry if it wasn't the first attempt
      if (attempt > 1) {
        console.log(`✅ ${operation} succeeded on attempt ${attempt}/${retries}`, {
          totalTime: Date.now() - startTime,
          attempt,
          operation
        });
      }
      
      return result;
    } catch (err: any) {
      lastError = err;
      
      // Log each retry attempt with context
      console.warn(`⚠️ ${operation} failed (attempt ${attempt}/${retries})`, {
        error: err.message,
        status: err.response?.status,
        attempt,
        operation,
        willRetry: attempt < retries
      });
      
      // Check if error is retryable
      if (!isRetryableError(err)) {
        console.error(`❌ ${operation} failed with non-retryable error:`, err.message);
        throw err;
      }
      
      // Don't wait after the last attempt
      if (attempt < retries) {
        const waitTime = delay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`⏳ Retrying ${operation} in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // All retries exhausted
  console.error(`❌ ${operation} failed after ${retries} attempts`, {
    totalTime: Date.now() - startTime,
    finalError: lastError.message,
    operation
  });
  
  throw new Error(`${operation} failed after ${retries} attempts: ${lastError.message}`);
}

// Enhanced error classification for better retry logic
function isRetryableError(error: any): boolean {
  // Network errors are retryable
  if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNRESET') return true;
  
  // HTTP status codes that are retryable
  if (error.response?.status) {
    const status = error.response.status;
    // 5xx server errors are retryable
    if (status >= 500) return true;
    // 429 (rate limit) is retryable
    if (status === 429) return true;
    // 408 (timeout) is retryable
    if (status === 408) return true;
  }
  
  // Timeout errors are retryable
  if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') return true;
  
  // OpenAI specific retryable errors
  if (error.message?.includes('overloaded') || error.message?.includes('rate limit')) return true;
  
  // WGER API specific retryable errors
  if (error.message?.includes('temporarily unavailable')) return true;
  
  // 4xx client errors are generally not retryable (except 429)
  if (error.response?.status >= 400 && error.response?.status < 500) return false;
  
  return true; // Default to retryable for unknown errors
}

// Check if user can generate free workout (3-day trial period)
export async function canGenerateFreeWorkout(user: any): Promise<{ canGenerate: boolean; remaining: number; daysRemaining: number }> {
  try {
    const response = await api.get('/api/workout-plans/check-free-generation');
    return response.data;
  } catch (error) {
    console.error('Error checking free workout generation:', error);
    return { canGenerate: false, remaining: 0, daysRemaining: 0 };
  }
}

// Production-ready workout generation with comprehensive error handling and fallbacks
export async function generateWorkoutPlanWithRetry(userProfile: any): Promise<WorkoutPlan> {
  const workoutService = WorkoutService.getInstance();
  const startTime = Date.now();
  
  console.log('🏋️ Starting workout plan generation with comprehensive pipeline...', {
    userProfile: {
      fitnessLevel: userProfile.experienceLevel || userProfile.fitnessLevel,
      goals: userProfile.goals,
      equipment: userProfile.availableEquipment,
      daysPerWeek: userProfile.daysPerWeek
    }
  });
  
  try {
    // Step 1: Check free workout generation limits first
    const freeCheckResult = await retry(
      () => canGenerateFreeWorkout(userProfile),
      2, 500,
      'Free workout limit check'
    );
    
    if (!freeCheckResult.canGenerate) {
      console.warn('⚠️ Free workout generation limit reached', freeCheckResult);
      throw new Error(`Free workout limit reached. Remaining: ${freeCheckResult.remaining}, Days remaining: ${freeCheckResult.daysRemaining}`);
    }
    
    // Step 2: Attempt comprehensive workout generation with retry logic
    const plan = await retry(
      () => workoutService.generateComprehensiveWorkoutPlan(userProfile),
      3, 1000,
      'Comprehensive workout generation'
    );
    
    // Step 3: Validate the generated plan
    const validationResult = workoutService.validateWorkoutPlan(plan);
    if (!validationResult.isValid) {
      console.warn('⚠️ Generated plan failed validation, attempting to fix...', validationResult.errors);
      
      try {
        const fixedPlan = await workoutService.fixWorkoutPlanIssues(plan, validationResult.errors);
        const revalidation = workoutService.validateWorkoutPlan(fixedPlan);
        
        if (revalidation.isValid) {
          console.log('✅ Plan validation issues fixed successfully');
          return fixedPlan;
        }
      } catch (fixError) {
        console.error('❌ Failed to fix plan validation issues:', fixError);
      }
    }
    
    // Step 4: Log successful generation
    console.log('✅ Workout plan generated successfully', {
      totalTime: Date.now() - startTime,
      planId: plan.id,
      workoutCount: plan.workouts?.length || 0,
      weekCount: plan.weeks?.length || 0
    });
    
    return plan;
    
  } catch (error: any) {
    console.error('❌ Comprehensive workout generation failed, attempting fallback...', {
      error: error.message,
      totalTime: Date.now() - startTime
    });
    
    // Fallback Strategy 1: Try simple workout generation
    try {
      console.log('🔄 Attempting fallback plan generation...');
      const fallbackPlan = await retry(
        () => workoutService.generateWorkoutPlan(userProfile),
        2, 500,
        'Fallback workout generation'
      );
      
      console.log('✅ Fallback plan generated successfully');
      return fallbackPlan;
      
    } catch (fallbackError) {
      console.error('❌ Fallback generation also failed, using emergency fallback...', fallbackError);
      
      // Fallback Strategy 2: Use static fallback plan
      try {
        const emergencyPlan = await workoutService.getEmergencyFallbackPlan(userProfile);
        console.log('✅ Emergency fallback plan loaded');
        return emergencyPlan;
        
      } catch (emergencyError) {
        console.error('❌ Even emergency fallback failed:', emergencyError);
        
        // Final fallback: Basic plan that always works
        const basicPlan = getBasicWorkoutPlan(userProfile);
        console.log('✅ Basic fallback plan generated as last resort');
        return basicPlan;
      }
    }
  }
}

// Basic workout plan that always works (no API dependencies)
function getBasicWorkoutPlan(userProfile: any): WorkoutPlan {
  const basicExercises = getBasicExercisesForWorkout(['fullBody']);
  
  const plan: WorkoutPlan = {
    id: `basic-plan-${Date.now()}`,
    name: 'Basic Full Body Workout',
    description: 'Simple, effective bodyweight workout plan suitable for all fitness levels',
    duration: 1, // 1 week plan
    difficulty: 'beginner',
    targetMuscleGroups: ['chest', 'legs', 'core'],
    workouts: [
      {
        id: `basic-workout-${Date.now()}`,
        name: 'Full Body Workout',
        description: 'Complete bodyweight workout targeting all major muscle groups',
        type: 'strength',
        difficulty: 'beginner',
        duration: 30,
        exercises: basicExercises,
        targetMuscleGroups: ['chest', 'legs', 'core'],
        equipment: ['bodyweight'],
        caloriesBurned: 150,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    weeks: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  console.log('🛡️ Generated basic failsafe workout plan');
  return plan;
}

// Get basic exercises for a workout when exercises are missing
function getBasicExercisesForWorkout(targetMuscleGroups: string[]): any[] {
  const basicExercises = [
    {
      exercise: {
        id: 'pushup-basic',
        name: 'Push-ups',
        description: 'Classic bodyweight exercise for upper body strength',
        muscleGroups: ['chest', 'triceps'],
        equipment: ['bodyweight'],
        difficulty: 'beginner' as const,
        instructions: ['Start in plank position', 'Lower chest to floor', 'Push back up', 'Maintain straight body line']
      },
      sets: 3,
      reps: 10,
      restTime: 60
    },
    {
      exercise: {
        id: 'squat-basic',
        name: 'Squats',
        description: 'Fundamental lower body exercise for leg strength',
        muscleGroups: ['legs'],
        equipment: ['bodyweight'],
        difficulty: 'beginner' as const,
        instructions: ['Stand with feet shoulder-width apart', 'Lower hips back and down', 'Keep chest up', 'Return to standing']
      },
      sets: 3,
      reps: 12,
      restTime: 60
    },
    {
      exercise: {
        id: 'plank-basic',
        name: 'Plank',
        description: 'Core strengthening isometric exercise',
        muscleGroups: ['core'],
        equipment: ['bodyweight'],
        difficulty: 'beginner' as const,
        instructions: ['Start in forearm plank', 'Keep body straight', 'Engage core', 'Hold position']
      },
      sets: 3,
      reps: 30, // seconds
      restTime: 60
    }
  ];
  
  return basicExercises;
}
