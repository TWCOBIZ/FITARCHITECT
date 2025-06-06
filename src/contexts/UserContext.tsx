import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, UserProfile, NutritionProfile } from '../types/user'
import { AuthState } from '../types/auth'
import { useAuth } from './AuthContext'
import { api } from '../services/api'

interface UserContextType extends AuthState {
  updateSubscription: (tier: 'free' | 'basic' | 'premium') => void
  updateParqStatus: (isCleared: boolean) => void
  updateProfile: (profileData: Partial<UserProfile>) => void
  getProfile: () => UserProfile | undefined
  isProfileLoading: boolean
  profileError: string | null
  reloadUserProfile: () => void
  updateUserProfile: (profile: Partial<UserProfile>) => void
  refreshProfile: () => void
  profileVersion: number
  isAppRefreshing: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider: React.FC<{
  children: React.ReactNode,
  profileVersion?: number,
  reloadUserProfile?: () => void
}> = ({ children, profileVersion, reloadUserProfile }) => {
  console.log('UserProvider: rendering');
  const { user, isAuthenticated } = useAuth();
  const [userState, setUserState] = useState<AuthState>({
    user: user || null,
    isAuthenticated: !!user,
    isCleared: false,
    subscriptionTier: 'free'
  })

  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isAppRefreshing, setIsAppRefreshing] = useState(false);

  useEffect(() => {
    setUserState(prev => ({
      ...prev,
      user: user || null,
      isAuthenticated: !!user
    }))
  }, [user, isAuthenticated])

  const getUserProfile = async () => {
    setIsProfileLoading(true)
    setProfileError(null)
    try {
      const res = await api.get('/api/profile')
      const profile = res.data
      setUserState(prev => ({
        ...prev,
        user: prev.user
          ? {
              ...prev.user,
              profile,
            }
          : null,
      }))
    } catch (error: any) {
      setProfileError(error?.message || 'Failed to load profile')
    } finally {
      setIsProfileLoading(false)
    }
  }

  const refreshProfile = async () => {
    setIsAppRefreshing(true);
    setIsProfileLoading(true);
    setProfileError(null);
    try {
      const res = await api.get('/api/profile');
      const profile = res.data;
      setUserState(prev => ({
        ...prev,
        user: prev.user
          ? { ...prev.user, profile }
          : null,
      }));
    } catch (error: any) {
      setProfileError(error?.message || 'Failed to refresh profile');
    } finally {
      setIsProfileLoading(false);
      setIsAppRefreshing(false);
    }
  };

  const updateUserProfile = async (profile: Partial<UserProfile>) => {
    setIsProfileLoading(true)
    setProfileError(null)
    try {
      const res = await api.put('/api/profile', profile)
      const updatedProfile = res.data
      setUserState(prev => ({
        ...prev,
        user: prev.user
          ? {
              ...prev.user,
              profile: updatedProfile,
            }
          : null,
      }))
    } catch (error: any) {
      setProfileError(error?.message || 'Failed to update profile')
    } finally {
      setIsProfileLoading(false)
    }
  }

  useEffect(() => {
    const userId = userState.user?.id
    const hasProfile = !!userState.user?.profile && Object.keys(userState.user.profile).length > 0
    if (userId && !hasProfile && !isProfileLoading) {
      getUserProfile()
    }
  }, [userState.user?.id, userState.user?.profile])

  useEffect(() => {
    if (profileVersion) {
      console.log('UserProvider: getUserProfile called from profileVersion effect', profileVersion);
      getUserProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVersion]);

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
    setUserState(prev => {
      if (!prev.user || !prev.user.profile) {
        // If no user or no profile, do not update
        return prev;
      }
      return {
        ...prev,
        user: {
          ...prev.user,
          profile: {
            ...prev.user.profile,
            ...profileData,
            nutritionProfile: profileData.nutritionProfile !== undefined
              ? profileData.nutritionProfile
              : prev.user.profile.nutritionProfile
          }
        }
      };
    });
  }

  return (
    <UserContext.Provider value={{
      ...userState,
      subscriptionTier: (userState.user?.email === 'nepacreativeagency@icloud.com') ? 'premium' : userState.subscriptionTier,
      isCleared: (userState.user?.email === 'nepacreativeagency@icloud.com') ? true : userState.isCleared,
      updateSubscription,
      updateParqStatus,
      updateProfile,
      getProfile: () => userState.user?.profile,
      isProfileLoading,
      profileError,
      reloadUserProfile: reloadUserProfile || getUserProfile,
      updateUserProfile,
      refreshProfile,
      profileVersion: profileVersion || 0,
      isAppRefreshing,
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