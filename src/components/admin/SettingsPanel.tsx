import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaSave, FaExclamationTriangle, FaKey, FaDatabase, FaEnvelope, FaLock, FaBell } from 'react-icons/fa'
import { toast } from 'react-hot-toast'
import { api } from '../../services/api'
import ConfirmationModal from '../common/ConfirmationModal'

interface AppSettings {
  // General Settings
  appName: string
  appDescription: string
  supportEmail: string
  maintenanceMode: boolean
  allowRegistrations: boolean
  requireEmailVerification: boolean
  defaultUserTier: 'free' | 'basic' | 'premium'
  maxFreeUsers: number
  sessionTimeout: number

  // Feature Toggles
  features: {
    workoutGeneration: boolean
    nutritionTracking: boolean
    mealPlanning: boolean
    barcodeScanning: boolean
    telegramIntegration: boolean
    analytics: boolean
    parqRequired: boolean
  }

  // Integration Settings
  openaiSettings: {
    enabled: boolean
    model: string
    maxTokens: number
    temperature: number
  }
  
  stripeSettings: {
    enabled: boolean
    webhookSecret: string
  }

  telegramSettings: {
    enabled: boolean
    botToken: string
    webhookUrl: string
  }

  // Email Settings
  emailSettings: {
    provider: 'smtp' | 'sendgrid' | 'ses'
    fromAddress: string
    fromName: string
    smtpHost?: string
    smtpPort?: number
    smtpUser?: string
    smtpPass?: string
    sendgridApiKey?: string
    sesRegion?: string
    sesAccessKey?: string
    sesSecretKey?: string
  }

  // Security Settings
  security: {
    passwordMinLength: number
    requireStrongPassword: boolean
    maxLoginAttempts: number
    lockoutDuration: number
    jwtExpiration: string
    twoFactorRequired: boolean
    allowedOrigins: string[]
    rateLimitRequests: number
    rateLimitWindow: number
  }

  // Notification Settings
  notifications: {
    systemEmails: boolean
    marketingEmails: boolean
    weeklyDigest: boolean
    adminNotifications: string[]
    userWelcomeEmail: boolean
    subscriptionEmails: boolean
  }
}

const SettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('general')
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null)

  const tabs = [
    { id: 'general', label: 'General', icon: <FaKey /> },
    { id: 'features', label: 'Features', icon: <FaLock /> },
    { id: 'integrations', label: 'Integrations', icon: <FaDatabase /> },
    { id: 'email', label: 'Email', icon: <FaEnvelope /> },
    { id: 'security', label: 'Security', icon: <FaLock /> },
    { id: 'notifications', label: 'Notifications', icon: <FaBell /> }
  ]

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/admin/settings')
      setSettings(response.data)
      setError(null)
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!settings) return

    setConfirmModal({
      isOpen: true,
      title: 'Save Settings',
      message: 'Are you sure you want to save these settings? Some changes may require a server restart to take effect.',
      onConfirm: async () => {
        setSaving(true)
        try {
          await api.put('/api/admin/settings', settings)
          toast.success('Settings saved successfully')
          setUnsavedChanges(false)
        } catch (error) {
          console.error('Failed to save settings:', error)
          toast.error('Failed to save settings')
        } finally {
          setSaving(false)
          setConfirmModal(null)
        }
      }
    })
  }

  const updateSettings = (path: string, value: any) => {
    if (!settings) return
    
    const keys = path.split('.')
    const newSettings = { ...settings }
    let current = newSettings as any
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = value
    
    setSettings(newSettings)
    setUnsavedChanges(true)
  }

  const handleArrayUpdate = (path: string, value: string) => {
    if (!settings) return
    
    const currentArray = path.split('.').reduce((obj, key) => obj[key], settings as any) as string[]
    const newArray = value.split(',').map(item => item.trim()).filter(item => item)
    updateSettings(path, newArray)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    )
  }

  if (error || !settings) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
        <div className="flex items-center">
          <FaExclamationTriangle className="text-red-400 mr-3" />
          <div>
            <h3 className="text-red-400 font-medium">Error Loading Settings</h3>
            <p className="text-red-300 text-sm mt-1">{error}</p>
            <button
              onClick={fetchSettings}
              className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Application Settings</h1>
          <p className="text-gray-400">Configure global application settings and integrations</p>
          {unsavedChanges && (
            <div className="mt-2 text-sm text-yellow-400">
              ⚠️ You have unsaved changes
            </div>
          )}
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={saving || !unsavedChanges}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium"
        >
          <FaSave className="mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <div className="flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center pb-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        {activeTab === 'general' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4">General Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Application Name</label>
                <input
                  type="text"
                  value={settings.appName}
                  onChange={(e) => updateSettings('appName', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Support Email</label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => updateSettings('supportEmail', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Application Description</label>
              <textarea
                value={settings.appDescription}
                onChange={(e) => updateSettings('appDescription', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Default User Tier</label>
                <select
                  value={settings.defaultUserTier}
                  onChange={(e) => updateSettings('defaultUserTier', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Max Free Users</label>
                <input
                  type="number"
                  value={settings.maxFreeUsers}
                  onChange={(e) => updateSettings('maxFreeUsers', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Session Timeout (minutes)</label>
                <input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => updateSettings('sessionTimeout', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="5"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-md font-medium text-white">System Toggles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => updateSettings('maintenanceMode', e.target.checked)}
                    className="mr-3"
                  />
                  <span className="text-gray-300">Maintenance Mode</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.allowRegistrations}
                    onChange={(e) => updateSettings('allowRegistrations', e.target.checked)}
                    className="mr-3"
                  />
                  <span className="text-gray-300">Allow New Registrations</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.requireEmailVerification}
                    onChange={(e) => updateSettings('requireEmailVerification', e.target.checked)}
                    className="mr-3"
                  />
                  <span className="text-gray-300">Require Email Verification</span>
                </label>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'features' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4">Feature Toggles</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(settings.features).map(([feature, enabled]) => (
                <label key={feature} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <span className="text-white font-medium">
                      {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                    <p className="text-sm text-gray-400 mt-1">
                      {getFeatureDescription(feature)}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => updateSettings(`features.${feature}`, e.target.checked)}
                    className="ml-4"
                  />
                </label>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'integrations' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <h2 className="text-lg font-semibold text-white mb-4">Third-Party Integrations</h2>
            
            {/* OpenAI Settings */}
            <div className="bg-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-medium text-white">OpenAI Integration</h3>
                <input
                  type="checkbox"
                  checked={settings.openaiSettings.enabled}
                  onChange={(e) => updateSettings('openaiSettings.enabled', e.target.checked)}
                />
              </div>
              
              {settings.openaiSettings.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
                    <select
                      value={settings.openaiSettings.model}
                      onChange={(e) => updateSettings('openaiSettings.model', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Tokens</label>
                    <input
                      type="number"
                      value={settings.openaiSettings.maxTokens}
                      onChange={(e) => updateSettings('openaiSettings.maxTokens', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="100"
                      max="4000"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Temperature: {settings.openaiSettings.temperature}</label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={settings.openaiSettings.temperature}
                      onChange={(e) => updateSettings('openaiSettings.temperature', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Stripe Settings */}
            <div className="bg-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-medium text-white">Stripe Integration</h3>
                <input
                  type="checkbox"
                  checked={settings.stripeSettings.enabled}
                  onChange={(e) => updateSettings('stripeSettings.enabled', e.target.checked)}
                />
              </div>
              
              {settings.stripeSettings.enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Webhook Secret</label>
                  <input
                    type="password"
                    value={settings.stripeSettings.webhookSecret}
                    onChange={(e) => updateSettings('stripeSettings.webhookSecret', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="whsec_..."
                  />
                </div>
              )}
            </div>

            {/* Telegram Settings */}
            <div className="bg-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-medium text-white">Telegram Bot Integration</h3>
                <input
                  type="checkbox"
                  checked={settings.telegramSettings.enabled}
                  onChange={(e) => updateSettings('telegramSettings.enabled', e.target.checked)}
                />
              </div>
              
              {settings.telegramSettings.enabled && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Bot Token</label>
                    <input
                      type="password"
                      value={settings.telegramSettings.botToken}
                      onChange={(e) => updateSettings('telegramSettings.botToken', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Webhook URL</label>
                    <input
                      type="url"
                      value={settings.telegramSettings.webhookUrl}
                      onChange={(e) => updateSettings('telegramSettings.webhookUrl', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://your-domain.com/api/telegram/webhook"
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4">Security Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password Min Length</label>
                <input
                  type="number"
                  value={settings.security.passwordMinLength}
                  onChange={(e) => updateSettings('security.passwordMinLength', parseInt(e.target.value) || 8)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="6"
                  max="50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Max Login Attempts</label>
                <input
                  type="number"
                  value={settings.security.maxLoginAttempts}
                  onChange={(e) => updateSettings('security.maxLoginAttempts', parseInt(e.target.value) || 5)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="3"
                  max="20"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Lockout Duration (minutes)</label>
                <input
                  type="number"
                  value={settings.security.lockoutDuration}
                  onChange={(e) => updateSettings('security.lockoutDuration', parseInt(e.target.value) || 15)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="5"
                  max="1440"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">JWT Expiration</label>
                <select
                  value={settings.security.jwtExpiration}
                  onChange={(e) => updateSettings('security.jwtExpiration', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1h">1 Hour</option>
                  <option value="1d">1 Day</option>
                  <option value="7d">7 Days</option>
                  <option value="30d">30 Days</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.security.requireStrongPassword}
                  onChange={(e) => updateSettings('security.requireStrongPassword', e.target.checked)}
                  className="mr-3"
                />
                <span className="text-gray-300">Require Strong Passwords</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.security.twoFactorRequired}
                  onChange={(e) => updateSettings('security.twoFactorRequired', e.target.checked)}
                  className="mr-3"
                />
                <span className="text-gray-300">Require Two-Factor Authentication</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Allowed Origins (comma-separated)</label>
              <textarea
                value={settings.security.allowedOrigins.join(', ')}
                onChange={(e) => handleArrayUpdate('security.allowedOrigins', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="https://yourapp.com, https://api.yourapp.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Rate Limit (requests per window)</label>
                <input
                  type="number"
                  value={settings.security.rateLimitRequests}
                  onChange={(e) => updateSettings('security.rateLimitRequests', parseInt(e.target.value) || 100)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="10"
                  max="10000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Rate Limit Window (minutes)</label>
                <input
                  type="number"
                  value={settings.security.rateLimitWindow}
                  onChange={(e) => updateSettings('security.rateLimitWindow', parseInt(e.target.value) || 15)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="60"
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(null)}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          type="warning"
          isLoading={saving}
        />
      )}
    </div>
  )
}

const getFeatureDescription = (feature: string): string => {
  const descriptions: Record<string, string> = {
    workoutGeneration: 'AI-powered workout plan generation',
    nutritionTracking: 'Food logging and nutrition analysis',
    mealPlanning: 'AI meal plan recommendations',
    barcodeScanning: 'Barcode scanning for food items',
    telegramIntegration: 'Telegram bot notifications',
    analytics: 'User analytics dashboard',
    parqRequired: 'Require PAR-Q completion before workouts'
  }
  return descriptions[feature] || 'Feature toggle'
}

export default SettingsPanel