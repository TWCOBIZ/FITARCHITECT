import { ComprehensiveExercise, COMPREHENSIVE_EXERCISE_DATABASE } from '../data/comprehensiveExerciseDatabase'
import { api } from './api'

interface UserPreferences {
  fitnessGoals: string[]
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
  availableEquipment: string[]
  timeConstraints: number // minutes
  injuryHistory?: string[]
  preferredMuscleGroups?: string[]
  dislikedExercises?: string[]
  workoutFrequency: number // days per week
}

interface RecommendationContext {
  currentWorkout?: any
  recentExercises?: string[]
  performanceHistory?: any[]
  plateauAreas?: string[]
  strengthImbalances?: string[]
}

interface ExerciseRecommendation {
  exercise: ComprehensiveExercise
  score: number
  reasoning: string[]
  adaptations?: string[]
  alternatives?: ComprehensiveExercise[]
  progressionPath?: {
    current: ComprehensiveExercise
    next: ComprehensiveExercise[]
    previous?: ComprehensiveExercise[]
  }
}

interface RecommendationResult {
  primary: ExerciseRecommendation[]
  secondary: ExerciseRecommendation[]
  warmup: ExerciseRecommendation[]
  cooldown: ExerciseRecommendation[]
  totalEstimatedTime: number
  difficultyBalance: string
  muscleGroupCoverage: string[]
}

export class ExerciseRecommendationEngine {
  private static instance: ExerciseRecommendationEngine

  static getInstance(): ExerciseRecommendationEngine {
    if (!ExerciseRecommendationEngine.instance) {
      ExerciseRecommendationEngine.instance = new ExerciseRecommendationEngine()
    }
    return ExerciseRecommendationEngine.instance
  }

  async generateRecommendations(
    preferences: UserPreferences,
    context: RecommendationContext = {}
  ): Promise<RecommendationResult> {
    // Step 1: Filter exercises based on constraints
    const availableExercises = this.filterExercisesByConstraints(preferences)
    
    // Step 2: Score exercises based on multiple factors
    const scoredExercises = await this.scoreExercises(availableExercises, preferences, context)
    
    // Step 3: Select optimal combination
    const selectedExercises = this.selectOptimalCombination(scoredExercises, preferences)
    
    // Step 4: Organize into workout structure
    return this.organizeWorkoutStructure(selectedExercises, preferences)
  }

  async recommendExerciseProgressions(
    currentExercise: ComprehensiveExercise,
    userLevel: string,
    performanceData?: any
  ): Promise<{
    nextLevel: ComprehensiveExercise[]
    lateralAlternatives: ComprehensiveExercise[]
    regressions: ComprehensiveExercise[]
    reasoning: string[]
  }> {
    const progressions = currentExercise.progressions
    const alternatives = currentExercise.alternatives

    // Find exercises for next level
    const nextLevel = this.findProgressionExercises(currentExercise, userLevel, 'advance')
    const regressions = this.findProgressionExercises(currentExercise, userLevel, 'regress')
    
    // Get lateral alternatives (same difficulty, different movement)
    const lateralAlternatives = COMPREHENSIVE_EXERCISE_DATABASE.filter(ex => 
      ex.difficulty === currentExercise.difficulty &&
      ex.primaryMuscle === currentExercise.primaryMuscle &&
      ex.id !== currentExercise.id
    ).slice(0, 5)

    // Generate AI reasoning for progressions
    const aiRecommendations = await api.post('/exercise-recommendations', {
      preferences: {
        experienceLevel: userLevel as any,
        fitnessGoal: 'strength',
        targetMuscles: [currentExercise.primaryMuscle],
        equipment: currentExercise.equipment,
        workoutDays: 3,
        timePerWorkout: 45
      },
      equipment: currentExercise.equipment,
      targetMuscles: [currentExercise.primaryMuscle],
      excludeExercises: [currentExercise.name]
    }).then(res => res.data).catch(() => ({ progressionPath: [] }))

    return {
      nextLevel,
      lateralAlternatives,
      regressions,
      reasoning: aiRecommendations.progressionPath
    }
  }

