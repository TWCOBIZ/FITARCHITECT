import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTrialStatus } from '../../hooks/useTrialStatus'
import { useAuth } from '../../contexts/AuthContext'

interface TrialStatusBannerProps {
  className?: string
}

const TrialStatusBanner: React.FC<TrialStatusBannerProps> = ({ className = '' }) => {
  const { user } = useAuth()
  const { trialStatus, loading } = useTrialStatus()
  const navigate = useNavigate()

  // Only show for free users
  if (!user || (user as any).tier !== 'free' || loading || !trialStatus) {
    return null
  }

  const { isEligible, isActive, daysRemaining, hasUsed, parqCompleted } = trialStatus

  // Don't show banner if user is not eligible and hasn't used trial
  if (!isEligible && !hasUsed && !isActive) {
    return null
  }

  const getBannerContent = () => {
    if (!parqCompleted) {
      return {
        title: 'Unlock Your Free 3-Day Trial',
        description: 'Complete the PAR-Q health assessment to start your free workout generation trial',
        action: 'Complete PAR-Q',
        color: 'from-blue-600 to-blue-700',
        icon: '🔓'
      }
    }

    if (isEligible && !isActive) {
      return {
        title: 'Start Your Free 3-Day Trial',
        description: 'Generate unlimited personalized workouts for 3 days',
        action: 'Start Trial',
        color: 'from-green-600 to-green-700',
        icon: '🚀'
      }
    }

    if (isActive) {
      const totalTrialDays = 3;
      const daysUsed = totalTrialDays - daysRemaining;
      const progressPercentage = Math.round((daysUsed / totalTrialDays) * 100);
      
      return {
        title: `${daysRemaining} Day${daysRemaining !== 1 ? 's' : ''} Remaining`,
        description: `Your free workout generation trial is active (${progressPercentage}% used)`,
        action: daysRemaining <= 1 ? 'Upgrade Now' : 'Extend Trial',
        color: daysRemaining <= 1 ? 'from-orange-600 to-red-600' : 'from-green-600 to-green-700',
        icon: daysRemaining <= 1 ? '⚠️' : '✨',
        progress: progressPercentage
      }
    }

    if (hasUsed && !isActive) {
      return {
        title: 'Trial Ended',
        description: 'Your 3-day workout generation trial has ended',
        action: 'Upgrade to Continue',
        color: 'from-gray-600 to-gray-700',
        icon: '💪'
      }
    }

    return null
  }

  const content = getBannerContent()
  if (!content) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg bg-gradient-to-r ${content.color} p-4 text-white shadow-lg ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <span className="text-2xl">{content.icon}</span>
          <div className="flex-1">
            <h3 className="font-bold text-lg">{content.title}</h3>
            <p className="text-white/90 text-sm">{content.description}</p>
            {(content as any).progress !== undefined && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-white/70 mb-1">
                  <span>Trial Progress</span>
                  <span>{(content as any).progress}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-white rounded-full h-2 transition-all duration-300"
                    style={{ width: `${(content as any).progress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
        <button
          className="bg-white/20 hover:bg-white/30 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ml-4"
          onClick={() => {
            // Navigate to appropriate page based on action using React Router
            if (content.action.includes('PAR-Q')) {
              navigate('/parq')
            } else if (content.action.includes('Upgrade') || content.action.includes('Extend')) {
              navigate('/subscription')
            } else if (content.action.includes('Start Trial')) {
              navigate('/workout')
            }
          }}
        >
          {content.action}
        </button>
      </div>
    </motion.div>
  )
}

export default TrialStatusBanner