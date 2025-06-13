import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

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

  constructor() {
    // Initialize OpenAI client lazily to avoid startup errors
  }

  private getOpenAI(): OpenAI {
    if (!this.openai) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is required');
      }
      
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    
    return this.openai;
  }

  async generateWorkoutPlan(userProfile: UserProfile, exercises: Exercise[]): Promise<any> {
    try {
      console.log('OpenAI service: Starting workout plan generation');
      const prompt = this.createWorkoutGenerationPrompt(userProfile, exercises);
      console.log('OpenAI service: Created prompt, calling OpenAI API');
      
      const completion = await this.getOpenAI().chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: "system",
            content: "You are a professional fitness trainer creating personalized workout plans. Output ONLY valid JSON that matches the exact structure requested. No additional text or formatting."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      });
      
      console.log('OpenAI service: Received response from OpenAI');
      const content = completion.choices[0].message.content;
      if (!content) {
        console.error('OpenAI service: No content received from OpenAI');
        throw new Error('No content received from OpenAI');
      }
      
      try {
        const plan = JSON.parse(content);
        console.log('OpenAI service: Successfully parsed workout plan');
        return plan;
      } catch (parseError) {
        console.error('OpenAI service: AI output validation failed:', parseError);
        console.error('OpenAI service: Raw AI response:', content);
        console.log('OpenAI service: Returning fallback workout plan');
        return this.getFallbackWorkoutPlan();
      }
    } catch (error) {
      console.error('OpenAI service: GPT API Error:', error);
      console.error('OpenAI service: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });
      console.log('OpenAI service: Returning fallback workout plan due to error');
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

Create ${userProfile.workoutDays} different workouts that can be performed during the week. Use only the available equipment. Each workout should target different muscle groups for optimal recovery.

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

  async generateMealPlan(userProfile: any, preferences: any): Promise<any> {
    try {
      const prompt = this.createMealPlanPrompt(userProfile, preferences);
      
      const completion = await this.getOpenAI().chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: "system",
            content: "You are a professional nutritionist creating personalized meal plans. Output ONLY valid JSON that matches the exact structure requested. No additional text or formatting."
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
      
      try {
        const plan = JSON.parse(content);
        return plan;
      } catch (parseError) {
        console.error('AI meal plan validation failed:', parseError);
        console.error('Raw AI response:', content);
        return this.getFallbackMealPlan();
      }
    } catch (error) {
      console.error('GPT API Error for meal plan:', error);
      return this.getFallbackMealPlan();
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

    const multiplier = activityMultipliers[userProfile.activityLevel as keyof typeof activityMultipliers] || 1.55;
    
    // Adjust based on fitness goals
    let calorieGoal = bmr * multiplier;
    if (userProfile.fitnessGoals?.includes('weight-loss')) {
      calorieGoal *= 0.85; // 15% deficit
    } else if (userProfile.fitnessGoals?.includes('muscle-gain')) {
      calorieGoal *= 1.1; // 10% surplus
    }

    return Math.round(calorieGoal);
  }

  private getFallbackMealPlan(): any {
    return [
      {
        day: 1,
        date: new Date().toISOString().split('T')[0],
        meals: [
          {
            type: 'breakfast',
            items: [
              {
                name: 'Oatmeal with Berries',
                calories: 300,
                protein: 10,
                carbs: 50,
                fat: 8,
                servingSize: '1 bowl',
                servingUnit: 'bowl'
              }
            ]
          },
          {
            type: 'lunch',
            items: [
              {
                name: 'Grilled Chicken Salad',
                calories: 400,
                protein: 35,
                carbs: 20,
                fat: 18,
                servingSize: '1 large bowl',
                servingUnit: 'bowl'
              }
            ]
          },
          {
            type: 'dinner',
            items: [
              {
                name: 'Baked Salmon with Vegetables',
                calories: 450,
                protein: 40,
                carbs: 25,
                fat: 22,
                servingSize: '1 serving',
                servingUnit: 'serving'
              }
            ]
          },
          {
            type: 'snack',
            items: [
              {
                name: 'Greek Yogurt with Nuts',
                calories: 150,
                protein: 12,
                carbs: 10,
                fat: 8,
                servingSize: '1 cup',
                servingUnit: 'cup'
              }
            ]
          }
        ]
      }
    ];
  }

  async supplementExerciseInfo(exerciseName: string, muscleGroup: string): Promise<string> {
    try {
      const completion = await this.getOpenAI().chat.completions.create({
        model: 'gpt-4',
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

export const openaiService = new OpenAIService();