  async recommendInjuryAlternatives(
    originalExercise: ComprehensiveExercise,
    injuryType: string,
    affectedArea: string
  ): Promise<{
    safeAlternatives: ComprehensiveExercise[]
    modifications: string[]
    avoidanceReasons: string[]
  }> {
    // Filter exercises that avoid the injured area
    const safeExercises = COMPREHENSIVE_EXERCISE_DATABASE.filter(exercise => {
      // Check if exercise targets the same muscle groups but in a safer way
      const sharesMuscles = exercise.primaryMuscle === originalExercise.primaryMuscle ||
        exercise.secondaryMuscles.includes(originalExercise.primaryMuscle)
      
      // Check if exercise doesn't stress the injured area
      const avoidsInjuryArea = !this.exerciseStressesArea(exercise, affectedArea)
      
      return sharesMuscles && avoidsInjuryArea
    })

    // Score based on safety and effectiveness
    const scored = safeExercises.map(exercise => ({
      exercise,
      safetyScore: this.calculateSafetyScore(exercise, [injuryType]),
      effectivenessScore: this.calculateMuscleOverlap([originalExercise.primaryMuscle], [exercise.primaryMuscle, ...exercise.secondaryMuscles])
    }))

    // Sort by combined score
    const sorted = scored.sort((a, b) => 
      (b.safetyScore + b.effectivenessScore) - (a.safetyScore + a.effectivenessScore)
    )

    return {
      safeAlternatives: sorted.slice(0, 5).map(s => s.exercise),
      modifications: originalExercise.injuryModifications,
      avoidanceReasons: this.generateAvoidanceReasons(originalExercise, injuryType, affectedArea)
    }
  }

  async recommendForPlateau(
    plateauArea: string,
    currentExercises: ComprehensiveExercise[],
    userLevel: string
  ): Promise<{
    variationExercises: ComprehensiveExercise[]
    intensityTechniques: string[]
    programModifications: string[]
  }> {
    // Find exercises that target the plateau area with different movement patterns
    const variationExercises = COMPREHENSIVE_EXERCISE_DATABASE.filter(exercise => {
      const targetsSameArea = exercise.primaryMuscle === plateauArea ||
        exercise.secondaryMuscles.includes(plateauArea)
      
      const isDifferentMovement = !currentExercises.some(current => 
        current.name === exercise.name || current.alternatives.includes(exercise.name)
      )
      
      const appropriateDifficulty = this.isDifficultyAppropriate(exercise.difficulty, userLevel)
      
      return targetsSameArea && isDifferentMovement && appropriateDifficulty
    })

    // Use AI to suggest intensity techniques
    const aiSuggestions = await api.post('/plateau-detection', {
      workoutHistory: [], // workout history would go here
      performanceMetrics: {
        strengthProgress: [0, 0, 0, 0], // plateau pattern
        completionRates: [100, 100, 100],
        difficultyRatings: [2, 2, 2],
        timeToCompletion: [45, 45, 45]
      }
    }).then(res => res.data).catch(() => ({ recommendations: [] }))

    return {
      variationExercises: variationExercises.slice(0, 8),
      intensityTechniques: [
        'Drop sets',
        'Pause reps',
        'Tempo variation',
        'Partial range of motion',
        'Supersets',
        'Rest-pause training'
      ],
      programModifications: aiSuggestions.recommendations
    }
  }

  private filterExercisesByConstraints(preferences: UserPreferences): ComprehensiveExercise[] {
    let filtered = [...COMPREHENSIVE_EXERCISE_DATABASE]

    // Filter by equipment
    if (preferences.availableEquipment.length > 0) {
      filtered = filtered.filter(exercise =>
        exercise.equipment.some(eq => preferences.availableEquipment.includes(eq))
      )
    }

    // Filter by difficulty level
    const appropriateDifficulties = this.getAppropriateDifficulties(preferences.experienceLevel)
    filtered = filtered.filter(exercise => 
      appropriateDifficulties.includes(exercise.difficulty)
    )

    // Filter out disliked exercises
    if (preferences.dislikedExercises) {
      filtered = filtered.filter(exercise =>
        !preferences.dislikedExercises!.includes(exercise.name)
      )
    }

    // Filter out exercises that stress injury areas
    if (preferences.injuryHistory) {
      filtered = filtered.filter(exercise =>
        !preferences.injuryHistory!.some(injury =>
          this.exerciseStressesArea(exercise, injury)
        )
      )
    }

    return filtered
  }

