import { NextApiRequest, NextApiResponse } from 'next'
import OpenAI from 'openai'
import { OPENAI_MODEL } from '../../../config/openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { goals, progress, streak } = req.body

    const prompt = `Generate a personalized motivational message for a fitness enthusiast with the following context:
    
    Fitness Goals: ${goals?.join(', ') || 'Not specified'}
    Current Streak: ${streak || 0} days
    Recent Progress: ${progress || 'No recent progress data'}
    
    The message should:
    1. Be inspiring and uplifting
    2. Reference their specific goals and progress
    3. Include a call to action
    4. Be concise (2-3 sentences)
    5. Use an encouraging tone
    6. Include an emoji or two
    
    Format the response as a JSON object with a single "message" field.`

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a motivational fitness coach who creates personalized, inspiring messages."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 150
    })

    const message = JSON.parse(completion.choices[0].message.content || '{"message": ""}')
    res.status(200).json(message)
  } catch (error) {
    console.error('Error generating motivation message:', error)
    res.status(500).json({ message: 'Error generating motivation message' })
  }
} 