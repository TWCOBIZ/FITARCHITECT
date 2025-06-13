import React, { createContext, useContext, useState } from 'react'

interface OpenAIContextType {
  generateResponse: (prompt: string) => Promise<string>
  generateMealPlan: (params: any) => Promise<any>
  isLoading: boolean
  error: string | null
}

const OpenAIContext = createContext<OpenAIContextType | undefined>(undefined)

export const OpenAIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateResponse = async (prompt: string): Promise<string> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate response')
      }

      const data = await response.json()
      return data.response
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const generateMealPlan = async (params: any): Promise<any> => {
    setIsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/generate-meal-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        throw new Error('Failed to generate meal plan')
      }

      const data = await response.json()
      return data.mealPlan || data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <OpenAIContext.Provider value={{ generateResponse, generateMealPlan, isLoading, error }}>
      {children}
    </OpenAIContext.Provider>
  )
}

export const useOpenAI = () => {
  const context = useContext(OpenAIContext)
  if (context === undefined) {
    throw new Error('useOpenAI must be used within an OpenAIProvider')
  }
  return context
} 