  private async scoreExercises(
    exercises: ComprehensiveExercise[],
    preferences: UserPreferences,
    context: RecommendationContext
  ): Promise<ExerciseRecommendation[]> {
    const recommendations: ExerciseRecommendation[] = []

    for (const exercise of exercises) {
      let score = 0
      const reasoning: string[] = []

      // Goal alignment score (30% weight)
      const goalScore = this.calculateGoalAlignmentScore(exercise, preferences.fitnessGoals)
      score += goalScore * 0.3
      if (goalScore > 0.7) reasoning.push('Excellent alignment with fitness goals')

      // Muscle group preference score (20% weight)
      const muscleScore = this.calculateMusclePreferenceScore(exercise, preferences.preferredMuscleGroups || [])
      score += muscleScore * 0.2
      if (muscleScore > 0.8) reasoning.push('Targets preferred muscle groups')

      // Variety score (15% weight) - avoid recent exercises
      const varietyScore = this.calculateVarietyScore(exercise, context.recentExercises || [])
      score += varietyScore * 0.15
      if (varietyScore > 0.8) reasoning.push('Provides good exercise variety')

      // Time efficiency score (15% weight)
      const timeScore = this.calculateTimeEfficiencyScore(exercise, preferences.timeConstraints)
      score += timeScore * 0.15
      if (timeScore > 0.7) reasoning.push('Time-efficient exercise choice')

      // Safety score (10% weight)
      const safetyScore = this.calculateSafetyScore(exercise, preferences.injuryHistory || [])
      score += safetyScore * 0.1
      if (safetyScore > 0.9) reasoning.push('Safe choice given injury history')

      // Progression potential score (10% weight)
      const progressionScore = this.calculateProgressionScore(exercise, preferences.experienceLevel)
      score += progressionScore * 0.1
      if (progressionScore > 0.8) reasoning.push('Great progression potential')

      // Find alternatives and progressions
      const alternatives = this.findAlternativeExercises(exercise, exercises)
      const progressionPath = this.buildProgressionPath(exercise)

      recommendations.push({
        exercise,
        score,
        reasoning,
        alternatives,
        progressionPath
      })
    }

    return recommendations.sort((a, b) => b.score - a.score)
  }

  private selectOptimalCombination(
    scoredExercises: ExerciseRecommendation[],
    preferences: UserPreferences
  ): ExerciseRecommendation[] {
    const selected: ExerciseRecommendation[] = []
    const targetExerciseCount = this.calculateTargetExerciseCount(preferences.timeConstraints, preferences.workoutFrequency)
    
    // Ensure muscle group balance
    const muscleGroupCounts: { [key: string]: number } = {}
    
    for (const recommendation of scoredExercises) {
      if (selected.length >= targetExerciseCount) break
      
      const exercise = recommendation.exercise
      const primaryMuscle = exercise.primaryMuscle
      
      // Check muscle group balance
      const currentCount = muscleGroupCounts[primaryMuscle] || 0
      const maxPerMuscle = Math.ceil(targetExerciseCount / 4) // Rough balance
      
      if (currentCount < maxPerMuscle) {
        selected.push(recommendation)
        muscleGroupCounts[primaryMuscle] = currentCount + 1
      }
    }

    // Fill remaining slots if needed
    while (selected.length < targetExerciseCount && selected.length < scoredExercises.length) {
      const remaining = scoredExercises.filter(r => !selected.includes(r))
      if (remaining.length > 0) {
        selected.push(remaining[0])
      } else {
        break
      }
    }

    return selected
  }

  private organizeWorkoutStructure(
    exercises: ExerciseRecommendation[],
    preferences: UserPreferences
  ): RecommendationResult {
    // Categorize exercises
    const compound = exercises.filter(e => e.exercise.movement === 'compound')
    const isolation = exercises.filter(e => e.exercise.movement === 'isolation')
    
    // Organize by priority: compound first, then isolation
    const primary = [...compound.slice(0, 3), ...isolation.slice(0, 2)]
    const secondary = exercises.filter(e => !primary.includes(e)).slice(0, 3)
    
    // Add warmup exercises (lighter, mobility-focused)
    const warmup = this.selectWarmupExercises(exercises, preferences)
    
    // Add cooldown exercises (stretching, recovery)
    const cooldown = this.selectCooldownExercises(exercises, preferences)
    
    // Calculate total time
    const totalTime = this.calculateTotalWorkoutTime(primary, secondary, preferences.timeConstraints)
    
    // Assess difficulty balance
    const difficultyBalance = this.assessDifficultyBalance(primary.concat(secondary))
    
    // Get muscle group coverage
    const muscleGroupCoverage = this.getMuscleGroupCoverage(primary.concat(secondary))

    return {
      primary,
      secondary,
      warmup,
      cooldown,
      totalEstimatedTime: totalTime,
      difficultyBalance,
      muscleGroupCoverage
    }
  }

  // Helper methods
  private getAppropriateDifficulties(level: string): string[] {
    switch (level) {
      case 'beginner': return ['beginner']
      case 'intermediate': return ['beginner', 'intermediate']
      case 'advanced': return ['intermediate', 'advanced']
      default: return ['beginner', 'intermediate']
    }
  }

