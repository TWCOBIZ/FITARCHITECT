import { Exercise, Workout, WorkoutExercise, ExerciseType, MuscleGroup, Equipment } from '../types/workout';
import { WorkoutDurationService } from './workoutDurationService';

export class WorkoutTemplateService {
  
  /**
   * Enforce proper workout structure: warmup -> main exercises -> cooldown
   */
  static enforceWorkoutStructure(workout: Workout, targetDuration: number): Workout {
    const exercises = [...workout.exercises];
    const distribution = WorkoutDurationService.getExerciseDistribution(targetDuration);
    
    // Categorize existing exercises
    const categorizedExercises = this.categorizeExercises(exercises.map(we => we.exercise));
    
    // Build structured workout
    const structuredWorkout = this.buildStructuredWorkout(
      targetDuration,
      categorizedExercises,
      workout.targetMuscleGroups,
      workout.equipment,
      workout.difficulty
    );

    return {
      ...workout,
      exercises: structuredWorkout.exercises,
      duration: targetDuration
    };
  }

  /**
   * Categorize exercises by type (warmup, strength, cardio, cooldown)
   */
  static categorizeExercises(exercises: Exercise[]): Record<ExerciseType, Exercise[]> {
    const categorized: Record<ExerciseType, Exercise[]> = {
      [ExerciseType.WARMUP]: [],
      [ExerciseType.STRENGTH]: [],
      [ExerciseType.CARDIO]: [],
      [ExerciseType.COOLDOWN]: [],
      [ExerciseType.FLEXIBILITY]: [],
      [ExerciseType.MOBILITY]: []
    };

    exercises.forEach(exercise => {
      // Use explicit type if available
      if (exercise.type && categorized[exercise.type]) {
        categorized[exercise.type].push(exercise);
        return;
      }

      // Auto-categorize based on name and characteristics
      const name = exercise.name.toLowerCase();
      const description = exercise.description.toLowerCase();
      
      if (this.isWarmupExercise(name, description)) {
        categorized[ExerciseType.WARMUP].push({...exercise, type: ExerciseType.WARMUP});
      } else if (this.isCooldownExercise(name, description)) {
        categorized[ExerciseType.COOLDOWN].push({...exercise, type: ExerciseType.COOLDOWN});
      } else if (this.isCardioExercise(name, description)) {
        categorized[ExerciseType.CARDIO].push({...exercise, type: ExerciseType.CARDIO});
      } else if (this.isFlexibilityExercise(name, description)) {
        categorized[ExerciseType.FLEXIBILITY].push({...exercise, type: ExerciseType.FLEXIBILITY});
      } else {
        // Default to strength
        categorized[ExerciseType.STRENGTH].push({...exercise, type: ExerciseType.STRENGTH});
      }
    });

    return categorized;
  }

