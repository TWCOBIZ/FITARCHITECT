import { Workout, WorkoutExercise, WorkoutStructure, ExerciseType } from '../types/workout';

export class WorkoutDurationService {
  
  /**
   * Calculate the total duration of a workout based on exercises, sets, and rest times
   */
  static calculateWorkoutDuration(exercises: WorkoutExercise[]): number {
    let totalDuration = 0;

    exercises.forEach((workoutExercise, index) => {
      const { sets, reps, restTime } = workoutExercise;
      
      // Estimate time per set (assuming 2-3 seconds per rep)
      const timePerSet = Math.max(reps * 2.5, 30); // minimum 30 seconds per set
      
      // Total exercise time = (time per set * number of sets)
      const exerciseTime = timePerSet * sets;
      
      // Rest time = rest between sets * (sets - 1) + rest after exercise
      const totalRestTime = (restTime * (sets - 1)) + (index < exercises.length - 1 ? restTime : 0);
      
      totalDuration += exerciseTime + totalRestTime;
    });

    // Convert from seconds to minutes and round up
    return Math.ceil(totalDuration / 60);
  }

  /**
   * Validate if a workout duration matches the target duration (within acceptable range)
   */
  static validateWorkoutDuration(workout: Workout, targetDuration: number): boolean {
    const calculatedDuration = this.calculateWorkoutDuration(workout.exercises);
    const tolerance = Math.max(targetDuration * 0.15, 5); // 15% tolerance, minimum 5 minutes
    
    return Math.abs(calculatedDuration - targetDuration) <= tolerance;
  }

  /**
   * Adjust workout to match target duration by modifying sets, reps, or rest times
   */
  static adjustWorkoutForDuration(workout: Workout, targetDuration: number): Workout {
    const currentDuration = this.calculateWorkoutDuration(workout.exercises);
    
    if (this.validateWorkoutDuration(workout, targetDuration)) {
      return workout; // Already within acceptable range
    }

    const adjustedExercises = [...workout.exercises];
    const durationDiff = targetDuration - currentDuration;
    
    if (durationDiff > 0) {
      // Need to increase duration - add sets or increase rest time
      this.increaseDuration(adjustedExercises, durationDiff);
    } else {
      // Need to decrease duration - reduce sets or decrease rest time
      this.decreaseDuration(adjustedExercises, Math.abs(durationDiff));
    }

    return {
      ...workout,
      exercises: adjustedExercises,
      duration: targetDuration
    };
  }

  /**
   * Get exercise distribution based on target duration
   */
  static getExerciseDistribution(targetDuration: number): {
    warmup: number;
    main: number;
    cooldown: number;
  } {
    if (targetDuration <= 30) {
      return { warmup: 2, main: 3, cooldown: 2 };
    } else if (targetDuration <= 45) {
      return { warmup: 3, main: 4, cooldown: 2 };
    } else if (targetDuration <= 60) {
      return { warmup: 3, main: 6, cooldown: 3 };
    } else {
      return { warmup: 3, main: 8, cooldown: 3 };
    }
  }

  /**
   * Get recommended rest times based on exercise type and duration constraints
   */
  static getRecommendedRestTime(exerciseType: ExerciseType, targetDuration: number): number {
    const baseRestTimes = {
      [ExerciseType.WARMUP]: 30,
      [ExerciseType.STRENGTH]: 90,
      [ExerciseType.CARDIO]: 60,
      [ExerciseType.COOLDOWN]: 30,
      [ExerciseType.FLEXIBILITY]: 45,
      [ExerciseType.MOBILITY]: 45
    };

    let restTime = baseRestTimes[exerciseType] || 60;

    // Adjust rest time based on workout duration constraints
    if (targetDuration <= 30) {
      restTime = Math.min(restTime, 45); // Shorter rest for quick workouts
    } else if (targetDuration >= 75) {
      restTime = Math.max(restTime, 90); // Longer rest for extended workouts
    }

    return restTime;
  }

