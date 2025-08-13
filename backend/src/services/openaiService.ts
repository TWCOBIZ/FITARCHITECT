import { OpenAI } from 'openai';
import { withRetry, RateLimiter } from '../utils/retryUtils';
import { logger, logExternalApiCall, logWorkoutGeneration } from '../utils/logger';

// Exercise API fallback chain
interface ExerciseAPIService {
  name: 'wger' | 'exercisedb' | 'local';
  fetchExercises(profile: UserProfile): Promise<Exercise[]>;
  isAvailable(): Promise<boolean>;
}

class ExerciseAPIFallbackManager {
  private services: ExerciseAPIService[] = [];
  private cache = new Map<string, { data: Exercise[]; timestamp: number }>();
  private cacheTimeout = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Initialize service chain: WGER → ExerciseDB → Local
    this.services = [
      new WgerAPIService(),
      new ExerciseDBService(), 
      new LocalExerciseService()
    ];
  }

  async getExercises(profile: UserProfile): Promise<Exercise[]> {
    const cacheKey = this.getCacheKey(profile);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      logger.info('Returning cached exercises', {
        operation: 'exercise_cache_hit',
        component: 'exercise_fallback',
        metadata: { exerciseCount: cached.data.length }
      });
      return cached.data;
    }

    // Try each service in order
    for (const service of this.services) {
      try {
        const isAvailable = await service.isAvailable();
        if (!isAvailable) continue;

        logger.info(`Attempting to fetch exercises from ${service.name}`, {
          operation: 'exercise_api_attempt',
          component: 'exercise_fallback',
          metadata: { service: service.name }
        });

        const exercises = await withRetry(
          () => service.fetchExercises(profile),
          {
            maxRetries: 2,
            initialDelay: 1000,
            retryableErrors: (error) => {
              return error.code === 'ETIMEDOUT' || 
                     error.code === 'ECONNRESET' ||
                     (error.response && error.response.status >= 500);
            }
          }
        );

        if (exercises && exercises.length > 0) {
          // Cache successful result
          this.cache.set(cacheKey, { data: exercises, timestamp: Date.now() });
          
          logger.info(`Successfully fetched exercises from ${service.name}`, {
            operation: 'exercise_api_success',
            component: 'exercise_fallback',
            metadata: { 
              service: service.name,
              exerciseCount: exercises.length
            }
          });
          
          return exercises;
        }
      } catch (error) {
        logger.warn(`Exercise API service ${service.name} failed`, {
          operation: 'exercise_api_failure',
          component: 'exercise_fallback',
          metadata: { 
            service: service.name,
            error: error instanceof Error ? error.message : String(error)
          }
        }, error instanceof Error ? error : new Error(String(error)));
        
        // Continue to next service
        continue;
      }
    }

    // If all services fail, return cached data if available (even if expired)
    if (cached) {
      logger.warn('All exercise APIs failed, using expired cache', {
        operation: 'exercise_fallback_expired_cache',
        component: 'exercise_fallback',
        metadata: { 
          cacheAge: Date.now() - cached.timestamp,
          exerciseCount: cached.data.length
        }
      });
      return cached.data;
    }

    // Final fallback to hardcoded exercises
    const fallbackExercises = this.getFallbackExercises();
    this.cache.set(cacheKey, { data: fallbackExercises, timestamp: Date.now() });
    
    logger.error('All exercise APIs failed, using hardcoded fallback', {
      operation: 'exercise_fallback_hardcoded',
      component: 'exercise_fallback',
      metadata: { exerciseCount: fallbackExercises.length }
    });
    
    return fallbackExercises;
  }

  private getCacheKey(profile: UserProfile): string {
    return `${profile.fitnessGoal}-${profile.experienceLevel}-${profile.equipment?.join(',') || 'none'}`;
  }

  private getFallbackExercises(): Exercise[] {
    return [
      {
        id: 'push-ups',
        name: 'Push-Ups',
        description: 'A fundamental upper body exercise',
        muscleGroups: ['chest', 'triceps', 'shoulders'],
        equipment: ['bodyweight'],
        difficulty: 'beginner',
        instructions: [
          'Start in plank position with hands slightly wider than shoulders',
          'Lower body until chest nearly touches floor',
          'Push back up to starting position',
          'Keep core tight throughout movement'
        ]
      },
      {
        id: 'squats',
        name: 'Squats',
        description: 'A fundamental lower body exercise',
        muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
        equipment: ['bodyweight'],
        difficulty: 'beginner',
        instructions: [
          'Stand with feet shoulder-width apart',
          'Lower hips back and down as if sitting in chair',
          'Keep chest up and knees tracking over toes',
          'Return to standing position'
        ]
      },
      {
        id: 'plank',
        name: 'Plank',
        description: 'Core stability and strength exercise',
        muscleGroups: ['core', 'shoulders'],
        equipment: ['bodyweight'],
        difficulty: 'beginner',
        instructions: [
          'Start in forearm plank position',
          'Keep body in straight line from head to heels',
          'Engage core muscles',
          'Hold position while breathing normally'
        ]
      }
    ];
  }
}

// Placeholder service implementations
class WgerAPIService implements ExerciseAPIService {
  name: 'wger' = 'wger';
  
  async isAvailable(): Promise<boolean> {
    try {
      // Add actual WGER API health check here
      return true;
    } catch {
      return false;
    }
  }
  
  async fetchExercises(profile: UserProfile): Promise<Exercise[]> {
    // Add actual WGER API integration here
    throw new Error('WGER API integration not implemented');
  }
}

class ExerciseDBService implements ExerciseAPIService {
  name: 'exercisedb' = 'exercisedb';
  
  async isAvailable(): Promise<boolean> {
    try {
      // Add actual ExerciseDB API health check here
      return false; // Disabled for now
    } catch {
      return false;
    }
  }
  
  async fetchExercises(profile: UserProfile): Promise<Exercise[]> {
    // Add actual ExerciseDB API integration here
    throw new Error('ExerciseDB API integration not implemented');
  }
}

class LocalExerciseService implements ExerciseAPIService {
  name: 'local' = 'local';
  
  async isAvailable(): Promise<boolean> {
    return true; // Local service always available
  }
  
  async fetchExercises(profile: UserProfile): Promise<Exercise[]> {
    // Use existing local exercise database
    const { exerciseDatabase } = require('../../data/exerciseDatabase');
    return exerciseDatabase.filter((ex: any) => {
      // Filter by user profile criteria
      if (profile.equipment && profile.equipment.length > 0) {
        return ex.equipment?.some((eq: string) => 
          profile.equipment.includes(eq) || eq === 'bodyweight'
        );
      }
      return true;
    }).slice(0, 50); // Limit to reasonable number
  }
}

// Helper function to get meal image based on meal type
const getMealImageByType = (mealType: string): string => {
  const mealTypeMap: { [key: string]: string } = {
    'breakfast': '/placeholders/food/breakfast.svg',
    'lunch': '/placeholders/food/lunch.svg',
    'dinner': '/placeholders/food/dinner.svg',
    'snack': '/placeholders/food/snack.svg'
  };
  
  return mealTypeMap[mealType.toLowerCase()] || '/placeholders/food/default-food.svg';
};

// Only configure dotenv if not in test environment
if (process.env.NODE_ENV !== 'test') {
  import('dotenv').then(dotenv => {
    import('path').then(path => {
      dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
    });
  });
}

// Backend configuration service (simplified version for Node.js)
class BackendConfigService {
  get(key: string, fallback?: string): string | null {
    return process.env[key] || fallback || null;
  }

  isAvailable(key: string): boolean {
    return !!process.env[key];
  }

  validateOpenAIKey(): { isValid: boolean; error?: string } {
    const key = this.get('OPENAI_API_KEY');
    if (!key) {
      return { isValid: false, error: 'OPENAI_API_KEY is required but not set' };
    }
    
    if (!key.startsWith('sk-')) {
      return { isValid: false, error: 'OPENAI_API_KEY format is invalid (should start with sk-)' };
    }
    
    if (key.length < 40) {
      return { isValid: false, error: 'OPENAI_API_KEY is too short' };
    }
    
    return { isValid: true };
  }
}

const backendConfig = new BackendConfigService();

// OpenAI model configuration with enhanced validation
const OPENAI_CONFIG = {
  model: backendConfig.get('OPENAI_MODEL') || 'gpt-4-turbo-preview',
  maxTokens: {
    workout: 3000,
    meal: 2000,
    adaptation: 1500,
    recommendation: 1000,
    default: 2000
  },
  temperature: {
    workout: 0.7,
    meal: 0.8,
    adaptation: 0.6,
    recommendation: 0.7,
    recipe: 0.8
  },
  timeout: 30000, // 30 second timeout
  maxRetries: 3,
  initialDelay: 2000,
  retryableErrorCodes: [429] // Rate limit errors
};

interface UserProfile {
  fitnessGoal: 'strength' | 'weight-loss' | 'endurance';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  targetMuscles: string[];
  equipment: string[];
  workoutDays: number;
  timePerWorkout: number;
}

interface Exercise {
  id: string;
  name: string;
  description: string;
  muscleGroups: string[];
  equipment: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string[];
}

export class OpenAIService {
  private openai: OpenAI | null = null;
  private rateLimiter: RateLimiter;
  private exerciseFallback: ExerciseAPIFallbackManager;
  private requestCount = 0;
  private tokenUsage = {
    prompt: 0,
    completion: 0,
    total: 0
  };

  constructor() {
    // Initialize rate limiter - 10 requests per minute
    this.rateLimiter = new RateLimiter(10, 10 / 60);
    this.exerciseFallback = new ExerciseAPIFallbackManager();
  }

  private getOpenAI(): OpenAI {
    if (!this.openai) {
      const validation = backendConfig.validateOpenAIKey();
      if (!validation.isValid) {
        throw new Error(`OpenAI configuration error: ${validation.error}`);
      }
      
      const apiKey = backendConfig.get('OPENAI_API_KEY')!;
      
      this.openai = new OpenAI({
        apiKey,
        timeout: OPENAI_CONFIG.timeout,
        maxRetries: 0, // We handle retries ourselves
      });
      
      console.log('OpenAI client initialized successfully');
    }
    
    return this.openai;
  }

  // Get token usage statistics
  getUsageStats() {
    return {
      requestCount: this.requestCount,
      tokenUsage: { ...this.tokenUsage },
      estimatedCost: this.calculateEstimatedCost()
    };
  }

  private calculateEstimatedCost(): number {
    // GPT-4 pricing (as of 2024)
    const promptCostPer1k = 0.03;
    const completionCostPer1k = 0.06;
    
    const promptCost = (this.tokenUsage.prompt / 1000) * promptCostPer1k;
    const completionCost = (this.tokenUsage.completion / 1000) * completionCostPer1k;
    
    return promptCost + completionCost;
  }

