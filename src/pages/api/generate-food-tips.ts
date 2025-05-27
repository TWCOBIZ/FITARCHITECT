import { NextApiRequest, NextApiResponse } from 'next'
import OpenAI from 'openai'
import { OPENAI_MODEL } from '../../../config/openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface CategorizedTips {
  preWorkout: string[]
  postWorkout: string[]
  general: string[]
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const {
      goals,
      currentNutrition,
      calorieGoal,
      proteinGoal,
      carbsGoal,
      fatGoal
    } = req.body

    const prompt = `Given the following fitness goals and nutrition data, provide specific, actionable food tips in three categories:
    
    Fitness Goals: ${goals?.join(', ') || 'Not specified'}
    
    Current Nutrition:
    - Calories: ${currentNutrition.calories}/${calorieGoal}
    - Protein: ${currentNutrition.protein}g/${proteinGoal}g
    - Carbs: ${currentNutrition.carbs}g/${carbsGoal}g
    - Fat: ${currentNutrition.fat}g/${fatGoal}g
    
    Provide tips in these categories:
    1. Pre-workout (2-3 tips):
       - Focus on timing and types of foods
       - Energy optimization
       - Hydration
    
    2. Post-workout (2-3 tips):
       - Recovery nutrition
       - Protein timing
       - Replenishment
    
    3. General (2-3 tips):
       - Overall nutrition strategy
       - Meal timing
       - Food choices
    
    All tips should be:
    - Specific and actionable
    - Based on the user's goals and current nutrition
    - Realistic and practical
    - Written in a friendly, encouraging tone
    
    Format the response as a JSON object with three arrays:
    {
      "preWorkout": ["tip1", "tip2"],
      "postWorkout": ["tip1", "tip2"],
      "general": ["tip1", "tip2"]
    }`

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a nutrition expert providing personalized food tips. Keep tips concise, specific, and actionable."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    })

    const tips: CategorizedTips = JSON.parse(completion.choices[0].message.content || '{"preWorkout":[],"postWorkout":[],"general":[]}')
    res.status(200).json(tips)
  } catch (error) {
    console.error('Error generating food tips:', error)
    res.status(500).json({ message: 'Error generating food tips' })
  }
} 