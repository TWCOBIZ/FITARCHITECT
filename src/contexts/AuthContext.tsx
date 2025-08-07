import React, { createContext, useContext, useState, useEffect } from 'react'
import { User, UserProfile } from '../types/user'
import { api } from '../services/api'
import axios from 'axios'

interface AuthContextType {
  // User state
  user: User | null
  isAuthenticated: boolean
  isGuest: boolean
  isAdmin: boolean
  isLoading: boolean
  error: string | null
  
  // Subscription and access control
  subscriptionTier: 'free' | 'basic' | 'premium'
  parqCompleted: boolean
  canAccessFeature: (feature: string) => boolean
  hasValidSubscription: (tier: 'basic' | 'premium') => boolean
  
  // Authentication methods
  login: (email: string, password: string) => Promise<void>
  adminLogin: (email: string, password: string) => Promise<void>
  register: (
    email: string,
    password: string,
    name: string,
    height: string,
    weight: string,
    age: string,
    gender: string,
    fitnessGoals: string[],
    activityLevel: string,
    equipmentAvailability: string[],
    preferredWorkoutDuration: string,
    dietaryPreferences: string[]
  ) => Promise<void>
  logout: () => void
  
  // User management
  updateUser: (user: User) => void
  updateProfile: (profileData: Partial<UserProfile>) => void
  updateSubscription: (tier: 'free' | 'basic' | 'premium') => void
  updateParqStatus: (isCompleted: boolean) => void
  
  // Guest functionality
  loginAsGuest: () => Promise<void>
  continueAsGuest: () => void
  upgradeGuestAccount: (email: string, password: string, name: string) => Promise<void>
  
  // Error management
  clearError: () => void
  setError: (error: string) => void
  