  // Generic method for making OpenAI calls with retry logic
  private async makeOpenAIRequest(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number,
    temperature: number
  ): Promise<string> {
    const operationId = logger.startOperation('openai_api_request', {
      component: 'openai',
      operation: 'api_request',
      metadata: {
        model: OPENAI_CONFIG.model,
        maxTokens,
        temperature,
        promptLength: systemPrompt.length + userPrompt.length
      }
    });

    const startTime = Date.now();

    try {
      // Apply rate limiting
      await this.rateLimiter.acquire();
      
      logger.debug('Making OpenAI API request', {
        operation: 'openai_request_start',
        component: 'openai',
        metadata: {
          operationId,
          model: OPENAI_CONFIG.model,
          maxTokens,
          temperature
        }
      });
      
      // Use retry wrapper for API call
      const completion = await withRetry(async () => {
        const response = await this.getOpenAI().chat.completions.create({
          model: OPENAI_CONFIG.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: maxTokens,
          temperature: temperature
        });
        
        // Track usage
        if (response.usage) {
          this.tokenUsage.prompt += response.usage.prompt_tokens;
          this.tokenUsage.completion += response.usage.completion_tokens;
          this.tokenUsage.total += response.usage.total_tokens;
        }
        
        return response;
      }, {
        maxRetries: 3,
        initialDelay: 2000,
        retryableErrors: (error) => {
          if (error.response) {
            const status = error.response.status;
            return status === 429 || status >= 500;
          }
          return error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET';
        }
      });
      
      this.requestCount++;
      const duration = Date.now() - startTime;
      
      // Log successful API call
      logExternalApiCall('openai', 'chat/completions', duration, true);
      
      logger.endOperation(operationId, 'openai_api_request', true, undefined, {
        component: 'openai',
        metadata: {
          duration,
          tokenUsage: completion.usage,
          model: OPENAI_CONFIG.model,
          responseLength: completion.choices[0].message.content?.length || 0
        }
      });
      
      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }
      
      return content;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      // Log failed API call
      logExternalApiCall('openai', 'chat/completions', duration, false, errorObj);
      
      logger.endOperation(operationId, 'openai_api_request', false, errorObj, {
        component: 'openai',
        metadata: {
          duration,
          model: OPENAI_CONFIG.model,
          errorType: errorObj.name,
          errorMessage: errorObj.message
        }
      });
      
      throw error;
    }
  }

  async generateWorkoutPlan(userProfile: UserProfile, exercises?: Exercise[]): Promise<any> {
    const startTime = Date.now();
    const userId = 'system'; // Will be passed from calling context in real usage
    
    try {
      logger.info('Starting workout plan generation', {
        operation: 'workout_generation_start',
        component: 'openai',
        userId,
        metadata: {
          fitnessGoal: userProfile.fitnessGoal,
          experienceLevel: userProfile.experienceLevel,
          workoutDays: userProfile.workoutDays,
          exerciseCount: exercises?.length || 0
        }
      });
      
      // Use exercise fallback manager if no exercises provided
      const resolvedExercises = exercises || await this.exerciseFallback.getExercises(userProfile);
      
      const prompt = this.createWorkoutGenerationPrompt(userProfile, resolvedExercises);
      
      const systemPrompt = "You are a professional fitness trainer creating personalized workout plans. Output ONLY valid JSON that matches the exact structure requested. No additional text or formatting.";
      const content = await this.makeOpenAIRequest(
        systemPrompt,
        prompt,
        OPENAI_CONFIG.maxTokens.workout,
        OPENAI_CONFIG.temperature.workout
      );
      
      try {
        const plan = JSON.parse(content);
        
        // Enhanced validation with recovery
        if (!this.validateWorkoutPlanStructure(plan)) {
          logger.warn('Invalid workout plan structure from OpenAI, attempting recovery', {
            operation: 'workout_validation_failed',
            component: 'openai',
            userId,
            metadata: { planKeys: Object.keys(plan || {}) }
          });
          
          // Try to recover the plan
          const recoveredPlan = this.recoverWorkoutPlan(plan, userProfile);
          
          // Validate the recovered plan
          if (this.validateWorkoutPlanStructure(recoveredPlan)) {
            logger.info('Successfully recovered invalid workout plan', {
              operation: 'workout_plan_recovered',
              component: 'openai',
              userId,
              metadata: { recoveredWeeks: recoveredPlan.weeks?.length || 0 }
            });
            
            return recoveredPlan;
          }
          
          // If recovery fails, use fallback
          logger.warn('Plan recovery failed, using fallback', {
            operation: 'workout_recovery_failed',
            component: 'openai',
            userId
          });
          
          return this.getFallbackWorkoutPlan();
        }
        
        const duration = Date.now() - startTime;
        
        // Log successful workout generation
        logWorkoutGeneration(
          userId,
          userProfile.fitnessGoal,
          duration,
          true,
          this.getUsageStats().tokenUsage
        );
        
        logger.info('Workout plan generated successfully', {
          operation: 'workout_generation_success',
          component: 'openai',
          userId,
          metadata: {
            duration,
            planType: userProfile.fitnessGoal,
            workoutCount: plan.weeks?.[0]?.days?.length || 0,
            tokenUsage: this.getUsageStats().tokenUsage
          }
        });
        
        return plan;
      } catch (parseError) {
        logger.warn('Failed to parse OpenAI response, attempting JSON extraction', {
          operation: 'workout_generation_parse_error',
          component: 'openai',
          userId,
          metadata: {
            responseLength: content.length,
            responsePreview: content.substring(0, 200)
          }
        }, parseError instanceof Error ? parseError : new Error(String(parseError)));
        
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extractedPlan = JSON.parse(jsonMatch[0]);
            const duration = Date.now() - startTime;
            
            logWorkoutGeneration(
              userId,
              userProfile.fitnessGoal,
              duration,
              true,
              this.getUsageStats().tokenUsage
            );
            
            logger.info('Successfully extracted JSON from OpenAI response', {
              operation: 'workout_generation_extracted',
              component: 'openai',
              userId,
              metadata: { duration, planType: userProfile.fitnessGoal }
            });
            
            return extractedPlan;
          } catch (extractError) {
            logger.error('Failed to extract JSON from OpenAI response', {
              operation: 'workout_generation_extract_error',
              component: 'openai',
              userId
            }, extractError instanceof Error ? extractError : new Error(String(extractError)));
          }
        }
        
        logger.warn('Returning fallback workout plan due to parse failure', {
          operation: 'workout_generation_fallback',
          component: 'openai',
          userId,
          metadata: { reason: 'parse_failure' }
        });
        
        return this.getFallbackWorkoutPlan();
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      // Log failed workout generation
      logWorkoutGeneration(
        userId,
        userProfile.fitnessGoal,
        duration,
        false,
        this.getUsageStats().tokenUsage,
        errorObj
      );
      
      logger.error('Workout plan generation failed', {
        operation: 'workout_generation_error',
        component: 'openai',
        userId,
        metadata: {
          duration,
          planType: userProfile.fitnessGoal,
          errorType: errorObj.name,
          errorCode: (error as any).code,
          httpStatus: (error as any).response?.status
        }
      }, errorObj);
      
      // Check for specific error types and log appropriately
      if ((error as any).response?.status === 429) {
        logger.warn('OpenAI rate limit exceeded', {
          operation: 'openai_rate_limit',
          component: 'openai',
          userId,
          metadata: { retryAfter: (error as any).response?.headers?.['retry-after'] }
        });
      } else if ((error as any).code === 'insufficient_quota') {
        logger.error('OpenAI quota exceeded - billing issue', {
          operation: 'openai_quota_exceeded',
          component: 'openai',
          userId,
          metadata: { suggestedAction: 'Check OpenAI billing and add credits' }
        });
      } else if (errorObj.message.includes('quota')) {
        logger.error('OpenAI quota related error', {
          operation: 'openai_quota_error',
          component: 'openai',
          userId,
          metadata: { suggestedAction: 'Check OpenAI billing and add credits' }
        });
      }
      
      logger.info('Returning fallback workout plan due to error', {
        operation: 'workout_generation_fallback',
        component: 'openai',
        userId,
        metadata: { reason: 'api_error', errorType: errorObj.name }
      });
      
      return this.getFallbackWorkoutPlan();
    }
  }

  private createWorkoutGenerationPrompt(userProfile: UserProfile, exercises: Exercise[]): string {
    const now = new Date().toISOString();
    
    return `Generate a 3-week progressive workout plan as a JSON object with this EXACT structure:
{
  "id": "generated-${Date.now()}",
  "name": "AI Generated Workout Plan",
  "description": "Personalized workout plan based on user goals",
  "duration": 3,
  "weeks": [
    {
      "weekNumber": 1,
      "days": [
        {
          "dayNumber": 1,
          "name": "Day 1 - Push",
          "description": "Chest, shoulders, and triceps focus",
          "exercises": [
            {
              "exercise": {
                "id": "exercise-id",
                "name": "Exercise Name",
                "description": "Exercise description",
                "muscleGroups": ["chest", "triceps"],
                "equipment": ["dumbbell"],
                "difficulty": "${userProfile.experienceLevel}",
                "instructions": ["Step 1", "Step 2", "Step 3"]
              },
              "sets": 3,
              "reps": 12,
              "restTime": 60,
              "notes": "Form tips",
              "phase": "warmup|main|cooldown"
            }
          ]
        }
      ]
    }
  ],
  "targetMuscleGroups": ["chest", "back", "legs"],
  "difficulty": "${userProfile.experienceLevel}",
  "createdAt": "${now}",
  "updatedAt": "${now}"
}

User Requirements:
- Experience Level: ${userProfile.experienceLevel}
- Fitness Goal: ${userProfile.fitnessGoal}
- Target Muscles: ${userProfile.targetMuscles?.join(', ') || 'All muscle groups'}
- Available Equipment: ${userProfile.equipment?.join(', ') || 'Bodyweight only'}
- Workout Days per Week: ${userProfile.workoutDays || 3}
- Time per Workout: ${userProfile.timePerWorkout || 45} minutes

Create a 3-week progressive program with ${userProfile.workoutDays || 3} workout days per week. Each week should have the same workout structure but with progressive overload.

PROGRESSIVE OVERLOAD STRATEGY:
- Week 1: Foundation (sets: 3, reps: 8-12, rest: 60-90s)
- Week 2: Volume increase (sets: 3-4, reps: 10-15, rest: 60-75s) 
- Week 3: Intensity increase (sets: 4, reps: 6-10, rest: 90-120s)

For ${userProfile.fitnessGoal || 'general fitness'} goal:
${userProfile.fitnessGoal === 'strength' ? '- Focus on compound movements, 6-8 reps, heavier resistance\n- Include progressive overload each week\n- Longer rest periods (90-120s)' : ''}
${userProfile.fitnessGoal === 'weight-loss' ? '- Mix strength and cardio elements\n- Higher rep ranges (12-15), shorter rest (45-60s)\n- Include metabolic finishers' : ''}
${userProfile.fitnessGoal === 'endurance' ? '- Higher volume, 15+ reps\n- Circuit-style workouts with minimal rest\n- Focus on muscular endurance' : ''}

WEEKLY STRUCTURE (${userProfile.workoutDays || 3} days):
${(userProfile.workoutDays || 3) === 3 ? '- Day 1: Push (chest, shoulders, triceps) + Core\n- Day 2: Pull (back, biceps) + Core\n- Day 3: Legs & Glutes + Core' : ''}
${(userProfile.workoutDays || 3) === 4 ? '- Day 1: Upper Push (chest, shoulders, triceps)\n- Day 2: Lower Body (legs, glutes)\n- Day 3: Upper Pull (back, biceps)\n- Day 4: Full Body + Core' : ''}
${(userProfile.workoutDays || 3) === 5 ? '- Day 1: Push (chest, shoulders, triceps)\n- Day 2: Pull (back, biceps)\n- Day 3: Legs (quads, hamstrings)\n- Day 4: Upper Body (mix)\n- Day 5: Glutes & Core' : ''}

STANDARDIZED 3-PHASE WORKOUT TEMPLATE:
Each workout MUST follow this exact structure:

PHASE 1 - MOBILITY WARM-UP (2-3 exercises):
- Dynamic stretching and mobility exercises
- Light activation movements (arm circles, leg swings, etc.)
- Joint preparation exercises
- Total time: 5-8 minutes
- Sets: 1-2, Reps: 8-12, Rest: 30s
- Mark each exercise with "phase": "warmup"

PHASE 2 - ACTIVE MUSCLE ENGAGEMENT (4-6 exercises):
- Main strength training exercises
- Start with compound movements (squats, push-ups, pull-ups)
- Follow with isolation exercises targeting specific muscles
- Progressive intensity based on fitness goal
- Total time: 25-35 minutes
- Sets: 3-4, Reps: varies by goal, Rest: 60-90s
- Mark each exercise with "phase": "main"

PHASE 3 - COOLDOWN (2-3 exercises):
- Static stretching for worked muscle groups
- Core stability exercises
- Recovery and flexibility movements
- Total time: 5-10 minutes
- Sets: 1-2, Reps: 10-15 (or hold time for stretches), Rest: 30s
- Mark each exercise with "phase": "cooldown"

TOTAL EXERCISES PER WORKOUT: 8-12 exercises (2-3 warmup + 4-6 main + 2-3 cooldown)
EXERCISE DIFFICULTY: Match to user's experience level (${userProfile.experienceLevel})

Available Exercises (use these names EXACTLY as shown):
${exercises?.filter(e => e.name && e.name !== 'Unknown Exercise').map(e => `${e.name} - Targets: ${Array.isArray(e.muscleGroups) ? e.muscleGroups.join(', ') : 'general'} - Equipment: ${Array.isArray(e.equipment) ? e.equipment.join(', ') : 'bodyweight'}`).join('\n') || 'Push-ups - Targets: chest, triceps, shoulders - Equipment: bodyweight\nSquats - Targets: legs, glutes - Equipment: bodyweight\nPlank - Targets: core - Equipment: bodyweight\nLunges - Targets: legs, glutes - Equipment: bodyweight'}

Return ONLY the JSON object, no additional text.`;
  }

  private validateWorkoutPlanStructure(plan: any): boolean {
    try {
      // Check if plan exists and has required top-level fields
      if (!plan || typeof plan !== 'object') {
        logger.warn('Workout plan validation failed: Invalid or missing plan object');
        return false;
      }
      
      // Required top-level fields
      const requiredFields = ['id', 'name', 'description', 'weeks'];
      for (const field of requiredFields) {
        if (!plan[field]) {
          logger.warn(`Workout plan validation failed: Missing required field '${field}'`);
          return false;
        }
      }
      
      if (!Array.isArray(plan.weeks)) {
        logger.warn('Workout plan validation failed: weeks is not an array');
        return false;
      }
      
      // Validate weeks structure (must have 3-6 weeks)
      if (plan.weeks.length < 3 || plan.weeks.length > 6) {
        logger.warn(`Workout plan validation failed: Invalid number of weeks (${plan.weeks.length}), expected 3-6`);
        return false;
      }
      
      // Validate each week
      for (let weekIndex = 0; weekIndex < plan.weeks.length; weekIndex++) {
        const week = plan.weeks[weekIndex];
        
        if (!week.weekNumber || !week.days || !Array.isArray(week.days)) {
          logger.warn(`Workout plan validation failed: Invalid week structure at index ${weekIndex}`);
          return false;
        }
        
        // Must have 3-7 workout days per week
        if (week.days.length < 3 || week.days.length > 7) {
          logger.warn(`Workout plan validation failed: Invalid number of days (${week.days.length}) in week ${weekIndex + 1}`);
          return false;
        }
        
        // Validate each day
        for (let dayIndex = 0; dayIndex < week.days.length; dayIndex++) {
          const day = week.days[dayIndex];
          
          if (!day.dayNumber || !day.name || !day.exercises || !Array.isArray(day.exercises)) {
            logger.warn(`Workout plan validation failed: Invalid day structure at week ${weekIndex + 1}, day ${dayIndex + 1}`);
            return false;
          }
          
          // Must have 1-15 exercises per day (reasonable limits)
          if (day.exercises.length < 1 || day.exercises.length > 15) {
            logger.warn(`Workout plan validation failed: Invalid number of exercises (${day.exercises.length}) in week ${weekIndex + 1}, day ${dayIndex + 1}`);
            return false;
          }
          
          // Validate each exercise
          for (let exerciseIndex = 0; exerciseIndex < day.exercises.length; exerciseIndex++) {
            const exercise = day.exercises[exerciseIndex];
            
            // Validate sets, reps, restTime
            if (!exercise.sets || !exercise.reps || !exercise.restTime) {
              logger.warn(`Workout plan validation failed: Missing sets/reps/restTime in week ${weekIndex + 1}, day ${dayIndex + 1}, exercise ${exerciseIndex + 1}`);
              return false;
            }
            
            // Validate numeric ranges
            if (exercise.sets < 1 || exercise.sets > 10 || 
                exercise.reps < 1 || exercise.reps > 100 ||
                exercise.restTime < 0 || exercise.restTime > 600) {
              logger.warn(`Workout plan validation failed: Invalid exercise parameters in week ${weekIndex + 1}, day ${dayIndex + 1}, exercise ${exerciseIndex + 1}`);
              return false;
            }
            
            // Validate exercise details (either direct fields or nested exercise object)
            const exerciseData = exercise.exercise || exercise;
            if (!exerciseData.name || 
                !exerciseData.muscleGroups || 
                !Array.isArray(exerciseData.muscleGroups) ||
                exerciseData.muscleGroups.length === 0) {
              logger.warn(`Workout plan validation failed: Invalid exercise data in week ${weekIndex + 1}, day ${dayIndex + 1}, exercise ${exerciseIndex + 1}`);
              return false;
            }
            
            // Validate phase if present
            if (exercise.phase && !['warmup', 'main', 'cooldown'].includes(exercise.phase)) {
              logger.warn(`Workout plan validation failed: Invalid phase '${exercise.phase}' in week ${weekIndex + 1}, day ${dayIndex + 1}, exercise ${exerciseIndex + 1}`);
              return false;
            }
          }
        }
      }
      
      logger.info('Workout plan validation passed', {
        operation: 'workout_plan_validation_success',
        component: 'openai',
        metadata: {
          weeks: plan.weeks.length,
          totalDays: plan.weeks.reduce((sum: number, week: any) => sum + week.days.length, 0),
          totalExercises: plan.weeks.reduce((sum: number, week: any) => 
            sum + week.days.reduce((daySum: number, day: any) => daySum + day.exercises.length, 0), 0)
        }
      });
      
      return true;
    } catch (error) {
      logger.error('Error during workout plan validation', {
        operation: 'workout_plan_validation_error',
        component: 'openai'
      }, error instanceof Error ? error : new Error(String(error)));
      
      return false;
    }
  }

  // Enhanced plan recovery for malformed AI responses
  private recoverWorkoutPlan(invalidPlan: any, userProfile: UserProfile): any {
    logger.warn('Attempting to recover malformed workout plan', {
      operation: 'workout_plan_recovery',
      component: 'openai',
      metadata: {
        hasWeeks: !!invalidPlan?.weeks,
        weeksLength: invalidPlan?.weeks?.length || 0,
        planKeys: Object.keys(invalidPlan || {})
      }
    });

    try {
      // If plan has some structure, try to fix it
      if (invalidPlan && typeof invalidPlan === 'object') {
        const recovered = {
          id: invalidPlan.id || `recovered-${Date.now()}`,
          name: invalidPlan.name || 'AI Generated Workout Plan',
          description: invalidPlan.description || 'Personalized workout plan',
          duration: invalidPlan.duration || 3,
          weeks: [],
          targetMuscleGroups: invalidPlan.targetMuscleGroups || ['general'],
          difficulty: invalidPlan.difficulty || userProfile.experienceLevel,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Try to recover weeks structure
        if (invalidPlan.weeks && Array.isArray(invalidPlan.weeks)) {
          recovered.weeks = invalidPlan.weeks.slice(0, 6).map((week: any, weekIndex: number) => {
            const recoveredWeek = {
              weekNumber: week.weekNumber || weekIndex + 1,
              days: []
            };

            if (week.days && Array.isArray(week.days)) {
              recoveredWeek.days = week.days.slice(0, 7).map((day: any, dayIndex: number) => {
                const recoveredDay = {
                  dayNumber: day.dayNumber || dayIndex + 1,
                  name: day.name || `Day ${dayIndex + 1}`,
                  description: day.description || '',
                  exercises: []
                };

                if (day.exercises && Array.isArray(day.exercises)) {
                  recoveredDay.exercises = day.exercises.slice(0, 15).map((exercise: any) => {
                    const exerciseData = exercise.exercise || exercise;
                    
                    return {
                      exercise: {
                        id: exerciseData.id || `exercise-${Date.now()}-${Math.random()}`,
                        name: exerciseData.name || 'Unknown Exercise',
                        description: exerciseData.description || 'Exercise description',
                        muscleGroups: Array.isArray(exerciseData.muscleGroups) ? 
                          exerciseData.muscleGroups : ['general'],
                        equipment: Array.isArray(exerciseData.equipment) ? 
                          exerciseData.equipment : ['bodyweight'],
                        difficulty: exerciseData.difficulty || userProfile.experienceLevel,
                        instructions: Array.isArray(exerciseData.instructions) ? 
                          exerciseData.instructions : ['Perform the exercise with proper form']
                      },
                      sets: Math.max(1, Math.min(10, exercise.sets || 3)),
                      reps: Math.max(1, Math.min(100, exercise.reps || 10)),
                      restTime: Math.max(0, Math.min(600, exercise.restTime || 60)),
                      notes: exercise.notes || '',
                      phase: ['warmup', 'main', 'cooldown'].includes(exercise.phase) ? 
                        exercise.phase : 'main'
                    };
                  });
                }

                return recoveredDay;
              });
            }

            return recoveredWeek;
          });
        }

        // Validate the recovered plan
        if (this.validateWorkoutPlanStructure(recovered)) {
          logger.info('Successfully recovered malformed workout plan', {
            operation: 'workout_plan_recovery_success',
            component: 'openai',
            metadata: {
              originalWeeks: invalidPlan?.weeks?.length || 0,
              recoveredWeeks: recovered.weeks.length
            }
          });
          
          return recovered;
        }
      }
    } catch (error) {
      logger.error('Failed to recover workout plan', {
        operation: 'workout_plan_recovery_error',
        component: 'openai'
      }, error instanceof Error ? error : new Error(String(error)));
    }

    // If recovery fails, return fallback
    logger.warn('Plan recovery failed, using fallback', {
      operation: 'workout_plan_recovery_fallback',
      component: 'openai'
    });
    
    return this.getFallbackWorkoutPlan();
  }

  private getFallbackWorkoutPlan(): any {
    const now = new Date().toISOString();
    
    // Use the comprehensive exercise database for fallback
    const { exerciseDatabase } = require('../../data/exerciseDatabase');
    
    // Select appropriate exercises from the database
    const pushUps = exerciseDatabase.find((ex: any) => ex.name === 'Push-Ups');
    const squats = exerciseDatabase.find((ex: any) => ex.name === 'Squats');
    const lunges = exerciseDatabase.find((ex: any) => ex.name === 'Lunges');
    const plank = exerciseDatabase.find((ex: any) => ex.name === 'Plank');
    const mountainClimbers = exerciseDatabase.find((ex: any) => ex.name === 'Mountain Climbers');
    
    return {
      id: 'ai-generated-plan',
      name: 'AI Generated Workout Plan',
      description: 'Personalized bodyweight workout plan',
      duration: 3,
      weeks: [
        {
          weekNumber: 1,
          days: [
            {
              dayNumber: 1,
              name: 'Day 1 - Full Body',
              description: 'Complete full body strength workout with 3-phase structure',
              exercises: [
                // PHASE 1 - MOBILITY WARM-UP
                {
                  exercise: {
                    id: 'arm-circles',
                    name: 'Arm Circles',
                    description: 'Dynamic shoulder mobility warm-up',
                    muscleGroups: ['shoulders'],
                    equipment: ['bodyweight'],
                    difficulty: 'beginner',
                    instructions: ['Stand with arms extended to sides', 'Make small circles, gradually increasing size', 'Reverse direction after half the reps']
                  },
                  sets: 2,
                  reps: 10,
                  restTime: 30,
                  notes: 'Warm-up phase - prepare shoulders for movement',
                  phase: 'warmup'
                },
                {
                  exercise: {
                    id: 'walking-lunge',
                    name: 'Walking Lunge',
                    description: 'Dynamic hip mobility warm-up',
                    muscleGroups: ['legs', 'hips'],
                    equipment: ['bodyweight'],
                    difficulty: 'beginner',
                    instructions: ['Hold wall for support', 'Swing one leg forward and back', 'Switch legs after completing reps']
                  },
                  sets: 2,
                  reps: 8,
                  restTime: 30,
                  notes: 'Warm-up phase - prepare hips for movement',
                  phase: 'warmup'
                },
                
                // PHASE 2 - ACTIVE MUSCLE ENGAGEMENT
                {
                  exercise: {
                    id: squats?.id || 'squats',
                    name: squats?.name || 'Squats',
                    description: squats?.description || 'A fundamental lower body exercise',
                    muscleGroups: squats?.muscleGroups || ['legs'],
                    equipment: squats?.equipment || ['bodyweight'],
                    difficulty: squats?.difficulty || 'beginner',
                    instructions: squats?.instructions || ['Stand with feet shoulder-width apart', 'Lower hips back and down', 'Return to standing position']
                  },
                  sets: 3,
                  reps: 12,
                  restTime: 60,
                  notes: 'Main phase - compound lower body movement',
                  phase: 'main'
                },
                {
                  exercise: {
                    id: pushUps?.id || 'push-ups',
                    name: pushUps?.name || 'Push-Ups',
                    description: pushUps?.description || 'Upper body pushing exercise',
                    muscleGroups: pushUps?.muscleGroups || ['chest', 'triceps'],
                    equipment: pushUps?.equipment || ['bodyweight'],
                    difficulty: pushUps?.difficulty || 'beginner',
                    instructions: pushUps?.instructions || ['Start in plank position', 'Lower body to ground', 'Push back up to starting position']
                  },
                  sets: 3,
                  reps: 10,
                  restTime: 60,
                  notes: 'Main phase - compound upper body movement',
                  phase: 'main'
                },
                {
                  exercise: {
                    id: lunges?.id || 'lunges',
                    name: lunges?.name || 'Lunges',
                    description: lunges?.description || 'Unilateral leg exercise',
                    muscleGroups: lunges?.muscleGroups || ['legs', 'glutes'],
                    equipment: lunges?.equipment || ['bodyweight'],
                    difficulty: lunges?.difficulty || 'beginner',
                    instructions: lunges?.instructions || ['Step forward with one leg', 'Lower hips until knees at 90 degrees', 'Push back to start']
                  },
                  sets: 3,
                  reps: 10,
                  restTime: 60,
                  notes: 'Main phase - unilateral leg strengthening',
                  phase: 'main'
                },
                {
                  exercise: {
                    id: plank?.id || 'plank',
                    name: plank?.name || 'Plank',
                    description: plank?.description || 'Core stability exercise',
                    muscleGroups: plank?.muscleGroups || ['core'],
                    equipment: plank?.equipment || ['bodyweight'],
                    difficulty: plank?.difficulty || 'beginner',
                    instructions: plank?.instructions || ['Start in forearm plank position', 'Keep body straight', 'Hold position']
                  },
                  sets: 3,
                  reps: 30,
                  restTime: 45,
                  notes: 'Main phase - core stability',
                  phase: 'main'
                },
                
                // PHASE 3 - COOLDOWN
                {
                  exercise: {
                    id: 'hamstring-stretch',
                    name: 'Hamstring Stretch',
                    description: 'Static hamstring flexibility stretch',
                    muscleGroups: ['hamstrings'],
                    equipment: ['bodyweight'],
                    difficulty: 'beginner',
                    instructions: ['Sit with one leg extended', 'Reach forward toward toes', 'Hold stretch for specified time']
                  },
                  sets: 2,
                  reps: 30,
                  restTime: 30,
                  notes: 'Cooldown phase - hold for 30 seconds each side',
                  phase: 'cooldown'
                },
                {
                  exercise: {
                    id: 'chest-stretch',
                    name: 'Chest Stretch',
                    description: 'Static chest and shoulder stretch',
                    muscleGroups: ['chest', 'shoulders'],
                    equipment: ['bodyweight'],
                    difficulty: 'beginner',
                    instructions: ['Stand in doorway', 'Place arm against frame', 'Step forward to stretch chest']
                  },
                  sets: 2,
                  reps: 30,
                  restTime: 30,
                  notes: 'Cooldown phase - hold for 30 seconds each arm',
                  phase: 'cooldown'
                }
              ]
            },
            {
              dayNumber: 2,
              name: 'Day 2 - Rest',
              description: 'Recovery day',
              exercises: []
            },
            {
              dayNumber: 3,
              name: 'Day 3 - Full Body',
              description: 'Complete full body strength workout',
              exercises: [
                {
                  exercise: {
                    id: squats?.id || 'squats',
                    name: squats?.name || 'Squats',
                    description: squats?.description || 'A fundamental lower body exercise',
                    muscleGroups: squats?.muscleGroups || ['legs'],
                    equipment: squats?.equipment || ['bodyweight'],
                    difficulty: squats?.difficulty || 'beginner',
                    instructions: squats?.instructions || ['Stand with feet shoulder-width apart', 'Lower hips back and down', 'Return to standing position']
                  },
                  sets: 3,
                  reps: 12,
                  restTime: 60,
                  notes: 'Keep your back straight and chest up'
                },
                {
                  exercise: {
                    id: pushUps?.id || 'push-ups',
                    name: pushUps?.name || 'Push-Ups',
                    description: pushUps?.description || 'Upper body pushing exercise',
                    muscleGroups: pushUps?.muscleGroups || ['chest', 'triceps'],
                    equipment: pushUps?.equipment || ['bodyweight'],
                    difficulty: pushUps?.difficulty || 'beginner',
                    instructions: pushUps?.instructions || ['Start in plank position', 'Lower body to ground', 'Push back up to starting position']
                  },
                  sets: 3,
                  reps: 10,
                  restTime: 60,
                  notes: 'Keep elbows at 45-degree angle'
                },
                {
                  exercise: {
                    id: mountainClimbers?.id || 'mountain-climbers',
                    name: mountainClimbers?.name || 'Mountain Climbers',
                    description: mountainClimbers?.description || 'Dynamic cardio exercise',
                    muscleGroups: mountainClimbers?.muscleGroups || ['core', 'cardio'],
                    equipment: mountainClimbers?.equipment || ['bodyweight'],
                    difficulty: mountainClimbers?.difficulty || 'beginner',
                    instructions: mountainClimbers?.instructions || ['Start in plank position', 'Alternate bringing knees to chest', 'Keep core tight']
                  },
                  sets: 3,
                  reps: 20,
                  restTime: 45,
                  notes: 'Keep hips level and core tight'
                }
              ]
            }
          ]
        }
      ],
      targetMuscleGroups: ['legs', 'chest', 'triceps', 'core'],
      difficulty: 'beginner',
      createdAt: now,
      updatedAt: now
    };
  }

  async generateMealPlan(userProfile: any, preferences: any): Promise<any> {
    const startTime = Date.now();
    const userId = 'system'; // Will be passed from calling context in real usage
    
    try {
      console.log('DEBUG: OpenAI generateMealPlan called with userProfile:', JSON.stringify(userProfile, null, 2));
      console.log('DEBUG: OpenAI generateMealPlan called with preferences:', JSON.stringify(preferences, null, 2));
      
      logger.info('Starting meal plan generation', {
        operation: 'meal_plan_generation_start',
        component: 'openai',
        userId,
        metadata: {
          fitnessGoal: userProfile.fitnessGoal,
          dietaryRestrictions: preferences.dietaryRestrictions?.length || 0,
          allergies: preferences.allergies?.length || 0,
          preferredCuisines: preferences.preferredCuisines?.length || 0
        }
      });
      
      console.log('DEBUG: About to call createMealPlanPrompt');
      const prompt = this.createMealPlanPrompt(userProfile, preferences);
      console.log('DEBUG: Prompt created successfully');
      
      const systemPrompt = "You are a professional nutritionist creating personalized meal plans. Output ONLY valid JSON that matches the exact structure requested. No additional text or formatting.";
      const content = await this.makeOpenAIRequest(
        systemPrompt,
        prompt,
        OPENAI_CONFIG.maxTokens.meal,
        OPENAI_CONFIG.temperature.meal
      );
      
      try {
        const plan = JSON.parse(content);
        const duration = Date.now() - startTime;
        
        logger.info('Meal plan generated successfully', {
          operation: 'meal_plan_generation_success',
          component: 'openai',
          userId,
          metadata: {
            duration,
            planType: 'meal_plan',
            daysGenerated: plan.length || 0,
            tokenUsage: this.getUsageStats().tokenUsage
          }
        });
        
        // Transform to frontend-compatible format
        const transformedPlan = this.transformMealPlanForFrontend(plan);
        return transformedPlan;
      } catch (parseError) {
        logger.warn('Failed to parse meal plan response, returning fallback', {
          operation: 'meal_plan_parse_error',
          component: 'openai',
          userId,
          metadata: {
            responseLength: content.length,
            responsePreview: content.substring(0, 200)
          }
        }, parseError instanceof Error ? parseError : new Error(String(parseError)));
        
        const fallback = this.getFallbackMealPlan();
        return this.transformMealPlanForFrontend(fallback);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      logger.error('Meal plan generation failed', {
        operation: 'meal_plan_generation_error',
        component: 'openai',
        userId,
        metadata: {
          duration,
          errorType: errorObj.name,
          errorCode: (error as any).code,
          httpStatus: (error as any).response?.status
        }
      }, errorObj);
      
      const fallback = this.getFallbackMealPlan();
      return this.transformMealPlanForFrontend(fallback);
    }
  }

  private createMealPlanPrompt(userProfile: any, preferences: any): string {
    const calorieGoal = this.calculateCalorieGoal(userProfile);
    
    return `Generate a 7-day meal plan as a JSON object with this EXACT structure:
[
  {
    "day": 1,
    "date": "${new Date().toISOString().split('T')[0]}",
    "meals": [
      {
        "type": "breakfast",
        "items": [
          {
            "name": "Food Item Name",
            "calories": 300,
            "protein": 15,
            "carbs": 40,
            "fat": 10,
            "servingSize": "1 cup",
            "servingUnit": "cup"
          }
        ]
      },
      {
        "type": "lunch",
        "items": [
          {
            "name": "Food Item Name",
            "calories": 450,
            "protein": 25,
            "carbs": 50,
            "fat": 15,
            "servingSize": "1 serving",
            "servingUnit": "serving"
          }
        ]
      },
      {
        "type": "dinner",
        "items": [
          {
            "name": "Food Item Name",
            "calories": 500,
            "protein": 30,
            "carbs": 45,
            "fat": 20,
            "servingSize": "1 plate",
            "servingUnit": "plate"
          }
        ]
      },
      {
        "type": "snack",
        "items": [
          {
            "name": "Food Item Name",
            "calories": 150,
            "protein": 5,
            "carbs": 20,
            "fat": 6,
            "servingSize": "1 handful",
            "servingUnit": "handful"
          }
        ]
      }
    ]
  }
]

User Profile:
- Daily Calorie Goal: ${calorieGoal}
- Activity Level: ${userProfile.activityLevel}
- Fitness Goals: ${userProfile.fitnessGoals?.join(', ') || 'general health'}
- Dietary Preferences: ${userProfile.dietaryPreferences?.join(', ') || 'none'}
- Age: ${userProfile.age}
- Gender: ${userProfile.gender}
- Weight: ${userProfile.weight}kg
- Height: ${userProfile.height}cm

Preferences:
- Dietary Restrictions: ${preferences.dietaryRestrictions?.join(', ') || 'none'}
- Allergies: ${preferences.allergies?.join(', ') || 'none'}
- Favorite Foods: ${preferences.favoriteFoods?.join(', ') || 'none'}

Requirements:
- Create exactly 7 days of meals
- Each day should have breakfast, lunch, dinner, and snack
- Total daily calories should be approximately ${calorieGoal}
- Include variety in meals across the week
- Consider dietary restrictions and preferences
- Provide realistic portion sizes

Return ONLY the JSON array, no additional text.`;
  }

  private calculateCalorieGoal(userProfile: any): number {
    console.log('DEBUG: calculateCalorieGoal called with:', JSON.stringify(userProfile, null, 2));
    try {
      // Validate required fields
      if (!userProfile.weight || !userProfile.height || !userProfile.age) {
        console.warn('Missing required fields for calorie calculation, using defaults');
        return 2000; // Safe fallback
      }
      
      // Basic BMR calculation using Mifflin-St Jeor equation
      let bmr: number;
      if (userProfile.gender === 'male') {
        bmr = (10 * userProfile.weight) + (6.25 * userProfile.height) - (5 * userProfile.age) + 5;
      } else {
        bmr = (10 * userProfile.weight) + (6.25 * userProfile.height) - (5 * userProfile.age) - 161;
      }

      // Activity level multipliers
      const activityMultipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        'very-active': 1.9
      };

      // Safe handling of activityLevel with defensive programming
      let activityLevel = 'moderate'; // Default
      if (userProfile.activityLevel) {
        if (typeof userProfile.activityLevel === 'string' && userProfile.activityLevel.trim().length > 0) {
          activityLevel = userProfile.activityLevel.toLowerCase().trim();
        } else {
          console.warn('Invalid activityLevel type or empty string, using default:', typeof userProfile.activityLevel, userProfile.activityLevel);
        }
      }
      
      const multiplier = activityMultipliers[activityLevel as keyof typeof activityMultipliers] || 1.55;
    
    // Adjust based on fitness goals with safe array handling
    let calorieGoal = bmr * multiplier;
    const fitnessGoals = Array.isArray(userProfile.fitnessGoals) ? userProfile.fitnessGoals : [];
    
    if (fitnessGoals.includes('weight-loss') || fitnessGoals.includes('weight_loss')) {
      calorieGoal *= 0.85; // 15% deficit
    } else if (fitnessGoals.includes('muscle-gain') || fitnessGoals.includes('muscle_gain') || fitnessGoals.includes('strength')) {
      calorieGoal *= 1.1; // 10% surplus
    }

    return Math.round(calorieGoal);
    } catch (error) {
      console.error('Error calculating calorie goal:', error);
      return 2000; // Safe fallback
    }
  }

  private getFallbackMealPlan(): any {
    const baseDate = new Date();
    return [
      // Day 1
      {
        day: 1,
        date: new Date(baseDate.getTime()).toISOString().split('T')[0],
        meals: [
          {
            type: 'breakfast',
            items: [
              {
                name: 'Oatmeal with Berries and Almonds',
                calories: 320,
                protein: 12,
                carbs: 52,
                fat: 10,
                servingSize: '1 bowl',
                servingUnit: 'bowl',
                ingredients: ['rolled oats', 'mixed berries', 'sliced almonds', 'honey', 'milk'],
                imageUrl: getMealImageByType('breakfast')
              }
            ]
          },
          {
            type: 'lunch',
            items: [
              {
                name: 'Grilled Chicken Caesar Salad',
                calories: 420,
                protein: 38,
                carbs: 15,
                fat: 22,
                servingSize: '1 large bowl',
                servingUnit: 'bowl',
                ingredients: ['grilled chicken breast', 'romaine lettuce', 'parmesan cheese', 'caesar dressing', 'croutons'],
                imageUrl: getMealImageByType('lunch')
              }
            ]
          },
          {
            type: 'dinner',
            items: [
              {
                name: 'Baked Salmon with Quinoa and Asparagus',
                calories: 480,
                protein: 42,
                carbs: 28,
                fat: 24,
                servingSize: '1 serving',
                servingUnit: 'serving',
                ingredients: ['salmon fillet', 'quinoa', 'asparagus', 'olive oil', 'lemon', 'herbs'],
                imageUrl: getMealImageByType('dinner')
              }
            ]
          },
          {
            type: 'snack',
            items: [
              {
                name: 'Greek Yogurt with Walnuts',
                calories: 180,
                protein: 15,
                carbs: 12,
                fat: 10,
                servingSize: '1 cup',
                servingUnit: 'cup',
                ingredients: ['greek yogurt', 'chopped walnuts', 'honey'],
                imageUrl: getMealImageByType('snack')
              }
            ]
          }
        ]
      },
      // Day 2
      {
        day: 2,
        date: new Date(baseDate.getTime() + 86400000).toISOString().split('T')[0],
        meals: [
          {
            type: 'breakfast',
            items: [
              {
                name: 'Scrambled Eggs with Avocado Toast',
                calories: 350,
                protein: 20,
                carbs: 25,
                fat: 20,
                servingSize: '1 serving',
                servingUnit: 'serving',
                ingredients: ['eggs', 'whole grain bread', 'avocado', 'olive oil', 'salt', 'pepper'],
                imageUrl: getMealImageByType('breakfast')
              }
            ]
          },
          {
            type: 'lunch',
            items: [
              {
                name: 'Turkey and Hummus Wrap',
                calories: 380,
                protein: 25,
                carbs: 35,
                fat: 16,
                servingSize: '1 wrap',
                servingUnit: 'wrap',
                ingredients: ['whole wheat tortilla', 'sliced turkey', 'hummus', 'lettuce', 'tomatoes', 'cucumber'],
                imageUrl: getMealImageByType('lunch')
              }
            ]
          },
          {
            type: 'dinner',
            items: [
              {
                name: 'Lean Beef Stir-fry with Brown Rice',
                calories: 450,
                protein: 35,
                carbs: 40,
                fat: 18,
                servingSize: '1 serving',
                servingUnit: 'serving',
                ingredients: ['lean beef strips', 'mixed vegetables', 'brown rice', 'soy sauce', 'garlic', 'ginger'],
                imageUrl: getMealImageByType('dinner')
              }
            ]
          },
          {
            type: 'snack',
            items: [
              {
                name: 'Apple with Peanut Butter',
                calories: 160,
                protein: 6,
                carbs: 20,
                fat: 8,
                servingSize: '1 apple + 1 tbsp',
                servingUnit: 'serving',
                ingredients: ['apple', 'natural peanut butter'],
                imageUrl: getMealImageByType('snack')
              }
            ]
          }
        ]
      },
      // Day 3
      {
        day: 3,
        date: new Date(baseDate.getTime() + 172800000).toISOString().split('T')[0],
        meals: [
          {
            type: 'breakfast',
            items: [
              {
                name: 'Protein Smoothie Bowl',
                calories: 340,
                protein: 25,
                carbs: 45,
                fat: 8,
                servingSize: '1 bowl',
                servingUnit: 'bowl',
                ingredients: ['protein powder', 'banana', 'spinach', 'berries', 'almond milk', 'chia seeds'],
                imageUrl: getMealImageByType('breakfast')
              }
            ]
          },
          {
            type: 'lunch',
            items: [
              {
                name: 'Quinoa Buddha Bowl',
                calories: 400,
                protein: 18,
                carbs: 55,
                fat: 14,
                servingSize: '1 bowl',
                servingUnit: 'bowl',
                ingredients: ['quinoa', 'chickpeas', 'roasted vegetables', 'tahini dressing', 'mixed greens'],
                imageUrl: getMealImageByType('lunch')
              }
            ]
          },
          {
            type: 'dinner',
            items: [
              {
                name: 'Grilled Chicken with Sweet Potato',
                calories: 470,
                protein: 40,
                carbs: 35,
                fat: 18,
                servingSize: '1 serving',
                servingUnit: 'serving',
                ingredients: ['chicken breast', 'sweet potato', 'green beans', 'olive oil', 'herbs'],
                imageUrl: getMealImageByType('dinner')
              }
            ]
          },
          {
            type: 'snack',
            items: [
              {
                name: 'Trail Mix',
                calories: 170,
                protein: 5,
                carbs: 15,
                fat: 12,
                servingSize: '1/4 cup',
                servingUnit: 'cup',
                ingredients: ['mixed nuts', 'dried fruit', 'dark chocolate pieces'],
                imageUrl: getMealImageByType('snack')
              }
            ]
          }
        ]
      },
      // Day 4
      {
        day: 4,
        date: new Date(baseDate.getTime() + 259200000).toISOString().split('T')[0],
        meals: [
          {
            type: 'breakfast',
            items: [
              {
                name: 'Greek Yogurt Parfait',
                calories: 310,
                protein: 20,
                carbs: 40,
                fat: 8,
                servingSize: '1 parfait',
                servingUnit: 'parfait',
                ingredients: ['greek yogurt', 'granola', 'berries', 'honey', 'vanilla extract'],
                imageUrl: getMealImageByType('breakfast')
              }
            ]
          },
          {
            type: 'lunch',
            items: [
              {
                name: 'Tuna Salad with Whole Grain Crackers',
                calories: 360,
                protein: 30,
                carbs: 25,
                fat: 15,
                servingSize: '1 serving',
                servingUnit: 'serving',
                ingredients: ['canned tuna', 'mixed greens', 'whole grain crackers', 'olive oil', 'lemon'],
                imageUrl: getMealImageByType('lunch')
              }
            ]
          },
          {
            type: 'dinner',
            items: [
              {
                name: 'Baked Cod with Roasted Vegetables',
                calories: 440,
                protein: 38,
                carbs: 30,
                fat: 16,
                servingSize: '1 serving',
                servingUnit: 'serving',
                ingredients: ['cod fillet', 'broccoli', 'bell peppers', 'zucchini', 'olive oil', 'herbs'],
                imageUrl: getMealImageByType('dinner')
              }
            ]
          },
          {
            type: 'snack',
            items: [
              {
                name: 'Cottage Cheese with Berries',
                calories: 150,
                protein: 14,
                carbs: 15,
                fat: 4,
                servingSize: '1/2 cup',
                servingUnit: 'cup',
                ingredients: ['cottage cheese', 'fresh berries'],
                imageUrl: getMealImageByType('snack')
              }
            ]
          }
        ]
      },
      // Day 5
      {
        day: 5,
        date: new Date(baseDate.getTime() + 345600000).toISOString().split('T')[0],
        meals: [
          {
            type: 'breakfast',
            items: [
              {
                name: 'Whole Grain Toast with Almond Butter',
                calories: 330,
                protein: 14,
                carbs: 30,
                fat: 18,
                servingSize: '2 slices',
                servingUnit: 'slices',
                ingredients: ['whole grain bread', 'almond butter', 'banana slices', 'cinnamon'],
                imageUrl: getMealImageByType('breakfast')
              }
            ]
          },
          {
            type: 'lunch',
            items: [
              {
                name: 'Lentil Soup with Side Salad',
                calories: 390,
                protein: 20,
                carbs: 50,
                fat: 12,
                servingSize: '1 bowl + salad',
                servingUnit: 'serving',
                ingredients: ['lentils', 'vegetables', 'vegetable broth', 'mixed greens', 'vinaigrette'],
                imageUrl: getMealImageByType('lunch')
              }
            ]
          },
          {
            type: 'dinner',
            items: [
              {
                name: 'Turkey Meatballs with Zucchini Noodles',
                calories: 420,
                protein: 35,
                carbs: 20,
                fat: 22,
                servingSize: '1 serving',
                servingUnit: 'serving',
                ingredients: ['ground turkey', 'zucchini', 'tomato sauce', 'herbs', 'olive oil'],
                imageUrl: getMealImageByType('dinner')
              }
            ]
          },
          {
            type: 'snack',
            items: [
              {
                name: 'Hummus with Vegetable Sticks',
                calories: 140,
                protein: 6,
                carbs: 18,
                fat: 6,
                servingSize: '1/4 cup + veggies',
                servingUnit: 'serving',
                ingredients: ['hummus', 'carrot sticks', 'celery', 'bell pepper strips'],
                imageUrl: getMealImageByType('snack')
              }
            ]
          }
        ]
      },
      // Day 6
      {
        day: 6,
        date: new Date(baseDate.getTime() + 432000000).toISOString().split('T')[0],
        meals: [
          {
            type: 'breakfast',
            items: [
              {
                name: 'Veggie Omelet with Toast',
                calories: 360,
                protein: 22,
                carbs: 20,
                fat: 22,
                servingSize: '1 omelet + 1 slice',
                servingUnit: 'serving',
                ingredients: ['eggs', 'spinach', 'mushrooms', 'cheese', 'whole grain toast'],
                imageUrl: getMealImageByType('breakfast')
              }
            ]
          },
          {
            type: 'lunch',
            items: [
              {
                name: 'Chicken and Vegetable Soup',
                calories: 350,
                protein: 28,
                carbs: 30,
                fat: 12,
                servingSize: '1 large bowl',
                servingUnit: 'bowl',
                ingredients: ['chicken breast', 'mixed vegetables', 'chicken broth', 'whole grain pasta'],
                imageUrl: getMealImageByType('lunch')
              }
            ]
          },
          {
            type: 'dinner',
            items: [
              {
                name: 'Baked Tofu with Quinoa Pilaf',
                calories: 430,
                protein: 24,
                carbs: 45,
                fat: 18,
                servingSize: '1 serving',
                servingUnit: 'serving',
                ingredients: ['extra-firm tofu', 'quinoa', 'vegetables', 'soy sauce', 'sesame oil'],
                imageUrl: getMealImageByType('dinner')
              }
            ]
          },
          {
            type: 'snack',
            items: [
              {
                name: 'Protein Smoothie',
                calories: 180,
                protein: 20,
                carbs: 15,
                fat: 5,
                servingSize: '1 smoothie',
                servingUnit: 'smoothie',
                ingredients: ['protein powder', 'banana', 'almond milk', 'spinach'],
                imageUrl: getMealImageByType('snack')
              }
            ]
          }
        ]
      },
      // Day 7
      {
        day: 7,
        date: new Date(baseDate.getTime() + 518400000).toISOString().split('T')[0],
        meals: [
          {
            type: 'breakfast',
            items: [
              {
                name: 'Chia Seed Pudding with Fruit',
                calories: 300,
                protein: 12,
                carbs: 35,
                fat: 14,
                servingSize: '1 cup',
                servingUnit: 'cup',
                ingredients: ['chia seeds', 'almond milk', 'vanilla', 'berries', 'coconut flakes'],
                imageUrl: getMealImageByType('breakfast')
              }
            ]
          },
          {
            type: 'lunch',
            items: [
              {
                name: 'Salmon Salad Bowl',
                calories: 410,
                protein: 32,
                carbs: 25,
                fat: 20,
                servingSize: '1 bowl',
                servingUnit: 'bowl',
                ingredients: ['grilled salmon', 'mixed greens', 'quinoa', 'avocado', 'olive oil dressing'],
                imageUrl: getMealImageByType('lunch')
              }
            ]
          },
          {
            type: 'dinner',
            items: [
              {
                name: 'Lean Pork Tenderloin with Roasted Root Vegetables',
                calories: 460,
                protein: 38,
                carbs: 35,
                fat: 18,
                servingSize: '1 serving',
                servingUnit: 'serving',
                ingredients: ['pork tenderloin', 'sweet potatoes', 'carrots', 'brussels sprouts', 'herbs'],
                imageUrl: getMealImageByType('dinner')
              }
            ]
          },
          {
            type: 'snack',
            items: [
              {
                name: 'Dark Chocolate and Almonds',
                calories: 160,
                protein: 4,
                carbs: 12,
                fat: 12,
                servingSize: '1 oz chocolate + 10 almonds',
                servingUnit: 'serving',
                ingredients: ['dark chocolate', 'raw almonds'],
                imageUrl: getMealImageByType('snack')
              }
            ]
          }
        ]
      }
    ];
  }

  /**
   * Transform meal plan from backend format to frontend format
   * Backend: [{ day: 1, date: "...", meals: [...] }]
   * Frontend: [{ name: "Day 1", meals: [...] }]
   */
  private transformMealPlanForFrontend(backendPlan: any[]): any[] {
    if (!Array.isArray(backendPlan)) {
      console.warn('Invalid meal plan format, expected array:', typeof backendPlan);
      return [];
    }

    return backendPlan.map((day: any, index: number) => {
      // Handle both backend format { day: 1, date: "...", meals: [...] } 
      // and possible direct meal format { meals: [...] }
      const dayNumber = day.day || (index + 1);
      const dayName = `Day ${dayNumber}`;
      
      return {
        name: dayName,
        meals: day.meals || []
      };
    });
  }



  async generateSmartWorkoutAdaptation(
    userFeedback: {
      completionRate: number;
      difficultyRating: number;
      timeConstraints?: number;
      equipmentChanges?: string[];
      injuryReports?: string[];
    },
    currentWorkout: any
  ): Promise<{
    adaptedWorkout: any;
    adaptationReasons: string[];
    progressionNotes: string[];
  }> {
    try {
      const prompt = `Analyze user feedback and adapt workout:

Current Workout: ${JSON.stringify(currentWorkout, null, 2)}

User Feedback:
- Completion Rate: ${userFeedback.completionRate}% (0-100%)
- Difficulty Rating: ${userFeedback.difficultyRating}/5
- Time Available: ${userFeedback.timeConstraints || 'no change'} minutes
- Equipment Changes: ${userFeedback.equipmentChanges?.join(', ') || 'none'}
- Injury Reports: ${userFeedback.injuryReports?.join(', ') || 'none'}

Adaptation Rules:
- If completion rate < 70%, reduce volume or difficulty
- If difficulty rating < 2/5, increase intensity
- If difficulty rating > 4/5, reduce intensity
- If time constraints, prioritize compound movements
- If equipment unavailable, suggest alternatives
- If injuries reported, provide modifications

Return JSON with this structure:
{
  "adaptedWorkout": {
    // Modified workout with same structure as input
  },
  "adaptationReasons": ["reason1", "reason2"],
  "progressionNotes": ["note1", "note2"]
}`;

      console.log('OpenAI service: Generating workout adaptation');
      
      // Apply rate limiting
      await this.rateLimiter.acquire();
      
      // Use retry wrapper for API call
      const completion = await withRetry(async () => {
        const response = await this.getOpenAI().chat.completions.create({
          model: OPENAI_CONFIG.model,
          messages: [
            {
              role: "system",
              content: "You are an AI fitness coach adapting workouts based on user performance. Return only valid JSON."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: OPENAI_CONFIG.maxTokens.adaptation,
          temperature: OPENAI_CONFIG.temperature.adaptation
        });
        
        // Track usage
        if (response.usage) {
          this.tokenUsage.prompt += response.usage.prompt_tokens;
          this.tokenUsage.completion += response.usage.completion_tokens;
          this.tokenUsage.total += response.usage.total_tokens;
        }
        
        return response;
      }, {
        maxRetries: OPENAI_CONFIG.maxRetries,
        initialDelay: OPENAI_CONFIG.initialDelay,
        retryableErrors: (error) => {
          if (error.response) {
            const status = error.response.status;
            return status === 429 || status >= 500;
          }
          return error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET';
        }
      });
      
      const content = completion.choices[0].message.content;
      if (!content) throw new Error('No content received');
      
      return JSON.parse(content);
    } catch (error) {
      console.error('Error generating workout adaptation:', error);
      return {
        adaptedWorkout: currentWorkout,
        adaptationReasons: ["Unable to analyze feedback - maintaining current workout"],
        progressionNotes: ["Continue with current routine and monitor progress"]
      };
    }
  }

  async generateExerciseRecommendations(
    userProfile: UserProfile,
    availableEquipment: string[],
    targetMuscleGroups: string[],
    excludeExercises?: string[]
  ): Promise<{
    recommended: Exercise[];
    reasoning: string[];
    progressionPath: string[];
  }> {
    try {
      const prompt = `Generate 8-12 exercise recommendations:

User Profile:
- Experience: ${userProfile.experienceLevel}
- Goal: ${userProfile.fitnessGoal}
- Available Equipment: ${availableEquipment.join(', ')}
- Target Muscles: ${targetMuscleGroups.join(', ')}
- Exclude: ${excludeExercises?.join(', ') || 'none'}

Requirements:
- Mix of compound and isolation exercises
- Progressive difficulty from beginner to advanced
- Equipment-appropriate alternatives
- Focus on ${userProfile.fitnessGoal} goal

Return JSON:
{
  "recommended": [
    {
      "id": "unique-id",
      "name": "Exercise Name",
      "description": "Brief description",
      "muscleGroups": ["primary", "secondary"],
      "equipment": ["required equipment"],
      "difficulty": "beginner|intermediate|advanced",
      "instructions": ["step1", "step2", "step3"]
    }
  ],
  "reasoning": ["why these exercises were chosen"],
  "progressionPath": ["how to progress from beginner to advanced"]
}`;

      console.log('OpenAI service: Generating exercise recommendations');
      
      // Apply rate limiting
      await this.rateLimiter.acquire();
      
      // Use retry wrapper for API call
      const completion = await withRetry(async () => {
        const response = await this.getOpenAI().chat.completions.create({
          model: OPENAI_CONFIG.model,
          messages: [
            {
              role: "system",
              content: "You are a fitness expert recommending exercises. Return only valid JSON."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: OPENAI_CONFIG.maxTokens.workout,
          temperature: OPENAI_CONFIG.temperature.recommendation
        });
        
        // Track usage
        if (response.usage) {
          this.tokenUsage.prompt += response.usage.prompt_tokens;
          this.tokenUsage.completion += response.usage.completion_tokens;
          this.tokenUsage.total += response.usage.total_tokens;
        }
        
        return response;
      }, {
        maxRetries: OPENAI_CONFIG.maxRetries,
        initialDelay: OPENAI_CONFIG.initialDelay,
        retryableErrors: (error) => {
          if (error.response) {
            const status = error.response.status;
            return status === 429 || status >= 500;
          }
          return error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET';
        }
      });
      
      const content = completion.choices[0].message.content;
      if (!content) throw new Error('No content received');
      
      return JSON.parse(content);
    } catch (error) {
      console.error('Error generating exercise recommendations:', error);
      return {
        recommended: [],
        reasoning: ["Unable to generate recommendations"],
        progressionPath: ["Start with bodyweight basics", "Progress to weighted variations"]
      };
    }
  }

  async detectPlateauAndSuggestChanges(
    workoutHistory: any[],
    performanceMetrics: {
      strengthProgress: number[];
      completionRates: number[];
      difficultyRatings: number[];
      timeToCompletion: number[];
    }
  ): Promise<{
    plateauDetected: boolean;
    plateauAnalysis: string;
    recommendations: string[];
    workoutModifications: any;
  }> {
    try {
      const prompt = `Analyze workout performance data for plateau detection:

Workout History (last ${workoutHistory.length} sessions):
${JSON.stringify(workoutHistory.slice(-10), null, 2)}

Performance Metrics:
- Strength Progress: ${performanceMetrics.strengthProgress.join(', ')}%
- Completion Rates: ${performanceMetrics.completionRates.join(', ')}%
- Difficulty Ratings: ${performanceMetrics.difficultyRatings.join(', ')}/5
- Time to Complete: ${performanceMetrics.timeToCompletion.join(', ')} minutes

Plateau Indicators:
- Strength progress < 5% over 4+ sessions
- Completion rates consistently high (>90%) with low difficulty ratings (<3)
- Performance stagnation for 2+ weeks

Return JSON:
{
  "plateauDetected": true/false,
  "plateauAnalysis": "detailed analysis of current state",
  "recommendations": ["specific actionable recommendations"],
  "workoutModifications": {
    "intensityIncrease": "percentage or description",
    "volumeChanges": "increase/decrease details",
    "exerciseVariations": ["new exercise suggestions"],
    "restPeriodAdjustments": "timing changes"
  }
}`;

      console.log('OpenAI service: Analyzing plateau and generating suggestions');
      
      // Apply rate limiting
      await this.rateLimiter.acquire();
      
      // Use retry wrapper for API call
      const completion = await withRetry(async () => {
        const response = await this.getOpenAI().chat.completions.create({
          model: OPENAI_CONFIG.model,
          messages: [
            {
              role: "system",
              content: "You are a sports scientist analyzing training plateaus. Return only valid JSON."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: OPENAI_CONFIG.maxTokens.adaptation,
          temperature: OPENAI_CONFIG.temperature.adaptation
        });
        
        // Track usage
        if (response.usage) {
          this.tokenUsage.prompt += response.usage.prompt_tokens;
          this.tokenUsage.completion += response.usage.completion_tokens;
          this.tokenUsage.total += response.usage.total_tokens;
        }
        
        return response;
      }, {
        maxRetries: OPENAI_CONFIG.maxRetries,
        initialDelay: OPENAI_CONFIG.initialDelay,
        retryableErrors: (error) => {
          if (error.response) {
            const status = error.response.status;
            return status === 429 || status >= 500;
          }
          return error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET';
        }
      });
      
      const content = completion.choices[0].message.content;
      if (!content) throw new Error('No content received');
      
      return JSON.parse(content);
    } catch (error) {
      console.error('Error analyzing plateau:', error);
      return {
        plateauDetected: false,
        plateauAnalysis: "Unable to analyze performance data",
        recommendations: ["Continue current routine", "Monitor progress closely"],
        workoutModifications: {
          intensityIncrease: "5-10%",
          volumeChanges: "Maintain current volume",
          exerciseVariations: [],
          restPeriodAdjustments: "No changes needed"
        }
      };
    }
  }

  async generateRecipe(params: {
    category: string;
    difficulty: string;
    prepTime: number;
    ingredients?: string[];
    dietaryRestrictions?: string[];
    cuisineType?: string;
    servings?: number;
  }): Promise<any> {
    const startTime = Date.now();
    
    try {
      const prompt = this.createRecipePrompt(params);
      
      logger.info('Starting recipe generation', {
        operation: 'recipe_generation_start',
        component: 'openai',
        metadata: {
          category: params.category,
          difficulty: params.difficulty,
          prepTime: params.prepTime
        }
      });

      const content = await this.makeOpenAIRequest(
        'You are a professional chef and nutritionist creating healthy recipes.',
        prompt,
        OPENAI_CONFIG.maxTokens.default,
        OPENAI_CONFIG.temperature.recipe || 0.8
      );
      
      try {
        const recipe = JSON.parse(content);
        const duration = Date.now() - startTime;
        
        logger.info('Recipe generated successfully', {
          operation: 'recipe_generation_success',
          component: 'openai',
          metadata: {
            duration,
            category: params.category,
            difficulty: params.difficulty,
            tokenUsage: this.getUsageStats().tokenUsage
          }
        });
        
        return recipe;
      } catch (parseError) {
        logger.warn('Failed to parse recipe response, returning fallback', {
          operation: 'recipe_parse_error',
          component: 'openai',
          metadata: {
            responseLength: content.length,
            responsePreview: content.substring(0, 200)
          }
        }, parseError instanceof Error ? parseError : new Error(String(parseError)));
        
        return this.getFallbackRecipe(params);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      logger.error('Recipe generation failed', {
        operation: 'recipe_generation_error',
        component: 'openai',
        metadata: {
          duration,
          errorType: errorObj.name,
          errorCode: (error as any).code,
          httpStatus: (error as any).response?.status
        }
      }, errorObj);
      
      return this.getFallbackRecipe(params);
    }
  }

  private createRecipePrompt(params: any): string {
    return `Generate a detailed recipe as a JSON object with this EXACT structure:
{
  "name": "Recipe Name",
  "description": "Brief description of the dish",
  "prepTime": ${params.prepTime},
  "cookTime": 25,
  "servings": ${params.servings || 4},
  "ingredients": [
    {
      "name": "Ingredient Name",
      "quantity": 2,
      "unit": "cups",
      "calories": 100,
      "protein": 5,
      "carbs": 20,
      "fat": 2,
      "fiber": 3,
      "sugar": 1,
      "sodium": 50
    }
  ],
  "instructions": [
    "Step 1: Detailed instruction",
    "Step 2: Another step",
    "Step 3: Final step"
  ],
  "imageUrl": null
}

Requirements:
- Category: ${params.category}
- Difficulty: ${params.difficulty} 
- Prep time: ${params.prepTime} minutes
- Servings: ${params.servings || 4}
${params.ingredients && params.ingredients.length > 0 ? `- Must include ingredients: ${params.ingredients.join(', ')}` : ''}
${params.dietaryRestrictions && params.dietaryRestrictions.length > 0 ? `- Dietary restrictions: ${params.dietaryRestrictions.join(', ')}` : ''}
${params.cuisineType && params.cuisineType !== 'any' ? `- Cuisine type: ${params.cuisineType}` : ''}

Generate a complete, practical recipe that follows these requirements. Include accurate nutrition information for each ingredient. Make sure the instructions are clear and detailed.`;
  }

  private getFallbackRecipe(params: any): any {
    const fallbackRecipes = {
      breakfast: {
        name: "Healthy Overnight Oats",
        description: "Creamy and nutritious overnight oats with berries",
        prepTime: params.prepTime || 10,
        cookTime: 0,
        servings: params.servings || 2,
        ingredients: [
          {
            name: "Old-fashioned oats",
            quantity: 1,
            unit: "cup",
            calories: 150,
            protein: 5,
            carbs: 27,
            fat: 3,
            fiber: 4,
            sugar: 1,
            sodium: 2
          },
          {
            name: "Milk",
            quantity: 1,
            unit: "cup",
            calories: 150,
            protein: 8,
            carbs: 12,
            fat: 8,
            fiber: 0,
            sugar: 12,
            sodium: 105
          }
        ],
        instructions: [
          "Mix oats and milk in a jar",
          "Refrigerate overnight",
          "Add toppings before serving"
        ],
        imageUrl: null
      },
      lunch: {
        name: "Grilled Chicken Salad",
        description: "Fresh garden salad with grilled chicken",
        prepTime: params.prepTime || 15,
        cookTime: 15,
        servings: params.servings || 2,
        ingredients: [
          {
            name: "Chicken breast",
            quantity: 8,
            unit: "oz",
            calories: 250,
            protein: 50,
            carbs: 0,
            fat: 3,
            fiber: 0,
            sugar: 0,
            sodium: 70
          }
        ],
        instructions: [
          "Season and grill chicken",
          "Prepare salad ingredients",
          "Combine and serve"
        ],
        imageUrl: null
      }
    };

    return fallbackRecipes[params.category as keyof typeof fallbackRecipes] || fallbackRecipes.lunch;
  }

  async supplementExerciseInfo(exercises: Array<{
    name: string;
    muscleGroups?: string[];
    equipment?: string[];
    difficulty?: string;
    userExperienceLevel?: string;
  }>): Promise<Array<{
    description: string;
    formCues: string[];
    safetyTips: string[];
    muscleActivation: string;
    difficultyAdaptations: string[];
  }>> {
    const startTime = Date.now();
    const userId = 'system';
    
    try {
      logger.info('Starting exercise information supplementation', {
        operation: 'exercise_info_start',
        component: 'openai',
        userId,
        metadata: {
          exerciseCount: exercises.length,
          userExperienceLevel: exercises[0]?.userExperienceLevel || 'beginner'
        }
      });

      const prompt = this.createExerciseInfoPrompt(exercises);
      
      const systemPrompt = "You are a professional fitness trainer and exercise physiologist. Provide detailed, accurate, and safe exercise information. Output ONLY valid JSON that matches the exact structure requested. No additional text or formatting.";
      const content = await this.makeOpenAIRequest(
        systemPrompt,
        prompt,
        OPENAI_CONFIG.maxTokens.recommendation,
        OPENAI_CONFIG.temperature.recommendation
      );

      try {
        const exerciseInfoArray = JSON.parse(content);
        const duration = Date.now() - startTime;
        
        logger.info('Exercise information generated successfully', {
          operation: 'exercise_info_success',
          component: 'openai',
          userId,
          metadata: {
            duration,
            exerciseCount: exerciseInfoArray.length,
            tokenUsage: this.getUsageStats().tokenUsage
          }
        });

        return exerciseInfoArray;
      } catch (parseError) {
        logger.warn('Failed to parse exercise info response, using fallback', {
          operation: 'exercise_info_parse_error',
          component: 'openai',
          userId,
          metadata: {
            responseLength: content.length,
            responsePreview: content.substring(0, 200)
          }
        }, parseError instanceof Error ? parseError : new Error(String(parseError)));

        return this.getFallbackExerciseInfo(exercises);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      logger.error('Exercise information generation failed', {
        operation: 'exercise_info_error',
        component: 'openai',
        userId,
        metadata: {
          duration,
          exerciseCount: exercises.length,
          errorType: errorObj.name,
          errorCode: (error as any).code,
          httpStatus: (error as any).response?.status
        }
      }, errorObj);

      return this.getFallbackExerciseInfo(exercises);
    }
  }

  private createExerciseInfoPrompt(exercises: Array<{
    name: string;
    muscleGroups?: string[];
    equipment?: string[];
    difficulty?: string;
    userExperienceLevel?: string;
  }>): string {
    const userLevel = exercises[0]?.userExperienceLevel || 'beginner';
    
    return `Generate comprehensive exercise information for ${exercises.length} exercises as a JSON array with this EXACT structure:

[
  {
    "description": "Clear, engaging description of the exercise movement and its primary purpose (50-80 words)",
    "formCues": [
      "Key form cue #1",
      "Key form cue #2", 
      "Key form cue #3",
      "Key form cue #4"
    ],
    "safetyTips": [
      "Important safety consideration #1",
      "Important safety consideration #2",
      "Common mistake to avoid"
    ],
    "muscleActivation": "Primary and secondary muscles worked, explained simply",
    "difficultyAdaptations": [
      "Easier variation for beginners",
      "Standard form",
      "Advanced progression"
    ]
  }
]

User Experience Level: ${userLevel}

For each exercise, provide information appropriate for a ${userLevel} fitness level:

${exercises.map((exercise, index) => `
${index + 1}. ${exercise.name}
   - Muscle Groups: ${exercise.muscleGroups?.join(', ') || 'General'}
   - Equipment: ${exercise.equipment?.join(', ') || 'Bodyweight'}
   - Difficulty: ${exercise.difficulty || 'Intermediate'}
`).join('')}

GUIDELINES:
- Descriptions should be motivating and educational
- Form cues must be specific and actionable
- Safety tips should prevent common injuries
- Muscle activation should explain the "why" behind the exercise
- Difficulty adaptations should provide clear progressions

For ${userLevel} level:
${userLevel === 'beginner' ? '- Focus on safety and basic movement patterns\n- Emphasize starting slow and building confidence\n- Include modifications for limited mobility' : ''}
${userLevel === 'intermediate' ? '- Balance safety with performance optimization\n- Include technique refinements\n- Provide moderate progressions' : ''}
${userLevel === 'advanced' ? '- Focus on advanced techniques and variations\n- Emphasize performance optimization\n- Include complex progressions and variations' : ''}

Return ONLY the JSON array, no additional text.`;
  }

  private getFallbackExerciseInfo(exercises: Array<{
    name: string;
    muscleGroups?: string[];
    equipment?: string[];
    difficulty?: string;
  }>): Array<{
    description: string;
    formCues: string[];
    safetyTips: string[];
    muscleActivation: string;
    difficultyAdaptations: string[];
  }> {
    return exercises.map(exercise => {
      const muscleGroup = exercise.muscleGroups?.[0] || 'multiple muscle groups';
      const equipment = exercise.equipment?.[0] || 'bodyweight';
      
      return {
        description: `${exercise.name} is an effective ${equipment} exercise that targets ${muscleGroup}. This movement helps build strength, improve muscle coordination, and enhance overall fitness through controlled, purposeful motion.`,
        formCues: [
          'Maintain proper posture throughout the movement',
          'Control the movement on both lifting and lowering phases',
          'Breathe steadily - exhale on exertion, inhale on return',
          'Keep core engaged for stability and support'
        ],
        safetyTips: [
          'Start with lighter resistance and focus on form first',
          'Stop if you feel sharp pain or discomfort',
          'Warm up properly before beginning the exercise'
        ],
        muscleActivation: `Primary muscles: ${exercise.muscleGroups?.join(', ') || 'core stabilizers'}. This exercise promotes balanced muscle development and functional strength.`,
        difficultyAdaptations: [
          'Beginner: Reduced range of motion or assisted variation',
          'Standard: Full range of motion with bodyweight or light resistance',
          'Advanced: Added resistance, tempo changes, or complex variations'
        ]
      };
    });
  }

  async generateWorkoutNames(planGoal: string, numberOfWorkouts: number, workoutTypes: string[] = []): Promise<string[]> {
    const startTime = Date.now();

    try {
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }

      const prompt = `Generate ${numberOfWorkouts} unique, engaging workout names for a fitness plan focused on "${planGoal}".

Requirements:
- Names should be motivating and specific
- Reflect the goal: ${planGoal}
- Include variety (e.g., "Day 1", "Session A", "Power Hour", etc.)
- Workout types: ${workoutTypes.length > 0 ? workoutTypes.join(', ') : 'mixed training'}
- Make them sound professional but exciting

Examples for "Increase Endurance":
- "Endurance Builder Day 1"
- "Cardio Power Session" 
- "Stamina Surge Workout"
- "Distance Destroyer"

Return ONLY a JSON array of ${numberOfWorkouts} workout names, like:
["Workout Name 1", "Workout Name 2", "Workout Name 3"]`;

      await this.rateLimiter.acquire();
      
      const completion = await withRetry(
        () => this.openai!.chat.completions.create({
          model: OPENAI_CONFIG.model,
          messages: [
            {
              role: "system",
              content: "You are a fitness trainer creating engaging workout names. Generate creative, motivating names that reflect the workout's purpose and energy. Return only a JSON array of strings."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: OPENAI_CONFIG.maxTokens.recommendation,
          temperature: OPENAI_CONFIG.temperature.recommendation
        })
      );

      this.requestCount++;
      if (completion.usage) {
        this.tokenUsage.prompt += completion.usage.prompt_tokens || 0;
        this.tokenUsage.completion += completion.usage.completion_tokens || 0;
        this.tokenUsage.total += completion.usage.total_tokens || 0;
      }

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      try {
        const names = JSON.parse(content);
        if (Array.isArray(names) && names.length === numberOfWorkouts) {
          const duration = Date.now() - startTime;
          logExternalApiCall('OpenAI', 'generateWorkoutNames', duration, true);
          logger.info(`Successfully generated ${names.length} workout names for goal: ${planGoal}`);
          return names;
        } else {
          throw new Error('Invalid response format - not an array or wrong length');
        }
      } catch (parseError) {
        logger.warn(`Failed to parse workout names for goal "${planGoal}", using fallback`);
        return this.getFallbackWorkoutNames(planGoal, numberOfWorkouts);
      }

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logExternalApiCall('OpenAI', 'generateWorkoutNames', duration, false, error);
      logger.error(`Error generating workout names for goal "${planGoal}": ${error.message}`);
      return this.getFallbackWorkoutNames(planGoal, numberOfWorkouts);
    }
  }

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
    const goalLower = (planGoal || '').toLowerCase();
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
    
    logger.info(`Using fallback workout names for goal "${planGoal}" (category: ${category})`);
    
    return names;
  }
}

export const openaiService = new OpenAIService();