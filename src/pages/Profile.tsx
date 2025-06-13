import React, { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { FaUser, FaDumbbell, FaChartLine, FaCog, FaCamera, FaCheck } from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import { useLocation, useNavigate } from 'react-router-dom'

interface UserProfileForm {
  name: string
  email: string
  avatar?: string
  height: number
  weight: number
  age: number
  gender: 'male' | 'female' | 'other'
  fitnessGoals: string[]
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  dietaryPreferences: string[]
  notifications: {
    email: boolean
    telegram: boolean
    telegramChatId?: string
  }
}

const FITNESS_GOALS = [
  { id: 'weight_loss', label: 'Weight Loss', description: 'Burn fat and lose weight' },
  { id: 'muscle_gain', label: 'Muscle Gain', description: 'Build lean muscle mass' },
  { id: 'strength', label: 'Strength', description: 'Increase overall strength' },
  { id: 'endurance', label: 'Endurance', description: 'Improve cardiovascular fitness' },
  { id: 'flexibility', label: 'Flexibility', description: 'Improve mobility and flexibility' },
  { id: 'general_fitness', label: 'General Fitness', description: 'Overall health and wellness' }
]

const DIETARY_PREFERENCES = [
  { id: 'none', label: 'No Restrictions', description: 'I eat everything' },
  { id: 'vegetarian', label: 'Vegetarian', description: 'No meat' },
  { id: 'vegan', label: 'Vegan', description: 'No animal products' },
  { id: 'pescatarian', label: 'Pescatarian', description: 'Fish but no meat' },
  { id: 'keto', label: 'Keto', description: 'Low-carb, high-fat' },
  { id: 'paleo', label: 'Paleo', description: 'Whole foods only' },
  { id: 'gluten_free', label: 'Gluten-Free', description: 'No gluten' },
  { id: 'dairy_free', label: 'Dairy-Free', description: 'No dairy products' }
]

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little to no exercise' },
  { value: 'light', label: 'Light', description: '1-3 days per week' },
  { value: 'moderate', label: 'Moderate', description: '3-5 days per week' },
  { value: 'active', label: 'Active', description: '6-7 days per week' },
  { value: 'very_active', label: 'Very Active', description: 'Multiple times per day' }
]

const TABS = [
  { id: 'overview', label: 'Overview', icon: FaChartLine },
  { id: 'activity', label: 'Activity', icon: FaDumbbell },
  { id: 'settings', label: 'Profile', icon: FaCog },
]