  // Debug functionality  
  clearAllData: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Simple analytics tracking utility
function trackEvent(event: string, data?: Record<string, any>) {
  // Replace with real analytics integration as needed
  if (typeof window !== 'undefined') {
    // Example: window.gtag?.('event', event, data)
    // For now, just log
    console.log('[Analytics]', event, data)
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'basic' | 'premium'>('free')
  
  // Derive isGuest from user state instead of maintaining separate state
  const isGuest = user?.isGuest === true || user?.type === 'guest'

  // Computed values
  const isAuthenticated = !!user
  const isAdmin = user?.isAdmin === true
  const parqCompleted = user?.parqCompleted || false

  // Feature access control
  const canAccessFeature = (feature: string): boolean => {
    if (!user) return false

    // Test users get unlimited access to all features
    const testUserEmails = import.meta.env.VITE_TEST_USER_EMAILS?.split(',') || []
    if (testUserEmails.includes(user.email)) {
      return true
    }

    const featureRules = {
      'workout-generation': { tier: 'basic', parq: true },
      'nutrition-tracking': { tier: 'free', parq: false },
      'meal-planning': { tier: 'free', parq: false },
      'barcode-scanning': { tier: 'premium', parq: false },
      'telegram-notifications': { tier: 'premium', parq: false },
      'analytics': { tier: 'free', parq: false }
    }

    const rule = featureRules[feature as keyof typeof featureRules]
    if (!rule) return false

    // Check subscription tier
    const tierHierarchy = { free: 0, basic: 1, premium: 2 }
    const requiredLevel = tierHierarchy[rule.tier as keyof typeof tierHierarchy]
    const userLevel = tierHierarchy[subscriptionTier]
    
    if (userLevel < requiredLevel) return false

    // Check PAR-Q completion if required
    if (rule.parq && !parqCompleted) return false

    return true
  }

  const hasValidSubscription = (tier: 'basic' | 'premium'): boolean => {
    if (!user) return false
    
    // Test users get unlimited access (configured via backend)
    const testUserEmails = import.meta.env.VITE_TEST_USER_EMAILS?.split(',') || []
    if (testUserEmails.includes(user.email)) {
      return true
    }
    
    const tierHierarchy = { free: 0, basic: 1, premium: 2 }
    const requiredLevel = tierHierarchy[tier]
    const userLevel = tierHierarchy[subscriptionTier]
    
    // Check if user meets tier requirement
    if (userLevel >= requiredLevel) {
      // For paid subscriptions, check subscription status
      if (user.subscriptionStatus === 'active') return true
    }
    
    // For guests with trials, check if trial is still valid
    if (user.type === 'guest' && user.trialEndDate) {
      const now = new Date()
      const trialEnd = new Date(user.trialEndDate)
      return trialEnd > now
    }
    
    // For free users requesting basic or premium tier, check 3-day trial eligibility
    if ((tier === 'basic' || tier === 'premium') && subscriptionTier === 'free' && user) {
      // Check if user has completed PAR-Q (required for trial)
      if (!user.parqCompleted) return false
      
      // Check if trial is active
      if (user.trialEndDate) {
        const now = new Date()
        const trialEnd = new Date(user.trialEndDate)
        return trialEnd > now
      }
      
      // Check if trial hasn't been used yet
      if (!user.freeWorkoutTrialUsed) {
        return true // Eligible for trial activation
      }
    }
    
    return false
  }

  useEffect(() => {
    // Check for stored auth token and validate it
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('adminToken')
        const guestExpires = localStorage.getItem('guestExpires')
        
        // Check guest session expiration
        if (guestExpires && Date.now() > Number(guestExpires)) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          localStorage.removeItem('guestExpires')
          setUser(null)
          setIsLoading(false)
          return
        }

        if (token) {
          // Check if it's a guest token
          if (token.startsWith('guest-')) {
            // For guest tokens, just load from localStorage
            const storedUser = localStorage.getItem('user')
            if (storedUser) {
              try {
                const parsedUser = JSON.parse(storedUser)
                setUser(parsedUser)
                setSubscriptionTier('free')
              } catch (parseError) {
                console.error('Failed to parse guest user:', parseError)
                localStorage.removeItem('user')
                localStorage.removeItem('token')
                localStorage.removeItem('guestExpires')
              }
            }
            setIsLoading(false)
          } else {
            // Validate JWT token with API
            try {
              const response = await api.get('/api/profile', {
                skipErrorToast: true // Prevent toast spam for auth checks
              } as any)
              setUser(response.data.user)
              setSubscriptionTier(response.data.user.tier || 'free')
              console.log('Successfully validated auth token')
            } catch (error) {
              console.log('Token validation failed, clearing auth')
              // Token invalid, clear authentication
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              localStorage.removeItem('adminToken')
              setUser(null)
              setSubscriptionTier('free')
            } finally {
              setIsLoading(false)
            }
          }
        } else {
          // No token at all - user is anonymous
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    setError(null) // Clear any previous errors
    try {
      const res = await api.post('/api/login', { email, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      localStorage.removeItem('adminToken') // Clear admin token if exists
      setUser(res.data.user)
      setSubscriptionTier(res.data.user.tier || 'free')
    } catch (error: unknown) {
      console.error('Login failed:', error)
      let errorMessage = 'Login failed. Please try again.'
      
      if (axios.isAxiosError(error)) {
        console.error('Response:', error.response?.data)
        console.error('Status:', error.response?.status)
        console.error('Headers:', error.response?.headers)
        
        // Provide more specific error messages
        if (error.response?.status === 401) {
          errorMessage = 'Invalid email or password'
        } else if (error.response?.status === 500) {
          errorMessage = 'Server error. Please try again later.'
        } else if (error.code === 'ERR_NETWORK') {
          errorMessage = 'Cannot connect to server. Please check if the backend is running.'
        } else {
          errorMessage = error.response?.data?.error || 'Login failed. Please try again.'
        }
      }
      
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const adminLogin = async (email: string, password: string) => {
    console.log('🔐 AdminLogin: Starting admin login process')
    setIsLoading(true)
    try {
      console.log('🔐 AdminLogin: Calling /api/admin/login')
      const res = await api.post('/api/admin/login', { email, password })
      console.log('🔐 AdminLogin: Login successful, got token:', res.data.token ? 'YES' : 'NO')
      
      localStorage.setItem('adminToken', res.data.token)
      console.log('🔐 AdminLogin: Stored adminToken in localStorage')
      
      // Get admin user info
      console.log('🔐 AdminLogin: Calling /api/admin/me')
      const adminRes = await api.get('/api/admin/me', {
        headers: { Authorization: `Bearer ${res.data.token}` }
      })
      console.log('🔐 AdminLogin: Got admin user info:', adminRes.data)
      
      const adminUser = {
        ...adminRes.data,
        isAdmin: true,
        type: 'registered',
        tier: 'premium' // Admins get premium access
      }
      
      localStorage.setItem('user', JSON.stringify(adminUser))
      localStorage.removeItem('token') // Clear regular token if exists
      setUser(adminUser)
      setSubscriptionTier('premium')
      console.log('🔐 AdminLogin: Admin login completed successfully')
    } catch (error: unknown) {
      console.error('🔐 AdminLogin: Admin login failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (
    email: string,
    password: string,
    name: string,
    height: string,
    weight: string,
    age: string,
    gender: string,
    fitnessGoals: string[],
    activityLevel: string,
    equipmentAvailability: string[],
    preferredWorkoutDuration: string,
    dietaryPreferences: string[]
  ) => {
    setIsLoading(true)
    try {
      const res = await api.post('/api/register', {
        email,
        password,
        name,
        height,
        weight,
        age,
        gender,
        fitnessGoals,
        activityLevel,
        equipmentAvailability,
        preferredWorkoutDuration,
        dietaryPreferences,
      })
      let mergedUser = res.data.user
      // If guest data exists, migrate it
      const guestRaw = localStorage.getItem('user')
      if (guestRaw) {
        try {
          const guest = JSON.parse(guestRaw)
          if (guest.isGuest) {
            mergedUser = migrateGuestData(res.data.user)
            trackEvent('guest_conversion', { method: 'register', email })
            localStorage.removeItem('guestExpires')
          }
        } catch {}
      }
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(mergedUser))
      setUser(mergedUser)
    } catch (error: unknown) {
      console.error('Registration failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('adminToken')
    localStorage.removeItem('user')
    localStorage.removeItem('guestExpires')
    setUser(null)
    setSubscriptionTier('free')
    trackEvent('user_logout', { wasGuest: isGuest, wasAdmin: isAdmin })
  }

  const updateUser = (updatedUser: User) => {
    localStorage.setItem('user', JSON.stringify(updatedUser))
    setUser(updatedUser)
    setSubscriptionTier((updatedUser.tier || updatedUser.subscription?.plan?.toLowerCase() || 'free') as 'free' | 'basic' | 'premium')
  }

  const updateProfile = (profileData: Partial<UserProfile>) => {
    if (!user) return
    
    const updatedUser = {
      ...user,
      profile: { ...user.profile, ...profileData }
    }
    updateUser(updatedUser)
    
    // Emit profile change event for other contexts to listen
    const changedFields = Object.keys(profileData)
    window.dispatchEvent(new CustomEvent('profileChanged', { 
      detail: { 
        fields: changedFields, 
        user: updatedUser,
        changedData: profileData
      } 
    }))
    
    // Track profile update for analytics
    trackEvent('profile_updated', { 
      fields: changedFields.length,
      changedFields: changedFields 
    })
  }

  const updateSubscription = (tier: 'free' | 'basic' | 'premium') => {
    setSubscriptionTier(tier)
    if (user) {
      const updatedUser = { ...user, tier }
      updateUser(updatedUser)
    }
  }

  const updateParqStatus = (isCompleted: boolean) => {
    if (!user) return
    
    const updatedUser = { ...user, parqCompleted: isCompleted }
    updateUser(updatedUser)
  }

  const loginAsGuest = async () => {
    setIsLoading(true)
    try {
      const res = await api.post('/api/guest-register')
      const guestUser = { ...res.data.user, isGuest: true, subscription: { plan: 'Free', status: 'active', startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } }
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(guestUser))
      localStorage.setItem('guestExpires', String(Date.now() + 7 * 24 * 60 * 60 * 1000))
      setUser(guestUser)
      trackEvent('guest_session_start', { method: 'api' })
    } catch (error) {
      console.error('Guest login failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const clearError = () => {
    setError(null)
  }

  const setErrorMessage = (errorMessage: string) => {
    setError(errorMessage)
  }

  const clearAllData = () => {
    // Clear all localStorage data
    localStorage.clear()
    setUser(null)
    setSubscriptionTier('free')
    setIsLoading(false)
    setError(null) // Clear any errors
  }

  const continueAsGuest = () => {
    // Clear any existing user data first
    localStorage.removeItem('token')
    localStorage.removeItem('adminToken')
    localStorage.removeItem('user')
    localStorage.removeItem('guestExpires')
    
    // Generate a fake token for guest users
    const guestToken = 'guest-' + Math.random().toString(36).substr(2, 9);
    
    const now = new Date();
    const guestUser: User = {
      id: 'guest',
      email: '',
      profile: {
        id: 'guest-profile',
        email: '',
        firstName: 'Guest',
        lastName: '',
        dateOfBirth: new Date(1990, 0, 1), // Default age ~30
        gender: 'other',
        height: 67, // 67 inches default (5'7")
        weight: 154,  // 154 lbs default (70kg converted)
        fitnessLevel: 'beginner',
        goals: ['general_fitness'],
        availableEquipment: ['bodyweight'],
        preferredWorkoutDuration: 30,
        daysPerWeek: 3,
        createdAt: now,
        updatedAt: now,
      },
      preferences: {
        theme: 'system',
        notifications: {
          workoutReminders: false,
          progressUpdates: false,
          achievementAlerts: false,
        },
        units: {
          weight: 'lbs',
          height: 'inches',
          distance: 'mi',
        },
      },
      subscription: {
        plan: 'Free',
        status: 'active',
        startDate: now,
        endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
      parqCompleted: false,
      createdAt: now,
      updatedAt: now,
      type: 'guest',
      isGuest: true,
    };
    setUser(guestUser);
    setIsLoading(false);
    localStorage.setItem('token', guestToken);
    localStorage.setItem('user', JSON.stringify(guestUser));
    localStorage.setItem('guestExpires', String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    trackEvent('guest_session_start', { method: 'local' });
  }

  // Helper to migrate guest data to new user
  function migrateGuestData(newUser: User): User {
    const guestRaw = localStorage.getItem('user')
    if (!guestRaw) return newUser
    try {
      const guest = JSON.parse(guestRaw)
      if (!guest.isGuest) return newUser
      // Merge guest preferences/profile if not present in newUser
      const merged = {
        ...newUser,
        preferences: guest.preferences || newUser.preferences,
        profile: guest.profile || newUser.profile,
      }
      return merged
    } catch {
      return newUser
    }
  }

  const upgradeGuestAccount = async (email: string, password: string, name: string) => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await api.post('/api/upgrade-guest', {
        email,
        password,
        name,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      let mergedUser = res.data.user
      // If guest data exists, migrate it
      const guestRaw = localStorage.getItem('user')
      if (guestRaw) {
        try {
          const guest = JSON.parse(guestRaw)
          if (guest.isGuest) {
            mergedUser = migrateGuestData(res.data.user)
            trackEvent('guest_conversion', { method: 'upgrade', email })
            localStorage.removeItem('guestExpires')
          }
        } catch {}
      }
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(mergedUser))
      setUser(mergedUser)
    } catch (error) {
      console.error('Upgrade failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const value = {
    // User state
    user,
    isAuthenticated,
    isGuest,
    isAdmin,
    isLoading,
    error,
    
    // Subscription and access control
    subscriptionTier,
    parqCompleted,
    canAccessFeature,
    hasValidSubscription,
    
    // Authentication methods
    login,
    adminLogin,
    register,
    logout,
    
    // User management
    updateUser,
    updateProfile,
    updateSubscription,
    updateParqStatus,
    
    // Guest functionality
    loginAsGuest,
    continueAsGuest,
    upgradeGuestAccount,
    
    // Error management
    clearError,
    setError: setErrorMessage,
    
    // Debug functionality
    clearAllData
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Backward compatibility hooks for old context usage
export const useUser = () => {
  const auth = useAuth()
  return {
    ...auth,
    getProfile: () => auth.user?.profile
  }
}

export const useAdminAuth = () => {
  const auth = useAuth()
  return {
    isAdminAuthenticated: auth.isAdmin && auth.isAuthenticated,
    adminUser: auth.isAdmin ? auth.user : null,
    login: auth.adminLogin,
    logout: auth.logout,
    loading: auth.isLoading,
    error: auth.error
  }
} 