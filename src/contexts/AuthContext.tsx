import React, { createContext, useContext, useState, useEffect } from 'react'
import { User, UserProfile } from '../types/user'
import { api } from '../services/api'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isGuest: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
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
  updateUser: (user: User) => void
  loginAsGuest: () => Promise<void>
  continueAsGuest: () => void
  upgradeGuestAccount: (email: string, password: string, name: string) => Promise<void>
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
  const [isGuest, setIsGuest] = useState(false)
  const navigate = (window as any).navigate || (() => {}) // fallback for SSR

  useEffect(() => {
    // Check for stored auth token and validate it
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token')
        const guestExpires = localStorage.getItem('guestExpires')
        if (guestExpires && Date.now() > Number(guestExpires)) {
          // Guest session expired
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          localStorage.removeItem('guestExpires')
          setUser(null)
          setIsGuest(false)
          window.location.reload()
          return
        }
        if (token) {
          // TODO: Validate token with backend
          // For now, we'll just check if it exists
          const storedUser = localStorage.getItem('user')
          if (storedUser) {
            setUser(JSON.parse(storedUser))
            const parsedUser = JSON.parse(storedUser)
            if (parsedUser.isGuest) setIsGuest(true)
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
      setUser(res.data.user)
    } catch (error: unknown) {
      console.error('Login failed:', error)
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
      setIsGuest(false)
    } catch (error: unknown) {
      console.error('Registration failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const updateUser = (updatedUser: User) => {
    localStorage.setItem('user', JSON.stringify(updatedUser))
    setUser(updatedUser)
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
      setIsGuest(true)
      trackEvent('guest_session_start', { method: 'api' })
    } catch (error) {
      console.error('Guest login failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const continueAsGuest = () => {
    const now = new Date();
    const guestUser: User = {
      id: 'guest',
      email: '',
      profile: {
        id: 'guest-profile',
        email: '',
        firstName: 'Guest',
        lastName: '',
        dateOfBirth: now,
        gender: 'other',
        height: 0,
        weight: 0,
        fitnessLevel: 'beginner',
        goals: [],
        availableEquipment: [],
        preferredWorkoutDuration: 0,
        daysPerWeek: 0,
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
    setIsGuest(true);
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
      setIsGuest(false)
    } catch (error) {
      console.error('Upgrade failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const value = {
    user,
    isAuthenticated: !!user,
    isGuest,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    loginAsGuest,
    continueAsGuest,
    upgradeGuestAccount
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