  /**
   * Build a properly structured workout with warmup, main exercises, and cooldown
   */
  static buildStructuredWorkout(
    targetDuration: number,
    categorizedExercises: Record<ExerciseType, Exercise[]>,
    targetMuscleGroups: MuscleGroup[],
    equipment: Equipment[],
    difficulty: 'beginner' | 'intermediate' | 'advanced'
  ): Workout {
    const distribution = WorkoutDurationService.getExerciseDistribution(targetDuration);
    const structuredExercises: WorkoutExercise[] = [];

    // 1. Add warmup exercises (5-15 minutes)
    const warmupExercises = this.selectExercises(
      [...categorizedExercises[ExerciseType.WARMUP], ...categorizedExercises[ExerciseType.MOBILITY]],
      distribution.warmup,
      ['all'], // warmup can target any muscle group
      equipment
    );

    warmupExercises.forEach(exercise => {
      structuredExercises.push({
        exercise,
        sets: difficulty === 'beginner' ? 1 : 2,
        reps: this.getRecommendedReps(exercise, difficulty),
        restTime: WorkoutDurationService.getRecommendedRestTime(ExerciseType.WARMUP, targetDuration),
        notes: 'Focus on form and mobility'
      });
    });

    // 2. Add main exercises (70% of total duration)
    const mainExercises = this.selectMainExercises(
      [...categorizedExercises[ExerciseType.STRENGTH], ...categorizedExercises[ExerciseType.CARDIO]],
      distribution.main,
      targetMuscleGroups,
      equipment,
      difficulty
    );

    mainExercises.forEach(exercise => {
      const isCardio = exercise.type === ExerciseType.CARDIO;
      structuredExercises.push({
        exercise,
        sets: isCardio ? this.getCardioSets(difficulty) : this.getStrengthSets(difficulty),
        reps: this.getRecommendedReps(exercise, difficulty),
        restTime: WorkoutDurationService.getRecommendedRestTime(
          exercise.type || ExerciseType.STRENGTH, 
          targetDuration
        ),
        notes: isCardio ? 'Focus on intensity and heart rate' : 'Focus on form and progressive overload'
      });
    });

    // 3. Add cooldown exercises (5-10 minutes)
    const cooldownExercises = this.selectExercises(
      [...categorizedExercises[ExerciseType.COOLDOWN], ...categorizedExercises[ExerciseType.FLEXIBILITY]],
      distribution.cooldown,
      ['all'], // cooldown can target any muscle group
      equipment
    );

    cooldownExercises.forEach(exercise => {
      structuredExercises.push({
        exercise,
        sets: 1,
        reps: this.getCooldownReps(exercise),
        restTime: WorkoutDurationService.getRecommendedRestTime(ExerciseType.COOLDOWN, targetDuration),
        notes: 'Hold stretches for 30-60 seconds'
      });
    });

    return {
      id: `structured-${Date.now()}`,
      name: 'Structured Workout',
      description: 'Properly structured workout with warmup, main exercises, and cooldown',
      type: 'strength', // This will be overridden by calling code
      difficulty,
      duration: targetDuration,
      exercises: structuredExercises,
      targetMuscleGroups,
      equipment,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Select exercises based on criteria
   */
  private static selectExercises(
    exercises: Exercise[],
    count: number,
    targetMuscles: string[],
    equipment: Equipment[]
  ): Exercise[] {
    if (exercises.length === 0) return [];

    // Filter by equipment availability
    const availableExercises = exercises.filter(ex =>
      ex.equipment.length === 0 || // bodyweight exercises
      ex.equipment.some(eq => equipment.includes(eq))
    );

    if (availableExercises.length === 0) return exercises.slice(0, count);

    // If targeting specific muscles, prioritize those
    const prioritizedExercises = targetMuscles.includes('all') 
      ? availableExercises 
      : availableExercises.filter(ex =>
          ex.muscleGroups.some(mg => targetMuscles.includes(mg.toLowerCase()))
        );

    const finalPool = prioritizedExercises.length > 0 ? prioritizedExercises : availableExercises;
    
    // Select diverse exercises (avoid duplicates)
    const selected: Exercise[] = [];
    const usedNames = new Set<string>();

    for (const exercise of finalPool) {
      if (selected.length >= count) break;
      
      const baseName = exercise.name.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!usedNames.has(baseName)) {
        selected.push(exercise);
        usedNames.add(baseName);
      }
    }

    // If we don't have enough unique exercises, fill with remaining ones
    while (selected.length < count && selected.length < finalPool.length) {
      const remaining = finalPool.filter(ex => !selected.includes(ex));
      if (remaining.length > 0) {
        selected.push(remaining[0]);
      } else {
        break;
      }
    }

    return selected;
  }

  /**
   * Select main exercises with muscle group distribution
   */
  private static selectMainExercises(
    exercises: Exercise[],
    count: number,
    targetMuscleGroups: MuscleGroup[],
    equipment: Equipment[],
    difficulty: 'beginner' | 'intermediate' | 'advanced'
  ): Exercise[] {
    const selected: Exercise[] = [];
    const muscleGroupsUsed: string[] = [];

    // Ensure we hit each target muscle group at least once
    for (const muscleGroup of targetMuscleGroups) {
      if (selected.length >= count) break;

      const muscleExercises = exercises.filter(ex =>
        ex.muscleGroups.includes(muscleGroup) &&
        (ex.equipment.length === 0 || ex.equipment.some(eq => equipment.includes(eq)))
      );

      if (muscleExercises.length > 0) {
        const exercise = muscleExercises[0];
        selected.push(exercise);
        muscleGroupsUsed.push(muscleGroup);
      }
    }

    // Fill remaining slots with diverse exercises
    const remaining = exercises.filter(ex => 
      !selected.includes(ex) &&
      (ex.equipment.length === 0 || ex.equipment.some(eq => equipment.includes(eq)))
    );

    while (selected.length < count && remaining.length > 0) {
      // Prefer exercises that target underused muscle groups
      const underusedMuscleExercises = remaining.filter(ex =>
        ex.muscleGroups.some(mg => !muscleGroupsUsed.includes(mg))
      );

      const nextExercise = underusedMuscleExercises.length > 0 
        ? underusedMuscleExercises[0] 
        : remaining[0];

      selected.push(nextExercise);
      nextExercise.muscleGroups.forEach(mg => {
        if (!muscleGroupsUsed.includes(mg)) {
          muscleGroupsUsed.push(mg);
        }
      });

      remaining.splice(remaining.indexOf(nextExercise), 1);
    }

    return selected;
  }

  // Exercise categorization helpers
  private static isWarmupExercise(name: string, description: string): boolean {
    const warmupKeywords = [
      'warm', 'dynamic', 'march', 'circle', 'swing', 'rotation', 'mobility',
      'activation', 'prep', 'movement prep', 'joint', 'range of motion'
    ];
    return warmupKeywords.some(keyword => name.includes(keyword) || description.includes(keyword));
  }

  private static isCooldownExercise(name: string, description: string): boolean {
    const cooldownKeywords = [
      'stretch', 'cool', 'static', 'hold', 'relaxation', 'recovery',
      'flexibility', 'lengthen', 'release'
    ];
    return cooldownKeywords.some(keyword => name.includes(keyword) || description.includes(keyword));
  }

  private static isCardioExercise(name: string, description: string): boolean {
    const cardioKeywords = [
      'jumping', 'jump', 'run', 'jog', 'burpee', 'mountain climber', 'cardio',
      'hiit', 'interval', 'plyometric', 'explosive', 'sprint'
    ];
    return cardioKeywords.some(keyword => name.includes(keyword) || description.includes(keyword));
  }

  private static isFlexibilityExercise(name: string, description: string): boolean {
    const flexibilityKeywords = [
      'yoga', 'pilates', 'stretch', 'flexibility', 'balance', 'core stability',
      'isometric', 'hold', 'static'
    ];
    return flexibilityKeywords.some(keyword => name.includes(keyword) || description.includes(keyword));
  }

  // Rep and set recommendations
  private static getRecommendedReps(exercise: Exercise, difficulty: string): number {
    const type = exercise.type || ExerciseType.STRENGTH;
    
    switch (type) {
      case ExerciseType.WARMUP:
        return difficulty === 'beginner' ? 8 : 10;
      case ExerciseType.STRENGTH:
        return difficulty === 'beginner' ? 8 : (difficulty === 'intermediate' ? 10 : 12);
      case ExerciseType.CARDIO:
        return difficulty === 'beginner' ? 30 : (difficulty === 'intermediate' ? 45 : 60); // seconds
      case ExerciseType.COOLDOWN:
      case ExerciseType.FLEXIBILITY:
        return 30; // seconds hold
      default:
        return 10;
    }
  }

  private static getStrengthSets(difficulty: string): number {
    return difficulty === 'beginner' ? 2 : (difficulty === 'intermediate' ? 3 : 4);
  }

  private static getCardioSets(difficulty: string): number {
    return difficulty === 'beginner' ? 2 : (difficulty === 'intermediate' ? 3 : 4);
  }

  private static getCooldownReps(exercise: Exercise): number {
    // For cooldown stretches, use time-based holds
    return 30; // 30-second holds
  }
}

export default WorkoutTemplateService;