  private exerciseStressesArea(exercise: ComprehensiveExercise, injuryArea: string): boolean {
    const stressedAreas = [exercise.primaryMuscle, ...exercise.secondaryMuscles]
    return stressedAreas.some(area => 
      area.toLowerCase().includes(injuryArea.toLowerCase()) ||
      injuryArea.toLowerCase().includes(area.toLowerCase())
    )
  }

  private calculateGoalAlignmentScore(exercise: ComprehensiveExercise, goals: string[]): number {
    let score = 0
    
    for (const goal of goals) {
      switch (goal.toLowerCase()) {
        case 'strength':
          if (exercise.movement === 'compound') score += 0.8
          if (exercise.difficulty === 'advanced') score += 0.2
          break
        case 'muscle gain':
        case 'hypertrophy':
          if (exercise.movement === 'isolation') score += 0.6
          if (exercise.movement === 'compound') score += 0.4
          break
        case 'weight loss':
        case 'cardio':
          if (exercise.category === 'cardio') score += 1.0
          if (exercise.movement === 'compound') score += 0.5
          break
        case 'endurance':
          if (exercise.category === 'cardio') score += 0.8
          if (exercise.difficulty === 'beginner') score += 0.2
          break
      }
    }
    
    return Math.min(score / goals.length, 1.0)
  }

  private calculateMusclePreferenceScore(exercise: ComprehensiveExercise, preferredMuscles: string[]): number {
    if (preferredMuscles.length === 0) return 0.5 // neutral if no preferences
    
    const allMuscles = [exercise.primaryMuscle, ...exercise.secondaryMuscles]
    const matches = preferredMuscles.filter(pref => 
      allMuscles.some(muscle => muscle.toLowerCase().includes(pref.toLowerCase()))
    )
    
    return matches.length / preferredMuscles.length
  }

  private calculateVarietyScore(exercise: ComprehensiveExercise, recentExercises: string[]): number {
    if (recentExercises.includes(exercise.name)) return 0.2
    if (recentExercises.some(recent => exercise.alternatives.includes(recent))) return 0.5
    return 1.0
  }

  private calculateTimeEfficiencyScore(exercise: ComprehensiveExercise, timeConstraint: number): number {
    // Compound movements are more time-efficient
    const baseScore = exercise.movement === 'compound' ? 0.8 : 0.5
    
    // Adjust based on time constraints
    if (timeConstraint < 30) {
      return exercise.movement === 'compound' ? 1.0 : 0.3
    } else if (timeConstraint > 60) {
      return 0.8 // More time allows for variety
    }
    
    return baseScore
  }

  private calculateSafetyScore(exercise: ComprehensiveExercise, injuryHistory: string[]): number {
    if (injuryHistory.length === 0) return 1.0
    
    for (const injury of injuryHistory) {
      if (this.exerciseStressesArea(exercise, injury)) {
        return 0.3 // Significantly lower score for potentially problematic exercises
      }
    }
    
    return 1.0
  }

  private calculateProgressionScore(exercise: ComprehensiveExercise, level: string): number {
    const progressions = exercise.progressions
    
    if (level === 'beginner' && progressions.intermediate && progressions.advanced) return 1.0
    if (level === 'intermediate' && progressions.advanced) return 0.8
    if (level === 'advanced') return 0.6
    
    return 0.4
  }

  private calculateMuscleOverlap(muscles1: string[], muscles2: string[]): number {
    const overlap = muscles1.filter(m1 => 
      muscles2.some(m2 => m1.toLowerCase() === m2.toLowerCase())
    )
    return overlap.length / Math.max(muscles1.length, muscles2.length)
  }

  private findAlternativeExercises(exercise: ComprehensiveExercise, availableExercises: ComprehensiveExercise[]): ComprehensiveExercise[] {
    return availableExercises.filter(alt => 
      alt.id !== exercise.id &&
      alt.primaryMuscle === exercise.primaryMuscle &&
      alt.difficulty === exercise.difficulty
    ).slice(0, 3)
  }

  private buildProgressionPath(exercise: ComprehensiveExercise): any {
    const progressions = exercise.progressions
    const current = exercise
    
    // Find actual exercise objects for progressions
    const next = COMPREHENSIVE_EXERCISE_DATABASE.filter(ex => 
      progressions.advanced.toLowerCase().includes(ex.name.toLowerCase()) ||
      ex.name.toLowerCase().includes(progressions.advanced.toLowerCase())
    )
    
    const previous = COMPREHENSIVE_EXERCISE_DATABASE.filter(ex => 
      progressions.beginner.toLowerCase().includes(ex.name.toLowerCase()) ||
      ex.name.toLowerCase().includes(progressions.beginner.toLowerCase())
    )
    
    return {
      current,
      next: next.slice(0, 2),
      previous: previous.slice(0, 2)
    }
  }

