import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import { User, UserProfile } from '../../types/user'
import { motion } from 'framer-motion'
import { workoutService } from '../../services/workoutService'
import { useWorkout } from '../../contexts/WorkoutContext'
import { api } from '../../services/api'

interface ParqQuestion {
  id: number
  question: string
  description?: string
}

const PARQ_QUESTIONS: ParqQuestion[] = [
  {
    id: 1,
    question: "Has your doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?",
    description: "This includes conditions such as heart disease, heart attack, or stroke."
  },
  {
    id: 2,
    question: "Do you feel pain in your chest when you do physical activity?",
    description: "This includes pain, pressure, or tightness in your chest."
  },
  {
    id: 3,
    question: "In the past month, have you had chest pain when you were not doing physical activity?",
    description: "This includes pain, pressure, or tightness in your chest at rest."
  },
  {
    id: 4,
    question: "Do you lose your balance because of dizziness or do you ever lose consciousness?",
    description: "This includes feeling lightheaded or fainting."
  },
  {
    id: 5,
    question: "Do you have a bone or joint problem (for example, back, knee or hip) that could be made worse by a change in your physical activity?",
    description: "This includes arthritis, osteoporosis, or recent injuries."
  },
  {
    id: 6,
    question: "Is your doctor currently prescribing drugs (for example, water pills) for your blood pressure or heart condition?",
    description: "This includes medications for hypertension, heart disease, or other cardiovascular conditions."
  },
  {
    id: 7,
    question: "Do you know of any other reason why you should not do physical activity?",
    description: "This includes any medical conditions or concerns not mentioned above."
  }
]

export const ParqForm: React.FC = () => {
  const navigate = useNavigate()
  const { updateParqStatus, user, subscriptionTier, updateProfile } = useUser()
  const { setCurrentPlan } = useWorkout()
  const [answers, setAnswers] = useState<Record<number, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [previousAnswers, setPreviousAnswers] = useState<Record<number, boolean> | null>(null)
  const [adminNotes, setAdminNotes] = useState<string[]>([])

  useEffect(() => {
    // Fetch previous answers if they exist
    api.get('/api/parq-response')
      .then(res => {
        if (res.data && res.data.answers) {
          setPreviousAnswers(res.data.answers)
          setAnswers(res.data.answers)
          setAdminNotes(res.data.notes || [])
        }
      })
      .catch(() => {})
  }, [])

  const handleAnswer = (questionId: number, answer: boolean) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Check if all questions are answered
    const allAnswered = PARQ_QUESTIONS.every(q => answers[q.id] !== undefined)
    if (!allAnswered) {
      setError('Please answer all questions before submitting.')
      setIsSubmitting(false)
      return
    }

    // Special logic: allow test user to always submit, even if answers are 'Yes'
    const isTestUser = user && user.email === 'nepacreativeagency@icloud.com';
    const hasYesAnswers = Object.values(answers).some(answer => answer === true)
    if (hasYesAnswers && !isTestUser) {
      setShowWarning(true)
      setIsSubmitting(false)
      return
    }

    try {
      await api.patch('/api/parq-response', { answers })
      updateParqStatus(true)
      updateProfile({ parqAnswers: answers })

      // Only auto-generate workout plan and route to workout-plans for paid users
      if (user && user.profile && (subscriptionTier === 'basic' || subscriptionTier === 'premium')) {
        try {
          // Efficient plan generation: fetch exercises from WGER, use GPT only for missing info
          const plan = await workoutService.generateWorkoutPlan(user.profile)
          setCurrentPlan(plan)
          navigate('/workout-plans')
          return
        } catch (err) {
          // Optionally handle error (show message, etc.)
          console.error('Failed to auto-generate workout plan:', err)
          // Fallback: route to dashboard
          navigate('/dashboard')
          return
        }
      }
      // For guests and free users, go to dashboard
      navigate('/dashboard')
    } catch {
      setError('Failed to submit PAR-Q.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleContinue = () => {
    setShowWarning(false)
    updateParqStatus(false)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="w-full max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold text-center mb-4">Physical Activity Readiness Questionnaire (PAR-Q)</h2>
          <p className="text-center text-gray-400 mb-8">
            Please answer the following questions to help us ensure your safety during physical activity.
            Your answers will help us provide appropriate exercise recommendations.
          </p>
          
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {previousAnswers && (
            <div className="bg-blue-500/20 border border-blue-500 text-blue-200 px-4 py-3 rounded-lg mb-6">
              <div className="font-semibold mb-2">Your previous PAR-Q answers are loaded. You can update them below.</div>
            </div>
          )}

          {adminNotes.length > 0 && (
            <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-200 px-4 py-3 rounded-lg mb-6">
              <div className="font-semibold mb-2">Admin Feedback / Follow-up:</div>
              <ul className="list-disc pl-6">
                {adminNotes.map((note, i) => <li key={i}>{note}</li>)}
              </ul>
            </div>
          )}

          {showWarning ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-yellow-500/20 border border-yellow-500 text-yellow-200 p-6 rounded-lg mb-6"
            >
              <h3 className="text-xl font-semibold mb-4">Medical Clearance Required</h3>
              <p className="mb-4">
                Based on your answers, we recommend consulting with your healthcare provider before starting any exercise program.
                This is to ensure your safety and well-being.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowWarning(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={handleContinue}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg transition-colors"
                >
                  Continue Anyway
                </button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {PARQ_QUESTIONS.map((question, index) => (
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-gray-900 p-6 rounded-lg space-y-4"
                >
                  <p className="font-medium text-lg">{question.question}</p>
                  {question.description && (
                    <p className="text-sm text-gray-400">{question.description}</p>
                  )}
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => handleAnswer(question.id, true)}
                      className={`flex-1 px-4 py-3 rounded-lg transition-colors ${
                        answers[question.id] === true
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAnswer(question.id, false)}
                      className={`flex-1 px-4 py-3 rounded-lg transition-colors ${
                        answers[question.id] === false
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </motion.div>
              ))}

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  )
} 