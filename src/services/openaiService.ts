// OpenAI import moved inside constructor to prevent client-side loading
import { Exercise } from '../types/workout';
import { OPENAI_MODEL } from '../config/openai';
import { z } from 'zod';

interface UserProfile {
  fitnessGoal: 'strength' | 'weight-loss' | 'endurance';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  targetMuscles: string[];
  equipment: string[];
  workoutDays: number;
  timePerWorkout: number;
}

// AI-generated plan structure that matches frontend expectations
const AIWorkoutPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  duration: z.number(),
  workouts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    type: z.enum(['strength', 'cardio', 'hiit', 'flexibility', 'recovery', 'custom']),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    duration: z.number(),
    exercises: z.array(z.object({
      exercise: z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        muscleGroups: z.array(z.string()),
        equipment: z.array(z.string()),
        difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
        instructions: z.array(z.string())
      }),
      sets: z.number(),
      reps: z.number(),
      restTime: z.number(),
      weight: z.number().optional(),
      notes: z.string().optional()
    })),
    targetMuscleGroups: z.array(z.string()),
    equipment: z.array(z.string())
  })),
  targetMuscleGroups: z.array(z.string()),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  createdAt: z.string(),
  updatedAt: z.string()
});

export class OpenAIService {
  private openai: any;

  constructor() {
    // OpenAI client will be initialized server-side
    // This is a placeholder for client-side usage
    if (typeof window !== 'undefined') {
      throw new Error('OpenAI service should not be used client-side. Use API routes instead.');
    }
    
    // Dynamically import OpenAI to prevent client-side loading
    const { OpenAI } = require('openai');
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }

