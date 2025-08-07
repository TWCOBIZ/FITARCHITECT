import { useState, useEffect } from 'react'
import { api } from '../services/api'

interface TrialStatus {
  isEligible: boolean
  isActive: boolean
  daysRemaining: number
  hasUsed: boolean
  userTier: string
  parqCompleted: boolean
}

export const useTrialStatus = () => {
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrialStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/api/trial-status')
      setTrialStatus(response.data)
    } catch (err: any) {
      console.error('Error fetching trial status:', err)
      setError(err.response?.data?.error || 'Failed to fetch trial status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrialStatus()
  }, [])

  return {
    trialStatus,
    loading,
    error,
    refetch: fetchTrialStatus
  }
}