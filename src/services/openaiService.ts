import { OpenAI } from 'openai';
import { Exercise } from './wgerService';
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

const WorkoutPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  duration: z.number(),
  weeks: z.array(z.object({
    week: z.number(),
    days: z.array(z.object({
      day: z.number(),
      exercises: z.array(z.object({
        name: z.string(),
        sets: z.number(),
        reps: z.number(),
        rest: z.number().optional(),
        progression: z.string().optional(),
        notes: z.string().optional()
      }))
    }))
  })),
  targetMuscleGroups: z.array(z.string()),
  difficulty: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
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
            content: "You are a professional fitness trainer creating personalized workout plans. Output ONLY valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1200,
        temperature: 0.7
      });
      const content = completion.choices[0].message.content;
      let plan;
      try {
        plan = JSON.parse(content || '{}');
        WorkoutPlanSchema.parse(plan);
      } catch (e) {
        console.error('AI output validation failed:', e);
        return this.getFallbackWorkoutPlan();
      }
      return plan;
    } catch (error) {
      console.error('GPT API Error:', error);
      return this.getFallbackWorkoutPlan();
    }
  }

  private createWorkoutGenerationPrompt(userProfile: UserProfile, exercises: Exercise[]): string {
    return `Generate a multi-week progressive workout plan as a JSON object with this structure:
{
  "id": string,
  "name": string,
  "description": string,
  "duration": number, // in weeks
  "weeks": [
    {
      "week": number,
      "days": [
        {
          "day": number,
          "exercises": [
            { "name": string, "sets": number, "reps": number, "rest": number, "progression": string, "notes": string }
          ]
        }
      ]
    }
  ],
  "targetMuscleGroups": [string],
  "difficulty": string,
  "createdAt": string,
  "updatedAt": string
}

User Profile:
- Experience: ${userProfile.experienceLevel}
- Target Muscles: ${userProfile.targetMuscles.join(', ')}
- Available Equipment: ${userProfile.equipment.join(', ')}
- Workout Days: ${userProfile.workoutDays}
- Time per Workout: ${userProfile.timePerWorkout} minutes

Available Exercises:
${exercises.map(e => `${e.name} (Muscles: ${e.muscles.join(', ')})`).join('\n')}
`;
  }

  private getFallbackWorkoutPlan(): any {
    const now = new Date().toISOString();
    return {
      id: 'fallback',
      name: 'Basic Full Body Workout',
      description: 'A simple full body workout for beginners',
      duration: 1,
      weeks: [
        {
          week: 1,
          days: [
            {
              day: 1,
              exercises: [
                { name: 'Squats', sets: 3, reps: 10, rest: 60, progression: 'Increase reps each week', notes: 'Keep your back straight.' },
                { name: 'Push-ups', sets: 3, reps: 10, rest: 60, progression: 'Try knee push-ups if needed', notes: 'Keep elbows at 45 degrees.' },
                { name: 'Lunges', sets: 3, reps: 10, rest: 60, progression: '', notes: 'Alternate legs.' },
                { name: 'Plank', sets: 3, reps: 1, rest: 60, progression: 'Increase hold time', notes: 'Hold for 30 seconds.' }
              ]
            }
          ]
        }
      ],
      targetMuscleGroups: ['legs', 'chest', 'core'],
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

  async generateMealPlan(nutritionProfile: any): Promise<any> {
    const prompt = `\nGenerate a 7-day meal plan for a user with the following profile:\n- Calorie goal: ${nutritionProfile.calorieGoal}\n- Dietary preferences: ${nutritionProfile.dietaryPreferences.join(', ') || 'None'}\n- Allergies: ${nutritionProfile.allergies.join(', ') || 'None'}\n- Macro targets: Protein ${nutritionProfile.macroTargets.protein}g, Carbs ${nutritionProfile.macroTargets.carbs}g, Fat ${nutritionProfile.macroTargets.fat}g\n\nFor each day, provide breakfast, lunch, dinner, and snack. Each meal should include:\n- Name\n- Description\n- Calories, protein, carbs, fat\n- Serving size and unit\n- (Optional) Image URL\n\nOutput as a JSON array of 7 days, each with a date and meals array as described.\n`;

    const completion = await this.openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a registered dietitian creating personalized meal plans. Output ONLY valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1800,
      temperature: 0.7
    });
    const content = completion.choices[0].message.content;
    let plan;
    try {
      plan = JSON.parse(content || '[]');
    } catch (e) {
      throw new Error('AI output was not valid JSON');
    }
    return plan;
  }
}

export const openaiService = new OpenAIService(); 