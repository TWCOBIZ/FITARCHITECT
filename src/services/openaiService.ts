import { OpenAI } from 'openai';
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
  private openai: OpenAI;

  constructor() {
    // OpenAI client will be initialized server-side
    // This is a placeholder for client-side usage
    if (typeof window !== 'undefined') {
      throw new Error('OpenAI service should not be used client-side. Use API routes instead.');
    }
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
    
    return `Generate a 3-week progressive workout plan as a JSON object with this EXACT structure:
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
            "instructions": ["Step 1", "Step 2", "Step 3"]
          },
          "sets": 3,
          "reps": 12,
          "restTime": 60,
          "notes": "Form tips"
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

User Requirements:
- Experience Level: ${userProfile.experienceLevel}
- Fitness Goal: ${userProfile.fitnessGoal}
- Target Muscles: ${userProfile.targetMuscles.join(', ')}
- Available Equipment: ${userProfile.equipment.join(', ')}
- Workout Days per Week: ${userProfile.workoutDays}
- Time per Workout: ${userProfile.timePerWorkout} minutes

Create ${userProfile.workoutDays} different workouts that can be performed during the week. Use only the available equipment. Include progressive overload across the 3 weeks.

Available Exercises (use these names exactly):
${exercises.slice(0, 20).map(e => `${e.name} - Targets: ${e.muscleGroups?.join(', ') || 'Unknown'} - Equipment: ${e.equipment?.join(', ') || 'Unknown'}`).join('\n')}

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
}

// Prevent client-side instantiation - use API routes instead
if (typeof window !== 'undefined') {
  console.warn('OpenAI service should not be imported client-side. Use API routes instead.');
}

export const openaiService = typeof window === 'undefined' ? new OpenAIService() : null; 