  private findProgressionExercises(exercise: ComprehensiveExercise, userLevel: string, direction: 'advance' | 'regress'): ComprehensiveExercise[] {
    const targetDifficulty = direction === 'advance' ? 
      this.getNextDifficulty(exercise.difficulty) : 
      this.getPreviousDifficulty(exercise.difficulty)
    
    return COMPREHENSIVE_EXERCISE_DATABASE.filter(ex => 
      ex.primaryMuscle === exercise.primaryMuscle &&
      ex.difficulty === targetDifficulty &&
      ex.id !== exercise.id
    ).slice(0, 3)
  }

  private getNextDifficulty(current: string): string {
    switch (current) {
      case 'beginner': return 'intermediate'
      case 'intermediate': return 'advanced'
      case 'advanced': return 'advanced'
      default: return 'intermediate'
    }
  }

  private getPreviousDifficulty(current: string): string {
    switch (current) {
      case 'advanced': return 'intermediate'
      case 'intermediate': return 'beginner'
      case 'beginner': return 'beginner'
      default: return 'beginner'
    }
  }

  private isDifficultyAppropriate(exerciseDifficulty: string, userLevel: string): boolean {
    const appropriate = this.getAppropriateDifficulties(userLevel)
    return appropriate.includes(exerciseDifficulty)
  }

  private generateAvoidanceReasons(exercise: ComprehensiveExercise, injuryType: string, affectedArea: string): string[] {
    return [
      `Exercise stresses ${affectedArea} which is affected by ${injuryType}`,
      `Movement pattern may aggravate ${injuryType}`,
      `Alternative exercises provide safer muscle activation`
    ]
  }

  private calculateTargetExerciseCount(timeConstraint: number, frequency: number): number {
    if (timeConstraint < 30) return 4
    if (timeConstraint < 45) return 6
    if (timeConstraint < 60) return 8
    return 10
  }

  private selectWarmupExercises(exercises: ExerciseRecommendation[], preferences: UserPreferences): ExerciseRecommendation[] {
    // Select bodyweight, mobility-focused exercises
    const warmupCandidates = COMPREHENSIVE_EXERCISE_DATABASE.filter(ex => 
      ex.equipment.includes('bodyweight') &&
      ex.difficulty === 'beginner'
    )
    
    return warmupCandidates.slice(0, 3).map(exercise => ({
      exercise,
      score: 0.8,
      reasoning: ['Mobility and activation exercise'],
    }))
  }

  private selectCooldownExercises(exercises: ExerciseRecommendation[], preferences: UserPreferences): ExerciseRecommendation[] {
    // Select stretching and recovery exercises
    const cooldownCandidates = COMPREHENSIVE_EXERCISE_DATABASE.filter(ex => 
      ex.category === 'core' || ex.equipment.includes('bodyweight')
    )
    
    return cooldownCandidates.slice(0, 2).map(exercise => ({
      exercise,
      score: 0.7,
      reasoning: ['Recovery and flexibility exercise'],
    }))
  }

  private calculateTotalWorkoutTime(primary: ExerciseRecommendation[], secondary: ExerciseRecommendation[], timeConstraint: number): number {
    // Estimate time based on exercise count and complexity
    const primaryTime = primary.length * 8 // 8 minutes per primary exercise
    const secondaryTime = secondary.length * 5 // 5 minutes per secondary exercise
    const warmupCooldownTime = 10
    
    return Math.min(primaryTime + secondaryTime + warmupCooldownTime, timeConstraint)
  }

  private assessDifficultyBalance(exercises: ExerciseRecommendation[]): string {
    const difficulties = exercises.map(e => e.exercise.difficulty)
    const beginnerCount = difficulties.filter(d => d === 'beginner').length
    const intermediateCount = difficulties.filter(d => d === 'intermediate').length
    const advancedCount = difficulties.filter(d => d === 'advanced').length
    
    if (advancedCount > exercises.length * 0.6) return 'High intensity'
    if (beginnerCount > exercises.length * 0.6) return 'Beginner friendly'
    return 'Balanced difficulty'
  }

  private getMuscleGroupCoverage(exercises: ExerciseRecommendation[]): string[] {
    const muscleGroups = new Set<string>()
    
    exercises.forEach(e => {
      muscleGroups.add(e.exercise.primaryMuscle)
      e.exercise.secondaryMuscles.forEach(muscle => muscleGroups.add(muscle))
    })
    
    return Array.from(muscleGroups)
  }
}

export const exerciseRecommendationEngine = ExerciseRecommendationEngine.getInstance()