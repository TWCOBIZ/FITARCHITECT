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

interface AuthProviderProps {
  children: React.ReactNode;
  reloadUserProfile?: () => Promise<void>;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, reloadUserProfile }) => {
  console.log('AuthProvider: rendering');
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)
  const navigate = (window as any).navigate || (() => {}) // fallback for SSR

  console.log('AuthProvider: after state declarations', { user, isLoading, isGuest });

  // Restore user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post('/api/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      setIsGuest(!!res.data.user.isGuest);
      if (reloadUserProfile) await reloadUserProfile();
      trackEvent('login', { email });
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

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
    setIsLoading(true);
    try {
      const res = await api.post('/api/register', {
        email, password, name, height, weight, age, gender, fitnessGoals, activityLevel, dietaryPreferences
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      setIsGuest(!!res.data.user.isGuest);
      if (reloadUserProfile) await reloadUserProfile();
      trackEvent('register', { email });
      navigate('/profile');
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsGuest(false);
    trackEvent('logout');
    navigate('/');
  };

  const updateUser = (user: User) => {
    setUser(user);
    localStorage.setItem('user', JSON.stringify(user));
  };

  // Dummy guest/upgrade functions for now
  const loginAsGuest = async () => {};
  const continueAsGuest = () => {};
  const upgradeGuestAccount = async () => {};

  return (
    <AuthContext.Provider value={{
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
      upgradeGuestAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}