import React, { createContext, useContext, useState, useEffect } from 'react'
import { User, UserProfile } from '../types/user'
import { api } from '../services/api'

interface AuthContextType {
  // User state
  user: User | null
  isAuthenticated: boolean
  isGuest: boolean
  isAdmin: boolean
  isLoading: boolean
  
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
    fitnessGoals: string,
    activityLevel: string,
    dietaryPreferences: string
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
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'basic' | 'premium'>('free')
  
  // Derive isGuest from user state instead of maintaining separate state
  const isGuest = user?.isGuest === true || user?.type === 'guest'

  // Helper function to check admin status
  const isAdminUser = (email: string): boolean => {
    // In a real app, this would check against the user's isAdmin property
    // For now, keeping minimal admin check without hardcoded emails
    return false
  }

  // Computed values
  const isAuthenticated = !!user
  const isAdmin = user?.profile?.email ? isAdminUser(user.profile.email) : false
  const parqCompleted = user?.parqCompleted || false

  // Feature access control
  const canAccessFeature = (feature: string): boolean => {
    if (!user) return false

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
    const tierHierarchy = { free: 0, basic: 1, premium: 2 }
    const requiredLevel = tierHierarchy[tier]
    const userLevel = tierHierarchy[subscriptionTier]
    return userLevel >= requiredLevel
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
          return
        }

        if (token) {
          // Validate token with backend
          try {
            const response = await api.get('/api/profile', {
              headers: { Authorization: `Bearer ${token}` }
            })
            setUser(response.data.user)
            setSubscriptionTier(response.data.user.tier || 'free')
          } catch (error) {
            // Token invalid, check localStorage fallback
            const storedUser = localStorage.getItem('user')
            if (storedUser) {
              const parsedUser = JSON.parse(storedUser)
              setUser(parsedUser)
              setSubscriptionTier(parsedUser.tier || parsedUser.subscription?.plan?.toLowerCase() || 'free')
            }
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const res = await api.post('/api/login', { email, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      localStorage.removeItem('adminToken') // Clear admin token if exists
      setUser(res.data.user)
      setSubscriptionTier(res.data.user.tier || 'free')
    } catch (error: unknown) {
      console.error('Login failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const adminLogin = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const res = await api.post('/api/admin/login', { email, password })
      localStorage.setItem('adminToken', res.data.token)
      
      // Get admin user info
      const adminRes = await api.get('/api/admin/me', {
        headers: { Authorization: `Bearer ${res.data.token}` }
      })
      
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
    } catch (error: unknown) {
      console.error('Admin login failed:', error)
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
    fitnessGoals: string,
    activityLevel: string,
    dietaryPreferences: string
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
        fitnessGoals: fitnessGoals.split(',').map(s => s.trim()),
        activityLevel,
        dietaryPreferences: dietaryPreferences.split(',').map(s => s.trim()),
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
    setSubscriptionTier(updatedUser.tier || updatedUser.subscription?.plan?.toLowerCase() || 'free')
  }

  const updateProfile = (profileData: Partial<UserProfile>) => {
    if (!user) return
    
    const updatedUser = {
      ...user,
      profile: { ...user.profile, ...profileData }
    }
    updateUser(updatedUser)
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

  const clearAllData = () => {
    // Clear all localStorage data
    localStorage.clear()
    setUser(null)
    setSubscriptionTier('free')
    setIsLoading(false)
  }

  const continueAsGuest = () => {
    // Clear any existing user data first
    localStorage.removeItem('token')
    localStorage.removeItem('adminToken')
    localStorage.removeItem('user')
    localStorage.removeItem('guestExpires')
    
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
        height: 170, // 170cm default
        weight: 70,  // 70kg default
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
    error: null // TODO: Add error state management
  }
} 