// Enhanced Profile Completion Indicator with animation
const ProfileCompletionIndicator: React.FC<{ percentage: number }> = ({ percentage }) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPercentage(percentage), 300)
    return () => clearTimeout(timer)
  }, [percentage])

  const getColor = () => {
    if (percentage >= 80) return 'from-green-500 to-green-400'
    if (percentage >= 50) return 'from-yellow-500 to-yellow-400'
    return 'from-red-500 to-red-400'
  }

  return (
    <motion.div 
      className="w-full mb-6 p-4 bg-gray-900 rounded-lg border border-gray-800"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-lg font-semibold text-white">Profile Completion</span>
        <span className="text-xl font-bold text-white">{animatedPercentage}%</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-3 relative overflow-hidden">
        <motion.div 
          className={`h-3 rounded-full bg-gradient-to-r ${getColor()}`}
          initial={{ width: 0 }}
          animate={{ width: `${animatedPercentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        {percentage === 100 && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-300 rounded-full flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1, type: "spring", stiffness: 200 }}
          >
            <FaCheck className="text-white text-sm" />
          </motion.div>
        )}
      </div>
      <p className="text-sm text-gray-400 mt-2">
        {percentage === 100 ? 'Profile complete! 🎉' : 'Complete your profile to unlock all features'}
      </p>
    </motion.div>
  )
}

// Custom Select Component
const CustomSelect: React.FC<{
  value: string
  onChange: (value: string) => void
  options: Array<{value: string, label: string, description?: string}>
  placeholder: string
  error?: string
}> = ({ value, onChange, options, placeholder, error }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 hover:bg-gray-700 ${
          error ? 'border-red-500' : 'border-gray-600'
        }`}
      >
        <span className={value ? 'text-white' : 'text-gray-400'}>
          {value ? options.find(opt => opt.value === value)?.label : placeholder}
        </span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-700 focus:bg-gray-700 focus:outline-none transition-colors"
              >
                <div className="text-white font-medium">{option.label}</div>
                {option.description && (
                  <div className="text-gray-400 text-sm">{option.description}</div>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Multi-Select Component for Goals/Preferences
const MultiSelect: React.FC<{
  value: string[]
  onChange: (value: string[]) => void
  options: Array<{id: string, label: string, description?: string}>
  title: string
}> = ({ value, onChange, options, title }) => {
  const toggleOption = (optionId: string) => {
    const newValue = value.includes(optionId) 
      ? value.filter(id => id !== optionId)
      : [...value, optionId]
    onChange(newValue)
  }

  return (
    <div>
      <label className="block text-lg font-semibold text-white mb-3">{title}</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = value.includes(option.id)
          return (
            <motion.button
              key={option.id}
              type="button"
              onClick={() => toggleOption(option.id)}
              className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                isSelected 
                  ? 'border-blue-500 bg-blue-500/20 text-white' 
                  : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{option.label}</div>
                  {option.description && (
                    <div className="text-sm text-gray-400 mt-1">{option.description}</div>
                  )}
                </div>
                {isSelected && <FaCheck className="text-blue-400" />}
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState('settings')
  const [isLoading, setIsLoading] = useState(true)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined)
  const [profileData, setProfileData] = useState<any>(null)
  const [summary, setSummary] = useState<any>({})
  const [heightFeet, setHeightFeet] = useState(5)
  const [heightInches, setHeightInches] = useState(6)
  
  const location = useLocation()
  const navigate = useNavigate()
  const from = location.state?.from || '/dashboard'
  const redirectMessage = location.state?.message
  const { updateProfile } = useAuth()

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    control,
    formState: { errors }
  } = useForm<UserProfileForm>({
    defaultValues: {
      name: '',
      email: '',
      height: 0,
      weight: 0,
      age: 0,
      gender: 'male',
      fitnessGoals: [],
      activityLevel: 'moderate',
      dietaryPreferences: [],
      notifications: { email: true, telegram: false }
    }
  })

  // Watch all form values to detect changes
  const watchedValues = watch()

  // Calculate profile completion percentage
  const calculateCompletionPercentage = (data: any) => {
    const fields = [
      data.name,
      data.email,
      data.height && data.height > 0,
      data.weight && data.weight > 0,
      data.age && data.age > 0,
      data.gender,
      data.fitnessGoals && data.fitnessGoals.length > 0,
      data.activityLevel,
      data.dietaryPreferences && data.dietaryPreferences.length > 0,
    ]
    const filledFields = fields.filter(Boolean).length
    return Math.round((filledFields / fields.length) * 100)
  }

  const completionPercentage = calculateCompletionPercentage(watchedValues)

  // Height conversion functions
  const convertInchesToFeetAndInches = (totalInches: number) => {
    const feet = Math.floor(totalInches / 12)
    const inches = totalInches % 12
    return { feet, inches }
  }

  const convertFeetAndInchesToInches = (feet: number, inches: number) => {
    return feet * 12 + inches
  }

  // Update height when feet or inches change
  const handleHeightChange = (newFeet: number, newInches: number) => {
    setHeightFeet(newFeet)
    setHeightInches(newInches)
    const totalInches = convertFeetAndInchesToInches(newFeet, newInches)
    setValue('height', totalInches)
    setIsDirty(true)
  }

  // Auto-switch to Settings tab if user was redirected due to incomplete profile
  useEffect(() => {
    if (redirectMessage) {
      setActiveTab('settings')
    }
  }, [redirectMessage])

  // Load profile data
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true)
      try {
        const res = await api.get('/api/profile')
        const userData = res.data.user
        setProfileData(userData)
        
        if (userData) {
          reset({
            name: userData.name || '',
            email: userData.email || '',
            avatar: userData.avatar || '',
            height: userData.height || 0,
            weight: userData.weight || 0,
            age: userData.age || 0,
            gender: userData.gender || 'male',
            fitnessGoals: userData.fitnessGoals || [],
            activityLevel: userData.activityLevel || 'moderate',
            dietaryPreferences: userData.dietaryPreferences || [],
            notifications: {
              email: userData.emailNotifications ?? true,
              telegram: userData.telegramEnabled ?? false,
              telegramChatId: userData.telegramChatId || ''
            }
          })
          
          // Set height feet and inches from total inches
          if (userData.height && userData.height > 0) {
            const { feet, inches } = convertInchesToFeetAndInches(userData.height)
            setHeightFeet(feet)
            setHeightInches(inches)
          }
          
          if (userData.avatar) {
            setAvatarPreview(userData.avatar)
          }
        }
        
        setSummary({
          workout: res.data.workoutSummary,
          calorie: res.data.calorieSummary,
          meal: res.data.mealSummary,
          analytics: res.data.analyticsSummary,
        })
      } catch (e) {
        toast.error('Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfile()
  }, [reset])

  // Handle form submission
  const onSubmit = async (data: UserProfileForm) => {
    setIsSaving(true)
    try {
      const response = await api.put('/api/profile', data)
      toast.success('Profile updated successfully! 🎉', {
        style: {
          background: '#1f2937',
          color: '#fff',
          border: '1px solid #10b981',
        },
      })
      
      if (response && response.data) {
        updateProfile(response.data)
      }
      setIsDirty(false)
      
      // Redirect back if completion is now 100%
      if (calculateCompletionPercentage(data) === 100 && redirectMessage) {
        setTimeout(() => navigate(from), 1500)
      }
    } catch (error: any) {
      toast.error('Failed to update profile', {
        style: {
          background: '#1f2937',
          color: '#fff',
          border: '1px solid #ef4444',
        },
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle avatar upload with Cloudinary
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const formData = new FormData()
      formData.append('avatar', file)
      
      try {
        toast.loading('Uploading avatar...', { id: 'avatar-upload' })
        
        const response = await api.post('/api/upload-avatar', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        
        if (response.data.url) {
          setValue('avatar', response.data.url)
          setAvatarPreview(response.data.url)
          setIsDirty(true)
          toast.success('Avatar uploaded successfully!', {
            id: 'avatar-upload',
            style: {
              background: '#1f2937',
              color: '#fff',
              border: '1px solid #10b981',
            },
          })
        }
      } catch (err: any) {
        console.error('Avatar upload error:', err)
        toast.error(err.response?.data?.error || 'Failed to upload avatar. Please try again.', {
          id: 'avatar-upload',
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #ef4444',
          },
        })
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Profile Completion Required Banner */}
        <AnimatePresence>
          {redirectMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-blue-500/10 border border-blue-500 text-blue-200 px-6 py-4 rounded-lg mb-6"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{redirectMessage}</p>
                  <p className="text-xs text-blue-300 mt-1">Complete all required fields below to continue.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Profile Header */}
        <motion.div 
          className="bg-gray-900 rounded-xl shadow-lg p-8 mb-8 border border-gray-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-800 border-4 border-gray-700 flex items-center justify-center relative group">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <FaUser size={48} className="text-gray-500" />
                )}
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <FaCamera className="text-white text-xl" />
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{profileData?.name || 'Your Profile'}</h1>
              <p className="text-gray-400 text-lg mb-4">{profileData?.email}</p>
              <ProfileCompletionIndicator percentage={completionPercentage} />
            </div>
          </div>
        </motion.div>

        {/* Enhanced Tabs */}
        <div className="flex gap-2 mb-8">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <motion.button
                key={tab.id}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon size={16} />
                {tab.label}
              </motion.button>
            )
          })}
        </div>

        {/* Tab Content */}
        <motion.div 
          className="bg-gray-900 rounded-xl border border-gray-800 p-8 min-h-[600px]"
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-white">Dashboard Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Quick Access Cards */}
                <motion.div 
                  className="bg-black rounded-xl p-6 border border-gray-800 hover:border-gray-600 transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                >
                  <FaDumbbell className="text-blue-400 mb-4" size={32} />
                  <div className="font-bold text-xl text-white mb-2">Workouts</div>
                  <div className="text-gray-400 mb-4">Total: {summary.workout?.total ?? 0}</div>
                  <button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    onClick={() => navigate('/workouts')}
                  >
                    Go to Workouts
                  </button>
                </motion.div>

                <motion.div 
                  className="bg-black rounded-xl p-6 border border-gray-800 hover:border-gray-600 transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                >
                  <FaChartLine className="text-green-400 mb-4" size={32} />
                  <div className="font-bold text-xl text-white mb-2">Nutrition</div>
                  <div className="text-gray-400 mb-4">Today: {summary.calorie?.today ?? 0} / {summary.calorie?.goal ?? 0}</div>
                  <button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                    onClick={() => navigate('/nutrition')}
                  >
                    Track Nutrition
                  </button>
                </motion.div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-white">Recent Activity</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Recent Workouts</h3>
                  {summary.recentWorkouts && summary.recentWorkouts.length > 0 ? (
                    <div className="space-y-2">
                      {summary.recentWorkouts.map((workout: any) => (
                        <div key={workout.id} className="bg-black p-4 rounded-lg border border-gray-800">
                          <div className="text-white">{new Date(workout.date).toLocaleDateString()}</div>
                          <div className="text-gray-400">{workout.notes || 'No notes'}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-center py-8">No recent workouts found.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Profile Settings</h2>
                <AnimatePresence>
                  {isDirty && (
                    <motion.button
                      type="submit"
                      disabled={isSaving}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all duration-200"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Basic Information */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Full Name *</label>
                    <input
                      type="text"
                      {...register('name', { required: 'Name is required' })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                      placeholder="Enter your full name"
                      onChange={() => setIsDirty(true)}
                    />
                    {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      {...register('email')}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                      readOnly
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Height *</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Feet</label>
                        <CustomSelect
                          value={heightFeet.toString()}
                          onChange={(value) => handleHeightChange(Number(value), heightInches)}
                          options={[
                            { value: '3', label: '3 ft' },
                            { value: '4', label: '4 ft' },
                            { value: '5', label: '5 ft' },
                            { value: '6', label: '6 ft' },
                            { value: '7', label: '7 ft' }
                          ]}
                          placeholder="Feet"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Inches</label>
                        <CustomSelect
                          value={heightInches.toString()}
                          onChange={(value) => handleHeightChange(heightFeet, Number(value))}
                          options={[
                            { value: '0', label: '0"' },
                            { value: '1', label: '1"' },
                            { value: '2', label: '2"' },
                            { value: '3', label: '3"' },
                            { value: '4', label: '4"' },
                            { value: '5', label: '5"' },
                            { value: '6', label: '6"' },
                            { value: '7', label: '7"' },
                            { value: '8', label: '8"' },
                            { value: '9', label: '9"' },
                            { value: '10', label: '10"' },
                            { value: '11', label: '11"' }
                          ]}
                          placeholder="Inches"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Total: {heightFeet}'{heightInches}" ({convertFeetAndInchesToInches(heightFeet, heightInches)} inches)</p>
                    {/* Hidden input to register height with react-hook-form */}
                    <input
                      type="hidden"
                      {...register('height', { 
                        required: 'Height is required',
                        min: { value: 36, message: 'Height must be at least 36 inches' },
                        max: { value: 96, message: 'Height must be less than 96 inches' }
                      })}
                      value={convertFeetAndInchesToInches(heightFeet, heightInches)}
                    />
                    {errors.height && <p className="text-red-400 text-sm mt-1">{errors.height.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Weight (lbs) *</label>
                    <input
                      type="number"
                      {...register('weight', { 
                        required: 'Weight is required',
                        min: { value: 50, message: 'Weight must be at least 50 lbs' },
                        max: { value: 500, message: 'Weight must be less than 500 lbs' }
                      })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                      placeholder="e.g., 150"
                      onChange={() => setIsDirty(true)}
                    />
                    {errors.weight && <p className="text-red-400 text-sm mt-1">{errors.weight.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Age *</label>
                    <input
                      type="number"
                      {...register('age', { 
                        required: 'Age is required',
                        min: { value: 13, message: 'Must be at least 13 years old' },
                        max: { value: 120, message: 'Age must be less than 120' }
                      })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                      placeholder="e.g., 25"
                      onChange={() => setIsDirty(true)}
                    />
                    {errors.age && <p className="text-red-400 text-sm mt-1">{errors.age.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Gender *</label>
                  <Controller
                    name="gender"
                    control={control}
                    rules={{ required: 'Gender is required' }}
                    render={({ field }) => (
                      <CustomSelect
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value)
                          setIsDirty(true)
                        }}
                        options={[
                          { value: 'male', label: 'Male' },
                          { value: 'female', label: 'Female' },
                          { value: 'other', label: 'Other' }
                        ]}
                        placeholder="Select your gender"
                        error={errors.gender?.message}
                      />
                    )}
                  />
                  {errors.gender && <p className="text-red-400 text-sm mt-1">{errors.gender.message}</p>}
                </div>
              </div>

              {/* Fitness Goals */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">Fitness Goals *</h3>
                <Controller
                  name="fitnessGoals"
                  control={control}
                  rules={{ required: 'Please select at least one fitness goal' }}
                  render={({ field }) => (
                    <MultiSelect
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value)
                        setIsDirty(true)
                      }}
                      options={FITNESS_GOALS}
                      title="What are your primary fitness goals?"
                    />
                  )}
                />
                {errors.fitnessGoals && <p className="text-red-400 text-sm mt-1">{errors.fitnessGoals.message}</p>}
              </div>

              {/* Activity Level */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">Activity Level *</h3>
                <Controller
                  name="activityLevel"
                  control={control}
                  rules={{ required: 'Activity level is required' }}
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value)
                        setIsDirty(true)
                      }}
                      options={ACTIVITY_LEVELS}
                      placeholder="Select your activity level"
                      error={errors.activityLevel?.message}
                    />
                  )}
                />
                {errors.activityLevel && <p className="text-red-400 text-sm mt-1">{errors.activityLevel.message}</p>}
              </div>

              {/* Dietary Preferences */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">Dietary Preferences *</h3>
                <Controller
                  name="dietaryPreferences"
                  control={control}
                  rules={{ required: 'Please select at least one dietary preference' }}
                  render={({ field }) => (
                    <MultiSelect
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value)
                        setIsDirty(true)
                      }}
                      options={DIETARY_PREFERENCES}
                      title="Select your dietary preferences and restrictions"
                    />
                  )}
                />
                {errors.dietaryPreferences && <p className="text-red-400 text-sm mt-1">{errors.dietaryPreferences.message}</p>}
              </div>

              {/* Notification Preferences */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">Notification Preferences</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      {...register('notifications.email')}
                      className="w-5 h-5 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                      onChange={() => setIsDirty(true)}
                    />
                    <span className="text-white">Email notifications</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      {...register('notifications.telegram')}
                      className="w-5 h-5 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                      onChange={() => setIsDirty(true)}
                    />
                    <span className="text-white">Telegram notifications</span>
                  </label>
                </div>
              </div>

              {/* Save Button */}
              <motion.button
                type="submit"
                disabled={isSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-4 rounded-lg font-semibold text-lg transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSaving ? 'Saving Changes...' : 'Save Profile'}
              </motion.button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default Profile