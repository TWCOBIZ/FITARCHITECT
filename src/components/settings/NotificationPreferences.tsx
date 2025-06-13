import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { FaBell, FaTelegram, FaClock, FaChartLine, FaRunning, FaPaperPlane } from 'react-icons/fa'
import { cardAnimations, staggerAnimations, animateWithReducedMotion, setUserMotionPreference, notificationAnimations } from '../../utils/animations'
import { TelegramService } from '../../services/telegramService'
import axios from 'axios'

interface NotificationPreferences {
  telegramEnabled: boolean
  telegramChatId: string
  workoutReminders: boolean
  workoutReminderTime: string
  nutritionTips: boolean
  nutritionTipFrequency: 'daily' | 'weekly'
  progressUpdates: boolean
  progressUpdateFrequency: 'weekly' | 'monthly'
  motivationMessages: boolean
  motivationMessageTime: string
  reducedMotion: boolean
}

const NotificationPreferences: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    telegramEnabled: false,
    telegramChatId: '',
    workoutReminders: false,
    workoutReminderTime: '09:00',
    nutritionTips: false,
    nutritionTipFrequency: 'daily',
    progressUpdates: false,
    progressUpdateFrequency: 'weekly',
    motivationMessages: false,
    motivationMessageTime: '08:00',
    reducedMotion: false
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isTestingTelegram, setIsTestingTelegram] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const fetchPreferences = async () => {
      setIsFetching(true)
      setFetchError(null)
      try {
        const res = await axios.get('/api/user/notification-preferences')
        const backendPrefs = res.data || {}
        const savedPreferences = localStorage.getItem('notificationPreferences')
        if (savedPreferences) {
          setPreferences({ ...backendPrefs, ...JSON.parse(savedPreferences) })
        } else {
          setPreferences({ ...preferences, ...backendPrefs })
        }
      } catch (err: unknown) {
        setFetchError('Could not load notification preferences from server.')
      } finally {
        setIsFetching(false)
      }
    }
    fetchPreferences()

    if (containerRef.current) {
      animateWithReducedMotion(
        () => cardAnimations.reveal(containerRef.current!) as any,
        () => {}
      )

      if (sectionRefs.current.length > 0) {
        animateWithReducedMotion(
          () => staggerAnimations.fadeIn(sectionRefs.current.filter(Boolean) as HTMLElement[]),
          () => {}
        )
      }
    }
  }, [])

  const handleTestTelegram = async () => {
    if (!preferences.telegramChatId) {
      toast.error('Please enter your Telegram Chat ID first')
      return
    }

    setIsTestingTelegram(true)
    try {
      const telegramService = TelegramService.getInstance()
      telegramService.setConfig({ chatId: preferences.telegramChatId })
      
      const result = await telegramService.sendMessage(`
🤖 <b>Test Message from FitArchitect</b>

This is a test message to verify your Telegram integration is working correctly.
If you're seeing this, your setup is successful! 🎉

You'll receive notifications here for:
${preferences.workoutReminders ? '✅ Workout reminders\n' : '❌ Workout reminders\n'}
${preferences.nutritionTips ? '✅ Nutrition tips\n' : '❌ Nutrition tips\n'}
${preferences.progressUpdates ? '✅ Progress updates\n' : '❌ Progress updates\n'}
${preferences.motivationMessages ? '✅ Motivation messages\n' : '❌ Motivation messages\n'}
      `)

      if (result.success) {
        toast.success('Test message sent successfully! Check your Telegram.')
      } else {
        toast.error(result.error?.message || 'Failed to send test message')
      }
    } catch (error) {
      console.error('Error testing Telegram:', error)
      toast.error('Error testing Telegram integration. Please try again.')
    } finally {
      setIsTestingTelegram(false)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      if (preferences.telegramEnabled && preferences.telegramChatId) {
        const telegramService = TelegramService.getInstance()
        const result = await telegramService.validateChatId(preferences.telegramChatId)
        
        if (!result.success) {
          toast.error(result.error?.message || 'Invalid Telegram Chat ID')
          setIsLoading(false)
          return
        }
        
        telegramService.setConfig({ chatId: preferences.telegramChatId })
      }

      localStorage.setItem('notificationPreferences', JSON.stringify(preferences))
      await axios.put('/api/user/notification-preferences', preferences)
      setUserMotionPreference(preferences.reducedMotion)

      if (containerRef.current) {
        animateWithReducedMotion(
          () => notificationAnimations.pulse(containerRef.current!) as any,
          () => {}
        )
      }

      toast.success('Notification preferences saved successfully!')
    } catch (error) {
      console.error('Error saving notification preferences:', error)
      toast.error('Failed to save notification preferences. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (
    key: keyof NotificationPreferences,
    value: boolean | string | 'daily' | 'weekly' | 'monthly'
  ) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const enabledSummary = [
    preferences.workoutReminders && 'Workout Reminders',
    preferences.nutritionTips && 'Nutrition Tips',
    preferences.progressUpdates && 'Progress Updates',
    preferences.motivationMessages && 'Motivation Messages',
    preferences.telegramEnabled && 'Telegram',
    preferences.reducedMotion && 'Reduced Motion'
  ].filter(Boolean).join(', ')

  if (isFetching) {
    return <div className="p-6 text-gray-500">Loading notification preferences...</div>
  }
  if (fetchError) {
    return <div className="p-6 text-red-500">{fetchError}</div>
  }

  return (
    <div ref={containerRef} className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Notification Preferences</h2>
      <div className="mb-4 text-sm text-gray-600">
        <strong>Enabled:</strong> {enabledSummary || 'None'}
      </div>

      <div 
        ref={el => { sectionRefs.current[0] = el }}
        className="mb-8"
        onMouseEnter={e => animateWithReducedMotion(
          () => cardAnimations.hover(e.currentTarget as HTMLElement) as any,
          () => {}
        )}
        onMouseLeave={e => animateWithReducedMotion(
          () => cardAnimations.hoverOut(e.currentTarget as HTMLElement) as any,
          () => {}
        )}
      >
        <div className="flex items-center mb-4">
          <FaRunning className="text-indigo-500 text-xl mr-2" />
          <h3 className="text-lg font-semibold">Motion Preferences</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="reducedMotion"
              checked={preferences.reducedMotion}
              onChange={(e) => handleChange('reducedMotion', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="reducedMotion" className="ml-2 text-gray-700">
              Reduce Motion Effects
            </label>
          </div>
          <p className="text-sm text-gray-500">
            When enabled, animations and transitions will be minimized throughout the app.
          </p>
        </div>
      </div>

      <div 
        ref={el => { sectionRefs.current[1] = el }}
        className="mb-8"
        onMouseEnter={e => animateWithReducedMotion(
          () => cardAnimations.hover(e.currentTarget as HTMLElement) as any,
          () => {}
        )}
        onMouseLeave={e => animateWithReducedMotion(
          () => cardAnimations.hoverOut(e.currentTarget as HTMLElement) as any,
          () => {}
        )}
      >
        <div className="flex items-center mb-4">
          <FaTelegram className="text-blue-500 text-xl mr-2" />
          <h3 className="text-lg font-semibold">Telegram Integration</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="telegramEnabled"
              checked={preferences.telegramEnabled}
              onChange={(e) => handleChange('telegramEnabled', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="telegramEnabled" className="ml-2 text-gray-700">
              Enable Telegram Notifications
            </label>
          </div>
          {preferences.telegramEnabled && (
            <div>
              <label htmlFor="telegramChatId" className="block text-sm font-medium text-gray-700 mb-1">
                Telegram Chat ID
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  id="telegramChatId"
                  value={preferences.telegramChatId}
                  onChange={(e) => handleChange('telegramChatId', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your Telegram Chat ID"
                />
                <button
                  onClick={handleTestTelegram}
                  disabled={isTestingTelegram || !preferences.telegramChatId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {isTestingTelegram ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Testing...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane className="mr-2" />
                      Test
                    </>
                  )}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                To get your Chat ID:
                1. Start a chat with @FitArchitectBot
                2. Send /start
                3. Send /id to get your Chat ID
              </p>
            </div>
          )}
        </div>
      </div>

      <div 
        ref={el => { sectionRefs.current[2] = el }}
        className="mb-8"
        onMouseEnter={e => animateWithReducedMotion(
          () => cardAnimations.hover(e.currentTarget as HTMLElement) as any,
          () => {}
        )}
        onMouseLeave={e => animateWithReducedMotion(
          () => cardAnimations.hoverOut(e.currentTarget as HTMLElement) as any,
          () => {}
        )}
      >
        <div className="flex items-center mb-4">
          <FaBell className="text-green-500 text-xl mr-2" />
          <h3 className="text-lg font-semibold">Workout Reminders</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="workoutReminders"
              checked={preferences.workoutReminders}
              onChange={(e) => handleChange('workoutReminders', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="workoutReminders" className="ml-2 text-gray-700">
              Enable Workout Reminders
            </label>
          </div>
          {preferences.workoutReminders && (
            <div>
              <label htmlFor="workoutReminderTime" className="block text-sm font-medium text-gray-700 mb-1">
                Reminder Time
              </label>
              <input
                type="time"
                id="workoutReminderTime"
                value={preferences.workoutReminderTime}
                onChange={(e) => handleChange('workoutReminderTime', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      <div 
        ref={el => { sectionRefs.current[3] = el }}
        className="mb-8"
        onMouseEnter={e => animateWithReducedMotion(
          () => cardAnimations.hover(e.currentTarget as HTMLElement) as any,
          () => {}
        )}
        onMouseLeave={e => animateWithReducedMotion(
          () => cardAnimations.hoverOut(e.currentTarget as HTMLElement) as any,
          () => {}
        )}
      >
        <div className="flex items-center mb-4">
          <FaClock className="text-yellow-500 text-xl mr-2" />
          <h3 className="text-lg font-semibold">Nutrition Tips</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="nutritionTips"
              checked={preferences.nutritionTips}
              onChange={(e) => handleChange('nutritionTips', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="nutritionTips" className="ml-2 text-gray-700">
              Enable Nutrition Tips
            </label>
          </div>
          {preferences.nutritionTips && (
            <div>
              <label htmlFor="nutritionTipFrequency" className="block text-sm font-medium text-gray-700 mb-1">
                Frequency
              </label>
              <select
                id="nutritionTipFrequency"
                value={preferences.nutritionTipFrequency}
                onChange={(e) => handleChange('nutritionTipFrequency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div 
        ref={el => { sectionRefs.current[4] = el }}
        className="mb-8"
        onMouseEnter={e => animateWithReducedMotion(
          () => cardAnimations.hover(e.currentTarget as HTMLElement) as any,
          () => {}
        )}
        onMouseLeave={e => animateWithReducedMotion(
          () => cardAnimations.hoverOut(e.currentTarget as HTMLElement) as any,
          () => {}
        )}
      >
        <div className="flex items-center mb-4">
          <FaChartLine className="text-purple-500 text-xl mr-2" />
          <h3 className="text-lg font-semibold">Progress Updates</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="progressUpdates"
              checked={preferences.progressUpdates}
              onChange={(e) => handleChange('progressUpdates', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="progressUpdates" className="ml-2 text-gray-700">
              Enable Progress Updates
            </label>
          </div>
          {preferences.progressUpdates && (
            <div>
              <label htmlFor="progressUpdateFrequency" className="block text-sm font-medium text-gray-700 mb-1">
                Frequency
              </label>
              <select
                id="progressUpdateFrequency"
                value={preferences.progressUpdateFrequency}
                onChange={(e) => handleChange('progressUpdateFrequency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          onMouseEnter={e => animateWithReducedMotion(
            () => cardAnimations.hover(e.currentTarget as HTMLElement) as any,
            () => {}
          )}
          onMouseLeave={e => animateWithReducedMotion(
            () => cardAnimations.hoverOut(e.currentTarget as HTMLElement) as any,
            () => {}
          )}
        >
          {isLoading ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </div>
          ) : (
            'Save Preferences'
          )}
        </button>
      </div>
    </div>
  )
}

export default NotificationPreferences 