  /**
   * Build a structured workout breakdown
   */
  static buildWorkoutStructure(workout: Workout): WorkoutStructure {
    const warmupExercises = workout.exercises.filter(e => 
      e.exercise.type === ExerciseType.WARMUP || 
      e.exercise.name.toLowerCase().includes('warm') ||
      e.exercise.name.toLowerCase().includes('dynamic')
    );
    
    const cooldownExercises = workout.exercises.filter(e => 
      e.exercise.type === ExerciseType.COOLDOWN || 
      e.exercise.type === ExerciseType.FLEXIBILITY ||
      e.exercise.name.toLowerCase().includes('stretch') ||
      e.exercise.name.toLowerCase().includes('cool')
    );
    
    const mainExercises = workout.exercises.filter(e => 
      !warmupExercises.includes(e) && !cooldownExercises.includes(e)
    );

    const warmupDuration = this.calculateWorkoutDuration(warmupExercises);
    const mainDuration = this.calculateWorkoutDuration(mainExercises);
    const cooldownDuration = this.calculateWorkoutDuration(cooldownExercises);

    return {
      warmup: {
        duration: warmupDuration,
        exercises: warmupExercises,
        targetDuration: Math.max(5, Math.min(workout.duration * 0.2, 15)) // 5-15 minutes
      },
      main: {
        duration: mainDuration,
        exercises: mainExercises,
        targetDuration: workout.duration * 0.7 // 70% of total duration
      },
      cooldown: {
        duration: cooldownDuration,
        exercises: cooldownExercises,
        targetDuration: Math.max(5, Math.min(workout.duration * 0.15, 10)) // 5-10 minutes
      },
      totalDuration: warmupDuration + mainDuration + cooldownDuration
    };
  }

  /**
   * Private helper to increase workout duration
   */
  private static increaseDuration(exercises: WorkoutExercise[], additionalMinutes: number): void {
    const additionalSeconds = additionalMinutes * 60;
    let remainingTime = additionalSeconds;

    // First, try increasing rest times (up to reasonable limits)
    exercises.forEach(exercise => {
      if (remainingTime <= 0) return;
      
      const maxRestTime = exercise.exercise.type === ExerciseType.STRENGTH ? 120 : 90;
      const possibleIncrease = Math.min(maxRestTime - exercise.restTime, remainingTime / 2);
      
      if (possibleIncrease > 0) {
        exercise.restTime += possibleIncrease;
        remainingTime -= possibleIncrease * (exercise.sets + 1); // Rest between sets + after exercise
      }
    });

    // If still need more time, add sets to main exercises
    const mainExercises = exercises.filter(e => 
      e.exercise.type !== ExerciseType.WARMUP && e.exercise.type !== ExerciseType.COOLDOWN
    );
    
    mainExercises.forEach(exercise => {
      if (remainingTime <= 0) return;
      
      if (exercise.sets < 5) { // Don't exceed 5 sets
        exercise.sets += 1;
        const addedTime = (exercise.reps * 2.5) + exercise.restTime; // Time for new set + rest
        remainingTime -= addedTime;
      }
    });
  }

  /**
   * Private helper to decrease workout duration
   */
  private static decreaseDuration(exercises: WorkoutExercise[], excessMinutes: number): void {
    const excessSeconds = excessMinutes * 60;
    let timeToRemove = excessSeconds;

    // First, try reducing rest times
    exercises.forEach(exercise => {
      if (timeToRemove <= 0) return;
      
      const minRestTime = exercise.exercise.type === ExerciseType.WARMUP ? 15 : 30;
      const possibleReduction = Math.min(exercise.restTime - minRestTime, timeToRemove / 2);
      
      if (possibleReduction > 0) {
        exercise.restTime -= possibleReduction;
        timeToRemove -= possibleReduction * (exercise.sets + 1);
      }
    });

    // If still need to reduce time, reduce sets from main exercises
    const mainExercises = exercises.filter(e => 
      e.exercise.type !== ExerciseType.WARMUP && e.exercise.type !== ExerciseType.COOLDOWN
    );
    
    mainExercises.forEach(exercise => {
      if (timeToRemove <= 0) return;
      
      if (exercise.sets > 2) { // Don't go below 2 sets
        exercise.sets -= 1;
        const removedTime = (exercise.reps * 2.5) + exercise.restTime;
        timeToRemove -= removedTime;
      }
    });
  }
}

export default WorkoutDurationService;