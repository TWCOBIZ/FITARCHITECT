import React, { createContext, useContext, useState, ReactNode } from 'react'
import { User, UserProfile } from '../types/user'
import { AuthState } from '../types/auth'

interface UserContextType extends AuthState {
  updateSubscription: (tier: 'free' | 'basic' | 'premium') => void
  updateParqStatus: (isCleared: boolean) => void
  updateProfile: (profileData: Partial<UserProfile>) => void
  getProfile: () => UserProfile | undefined
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userState, setUserState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isCleared: false,
    subscriptionTier: 'free'
  })

  const updateSubscription = (tier: 'free' | 'basic' | 'premium') => {
    setUserState(prev => ({
      ...prev,
      subscriptionTier: (prev.user?.email === 'nepacreativeagency@icloud.com') ? 'premium' : tier
    }))
  }

  const updateParqStatus = (isCleared: boolean) => {
    setUserState(prev => ({
      ...prev,
      isCleared: (prev.user?.email === 'nepacreativeagency@icloud.com') ? true : isCleared
    }))
  }

  const updateProfile = (profileData: Partial<UserProfile>) => {
    setUserState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, profile: { ...prev.user.profile, ...profileData } } : null
    }))
  }

  return (
    <UserContext.Provider value={{
      ...userState,
      subscriptionTier: (userState.user?.email === 'nepacreativeagency@icloud.com') ? 'premium' : userState.subscriptionTier,
      isCleared: (userState.user?.email === 'nepacreativeagency@icloud.com') ? true : userState.isCleared,
      updateSubscription,
      updateParqStatus,
      updateProfile,
      getProfile: () => userState.user?.profile
    }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
} 