  async generateWorkoutPlan(userProfile: UserProfile, exercises: Exercise[]): Promise<any> {
    try {
      const prompt = this.createWorkoutGenerationPrompt(userProfile, exercises);
      const completion = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a professional fitness trainer creating personalized workout plans. Output ONLY valid JSON that matches the exact structure requested."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      });
      
      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }
      
      let plan;
      try {
        plan = JSON.parse(content);
        // Validate the plan structure
        AIWorkoutPlanSchema.parse(plan);
        return plan;
      } catch (parseError) {
        console.error('AI output validation failed:', parseError);
        console.error('Raw AI response:', content);
        return this.getFallbackWorkoutPlan();
      }
    } catch (error) {
      console.error('GPT API Error:', error);
      return this.getFallbackWorkoutPlan();
    }
  }

  private createWorkoutGenerationPrompt(userProfile: UserProfile, exercises: Exercise[]): string {
    const now = new Date().toISOString();
    const exerciseDistribution = this.getExerciseDistribution(userProfile.timePerWorkout);
    
    return `Generate a 3-week progressive workout plan with STRUCTURED workouts as a JSON object with this EXACT structure:
{
  "id": "generated-${Date.now()}",
  "name": "AI Generated Workout Plan",
  "description": "Personalized workout plan based on user goals",
  "duration": 3,
  "workouts": [
    {
      "id": "workout-1",
      "name": "Workout 1",
      "description": "Description of the workout",
      "type": "strength",
      "difficulty": "${userProfile.experienceLevel}",
      "duration": ${userProfile.timePerWorkout},
      "exercises": [
        {
          "exercise": {
            "id": "exercise-id",
            "name": "Exercise Name",
            "description": "Exercise description",
            "muscleGroups": ["chest", "triceps"],
            "equipment": ["dumbbell"],
            "difficulty": "${userProfile.experienceLevel}",
            "instructions": ["Step 1", "Step 2", "Step 3"],
            "type": "warmup"
          },
          "sets": 2,
          "reps": 10,
          "restTime": 30,
          "notes": "Warmup exercise - focus on mobility"
        }
      ],
      "targetMuscleGroups": ["chest", "triceps"],
      "equipment": ["dumbbell"]
    }
  ],
  "targetMuscleGroups": ["chest", "back", "legs"],
  "difficulty": "${userProfile.experienceLevel}",
  "createdAt": "${now}",
  "updatedAt": "${now}"
}

CRITICAL WORKOUT STRUCTURE REQUIREMENTS:
Each workout MUST follow this 3-part structure:

1. WARMUP PHASE (${this.getWarmupDuration(userProfile.timePerWorkout)} minutes):
   - Include ${exerciseDistribution.warmup} warmup exercises
   - Exercise types: dynamic stretching, joint mobility, light movement
   - Sets: 1-2, Reps: 8-12, Rest: 15-30 seconds
   - Add "type": "warmup" to each exercise

2. MAIN PHASE (${this.getMainDuration(userProfile.timePerWorkout)} minutes):
   - Include ${exerciseDistribution.main} main exercises
   - Exercise types: strength training, cardio intervals, compound movements
   - Sets: ${this.getMainSets(userProfile.experienceLevel)}, Reps: ${this.getMainReps(userProfile.experienceLevel)}, Rest: ${this.getMainRest(userProfile.timePerWorkout)} seconds
   - Add "type": "strength" or "cardio" to each exercise
   - Distribute across target muscle groups evenly

3. COOLDOWN PHASE (${this.getCooldownDuration(userProfile.timePerWorkout)} minutes):
   - Include ${exerciseDistribution.cooldown} cooldown exercises
   - Exercise types: static stretching, flexibility, relaxation
   - Sets: 1, Reps: 30 (seconds hold), Rest: 15-30 seconds
   - Add "type": "cooldown" to each exercise

User Requirements:
- Experience Level: ${userProfile.experienceLevel}
- Fitness Goal: ${userProfile.fitnessGoal}
- Target Muscles: ${userProfile.targetMuscles.join(', ')}
- Available Equipment: ${userProfile.equipment.join(', ')}
- Workout Days per Week: ${userProfile.workoutDays}
- Time per Workout: EXACTLY ${userProfile.timePerWorkout} minutes

EXERCISE SELECTION RULES:
- Use ONLY exercises from the provided list
- Ensure proper equipment compatibility
- Balance muscle groups across the week
- Progress difficulty across the 3 weeks
- Each workout should have ${exerciseDistribution.warmup + exerciseDistribution.main + exerciseDistribution.cooldown} total exercises

Available Exercises (use these names exactly):
${exercises.slice(0, 30).map(e => `${e.name} - Targets: ${e.muscleGroups?.join(', ') || 'Unknown'} - Equipment: ${e.equipment?.join(', ') || 'Unknown'}`).join('\n')}

DURATION VALIDATION:
The total calculated workout time should equal ${userProfile.timePerWorkout} minutes:
- Warmup: ~${this.getWarmupDuration(userProfile.timePerWorkout)} min
- Main: ~${this.getMainDuration(userProfile.timePerWorkout)} min  
- Cooldown: ~${this.getCooldownDuration(userProfile.timePerWorkout)} min

Return ONLY the JSON object, no additional text.`;
  }

  private getFallbackWorkoutPlan(): any {
    const now = new Date().toISOString();
    return {
      id: 'fallback-plan',
      name: 'Basic Full Body Workout',
      description: 'A simple full body workout for beginners',
      duration: 3,
      workouts: [
        {
          id: 'fallback-workout-1',
          name: 'Full Body Workout',
          description: 'Basic full body strength workout',
          type: 'strength',
          difficulty: 'beginner',
          duration: 45,
          exercises: [
            {
              exercise: {
                id: 'squats',
                name: 'Squats',
                description: 'A fundamental lower body exercise',
                muscleGroups: ['legs'],
                equipment: ['bodyweight'],
                difficulty: 'beginner',
                instructions: ['Stand with feet shoulder-width apart', 'Lower hips back and down', 'Return to standing position']
              },
              sets: 3,
              reps: 10,
              restTime: 60,
              notes: 'Keep your back straight and chest up'
            },
            {
              exercise: {
                id: 'push-ups',
                name: 'Push-ups',
                description: 'Upper body pushing exercise',
                muscleGroups: ['chest', 'triceps'],
                equipment: ['bodyweight'],
                difficulty: 'beginner',
                instructions: ['Start in plank position', 'Lower body to ground', 'Push back up to starting position']
              },
              sets: 3,
              reps: 8,
              restTime: 60,
              notes: 'Keep elbows at 45-degree angle'
            }
          ],
          targetMuscleGroups: ['legs', 'chest', 'triceps'],
          equipment: ['bodyweight']
        }
      ],
      targetMuscleGroups: ['legs', 'chest', 'triceps'],
      difficulty: 'beginner',
      createdAt: now,
      updatedAt: now
    };
  }

  async supplementExerciseInfo(exerciseName: string, muscleGroup: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: "Provide brief, clear exercise instructions. Max 100 words."
          },
          {
            role: "user",
            content: `Form instructions for ${exerciseName} (${muscleGroup})?`
          }
        ],
        max_tokens: 150
      });
      
      return completion.choices[0].message.content || "Instructions not available";
    } catch (error) {
      console.error(`Error supplementing info for ${exerciseName}:`, error);
      return "Instructions not available";
    }
  }

  async generateWorkoutNames(planGoal: string, numberOfWorkouts: number, workoutTypes: string[] = []): Promise<string[]> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a fitness trainer creating engaging workout names. Generate creative, motivating names that reflect the workout's purpose and energy. Return only a JSON array of strings."
          },
          {
            role: "user",
            content: `Generate ${numberOfWorkouts} unique, engaging workout names for a fitness plan focused on "${planGoal}".

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
["Workout Name 1", "Workout Name 2", "Workout Name 3"]`
          }
        ],
        max_tokens: 300,
        temperature: 0.8
      });
      
      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }
      
      try {
        const names = JSON.parse(content);
        if (Array.isArray(names) && names.length === numberOfWorkouts) {
          return names;
        } else {
          throw new Error('Invalid response format');
        }
      } catch (parseError) {
        console.error('Failed to parse workout names:', parseError);
        console.error('Raw response:', content);
        return this.getFallbackWorkoutNames(planGoal, numberOfWorkouts);
      }
    } catch (error) {
      console.error('Error generating workout names:', error);
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
    
    return names;
  }

  // Helper methods for workout structure
  private getExerciseDistribution(duration: number): { warmup: number; main: number; cooldown: number } {
    if (duration <= 30) {
      return { warmup: 2, main: 3, cooldown: 2 };
    } else if (duration <= 45) {
      return { warmup: 3, main: 4, cooldown: 2 };
    } else if (duration <= 60) {
      return { warmup: 3, main: 6, cooldown: 3 };
    } else {
      return { warmup: 3, main: 8, cooldown: 3 };
    }
  }

  private getWarmupDuration(totalDuration: number): number {
    return Math.max(5, Math.min(totalDuration * 0.2, 15));
  }

  private getMainDuration(totalDuration: number): number {
    return Math.round(totalDuration * 0.7);
  }

  private getCooldownDuration(totalDuration: number): number {
    return Math.max(5, Math.min(totalDuration * 0.15, 10));
  }

  private getMainSets(experienceLevel: string): string {
    return experienceLevel === 'beginner' ? '2-3' : (experienceLevel === 'intermediate' ? '3-4' : '3-5');
  }

  private getMainReps(experienceLevel: string): string {
    return experienceLevel === 'beginner' ? '8-10' : (experienceLevel === 'intermediate' ? '10-12' : '10-15');
  }

  private getMainRest(totalDuration: number): number {
    return totalDuration <= 30 ? 45 : (totalDuration <= 45 ? 60 : 90);
  }
}

// Prevent client-side instantiation - use API routes instead
if (typeof window !== 'undefined') {
  console.warn('OpenAI service should not be imported client-side. Use API routes instead.');
}

export const openaiService = typeof window === 'undefined' ? new OpenAIService() : null; 